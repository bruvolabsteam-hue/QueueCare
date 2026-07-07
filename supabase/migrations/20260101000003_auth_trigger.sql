CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_clinic_id uuid;
BEGIN
  -- Insert a new clinic for the newly registered user
  INSERT INTO public.clinics (owner_email, clinic_name, clinic_slug)
  VALUES (new.email, 'My Clinic', 'clinic-' || substr(new.id::text, 1, 8))
  RETURNING id INTO new_clinic_id;

  -- Insert the user into the staff table as a clinic_admin
  INSERT INTO public.staff (id, clinic_id, name, email, role)
  VALUES (new.id, new_clinic_id, COALESCE(new.raw_user_meta_data->>'full_name', 'Admin'), new.email, 'clinic_admin');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
