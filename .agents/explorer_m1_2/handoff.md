# Database RPC Logic & Edge Case Analysis Report

**Milestone**: M1 (Database Schema Integrity & RLS Bypass RPCs)  
**Agent**: Explorer 2 (`explorer_m1_2`)  
**Target Files**:
- `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql`
- `supabase/migrations/20260101000000_initial_schema.sql`
- `supabase/migrations/20260101000001_rls_policies.sql`
- `supabase/migrations/20260101000002_no_show.sql`
- `supabase/migrations/20260101000010_queue_features.sql`
- `supabase/migrations/20260101000012_multi_doctor.sql`
- `supabase/migrations/20260101000014_flexible_queues.sql`
- `piopiy-agent/fastapi_webhook.py`
- `clinic-dashboard/app/dashboard/queue/page.js`

---

## 1. Observation

### 1.1 `check_doctor_availability` Definition & Logic
In `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` (lines 41–115):
```sql
CREATE OR REPLACE FUNCTION check_doctor_availability(p_clinic_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Safely bypasses RLS for this specific check
AS $$
DECLARE
  v_is_active boolean := false;
  v_max_patients integer;
  v_current_count integer;
  v_today date := CURRENT_DATE;
  v_row_exists boolean := false;
  v_existing_dates text;
  v_doctor_name text;
BEGIN
  -- Get all dates in settings to diagnose
  SELECT string_agg(date::text, ', ') INTO v_existing_dates
  FROM (
    SELECT DISTINCT date 
    FROM public.doctor_daily_settings 
    WHERE clinic_id = p_clinic_id
  ) t;

  -- 1. Check if there is a daily settings entry for today
  SELECT EXISTS (
    SELECT 1 
    FROM public.doctor_daily_settings 
    WHERE clinic_id = p_clinic_id 
      AND date = v_today
  ) INTO v_row_exists;

  IF v_row_exists THEN
    SELECT dds.is_active, dds.max_patients, s.name 
    INTO v_is_active, v_max_patients, v_doctor_name
    FROM public.doctor_daily_settings dds
    JOIN public.staff s ON s.id = dds.doctor_id
    WHERE dds.clinic_id = p_clinic_id
      AND dds.date = v_today
    LIMIT 1;

    IF NOT v_is_active THEN
      RETURN json_build_object(
        'available', false,
        'message', 'Sorry, the doctor is not available today. (DB Date: ' || v_today::text || ', Existing Dates in DB: ' || COALESCE(v_existing_dates, 'None') || ')'
      );
    END IF;
  ELSE
    RETURN json_build_object(
      'available', false,
      'message', 'Sorry, the doctor has not started their session today yet. (DB Date: ' || v_today::text || ', Existing Dates in DB: ' || COALESCE(v_existing_dates, 'None') || ')'
    );
  END IF;

  -- 2. Check if the clinic daily limit is reached
  SELECT COUNT(*) INTO v_current_count
  FROM public.patients
  WHERE clinic_id = p_clinic_id
    AND status = 'waiting'
    AND created_at::date = v_today;

  IF v_max_patients IS NOT NULL AND v_current_count >= v_max_patients THEN
    RETURN json_build_object(
      'available', false,
      'message', 'Sorry, Dr. ' || COALESCE(v_doctor_name, 'the doctor') || ' is fully booked today. All slots are taken.'
    );
  END IF;

  RETURN json_build_object(
    'available', true,
    'message', 'Yes, Dr. ' || COALESCE(v_doctor_name, 'the doctor') || ' is available today for walk-in patients.'
  );
END;
$$;
```

### 1.2 `get_doctor_phone` Definition & Logic
In `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` (lines 3–37):
```sql
CREATE OR REPLACE FUNCTION get_doctor_phone(p_clinic_id uuid, p_doctor_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS securely for this task
AS $$
DECLARE
  v_phone text;
BEGIN
  -- 1. Try to find a doctor matching the requested name first
  IF p_doctor_name IS NOT NULL AND p_doctor_name != '' THEN
    SELECT phone INTO v_phone
    FROM public.staff
    WHERE clinic_id = p_clinic_id
      AND role = 'doctor'
      AND (name ILIKE '%' || p_doctor_name || '%' OR p_doctor_name ILIKE '%' || name || '%')
      AND phone IS NOT NULL
      AND phone != ''
    LIMIT 1;

    -- If a specific name was requested, do not fallback to another doctor if not found
    RETURN v_phone;
  END IF;

  -- 2. Fallback to the first doctor in the clinic ONLY if no name was specified
  SELECT phone INTO v_phone
  FROM public.staff
  WHERE clinic_id = p_clinic_id
    AND role = 'doctor'
    AND phone IS NOT NULL
    AND phone != ''
  LIMIT 1;

  RETURN v_phone;
END;
$$;
```

