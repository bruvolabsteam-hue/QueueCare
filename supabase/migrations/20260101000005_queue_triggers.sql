CREATE OR REPLACE FUNCTION public.handle_patient_update()
RETURNS trigger AS $$
DECLARE
  v_message text;
BEGIN
  -- 1. Token Called Notification
  IF new.status = 'called' AND old.status != 'called' THEN
    IF new.language = 'hi' THEN
      v_message := 'नमस्ते ' || new.name || ', आपका टोकन नंबर ' || new.token_number || ' बुलाया जा रहा है। कृपया डॉक्टर के पास जाएँ।';
    ELSE
      v_message := 'Hello ' || new.name || ', your token number ' || new.token_number || ' is now being called. Please proceed to the doctor.';
    END IF;

    INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
    VALUES (new.clinic_id, new.phone, 'token_called', v_message, 'pending');
  END IF;

  -- Note: Ahead alerts (e.g. 3 ahead) can be checked here or handled via a separate function
  -- that queries the queue position. For simplicity, we trigger 'token_called' here.

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_patient_update
  AFTER UPDATE ON public.patients
  FOR EACH ROW EXECUTE PROCEDURE public.handle_patient_update();
