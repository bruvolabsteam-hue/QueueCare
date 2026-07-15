-- 1. Drop dependent unique constraints
ALTER TABLE public.clinic_api_keys DROP CONSTRAINT IF EXISTS clinic_api_keys_clinic_id_service_key;
ALTER TABLE public.clinic_usage DROP CONSTRAINT IF EXISTS clinic_usage_clinic_id_service_key;

-- 2. Convert service columns temporarily to TEXT
ALTER TABLE public.clinic_api_keys ALTER COLUMN service TYPE TEXT;
ALTER TABLE public.clinic_usage ALTER COLUMN service TYPE TEXT;
ALTER TABLE public.low_balance_alerts ALTER COLUMN service TYPE TEXT;
ALTER TABLE public.api_failures ALTER COLUMN service TYPE TEXT;

-- 3. Drop the old enum type
DROP TYPE IF EXISTS public.service_type;

-- 4. Create the new enum type
CREATE TYPE public.service_type AS ENUM ('telecmi_voice', 'telecmi_sms');

-- 5. Map old service logs to new services
UPDATE public.clinic_api_keys SET service = CASE 
  WHEN service = 'exotel' THEN 'telecmi_voice'
  ELSE 'telecmi_sms'
END;

UPDATE public.clinic_usage SET service = CASE 
  WHEN service = 'exotel' THEN 'telecmi_voice'
  ELSE 'telecmi_sms'
END;

UPDATE public.low_balance_alerts SET service = CASE 
  WHEN service = 'exotel' THEN 'telecmi_voice'
  ELSE 'telecmi_sms'
END;

UPDATE public.api_failures SET service = CASE 
  WHEN service = 'exotel' THEN 'telecmi_voice'
  ELSE 'telecmi_sms'
END;

-- 6. Cast columns back to new service_type enum
ALTER TABLE public.clinic_api_keys ALTER COLUMN service TYPE public.service_type USING service::public.service_type;
ALTER TABLE public.clinic_usage ALTER COLUMN service TYPE public.service_type USING service::public.service_type;
ALTER TABLE public.low_balance_alerts ALTER COLUMN service TYPE public.service_type USING service::public.service_type;
ALTER TABLE public.api_failures ALTER COLUMN service TYPE public.service_type USING service::public.service_type;

-- 7. Re-add unique constraints
ALTER TABLE public.clinic_api_keys ADD CONSTRAINT clinic_api_keys_clinic_id_service_key UNIQUE (clinic_id, service);
ALTER TABLE public.clinic_usage ADD CONSTRAINT clinic_usage_clinic_id_service_key UNIQUE (clinic_id, service);

-- 8. Alter public.global_settings table
ALTER TABLE public.global_settings
  DROP COLUMN IF EXISTS exotel_account_sid,
  DROP COLUMN IF EXISTS exotel_api_key,
  DROP COLUMN IF EXISTS exotel_api_token,
  DROP COLUMN IF EXISTS whatsapp_api_key,
  DROP COLUMN IF EXISTS support_whatsapp_number;

ALTER TABLE public.global_settings
  ADD COLUMN IF NOT EXISTS telecmi_app_id TEXT,
  ADD COLUMN IF NOT EXISTS telecmi_secret_key TEXT,
  ADD COLUMN IF NOT EXISTS brain_url TEXT DEFAULT 'https://api.groq.com/openai/v1',
  ADD COLUMN IF NOT EXISTS brain_model TEXT DEFAULT 'llama-3.1-8b-instant',
  ADD COLUMN IF NOT EXISTS brain_api_key TEXT;

-- 9. Alter public.clinics table
ALTER TABLE public.clinics
  DROP COLUMN IF EXISTS exotel_caller_id,
  DROP COLUMN IF EXISTS whatsapp_sender_number,
  DROP COLUMN IF EXISTS whatsapp_signature;

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS telecmi_caller_id VARCHAR;

-- 10. Alter public.platform_settings table (Migrate balance credits)
ALTER TABLE public.platform_settings 
  ADD COLUMN IF NOT EXISTS master_telecmi_balance NUMERIC DEFAULT 0;

UPDATE public.platform_settings 
SET master_telecmi_balance = COALESCE(master_exotel_balance, 0) + COALESCE(master_whatsapp_balance, 0);

ALTER TABLE public.platform_settings 
  DROP COLUMN IF EXISTS master_exotel_balance,
  DROP COLUMN IF EXISTS master_whatsapp_balance;

-- 11. Alter public.staff table
ALTER TABLE public.staff
  DROP COLUMN IF EXISTS whatsapp_number;

-- 12. Alter public.daily_summaries table
ALTER TABLE public.daily_summaries
  DROP COLUMN IF EXISTS whatsapp_sent_count,
  ADD COLUMN IF NOT EXISTS telecmi_sent_count INTEGER DEFAULT 0;

-- 13. Recreate public.increment_usage_and_deduct_master RPC
CREATE OR REPLACE FUNCTION public.increment_usage_and_deduct_master(
  p_clinic_id UUID, 
  p_service TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Decrement the unified Master Wallet (TeleCMI balance)
  UPDATE public.platform_settings 
  SET master_telecmi_balance = master_telecmi_balance - 1;

  -- Increment the clinic's usage count based on service type
  IF p_service = 'telecmi_voice' OR p_service = 'voice' THEN
    INSERT INTO public.clinic_usage (clinic_id, service, total_used_this_month, total_calls_made)
    VALUES (p_clinic_id, 'telecmi_voice'::public.service_type, 1, 1)
    ON CONFLICT (clinic_id, service) DO UPDATE
    SET total_used_this_month = clinic_usage.total_used_this_month + 1,
        total_calls_made = clinic_usage.total_calls_made + 1;
  ELSIF p_service = 'telecmi_sms' OR p_service = 'messaging' THEN
    INSERT INTO public.clinic_usage (clinic_id, service, total_used_this_month, total_messages_sent)
    VALUES (p_clinic_id, 'telecmi_sms'::public.service_type, 1, 1)
    ON CONFLICT (clinic_id, service) DO UPDATE
    SET total_used_this_month = clinic_usage.total_used_this_month + 1,
        total_messages_sent = clinic_usage.total_messages_sent + 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Recreate public.check_and_alert_master_wallet RPC
CREATE OR REPLACE FUNCTION public.check_and_alert_master_wallet()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  settings RECORD;
  alert_msg text;
BEGIN
  -- Get the master settings
  SELECT * INTO settings FROM public.platform_settings LIMIT 1;
  
  IF settings IS NULL OR settings.super_admin_phone IS NULL THEN
    RETURN; -- No phone configured, can't send alert
  END IF;

  -- Check TeleCMI Balance
  IF settings.master_telecmi_balance < settings.alert_threshold THEN
    alert_msg := '⚠️ BRUVOLABS CRITICAL ALERT: Your TeleCMI Master Wallet balance has dropped to ' || settings.master_telecmi_balance || ' credits. Please refill immediately to prevent voice and messaging service disruption across all clinics.';
    
    -- Check if we already have a pending message for this exact issue to avoid spam
    IF NOT EXISTS (
      SELECT 1 FROM public.pending_messages 
      WHERE patient_phone = settings.super_admin_phone 
      AND message_content = alert_msg 
      AND status = 'pending'
    ) THEN
      INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
      VALUES (NULL, settings.super_admin_phone, 'system_alert', alert_msg, 'pending');
    END IF;
  END IF;
END;
$$;
