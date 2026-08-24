-- ============================================================================
-- Migration: 20260101000024_add_rls_bypass_rpcs.sql (Optimized & Hardened)
-- Description: Schema repairs for queue_actions, enum additions,
--              SECURITY DEFINER RPCs with search_path protection,
--              explicit role grants, and query performance composite indexes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENUM & SCHEMA REPAIRS
-- ----------------------------------------------------------------------------

-- 1.1 Add 'cancelled' to token_status enum if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'token_status' AND pg_enum.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE public.token_status ADD VALUE 'cancelled';
  END IF;
END $$;

-- 1.2 Repair queue_actions table columns and constraints
ALTER TABLE public.queue_actions ALTER COLUMN action_type TYPE VARCHAR USING action_type::VARCHAR;
ALTER TABLE public.queue_actions ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.staff(id) ON DELETE CASCADE;
ALTER TABLE public.queue_actions ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.queue_actions ALTER COLUMN token_number DROP NOT NULL;
ALTER TABLE public.queue_actions ALTER COLUMN patient_id DROP NOT NULL;

-- 1.3 Ensure realtime publication includes queue_actions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'queue_actions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_actions;
    END IF;
  END IF;
END $$;

-- 1.4 Ensure public read access policy exists for realtime broadcast resilience
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'queue_actions' AND policyname = 'Public can select queue_actions'
  ) THEN
    CREATE POLICY "Public can select queue_actions" ON public.queue_actions FOR SELECT USING (true);
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 2. SECURITY DEFINER RPCS (RLS BYPASS WITH SEARCH PATH PROTECTION)
-- ----------------------------------------------------------------------------

-- 2.1 check_doctor_availability
CREATE OR REPLACE FUNCTION public.check_doctor_availability(p_clinic_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
  -- Gather distinct dates for diagnostic logging
  SELECT string_agg(date::text, ', ') INTO v_existing_dates
  FROM (
    SELECT DISTINCT date 
    FROM public.doctor_daily_settings 
    WHERE clinic_id = p_clinic_id
  ) t;

  -- 1. Check if daily settings exist for today (supporting IST and UTC dates)
  SELECT EXISTS (
    SELECT 1 
    FROM public.doctor_daily_settings 
    WHERE clinic_id = p_clinic_id 
      AND (date = v_today OR date = CURRENT_DATE)
  ) INTO v_row_exists;

  IF v_row_exists THEN
    -- Prioritize today's IST match and active status
    SELECT dds.is_active, dds.max_patients, s.name 
    INTO v_is_active, v_max_patients, v_doctor_name
    FROM public.doctor_daily_settings dds
    LEFT JOIN public.staff s ON s.id = dds.doctor_id
    WHERE dds.clinic_id = p_clinic_id
      AND (dds.date = v_today OR dds.date = CURRENT_DATE)
    ORDER BY (dds.date = v_today) DESC, dds.is_active DESC
    LIMIT 1;

    IF NOT v_is_active THEN
      RETURN jsonb_build_object(
        'available', false,
        'message', 'Sorry, Dr. ' || COALESCE(v_doctor_name, 'the doctor') || ' is not available today.'
      );
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'available', false,
      'message', 'Sorry, the doctor has not started their session today yet.'
    );
  END IF;

  -- 2. Count patients currently waiting today
  SELECT COUNT(*) INTO v_current_count
  FROM public.patients
  WHERE clinic_id = p_clinic_id
    AND status = 'waiting'
    AND ((created_at AT TIME ZONE 'Asia/Kolkata')::date = v_today OR created_at::date = CURRENT_DATE);

  IF v_max_patients IS NOT NULL AND v_current_count >= v_max_patients THEN
    RETURN jsonb_build_object(
      'available', false,
      'message', 'Sorry, Dr. ' || COALESCE(v_doctor_name, 'the doctor') || ' is fully booked today. All slots are taken.'
    );
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'message', 'Yes, Dr. ' || COALESCE(v_doctor_name, 'the doctor') || ' is available today for walk-in patients.'
  );
END;
$$;

