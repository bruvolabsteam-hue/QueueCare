ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS elevenlabs_alert_threshold numeric DEFAULT 80000,
ADD COLUMN IF NOT EXISTS elevenlabs_alert_sent_this_month boolean DEFAULT false;
