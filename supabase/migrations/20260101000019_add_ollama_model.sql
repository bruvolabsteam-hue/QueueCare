-- Add ollama_model column to global_settings table
ALTER TABLE public.global_settings
ADD COLUMN ollama_model TEXT DEFAULT 'llama3';
