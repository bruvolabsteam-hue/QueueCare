# Milestone M1 Analysis Report: Migration Deployment, Permissions & Test Verification Strategy

**Author**: Explorer 3 (`explorer_m1_3`)  
**Date**: 2026-08-24  
**Target Milestone**: M1 (Database Schema Integrity & RLS Bypass RPCs)  
**Status**: Complete  

---

## 1. Observation

### 1.1 Migration Inventory & Sequential Ordering
Inspection of `supabase/migrations/` revealed **25 migration files** following the standard timestamped naming format `YYYYMMDDHHMMSS_<name>.sql`:

| Index | File Path | Scope / Description | Key DDL / DML Elements |
|---|---|---|---|
| 00 | `20260101000000_initial_schema.sql` | Core schema | Tables: `clinics`, `clinic_api_keys`, `staff`, `patients`, `queue_sessions`, `token_timing`, `pending_messages`, `clinic_usage`, `low_balance_alerts`, `api_failures`. Enums: `registration_method`, `token_status` (`waiting`, `called`, `skipped`, `done`), `user_role`, `plan_tier`. |
| 01 | `20260101000001_rls_policies.sql` | RLS security policies | Functions: `get_user_role()`, `get_user_clinic_id()`. Policies on all 10 core tables. `patients` table has public `INSERT` and `SELECT`, but **no public `UPDATE`**. |
| 02 | `20260101000002_no_show.sql` | No-show support | `ALTER TYPE token_status ADD VALUE 'no_show';` Add columns on `patients` (`scheduled_for`, `reminder_24h_sent`, `reminder_morning_sent`, `is_no_show`). |
| 03 | `20260101000003_auth_trigger.sql` | Auth trigger | Trigger function `public.handle_new_user()` on `auth.users`. |
| 04 | `20260101000004_cron_jobs.sql` | pg_cron & pg_net | Functions `invoke_process_reminders()`, `invoke_process_pending_messages()`, `invoke_check_clinic_balances()`. Cron schedules. |
| 05 | `20260101000005_queue_triggers.sql` | Queue triggers | Trigger function `public.handle_patient_update()` for queue advance. |
| 06 | `20260101000006_advanced_logic.sql` | Rolling averages & delays | Functions `calculate_rolling_average()`, `detect_delays()`. |
| 07 | `20260101000007_token_generation.sql` | Token generation RPC | Function `generate_daily_token(...)`. |
| 08 | `20260101000008_billing_pivot.sql` | Billing schema | `platform_settings` table, `master_exotel_balance`, `master_whatsapp_balance`. |
| 09 | `20260101000009_billing_rpc.sql` | Billing usage RPC | Function `increment_usage_and_deduct_master(...)`. |
| 10 | `20260101000010_queue_features.sql` | Queue features | Created `public.queue_actions` with `action_type queue_action_type NOT NULL`, `token_number INTEGER NOT NULL`, without `doctor_id` or `details`. |
| 11 | `20260101000011_multi_language.sql` | Multi-language & overrides | Functions `get_token_message()`, `get_override_message()`, updated `generate_daily_token()`. |
| 12 | `20260101000012_multi_doctor.sql` | Multi-doctor queue support | Updated `generate_daily_token()` with `p_doctor_id`. |
| 13 | `20260101000013_doctor_availability.sql` | Doctor shift timings | Add `available_from`, `available_to` to `staff`. |
| 14 | `20260101000014_flexible_queues.sql` | Doctor daily settings | Created `doctor_daily_settings`, `daily_summaries`. Executed `CREATE TABLE IF NOT EXISTS queue_actions` with `doctor_id`, `details`, `action_type VARCHAR`. |
| 15 | `20260101000015_clinic_settings.sql` | White-label settings | Add sender number and caller ID columns to `clinics` and `staff`. |
| 16 | `20260101000016_auth_provisioning.sql` | User provisioning | Updated `handle_new_user()`. |
| 17 | `20260101000017_master_wallet_alerts.sql` | Wallet balance alerts | Function `check_and_alert_master_wallet()`. |
| 18 | `20260101000018_create_global_settings.sql` | LLM & telephony config | Created `global_settings` table. |
| 19 | `20260101000019_add_ollama_model.sql` | Ollama model column | Add `ollama_model` to `global_settings`. |
| 20 | `20260101000020_migrate_to_telecmi.sql` | TeleCMI migration | Enum `service_type` redefined to (`telecmi_voice`, `telecmi_sms`), updated `increment_usage_and_deduct_master()`. |
| 21 | `20260101000021_enable_realtime.sql` | Realtime publication | Created `supabase_realtime` publication and added `patients` and `queue_actions`. |
| 22 | `20260101000022_add_claude_groq_settings.sql` | Groq/Claude keys | Add `groq_api_key`, `claude_api_key`, `active_brain_provider` to `global_settings`. |
| 23 | `20260101000023_add_elevenlabs_alerts.sql` | ElevenLabs threshold | Add `elevenlabs_alert_threshold` to `platform_settings`. |
| 24 | `20260101000024_add_rls_bypass_rpcs.sql` | M1 RPCs & schema repairs | Tables altered: `queue_actions` (`action_type VARCHAR`, `doctor_id UUID`, `details JSONB`, `token_number DROP NOT NULL`). Functions: `get_doctor_phone`, `check_doctor_availability`, `dump_clinic_data`, `get_debug_info`, `log_transfer_request`, `get_latest_transfer_actions`. |

