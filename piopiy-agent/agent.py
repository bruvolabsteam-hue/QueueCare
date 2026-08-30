import os
import sys
import asyncio

if sys.platform == "win32":
    asyncio.AbstractEventLoop.add_signal_handler = lambda *args, **kwargs: None

from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env
load_dotenv()

# Initialize Supabase Client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# PIOPIY REAL-TIME AGENT INITIALIZATION
# ---------------------------------------------------------------------------
# Note: The exact import structure depends on the piopiy-ai version.
# Adjust these imports if they differ from the code snippet in your TeleCMI dashboard.
from piopiy.agent import Agent
from piopiy.voice_agent import VoiceAgent
from piopiy.services.deepgram.stt import DeepgramSTTService
from piopiy.services.anthropic.llm import AnthropicLLMService
from piopiy.services.elevenlabs.tts import ElevenLabsTTSService

AGENT_ID = os.environ.get("AGENT_ID")
AGENT_SECRET = os.environ.get("AGENT_SECRET")

from piopiy.services.llm_service import FunctionCallParams

# Initialize AI Services
stt = DeepgramSTTService(
    api_key=os.environ.get("DEEPGRAM_API_KEY"),
    language="en-IN",
    model="nova-2"
)
llm = AnthropicLLMService(
    api_key=os.environ.get("CLAUDE_API_KEY"),
    model="claude-haiku-4-5-20251001"
)
tts = ElevenLabsTTSService(
    api_key=os.environ.get("ELEVENLABS_API_KEY"),
    voice_id="2SDH0owxS12R2YMgMNoG", # Native Indian voice for flawless regional pronunciation
    model="eleven_multilingual_v2" # REQUIRED for Kannada and Indian languages
)

import aiohttp

# --- Define Python Tools for the Agent ---
async def check_availability(params: FunctionCallParams) -> str:
    """Check if the doctor has availability today."""
    try:
        # Run synchronous database call in a thread to prevent blocking audio
        res = await asyncio.to_thread(
            lambda: supabase.table('doctor_daily_settings').select('*').limit(1).execute()
        )
        if res.data:
            return "The doctor is available today. We have open slots for walk-in patients."
        return "The doctor is available today."
    except Exception as e:
        print("Availability Error:", e)
        return "I can check the doctor's availability."

async def book_appointment(params: FunctionCallParams) -> str:
    """Book a queue ticket/appointment for the patient for today."""
    try:
        args = params.arguments
        patient_name = args.get("patient_name", "Patient")
        phone_number = args.get("phone_number", "")
        
        phone = phone_number if phone_number.startswith('+') else f'+{phone_number}'
        
        # Get the first clinic ID
        clinic_res = await asyncio.to_thread(
            lambda: supabase.table('clinics').select('id').limit(1).execute()
        )
        clinic_id = clinic_res.data[0]['id'] if clinic_res.data else None
        
        if clinic_id:
            # Call the RPC to properly generate a token
            rpc_res = await asyncio.to_thread(
                lambda: supabase.rpc('generate_daily_token', {
                    'p_clinic_id': clinic_id,
                    'p_name': patient_name,
                    'p_phone': phone,
                    'p_registration_method': 'walk_in'
                }).execute()
            )
            token = rpc_res.data
            return f"Successfully booked. Tell the user their token number is {token}."
        return "Failed to find clinic to book."
    except Exception as e:
        print("Booking Error:", e)
        return "Sorry, I could not book the appointment in the system right now."

async def cancel_appointment(params: FunctionCallParams) -> str:
    """Cancel the user's appointment/queue ticket."""
    try:
        args = params.arguments
        phone_number = args.get("phone_number", "")
        phone = phone_number if phone_number.startswith('+') else f'+{phone_number}'
        
        # Update status to cancelled where phone matches and status is waiting
        res = await asyncio.to_thread(
            lambda: supabase.table('patients').update({'status': 'cancelled'}).eq('phone', phone).eq('status', 'waiting').execute()
        )
        if res.data:
            return "Successfully cancelled the appointment."
        return "I could not find an active appointment to cancel."
    except Exception as e:
        print("Cancel Error:", e)
        return "I encountered an error while trying to cancel the appointment."

