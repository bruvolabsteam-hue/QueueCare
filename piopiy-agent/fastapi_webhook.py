import os
import re
import uvicorn
import logging
import asyncio
from datetime import datetime, timedelta, timezone
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

# Initialize Supabase with service role key priority for reliable RLS bypass
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY")
)

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("✅ Supabase connected successfully")
else:
    supabase = None
    logger.error("❌ SUPABASE_URL or SUPABASE key not set!")

CLINIC_ID = os.environ.get("CLINIC_ID", "a03c3eed-c075-496c-9c03-4c95eac40975")


def normalize_indian_carrier_phone(phone: str) -> str:
    """
    Normalize phone numbers strictly to Indian carrier format (12 digits: 91XXXXXXXXXX without '+').
    Ensures compatibility with TeleCMI, SIP REFER, and ElevenLabs telephony routing.
    Handles:
    - 10 digits: '9113526504' -> '919113526504'
    - 11 digits with leading '0': '09113526504' -> '919113526504'
    - 12 digits starting with '91': '919113526504' -> '919113526504'
    - '+919113526504' -> '919113526504'
    - Formatted string: '+91 (911) 352-6504' -> '919113526504'
    - International prefix: '00919113526504' -> '919113526504'
    """
    if not phone:
        return ""
    # Strip all non-digit characters
    digits = re.sub(r'\D', '', str(phone).strip())

    if not digits:
        return ""

    # If starts with 0091 (international prefix), strip leading 00
    if digits.startswith("0091") and len(digits) == 14:
        digits = digits[2:]

    # If 11 digits starting with 0 (e.g. 09113526504), strip leading 0 -> 10 digits
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    # If 10 digits (e.g. 9113526504), prepend 91 -> 12 digits
    if len(digits) == 10:
        digits = f"91{digits}"

    # If 12 digits starting with 91, return as is
    if len(digits) == 12 and digits.startswith("91"):
        return digits

    # If more than 12 digits and ends with 10 digits, take last 10 and prepend 91
    if len(digits) > 12:
        last10 = digits[-10:]
        return f"91{last10}"

    return digits


async def run_db(func, *args, **kwargs):
    """Execute synchronous database calls off the main event loop for sub-second non-blocking performance."""
    return await asyncio.to_thread(func, *args, **kwargs)


@app.on_event("startup")
async def startup_event():
    """Warm up the Supabase database connection during server boot."""
    try:
        if supabase:
            await run_db(lambda: supabase.table('clinics').select('id').limit(1).execute())
            logger.info("🔥 Database connection warmed up successfully")
    except Exception as e:
        logger.error(f"⚠️ Database warmup error: {e}")


# ──────────────────────────────────────────────
# HEALTH CHECK & DIAGNOSTICS
# ──────────────────────────────────────────────
@app.get("/")
def health_check():
    return {"status": "ok", "message": "Bruvoflow Server is running!"}


