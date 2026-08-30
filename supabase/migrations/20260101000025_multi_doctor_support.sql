-- 1. Update check_doctor_availability to return a list of all active doctors today with their start times
CREATE OR REPLACE FUNCTION public.check_doctor_availability(p_clinic_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  v_doctors_list text;
  v_row_exists boolean := false;
BEGIN
  -- Check if any active daily settings exist for today
  SELECT EXISTS (
    SELECT 1 
    FROM public.doctor_daily_settings 
    WHERE clinic_id = p_clinic_id 
      AND date = v_today
      AND is_active = true
  ) INTO v_row_exists;

  IF NOT v_row_exists THEN
    RETURN jsonb_build_object(
      'available', false,
      'message', 'Sorry, no doctors are scheduled or active at the clinic today.'
    );
  END IF;

  -- Build a comma-separated list of active doctors with their start times
  SELECT string_agg('Dr. ' || initcap(trim(replace(s.name, 'Dr.', ''))) || ' (starting at ' || COALESCE(to_char(dds.start_time, 'HH12:MI AM'), 'their scheduled shift') || ')', ', ')
  INTO v_doctors_list
  FROM public.doctor_daily_settings dds
  JOIN public.staff s ON s.id = dds.doctor_id
  WHERE dds.clinic_id = p_clinic_id
    AND dds.date = v_today
    AND dds.is_active = true;

  RETURN jsonb_build_object(
    'available', true,
    'message', 'Yes, the following doctors are available today: ' || v_doctors_list || '. Whom would you like to book an appointment with?'
  );
END;
$$;

ALTER FUNCTION public.check_doctor_availability(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_doctor_availability(uuid) TO anon, authenticated, service_role;


-- 2. Create get_doctor_id_by_name helper function to resolve case-insensitive doctor names fuzzily
CREATE OR REPLACE FUNCTION public.get_doctor_id_by_name(p_clinic_id uuid, p_doctor_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_doctor_id uuid;
  v_clean_name text := lower(regexp_replace(trim(p_doctor_name), '\s+', ' ', 'g'));
BEGIN
  -- Normalize query name to remove 'dr' prefix
  v_clean_name := regexp_replace(v_clean_name, '^dr\.?\s*', '');

  SELECT s.id INTO v_doctor_id
  FROM public.staff s
  JOIN public.doctor_daily_settings dds ON dds.doctor_id = s.id
  WHERE dds.clinic_id = p_clinic_id
    AND dds.date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    AND dds.is_active = true
    AND (
      -- Direct match
      lower(trim(s.name)) = v_clean_name
      -- Fuzzy contains matches (stripping 'dr' prefix from database values too)
      OR regexp_replace(lower(trim(s.name)), '^dr\.?\s*', '') LIKE '%' || v_clean_name || '%'
      OR v_clean_name LIKE '%' || regexp_replace(lower(trim(s.name)), '^dr\.?\s*', '') || '%'
    )
  ORDER BY (lower(trim(s.name)) = v_clean_name) DESC
  LIMIT 1;

  RETURN v_doctor_id;
END;
$$;

ALTER FUNCTION public.get_doctor_id_by_name(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_doctor_id_by_name(uuid, text) TO anon, authenticated, service_role;