---

### 1.2 Idempotency Analysis & Schema Defects
1. **The `queue_actions` Schema Inconsistency Bug**:
   - In Migration 10 (`20260101000010_queue_features.sql`, lines 15–24), `CREATE TABLE public.queue_actions` created the table with columns: `id`, `clinic_id`, `patient_id`, `token_number INTEGER NOT NULL`, `action_type queue_action_type NOT NULL`, `done_by`, `note`, `created_at`.
   - In Migration 14 (`20260101000014_flexible_queues.sql`, lines 26–34), `CREATE TABLE IF NOT EXISTS queue_actions` attempted to define `doctor_id UUID REFERENCES staff(id)`, `details JSONB`, and `action_type VARCHAR NOT NULL`. Because `queue_actions` already existed, this DDL was a silent NO-OP.
   - Migration 24 (`20260101000024_add_rls_bypass_rpcs.sql`, lines 186–190) resolves this:
     ```sql
     ALTER TABLE public.queue_actions ALTER COLUMN action_type TYPE VARCHAR;
     ALTER TABLE public.queue_actions ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.staff(id) ON DELETE CASCADE;
     ALTER TABLE public.queue_actions ADD COLUMN IF NOT EXISTS details JSONB;
     ALTER TABLE public.queue_actions ALTER COLUMN token_number DROP NOT NULL;
     ```
   - **Idempotency Assessment**: Running these `ALTER TABLE` statements multiple times is safe in Postgres (`ADD COLUMN IF NOT EXISTS`, `ALTER COLUMN TYPE VARCHAR`, `ALTER COLUMN DROP NOT NULL` are idempotent).

2. **Enum Extension Idempotency**:
   - In `20260101000002_no_show.sql` line 2: `ALTER TYPE token_status ADD VALUE 'no_show';` (without `IF NOT EXISTS`). In Postgres 12+, `ALTER TYPE ... ADD VALUE IF NOT EXISTS` must be used for idempotency.
   - In `token_status` enum, `'cancelled'` is currently missing. Running `ALTER TYPE token_status ADD VALUE IF NOT EXISTS 'cancelled';` is required to allow status updates to `'cancelled'`.

3. **Publication Idempotency**:
   - In Migration 21 (`20260101000021_enable_realtime.sql`):
     ```sql
     BEGIN;
     DROP PUBLICATION IF EXISTS supabase_realtime;
     CREATE PUBLICATION supabase_realtime;
     ALTER PUBLICATION supabase_realtime ADD TABLE patients;
     ALTER PUBLICATION supabase_realtime ADD TABLE queue_actions;
     COMMIT;
     ```
   - If `ALTER PUBLICATION supabase_realtime ADD TABLE queue_actions;` is executed when the table is already in the publication, Postgres raises an error (`table "queue_actions" is already member of publication "supabase_realtime"`).
   - Idempotent SQL pattern:
     ```sql
     DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_publication_tables 
         WHERE pubname = 'supabase_realtime' AND tablename = 'queue_actions'
       ) THEN
         ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_actions;
       END IF;
     END $$;
     ```

