-- ENUMs
CREATE TYPE travel_category AS ENUM ('here', 'under_30', '30_to_60', 'over_60');
CREATE TYPE queue_action_type AS ENUM ('insert_now', 'add_to_end', 'skip', 'recall', 'pause', 'resume');

-- Update patients table
ALTER TABLE public.patients 
  ADD COLUMN IF NOT EXISTS queue_position NUMERIC,
  ADD COLUMN IF NOT EXISTS travel_category travel_category DEFAULT 'here',
  ADD COLUMN IF NOT EXISTS travel_alert_sent BOOLEAN DEFAULT FALSE;

-- Initialize queue_position to match token_number for existing records
UPDATE public.patients SET queue_position = token_number WHERE queue_position IS NULL;

-- Create queue_actions table
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

ALTER TABLE public.queue_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinics can see own queue actions" ON public.queue_actions FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Clinics can insert own queue actions" ON public.queue_actions FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "Super Admins can see all queue actions" ON public.queue_actions FOR SELECT USING (get_user_role() = 'super_admin');

-- Replace generate_daily_token to handle queue_position and travel_category
CREATE OR REPLACE FUNCTION generate_daily_token(
  p_clinic_id uuid, 
  p_name text, 
  p_phone text, 
  p_registration_method text,
  p_language text DEFAULT 'auto',
  p_travel_category text DEFAULT 'here'
)
RETURNS int AS $$
DECLARE
  v_new_token int;
  v_patient_id uuid;
  v_waiting_count int;
  v_avg_time int;
  v_est_wait int;
  v_est_time text;
BEGIN
  PERFORM id FROM public.clinics WHERE id = p_clinic_id FOR UPDATE;

  SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_new_token
  FROM public.patients
  WHERE clinic_id = p_clinic_id
    AND created_at >= date_trunc('day', now());

  -- Count patients currently waiting ahead
  SELECT COUNT(*) INTO v_waiting_count
  FROM public.patients
  WHERE clinic_id = p_clinic_id
    AND status = 'waiting'
    AND created_at >= date_trunc('day', now());

  -- Get clinic's avg time per patient (default 10 mins)
  SELECT COALESCE(avg_time_per_patient_mins, 10) INTO v_avg_time
  FROM public.clinics WHERE id = p_clinic_id;

  -- Calculate estimated wait in minutes
  v_est_wait := v_waiting_count * v_avg_time;

  -- Calculate estimated turn time as a readable string (e.g., "11:45 AM")
  v_est_time := to_char(now() + (v_est_wait || ' minutes')::interval, 'HH12:MI AM');

  INSERT INTO public.patients (
    clinic_id, name, phone, language, token_number, queue_position, registration_method, status
  )
  VALUES (
    p_clinic_id, p_name, p_phone, 'auto', v_new_token, v_new_token, 
    p_registration_method::registration_method, 'waiting'
  )
  RETURNING id INTO v_patient_id;

  -- Send bilingual WhatsApp with estimated turn time
  INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
  VALUES (
    p_clinic_id, p_phone, 'token_assigned', 
    'Hello ' || p_name || '! 🏥' || chr(10) ||
    'Your token number is: *#' || v_new_token || '*' || chr(10) ||
    'Patients ahead: ' || v_waiting_count || chr(10) ||
    'Estimated turn: *' || v_est_time || '* (~' || v_est_wait || ' mins)' || chr(10) ||
    'Please arrive 5 minutes before your turn.' || chr(10) ||
    chr(10) ||
    'नमस्ते ' || p_name || '! 🏥' || chr(10) ||
    'आपका टोकन नंबर: *#' || v_new_token || '*' || chr(10) ||
    'आपसे आगे: ' || v_waiting_count || ' मरीज़' || chr(10) ||
    'अनुमानित समय: *' || v_est_time || '* (~' || v_est_wait || ' मिनट)' || chr(10) ||
    'कृपया अपनी बारी से 5 मिनट पहले पहुँचें।',
    'pending'
  );

  RETURN v_new_token;
