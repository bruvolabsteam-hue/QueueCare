CREATE OR REPLACE FUNCTION generate_daily_token(p_clinic_id uuid, p_name text, p_phone text, p_language text, p_registration_method text)
RETURNS int AS $$
DECLARE
  v_new_token int;
  v_patient_id uuid;
BEGIN
  -- Lock the clinic row to prevent race conditions for token generation
  PERFORM id FROM public.clinics WHERE id = p_clinic_id FOR UPDATE;

  -- Find the max token for today (using timezone aware date)
  SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_new_token
  FROM public.patients
  WHERE clinic_id = p_clinic_id
    AND created_at >= date_trunc('day', now());

  -- Insert the new patient
  INSERT INTO public.patients (clinic_id, name, phone, language, token_number, registration_method, status)
  VALUES (p_clinic_id, p_name, p_phone, p_language, v_new_token, p_registration_method::registration_method, 'waiting')
  RETURNING id INTO v_patient_id;

  -- Insert a welcome message to pending_messages
  INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
  VALUES (
    p_clinic_id, 
    p_phone, 
    'token_assigned', 
    CASE 
      WHEN p_language = 'hi' THEN 'नमस्ते ' || p_name || ', आपका टोकन नंबर ' || v_new_token || ' है।'
      ELSE 'Hello ' || p_name || ', your token number is ' || v_new_token || '.'
    END, 
    'pending'
  );

  RETURN v_new_token;
END;
$$ LANGUAGE plpgsql;
