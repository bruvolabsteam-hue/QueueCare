-- Create a function to get the current user's role
CREATE OR REPLACE FUNCTION get_user_role() RETURNS text AS $$
  SELECT role::text FROM staff WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Create a function to get the current user's clinic_id
CREATE OR REPLACE FUNCTION get_user_clinic_id() RETURNS uuid AS $$
  SELECT clinic_id FROM staff WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Clinics Policies
CREATE POLICY "Super admins can do all on clinics" ON clinics FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Clinic staff can view their own clinic" ON clinics FOR SELECT USING (id = get_user_clinic_id());

-- API Keys Policies
CREATE POLICY "Super admins can do all on api_keys" ON clinic_api_keys FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Clinic admins can manage their api keys" ON clinic_api_keys FOR ALL USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'clinic_admin');

-- Staff Policies
CREATE POLICY "Super admins can do all on staff" ON staff FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Clinic admins can manage staff" ON staff FOR ALL USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'clinic_admin');
CREATE POLICY "Staff can view their own profile" ON staff FOR SELECT USING (id = auth.uid());

-- Patients Policies
CREATE POLICY "Super admins can do all on patients" ON patients FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Clinic staff can do all on patients" ON patients FOR ALL USING (clinic_id = get_user_clinic_id());
-- Kiosk access will need an anon policy or a specific token. For now, public can insert.
CREATE POLICY "Public can insert patient (kiosk)" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can select patient (display)" ON patients FOR SELECT USING (true);

-- Queue Sessions Policies
CREATE POLICY "Super admins can do all on queue_sessions" ON queue_sessions FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Clinic staff can do all on queue_sessions" ON queue_sessions FOR ALL USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Public can view queue_sessions (display)" ON queue_sessions FOR SELECT USING (true);

-- Token Timing
CREATE POLICY "Super admins can do all on token_timing" ON token_timing FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Clinic staff can do all on token_timing" ON token_timing FOR ALL USING (clinic_id = get_user_clinic_id());

-- Pending Messages
CREATE POLICY "Super admins can do all on pending_messages" ON pending_messages FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Clinic staff can view pending_messages" ON pending_messages FOR SELECT USING (clinic_id = get_user_clinic_id());

-- Clinic Usage
CREATE POLICY "Super admins can do all on clinic_usage" ON clinic_usage FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Clinic staff can view clinic_usage" ON clinic_usage FOR SELECT USING (clinic_id = get_user_clinic_id());

-- Low Balance Alerts
CREATE POLICY "Super admins can do all on low_balance_alerts" ON low_balance_alerts FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Clinic staff can view low_balance_alerts" ON low_balance_alerts FOR SELECT USING (clinic_id = get_user_clinic_id());

-- API Failures
CREATE POLICY "Super admins can do all on api_failures" ON api_failures FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Clinic admins can view api_failures" ON api_failures FOR SELECT USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'clinic_admin');
