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

        # Check doctor settings in DB
        res = supabase.table('doctor_daily_settings').select('*').limit(1).execute()
        if res.data:
            settings = res.data[0]
            max_patients = settings.get('max_patients', 30)

            # Count how many patients are already booked today
            patients_res = supabase.table('patients').select('id', count='exact').eq('status', 'waiting').execute()
            current_count = patients_res.count if patients_res.count else 0

            if current_count >= max_patients:
                return {"message": f"Sorry, the doctor is fully booked today. All {max_patients} slots are taken."}

            remaining = max_patients - current_count
            return {"message": f"Yes, the doctor is available today. There are {remaining} slots remaining out of {max_patients}."}

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

        # Hardcoded clinic ID - RLS blocks anon key from reading clinics table
        clinic_id = "ffe805a9-c7bb-41ec-a88e-01ebae6331f8"

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
    """Fetch the doctor's phone number and trigger TeleCMI to transfer."""
    try:
        data = await request.json()
        logger.info(f"📞 transfer_to_doctor called with data: {data}")

        call_id = data.get("call_id", "")
        doctor_name = data.get("doctor_name", "")

        if not supabase:
            return {"message": "Transferring to the doctor now. Please hold."}

        # Get doctor phone using RPC to bypass RLS security policies safely
        rpc_res = supabase.rpc('get_doctor_phone', {
            'p_clinic_id': 'ffe805a9-c7bb-41ec-a88e-01ebae6331f8',
            'p_doctor_name': doctor_name
        }).execute()
        doc_phone = rpc_res.data

        if doc_phone:
            logger.info(f"📞 Transferring to doctor at {doc_phone}")

            # Fire a background HTTP request to TeleCMI API to bridge the call
            try:
                async with aiohttp.ClientSession() as session:
                    url = "https://rest.telecmi.com/v2/route"
                    payload = {
                        "appid": os.environ.get("AGENT_ID"),
                        "secret": os.environ.get("AGENT_SECRET"),
                        "from": "917943446883",
                        "to": doc_phone,
                        "call_id": call_id
                    }
                    async with session.post(url, json=payload) as resp:
                        logger.info(f"TeleCMI transfer response: {resp.status}")
            except Exception as transfer_err:
                logger.error(f"⚠️ TeleCMI transfer error: {transfer_err}")

            return {"message": "Transferring the call to the doctor now. Please hold on."}

        return {"message": "The doctor is not available right now. Please try calling again later."}

    except Exception as e:
        logger.error(f"❌ transfer_to_doctor error: {e}")
        return {"message": "Could not transfer the call right now. Please try again."}


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
