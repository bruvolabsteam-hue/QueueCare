-- Create custom types
CREATE TYPE registration_method AS ENUM ('walk-in', 'kiosk', 'ivr');
CREATE TYPE token_status AS ENUM ('waiting', 'called', 'skipped', 'done');
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE service_type AS ENUM ('whatsapp', 'exotel');
CREATE TYPE user_role AS ENUM ('super_admin', 'clinic_admin', 'receptionist', 'doctor');
CREATE TYPE plan_tier AS ENUM ('basic', 'pro', 'hospital');

-- Table: clinics
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email VARCHAR NOT NULL,
  clinic_name VARCHAR NOT NULL,
  clinic_slug VARCHAR UNIQUE NOT NULL,
  clinic_logo_url VARCHAR,
  brand_color VARCHAR,
  tagline VARCHAR,
  welcome_message TEXT,
  whatsapp_signature TEXT,
  announcement_intro TEXT,
  show_powered_by BOOLEAN DEFAULT TRUE,
  plan plan_tier DEFAULT 'basic',
  avg_time_per_patient_mins INTEGER DEFAULT 10,
  alert_ahead_count INTEGER DEFAULT 3,
  auto_skip_mins INTEGER DEFAULT 5,
  default_language VARCHAR DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: clinic_api_keys
CREATE TABLE clinic_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  service service_type NOT NULL,
  primary_key VARCHAR,
  backup_key VARCHAR,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, service)
);

-- Table: staff
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Ideally references auth.users(id)
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  phone VARCHAR NOT NULL,
  token_number INTEGER NOT NULL,
  language VARCHAR DEFAULT 'en',
  status token_status DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  called_at TIMESTAMPTZ,
  done_at TIMESTAMPTZ,
  re_entry_count INTEGER DEFAULT 0,
  alert_3_sent BOOLEAN DEFAULT FALSE,
  alert_1_sent BOOLEAN DEFAULT FALSE,
  skip_status VARCHAR,
  registration_method registration_method
);

-- Table: queue_sessions
CREATE TABLE queue_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_token INTEGER DEFAULT 0,
  is_paused BOOLEAN DEFAULT FALSE,
  pause_reason TEXT,
  rolling_avg_mins NUMERIC,
  UNIQUE(clinic_id, date)
);

-- Table: token_timing
CREATE TABLE token_timing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  token_number INTEGER NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_mins NUMERIC
);

-- Table: pending_messages
CREATE TABLE pending_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  patient_phone VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  message_content TEXT NOT NULL,
  status message_status DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Table: clinic_usage
CREATE TABLE clinic_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  service service_type NOT NULL,
  balance_remaining NUMERIC,
  total_calls_made INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  estimated_days_remaining NUMERIC,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, service)
);

-- Table: low_balance_alerts
CREATE TABLE low_balance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  service service_type NOT NULL,
  balance_at_alert NUMERIC NOT NULL,
  alert_sent_to_clinic BOOLEAN DEFAULT FALSE,
  alert_sent_to_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE
);

-- Table: api_failures
CREATE TABLE api_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  service service_type NOT NULL,
  key_used VARCHAR NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES --
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_timing ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_balance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_failures ENABLE ROW LEVEL SECURITY;
