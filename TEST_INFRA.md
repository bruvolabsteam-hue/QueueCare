# Test Infrastructure — E2E Opaque-Box Testing

This document defines the E2E testing infrastructure for the self-hosted AI integration (Ollama, ElevenLabs, Exotel, WhatsApp, and Settings UI) in the BruvoFlow platform. The tests are requirement-driven and opaque-box, meaning they execute against the public HTTP API endpoints of the Next.js applications and mock external services, without calling internal code modules.

---

## 1. Mock Server Architecture

To facilitate completely offline testing without relying on external APIs, we use a zero-dependency mock server built in Node.js. It runs on `http://localhost:4000` and mocks the following services:

### A. Supabase Mock API
- **Endpoint**: `/supabase/v1/`
- **Mocks**:
  - `GET /supabase/v1/global_settings`: Returns the currently configured AI credentials.
  - `PATCH /supabase/v1/global_settings`: Updates credentials from the Settings UI.
  - `GET /supabase/v1/patients`: Returns patient token and status.
  - `GET /supabase/v1/clinics`: Returns clinic details.
  - `POST /supabase/v1/rpc/generate_daily_token`: Generates and returns a new daily token.

### B. Ollama Mock API
- **Endpoint**: `/ollama/api/chat`
- **Payload**: Captures chat completions requests and returns mock text responses matching the `llama3` schema.

### C. ElevenLabs Mock API
- **Endpoint**: `/elevenlabs/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`
- **Payload**: Returns a mock binary audio buffer representing speech audio.

### D. WhatsApp Mock API
- **Endpoint**: `/whatsapp/v19.0/:phoneNumberId/messages`
- **Payload**: Captures outbound text messages and returns Meta API success receipts.

### E. Exotel Mock API
- **Endpoint**: `/exotel/v1/Accounts/:sid/Sms/send.json`
- **Payload**: Captures outbound SMS text messages and returns Exotel success receipts.

### F. Control & Assertion Endpoints
- `POST /mock-inspect/state/reset`: Resets all mock data structures and captured request queues.
- `POST /mock-inspect/state/set`: Pre-populates mock data (e.g., patient records or settings credentials).
- `GET /mock-inspect/whatsapp/last`: Retrieves the last captured WhatsApp request.
- `GET /mock-inspect/exotel/last`: Retrieves the last captured Exotel request.
- `GET /mock-inspect/ollama/last`: Retrieves the last captured Ollama request.
- `GET /mock-inspect/requests`: Retrieves all captured requests.

---

## 2. Environment Configuration

To run the Next.js dashboards against the mock server, configure the environment variables as follows:

```env
# Next.js App Environment Configuration (.env.test)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:4000/supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key
SUPABASE_SERVICE_ROLE_KEY=mock-service-role-key

# Service Mock Redirects
OLLAMA_URL=http://localhost:4000/ollama
ELEVENLABS_API_KEY=mock-elevenlabs-key
WHATSAPP_PHONE_NUMBER_ID=mock-waba-id
```

---

## 3. Test Runner Design

The test runner is a Node.js script that:
1. Starts the Mock Server in the background.
2. Checks that the Next.js application servers (Super Admin on port `3002`, Clinic Dashboard on port `3000`) are running.
3. Iteratively runs the test suite scripts.
4. For each test case:
   - Resets mock server state.
   - Sets up initial state (e.g., waiting patient in database).
   - Sends the target request (e.g., WhatsApp webhook payload or Exotel inbound request).
   - Asserts on the response status, body, or headers.
   - Asserts on what requests were captured by the mock server (e.g., verifying that a WhatsApp reply was sent with the correct text).
5. Cleans up background processes and exits with status `0` (success) or `1` (failure).

### Validation (Dry-run / Mock Target) Mode
The runner can spin up an in-process mock target HTTP server representing the Next.js app on port `3000` to verify that the mock server, tests, and runner are fully operational.
Run:
```bash
node tests/e2e/runner.js --mock-target
```

---

## 4. Test Case Inventory (60 Cases)

### Tier 1: Feature Coverage (25 Cases)

#### Feature 1: Settings UI Configuration
- **T1.1.1**: Settings page load fetches global settings row from Supabase.
- **T1.1.2**: Update Ollama URL successfully saves to `global_settings.ollama_url`.
- **T1.1.3**: Update ElevenLabs API key successfully saves to `global_settings.elevenlabs_api_key`.
- **T1.1.4**: Update Exotel credentials successfully saves account SID, API key, and API token.
- **T1.1.5**: Update WhatsApp API key and global support number successfully saves to database.

#### Feature 2: Ollama LLM Integration
- **T1.2.1**: LLM client constructs system prompt containing patient name, token number, and clinic name.
- **T1.2.2**: LLM client constructs user query containing message body.
- **T1.2.3**: LLM client issues HTTP POST to `/api/chat` with model set to `llama3`.
- **T1.2.4**: LLM client parses assistant message body and returns raw text response.
- **T1.2.5**: LLM client handles missing patient wait times by outputting generic queue instructions.

#### Feature 3: Exotel Webhook XML
- **T1.3.1**: Inbound webhook accepts POST and returns status 200 with XML content headers.
- **T1.3.2**: Inbound webhook returns valid XML root tag `<Response>`.
- **T1.3.3**: Webhook includes `<Gather>` tag with `input="speech"` and timeout parameters.
- **T1.3.4**: Webhook sets `<Gather>` action attribute to the callback path `/api/webhooks/exotel?action=speech`.
- **T1.3.5**: Webhook returns XML with `<Hangup>` tag when processing termination.

