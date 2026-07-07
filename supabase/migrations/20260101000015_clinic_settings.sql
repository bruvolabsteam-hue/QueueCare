-- Add new columns to clinics for sender numbers and whitelabeling
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS whatsapp_sender_number VARCHAR,
ADD COLUMN IF NOT EXISTS exotel_caller_id VARCHAR,
ADD COLUMN IF NOT EXISTS whitelabel_name VARCHAR;

-- Add new columns to staff for doctors
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR,
ADD COLUMN IF NOT EXISTS allow_patient_calls BOOLEAN DEFAULT false;

-- Add RLS policy to allow Clinic Admins to update their own clinic row
-- (Currently, only super admins can update clinics. We need clinic admins to update settings.)
CREATE POLICY "Clinic admin can update own clinic" ON public.clinics
FOR UPDATE
USING (
  id = get_user_clinic_id() 
  AND get_user_role() = 'clinic_admin'
);
