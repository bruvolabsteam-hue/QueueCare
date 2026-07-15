# Original User Request

## Initial Request — 2026-07-10T17:59:09Z

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Build a completely self-hosted, budget-friendly AI infrastructure for BruvoFlow replacing cloud AI services with a local Ollama instance, and replacing Bland AI with a custom Exotel + ElevenLabs IVR system.

Working directory: `C:/Users/HOME/OneDrive/Attachments/ai agent`
Integrity mode: development

## Requirements

### R1. Ollama Integration (Backend)
Replace the existing Claude/Groq LLM logic in `super_admin_web/src/lib/ai/claude.ts` with a local Ollama integration. It must communicate with the Ollama instance running on WSL (e.g., `http://127.0.0.1:11434` or the appropriate WSL network IP). It should support standard models like `llama3`.

### R2. Exotel Conversational Voice Agent (Backend)
Build a new webhook route (`super_admin_web/src/app/api/webhooks/exotel/route.ts`) to handle inbound phone calls from Exotel. The endpoint must:
- Generate an Exoml (XML) response to answer the call and `<Gather>` user speech.
- Pass the transcribed speech to the local Ollama brain.
- Take Ollama's text response and use the **ElevenLabs API** to convert it to an audio file.
- Host or stream the audio file back to Exotel via `<Play>`.

### R3. WhatsApp Integration Update (Backend)
Ensure the existing WhatsApp webhook (`super_admin_web/src/app/api/webhooks/whatsapp/route.ts`) successfully routes inbound messages to the new Ollama brain instead of the cloud APIs, and replies to the patient.

### R4. Global Settings UI Update (Frontend)
Update the Clinic Dashboard and Super Admin UI (`super_admin_web/src/app/(dashboard)/settings/ai/page.tsx`) to remove Bland AI and Anthropic keys, and instead securely accept:
- Ollama Local URL/IP Address
- ElevenLabs API Key
- Exotel Credentials

## Acceptance Criteria

### Ollama Functionality
- [ ] A curl request or test script to the WhatsApp webhook successfully receives a generated response originating from the local WSL Ollama instance.
- [ ] The `global_settings` database schema correctly stores the Ollama URL.

### Voice Agent Pipeline
- [ ] The Exotel webhook correctly outputs valid Exoml XML containing a `<Gather>` tag for speech recognition.
- [ ] The webhook contains the full pipeline logic: Exotel Speech -> Ollama Text -> ElevenLabs Audio -> Exotel Play.

### Automation & UI
- [ ] The Super Admin UI successfully saves the ElevenLabs and Ollama configuration without errors.

## Follow-up — 2026-07-11T06:07:53Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Investigate and fix the critical errors currently occurring in the BruvoFlow AI infrastructure. The user attempted to test the system with real API keys and local WSL Ollama, but encountered failures.

Working directory: `C:/Users/HOME/OneDrive/Attachments/ai agent/super_admin_web`
Integrity mode: development

## Team Structure
You must operate with exactly **two** specialized subagents:
1. **QA Tester**: Responsible for running the server, sending mock requests, finding the exact error logs, and reporting them.
2. **Senior Developer**: Responsible for analyzing the error logs, writing the code fixes, and verifying with the tester.

## Requirements

### R1. Reproduce the Error (QA Tester Track)
The QA/Testing expert agent must spin up the local Next.js development server (`npm run dev`) and systematically test the critical pathways:
- Test the Global AI Settings UI (`/settings/ai`) to ensure it saves and loads keys correctly without crashing.
- Send a mock POST request to the WhatsApp webhook (`/api/webhooks/whatsapp`) to see if it successfully communicates with Ollama.
- Send a mock POST request to the Exotel webhook (`/api/webhooks/exotel`) to see if it generates valid XML and calls ElevenLabs.

### R2. Diagnose and Fix (Senior Developer Track)
The Senior Error Fixing Expert agent must analyze the stack traces or failures produced by R1 and implement permanent fixes in the codebase. Potential areas of failure to check:
- Were the database migrations for `global_settings` actually executed, or is the app crashing because the columns (`ollama_url`, `elevenlabs_api_key`, `exotel_account_sid`) don't exist?
- Is the Ollama fetch call in `claude.ts` failing due to network/CORS issues with WSL, or malformed JSON payloads?
- Is the ElevenLabs TTS API failing due to incorrect headers or payload formats?

### R3. Validation
The team must prove the error is fixed by demonstrating a successful 200 OK response from the webhooks using a test script.

## Acceptance Criteria

### Diagnostics
- [ ] A test script is created and executed that successfully reproduces the crash or error.
- [ ] The root cause of the error is clearly identified and logged.

### Resolution
- [ ] Code fixes are applied to resolve the root cause.
- [ ] The test script is re-run and confirms a successful 200 OK response with correct data structures (e.g., valid Exoml XML or valid WhatsApp JSON).

## Follow-up — 2026-07-11T06:09:49Z

