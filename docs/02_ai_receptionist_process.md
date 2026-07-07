# AI Receptionist Agent - Process & Features

The AI Receptionist is the core conversational agent of the system, designed to handle phone calls, answer queries, and book appointments fully autonomously.

## Key Files & Locations

- **Webhook Endpoints**: `backend/app/api/v1/ai_receptionist.py`
- **Core AI Logic**: `backend/app/services/ai_receptionist_service.py`
- **Missed Call Service**: `backend/app/services/missed_call_recovery_service.py`
- **Tool Executor**: `backend/app/services/ai_tools_executor.py`

## The Full Agent Process

1. **Incoming Call Hook (Exotel Integration)**
   - When a patient calls the clinic's virtual number, Exotel intercepts the call and posts the call data to the `/webhook/exotel/incoming` endpoint.
   - The system retrieves the caller's phone number and fetches patient context.

2. **Speech-to-Text (STT)**
   - Audio from the caller is passed to the Speech-to-Text provider (OpenAI Whisper).
   - The resulting transcript is generated and logged.

3. **LLM Context & Decision Making**
   - The transcript is added to a system prompt that gives the AI identity context ("You are the OmniCare AI Receptionist for clinic ID...").
   - The OpenAI LLM Engine processes the message.

4. **Autonomous Tool Execution (`AIToolsExecutor`)**
   - If the LLM determines it needs more information (e.g., checking doctor availability or booking an appointment), it invokes internal tools.
   - The `AIToolsExecutor` captures these function calls, executes HTTP REST calls to the internal system APIs, and returns the result back to the LLM.
   - This loops (up to 3 times) until the LLM arrives at a final conversational answer.

5. **Text-to-Speech (TTS)**
   - The finalized text response from the LLM is sent to ElevenLabs to generate a realistic, human-like audio response (`voice_id="21m00Tcm4TlvDq8ikWAM"`).

6. **Response & Call Logging**
   - The audio URL is returned back to Exotel to be played over the phone to the caller.
   - The entire transcript, duration, and patient intent are securely saved to the database.

## Missed Call Recovery
If a call is missed or dropped, Exotel hits the `/webhook/exotel/missed-call` endpoint, triggering the **Missed Call Recovery Service** which can automatically queue a follow-up action or SMS for the patient.