#### Feature 4: ElevenLabs TTS & Playback
- **T1.4.1**: TTS client sends text payload to ElevenLabs URL with selected voice ID.
- **T1.4.2**: TTS client authorization header contains the configured ElevenLabs API key.
- **T1.4.3**: Audio endpoint `/api/webhooks/exotel/audio` returns binary MP3/MPEG payload.
- **T1.4.4**: Audio endpoint response sets `Content-Type: audio/mpeg`.
- **T1.4.5**: Audio stream caches generated files to prevent duplicate ElevenLabs API charges.

#### Feature 5: WhatsApp Integration
- **T1.5.1**: GET webhook request returns hub challenge when verify token matches.
- **T1.5.2**: Webhook POST matches incoming phone number against active waiting patients in database.
- **T1.5.3**: Webhook calls Ollama integration with waiting patient data.
- **T1.5.4**: Webhook calls Meta Graph API to send WhatsApp message back.
- **T1.5.5**: Meta Graph API request is authorized using the saved WhatsApp API key.

---

### Tier 2: Boundary & Corner Cases (25 Cases)

#### Feature 1: Settings UI Configuration
- **T2.1.1**: Clear credentials saves empty settings columns successfully.
- **T2.1.2**: Database connection failure shows clear error message in settings panel.
- **T2.1.3**: Ollama URL input validation rejects malformed URLs.
- **T2.1.4**: Exotel API key input validation rejects missing colon separators.
- **T2.1.5**: Multiple concurrent settings saves are debounced and processed sequentially.

#### Feature 2: Ollama LLM Integration
- **T2.2.1**: Ollama server returns 500 error; client yields friendly fallback text.
- **T2.2.2**: Ollama request times out; client fails fast to avoid holding webhook connections.
- **T2.2.3**: Ollama returns extremely long response; client truncates to fit WhatsApp constraints.
- **T2.2.4**: Patient name contains special characters/Unicode; LLM constructs prompt without encoding corruption.
- **T2.2.5**: No configuration row exists in Supabase; Ollama client returns fallback.

#### Feature 3: Exotel Webhook XML
- **T2.3.1**: Unregistered incoming number returns XML indicating no active queue ticket.
- **T2.3.2**: Speech transcription is empty; webhook asks caller to repeat input.
- **T2.3.3**: Webhook POST payload missing caller number returns 400 Bad Request.
- **T2.3.4**: Supabase database error occurs; webhook yields fallback XML stating system maintenance.
- **T2.3.5**: Webhook called with invalid action parameter returns 400 Bad Request.

#### Feature 4: ElevenLabs TTS & Playback
- **T2.4.1**: ElevenLabs API returns 401 Unauthorized; audio streamer yields fallback sound.
- **T2.4.2**: ElevenLabs API returns 429 Rate Limit; audio streamer serves cached fallback audio.
- **T2.4.3**: Audio streamer queried with invalid or expired audio ID returns 404 Not Found.
- **T2.4.4**: ElevenLabs API returns malformed/empty body; audio streamer handles gracefully.
- **T2.4.5**: Concurrent requests for the same audio ID stream cached file without issuing duplicate API calls.

#### Feature 5: WhatsApp Integration
- **T2.5.1**: GET webhook verification fails with invalid verify token and returns 403 Forbidden.
- **T2.5.2**: Incoming WhatsApp message from unregistered number receives generic reception message.
- **T2.5.3**: WhatsApp Graph API returns 400 Bad Request; webhook logs error gracefully.
- **T2.5.4**: Malformed JSON payload received; webhook returns 200 to acknowledge but ignores event.
- **T2.5.5**: Multiple active wait tickets found for phone number; webhook routes to the newest ticket.

---

### Tier 3: Cross-Feature Combinations (5 Cases)
- **T3.1 (Settings + WhatsApp)**: Updating Ollama URL in Settings UI immediately changes the target host for subsequent WhatsApp webhook requests.
- **T3.2 (Voice Webhook Pipeline)**: Receiving an inbound call, calling Ollama for response text, converting it to ElevenLabs audio, and returning `<Play>` XML referencing the generated ID.
- **T3.3 (Credentials Clearing)**: Clearing settings keys causes both WhatsApp and Exotel endpoints to bypass external calls and return fallbacks.
- **T3.4 (Concurrency)**: Simulating concurrent incoming WhatsApp message and Exotel call maintains correct isolated sessions and caches.
- **T3.5 (State Sync)**: A patient's token is updated in the database during an active Exotel call; the next voice webhook response reflects the updated token value.

---

### Tier 4: Real-World Scenarios (5 Cases)
- **T4.1 (Complete Voice Registration to Playback)**: Patient dials, asks "How long is my wait?", system generates token, fetches queue state, calls Ollama and ElevenLabs, and plays wait time audio.
- **T4.2 (Patient WhatsApp Queue Query)**: Patient queries "What's my status?", system replies with correct active token numbers and estimated wait time via WhatsApp API.
- **T4.3 (Immediate System Switchover)**: Changing Ollama URL to a remote WSL IP immediately directs the next WhatsApp message and call to the new server.
- **T4.4 (Ollama Outage Recovery)**: System successfully handles Ollama downtime by falling back to static IVR and WhatsApp responses.
- **T4.5 (Multi-Clinic Isolation)**: Two concurrent calls/messages from different clinics receive separated, clinic-specific names and queue statuses.