ALTER FUNCTION public.check_doctor_availability(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_doctor_availability(uuid) TO anon, authenticated, service_role;


-- 2.2 get_doctor_phone
CREATE OR REPLACE FUNCTION public.get_doctor_phone(p_clinic_id uuid, p_doctor_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_phone text;
  v_clean_name text;
BEGIN
  -- 1. Try to find a doctor matching the requested name first
  IF p_doctor_name IS NOT NULL AND trim(p_doctor_name) != '' THEN
    -- Strip common honorific prefixes (Dr., Doctor)
    v_clean_name := trim(regexp_replace(trim(p_doctor_name), '^(Dr\.?|Doctor)\s*', '', 'i'));

    SELECT phone INTO v_phone
    FROM public.staff
    WHERE clinic_id = p_clinic_id
      AND role = 'doctor'
      AND (is_active IS TRUE OR is_active IS NULL)
      AND (
        name ILIKE '%' || trim(p_doctor_name) || '%' 
        OR trim(p_doctor_name) ILIKE '%' || name || '%'
        OR (v_clean_name != '' AND (name ILIKE '%' || v_clean_name || '%' OR v_clean_name ILIKE '%' || name || '%'))
      )
      AND phone IS NOT NULL
      AND trim(phone) != ''
    LIMIT 1;

    -- Return matched phone or NULL if not found
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

ALTER FUNCTION public.get_doctor_phone(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_doctor_phone(uuid, text) TO anon, authenticated, service_role;


-- 2.3 log_transfer_request
CREATE OR REPLACE FUNCTION public.log_transfer_request(
  p_clinic_id uuid,
  p_doctor_name text,
  p_caller_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_doctor_id uuid;
  v_action_id uuid;
  v_clean_name text;
BEGIN
  -- 1. Resolve doctor ID
  IF p_doctor_name IS NOT NULL AND trim(p_doctor_name) != '' THEN
    v_clean_name := trim(regexp_replace(trim(p_doctor_name), '^(Dr\.?|Doctor)\s*', '', 'i'));
    
    SELECT id INTO v_doctor_id
    FROM public.staff
    WHERE clinic_id = p_clinic_id
      AND role = 'doctor'
      AND (is_active IS TRUE OR is_active IS NULL)
      AND (
        name ILIKE '%' || trim(p_doctor_name) || '%' 
        OR trim(p_doctor_name) ILIKE '%' || name || '%'
        OR (v_clean_name != '' AND (name ILIKE '%' || v_clean_name || '%' OR v_clean_name ILIKE '%' || name || '%'))
      )
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

  -- 2. Insert transfer event into queue_actions
  INSERT INTO public.queue_actions (
    clinic_id, 
    doctor_id, 
    action_type, 
    details
  ) VALUES (
    p_clinic_id,
    v_doctor_id,
    'transfer',
    jsonb_build_object(
      'caller_phone', COALESCE(p_caller_phone, ''),
      'doctor_name', COALESCE(p_doctor_name, ''),
      'created_at', NOW()
    )
  )
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$;

ALTER FUNCTION public.log_transfer_request(uuid, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.log_transfer_request(uuid, text, text) TO anon, authenticated, service_role;


-- 2.4 get_latest_transfer_actions
CREATE OR REPLACE FUNCTION public.get_latest_transfer_actions(p_clinic_id uuid DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT json_agg(t) INTO v_res
  FROM (
    SELECT id, clinic_id, doctor_id, action_type, details, created_at
    FROM public.queue_actions
    WHERE (p_clinic_id IS NULL OR clinic_id = p_clinic_id)
      AND action_type = 'transfer'
    ORDER BY created_at DESC
    LIMIT 5
  ) t;
  RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

ALTER FUNCTION public.get_latest_transfer_actions(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_latest_transfer_actions(uuid) TO anon, authenticated, service_role;


-- 2.5 cancel_appointment (RLS Bypass RPC)
CREATE OR REPLACE FUNCTION public.cancel_appointment(
  p_clinic_id uuid,
  p_phone text
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_patient_id uuid;
  v_patient_name text;
  v_token_number integer;
  v_doctor_id uuid;
  v_clean_phone text;
  v_digits text;
BEGIN
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Phone number is required to cancel appointment.'
    );
  END IF;

  v_clean_phone := trim(p_phone);
  v_digits := regexp_replace(v_clean_phone, '\D', '', 'g');

  -- Locate active waiting patient record for today
  SELECT id, name, token_number, doctor_id
  INTO v_patient_id, v_patient_name, v_token_number, v_doctor_id
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
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active appointment found for this phone number today.'
    );
  END IF;

  -- 1. Update patient status to cancelled
  UPDATE public.patients
  SET status = 'cancelled'::public.token_status
  WHERE id = v_patient_id;

  -- 2. Log action in queue_actions
  INSERT INTO public.queue_actions (
    clinic_id,
    doctor_id,
    patient_id,
    token_number,
    action_type,
    details
  ) VALUES (
    p_clinic_id,
    v_doctor_id,
    v_patient_id,
    v_token_number,
    'cancelled',
    jsonb_build_object(
      'phone', v_clean_phone,
      'patient_name', v_patient_name,
      'token_number', v_token_number,
      'cancelled_at', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'patient_id', v_patient_id,
    'patient_name', v_patient_name,
    'token_number', v_token_number,
    'message', 'Appointment for ' || COALESCE(v_patient_name, 'Patient') || ' (Token #' || COALESCE(v_token_number::text, '') || ') has been cancelled successfully.'
  );
END;
$$;

ALTER FUNCTION public.cancel_appointment(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid, text) TO anon, authenticated, service_role;


-- 2.6 Diagnostic Helpers
CREATE OR REPLACE FUNCTION public.dump_clinic_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clinics jsonb;
  v_staff jsonb;
  v_daily jsonb;
BEGIN
  SELECT json_agg(t) INTO v_clinics FROM (SELECT id, clinic_name FROM public.clinics) t;
  SELECT json_agg(t) INTO v_staff FROM (SELECT id, name, role, clinic_id, email, phone FROM public.staff) t;
  SELECT json_agg(t) INTO v_daily FROM (SELECT id, doctor_id, clinic_id, date, is_active, setup_confirmed FROM public.doctor_daily_settings) t;
  
  RETURN jsonb_build_object(
    'clinics', COALESCE(v_clinics, '[]'::jsonb),
    'staff', COALESCE(v_staff, '[]'::jsonb),
    'daily_settings', COALESCE(v_daily, '[]'::jsonb)
  );
END;
$$;

ALTER FUNCTION public.dump_clinic_data() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.dump_clinic_data() TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.get_debug_info()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clinic_id uuid;
  v_staff_details jsonb;
  v_daily_settings jsonb;
BEGIN
  SELECT clinic_id INTO v_clinic_id
  FROM public.staff
  WHERE email = 'samys-clinic@queuecare.com'
  LIMIT 1;

  SELECT json_agg(t) INTO v_staff_details
  FROM (
    SELECT id, name, role, email, phone, is_active
    FROM public.staff
    WHERE clinic_id = v_clinic_id
  ) t;

  SELECT json_agg(t) INTO v_daily_settings
  FROM (
    SELECT id, doctor_id, date, max_patients, is_active, setup_confirmed
    FROM public.doctor_daily_settings
    WHERE clinic_id = v_clinic_id
  ) t;

  RETURN jsonb_build_object(
    'clinic_id', v_clinic_id,
    'staff', COALESCE(v_staff_details, '[]'::jsonb),
    'daily_settings', COALESCE(v_daily_settings, '[]'::jsonb)
  );
END;
$$;

ALTER FUNCTION public.get_debug_info() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_debug_info() TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 3. PERFORMANCE COMPOSITE INDEXES
-- ----------------------------------------------------------------------------

-- 3.1 Indexes on queue_actions
CREATE INDEX IF NOT EXISTS idx_queue_actions_clinic_created 
  ON public.queue_actions (clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_queue_actions_action_type_created 
  ON public.queue_actions (action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_queue_actions_doctor_id 
  ON public.queue_actions (doctor_id);

-- 3.2 Indexes on doctor_daily_settings
CREATE INDEX IF NOT EXISTS idx_doctor_daily_settings_clinic_date 
  ON public.doctor_daily_settings (clinic_id, date);

-- 3.3 Indexes on patients
CREATE INDEX IF NOT EXISTS idx_patients_clinic_status_created 
  ON public.patients (clinic_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_phone_status 
  ON public.patients (clinic_id, phone, status);

CREATE INDEX IF NOT EXISTS idx_patients_doctor_id_created 
  ON public.patients (doctor_id, created_at);

-- 3.4 Indexes on staff
CREATE INDEX IF NOT EXISTS idx_staff_clinic_role_active 
  ON public.staff (clinic_id, role, is_active);

-- ----------------------------------------------------------------------------
-- 4. SECURITY DEFINER RPC REDEFINITIONS (For secure anonymous database interactions)
-- ----------------------------------------------------------------------------

-- 4.1 Drop all old overloaded candidate signatures of generate_daily_token to avoid ambiguity
DROP FUNCTION IF EXISTS public.generate_daily_token(uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.generate_daily_token(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.generate_daily_token(uuid, text, text, text, text);

-- 4.2 Define the unified generate_daily_token with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.generate_daily_token(
    p_clinic_id UUID,
    p_name VARCHAR,
    p_phone VARCHAR,
    p_registration_method public.registration_method,
    p_doctor_id UUID DEFAULT NULL
) RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_new_token INTEGER;
    v_patient_id UUID;
    v_wait_time_mins INTEGER;
    v_regional_lang VARCHAR;
    v_sms_body TEXT;
    v_waiting_count INTEGER;
    v_est_wait INTEGER;
    v_est_time VARCHAR;
BEGIN
    -- 1. Find the maximum token number generated today for this clinic AND doctor
    IF p_doctor_id IS NOT NULL THEN
        SELECT COALESCE(MAX(token_number), 0) INTO v_new_token
        FROM patients
        WHERE clinic_id = p_clinic_id
          AND doctor_id = p_doctor_id
          AND DATE(created_at AT TIME ZONE 'UTC') = v_today;
    ELSE
        SELECT COALESCE(MAX(token_number), 0) INTO v_new_token
        FROM patients
        WHERE clinic_id = p_clinic_id
          AND doctor_id IS NULL
          AND DATE(created_at AT TIME ZONE 'UTC') = v_today;
    END IF;

    -- Increment to get the new token number
    v_new_token := v_new_token + 1;

    -- 2. Insert the new patient
    INSERT INTO patients (clinic_id, name, phone, token_number, registration_method, status, doctor_id)
    VALUES (p_clinic_id, p_name, p_phone, v_new_token, p_registration_method, 'waiting', p_doctor_id)
    RETURNING id INTO v_patient_id;

    -- 3. Calculate Wait Time
    SELECT COALESCE(avg_time_per_patient_mins, 10) INTO v_wait_time_mins
    FROM clinics
    WHERE id = p_clinic_id;

    -- 4. Get Regional Language
    SELECT COALESCE(regional_language, 'hindi') INTO v_regional_lang
    FROM clinics 
    WHERE id = p_clinic_id;

    -- 5. Calculate waiting count and estimated turn time for message
    SELECT COUNT(*) INTO v_waiting_count
    FROM patients
    WHERE clinic_id = p_clinic_id
      AND status = 'waiting'
      AND DATE(created_at AT TIME ZONE 'UTC') = v_today;

    v_est_wait := v_waiting_count * v_wait_time_mins;
    v_est_time := to_char(NOW() + (v_est_wait || ' minutes')::interval, 'HH12:MI AM');

    -- 6. Generate message content
    v_sms_body := get_token_message(
      v_regional_lang, 
      p_name, 
      v_new_token, 
      v_waiting_count,
      v_est_time,
      v_est_wait
    );

    -- 7. Enqueue Message
    INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
    VALUES (
      p_clinic_id, 
      p_phone, 
      'token_assigned', 
      v_sms_body, 
      'pending'
    );

    RETURN v_new_token;
END;
$$;

ALTER FUNCTION public.generate_daily_token(uuid, varchar, varchar, public.registration_method, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.generate_daily_token(uuid, varchar, varchar, public.registration_method, uuid) TO anon, authenticated, service_role;


-- 4.3 Define get_active_doctor_id helper
CREATE OR REPLACE FUNCTION public.get_active_doctor_id(p_clinic_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_doctor_id uuid;
  v_today date := CURRENT_DATE;
BEGIN
  SELECT doctor_id INTO v_doctor_id
  FROM public.doctor_daily_settings
  WHERE clinic_id = p_clinic_id
    AND date = v_today
    AND is_active = true
  LIMIT 1;
  
  RETURN v_doctor_id;
END;
$$;

ALTER FUNCTION public.get_active_doctor_id(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_active_doctor_id(uuid) TO anon, authenticated, service_role;