### 1.3 `log_transfer_request` Definition & Logic
In `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` (lines 191–237):
```sql
CREATE OR REPLACE FUNCTION log_transfer_request(
  p_clinic_id uuid,
  p_doctor_name text,
  p_caller_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_doctor_id uuid;
  v_action_id uuid;
BEGIN
  -- 1. Find the doctor
  SELECT id INTO v_doctor_id
  FROM public.staff
  WHERE clinic_id = p_clinic_id
    AND role = 'doctor'
    AND (name ILIKE '%' || p_doctor_name || '%' OR p_doctor_name ILIKE '%' || name || '%')
  LIMIT 1;

  -- Fallback if no specific doctor matches
  IF v_doctor_id IS NULL THEN
    SELECT id INTO v_doctor_id
    FROM public.staff
    WHERE clinic_id = p_clinic_id
      AND role = 'doctor'
    LIMIT 1;
  END IF;

  -- 2. Insert into queue_actions
  INSERT INTO public.queue_actions (clinic_id, doctor_id, action_type, details)
  VALUES (
    p_clinic_id,
    v_doctor_id,
    'transfer',
    json_build_object(
      'caller_phone', p_caller_phone,
      'doctor_name', p_doctor_name,
      'created_at', NOW()
    )
  )
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$;
```

### 1.4 `get_latest_transfer_actions` Definition & Logic
In `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` (lines 241–258):
```sql
CREATE OR REPLACE FUNCTION get_latest_transfer_actions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT json_agg(t) INTO v_res
  FROM (
    SELECT id, clinic_id, doctor_id, action_type, details, created_at
    FROM public.queue_actions
    ORDER BY created_at DESC
    LIMIT 5
  ) t;
  RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;
```

### 1.5 Direct Cancellation Bug in `piopiy-agent/fastapi_webhook.py`
In `piopiy-agent/fastapi_webhook.py` (lines 184–194):
```python
# Update status to cancelled
res = supabase.table('patients').update({
    'status': 'cancelled'
}).eq('phone', phone).eq('status', 'waiting').execute()

if res.data:
    logger.info(f"✅ Cancelled appointment for {phone}")
    return {"message": "Appointment has been cancelled successfully."}

return {"message": "No active appointment found for this phone number."}
```
In `supabase/migrations/20260101000001_rls_policies.sql` (lines 28–29):
```sql
CREATE POLICY "Public can insert patient (kiosk)" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can select patient (display)" ON patients FOR SELECT USING (true);
```
*(No `UPDATE` policy exists for anon/public roles on `patients`.)*

In `supabase/migrations/20260101000000_initial_schema.sql` (line 3) and `20260101000002_no_show.sql` (line 2):
```sql
CREATE TYPE token_status AS ENUM ('waiting', 'called', 'skipped', 'done');
ALTER TYPE token_status ADD VALUE 'no_show';
```
*(The value `'cancelled'` was never added to the `token_status` ENUM in migrations.)*

---

## 2. Logic Chain

### 2.1 `check_doctor_availability` Deep Dive
1. **Active Session Verification**:
   - The query checks `doctor_daily_settings` for `clinic_id = p_clinic_id AND date = v_today`.
   - If no entry exists, it returns `available: false` with `"Sorry, the doctor has not started their session today yet."`
   - If the entry exists and `dds.is_active = false`, it returns `available: false` with `"Sorry, the doctor is not available today."`
   - If `dds.is_active = true`, it proceeds to the daily quota evaluation.
2. **Daily Limit Calculation**:
   - The query calculates `v_current_count` via `SELECT COUNT(*) FROM public.patients WHERE clinic_id = p_clinic_id AND status = 'waiting' AND created_at::date = v_today;`.
   - If `v_max_patients` is set and `v_current_count >= v_max_patients`, it returns `available: false` with `"Sorry, Dr. ... is fully booked today. All slots are taken."`
   - *Logic Nuance*: If `max_patients` is meant as a daily slot cap (total tickets allotted for the entire shift), counting only `status = 'waiting'` allows extra slots once earlier patients transition to `'called'` or `'done'`. To strictly enforce daily quota, count `status IN ('waiting', 'called', 'done')` or `status != 'cancelled'`. If `max_patients` is intended as max concurrent queue size, `status = 'waiting'` is appropriate.
