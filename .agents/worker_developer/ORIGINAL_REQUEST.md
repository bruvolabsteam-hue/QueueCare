## 2026-07-11T07:44:54Z

You are the Senior Developer.
Your working directory is C:/Users/HOME/OneDrive/Attachments/ai agent/.agents/worker_developer.
Your parent is teamwork_preview_orchestrator (conversation ID: 8859f3b3-f67a-4a21-9152-2b14bc90c589).

TASK:
1. Update C:/Users/HOME/OneDrive/Attachments/ai agent/super_admin_web/src/lib/ai/claude.ts:
   - Check if database settings are empty or if ollama_url is missing. If so, return "Please consult reception. No configuration found."
   - Set up an AbortController with a 5000ms timeout on the fetch call to the Ollama server.
   - If the fetch times out/aborts, or if the user message is exactly "simulate timeout", return "Our wait time update is temporarily unavailable. Please stay on the line."
   - If the response is not OK or other errors are caught, return "Currently we are experiencing system maintenance. Please consult reception."
   - Truncate the final generated response content to a maximum of 4096 characters to fit WhatsApp constraints.

2. Create a new file C:/Users/HOME/OneDrive/Attachments/ai agent/super_admin_web/src/app/api/chat/route.ts:
   - It must handle POST requests.
   - Parse phone_number and message from the request JSON body.
   - Query the patients table for the patient and clinic data using supabaseAdmin:
     eq("phone_number", searchPhone)
     eq("status", "waiting")
     order("created_at", { ascending: false })
     limit(1)
     single()
   - Call generatePatientResponse(message, patientData, clinicData) and return the generated text as { reply } in a JSON response.
   - Gracefully handle situations where patient or clinic queries fail/return no data by passing empty/fallback objects to generatePatientResponse (do not crash).

3. Run the live E2E tests using:
   node tests/e2e/runner.js
   And verify that ALL 60 test cases pass successfully.

INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
