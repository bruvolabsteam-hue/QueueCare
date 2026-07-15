-- Add configuration columns to platform_settings for Master Wallet Alerts
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS super_admin_phone character varying,
ADD COLUMN IF NOT EXISTS alert_threshold numeric DEFAULT 1000;

-- Create an RPC to safely check master balances and generate alerts
-- This can be called from the Edge Function
CREATE OR REPLACE FUNCTION public.check_and_alert_master_wallet()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  settings RECORD;
  telecmi_msg text;
BEGIN
  -- Get the master settings
  SELECT * INTO settings FROM public.platform_settings LIMIT 1;
  
  IF settings IS NULL OR settings.super_admin_phone IS NULL THEN
    RETURN; -- No phone configured, can't send alert
  END IF;

  -- Check TeleCMI Balance
  IF settings.master_telecmi_balance < settings.alert_threshold THEN
    telecmi_msg := '⚠️ BRUVOLABS CRITICAL ALERT: Your TeleCMI Master Wallet balance has dropped to ' || settings.master_telecmi_balance || ' credits. Please refill immediately to prevent voice and messaging service disruption across all clinics.';
    
    -- Check if we already have a pending message for this exact issue to avoid spam
    IF NOT EXISTS (
      SELECT 1 FROM public.pending_messages 
      WHERE phone = settings.super_admin_phone 
      AND message_content = telecmi_msg 
      AND status = 'pending'
    ) THEN
      INSERT INTO public.pending_messages (phone, event_type, message_content, status)
      VALUES (settings.super_admin_phone, 'system_alert', telecmi_msg, 'pending');
    END IF;
  END IF;
END;
$$;
