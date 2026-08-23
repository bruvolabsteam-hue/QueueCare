import os
import uvicorn
import logging
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from supabase import create_client, Client
import aiohttp

# Load environment variables
load_dotenv()

# Setup logging so we can see errors in Heroku logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bruvoflow")

app = FastAPI(title="Bruvoflow API")

# Initialize Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("✅ Supabase connected successfully")
else:
    supabase = None
    logger.error("❌ SUPABASE_URL or SUPABASE_ANON_KEY not set!")

CLINIC_ID = "a03c3eed-c075-496c-9c03-4c95eac40975"


@app.on_event("startup")
async def startup_event():
    """Warm up the Supabase database connection during server boot."""
    try:
        if supabase:
            supabase.table('clinics').select('id').limit(1).execute()
            logger.info("🔥 Database connection warmed up successfully")
    except Exception as e:
        logger.error(f"⚠️ Database warmup error: {e}")


# ──────────────────────────────────────────────
# HEALTH CHECK
# ──────────────────────────────────────────────
@app.get("/")
def health_check():
    return {"status": "ok", "message": "Bruvoflow Server is running!"}

@app.get("/diagnose")
def diagnose():
    # Return active clinic ID to verify deployment version
    try:
        return {
            "clinic_id": CLINIC_ID,
            "version": "clinic-id-fixed-v2"
        }
    except NameError:
        return {
            "clinic_id": "ffe805a9-c7bb-41ec-a88e-01ebae6331f8",
            "version": "old-code-pre-clinic-id-fix"
        }


# ──────────────────────────────────────────────
# CHECK AVAILABILITY
# ──────────────────────────────────────────────
@app.post("/check_availability")
async def check_availability(request: Request):
    """Check if the doctor has availability today."""
    try:
        logger.info("📞 check_availability called")

        if not supabase:
            return {"message": "Doctor is available today for walk-in patients."}

        # Call RPC function to check doctor availability bypassing RLS safely
        rpc_res = supabase.rpc('check_doctor_availability', {
            'p_clinic_id': CLINIC_ID
        }).execute()

        res_data = rpc_res.data
        if res_data and isinstance(res_data, dict):
            return {"message": res_data.get("message", "Yes, the doctor is available today.")}

        return {"message": "Yes, the doctor is available today for walk-in patients."}

    except Exception as e:
        logger.error(f"❌ check_availability error: {e}")
        return {"message": "Yes, the doctor is available today."}


