-- Migration: 20260101000026_doctor_calendar_and_leaves.sql
-- Enables calendar scheduling, leave management, and date-aware doctor availability for AI and Dashboard

-- 1. Extend doctor_daily_settings with leave tracking
ALTER TABLE public.doctor_daily_settings 
ADD COLUMN IF NOT EXISTS is_leave BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS leave_reason VARCHAR DEFAULT NULL;

-- 2. Extend staff with weekly default schedule storage
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS weekly_schedule JSONB DEFAULT NULL;

-- 3. Create RPC to fetch calendar events for a date range (Month View)
CREATE OR REPLACE FUNCTION public.get_clinic_calendar_events(
  p_clinic_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_doctor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_events JSONB;
BEGIN
  SELECT COALESCE(json_agg(row_data), '[]'::json) INTO v_events
  FROM (
    SELECT 
      dds.id,
      dds.doctor_id,
      s.name AS doctor_name,
      s.specialization,
      dds.date,
      dds.is_active,
      COALESCE(dds.is_leave, false) AS is_leave,
      dds.leave_reason,
      to_char(dds.start_time, 'HH12:MI AM') AS start_time_formatted,
      to_char(dds.end_time, 'HH12:MI AM') AS end_time_formatted,
      dds.start_time::text AS start_time,
      dds.end_time::text AS end_time,
      dds.time_per_patient_mins,
      dds.max_patients,
      dds.mode,
      dds.current_patient_count,
      dds.setup_confirmed
    FROM public.doctor_daily_settings dds
    JOIN public.staff s ON s.id = dds.doctor_id
    WHERE dds.clinic_id = p_clinic_id
      AND dds.date >= p_start_date
      AND dds.date <= p_end_date
      AND (p_doctor_id IS NULL OR dds.doctor_id = p_doctor_id)
      AND s.is_active = true
    ORDER BY dds.date ASC, s.name ASC
  ) row_data;

  RETURN v_events;
END;
$$;

ALTER FUNCTION public.get_clinic_calendar_events(UUID, DATE, DATE, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_clinic_calendar_events(UUID, DATE, DATE, UUID) TO anon, authenticated, service_role;


-- 4. Create RPC to set or update calendar entry for a single date
CREATE OR REPLACE FUNCTION public.set_doctor_calendar_entry(
  p_clinic_id UUID,
  p_doctor_id UUID,
  p_date DATE,
  p_is_active BOOLEAN,
  p_is_leave BOOLEAN DEFAULT false,
  p_leave_reason VARCHAR DEFAULT NULL,
  p_start_time TIME DEFAULT '09:00',
  p_end_time TIME DEFAULT '17:00',
  p_time_per_patient INT DEFAULT 10,
  p_max_patients INT DEFAULT NULL,
  p_mode VARCHAR DEFAULT 'walk-in'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result RECORD;
BEGIN
  INSERT INTO public.doctor_daily_settings (
    clinic_id,
    doctor_id,
    date,
    is_active,
    is_leave,
    leave_reason,
    start_time,
    end_time,
    time_per_patient_mins,
    max_patients,
    mode,
    setup_confirmed
  ) VALUES (
    p_clinic_id,
    p_doctor_id,
    p_date,
    p_is_active,
    p_is_leave,
    p_leave_reason,
    CASE WHEN p_is_leave OR NOT p_is_active THEN NULL ELSE p_start_time END,
    CASE WHEN p_is_leave OR NOT p_is_active THEN NULL ELSE p_end_time END,
    CASE WHEN p_is_leave OR NOT p_is_active THEN 0 ELSE COALESCE(p_time_per_patient, 10) END,
    CASE WHEN p_is_leave OR NOT p_is_active THEN 0 ELSE p_max_patients END,
    p_mode,
    true
  )
  ON CONFLICT (doctor_id, date) DO UPDATE SET
    clinic_id = EXCLUDED.clinic_id,
    is_active = EXCLUDED.is_active,
    is_leave = EXCLUDED.is_leave,
    leave_reason = EXCLUDED.leave_reason,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    time_per_patient_mins = EXCLUDED.time_per_patient_mins,
    max_patients = EXCLUDED.max_patients,
    mode = EXCLUDED.mode,
    setup_confirmed = true
  RETURNING * INTO v_result;

  RETURN to_jsonb(v_result);
END;
$$;

ALTER FUNCTION public.set_doctor_calendar_entry(UUID, UUID, DATE, BOOLEAN, BOOLEAN, VARCHAR, TIME, TIME, INT, INT, VARCHAR) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.set_doctor_calendar_entry(UUID, UUID, DATE, BOOLEAN, BOOLEAN, VARCHAR, TIME, TIME, INT, INT, VARCHAR) TO anon, authenticated, service_role;


-- 5. Create RPC for batch setting multi-day leaves (e.g. holidays, vacations)
CREATE OR REPLACE FUNCTION public.batch_set_doctor_leaves(
  p_clinic_id UUID,
  p_doctor_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_reason VARCHAR DEFAULT 'On Leave'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cur_date DATE := p_from_date;
  v_count INTEGER := 0;
BEGIN
  WHILE v_cur_date <= p_to_date LOOP
    PERFORM public.set_doctor_calendar_entry(
      p_clinic_id => p_clinic_id,
      p_doctor_id => p_doctor_id,
      p_date => v_cur_date,
      p_is_active => false,
      p_is_leave => true,
      p_leave_reason => p_reason
    );
    v_cur_date := v_cur_date + 1;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

ALTER FUNCTION public.batch_set_doctor_leaves(UUID, UUID, DATE, DATE, VARCHAR) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.batch_set_doctor_leaves(UUID, UUID, DATE, DATE, VARCHAR) TO anon, authenticated, service_role;


-- 6. Upgrade check_doctor_availability to support date-specific & doctor-specific inquiries
CREATE OR REPLACE FUNCTION public.check_doctor_availability(
  p_clinic_id UUID,
  p_date DATE DEFAULT NULL,
  p_doctor_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_date DATE := COALESCE(p_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);
  v_target_doc_id UUID := NULL;
  v_doc_name TEXT := NULL;
  v_doctors_list TEXT;
  v_leaves_list TEXT;
  v_doc_setting RECORD;
  v_next_available RECORD;
  v_date_str TEXT := to_char(v_target_date, 'FMMonth FMDD, YYYY');
BEGIN
  -- If doctor name was passed, resolve doctor fuzzily
  IF p_doctor_name IS NOT NULL AND trim(p_doctor_name) != '' THEN
    SELECT s.id, s.name INTO v_target_doc_id, v_doc_name
    FROM public.staff s
    WHERE s.clinic_id = p_clinic_id
      AND s.is_active = true
      AND (
        lower(trim(s.name)) = lower(regexp_replace(trim(p_doctor_name), '^dr\.?\s*', '', 'i'))
        OR lower(s.name) LIKE '%' || lower(regexp_replace(trim(p_doctor_name), '^dr\.?\s*', '', 'i')) || '%'
        OR lower(regexp_replace(trim(p_doctor_name), '^dr\.?\s*', '', 'i')) LIKE '%' || lower(s.name) || '%'
      )
    ORDER BY (lower(trim(s.name)) = lower(regexp_replace(trim(p_doctor_name), '^dr\.?\s*', '', 'i'))) DESC
    LIMIT 1;

    -- If specific doctor was requested
    IF v_target_doc_id IS NOT NULL THEN
      -- Fetch settings for target date
      SELECT * INTO v_doc_setting
      FROM public.doctor_daily_settings
      WHERE clinic_id = p_clinic_id
        AND doctor_id = v_target_doc_id
        AND date = v_target_date;

      -- If doctor has an entry and is on leave / not active
      IF FOUND AND (v_doc_setting.is_leave = true OR v_doc_setting.is_active = false) THEN
        -- Find their next active date
        SELECT date, start_time INTO v_next_available
        FROM public.doctor_daily_settings
        WHERE clinic_id = p_clinic_id
          AND doctor_id = v_target_doc_id
          AND date > v_target_date
          AND is_active = true
          AND (is_leave IS NULL OR is_leave = false)
        ORDER BY date ASC
        LIMIT 1;

        IF FOUND THEN
          RETURN jsonb_build_object(
            'available', false,
            'is_leave', true,
            'doctor_name', 'Dr. ' || v_doc_name,
            'date', v_target_date,
            'next_available_date', v_next_available.date,
            'next_start_time', to_char(v_next_available.start_time, 'HH12:MI AM'),
            'message', 'Dr. ' || v_doc_name || ' is ' || COALESCE(v_doc_setting.leave_reason, 'not available') || ' on ' || v_date_str || '. Next available date is ' || to_char(v_next_available.date, 'FMMonth FMDD') || ' starting at ' || COALESCE(to_char(v_next_available.start_time, 'HH12:MI AM'), 'scheduled shift') || '.'
          );
        ELSE
          RETURN jsonb_build_object(
            'available', false,
            'is_leave', true,
            'doctor_name', 'Dr. ' || v_doc_name,
            'date', v_target_date,
            'message', 'Dr. ' || v_doc_name || ' is ' || COALESCE(v_doc_setting.leave_reason, 'not available') || ' on ' || v_date_str || '.'
          );
        END IF;

      -- If doctor has an entry and is active
      ELSIF FOUND AND v_doc_setting.is_active = true THEN
        RETURN jsonb_build_object(
          'available', true,
          'is_leave', false,
          'doctor_name', 'Dr. ' || v_doc_name,
          'date', v_target_date,
          'start_time', to_char(v_doc_setting.start_time, 'HH12:MI AM'),
          'end_time', to_char(v_doc_setting.end_time, 'HH12:MI AM'),
          'doctor_list', 'Dr. ' || v_doc_name || ' (starting at ' || COALESCE(to_char(v_doc_setting.start_time, 'HH12:MI AM'), '09:00 AM') || ')',
          'message', 'Yes, Dr. ' || v_doc_name || ' is available on ' || v_date_str || ' starting at ' || COALESCE(to_char(v_doc_setting.start_time, 'HH12:MI AM'), '09:00 AM') || '.'
        );

      -- If no daily setting exists for target date, check default staff status
      ELSE
        RETURN jsonb_build_object(
          'available', true,
          'is_leave', false,
          'doctor_name', 'Dr. ' || v_doc_name,
          'date', v_target_date,
          'doctor_list', 'Dr. ' || v_doc_name,
          'message', 'Dr. ' || v_doc_name || ' is scheduled to be available on ' || v_date_str || '.'
        );
      END IF;
    END IF;
  END IF;

  -- General availability check for the target date across all clinic doctors
  SELECT string_agg('Dr. ' || initcap(trim(replace(s.name, 'Dr.', ''))) || ' (starting at ' || COALESCE(to_char(dds.start_time, 'HH12:MI AM'), 'their scheduled shift') || ')', ', ')
  INTO v_doctors_list
  FROM public.doctor_daily_settings dds
  JOIN public.staff s ON s.id = dds.doctor_id
  WHERE dds.clinic_id = p_clinic_id
    AND dds.date = v_target_date
    AND dds.is_active = true
    AND (dds.is_leave IS NULL OR dds.is_leave = false);

  -- Also check doctors who are marked on leave on target date
  SELECT string_agg('Dr. ' || initcap(trim(replace(s.name, 'Dr.', ''))) || ' (' || COALESCE(dds.leave_reason, 'On Leave') || ')', ', ')
  INTO v_leaves_list
  FROM public.doctor_daily_settings dds
  JOIN public.staff s ON s.id = dds.doctor_id
  WHERE dds.clinic_id = p_clinic_id
    AND dds.date = v_target_date
    AND (dds.is_leave = true OR dds.is_active = false);

  IF v_doctors_list IS NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'date', v_target_date,
      'leaves_list', v_leaves_list,
      'message', 'No doctors are scheduled or available at the clinic on ' || v_date_str || '.' || CASE WHEN v_leaves_list IS NOT NULL THEN ' Doctors on leave: ' || v_leaves_list || '.' ELSE '' END
    );
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'date', v_target_date,
    'doctor_list', v_doctors_list,
    'leaves_list', v_leaves_list,
    'message', 'On ' || v_date_str || ', the following doctors are available: ' || v_doctors_list || '.' || CASE WHEN v_leaves_list IS NOT NULL THEN ' On leave: ' || v_leaves_list || '.' ELSE '' END || ' Whom would you like to book an appointment with?'
  );
END;
$$;

ALTER FUNCTION public.check_doctor_availability(UUID, DATE, TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_doctor_availability(UUID, DATE, TEXT) TO anon, authenticated, service_role;
