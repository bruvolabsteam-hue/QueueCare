## 2026-07-15T02:06:18Z

You are a Senior Developer. Your identity is worker_telecmi_m4, and your working directory is c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\worker_telecmi_m4.
Your task is to implement Milestone 4 (TeleCMI & Brain Code Migration) based on our plan and the database changes implemented in Milestones 1-3.

Specifically:
1. **Implement TeleCMI Client Library**:
   - Create `super_admin_web/src/lib/sms/telecmi.ts`.
   - Export an async function `sendTeleCMIMessage(toPhoneNumber: string, messageText: string, clinicCallerId: string)`.
   - It must fetch `telecmi_app_id` and `telecmi_secret_key` from `global_settings`.
   - Issue a POST request to TeleCMI API: `const apiBase = process.env.TELECMI_API_URL || 'https://api.telecmi.com';` and endpoint `${apiBase}/v1/sms/send` (or a similar clean REST endpoint structure).
   - Authorize using Basic authentication or post body parameters containing `appid` and `secret`. Let's pass `appid` and `secret` in the request header or request body. (We will make sure it is offline-compatible via `process.env.TELECMI_API_URL`).

2. **Remove Old Exotel/WhatsApp Files**:
   - Delete `super_admin_web/src/lib/sms/exotel.ts`
   - Delete all files inside `super_admin_web/src/app/api/webhooks/exotel`
   - Delete all files inside `super_admin_web/src/app/api/webhooks/whatsapp`
   - Delete WhatsApp client if it's unused or rename/clean it.

3. **Implement TeleCMI Voice Webhooks**:
   - Create `super_admin_web/src/app/api/webhooks/telecmi/voice/route.ts` to handle incoming calls.
   - It must query waiting patients by caller number (`From` or `from` parameter).
   - If the call is initial (no action parameter), respond with:
     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <Response>
       <Gather input="speech" action="/api/webhooks/telecmi/voice?action=speech" method="POST" timeout="5">
         <Play>/api/webhooks/telecmi/audio?id=welcome</Play>
       </Gather>
     </Response>
     ```
   - If the action is `speech`, pass the transcribed text (`TranscriptionText` or `speech` or `text`) to `generatePatientResponse` (which uses Groq Brain), cache the response text, and respond with a `<Gather>` tag playing the generated audio ID.
   - Support action `hangup`.
   - Create `super_admin_web/src/app/api/webhooks/telecmi/audio/route.ts` to generate and cache ElevenLabs audio streams, identical in logic to the old Exotel audio route but under the new TeleCMI path.

4. **Implement TeleCMI Messaging Webhook**:
   - Create `super_admin_web/src/app/api/webhooks/telecmi/message/route.ts` to handle incoming messages.
   - Verify the patient is waiting, trigger the Groq Brain via `generatePatientResponse`, and send the text response back via the TeleCMI client.

5. **Update Deno Edge Function**:
   - Edit `supabase/functions/processPendingMessages/index.ts`.
   - Update it to call the TeleCMI API instead of Exotel and WhatsApp.
   - Use environment variables `TELECMI_MASTER_APP_ID` and `TELECMI_MASTER_SECRET_KEY` (or fallback mock tokens).
   - Deduct usage by calling the RPC `increment_usage_and_deduct_master` with `p_service: 'telecmi_voice'` (for calls) or `p_service: 'telecmi_sms'` (for messages).

6. **Verify build**:
   - Make sure `super_admin_web` and `clinic-dashboard` compile cleanly with no type errors.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your results and build checks to `handoff.md` in your working directory once complete.
