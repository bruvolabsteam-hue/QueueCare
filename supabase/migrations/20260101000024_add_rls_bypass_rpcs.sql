-- Migrate to add RPC functions that bypass RLS for public webhook queries

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
  END IF;

  -- 2. Fallback to the first doctor in the clinic if no name matches
  IF v_phone IS NULL OR v_phone = '' THEN
    SELECT phone INTO v_phone
    FROM public.staff
    WHERE clinic_id = p_clinic_id
      AND role = 'doctor'
      AND phone IS NOT NULL
      AND phone != ''
    LIMIT 1;
  END IF;

  RETURN v_phone;
END;
$$;

ALTER FUNCTION get_doctor_phone(uuid, text) OWNER TO postgres;

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
BEGIN
  -- 1. Check if there is a daily settings entry for today
  SELECT EXISTS (
    SELECT 1 
    FROM public.doctor_daily_settings 
    WHERE clinic_id = p_clinic_id 
      AND date = v_today
  ) INTO v_row_exists;

  IF v_row_exists THEN
    -- Check if doctor is active today in daily settings
    SELECT is_active, max_patients INTO v_is_active, v_max_patients
    FROM public.doctor_daily_settings
    WHERE clinic_id = p_clinic_id
      AND date = v_today
    LIMIT 1;

    IF NOT v_is_active THEN
      RETURN json_build_object(
        'available', false,
        'message', 'Sorry, the doctor is not available today.'
      );
    END IF;
  ELSE
    -- If no daily setup exists (e.g., doctor hasn't started shift yet),
    -- they are not available today.
    RETURN json_build_object(
      'available', false,
      'message', 'Sorry, the doctor has not started their session today yet.'
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
      'message', 'Sorry, the doctor is fully booked today. All slots are taken.'
    );
  END IF;

  RETURN json_build_object(
    'available', true,
    'message', 'Yes, the doctor is available today for walk-in patients.'
  );
END;
$$;

ALTER FUNCTION check_doctor_availability(uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION dump_clinic_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clinics jsonb;
  v_staff jsonb;
  v_daily jsonb;
BEGIN
  SELECT json_agg(t) INTO v_clinics FROM (SELECT id, clinic_name FROM public.clinics) t;
  SELECT json_agg(t) INTO v_staff FROM (SELECT id, name, role, clinic_id, email, phone FROM public.staff) t;
  SELECT json_agg(t) INTO v_daily FROM (SELECT id, doctor_id, clinic_id, date, is_active, setup_confirmed FROM public.doctor_daily_settings) t;
  
  RETURN json_build_object(
    'clinics', COALESCE(v_clinics, '[]'::jsonb),
    'staff', COALESCE(v_staff, '[]'::jsonb),
    'daily_settings', COALESCE(v_daily, '[]'::jsonb)
  );
END;
$$;

ALTER FUNCTION dump_clinic_data() OWNER TO postgres;
