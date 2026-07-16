-- Add specific columns for Groq and Claude to allow easy switching
ALTER TABLE public.global_settings
ADD COLUMN IF NOT EXISTS groq_api_key text,
ADD COLUMN IF NOT EXISTS claude_api_key text,
ADD COLUMN IF NOT EXISTS active_brain_provider text DEFAULT 'groq';

-- Migrate existing data
UPDATE public.global_settings
SET groq_api_key = brain_api_key
WHERE groq_api_key IS NULL AND brain_api_key IS NOT NULL;
