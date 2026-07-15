-- Create global_settings table
CREATE TABLE public.global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ollama_url TEXT DEFAULT 'http://127.0.0.1:11434',
  ollama_model TEXT DEFAULT 'qwen2.5',
  elevenlabs_api_key TEXT,
  exotel_account_sid TEXT,
  exotel_api_key TEXT,
  exotel_api_token TEXT,
  whatsapp_api_key TEXT,
  support_whatsapp_number VARCHAR,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Policies:
-- 1. Super admins can do all actions (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Super admins can do all on global_settings" ON public.global_settings
  FOR ALL
  USING (get_user_role() = 'super_admin');

-- 2. Authenticated/anon users can SELECT (read) the settings
CREATE POLICY "Anyone can read global_settings" ON public.global_settings
  FOR SELECT
  USING (true);

-- Pre-populate/seed exactly one default row with a static UUID and default ollama_url
INSERT INTO public.global_settings (id, ollama_url)
VALUES ('d3b07384-d113-4c9f-a89c-499cf5b6ff9a', 'http://127.0.0.1:11434')
ON CONFLICT (id) DO NOTHING;