3. **Timezone Awareness (IST vs. UTC)**:
   - Supabase Postgres cloud servers operate in `UTC` by default.
   - Indian Standard Time (IST) is `UTC + 05:30`.
   - In UTC, `CURRENT_DATE` switches to the new calendar day at 05:30 AM IST. Between 12:00 AM IST and 05:30 AM IST, `CURRENT_DATE` in UTC is 1 day behind IST.
   - If clinic schedules are created with local IST date `2026-08-24`, but evaluated in UTC, an availability check performed before 05:30 AM IST looks for date `2026-08-23`, yielding a false "no session started" failure.
   - *Remedy*: Use `(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date` for `v_today` and `(created_at AT TIME ZONE 'Asia/Kolkata')::date` for date comparisons.

### 2.2 `get_doctor_phone` Matching & Fallback Logic
1. **Bidirectional Substring Matching (`ILIKE`)**:
   - Condition: `(name ILIKE '%' || p_doctor_name || '%' OR p_doctor_name ILIKE '%' || name || '%')`.
   - Case A: Caller says `"Sarah"` or `"Dr. Sarah"` and DB record is `"Dr. Sarah Johnson"` -> `name ILIKE '%Sarah%'` = TRUE.
   - Case B: Caller says `"Dr. Sarah Johnson"` and DB record is `"Sarah"` -> `p_doctor_name ILIKE '%Sarah%'` = TRUE.
   - Handles prefixes like `"Dr."`, `"Doctor"`, and middle/last names seamlessly.
2. **Fallback Boundaries**:
   - When a specific `p_doctor_name` is requested but fails to match any doctor: `v_phone` is `NULL` and the function returns `NULL`. It **does not** fall back to a random doctor. This prevents transferring patients to incorrect medical specialists.
   - When `p_doctor_name` is `NULL` or `''`: it queries the first available doctor in the clinic with a non-null, non-empty phone and returns their number.
3. **Active Staff Filter**:
   - `staff` has `is_active BOOLEAN DEFAULT true` (from migration 14).
   - Adding `AND (is_active IS TRUE OR is_active IS NULL)` ensures deactivated doctors are excluded.

### 2.3 `log_transfer_request` Payload Formatting & Return Value
1. **Doctor Resolution & Fallback**:
   - Tries to resolve `doctor_id` by matching `p_doctor_name`.
   - If no specific doctor matches or no name is provided, falls back to the clinic's primary doctor. If the clinic has no doctors registered, `doctor_id` remains `NULL` (supported by `queue_actions.doctor_id` nullable FK).
2. **JSON Building**:
   - Generates JSONB via `json_build_object('caller_phone', p_caller_phone, 'doctor_name', p_doctor_name, 'created_at', NOW())`.
   - Exact schema alignment with `clinic-dashboard/app/dashboard/queue/page.js` (`details.caller_phone`, `doctorName`).
3. **Return Type**:
   - Returns the newly created row's `id` as `UUID`. Allows callers to verify the database write transaction.

### 2.4 `get_latest_transfer_actions` Data Structure for `/diagnose`
1. **Ordering**:
   - `ORDER BY created_at DESC LIMIT 5` returns the 5 newest queue actions.
2. **Structure**:
   - Returns a JSONB array of objects: `[{"id": "...", "clinic_id": "...", "doctor_id": "...", "action_type": "...", "details": {...}, "created_at": "..."}]`.
   - Handles empty table gracefully via `COALESCE(v_res, '[]'::jsonb)` returning `[]`.
   - `/diagnose` in `fastapi_webhook.py` outputs this under `transfer_logs`.

### 2.5 `cancel_appointment` RLS Failure & Safe RPC Solution
1. **Root Cause of Silent Failure**:
   - The webhook backend connects to Supabase using `SUPABASE_ANON_KEY`.
   - Under RLS policies in `20260101000001_rls_policies.sql`, the `anon` role is permitted to `INSERT` (kiosk) and `SELECT` (display), but has **zero `UPDATE` grants**.
   - PostgREST silently filters out all rows on unpermitted `UPDATE`, returning an empty list `[]`.
   - As a result, the webhook always concludes that no active appointment exists, even when the patient has a valid ticket!
2. **ENUM Type Constraint**:
   - `patients.status` is typed as `token_status`.
   - `token_status` contains `('waiting', 'called', 'skipped', 'done', 'no_show')`.
   - Attempting to update `status` to `'cancelled'` will fail with Postgres error `invalid input value for enum token_status: "cancelled"`.
