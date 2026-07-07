-- Calculate rolling average time per patient for each clinic
CREATE OR REPLACE FUNCTION public.calculate_rolling_average()
RETURNS void AS $$
DECLARE
  clinic_record RECORD;
  new_avg NUMERIC;
BEGIN
  FOR clinic_record IN SELECT id FROM public.clinics LOOP
    -- Calculate average time difference in minutes for the last 50 completed tokens
    SELECT AVG(EXTRACT(EPOCH FROM (done_at - called_at)) / 60.0) INTO new_avg
    FROM (
      SELECT called_at, done_at
      FROM public.patients
      WHERE clinic_id = clinic_record.id
        AND status = 'done'
        AND called_at IS NOT NULL
        AND done_at IS NOT NULL
        AND EXTRACT(EPOCH FROM (done_at - called_at)) > 0
      ORDER BY done_at DESC
      LIMIT 50
    ) AS recent_patients;

    IF new_avg IS NOT NULL THEN
      UPDATE public.clinics
      SET avg_time_per_patient_mins = GREATEST(1, ROUND(new_avg))
      WHERE id = clinic_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Detect delays (current patient taking > 1.5x average time)
CREATE OR REPLACE FUNCTION public.detect_delays()
RETURNS void AS $$
DECLARE
  delayed_patient RECORD;
BEGIN
  FOR delayed_patient IN 
    SELECT p.id, p.clinic_id, p.token_number, p.phone, p.called_at, p.language, c.avg_time_per_patient_mins
    FROM public.patients p
    JOIN public.clinics c ON p.clinic_id = c.id
    WHERE p.status = 'called'
      AND p.called_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (now() - p.called_at)) / 60.0 > (1.5 * c.avg_time_per_patient_mins)
  LOOP
    -- Insert a delay notification into pending_messages for waiting patients,
    -- or just alert the waiting patients.
    -- For simplicity, we just send a notification to the delayed patient or general queue.
    -- The prompt says "sends delay alert to queue". 
    -- We can insert a 'delay_alert' message for the next 3 waiting patients.
    INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
    SELECT 
      w.clinic_id, 
      w.phone, 
      'delay_alert', 
      CASE 
        WHEN w.language = 'hi' THEN 'डॉक्टर को वर्तमान मरीज़ के साथ थोड़ा अधिक समय लग रहा है। कृपया प्रतीक्षा करें।'
        ELSE 'The doctor is taking a little longer with the current patient. Please bear with us.'
      END,
      'pending'
    FROM public.patients w
    WHERE w.clinic_id = delayed_patient.clinic_id
      AND w.status = 'waiting'
    ORDER BY w.token_number ASC
    LIMIT 3;
    
    -- We don't want to alert infinitely for the same delayed patient. 
    -- Add an arbitrary flag or just update called_at so it doesn't trigger again for another 1.5x.
    -- A better way is to have a 'delay_alert_sent' flag on patients table. 
    -- For this prototype, we'll just bump the called_at timestamp so it delays the next alert.
    UPDATE public.patients SET called_at = now() WHERE id = delayed_patient.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule the functions
SELECT cron.schedule('calculate-rolling-avg-nightly', '0 2 * * *', 'SELECT public.calculate_rolling_average()');
SELECT cron.schedule('detect-delays-5mins', '*/5 * * * *', 'SELECT public.detect_delays()');