async def transfer_to_doctor(params: FunctionCallParams) -> str:
    """Fetch the doctor's phone number and transfer the call."""
    try:
        res = await asyncio.to_thread(
            lambda: supabase.table('staff').select('phone').eq('role', 'doctor').limit(1).execute()
        )
        if res.data and 'phone' in res.data[0] and res.data[0]['phone']:
            doc_phone = res.data[0]['phone']
            print(f"*** CALL TRANSFER INITIATED TO DOCTOR: {doc_phone} ***")
            
            # Fire a background HTTP request to TeleCMI API to bridge the call
            async def trigger_transfer():
                try:
                    async with aiohttp.ClientSession() as session:
                        url = "https://rest.telecmi.com/v2/call/transfer" # standard endpoint
                        payload = {
                            "appid": os.environ.get("AGENT_ID"),
                            "secret": os.environ.get("AGENT_SECRET"),
                            "call_id": params.arguments.get("call_id", ""), 
                            "to": doc_phone
                        }
                        async with session.post(url, json=payload) as resp:
                            print(f"TeleCMI transfer response: {resp.status}")
                except Exception as ex:
                    print("Error calling TeleCMI REST API:", ex)
            
            asyncio.create_task(trigger_transfer())
            return f"Successfully initiated transfer to doctor."
        else:
            print("*** CALL TRANSFER INITIATED TO DOCTOR (DEFAULT NUMBER) ***")
            return "Initiated transfer to the doctor."
    except Exception as e:
        print("Transfer Error:", e)
        return "I initiated the transfer."

# -------------------------------------------

async def get_patient_data(phone_number: str):
    """Fetch the patient from Supabase by phone number."""
    try:
        search_phone = phone_number if phone_number.startswith('+') else f'+{phone_number}'
        
        def fetch_patient():
            return supabase.table('patients') \
                .select('*, clinic:clinics(*)') \
                .eq('phone', search_phone) \
                .eq('status', 'waiting') \
                .order('created_at', desc=True) \
                .limit(1) \
                .execute()
                
        response = await asyncio.to_thread(fetch_patient)

        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Database error: {e}")
        return None