4. **Security Search Path Missing in Migration 24**:
   - In Migration 24, all functions (`get_doctor_phone`, `check_doctor_availability`, `dump_clinic_data`, `get_debug_info`, `log_transfer_request`, `get_latest_transfer_actions`) are declared `SECURITY DEFINER` without `SET search_path = public, pg_temp;` (or `SET search_path = ''`).
   - This violates Supabase Security Best Practices (`supabase-postgres-best-practices` rule `security-` and Supabase Database Advisor `lint0001_function_search_path_mutable`).

---

### 1.3 `GRANT EXECUTE` Role Permissions
1. **Current State in Migrations**:
   - Zero `GRANT EXECUTE` statements exist across any of the 25 migration files in `supabase/migrations/`.
2. **Execution Context**:
   - The FastAPI webhook (`piopiy-agent/fastapi_webhook.py`) and Next.js frontend (`clinic-dashboard`) invoke RPCs via PostgREST / Supabase REST endpoints:
     - Direct webhook calls using `SUPABASE_ANON_KEY` authenticate as the `anon` Postgres role.
     - Authenticated dashboard clients authenticate as the `authenticated` Postgres role.
     - Backend administration jobs authenticate as `service_role`.
3. **Vulnerability / Failure Condition**:
   - If a Supabase instance has executed `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;` (standard security hardening) or default privileges have been restricted, calls to `check_doctor_availability`, `get_doctor_phone`, `log_transfer_request`, `get_latest_transfer_actions`, or `cancel_appointment` fail with HTTP 403 `permission denied for function`.
   - Explicit `GRANT EXECUTE` statements ensure deterministic access across all environments.

---

### 1.4 Realtime Publication & RLS Broadcast Analysis
1. **Publication Verification**:
   - Table `public.queue_actions` is added to publication `supabase_realtime` in Migration 21.
2. **Dashboard Realtime Listener**:
   - `clinic-dashboard/app/dashboard/queue/page.js` lines 239–268:
     ```javascript
     const channel = supabase
       .channel('queue_actions_changes')
       .on('postgres_changes', {
         event: 'INSERT',
         schema: 'public',
         table: 'queue_actions',
         filter: `clinic_id=eq.${clinicId}`
       }, (payload) => {
         if (payload.new.action_type === 'transfer') {
           const details = payload.new.details || {};
           const docId = payload.new.doctor_id;
           const docName = doctorPanels.find(p => p.id === docId)?.name || 'the doctor';
           setTransferAlerts(prev => [
             ...prev,
             {
               id: payload.new.id,
               doctorName: docName,
               callerPhone: details.caller_phone || 'Unknown Caller',
               time: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
             }
           ]);
         }
       })
       .subscribe();
     ```
3. **RLS Interaction with Realtime**:
   - Supabase Realtime checks table RLS policies for the subscribing client's role.
   - In Migration 14 (`20260101000014_flexible_queues.sql`, line 60):
     `CREATE POLICY "Allow authenticated users access to queue_actions" ON queue_actions FOR ALL USING (auth.role() = 'authenticated');`
   - When clinic dashboard users are authenticated, they receive the broadcast.
   - For public / kiosk displays or resilience, a SELECT policy allowing `anon` access or clinic-scoped access ensures unhindered event broadcast.

---

## 2. Logic Chain

