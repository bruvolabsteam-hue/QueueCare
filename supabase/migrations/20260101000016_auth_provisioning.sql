-- Function to handle new user sign-ups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_clinic_id uuid;
BEGIN
  -- Check if this is the Super Admin (Bruvo Labs)
  IF new.email = 'bruvolabs.team@gmail.com' THEN
    -- Insert directly into staff as super_admin, no clinic needed
    INSERT INTO public.staff (id, email, name, role, is_active)
    VALUES (new.id, new.email, 'Bruvo Labs', 'super_admin', true);
  ELSE
    -- 1. Create a new isolated Clinic workspace for this user
    INSERT INTO public.clinics (clinic_name, owner_email, clinic_slug, tagline)
    VALUES (
      'Clinic of ' || split_part(new.email, '@', 1),
      new.email,
      'clinic-' || substr(md5(random()::text), 1, 8),
      'Powered by QueueCare'
    )
    RETURNING id INTO new_clinic_id;

    -- 2. Add the user to the staff table as the Clinic Admin for this new clinic
    INSERT INTO public.staff (id, clinic_id, email, name, role, is_active)
    VALUES (
      new.id,
      new_clinic_id,
      new.email,
      split_part(new.email, '@', 1), -- Use the first part of email as default name
      'clinic_admin',
      true
    );
  END IF;

  RETURN new;
END;
$$;

-- Drop the trigger if it exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
