-- Seed super admin users with known password for testing
-- Password is: Admin123!  (bcrypt hashed)

-- Insert into auth.users if they don't exist
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin1@queuecare.local',
  '$2a$10$PW3mQhfhBiFuIbVkzKgjIemjqH3SWfEzQxqBKxcH00dv.pWlnCo.6',  -- Admin123!
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Super Admin 1"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'admin2@queuecare.local',
  '$2a$10$PW3mQhfhBiFuIbVkzKgjIemjqH3SWfEzQxqBKxcH00dv.pWlnCo.6',  -- Admin123!
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Super Admin 2"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- The handle_new_user trigger will auto-create staff records when these users are inserted
-- But trigger fires on INSERT, so let's also ensure staff rows exist
INSERT INTO public.staff (id, email, name, role, is_active, clinic_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin1@queuecare.local', 'Super Admin 1', 'super_admin', true, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff (id, email, name, role, is_active, clinic_id)
VALUES ('00000000-0000-0000-0000-000000000002', 'admin2@queuecare.local', 'Super Admin 2', 'super_admin', true, NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed platform_settings if empty
INSERT INTO public.platform_settings (master_telecmi_balance, alert_threshold)
SELECT 1000, 100
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- Seed global_settings if empty
INSERT INTO public.global_settings (brain_url, brain_model)
SELECT 'https://api.groq.com/openai/v1', 'llama-3.1-8b-instant'
WHERE NOT EXISTS (SELECT 1 FROM public.global_settings);
