## 2026-07-10T18:32:26Z
You are the worker for Milestones 2 and 3: Settings UI Refactoring & Ollama Integration.
Your working directory is C:\Users\HOME\OneDrive\Attachments\ai agent\.agents\worker_m2_m3.
Your task is to:
1. Update the Settings UI in `super_admin_web/src/app/(dashboard)/settings/ai/page.tsx`:
   - Remove the Anthropic and Bland AI sections.
   - Add an Ollama Engine section (for configuring the Ollama Local URL/IP Address `ollama_url`).
   - Add an ElevenLabs TTS Engine section (for configuring the ElevenLabs API Key `elevenlabs_api_key`).
   - Add an Exotel Credentials section with inputs for Exotel Account SID (`exotel_account_sid`), Exotel API Key (`exotel_api_key`), and Exotel API Token (`exotel_api_token`).
   - Retain the WhatsApp Business API section (`whatsapp_api_key` and `support_whatsapp_number`).
   - Ensure all input state variables are separate and do not mirror/conflict.
   - Map these UI inputs correctly to read and save to public.global_settings:
     - `ollama_url`
     - `elevenlabs_api_key`
     - `exotel_account_sid`
     - `exotel_api_key`
     - `exotel_api_token`
     - `whatsapp_api_key`
     - `support_whatsapp_number`
2. Update the AI integration in `super_admin_web/src/lib/ai/claude.ts`:
   - Fetch the single settings row from `global_settings` table to read `ollama_url`. If not configured, default to `http://127.0.0.1:11434`.
   - Replace the Groq/Anthropic API logic with a direct local Ollama API call using `fetch` to `${ollamaUrl}/api/chat`.
   - Send the prompt to model `llama3` with `stream: false` and the messages payload array.
   - Extract the generated response from `jsonResponse.message.content`.
   - Address the clinic name bug: change `clinicData?.name` to `clinicData?.clinic_name`.
3. Refactor `super_admin_web/src/lib/sms/exotel.ts` to query `exotel_account_sid`, `exotel_api_key`, and `exotel_api_token` directly from `global_settings` instead of using the colon split syntax on `voice_api_key`. Update the logic to construct the Authorization header from `exotel_api_key` and `exotel_api_token`.
4. Update progress.md in your working directory to track your status.
5. Write your final handoff report to handoff.md in your working directory.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

When done, message the parent orchestrator (conversation ID 874b0b0c-afad-4bc5-a42e-40206197b926) with the path to your handoff.md.
