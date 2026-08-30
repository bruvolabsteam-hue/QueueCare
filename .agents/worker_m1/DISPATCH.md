## 2026-08-24T09:30:27Z
You are Worker 1 for Milestone M1 (Database Schema Integrity & RLS Bypass RPCs).
Read:
- c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\ORIGINAL_REQUEST.md
- c:\Users\HOME\OneDrive\Attachments\ai agent\PROJECT.md
- c:\Users\HOME\OneDrive\Attachments\ai agent\TEST_INFRA.md
- c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\explorer_m1_1\handoff.md
- c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\explorer_m1_2\handoff.md
- c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\explorer_m1_3\handoff.md

Your working directory is: c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\worker_m1 (create it if needed for progress.md and handoff.md).
File ownership: You exclusively own `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Update `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` with the complete, production-ready, hardened SQL:
   - Add 'cancelled' to `token_status` enum (idempotent `IF NOT EXISTS`).
   - Alter `queue_actions` schema (`action_type` VARCHAR, `doctor_id` UUID FK to staff(id) ON DELETE CASCADE, `details` JSONB DEFAULT '{}'::jsonb, `token_number` DROP NOT NULL, `patient_id` DROP NOT NULL).
   - Ensure `queue_actions` in publication `supabase_realtime`.
   - Define all 5 core SECURITY DEFINER RPCs (`check_doctor_availability`, `get_doctor_phone`, `log_transfer_request`, `get_latest_transfer_actions`, and `cancel_appointment`) plus diagnostic helpers (`dump_clinic_data`, `get_debug_info`).
   - Include `SET search_path = public, pg_temp` on all SECURITY DEFINER functions.
   - Include explicit `GRANT EXECUTE ON FUNCTION ... TO anon, authenticated, service_role`.
   - Add the 8 performance composite indexes on `queue_actions`, `doctor_daily_settings`, `patients`, and `staff`.
2. Verify the SQL file syntax and completeness.
3. Write your implementation report to `c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\worker_m1\handoff.md`.
4. Send a completion message when done.