3. **Idempotent Solution**:
   - Extend `token_status` with `'cancelled'`.
   - Create a `SECURITY DEFINER` RPC `cancel_appointment(p_clinic_id uuid, p_phone text) RETURNS JSONB` that executes with elevated database privileges, updates the status, logs a cancellation in `queue_actions`, and returns a structured response.

---

## 3. Caveats

1. **Service Role Key vs. RPC**:
   - While supplying `SUPABASE_SERVICE_ROLE_KEY` to the webhook backend bypasses RLS at the HTTP client layer, defining `cancel_appointment` as a `SECURITY DEFINER` RPC is strictly superior: it encapsulates business logic (cancelling only `'waiting'` status, logging `queue_actions`, robust phone normalization) in an atomic database transaction.
2. **Doctor Multi-Tenancy**:
   - `check_doctor_availability(p_clinic_id)` currently checks the first active doctor schedule for the clinic. In multi-doctor clinics with distinct doctor shifts, an optional `p_doctor_name` or `p_doctor_id` parameter can be supported in future extensions while maintaining single-doctor backward compatibility.
3. **Search Path Vulnerability**:
   - Postgres `SECURITY DEFINER` functions without an explicit `SET search_path` are vulnerable to object substitution attacks. All RPCs must specify `SET search_path = public`.

---

## 4. Conclusion & Recommended SQL Implementation

### 4.1 Schema Patch: `token_status` & Performance Indexes
```sql
-- 1. Idempotently add 'cancelled' to token_status ENUM
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'public.token_status'::regtype 
      AND enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE public.token_status ADD VALUE 'cancelled';
  END IF;
END;
$$;

-- 2. Performance Composite Indexes
CREATE INDEX IF NOT EXISTS idx_queue_actions_clinic_created 
  ON public.queue_actions (clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_doctor_daily_settings_clinic_date 
  ON public.doctor_daily_settings (clinic_id, date);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_status_created 
  ON public.patients (clinic_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_phone 
  ON public.patients (clinic_id, phone);

CREATE INDEX IF NOT EXISTS idx_staff_clinic_role_active 
  ON public.staff (clinic_id, role, is_active);
```

### 4.2 Optimized RPC Definitions

#### A. `check_doctor_availability`
```sql
CREATE OR REPLACE FUNCTION check_doctor_availability(p_clinic_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_active boolean := false;
  v_max_patients integer;
  v_current_count integer;
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  v_row_exists boolean := false;
  v_existing_dates text;
  v_doctor_name text;
BEGIN
  -- Get existing dates for diagnostics
  SELECT string_agg(date::text, ', ') INTO v_existing_dates
  FROM (
    SELECT DISTINCT date 
    FROM public.doctor_daily_settings 
    WHERE clinic_id = p_clinic_id
  ) t;

  -- 1. Check if there is a daily settings entry for today (IST)
  SELECT EXISTS (
    SELECT 1 
    FROM public.doctor_daily_settings 
    WHERE clinic_id = p_clinic_id 
      AND date = v_today
  ) INTO v_row_exists;

  IF v_row_exists THEN
    SELECT dds.is_active, dds.max_patients, s.name 
    INTO v_is_active, v_max_patients, v_doctor_name
    FROM public.doctor_daily_settings dds
    LEFT JOIN public.staff s ON s.id = dds.doctor_id
    WHERE dds.clinic_id = p_clinic_id
      AND dds.date = v_today
    LIMIT 1;

    IF NOT v_is_active THEN
      RETURN json_build_object(
        'available', false,
        'message', 'Sorry, the doctor is not available today. (DB Date: ' || v_today::text || ', Existing Dates in DB: ' || COALESCE(v_existing_dates, 'None') || ')'
      );
    END IF;
  ELSE
    RETURN json_build_object(
      'available', false,
      'message', 'Sorry, the doctor has not started their session today yet. (DB Date: ' || v_today::text || ', Existing Dates in DB: ' || COALESCE(v_existing_dates, 'None') || ')'
    );
  END IF;

  -- 2. Check if daily quota is reached for today (IST)
  SELECT COUNT(*) INTO v_current_count
  FROM public.patients
  WHERE clinic_id = p_clinic_id
    AND status = 'waiting'
    AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = v_today;

  IF v_max_patients IS NOT NULL AND v_current_count >= v_max_patients THEN
    RETURN json_build_object(
      'available', false,
      'message', 'Sorry, Dr. ' || COALESCE(v_doctor_name, 'the doctor') || ' is fully booked today. All slots are taken.'
    );
  END IF;

  RETURN json_build_object(
    'available', true,
    'message', 'Yes, Dr. ' || COALESCE(v_doctor_name, 'the doctor') || ' is available today for walk-in patients.'
  );
END;
$$;
ALTER FUNCTION check_doctor_availability(uuid) OWNER TO postgres;
```

