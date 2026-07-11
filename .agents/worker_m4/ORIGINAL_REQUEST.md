## 2026-07-11T00:08:30Z

You are the worker for Milestone 4: Exotel Webhook & Audio Streamer.
Your working directory is C:\Users\HOME\OneDrive\Attachments\ai agent\.agents\worker_m4.

Your task is to:
1. Implement the Exotel voice webhook route in `super_admin_web/src/app/api/webhooks/exotel/route.ts`:
   - It must handle POST requests (and optionally GET if needed, but definitely POST).
   - Read the incoming parameters: `From` (phone number) and `TranscriptionText` (the transcribed speech if Exotel gathered speech).
   - If `From` is missing, return a 400 Bad Request status.
   - Read the query parameters `action` (e.g. `action=speech` or `action=hangup`).
   - If `action === 'hangup'`, return valid Exoml XML:
     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <Response>
       <Play>/api/webhooks/exotel/audio?id=hangup</Play>
       <Hangup/>
     </Response>
     ```
   - Query Supabase Admin for the patient with phone number = `From` and status = `waiting`. Use `supabaseAdmin` client. Join the clinic details using `.select('*, clinic:clinics(*)')`.
   - If there is a database error or if the patient is not found:
     - Return valid Exoml XML containing `<Play>/api/webhooks/exotel/audio?id=no-ticket</Play>` and `<Hangup/>`.
   - If the request is the initial call (no `action` parameter):
     - Return valid Exoml XML containing a `<Gather>` tag wrapping a `<Play>/api/webhooks/exotel/audio?id=welcome</Play>` tag. The Gather action should point to `/api/webhooks/exotel?action=speech` with method `POST` and a suitable timeout (e.g. `5`).
   - If `action === 'speech'`:
     - If `TranscriptionText` is empty, return valid Exoml XML containing a `<Gather>` tag wrapping a `<Play>/api/webhooks/exotel/audio?id=repeat</Play>` tag.
     - If `TranscriptionText` is present:
       - Call `generatePatientResponse` (imported from `@/lib/ai/claude`) passing `TranscriptionText`, `patient`, and `patient.clinic`.
       - Generate a unique ID for this audio response (e.g., `audio-[timestamp]-[random]`).
       - Store the AI response text in a global cache associated with the audio ID. (You can declare a global Map like `global.textCache = global.textCache || new Map()` in a utility or directly in the route file to store the text).
       - Return valid Exoml XML containing a `<Gather>` tag wrapping a `<Play>/api/webhooks/exotel/audio?id=[audioId]</Play>` tag. The Gather action should point to `/api/webhooks/exotel?action=speech`.
2. Implement the ElevenLabs audio caching and streaming route in `super_admin_web/src/app/api/webhooks/exotel/audio/route.ts`:
   - It must handle GET requests.
   - Parse the `id` from the query parameters.
   - If `id` is one of the static fallback IDs (`no-ticket`, `repeat`, `maintenance`, `welcome`, `hangup`), return a small dummy audio buffer (e.g., 64 bytes of empty data or a simple tone) with `Content-Type: audio/mpeg`.
   - Implement an audio cache (e.g., `global.audioCache = global.audioCache || new Map()`) to prevent duplicate ElevenLabs API charges for the same audio ID.
   - If the audio is already in the cache, stream it back with `Content-Type: audio/mpeg`.
   - If not in cache, retrieve the corresponding text from `global.textCache`. If not found, use a default text.
   - Fetch the ElevenLabs text-to-speech API (via POST to `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`) using the `elevenlabs_api_key` configured in `global_settings` (retrieve this from the database).
     - Authorize using header `xi-api-key`.
     - Request body: `{ "text": text, "model_id": "eleven_monolingual_v1" }`.
   - Read the response as an ArrayBuffer, convert it to a Buffer, cache it in `global.audioCache`, and return it with `Content-Type: audio/mpeg`.
3. Update progress.md in your working directory to track your status.
4. Write your final handoff report to handoff.md in your working directory.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

When done, message the parent orchestrator (conversation ID 874b0b0c-afad-4bc5-a42e-40206197b926) with the path to your handoff.md.
