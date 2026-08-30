# Database & Schema Specialist Handoff Report

**Agent**: Explorer 2 (Database & Schema Specialist - Replacement)  
**Working Directory**: `.agents/explorer_survey_database/`  
**Target Files**: `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql`, `supabase/migrations/*`, `piopiy-agent/fastapi_webhook.py`, `clinic-dashboard/app/dashboard/queue/page.js`  
**Database Host**: `https://oddvrnamlsenvftbnzic.supabase.co`  

---

## 1. Observation

### 1.1 Complete Migration Timeline & Evolution
The database schema evolved across 25 migration files in `supabase/migrations/`:
1. `20260101000000_initial_schema.sql`: Defined core tables (`clinics`, `clinic_api_keys`, `staff`, `patients`, `queue_sessions`, `token_timing`, `pending_messages`, `clinic_usage`, `low_balance_alerts`, `api_failures`) and ENUMs (`registration_method`, `token_status`, `message_status`, `service_type`, `user_role`, `plan_tier`).
2. `20260101000001_rls_policies.sql`: Configured helper functions (`get_user_role()`, `get_user_clinic_id()`) and baseline RLS policies. Note: `patients` table allows `anon` to `INSERT` and `SELECT`, but **NOT** `UPDATE`.
3. `20260101000002_no_show.sql` to `20260101000009_billing_rpc.sql`: Added auto-skip triggers, auth triggers, pg_cron jobs, wallet deductions, and billing RPCs.
4. `20260101000010_queue_features.sql`:
   - First created `public.queue_actions`:
     ```sql
     CREATE TYPE queue_action_type AS ENUM ('insert_now', 'add_to_end', 'skip', 'recall', 'pause', 'resume');
     CREATE TABLE public.queue_actions (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
       patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
       token_number INTEGER NOT NULL,
       action_type queue_action_type NOT NULL,
       done_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
       note TEXT,
       created_at TIMESTAMPTZ DEFAULT NOW()
     );
     ```
   - Added RLS policies for clinic staff and super admins.
5. `20260101000011_multi_language.sql`: Updated `generate_daily_token` to support bilingual messaging.
6. `20260101000012_multi_doctor.sql` & `20260101000013_doctor_availability.sql`: Added `doctor_id` column to `patients`, `available_from`/`available_to` to `staff`.
7. `20260101000014_flexible_queues.sql`:
   - Attempted to create `doctor_daily_settings`, `daily_summaries`, and redefine `queue_actions`:
     ```sql
     CREATE TABLE IF NOT EXISTS queue_actions (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
       doctor_id UUID REFERENCES staff(id) ON DELETE CASCADE,
       patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
       action_type VARCHAR NOT NULL,
       details JSONB,
       created_at TIMESTAMPTZ DEFAULT NOW()
     );
     ```
   - **Critical Root Cause**: Because `queue_actions` was already created in Migration 10, `CREATE TABLE IF NOT EXISTS` was a no-op! Consequently, `doctor_id` and `details` were **NOT** added, `token_number` remained `NOT NULL`, and `action_type` remained restricted to the 6-value `queue_action_type` ENUM.