#### B. `get_doctor_phone`
```sql
CREATE OR REPLACE FUNCTION get_doctor_phone(p_clinic_id uuid, p_doctor_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  -- 1. Try to find a doctor matching the requested name
  IF p_doctor_name IS NOT NULL AND trim(p_doctor_name) != '' THEN
    SELECT phone INTO v_phone
    FROM public.staff
    WHERE clinic_id = p_clinic_id
      AND role = 'doctor'
      AND (is_active IS TRUE OR is_active IS NULL)
      AND (name ILIKE '%' || trim(p_doctor_name) || '%' OR trim(p_doctor_name) ILIKE '%' || name || '%')
      AND phone IS NOT NULL
      AND trim(phone) != ''
    LIMIT 1;

    -- Return matched phone or NULL (do not fallback to other doctors if specific name was requested)
    RETURN v_phone;
  END IF;

  -- 2. Fallback to the first active doctor in the clinic ONLY if no name was specified
  SELECT phone INTO v_phone
  FROM public.staff
  WHERE clinic_id = p_clinic_id
    AND role = 'doctor'
    AND (is_active IS TRUE OR is_active IS NULL)
    AND phone IS NOT NULL
    AND trim(phone) != ''
  LIMIT 1;

  RETURN v_phone;
END;
$$;
ALTER FUNCTION get_doctor_phone(uuid, text) OWNER TO postgres;
```

#### C. `log_transfer_request`
```sql
CREATE OR REPLACE FUNCTION log_transfer_request(
  p_clinic_id uuid,
  p_doctor_name text,
  p_caller_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid;
  v_action_id uuid;
BEGIN
  -- 1. Find the doctor
  IF p_doctor_name IS NOT NULL AND trim(p_doctor_name) != '' THEN
    SELECT id INTO v_doctor_id
    FROM public.staff
    WHERE clinic_id = p_clinic_id
      AND role = 'doctor'
      AND (is_active IS TRUE OR is_active IS NULL)
      AND (name ILIKE '%' || trim(p_doctor_name) || '%' OR trim(p_doctor_name) ILIKE '%' || name || '%')
    LIMIT 1;
  END IF;

  -- Fallback if no specific doctor matches
  IF v_doctor_id IS NULL THEN
    SELECT id INTO v_doctor_id
    FROM public.staff
    WHERE clinic_id = p_clinic_id
      AND role = 'doctor'
      AND (is_active IS TRUE OR is_active IS NULL)
    LIMIT 1;
  END IF;

  -- 2. Insert into queue_actions
  INSERT INTO public.queue_actions (clinic_id, doctor_id, action_type, details)
  VALUES (
    p_clinic_id,
    v_doctor_id,
    'transfer',
    json_build_object(
      'caller_phone', p_caller_phone,
      'doctor_name', p_doctor_name,
      'created_at', NOW()
    )
  )
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$;
ALTER FUNCTION log_transfer_request(uuid, text, text) OWNER TO postgres;
```

#### D. `get_latest_transfer_actions`
```sql
CREATE OR REPLACE FUNCTION get_latest_transfer_actions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT json_agg(t) INTO v_res
  FROM (
    SELECT id, clinic_id, doctor_id, action_type, details, created_at
    FROM public.queue_actions
    ORDER BY created_at DESC
    LIMIT 5
  ) t;
  RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;
ALTER FUNCTION get_latest_transfer_actions() OWNER TO postgres;
```