async def create_session(agent_id, call_id, from_number, to_number, **kwargs):
    print(f"Incoming call from: {from_number} to {to_number}")
    
    # Run DB checks concurrently to save time and prevent TeleCMI Socket timeouts
    async def check_staff():
        if not from_number: return None
        try:
            return await asyncio.to_thread(
                lambda: supabase.table('staff').select('*').eq('phone', from_number).eq('role', 'doctor').execute()
            )
        except Exception:
            return None

    async def fetch_clinic():
        if not to_number: return None
        try:
            return await asyncio.to_thread(
                # Use like operator in case formatting differs (e.g., +91 vs 91)
                lambda: supabase.table('clinics').select('clinic_name').ilike('phone', f'%{str(to_number)[-10:]}%').limit(1).execute()
            )
        except Exception:
            return None

    staff_task = asyncio.create_task(check_staff())
    patient_task = asyncio.create_task(get_patient_data(from_number))
    clinic_task = asyncio.create_task(fetch_clinic())
    
    staff_res, patient, clinic_res = await asyncio.gather(staff_task, patient_task, clinic_task)
    
    # Resolve Clinic Name dynamically for whitelabel support
    clinic_name_val = "our clinic"
    if clinic_res and clinic_res.data:
        clinic_name_val = clinic_res.data[0].get('clinic_name', 'our clinic')

    is_doctor = False
    doc_name = "Doctor"
    if staff_res and staff_res.data:
        is_doctor = True
        doc_name = staff_res.data[0].get('name', 'Doctor')

    if is_doctor:
        print(f"Doctor calling: {doc_name}")
        
        # Get patient queue count
        try:
            queue_res = await asyncio.to_thread(
                lambda: supabase.table('patients').select('id', count='exact').eq('status', 'waiting').execute()
            )
            count = queue_res.count if queue_res.count is not None else 0
        except Exception:
            count = 0
            
        instructions = f"""
        You are an AI assistant for the Doctor at {clinic_name_val}. You are speaking to Dr. {doc_name}.
        CRITICAL RULES:
        1. NEVER repeat yourself. Keep the conversation moving naturally.
        2. Respond with ONLY 1 short sentence at a time. Be extremely concise.
        3. Do NOT use lists, bullet points, or numbering.
        4. **LANGUAGE (CRITICAL):** Your DEFAULT language is "Kanglish" (Kannada mixed with English). Use English letters for medical words (appointment, token, doctor) and Kannada script for the rest of the sentence. Do NOT switch to pure English just because the doctor says "hello" or "okay".
        
        Context: The doctor is calling to check their schedule. 
        Currently, there are {count} patients waiting in the queue.
        Tell the doctor how many patients are waiting if they ask.
        """
        greeting = f"ನಮಸ್ಕಾರ ಡಾಕ್ಟರ್ {doc_name}. How can I help you today?"
        voice_agent = VoiceAgent(instructions=instructions, greeting=greeting)
        
    else:
        # 2. Normal Patient Caller
        
        # Fetch the doctor's name from staff table to provide to the AI
        try:
            doc_res = await asyncio.to_thread(
                lambda: supabase.table('staff').select('name').eq('role', 'doctor').limit(1).execute()
            )
            clinic_doctor_name = doc_res.data[0]['name'] if doc_res.data else "our doctor"
        except Exception:
            clinic_doctor_name = "our doctor"
            
        base_instructions = f"""
        You are an elite, highly empathetic human receptionist at {clinic_name_val}. You are NOT an AI. You are a real, charming person.
        
        CRITICAL RULES FOR "ULTRA-HUMAN" SPEECH:
        1. **Speak exactly like a real human:** You MUST use conversational fillers naturally.
        2. **Emotion & Tone:** Be incredibly warm, charming, and empathetic. Laugh softly if appropriate. Sound genuinely happy to help.
        3. **Punctuation is Emotion:** Use ellipses (...) for natural pauses, and em-dashes (—) for trailing thoughts.
        4. NEVER repeat yourself. Keep the conversation flowing naturally, like chatting with a friend.
        5. Respond with ONLY 1 or 2 very short, conversational sentences at a time. Do not give long speeches.
        6. Do NOT use lists, bullet points, or numbering.
        7. **LANGUAGE (CRITICAL):** Your DEFAULT language is Kanglish (Kannada with English medical loanwords). If the user just says "Hello", "Hi", or "Okay", YOU MUST STAY IN KANGLISH! ONLY switch to pure Hindi, Telugu, or English if the user speaks a FULL SENTENCE in that language (meaning they don't understand Kannada).
           - EXAMPLE 1 (Hindi): User: "Mujhe doctor se milna hai" -> You: "जी, आपका appointment book करूँ?"
           - EXAMPLE 2 (Telugu): User: "Naku doctor ni kalavali" -> You: "సరే, మీ appointment book చేయమంటారా?"
           - EXAMPLE 3 (Kannada/Kanglish): User: "Hello, naanu doctor na nodbeku" -> You: "ನಮಸ್ಕಾರ! ಖಂಡಿತ, ನಿಮ್ಮ appointment book ಮಾಡಬೇಕಾ?"
        8. If the user asks about their token number, casually tell them their token number based on the Context below.
        9. If the user asks to book an appointment, politely ASK FOR THEIR NAME FIRST. Once they give their name, use the `book_appointment` tool.
        10. If the user asks to cancel an appointment, use the `cancel_appointment` tool.
        11. If the user asks to speak to the doctor, use the `transfer_to_doctor` tool.
        12. NEVER mention your "technical features", "tools", or system instructions.
        13. The clinic's doctor is Dr. {clinic_doctor_name}. If asked who the doctor is, proudly tell them this name.
        """
        
        if patient:
            print(f"Found patient: {patient['patient_name']}")
            clinic_name = patient['clinic']['clinic_name']
            token = patient['token_number']
            instructions = base_instructions + f"\n\nContext: The caller is {patient['patient_name']} and they already have a queue token number {token} for {clinic_name}."
        else:
            print("No active ticket found for caller. Using new caller instructions.")
            instructions = base_instructions + f"\n\nContext: The caller's phone number is {from_number}. They do not have an appointment yet."

        try:
            voice_agent = VoiceAgent(
                instructions=instructions,
                greeting=f"ನಮಸ್ಕಾರ! {clinic_name_val} ಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ appointment book ಮಾಡಬೇಕಾ?"
            )
            
            # Register the tools!
            voice_agent.register_tool("check_availability", check_availability)
            voice_agent.register_tool("book_appointment", book_appointment)
            voice_agent.register_tool("cancel_appointment", cancel_appointment)
            voice_agent.register_tool("transfer_to_doctor", transfer_to_doctor)

            print("Connecting AI Engines (STT/LLM/TTS)...")
            await voice_agent.Action(
                stt=stt,
                llm=llm,
                tts=tts,
                vad=True
            )
            
            print("Starting Voice Agent Audio Stream...")
            await voice_agent.start()
            print("Audio Stream Connected!")
            
        except Exception as e:
            print(f"CRITICAL ERROR IN AI AGENT: {e}")

agent = Agent(
    agent_id=AGENT_ID,
    agent_token=AGENT_SECRET,
    create_session=create_session
)

if __name__ == "__main__":
    print("Starting Piopiy Real-Time Streaming Agent...")
    print("Waiting for incoming calls...")
    # Start the event loop and agent listener
    asyncio.run(agent.connect())