END;
$$ LANGUAGE plpgsql;

-- RPC for Re-inserting Tokens
CREATE OR REPLACE FUNCTION re_insert_token(p_patient_id uuid, p_mode text, p_staff_id uuid)
RETURNS void AS $$
DECLARE
  v_patient RECORD;
  v_curr_pos NUMERIC;
  v_next_pos NUMERIC;
  v_new_pos NUMERIC;
  v_next_patient RECORD;
  v_max_pos NUMERIC;
  v_queue_length INTEGER;
BEGIN
  -- Get the skipped patient
  SELECT * INTO v_patient FROM public.patients WHERE id = p_patient_id;
  IF NOT FOUND OR v_patient.status != 'skipped' THEN
    RAISE EXCEPTION 'Patient not found or not skipped';
  END IF;

  IF p_mode = 'insert_now' THEN
    -- Find currently called patient
    SELECT queue_position INTO v_curr_pos FROM public.patients 
    WHERE clinic_id = v_patient.clinic_id AND status = 'called' AND created_at >= date_trunc('day', now()) LIMIT 1;

    -- Find next waiting patient
    SELECT * INTO v_next_patient FROM public.patients 
    WHERE clinic_id = v_patient.clinic_id AND status = 'waiting' AND created_at >= date_trunc('day', now()) 
    ORDER BY queue_position ASC LIMIT 1;

    IF v_next_patient.id IS NOT NULL THEN
       v_next_pos := v_next_patient.queue_position;
       IF v_curr_pos IS NOT NULL THEN
          v_new_pos := (v_curr_pos + v_next_pos) / 2.0;
       ELSE
          v_new_pos := v_next_pos - 1;
       END IF;
    ELSE
       IF v_curr_pos IS NOT NULL THEN
          v_new_pos := v_curr_pos + 1;
       ELSE
          v_new_pos := v_patient.token_number; -- fallback
       END IF;
    END IF;

    -- Update patient
    UPDATE public.patients SET status = 'waiting', queue_position = v_new_pos WHERE id = p_patient_id;

    -- Send bilingual message to re-inserted patient
    INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
    VALUES (
      v_patient.clinic_id, v_patient.phone, 'insert_now',
      'Hello ' || v_patient.name || '! You have been re-added to the queue. You are NEXT. Please come to the doctor''s room immediately 🙏' || chr(10) || chr(10) ||
      'नमस्ते ' || v_patient.name || '! आपको कतार में फिर से जोड़ दिया गया है। आप अगले हैं। कृपया तुरंत डॉक्टर के कमरे में आएं 🙏',
      'pending'
    );

    -- Send courtesy message to next patient if they exist
    IF v_next_patient.id IS NOT NULL THEN
       INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
       VALUES (
         v_next_patient.clinic_id, v_next_patient.phone, 'courtesy_delay',
         'Sorry for a small delay. You will be called very shortly. Thank you for your patience 🙏' || chr(10) ||
         'थोड़ी देरी के लिए क्षमा करें। आपको जल्द ही बुलाया जाएगा। धन्यवाद 🙏',
         'pending'
       );
    END IF;

  ELSIF p_mode = 'add_to_end' THEN
    -- Find max pos
    SELECT COALESCE(MAX(queue_position), 0) INTO v_max_pos FROM public.patients 
    WHERE clinic_id = v_patient.clinic_id AND created_at >= date_trunc('day', now());

    v_new_pos := v_max_pos + 1;
    
    -- Count waiting ahead for estimate
    SELECT COUNT(*) INTO v_queue_length FROM public.patients 
    WHERE clinic_id = v_patient.clinic_id AND status = 'waiting' AND queue_position < v_new_pos AND created_at >= date_trunc('day', now());

    -- Update patient
    UPDATE public.patients SET status = 'waiting', queue_position = v_new_pos, re_entry_count = re_entry_count + 1 WHERE id = p_patient_id;

    -- Send bilingual message
    INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
    VALUES (
      v_patient.clinic_id, v_patient.phone, 'add_to_end',
      'Hello ' || v_patient.name || '! You have been re-added to the queue at position #' || v_new_pos || '. Estimated wait: ~' || (v_queue_length * 10) || ' mins. Please do not leave the clinic 🙏' || chr(10) || chr(10) ||
      'नमस्ते ' || v_patient.name || '! आपको कतार में #' || v_new_pos || ' स्थान पर जोड़ा गया है। अनुमानित प्रतीक्षा: ~' || (v_queue_length * 10) || ' मिनट। कृपया क्लिनिक न छोड़ें 🙏',
      'pending'
    );
  END IF;

  -- Log action
  INSERT INTO public.queue_actions (clinic_id, patient_id, token_number, action_type, done_by)
  VALUES (v_patient.clinic_id, p_patient_id, v_patient.token_number, p_mode::queue_action_type, p_staff_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Cron job function for Travel Alerts
CREATE OR REPLACE FUNCTION process_travel_alerts() RETURNS void AS $$
DECLARE
  v_patient RECORD;
  v_ahead INTEGER;
  v_avg_time INTEGER;
  v_est_wait INTEGER;
  v_threshold INTEGER;
BEGIN
  -- Loop through all waiting patients who have a travel category and haven't been alerted
  FOR v_patient IN 
    SELECT p.*, c.avg_time_per_patient_mins 
    FROM public.patients p
    JOIN public.clinics c ON c.id = p.clinic_id
    WHERE p.status = 'waiting' 
      AND p.travel_alert_sent = false 
      AND p.travel_category != 'here'
      AND p.created_at >= date_trunc('day', now())
  LOOP
    -- Calculate patients ahead
    SELECT COUNT(*) INTO v_ahead 
    FROM public.patients 
    WHERE clinic_id = v_patient.clinic_id 
      AND status = 'waiting' 
      AND queue_position < v_patient.queue_position 
      AND created_at >= date_trunc('day', now());

    v_avg_time := COALESCE(v_patient.avg_time_per_patient_mins, 10);
    v_est_wait := v_ahead * v_avg_time;

    -- Determine threshold based on category
    IF v_patient.travel_category = 'under_30' THEN
      v_threshold := 35;
    ELSIF v_patient.travel_category = '30_to_60' THEN
      v_threshold := 65;
    ELSIF v_patient.travel_category = 'over_60' THEN
      v_threshold := 70;
    END IF;

    -- Immediate alert condition for over_60 if wait > 60
    IF v_patient.travel_category = 'over_60' AND v_est_wait > 60 THEN
      -- Immediate travel warning
      INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
      VALUES (
        v_patient.clinic_id, v_patient.phone, 'travel_alert',
        'Hello ' || v_patient.name || ', your token is #' || v_patient.token_number || '. Estimated wait: ~' || v_est_wait || ' minutes. ⚠️ Since you are far from the clinic, you should leave NOW to arrive on time. We will send you another reminder when you are close to your turn 🙏',
        'pending'
      );
      UPDATE public.patients SET travel_alert_sent = true WHERE id = v_patient.id;
    -- Normal leave now condition
    ELSIF v_est_wait <= v_threshold THEN
      INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
      VALUES (
        v_patient.clinic_id, v_patient.phone, 'travel_alert',
        'Hello ' || v_patient.name || ', based on your travel distance, you should start heading to the clinic NOW. Approximately ' || v_ahead || ' patients ahead of you. Estimated time until your turn: ~' || v_est_wait || ' minutes 🚶',
        'pending'
      );
      UPDATE public.patients SET travel_alert_sent = true WHERE id = v_patient.id;
    END IF;

  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule the cron job (will run every minute)
SELECT cron.schedule(
  'process-travel-alerts',
  '* * * * *',
  $$ SELECT process_travel_alerts() $$
);
