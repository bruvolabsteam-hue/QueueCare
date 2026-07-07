-- Create platform_settings for the Master Wallet
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_exotel_balance NUMERIC DEFAULT 0,
  master_whatsapp_balance NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a single row for platform settings
INSERT INTO platform_settings (master_exotel_balance, master_whatsapp_balance) 
VALUES (10000, 10000); -- Seed with 10k mock tokens

-- Update clinic_usage table to support Base + Overage model
ALTER TABLE clinic_usage 
  ADD COLUMN IF NOT EXISTS monthly_allocated_quota INTEGER DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS total_used_this_month INTEGER DEFAULT 0;

-- Drop the old balance column if it exists to avoid confusion, or keep it
-- ALTER TABLE clinic_usage DROP COLUMN IF EXISTS balance_remaining;

-- Setup RLS for platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can do all on platform_settings" ON platform_settings FOR ALL USING (get_user_role() = 'super_admin');
