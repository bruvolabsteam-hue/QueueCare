-- RPC to increment clinic usage and decrement master wallet safely
CREATE OR REPLACE FUNCTION increment_usage_and_deduct_master(p_clinic_id uuid, p_service text)
RETURNS void AS $$
BEGIN
  IF p_service = 'whatsapp' THEN
    -- Decrement Master Wallet
    UPDATE platform_settings SET master_whatsapp_balance = master_whatsapp_balance - 1;
    -- Increment Clinic Usage
    UPDATE clinic_usage SET total_used_this_month = total_used_this_month + 1, total_messages_sent = total_messages_sent + 1 WHERE clinic_id = p_clinic_id AND service = 'whatsapp';
  ELSIF p_service = 'exotel' THEN
    -- Decrement Master Wallet
    UPDATE platform_settings SET master_exotel_balance = master_exotel_balance - 1;
    -- Increment Clinic Usage
    UPDATE clinic_usage SET total_used_this_month = total_used_this_month + 1, total_calls_made = total_calls_made + 1 WHERE clinic_id = p_clinic_id AND service = 'exotel';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