CRITICAL UPDATE FROM USER: The root cause of the error has been identified! 
The user is running the `qwen2.5` model on Ollama, but our code in `claude.ts` hardcoded the model to `llama3`. Because it requested a model that wasn't installed, Ollama crashed. Furthermore, the Ollama instance is accessible via the normal Windows command, so standard localhost binding applies.

You must immediately execute the following fix:
1. Update `super_admin_web/src/app/(dashboard)/settings/ai/page.tsx` to add an 'Ollama Model Name' text input field.
2. Update the `global_settings` database schema to include an `ollama_model` column.
3. Update `super_admin_web/src/lib/ai/claude.ts` to dynamically fetch and use the model name from the database instead of hardcoding it to 'llama3'.



## Follow-up — 2026-07-11T07:30:14Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Perform a comprehensive End-to-End (E2E) test of the BruvoFlow system now that local Supabase and Ollama are fully online. The team will aggressively hunt for any remaining bugs.

Working directory: `C:/Users/HOME/OneDrive/Attachments/ai agent`
Integrity mode: development

## Team Structure
You must operate with exactly **three** specialized subagents:
1. **Lead QA Tester**: Responsible for running the Next.js servers and coordinating the test plan.
2. **Secondary QA Tester**: Responsible for aggressively firing mock payloads at the webhooks (Exotel/WhatsApp) to try and break the system.
3. **Senior Developer**: Responsible for analyzing any bugs found by the two testers and patching the code.

## Requirements

### R1. Comprehensive Local Testing
The two testing agents must work together to test the entire system locally:
- Spin up the `super_admin_web` and `clinic-dashboard` local development servers.
- Verify the connection to the local Supabase instance.
- Test the Global AI Settings UI to ensure keys and the Ollama model name save properly.

### R2. Webhook Stress Testing
The Secondary QA Tester must fire multiple mock requests:
- Send simulated WhatsApp POST payloads to `/api/webhooks/whatsapp`.
- Send simulated Exotel voice POST payloads to `/api/webhooks/exotel`.
- Verify that the local WSL Ollama instance (qwen2.5) successfully processes the requests and returns valid responses.

## Acceptance Criteria

### Testing Complete
- [ ] Both QA Testers have successfully executed their test suites without the server crashing.
- [ ] The webhooks return 200 OK responses with valid XML (Exotel) and JSON (WhatsApp).
- [ ] If any bugs are found, the Senior Developer has successfully patched them and the testers have verified the fix.

## Follow-up — 2026-07-15T01:46:11Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Refactor the AI Voice Agent system by migrating entirely to TeleCMI (removing Exotel and WhatsApp), updating login panel branding to "BruvoLabs", and simplifying AI terminology to "Brain".

Working directory: `C:/Users/HOME/OneDrive/Attachments/ai agent`
Integrity mode: development

## Requirements

### R1. Branding Updates
Update the login pages/panels in both the `super_admin_web` and `clinic-dashboard` to use the name "BruvoLabs".

### R2. AI Terminology Simplification
In the settings UI (both Super Admin and Clinic Dashboard), remove explicit references to "Ollama" and "Groq". Instead, unify and rename the AI configuration section simply to "Brain" (or "Brain Settings").

### R3. TeleCMI Migration
Remove all codebase references, API routes, and webhooks related to Exotel and WhatsApp. Replace them entirely with TeleCMI integration, as TeleCMI handles both calling, SMS, and WhatsApp out of the box.

### R4. Schema Updates
Identify and update the database schema (e.g. `global_settings`) to remove `exotel_*` and `whatsapp_*` columns, and add appropriate `telecmi_*` credential columns.

## Acceptance Criteria

### Verification
- [ ] The codebase contains zero active references to Exotel or the old WhatsApp API integration.
- [ ] The `super_admin_web` and `clinic-dashboard` UIs cleanly expose fields for TeleCMI credentials and "Brain" configuration.
- [ ] Code compiles and builds without type errors related to the removed Exotel/WhatsApp variables.

## Follow-up — 2026-07-15T01:49:13Z

[USER FOLLOW-UP REQUEST] The user has requested a pivot/addition to the current refactoring plan: 
1. The "Brain" AI integration MUST use Groq API under the hood (so we are reverting back from Ollama to Groq, but keeping the UI terminology simplified to "Brain").
2. The user also wants to ensure that the token generation and queue system is tested and fully working.

Please integrate these requirements into your current milestone planning!

## Follow-up — 2026-07-15T02:13:57Z

[USER FOLLOW-UP REQUEST] The user has requested a final pivot/addition:
Ensure the project is correctly connected to the BruvoLabs GitHub repository and the BruvoLabs Supabase cloud account before wrapping up. Please integrate this as Milestone 6 (Deployment & Linking) in your plan!

## Follow-up — 2026-07-15T02:23:51Z

[STATUS UPDATE FROM MAIN AGENT]
I have diagnosed and permanently fixed the login bug the user reported yesterday! The issue was in `20260101000016_auth_provisioning.sql` where `admin1@queuecare.local` wasn't being recognized as a `super_admin`, causing them to fail the `get_user_role` check on login.
I have patched the SQL file and I am currently running `npx supabase db reset` to apply the fix globally.
You may proceed with finalizing Milestone 5 and 6!



