-- Modify staff table to act as doctors directory
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS specialization VARCHAR,
ADD COLUMN IF NOT EXISTS phone VARCHAR,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create doctor_daily_settings table
CREATE TABLE IF NOT EXISTS doctor_daily_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  max_patients INTEGER, -- null means unlimited
  time_per_patient_mins INTEGER DEFAULT 10,
  start_time TIME,
  end_time TIME,
  mode VARCHAR DEFAULT 'walk-in', -- 'walkin', 'appointment', 'both'
  current_patient_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  setup_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, date)
);

-- Create queue_actions table for logging mid-day changes
CREATE TABLE IF NOT EXISTS queue_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  action_type VARCHAR NOT NULL, -- 'transfer', 'limit_change', 'time_change'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily_summaries table
CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_patients_seen INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0,
  total_transferred INTEGER DEFAULT 0,
  total_no_shows INTEGER DEFAULT 0,
  avg_actual_time_per_patient NUMERIC,
  queue_open_time TIMESTAMPTZ,
  queue_close_time TIMESTAMPTZ,
  whatsapp_sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, date)
);

-- RLS Policies
ALTER TABLE doctor_daily_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users access to doctor_daily_settings" ON doctor_daily_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users access to queue_actions" ON queue_actions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users access to daily_summaries" ON daily_summaries FOR ALL USING (auth.role() = 'authenticated');
