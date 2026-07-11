# Handoff Report: E2E Test Strategy & Exploration

This handoff report synthesizes observations, designs, and test cases for testing the BruvoFlow budget-friendly AI infrastructure using an opaque-box E2E test harness.

---

## 1. Observation

### A. Codebase Exploration
We inspected the codebase and verified the status of the five key features:

1. **Ollama Integration (Backend)**:
   - **File**: `super_admin_web/src/lib/ai/claude.ts`
   - **Observation**: It does NOT use Ollama yet. It is configured to fetch `anthropic_api_key` and `claude_model_version` from `global_settings` (lines 10-14), but overrides it with a direct fetch to the external Groq completions API (lines 50-65).
   - **Line References**:
     ```typescript
     // super_admin_web/src/lib/ai/claude.ts
     50:     const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
     ...
     57:         model: 'llama3-8b-8192',
     ```

2. **Exotel Webhook XML (Backend)**:
   - **Observation**: There is no folder or file for Exotel webhooks in `super_admin_web/src/app/api/webhooks/exotel`.
   - **File Search Result**: `find_by_name` returned no files matching `exotel/route.ts` or similar in `super_admin_web/src/app/api`.
   - **Status**: Not implemented.

3. **ElevenLabs TTS & Playback (Backend)**:
   - **Observation**: No files or endpoints exist for ElevenLabs text-to-speech integration or caching.
   - **File Search Result**: No route files exist at `super_admin_web/src/app/api/webhooks/exotel/audio/route.ts`. No ElevenLabs SDK or modules are imported in the codebase.
   - **Status**: Not implemented.

4. **WhatsApp Integration (Backend)**:
   - **File**: `super_admin_web/src/app/api/webhooks/whatsapp/route.ts`
   - **Observation**: The WhatsApp webhook receiver exists and handles verification (GET) and incoming messages (POST) (lines 10-87). However, it delegates response generation to the `generatePatientResponse` method (line 69), which currently queries Groq instead of the local Ollama WSL instance.
   - **Line References**:
     ```typescript
     // super_admin_web/src/app/api/webhooks/whatsapp/route.ts
     69:             const aiReply = await generatePatientResponse(
     70:               text, 
     71:               patient, 
     72:               patient.clinic
     73:             );
     ```
   - **Status**: Partially implemented (structure is in place, but LLM engine routing is pending).

5. **Settings UI Configuration (Frontend)**:
   - **File**: `super_admin_web/src/app/(dashboard)/settings/ai/page.tsx`
   - **Observation**: The Settings UI exists but still points to Anthropic and Bland AI credentials instead of Ollama, ElevenLabs, and Exotel. It has state conflicts where Bland AI inputs and Exotel inputs map to the same React state variable `exotelSid` and `voiceKey`.
   - **Line References**:
     ```typescript
     // super_admin_web/src/app/(dashboard)/settings/ai/page.tsx
     15:   const [modelVersion, setModelVersion] = useState("claude-3-haiku-20240307");
     16:   const [anthropicKey, setAnthropicKey] = useState("");
     17:   const [exotelSid, setExotelSid] = useState("");
     18:   const [voiceKey, setVoiceKey] = useState("");
     ...
     149:                   value={exotelSid}
     150:                   onChange={e => setExotelSid(e.target.value)}
     ...
     184:                   value={exotelSid}
     185:                   onChange={e => setExotelSid(e.target.value)}
     ```
   - **Status**: Partially implemented (needs layout, input state, and DB field mapping refactoring).

6. **Database Migrations (Backend)**:
   - **File**: `supabase/migrations/20260101000018_create_global_settings.sql`
   - **Observation**: The schema successfully defines the `global_settings` table, including `ollama_url`, `elevenlabs_api_key`, `exotel_account_sid`, `exotel_api_key`, `exotel_api_token`, `whatsapp_api_key`, and `support_whatsapp_number`.
   - **Line References**:
     ```sql
     CREATE TABLE public.global_settings (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       ollama_url TEXT DEFAULT 'http://127.0.0.1:11434',
       elevenlabs_api_key TEXT,
       exotel_account_sid TEXT,
       exotel_api_key TEXT,
       exotel_api_token TEXT,
       whatsapp_api_key TEXT,
       support_whatsapp_number VARCHAR,
       updated_at TIMESTAMPTZ DEFAULT NOW()
     );
     ```

---

## 2. Logic Chain

1. **Test Feasibility**:
   - Because the target implementation uses local WSL HTTP endpoints (`http://127.0.0.1:11434` for Ollama) and external third-party webhooks/APIs (ElevenLabs, Meta/WhatsApp Graph API, Exotel API), we can intercept all outward HTTP traffic.
   - We must design a zero-dependency mock server running locally (e.g. port `4000`) that acts as a local replacement for all five APIs.

2. **Zero-Dependency Mock Server**:
   - Node.js's built-in `http` module allows parsing incoming request paths, capturing JSON or form bodies, and returning structured JSON or binary mock audio data.
   - We can instantiate an in-memory database representation (`state` object) inside the mock server to simulate the Supabase REST responses for patient queues, clinic wait times, and global settings.
   - We can expose `/mock-inspect` routes so the E2E test runner can programmatically seed data (`POST /mock-inspect/state/set`) and query captured requests (`GET /mock-inspect/whatsapp/last`) to perform assertions.

3. **Required Test Cases Count**:
   - We have designed a 60-test-case catalog spanning Feature Coverage (Tier 1: 25 cases), Boundary & Corner Cases (Tier 2: 25 cases), Cross-Feature Combinations (Tier 3: 5 cases), and Real-World Scenarios (Tier 4: 5 cases). This matches the requirements (N=5 features, 5*N Tier 1, 5*N Tier 2, N Tier 3, max(5, N/2) Tier 4).

---

## 3. Caveats

* **Offline Limitation**: The test suite is designed to run in offline `CODE_ONLY` mode. Real-world differences in Meta's SSL handshake or Exotel's specific request routing headers must be simulated based on documented specs.
* **Database Mocking**: We mock the REST interface generated by Supabase (PostgREST), not a live PostgreSQL database server. If the Next.js code uses highly complex SQL RPCs or triggers not replicated in our mock server logic, the mock server response definitions must be updated to cover them.
* **Bland AI Remnant**: The existing Bland AI webhook (`super_admin_web/src/app/api/webhooks/bland/route.ts`) remains in the directory and is not modified by this milestone, but it will be bypassed in favor of the new Exotel IVR pipeline.

---

## 4. Conclusion

The testing infrastructure requires a mock server that simulates Next.js's external services. We have mapped out all 60 test cases and defined the zero-dependency test runner design. The complete test documentation is authored at `.agents/explorer_init/proposed_TEST_INFRA.md`.

---

## 5. Verification Method

### A. Verify Mock Server Functionality
Once the mock server script is written, it can be tested using the built-in Node command:
```powershell
node tests/e2e/mock-server.js
```
Then send a GET or POST using curl/Invoke-RestMethod:
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/supabase/v1/global_settings" -Method Get
```

### B. Verify Test Runner Script
Run the proposed E2E test runner:
```powershell
node tests/e2e/run-tests.js
```
Invalidation conditions:
- Next.js application servers are not running on ports `3000` or `3002`.
- The environment variables in `.env.test` are missing or point to live production servers.