8. `20260101000021_enable_realtime.sql`: Added `patients` and `queue_actions` to the `supabase_realtime` publication:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE patients;
   ALTER PUBLICATION supabase_realtime ADD TABLE queue_actions;
   ```
9. `20260101000024_add_rls_bypass_rpcs.sql`:
   - Schema fix on `queue_actions` (lines 186–190):
     ```sql
     ALTER TABLE public.queue_actions ALTER COLUMN action_type TYPE VARCHAR;
     ALTER TABLE public.queue_actions ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.staff(id) ON DELETE CASCADE;
     ALTER TABLE public.queue_actions ADD COLUMN IF NOT EXISTS details JSONB;
     ALTER TABLE public.queue_actions ALTER COLUMN token_number DROP NOT NULL;
     ```
   - Added 4 SECURITY DEFINER RPC functions: `get_doctor_phone`, `check_doctor_availability`, `log_transfer_request`, `get_latest_transfer_actions`, plus diagnostics `dump_clinic_data`, `get_debug_info`.

---

### 1.2 Inspection of `queue_actions` Table Schema
After Migration 24, the verified table definition is:

| Column | Data Type | Nullable | Constraints & References | Notes |
|---|---|---|---|---|
| `id` | `UUID` | No | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique action ID |
| `clinic_id` | `UUID` | Yes | `REFERENCES public.clinics(id) ON DELETE CASCADE` | Scoped to clinic |
| `patient_id` | `UUID` | Yes | `REFERENCES public.patients(id) ON DELETE CASCADE` | Null on external transfers |
| `doctor_id` | `UUID` | Yes | `REFERENCES public.staff(id) ON DELETE CASCADE` | Added in Migration 24 |
| `token_number` | `INTEGER` | Yes | `DROP NOT NULL` executed in Migration 24 | Null on transfer events |
| `action_type` | `VARCHAR` | No | Converted from ENUM to `VARCHAR` | Compatible with `'transfer'`, `'insert_now'`, etc. |
| `done_by` | `UUID` | Yes | `REFERENCES public.staff(id) ON DELETE SET NULL` | Staff who performed action |
| `note` | `TEXT` | Yes | None | Freeform notes |
| `details` | `JSONB` | Yes | Added in Migration 24 | Stores `caller_phone`, `doctor_name`, etc. |
| `created_at` | `TIMESTAMPTZ` | Yes | `DEFAULT NOW()` | Action timestamp |

---

### 1.3 Inspection of SECURITY DEFINER RPC Functions

#### A. `check_doctor_availability(p_clinic_id uuid)`
- **SQL Location**: `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` lines 41–115.
- **Function Signature**: `check_doctor_availability(p_clinic_id uuid) RETURNS JSONB`
- **Privilege**: `SECURITY DEFINER`, `OWNER TO postgres`
- **Execution Flow**:
  1. Checks if a row in `doctor_daily_settings` exists for `p_clinic_id` where `date = CURRENT_DATE`.
  2. If missing: Returns `{"available": false, "message": "Sorry, the doctor has not started their session today yet..."}`.
  3. If exists but `dds.is_active = false`: Returns `{"available": false, "message": "Sorry, the doctor is not available today..."}`.
  4. If active: Counts waiting patients in `public.patients` for today (`status = 'waiting' AND created_at::date = CURRENT_DATE`). If `v_current_count >= v_max_patients` (when `max_patients` is set), returns `{"available": false, "message": "Sorry, Dr. ... is fully booked today. All slots are taken."}`.
  5. Otherwise: Returns `{"available": true, "message": "Yes, Dr. ... is available today for walk-in patients."}`.

#### B. `get_doctor_phone(p_clinic_id uuid, p_doctor_name text)`
- **SQL Location**: `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` lines 3–39.
- **Function Signature**: `get_doctor_phone(p_clinic_id uuid, p_doctor_name text) RETURNS text`
- **Privilege**: `SECURITY DEFINER`, `OWNER TO postgres`
- **Execution Flow**:
  1. If `p_doctor_name` is non-empty: Queries `public.staff` with `role = 'doctor'`, `clinic_id = p_clinic_id`, and fuzzy match `(name ILIKE '%' || p_doctor_name || '%' OR p_doctor_name ILIKE '%' || name || '%')`. If found, returns `phone`. Does not fallback to random doctor if named search fails.
  2. If `p_doctor_name` is empty/null: Selects the first doctor with a non-null, non-empty phone for `p_clinic_id`.
  3. Returns `phone` as `text` (or `NULL` if not found).

#### C. `log_transfer_request(p_clinic_id uuid, p_doctor_name text, p_caller_phone text)`
- **SQL Location**: `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` lines 191–239.
- **Function Signature**: `log_transfer_request(p_clinic_id uuid, p_doctor_name text, p_caller_phone text) RETURNS uuid`
- **Privilege**: `SECURITY DEFINER`, `OWNER TO postgres`
- **Execution Flow**:
  1. Resolves `v_doctor_id` from `public.staff` matching `p_doctor_name` (or fallback first doctor in clinic).
  2. Inserts into `public.queue_actions`:
     ```sql
     INSERT INTO public.queue_actions (clinic_id, doctor_id, action_type, details)
     VALUES (
       p_clinic_id,
       v_doctor_id,
       'transfer',
       json_build_object('caller_phone', p_caller_phone, 'doctor_name', p_doctor_name, 'created_at', NOW())
     )
     RETURNING id INTO v_action_id;
     ```
  3. Returns the generated `UUID`.
  4. Realtime triggers immediately broadcast this event to listening frontends.

#### D. `get_latest_transfer_actions()`
- **SQL Location**: `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` lines 241–260.
- **Function Signature**: `get_latest_transfer_actions() RETURNS JSONB`
- **Privilege**: `SECURITY DEFINER`, `OWNER TO postgres`
- **Execution Flow**:
  - Selects `id, clinic_id, doctor_id, action_type, details, created_at` from `public.queue_actions ORDER BY created_at DESC LIMIT 5`.
  - Returns `jsonb` array. Used by `/diagnose` endpoint to verify database write health.

---

## 2. Logic Chain

1. **Schema Dependency & Compatibility**:
   - The voice agent webhook (`piopiy-agent/fastapi_webhook.py`) calls `log_transfer_request` during `/transfer_to_doctor`.
   - `log_transfer_request` inserts a record without `token_number` and with `action_type = 'transfer'` and `details` JSONB.
   - Without Migration 24's explicit `ALTER COLUMN` commands, `INSERT` throws Postgres constraint violations (`null value in column "token_number" violates not-null constraint` and `invalid input value for enum queue_action_type: "transfer"`).
   - Migration 24 eliminates both bottlenecks.

2. **Real-time Pipeline from Webhook to UI Toast**:
   - Voice agent receives call -> Calls `/transfer_to_doctor` on Heroku backend -> Backend executes `log_transfer_request` RPC.
   - Postgres records row in `public.queue_actions`.
   - Postgres publication `supabase_realtime` includes `queue_actions` (from `20260101000021_enable_realtime.sql`).
   - Browser client at `clinic-dashboard/app/dashboard/queue/page.js` is subscribed via WebSocket on channel `queue_actions_changes` with filter `clinic_id=eq.${clinicId}`.
   - Browser receives payload `payload.new.action_type === 'transfer'`, updates `transferAlerts` React state, and immediately renders floating card with `callerPhone`, `doctorName`, and `<a href="tel:...">Call Back</a>`.

3. **Security Definer & RLS Architecture**:
   - The webhook backend operates via Supabase HTTP REST/RPC APIs.
   - If the backend uses `SUPABASE_ANON_KEY`, direct table modifications on `patients` or `queue_actions` fail silently due to RLS policies.
   - Marking the 4 RPCs as `SECURITY DEFINER` with `OWNER TO postgres` allows the webhook to execute availability checks, phone lookups, and transfer logging without giving the public anon role unrestricted read/write permissions to internal database tables.

---

## 3. Caveats & Identified Gaps

1. **RLS on `/cancel_appointment`**:
   - In `piopiy-agent/fastapi_webhook.py` line 185, `/cancel_appointment` calls `supabase.table('patients').update({'status': 'cancelled'})...`.
   - `20260101000001_rls_policies.sql` grants public/anon roles `INSERT` (kiosk) and `SELECT` (display), but **NOT** `UPDATE`.
   - When called with `SUPABASE_ANON_KEY`, PostgREST silently returns 0 updated rows.
   - **Remedy**: Webhook must either use `SUPABASE_SERVICE_ROLE_KEY` or call a dedicated SECURITY DEFINER RPC `cancel_appointment(p_clinic_id uuid, p_phone text)`.
2. **Missing Search Path on SECURITY DEFINER Functions**:
   - Best practice: Add `SET search_path = public` to all SECURITY DEFINER functions in migration 24 to guard against potential search path hijacking.
3. **Timezone Consideration in `check_doctor_availability`**:
   - Using `CURRENT_DATE` and `created_at::date` defaults to UTC. For Indian clinics operating past 00:00 UTC (05:30 AM IST), using `(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date` prevents date boundary mismatches.
4. **Recommended Database Indexes**:
   - `CREATE INDEX IF NOT EXISTS idx_queue_actions_clinic_created ON public.queue_actions (clinic_id, created_at DESC);`
   - `CREATE INDEX IF NOT EXISTS idx_doctor_daily_settings_clinic_date ON public.doctor_daily_settings (clinic_id, date);`
   - `CREATE INDEX IF NOT EXISTS idx_patients_clinic_status_date ON public.patients (clinic_id, status, created_at);`

---

## 4. Conclusion

1. **Schema Integrity**: Migration `20260101000024_add_rls_bypass_rpcs.sql` successfully resolves the `queue_actions` schema bug from earlier migrations by altering `action_type` to `VARCHAR`, dropping `token_number` NOT NULL, and adding `doctor_id` and `details`.
2. **RPC Verification**: All 4 target RPCs (`check_doctor_availability`, `get_doctor_phone`, `log_transfer_request`, `get_latest_transfer_actions`) are properly defined with `SECURITY DEFINER` and correct parameter types.
3. **Real-time Pipeline**: Realtime publication `supabase_realtime` is enabled on `queue_actions`, and `clinic-dashboard/app/dashboard/queue/page.js` correctly listens for inserts and renders the dismissible Call Back card.
4. **Actionable Recommendations for Implementation Team**:
   - Ensure backend uses `SUPABASE_SERVICE_ROLE_KEY` or create a SECURITY DEFINER `cancel_appointment` RPC.
   - Add composite indexes for performance optimization.
   - Add `SET search_path = public` to migration 24 RPC definitions.

---

## 5. Verification Method

### 5.1 Verification Commands & File Inspection

| Target Component | Inspection File / Location | Expected Content |
|---|---|---|
| Migration 24 RPCs & Schema | `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` | `get_doctor_phone`, `check_doctor_availability`, `log_transfer_request`, `get_latest_transfer_actions`, `ALTER TABLE queue_actions` |
| Realtime Publication | `supabase/migrations/20260101000021_enable_realtime.sql` | `ALTER PUBLICATION supabase_realtime ADD TABLE queue_actions;` |
| Webhook RPC Calls | `piopiy-agent/fastapi_webhook.py` (lines 81, 129, 226, 244, 265) | Proper parameter mapping for RPCs |
| Frontend Realtime Hook | `clinic-dashboard/app/dashboard/queue/page.js` (lines 236–268, 372–411) | Realtime channel listener and floating toast |

### 5.2 SQL Self-Verification Query
Run against cloud Supabase instance to verify schema and function presence:
```sql
-- 1. Verify queue_actions columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'queue_actions'
ORDER BY ordinal_position;

-- 2. Verify RPC functions
SELECT routine_name, routine_type, security_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_doctor_phone', 'check_doctor_availability', 'log_transfer_request', 'get_latest_transfer_actions');

-- 3. Verify Realtime Publication
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'queue_actions';
```

### 5.3 Invalidation Conditions
- `queue_actions` having `token_number` as NOT NULL or `action_type` constrained to enum `queue_action_type`.
- Calling `check_doctor_availability`, `get_doctor_phone`, or `log_transfer_request` failing with permission denied (RLS) under anon role.
- Realtime publication `supabase_realtime` missing `queue_actions`.