@app.get("/diagnose")
async def diagnose():
    # Return active clinic ID and database logs to verify deployment status
    logs = []
    if supabase:
        try:
            res = await run_db(lambda: supabase.rpc("get_latest_transfer_actions", {"p_clinic_id": CLINIC_ID}).execute())
            logs = res.data if res and res.data else []
        except Exception as err:
            logger.warning(f"⚠️ /diagnose RPC failed, falling back: {err}")
            try:
                res = await run_db(lambda: supabase.rpc("get_latest_transfer_actions").execute())
                logs = res.data if res and res.data else []
            except Exception as fallback_err:
                logs = [f"Failed to fetch logs: {fallback_err}"]
    return {
        "status": "ok",
        "clinic_id": CLINIC_ID,
        "version": "telephony-optimized-v4",
        "transfer_logs": logs
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
        rpc_res = await run_db(
            lambda: supabase.rpc('check_doctor_availability', {
                'p_clinic_id': CLINIC_ID
            }).execute()
        )

        res_data = rpc_res.data if rpc_res else None
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
    """Book a queue ticket/appointment for the patient with sub-second parallel execution."""
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
            # Format phone number - ensure it starts with + for DB storage
            phone = phone_number if str(phone_number).startswith('+') else f'+{phone_number}'

        if not supabase:
            return {"message": f"Appointment booked for {patient_name}. Please visit the clinic."}

        clinic_id = CLINIC_ID

        # Resolve today's active doctor_id bypassing RLS
        doctor_id = None
        try:
            doc_res = await run_db(
                lambda: supabase.rpc('get_active_doctor_id', {
                    'p_clinic_id': clinic_id
                }).execute()
            )
            doctor_id = doc_res.data if doc_res else None
            logger.info(f"🔍 Resolved active doctor for booking: {doctor_id}")
        except Exception as doc_err:
            logger.error(f"⚠️ Error resolving active doctor: {doc_err}")

        # Call the RPC to properly generate a token with clean parameters
        rpc_params = {
            'p_clinic_id': clinic_id,
            'p_name': patient_name,
            'p_phone': phone,
            'p_registration_method': 'walk-in'
        }
        if doctor_id:
            rpc_params['p_doctor_id'] = doctor_id

        rpc_res = await run_db(
            lambda: supabase.rpc('generate_daily_token', rpc_params).execute()
        )
        token = rpc_res.data if rpc_res else "1"
        logger.info(f"✅ Token generated: {token} for {patient_name} ({phone})")

        # Programmatically calculate estimated wait time based on token number (10 minutes average per patient)
        ist = timezone(timedelta(hours=5, minutes=30))
        token_num = 1
        try:
            token_num = int(token)
        except Exception:
            pass
        est_wait = max(0, (token_num - 1) * 10)  # Patients ahead * 10 mins
        est_time_dt = datetime.now(ist) + timedelta(minutes=est_wait)
        est_time_str = est_time_dt.strftime('%I:%M %p')

        # --- SEND SMS AND WHATSAPP (offloaded to background task for instant call reply) ---
        msg = f"Hello {patient_name}, your appointment is confirmed! Your token number is {token}. Estimated turn: {est_time_str}."
        background_tasks.add_task(send_sms, phone, msg)
        background_tasks.add_task(send_whatsapp, phone, msg)

        return {
            "token": token,
            "Token": token,
            "name": patient_name,
            "Name": patient_name,
            "phone_number": phone,
            "Phone": phone,
            "estimated_time": est_time_str,
            "EstTime": est_time_str,
            "message": f"Appointment booked successfully! Token number is {token}, confirmed phone number is {phone}, estimated turn time is {est_time_str}. Please tell the patient: 'All done! Your booking is confirmed on {phone}. Your token number is {token} and your estimated time is {est_time_str}. Thank you!'"
        }

    except Exception as e:
        logger.error(f"❌ book_appointment error: {e}")
        return {"message": "Appointment noted for the patient. Please visit the clinic directly."}


# ──────────────────────────────────────────────
# CANCEL APPOINTMENT
# ──────────────────────────────────────────────
@app.post("/cancel_appointment")
async def cancel_appointment(request: Request):
    """Cancel the user's appointment/queue ticket using SECURITY DEFINER RPC."""
    try:
        data = await request.json()
        logger.info(f"📞 cancel_appointment called with data: {data}")

        phone_number = data.get("phone_number", "")

        if not phone_number:
            return {"message": "Could not identify the caller. Please provide the phone number to cancel."}

        phone = str(phone_number).strip()

        if not supabase:
            return {"message": "Appointment cancelled successfully."}

        # Invoke SECURITY DEFINER RPC cancel_appointment
        rpc_res = await run_db(
            lambda: supabase.rpc('cancel_appointment', {
                'p_clinic_id': CLINIC_ID,
                'p_phone': phone
            }).execute()
        )

        res_data = rpc_res.data if rpc_res else None
        if res_data and isinstance(res_data, dict):
            if res_data.get("success"):
                logger.info(f"✅ Cancelled appointment for {phone}: {res_data.get('message')}")
                return {"message": res_data.get("message", "Appointment has been cancelled successfully.")}
            else:
                return {"message": res_data.get("message", "No active appointment found for this phone number.")}

        # Fallback table update if RPC returns unexpected structure
        phone_with_plus = phone if phone.startswith('+') else f'+{phone}'
        res = await run_db(
            lambda: supabase.table('patients').update({
                'status': 'cancelled'
            }).eq('phone', phone_with_plus).eq('status', 'waiting').execute()
        )

        if res and res.data:
            logger.info(f"✅ Cancelled appointment (fallback) for {phone_with_plus}")
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
    """Fetch the doctor's phone number and return it in strict Indian carrier format (91XXXXXXXXXX without '+') for TeleCMI / ElevenLabs SIP REFER transfer."""
    try:
        # Safely parse JSON body
        data = {}
        try:
            data = await request.json()
        except Exception:
            pass
        logger.info(f"📞 transfer_to_doctor called. Data: {data}, Query Params: {dict(request.query_params)}")

        call_id = request.query_params.get("call_id") or data.get("call_id", "")
        doctor_name = data.get("doctor_name", "")

        if not supabase:
            return {
                "doctor_phone": "",
                "message": "Transferring to the doctor now. Please hold."
            }

        # Check availability first - block transfer if doctor is off/fully booked
        avail_res = await run_db(
            lambda: supabase.rpc('check_doctor_availability', {
                'p_clinic_id': CLINIC_ID
            }).execute()
        )

        is_available = True
        avail_msg = ""
        if avail_res and avail_res.data and isinstance(avail_res.data, dict):
            is_available = avail_res.data.get("available", True)
            avail_msg = avail_res.data.get("message", "")

        if not is_available:
            logger.warning(f"⚠️ Blocked transfer: Doctor is not available today. Reason: {avail_msg}")
            return {
                "doctor_phone": "",
                "message": f"Sorry, the doctor is not available right now. {avail_msg}"
            }

        # Get doctor phone using RPC to bypass RLS security policies safely
        doc_phone = None
        resolved_doc_name = doctor_name

        if doctor_name:
            rpc_res = await run_db(
                lambda: supabase.rpc('get_doctor_phone', {
                    'p_clinic_id': CLINIC_ID,
                    'p_doctor_name': doctor_name
                }).execute()
            )
            doc_phone = rpc_res.data if rpc_res else None

        # Fallback: resolve active doctor on duty today if name was empty or not matched
        if not doc_phone:
            logger.info("🔍 Doctor name empty or lookup failed. Resolving active doctor details for today...")
            try:
                active_res = await run_db(
                    lambda: supabase.rpc('get_active_doctor_details', {
                        'p_clinic_id': CLINIC_ID
                    }).execute()
                )
                active_data = active_res.data if active_res else {}
                if active_data and isinstance(active_data, dict):
                    doc_phone = active_data.get('phone')
                    resolved_doc_name = active_data.get('name') or "Doctor"
                    logger.info(f"✅ Resolved active doctor: {resolved_doc_name} with phone: {doc_phone}")
            except Exception as active_err:
                logger.error(f"⚠️ Error resolving active doctor details: {active_err}")

        # Normalize the name we use for logging
        log_doc_name = resolved_doc_name if resolved_doc_name else "Doctor"

        if doc_phone:
            # Normalize doctor phone strictly to Indian carrier format (91XXXXXXXXXX without '+')
            doc_phone_str = normalize_indian_carrier_phone(str(doc_phone))

            logger.info(f"📞 Resolved doctor phone: {doc_phone} -> Normalized Indian carrier (no +): {doc_phone_str}")

            # Capture caller phone if passed in request body or query params
            caller_phone_raw = (
                data.get("phone_number")
                or request.query_params.get("from")
                or data.get("caller_phone")
                or ""
            )
            caller_phone_clean = normalize_indian_carrier_phone(caller_phone_raw) or str(caller_phone_raw)

            # Log the transfer request in queue_actions so clinic dashboard displays real-time alert
            try:
                await run_db(
                    lambda: supabase.rpc('log_transfer_request', {
                        'p_clinic_id': CLINIC_ID,
                        'p_doctor_name': log_doc_name,
                        'p_caller_phone': caller_phone_clean
                    }).execute()
                )
                logger.info(f"📝 Logged transfer request in queue_actions for doctor: {log_doc_name}, caller: {caller_phone_clean}")
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
# AUTOMATIC CALLBACK FOR MISSED CALLS
# ──────────────────────────────────────────────
async def trigger_elevenlabs_callback(caller_phone: str):
    """Initiate an outbound callback to the patient via ElevenLabs API."""
    try:
        api_key = os.environ.get("ELEVENLABS_API_KEY")
        agent_id = os.environ.get("ELEVENLABS_AGENT_ID")
        phone_number_id = os.environ.get("ELEVENLABS_PHONE_ID")  # Trunk or number ID in ElevenLabs
        provider = os.environ.get("ELEVENLABS_TELEPHONY_PROVIDER", "sip-trunk")  # "sip-trunk" or "twilio"
        
        if not api_key or not agent_id or not phone_number_id:
            logger.warning("⚠️ ElevenLabs Outbound credentials missing. Skipping callback. Make sure ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, and ELEVENLABS_PHONE_ID are configured.")
            return

        # Ensure patient phone is in E.164 format (with leading +)
        # Strip any existing leading + to avoid double prefixing
        digits_only = "".join(filter(str.isdigit, caller_phone))
        clean_phone = f"+{digits_only}"

        url = f"https://api.elevenlabs.io/v1/convai/{provider}/outbound-call"
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "agent_id": agent_id,
            "agent_phone_number_id": phone_number_id,
            "to_number": clean_phone
        }

        logger.info(f"📤 Triggering ElevenLabs Outbound Call to {clean_phone} via provider: {provider}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as resp:
                result = await resp.json()
                if resp.status == 200:
                    logger.info(f"✅ ElevenLabs Outbound Call initiated successfully for: {clean_phone}")
                else:
                    logger.error(f"❌ ElevenLabs Outbound Call failed: {result}")
    except Exception as e:
        logger.error(f"❌ Error initiating ElevenLabs outbound call: {e}")


@app.post("/telecmi_call_event")
async def telecmi_call_event(request: Request, background_tasks: BackgroundTasks):
    """Endpoint for TeleCMI call events. Triggers an ElevenLabs outbound callback if an inbound call is missed."""
    try:
        data = await request.json()
        logger.info(f"📞 TeleCMI call event received: {data}")
        
        # Determine call parameters
        direction = data.get("direction")
        status = data.get("status")
        caller_phone = data.get("from")
        
        # Trigger outbound call if incoming call was missed, busy, or unanswered
        if direction == "inbound" and status in ["missed", "no-answer", "busy", "failed"]:
            logger.warning(f"⚠️ Missed incoming call from patient {caller_phone}. Status: {status}. Triggering automatic callback...")
            background_tasks.add_task(trigger_elevenlabs_callback, str(caller_phone))
            
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"❌ Error in telecmi_call_event: {e}")
        return {"status": "error", "message": str(e)}


# ──────────────────────────────────────────────
# RUN SERVER
# ──────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
