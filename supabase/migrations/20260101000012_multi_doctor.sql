-- 1. Add doctor_id to patients table
ALTER TABLE patients ADD COLUMN doctor_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- 2. Update the RPC to accept p_doctor_id and partition by it
CREATE OR REPLACE FUNCTION generate_daily_token(
    p_clinic_id UUID,
    p_name VARCHAR,
    p_phone VARCHAR,
    p_registration_method registration_method,
    p_doctor_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_new_token INTEGER;
    v_patient_id UUID;
    v_wait_time_mins INTEGER;
    v_regional_lang VARCHAR;
    v_sms_body TEXT;
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
    SELECT avg_time_per_patient_mins INTO v_wait_time_mins
    FROM clinics
    WHERE id = p_clinic_id;

    -- 4. Get Regional Language
    SELECT COALESCE(regional_language, 'hindi') INTO v_regional_lang
    FROM clinics 
    WHERE id = p_clinic_id;

    -- 5. Generate message content
    v_sms_body := get_token_message(
      v_regional_lang, 
      p_name, 
      v_new_token::TEXT, 
      v_wait_time_mins::TEXT
    );

    -- 6. Enqueue WhatsApp Message
    INSERT INTO pending_messages (patient_id, clinic_id, phone, message_body, status, service)
    VALUES (v_patient_id, p_clinic_id, p_phone, v_sms_body, 'pending', 'whatsapp');

    RETURN v_new_token;
END;
$$ LANGUAGE plpgsql;