```
[Observation 1.1, 1.2: Migration 10 defined queue_actions with enum & NOT NULL token_number; Migration 14 IF NOT EXISTS silently skipped column additions]
  ↳ [Step 1: Explicit ALTER TABLE statements in Migration 24 correctly convert action_type to VARCHAR, add doctor_id, add details, and drop NOT NULL on token_number.]

[Observation 1.2: /cancel_appointment in webhook attempts direct update on patients table; fails under RLS and throws enum error if 'cancelled' is absent]
  ↳ [Step 2: ALTER TYPE token_status ADD VALUE IF NOT EXISTS 'cancelled' must be applied, and a SECURITY DEFINER cancel_appointment(p_clinic_id uuid, p_phone text) RPC must be deployed with SET search_path = public, pg_temp.]

[Observation 1.2, 1.3: Migration 24 omitted SET search_path and GRANT EXECUTE statements]
  ↳ [Step 3: All SECURITY DEFINER functions must include SET search_path = public, pg_temp to prevent search path hijacking and pass Supabase advisors; explicit GRANT EXECUTE ON FUNCTION ... TO anon, authenticated, service_role must be provided.]

[Observation 1.4: Realtime publication supabase_realtime includes queue_actions, and LiveQueuePage subscribes to INSERT events filtered by clinic_id]
  ↳ [Step 4: Realtime broadcast requires publication membership, table replica identity, and RLS SELECT policy compatibility. An idempotent publication check ensures zero errors during redeployment.]

[Observation 1.1 to 1.4: Cloud instance alignment requires a structured, multi-tier SQL verification harness]
  ↳ [Step 5: Provide a comprehensive suite of introspection queries, permission audits, publication checks, and transactional test scripts that can be executed directly in the Supabase SQL editor or via test runners.]
```

---

## 3. Caveats
1. **Live Cloud Environment vs Local**: Verification queries inspect live Postgres catalog tables (`information_schema.columns`, `pg_proc`, `pg_publication_tables`, `pg_indexes`). In cloud environments without superuser access, catalog reads operate under `postgres` / `service_role` privileges.
2. **Realtime Network Mode**: While Postgres publication membership can be verified via SQL catalog queries, WebSocket delivery to the frontend browser depends on network connectivity and valid Supabase anon/service API keys.
3. **Transaction Rollback in Seed Tests**: The verification SQL test script includes a transactional self-cleaning block (using `ROLLBACK` or explicit cleanup) so that running verification tests does not leave orphaned records in production tables.

---

## 4. Conclusion

1. **Migration Naming & Ordering**: The sequential prefixing `20260101000000_` through `20260101000024_` is correctly organized and maintains consistent dependency progression.
2. **Idempotency Strategy**:
   - `queue_actions` schema alterations are fully idempotent when structured with `ADD COLUMN IF NOT EXISTS` and `ALTER COLUMN DROP NOT NULL`.
   - Adding `'cancelled'` to `token_status` must use `IF NOT EXISTS`.
   - Publication additions must check `pg_publication_tables` before invoking `ALTER PUBLICATION ADD TABLE`.
   - Index creations must use `CREATE INDEX IF NOT EXISTS`.
3. **Permission Strategy**:
   - Explicit `GRANT EXECUTE` to `anon`, `authenticated`, and `service_role` must be declared on all 5 core RPCs (`check_doctor_availability`, `get_doctor_phone`, `log_transfer_request`, `get_latest_transfer_actions`, `cancel_appointment`).
   - Diagnostic RPCs (`dump_clinic_data`, `get_debug_info`) must be granted to `authenticated` and `service_role`.
   - Every `SECURITY DEFINER` function must explicitly include `SET search_path = public, pg_temp;`.
4. **Realtime Broadcast Verification**: `queue_actions` is properly registered in `supabase_realtime`, and the frontend JSON payload matches the database columns and types.

---

## 5. Verification Method: Comprehensive SQL Test Plan & Verification Scripts

Below is the complete, self-contained SQL test verification suite to validate the cloud Supabase instance.

### 5.1 Verification Query Suite (Catalog & Schema Introspection)

Run these queries in the Supabase Cloud SQL Editor to verify complete alignment:

```sql
-- ============================================================================
-- SUITE 1: SCHEMA INTEGRITY VERIFICATION (queue_actions & enums)
-- ============================================================================

-- 1.1 Verify all required columns and data types on queue_actions
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'queue_actions'
ORDER BY ordinal_position;
-- Expected output:
-- id (uuid, NO), clinic_id (uuid, YES/NO), patient_id (uuid, YES), 
-- doctor_id (uuid, YES), action_type (character varying, NO), 
-- details (jsonb, YES), token_number (integer, YES -> nullable!), 
-- done_by (uuid, YES), note (text, YES), created_at (timestamp with time zone, YES)

-- 1.2 Verify foreign key reference: queue_actions.doctor_id -> staff.id
SELECT
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'queue_actions' 
  AND kcu.column_name = 'doctor_id'
  AND tc.constraint_type = 'FOREIGN KEY';
-- Expected output: doctor_id -> staff(id), delete_rule = 'CASCADE'

-- 1.3 Verify token_status enum values (must contain 'cancelled' and 'no_show')
SELECT 
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'token_status'
ORDER BY e.enumsortorder;
-- Expected output contains: waiting, called, skipped, done, no_show, cancelled


-- ============================================================================
-- SUITE 2: RPC SECURITY DEFINER & SEARCH PATH VERIFICATION
-- ============================================================================

-- 2.1 Verify SECURITY DEFINER and search_path configuration on all M1 RPCs
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prosecdef AS is_security_definer,
  p.proconfig AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_doctor_phone',
    'check_doctor_availability',
    'log_transfer_request',
    'get_latest_transfer_actions',
    'cancel_appointment',
    'dump_clinic_data',
    'get_debug_info'
  );
-- Expected output:
-- is_security_definer = true for all functions
-- config_settings contains {search_path=public,pg_temp} or {search_path=public}


-- ============================================================================
-- SUITE 3: ROLE PERMISSIONS & GRANT EXECUTE VERIFICATION
-- ============================================================================

-- 3.1 Verify EXECUTE permissions for anon, authenticated, and service_role
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE specific_schema = 'public'
  AND routine_name IN (
    'get_doctor_phone',
    'check_doctor_availability',
    'log_transfer_request',
    'get_latest_transfer_actions',
    'cancel_appointment'
  )
ORDER BY routine_name, grantee;

-- Alternative direct privilege probe:
SELECT 
  p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_exec
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_doctor_phone',
    'check_doctor_availability',
    'log_transfer_request',
    'get_latest_transfer_actions',
    'cancel_appointment'
  );
-- Expected output: anon_can_exec = true, auth_can_exec = true for all 5 RPCs


-- ============================================================================
-- SUITE 4: REALTIME PUBLICATION & INDEX VERIFICATION
-- ============================================================================

-- 4.1 Verify queue_actions and patients in supabase_realtime publication
SELECT 
  pubname, 
  schemaname, 
  tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('queue_actions', 'patients');
-- Expected output: 2 rows (patients, queue_actions)

-- 4.2 Verify composite performance indexes
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('queue_actions', 'doctor_daily_settings', 'patients', 'staff')
ORDER BY tablename, indexname;
```

---

### 5.2 End-to-End Functional Transactional SQL Test Script

This automated script creates isolated test data, validates each RPC transactionally, tests edge cases, and rolls back (or cleans up) automatically:

```sql
-- ============================================================================
-- SUITE 5: TRANSACTIONAL FUNCTIONAL E2E VERIFICATION SCRIPT
-- ============================================================================

DO $$
DECLARE
  v_clinic_id uuid;
  v_doctor_id uuid;
  v_patient_id uuid;
  v_action_id uuid;
  v_phone_res text;
  v_avail_res jsonb;
  v_cancel_res jsonb;
  v_latest_res jsonb;
  v_today date := CURRENT_DATE;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'STARTING M1 DATABASE INTEGRITY & RPC TEST HARNESS';
  RAISE NOTICE '==================================================';

  -- 1. Setup Test Clinic
  INSERT INTO public.clinics (id, owner_email, clinic_name, clinic_slug)
  VALUES (gen_random_uuid(), 'test-verify@queuecare.local', 'Test Verification Clinic', 'test-verify-' || substr(gen_random_uuid()::text, 1, 8))
  RETURNING id INTO v_clinic_id;

  -- 2. Setup Test Doctor
  INSERT INTO public.staff (id, clinic_id, name, email, role, phone, is_active)
  VALUES (gen_random_uuid(), v_clinic_id, 'Dr. Alice Smith', 'dr.alice@queuecare.local', 'doctor', '919113526504', true)
  RETURNING id INTO v_doctor_id;

  -- 3. Setup Doctor Daily Settings (Active with max 10 patients)
  INSERT INTO public.doctor_daily_settings (clinic_id, doctor_id, date, is_active, max_patients)
  VALUES (v_clinic_id, v_doctor_id, v_today, true, 10);

  -- --------------------------------------------------------------------------
  -- TEST CASE 1: check_doctor_availability (When Doctor Active & Has Capacity)
  -- --------------------------------------------------------------------------
  v_avail_res := public.check_doctor_availability(v_clinic_id);
  IF (v_avail_res->>'available')::boolean = true THEN
    RAISE NOTICE '✅ TEST 1 PASSED: check_doctor_availability returned available = true (%s)', v_avail_res->>'message';
  ELSE
    RAISE EXCEPTION '❌ TEST 1 FAILED: check_doctor_availability returned %s', v_avail_res;
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST CASE 2: get_doctor_phone (Exact Match, Partial Match, Fallback)
  -- --------------------------------------------------------------------------
  -- 2a: Name match
  v_phone_res := public.get_doctor_phone(v_clinic_id, 'Alice');
  IF v_phone_res = '919113526504' THEN
    RAISE NOTICE '✅ TEST 2a PASSED: get_doctor_phone (name match) returned %s', v_phone_res;
  ELSE
    RAISE EXCEPTION '❌ TEST 2a FAILED: Expected 919113526504, got %s', v_phone_res;
  END IF;

  -- 2b: Fallback to first doctor when name is empty
  v_phone_res := public.get_doctor_phone(v_clinic_id, '');
  IF v_phone_res = '919113526504' THEN
    RAISE NOTICE '✅ TEST 2b PASSED: get_doctor_phone (fallback) returned %s', v_phone_res;
  ELSE
    RAISE EXCEPTION '❌ TEST 2b FAILED: Fallback failed, got %s', v_phone_res;
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST CASE 3: log_transfer_request (Inserting into queue_actions)
  -- --------------------------------------------------------------------------
  v_action_id := public.log_transfer_request(v_clinic_id, 'Dr. Alice', '+918310747226');
  IF v_action_id IS NOT NULL THEN
    RAISE NOTICE '✅ TEST 3 PASSED: log_transfer_request created action_id %s', v_action_id;
  ELSE
    RAISE EXCEPTION '❌ TEST 3 FAILED: log_transfer_request returned NULL';
  END IF;

  -- Verify row exists in queue_actions with correct doctor_id and details
  IF EXISTS (
    SELECT 1 FROM public.queue_actions 
    WHERE id = v_action_id 
      AND clinic_id = v_clinic_id 
      AND doctor_id = v_doctor_id 
      AND action_type = 'transfer'
      AND details->>'caller_phone' = '+918310747226'
  ) THEN
    RAISE NOTICE '✅ TEST 3.1 PASSED: queue_actions row verified with JSONB details & doctor_id FK';
  ELSE
    RAISE EXCEPTION '❌ TEST 3.1 FAILED: queue_actions row content mismatch';
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST CASE 4: get_latest_transfer_actions (Array of Transfer Logs)
  -- --------------------------------------------------------------------------
  v_latest_res := public.get_latest_transfer_actions();
  IF jsonb_array_length(v_latest_res) > 0 THEN
    RAISE NOTICE '✅ TEST 4 PASSED: get_latest_transfer_actions returned %s records', jsonb_array_length(v_latest_res);
  ELSE
    RAISE EXCEPTION '❌ TEST 4 FAILED: get_latest_transfer_actions returned empty array';
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST CASE 5: cancel_appointment (RLS Bypass & Status Update)
  -- --------------------------------------------------------------------------
  -- Insert waiting patient
  INSERT INTO public.patients (clinic_id, name, phone, token_number, status)
  VALUES (v_clinic_id, 'Test Patient', '+919876543210', 1, 'waiting')
  RETURNING id INTO v_patient_id;

  -- Call cancel_appointment RPC
  v_cancel_res := public.cancel_appointment(v_clinic_id, '+919876543210');
  IF (v_cancel_res->>'success')::boolean = true THEN
    RAISE NOTICE '✅ TEST 5 PASSED: cancel_appointment returned success (%s)', v_cancel_res->>'message';
  ELSE
    RAISE EXCEPTION '❌ TEST 5 FAILED: cancel_appointment returned %s', v_cancel_res;
  END IF;

  -- Verify patient status in DB is cancelled
  IF EXISTS (
    SELECT 1 FROM public.patients 
    WHERE id = v_patient_id AND status = 'cancelled'
  ) THEN
    RAISE NOTICE '✅ TEST 5.1 PASSED: Patient status verified as "cancelled" in database';
  ELSE
    RAISE EXCEPTION '❌ TEST 5.1 FAILED: Patient status was not updated to "cancelled"';
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST CASE 6: check_doctor_availability (When Clinic is Fully Booked)
  -- --------------------------------------------------------------------------
  -- Fill all 10 slots
  INSERT INTO public.patients (clinic_id, name, phone, token_number, status, created_at)
  SELECT 
    v_clinic_id, 
    'Patient ' || i, 
    '+91900000000' || i, 
    i + 1, 
    'waiting', 
    v_today + (i || ' minutes')::interval
  FROM generate_series(1, 10) AS i;

  v_avail_res := public.check_doctor_availability(v_clinic_id);
  IF (v_avail_res->>'available')::boolean = false THEN
    RAISE NOTICE '✅ TEST 6 PASSED: check_doctor_availability detected fully booked state (%s)', v_avail_res->>'message';
  ELSE
    RAISE EXCEPTION '❌ TEST 6 FAILED: Doctor should be fully booked, but got %s', v_avail_res;
  END IF;

  -- --------------------------------------------------------------------------
  -- CLEANUP TEST DATA
  -- --------------------------------------------------------------------------
  DELETE FROM public.queue_actions WHERE clinic_id = v_clinic_id;
  DELETE FROM public.patients WHERE clinic_id = v_clinic_id;
  DELETE FROM public.doctor_daily_settings WHERE clinic_id = v_clinic_id;
  DELETE FROM public.staff WHERE clinic_id = v_clinic_id;
  DELETE FROM public.clinics WHERE id = v_clinic_id;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'ALL M1 DATABASE INTEGRITY & RPC TESTS PASSED (6/6)';
  RAISE NOTICE '==================================================';
END $$;
```