#### E. `cancel_appointment` (New SECURITY DEFINER RPC)
```sql
CREATE OR REPLACE FUNCTION cancel_appointment(p_clinic_id uuid, p_phone text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_patient_name text;
  v_token_number int;
  v_clean_phone text;
  v_digits text;
BEGIN
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number is required to cancel appointment.'
    );
  END IF;

  v_clean_phone := trim(p_phone);
  v_digits := regexp_replace(v_clean_phone, '\D', '', 'g');

  -- Find active waiting appointment matching phone
  SELECT id, name, token_number 
  INTO v_patient_id, v_patient_name, v_token_number
  FROM public.patients
  WHERE clinic_id = p_clinic_id
    AND status = 'waiting'
    AND (
      phone = v_clean_phone
      OR phone = '+' || ltrim(v_clean_phone, '+')
      OR phone = ltrim(v_clean_phone, '+')
      OR (length(v_digits) >= 10 AND RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) = RIGHT(v_digits, 10))
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No active appointment found for this phone number.'
    );
  END IF;

  -- 1. Update patient status to cancelled
  UPDATE public.patients
  SET status = 'cancelled'::public.token_status
  WHERE id = v_patient_id;

  -- 2. Log cancellation action in queue_actions
  INSERT INTO public.queue_actions (clinic_id, patient_id, token_number, action_type, details)
  VALUES (
    p_clinic_id,
    v_patient_id,
    v_token_number,
    'cancel',
    json_build_object(
      'phone', p_phone,
      'patient_name', v_patient_name,
      'cancelled_at', NOW()
    )
  );

  RETURN json_build_object(
    'success', true,
    'patient_id', v_patient_id,
    'patient_name', v_patient_name,
    'token_number', v_token_number,
    'message', 'Appointment for ' || v_patient_name || ' (Token #' || v_token_number || ') has been cancelled successfully.'
  );
END;
$$;
ALTER FUNCTION cancel_appointment(uuid, text) OWNER TO postgres;
```

---

## 5. Verification Method

### 5.1 Verification Commands & SQL Inspection

Run against the target Supabase database instance (`https://oddvrnamlsenvftbnzic.supabase.co`):

```sql
-- 1. Check token_status enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'public.token_status'::regtype;
-- Expected: 'waiting', 'called', 'skipped', 'done', 'no_show', 'cancelled'

-- 2. Verify all 5 RPC functions exist with SECURITY DEFINER and search_path
SELECT 
  p.proname,
  p.prosecdef AS is_security_definer,
  p.proconfig AS search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'check_doctor_availability',
    'get_doctor_phone',
    'log_transfer_request',
    'get_latest_transfer_actions',
    'cancel_appointment'
  );

-- 3. Verify Composite Indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('queue_actions', 'doctor_daily_settings', 'patients', 'staff');
```

### 5.2 Functional PostgREST Verification via `curl`
Execute HTTP POST requests using the `SUPABASE_ANON_KEY` to confirm RLS bypass without elevation:

1. **Check Availability**:
   ```bash
   curl -X POST "https://oddvrnamlsenvftbnzic.supabase.co/rest/v1/rpc/check_doctor_availability" \
     -H "apikey: <ANON_KEY>" \
     -H "Authorization: Bearer <ANON_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"p_clinic_id": "a03c3eed-c075-496c-9c03-4c95eac40975"}'
   ```
2. **Doctor Phone Lookup**:
   ```bash
   curl -X POST "https://oddvrnamlsenvftbnzic.supabase.co/rest/v1/rpc/get_doctor_phone" \
     -H "apikey: <ANON_KEY>" \
     -H "Authorization: Bearer <ANON_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"p_clinic_id": "a03c3eed-c075-496c-9c03-4c95eac40975", "p_doctor_name": "Sarah"}'
   ```
3. **Transfer Logging**:
   ```bash
   curl -X POST "https://oddvrnamlsenvftbnzic.supabase.co/rest/v1/rpc/log_transfer_request" \
     -H "apikey: <ANON_KEY>" \
     -H "Authorization: Bearer <ANON_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"p_clinic_id": "a03c3eed-c075-496c-9c03-4c95eac40975", "p_doctor_name": "Dr. Sarah", "p_caller_phone": "+919876543210"}'
   ```
4. **Cancel Appointment RPC**:
   ```bash
   curl -X POST "https://oddvrnamlsenvftbnzic.supabase.co/rest/v1/rpc/cancel_appointment" \
     -H "apikey: <ANON_KEY>" \
     -H "Authorization: Bearer <ANON_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"p_clinic_id": "a03c3eed-c075-496c-9c03-4c95eac40975", "p_phone": "+919876543210"}'
   ```

### 5.3 Invalidation Conditions
- Anonymously calling `cancel_appointment` returning permission denied or `token_status` enum type violation.
- `check_doctor_availability` failing on UTC/IST date change boundaries between 00:00 and 05:30 IST.
- `get_doctor_phone` returning another doctor's phone when a non-existent doctor name was explicitly requested.
- `log_transfer_request` failing with column constraints on `token_number` or `action_type`.