# ──────────────────────────────────────────────
# BOOK APPOINTMENT
# ──────────────────────────────────────────────
@app.post("/book_appointment")
async def book_appointment(request: Request, background_tasks: BackgroundTasks):
    """Book a queue ticket/appointment for the patient."""
    try:
        data = await request.json()
        logger.info(f"📞 book_appointment called with data: {data}")

        patient_name = data.get("patient_name", "Patient")
        phone_number = data.get("phone_number", "")
        travel_category = data.get("travel_category", "here")

        # Map travel_category to valid DB enum values
        if travel_category not in ["here", "under_30", "30_to_60", "over_60"]:
            travel_category = "here"

        # If no phone number, still book with a placeholder
        if not phone_number:
            phone = "+0000000000"
            logger.warning("⚠️ No phone number provided, using placeholder")
        else:
            # Format phone number - ensure it starts with +
            phone = phone_number if phone_number.startswith('+') else f'+{phone_number}'

        if not supabase:
            return {"message": f"Appointment booked for {patient_name}. Please visit the clinic."}

        # Global clinic ID
        clinic_id = CLINIC_ID

        # Calculate estimated wait time before inserting
        from datetime import datetime, timedelta, timezone
        ist = timezone(timedelta(hours=5, minutes=30))
        today_start = datetime.now(ist).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

        try:
            # Count patients currently waiting today
            patients_res = supabase.table('patients').select('id', count='exact').eq('clinic_id', clinic_id).eq('status', 'waiting').gte('created_at', today_start).execute()
            waiting_count = patients_res.count if patients_res.count is not None else 0

            # Get clinic's average wait time per patient
            clinic_res = supabase.table('clinics').select('avg_time_per_patient_mins').eq('id', clinic_id).execute()
            avg_time = 10
            if clinic_res.data:
                avg_time = clinic_res.data[0].get('avg_time_per_patient_mins', 10) or 10
        except Exception as query_err:
            logger.error(f"⚠️ Error querying wait time: {query_err}")
            waiting_count = 0
            avg_time = 10

        est_wait = waiting_count * avg_time
        est_time_dt = datetime.now(ist) + timedelta(minutes=est_wait)
        est_time_str = est_time_dt.strftime('%I:%M %p')

        # Call the RPC to properly generate a token
        rpc_res = supabase.rpc('generate_daily_token', {
            'p_clinic_id': clinic_id,
            'p_name': patient_name,
            'p_phone': phone,
            'p_registration_method': 'walk-in',
            'p_language': 'auto',
            'p_travel_category': travel_category
        }).execute()
        token = rpc_res.data
        logger.info(f"✅ Token generated: {token} for {patient_name} ({phone})")

        # --- SEND SMS AND WHATSAPP (offloaded to background task for instant call reply) ---
        msg = f"Hello {patient_name}, your appointment is confirmed! Your token number is {token}. Estimated turn: {est_time_str}."
        background_tasks.add_task(send_sms, phone, msg)
        background_tasks.add_task(send_whatsapp, phone, msg)

        return {"message": f"Appointment booked successfully! The token number is {token} and their estimated turn is at {est_time_str}. Tell the patient their token number is {token} and their estimated time is {est_time_str}."}

    except Exception as e:
        logger.error(f"❌ book_appointment error: {e}")
        return {"message": f"Appointment noted for the patient. Please visit the clinic directly."}


# ──────────────────────────────────────────────
# CANCEL APPOINTMENT
# ──────────────────────────────────────────────
@app.post("/cancel_appointment")
async def cancel_appointment(request: Request):
    """Cancel the user's appointment/queue ticket."""
    try:
        data = await request.json()
        logger.info(f"📞 cancel_appointment called with data: {data}")

        phone_number = data.get("phone_number", "")

        if not phone_number:
            return {"message": "Could not identify the caller. Please provide the phone number to cancel."}

        phone = phone_number if phone_number.startswith('+') else f'+{phone_number}'

        if not supabase:
            return {"message": "Appointment cancelled successfully."}

        # Update status to cancelled
        res = supabase.table('patients').update({
            'status': 'cancelled'
        }).eq('phone', phone).eq('status', 'waiting').execute()

        if res.data:
            logger.info(f"✅ Cancelled appointment for {phone}")
            return {"message": "Appointment has been cancelled successfully."}

        return {"message": "No active appointment found for this phone number."}

    except Exception as e:
        logger.error(f"❌ cancel_appointment error: {e}")
        return {"message": "There was an error cancelling the appointment. Please try again."}


