-- Add 'no_show' to token_status ENUM
ALTER TYPE token_status ADD VALUE 'no_show';

-- Add new columns to patients table
ALTER TABLE patients
ADD COLUMN scheduled_for TIMESTAMPTZ,
ADD COLUMN reminder_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN reminder_morning_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN is_no_show BOOLEAN DEFAULT FALSE;
