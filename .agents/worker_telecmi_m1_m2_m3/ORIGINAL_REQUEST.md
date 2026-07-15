## 2026-07-15T01:56:13Z
You are a Senior Developer. Your identity is worker_telecmi_m1_m2_m3, and your working directory is c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\worker_telecmi_m1_m2_m3.
Your task is to implement Milestones 1, 2, and 3 based on the findings from our codebase explorers:

1. **Database Schema Update (Milestone 1)**:
   - Create a new migration file: `supabase/migrations/20260101000020_migrate_to_telecmi.sql`.
   - Implement the SQL statements as detailed in `c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\explorer_telecmi_m1_1\handoff.md`.
   - Make sure it drops old `exotel_*` and `whatsapp_*` columns, adds `telecmi_*` columns and `brain_*` columns, sum-migrates platform settings balances to a unified `master_telecmi_balance`, alters/creates the `service_type` enum to `('telecmi_voice', 'telecmi_sms')`, and updates RPCs (`increment_usage_and_deduct_master` and `check_and_alert_master_wallet`).

2. **Branding Updates (Milestone 2)**:
   - Rebrand "OmniCare" to "BruvoLabs" in the login screen files and root layout metadata files.
   - Use the details and code segments in `c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\explorer_telecmi_m1_2\handoff.md`.
   - Files to update:
     - `super_admin_web/src/app/(auth)/login/page.tsx`
     - `clinic-dashboard/app/page.js`
     - `super_admin_web/src/app/layout.tsx`
     - `clinic-dashboard/app/layout.js`

3. **UI Settings Simplification (Milestone 3)**:
   - Update settings views to rename Ollama configuration to "Brain Settings", and replace Exotel/WhatsApp configurations with "TeleCMI Credentials" inputs.
   - Use the details and code segments in `c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\explorer_telecmi_m1_3\handoff.md`.
   - Files to update:
     - `super_admin_web/src/app/(dashboard)/settings/ai/page.tsx`
     - `clinic-dashboard/app/dashboard/settings/page.js`
     - `super_admin_web/src/app/(dashboard)/clinics/page.tsx`
     - `super_admin_web/src/app/api/settings/route.ts`
   - Make sure form values, state hooks, input validation, and database operations successfully save to/load from the new database columns: `brain_url`, `brain_model`, `brain_api_key`, `telecmi_app_id`, `telecmi_secret_key` on `global_settings`, and `telecmi_caller_id` on `clinics`.

After making the updates, run build/compilation checks for both frontend directories (`super_admin_web` and `clinic-dashboard`) using `npm run build` or verification checks to confirm there are no syntax or type errors.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please write a detailed handoff report to `handoff.md` in your working directory summarizing:
1. The changes made.
2. Build/verification results.
3. Any caveats or notes for the next milestones.
