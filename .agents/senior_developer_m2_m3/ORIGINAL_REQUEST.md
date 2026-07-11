## 2026-07-11T06:17:13Z
You are the Senior Developer subagent. Your working directory is: c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\senior_developer_m2_m3
Your objective is to fix the critical errors in the BruvoFlow AI infrastructure.

Here are the details from the QA Tester's reproduction report and requirements:
1. Database Schema Update:
   - Check the migration files under `supabase/migrations/` and create/apply a migration to add the column `ollama_model` (TEXT, default 'llama3') to the table `public.global_settings`. Check if there's a command like `supabase db push` or similar to apply migrations, or write a migration file and apply the SQL directly to the PostgreSQL database if needed.
2. Implement Settings API Route:
   - Create `super_admin_web/src/app/api/settings/route.ts` supporting GET and POST.
   - GET should retrieve the global settings row from Supabase (using `supabaseAdmin` or equivalent) and return it as JSON (with 200 status code).
   - POST should receive settings updates (like `ollama_url`, `elevenlabs_api_key`, `exotel_account_sid`, `exotel_api_key`, `exotel_api_token`, `whatsapp_api_key`, `support_whatsapp_number`, and `ollama_model`) and save/update the row in the `global_settings` table.
3. Update Settings UI page:
   - In `super_admin_web/src/app/(dashboard)/settings/ai/page.tsx`, add state, input field, and save/load logic for `ollama_model`.
4. Update Claude / Ollama client:
   - In `super_admin_web/src/lib/ai/claude.ts`, fetch `ollama_model` from the `global_settings` table and use it dynamically in the fetch body instead of the hardcoded `llama3`.
5. Update Exotel Webhook URLs:
   - In `super_admin_web/src/app/api/webhooks/exotel/route.ts`, build absolute URLs for the play audio paths and gather action paths using `req.nextUrl.origin` or `req.url` to prevent playback failures on telephony networks.
6. Verify your implementation by running builds (e.g. `npm run build` inside `super_admin_web`) and ensuring no lint/build issues.

Update your progress.md at c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\senior_developer_m2_m3\progress.md at each step.
Send a handoff message back to the orchestrator (conversation ID ac7e2f40-701f-4a86-97f9-a3dd012ae5a1) when complete.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
