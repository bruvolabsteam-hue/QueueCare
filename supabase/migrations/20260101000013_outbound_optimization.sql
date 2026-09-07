-- Migration for Outbound Queue Optimization Feature

-- 1. Create enum for outbound status if it doesn't exist
DO $$ BEGIN
    CREATE TYPE outbound_status_type AS ENUM ('none', 'pending', 'calling', 'confirmed', 'cancelled', 'delayed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add outbound tracking columns to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS outbound_status outbound_status_type DEFAULT 'none',
ADD COLUMN IF NOT EXISTS outbound_called_at TIMESTAMPTZ;

-- 3. Update pending_messages to support whatsapp
DO $$ BEGIN
    -- Add whatsapp to event_type if we used an enum (currently it's a VARCHAR, so no enum update needed)
    -- Just adding a column for platform if necessary
    ALTER TABLE pending_messages ADD COLUMN IF NOT EXISTS platform VARCHAR DEFAULT 'sms';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