---

### 5.3 Automated Python / Node Verification Harness Integration

To execute verification within automated CI/CD runners (e.g. `tests/e2e/test_telephony_suite.py` or Node test runner):

```python
# Verification snippet for python test suite (tests/e2e/test_m1_database.py)
import os
import pytest
from supabase import create_client

@pytest.fixture(scope="module")
def supabase_client():
    url = os.environ.get("SUPABASE_URL", "https://oddvrnamlsenvftbnzic.supabase.co")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    return create_client(url, key)

def test_rpc_check_doctor_availability(supabase_client):
    clinic_id = "ffe805a9-c7bb-41ec-a88e-01ebae6331f8"
    res = supabase_client.rpc('check_doctor_availability', {'p_clinic_id': clinic_id}).execute()
    assert res.data is not None
    assert "available" in res.data
    assert isinstance(res.data["available"], bool)

def test_rpc_get_doctor_phone(supabase_client):
    clinic_id = "ffe805a9-c7bb-41ec-a88e-01ebae6331f8"
    res = supabase_client.rpc('get_doctor_phone', {'p_clinic_id': clinic_id, 'p_doctor_name': ''}).execute()
    assert res.data is not None

def test_rpc_log_transfer_and_latest_actions(supabase_client):
    clinic_id = "ffe805a9-c7bb-41ec-a88e-01ebae6331f8"
    action_res = supabase_client.rpc('log_transfer_request', {
        'p_clinic_id': clinic_id,
        'p_doctor_name': 'Dr. Test',
        'p_caller_phone': '919113526504'
    }).execute()
    assert action_res.data is not None
    
    latest_res = supabase_client.rpc('get_latest_transfer_actions').execute()
    assert isinstance(latest_res.data, list)
    assert len(latest_res.data) > 0
```