# ──────────────────────────────────────────────
# TRANSFER TO DOCTOR
# ──────────────────────────────────────────────
@app.post("/transfer_to_doctor")
async def transfer_to_doctor(request: Request):
    """Fetch the doctor's phone number and return it for ElevenLabs SIP REFER transfer, checking availability first."""
    try:
        # Safely try parsing json body
        data = {}
        try:
            data = await request.json()
        except Exception:
            pass
        logger.info(f"📞 transfer_to_doctor called. Data: {data}, Query Params: {dict(request.query_params)}")

        # Get call_id from query params or JSON payload
        call_id = request.query_params.get("call_id") or data.get("call_id", "")
        doctor_name = data.get("doctor_name", "")

        if not supabase:
            return {
                "doctor_phone": "",
                "message": "Transferring to the doctor now. Please hold."
            }

        # Check availability first - block transfer if doctor is off/fully booked
        avail_res = supabase.rpc('check_doctor_availability', {
            'p_clinic_id': CLINIC_ID
        }).execute()
        
        is_available = True
        avail_msg = ""
        if avail_res.data and isinstance(avail_res.data, dict):
            is_available = avail_res.data.get("available", True)
            avail_msg = avail_res.data.get("message", "")

        if not is_available:
            logger.warning(f"⚠️ Blocked transfer: Doctor is not available today. Reason: {avail_msg}")
            return {
                "doctor_phone": "",
                "message": f"Sorry, the doctor is not available right now. {avail_msg}"
            }

        # Get doctor phone using RPC to bypass RLS security policies safely
        rpc_res = supabase.rpc('get_doctor_phone', {
            'p_clinic_id': CLINIC_ID,
            'p_doctor_name': doctor_name
        }).execute()
        doc_phone = rpc_res.data

        if doc_phone:
            # Normalize doctor phone to E.164 format for ElevenLabs transfer
            doc_phone_str = str(doc_phone).strip()
            if not doc_phone_str.startswith('+'):
                if len(doc_phone_str) == 10:
                    doc_phone_str = f"+91{doc_phone_str}"
                else:
                    doc_phone_str = f"+{doc_phone_str}"
            
            logger.info(f"📞 Resolved doctor phone: {doc_phone} -> Normalized: {doc_phone_str}")

            # Log the transfer request in the database so the clinic dashboard can display an alert
            try:
                # Capture caller phone if passed in request body or query params
                caller_phone = data.get("phone_number") or request.query_params.get("from") or data.get("caller_phone", "")
                supabase.rpc('log_transfer_request', {
                    'p_clinic_id': CLINIC_ID,
                    'p_doctor_name': doctor_name,
                    'p_caller_phone': caller_phone
                }).execute()
                logger.info(f"📝 Logged transfer request in queue_actions for doctor: {doctor_name}")
            except Exception as log_err:
                logger.error(f"⚠️ Failed to log transfer request: {log_err}")

            return {
                "doctor_phone": doc_phone_str,
                "message": "Transferring the call to the doctor now. Please hold on."
            }

        logger.warning(f"⚠️ No doctor found for clinic or doctor_name: {doctor_name}")
        return {
            "doctor_phone": "",
            "message": "The doctor is not available right now. Please try calling again later."
        }

    except Exception as e:
        logger.error(f"❌ transfer_to_doctor error: {e}")
        return {
            "doctor_phone": "",
            "message": "Could not transfer the call right now. Please try again."
        }


# ──────────────────────────────────────────────
# SMS & WHATSAPP PLACEHOLDERS
# ──────────────────────────────────────────────
async def send_whatsapp(phone: str, message: str):
    """Send a WhatsApp message using Meta Cloud API."""
    try:
        token = os.environ.get("WHATSAPP_TOKEN")
        phone_id = os.environ.get("WHATSAPP_PHONE_ID")
        
        if not token or not phone_id:
            logger.warning("⚠️ WhatsApp credentials missing. Skipping message.")
            return

        url = f"https://graph.facebook.com/v19.0/{phone_id}/messages"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        clean_phone = phone.replace("+", "")
        
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "text",
            "text": {
                "body": message
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as resp:
                result = await resp.json()
                if resp.status == 200:
                    logger.info(f"✅ WhatsApp sent to {phone}")
                else:
                    logger.error(f"❌ WhatsApp failed: {result}")
                    
    except Exception as e:
        logger.error(f"❌ Error sending WhatsApp: {e}")


async def send_sms(phone: str, message: str):
    """
    PLACEHOLDER: Send an SMS message.
    In the future, put your Twilio/MSG91/TeleCMI SMS API call here.
    """
    logger.info(f"📱 [FUTURE] SMS to {phone}: {message}")


# ──────────────────────────────────────────────
# RUN SERVER
# ──────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
