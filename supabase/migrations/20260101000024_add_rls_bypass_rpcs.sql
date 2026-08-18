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
  v_has_active_doctor boolean := false;
  v_max_patients integer;
  v_current_count integer;
  v_today date := CURRENT_DATE;
BEGIN
  -- 1. Check if there are any active doctor daily settings today for this clinic
  SELECT EXISTS (
    SELECT 1 
    FROM public.doctor_daily_settings 
    WHERE clinic_id = p_clinic_id 
      AND date = v_today 
      AND is_active = true
  ) INTO v_has_active_doctor;

  IF NOT v_has_active_doctor THEN
    -- Check if we have active doctors in staff table as fallback
    SELECT EXISTS (
      SELECT 1 
      FROM public.staff 
      WHERE clinic_id = p_clinic_id 
        AND role = 'doctor' 
        AND is_active = true
    ) INTO v_has_active_doctor;
    
    IF NOT v_has_active_doctor THEN
      RETURN json_build_object(
        'available', false,
        'message', 'Sorry, the doctor is not available today.'
      );
    END IF;
  END IF;

  -- 2. Check if the clinic daily limit is reached
  SELECT COUNT(*) INTO v_current_count
  FROM public.patients
  WHERE clinic_id = p_clinic_id
    AND status = 'waiting'
    AND created_at::date = v_today;

  SELECT max_patients INTO v_max_patients
  FROM public.doctor_daily_settings
  WHERE clinic_id = p_clinic_id
    AND date = v_today
    AND is_active = true
  LIMIT 1;

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
