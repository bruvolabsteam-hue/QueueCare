# Handoff Report: Database Schema Migration for TeleCMI & Brain Integration

This report provides the analysis and proposed SQL migration to remove Exotel and WhatsApp from the database schema and replace them with TeleCMI and the Groq "Brain" configurations.

---

## 1. Observation

A scan of the database migrations in the `supabase/migrations/` directory revealed the following references to `exotel` or `whatsapp`:

### A. Table: `public.global_settings`
Defined in `supabase/migrations/20260101000018_create_global_settings.sql` (lines 7–11):
```sql
  exotel_account_sid TEXT,
  exotel_api_key TEXT,
  exotel_api_token TEXT,
  whatsapp_api_key TEXT,
  support_whatsapp_number VARCHAR,
```

### B. Table: `public.clinics`
- Defined in `supabase/migrations/20260101000000_initial_schema.sql` (line 19):
  ```sql
  whatsapp_signature TEXT,
  ```
- Altered in `supabase/migrations/20260101000015_clinic_settings.sql` (lines 3–4):
  ```sql
  ADD COLUMN IF NOT EXISTS whatsapp_sender_number VARCHAR,
  ADD COLUMN IF NOT EXISTS exotel_caller_id VARCHAR,
  ```

### C. Table: `public.platform_settings`
Defined in `supabase/migrations/20260101000008_billing_pivot.sql` (lines 4–5):
```sql
  master_exotel_balance NUMERIC DEFAULT 0,
  master_whatsapp_balance NUMERIC DEFAULT 0,
```
And seeded in line 10:
```sql
INSERT INTO platform_settings (master_exotel_balance, master_whatsapp_balance) 
VALUES (10000, 10000);
```

### D. Table: `public.staff`
Altered in `supabase/migrations/20260101000015_clinic_settings.sql` (line 9):
```sql
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR,
```

### E. Table: `public.daily_summaries`
Defined in `supabase/migrations/20260101000014_flexible_queues.sql` (line 49):
```sql
whatsapp_sent_count INTEGER DEFAULT 0,
```

### F. Custom Type: `public.service_type`
Defined in `supabase/migrations/20260101000000_initial_schema.sql` (line 5):
```sql
CREATE TYPE service_type AS ENUM ('whatsapp', 'exotel');
```
It is used in:
- `clinic_api_keys.service`
- `clinic_usage.service`
- `low_balance_alerts.service`
- `api_failures.service`

### G. Database RPC: `increment_usage_and_deduct_master`
Defined in `supabase/migrations/20260101000009_billing_rpc.sql`:
```sql
CREATE OR REPLACE FUNCTION increment_usage_and_deduct_master(p_clinic_id uuid, p_service text)
RETURNS void AS $$
BEGIN
  IF p_service = 'whatsapp' THEN
    UPDATE platform_settings SET master_whatsapp_balance = master_whatsapp_balance - 1;
    UPDATE clinic_usage SET total_used_this_month = total_used_this_month + 1, total_messages_sent = total_messages_sent + 1 WHERE clinic_id = p_clinic_id AND service = 'whatsapp';
  ELSIF p_service = 'exotel' THEN
    UPDATE platform_settings SET master_exotel_balance = master_exotel_balance - 1;
    UPDATE clinic_usage SET total_used_this_month = total_used_this_month + 1, total_calls_made = total_calls_made + 1 WHERE clinic_id = p_clinic_id AND service = 'exotel';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### H. Database RPC: `check_and_alert_master_wallet`
Defined in `supabase/migrations/20260101000017_master_wallet_alerts.sql` (lines 8–56):
References `master_whatsapp_balance` and `master_exotel_balance` to check if settings are below the threshold, and sends notifications.

---

## 2. Logic Chain

1. **Remove Old Configurations**: To clean up the system, all columns referencing the legacy services (`exotel_*`, `whatsapp_*`, `support_whatsapp_number`) must be dropped from `global_settings`, `clinics`, `platform_settings`, `staff`, and `daily_summaries`.
2. **Add New Configuration Columns**:
   - `global_settings` table needs: `telecmi_app_id` (text), `telecmi_secret_key` (text), `brain_url` (text), `brain_model` (text), and `brain_api_key` (text).
   - `clinics` table needs: `telecmi_caller_id` (varchar).
   - `platform_settings` table needs: `master_telecmi_balance` (numeric).
   - `daily_summaries` table needs a corresponding notification count: `telecmi_sent_count` (integer).
3. **Refactor the `service_type` Enum**: Since PostgreSQL does not support dropping values from an enum, migrating to TeleCMI requires dropping the existing constraints, converting the service columns to `TEXT`, dropping the enum, creating a new enum `('telecmi_voice', 'telecmi_sms')`, casting the columns back, and re-applying the UNIQUE constraints.
4. **Update Billing RPCs**:
   - `increment_usage_and_deduct_master` must decrement `master_telecmi_balance` and safely UPSERT the clinic's usage count for either `telecmi_voice` or `telecmi_sms`.
   - `check_and_alert_master_wallet` must check `master_telecmi_balance` against the threshold and generate a single unified critical alert.

---

## 3. Caveats

- **Existing Balances**: In the proposed migration, `master_telecmi_balance` is populated by summing the old `master_exotel_balance` and `master_whatsapp_balance` values to avoid losing existing wallet credits. If this is not desired, the balance can be initialized to a hardcoded seed value instead.
- **Pending Messages Inconsistency**: A major inconsistency was discovered in the codebase migrations:
  - `20260101000012_multi_doctor.sql` (line 62) and `20260101000017_master_wallet_alerts.sql` (line 36) insert into the `pending_messages` table using columns `phone` and `message_body`.
  - However, `20260101000000_initial_schema.sql` defines the columns on `pending_messages` as `patient_phone` and `message_content`.
  - The proposed rewrite of `check_and_alert_master_wallet` corrects this by using the correct schema columns (`patient_phone` and `message_content`). The implementer should verify other places in the codebase for potential syntax errors due to these column name discrepancies.

---

## 4. Conclusion: Proposed Schema Update SQL

The following SQL statement should be executed as a new database migration file (e.g., `supabase/migrations/20260715000000_migrate_telecmi.sql`):

```sql
-- 1. Drop dependent unique constraints
ALTER TABLE public.clinic_api_keys DROP CONSTRAINT IF EXISTS clinic_api_keys_clinic_id_service_key;
ALTER TABLE public.clinic_usage DROP CONSTRAINT IF EXISTS clinic_usage_clinic_id_service_key;

-- 2. Convert service columns temporarily to TEXT
ALTER TABLE public.clinic_api_keys ALTER COLUMN service TYPE TEXT;
ALTER TABLE public.clinic_usage ALTER COLUMN service TYPE TEXT;
ALTER TABLE public.low_balance_alerts ALTER COLUMN service TYPE TEXT;
ALTER TABLE public.api_failures ALTER COLUMN service TYPE TEXT;

-- 3. Drop the old enum type
DROP TYPE IF EXISTS public.service_type;

-- 4. Create the new enum type
CREATE TYPE public.service_type AS ENUM ('telecmi_voice', 'telecmi_sms');

-- 5. Map old service logs to new services
UPDATE public.clinic_api_keys SET service = CASE 
  WHEN service = 'exotel' THEN 'telecmi_voice'
  ELSE 'telecmi_sms'
END;

UPDATE public.clinic_usage SET service = CASE 
  WHEN service = 'exotel' THEN 'telecmi_voice'
  ELSE 'telecmi_sms'
END;

UPDATE public.low_balance_alerts SET service = CASE 
  WHEN service = 'exotel' THEN 'telecmi_voice'
  ELSE 'telecmi_sms'
END;

UPDATE public.api_failures SET service = CASE 
  WHEN service = 'exotel' THEN 'telecmi_voice'
  ELSE 'telecmi_sms'
END;

-- 6. Cast columns back to new service_type enum
ALTER TABLE public.clinic_api_keys ALTER COLUMN service TYPE public.service_type USING service::public.service_type;
ALTER TABLE public.clinic_usage ALTER COLUMN service TYPE public.service_type USING service::public.service_type;
ALTER TABLE public.low_balance_alerts ALTER COLUMN service TYPE public.service_type USING service::public.service_type;
ALTER TABLE public.api_failures ALTER COLUMN service TYPE public.service_type USING service::public.service_type;

-- 7. Re-add unique constraints
ALTER TABLE public.clinic_api_keys ADD CONSTRAINT clinic_api_keys_clinic_id_service_key UNIQUE (clinic_id, service);
ALTER TABLE public.clinic_usage ADD CONSTRAINT clinic_usage_clinic_id_service_key UNIQUE (clinic_id, service);

-- 8. Alter public.global_settings table
ALTER TABLE public.global_settings
  DROP COLUMN IF EXISTS exotel_account_sid,
  DROP COLUMN IF EXISTS exotel_api_key,
  DROP COLUMN IF EXISTS exotel_api_token,
  DROP COLUMN IF EXISTS whatsapp_api_key,
  DROP COLUMN IF EXISTS support_whatsapp_number;

ALTER TABLE public.global_settings
  ADD COLUMN telecmi_app_id TEXT,
  ADD COLUMN telecmi_secret_key TEXT,
  ADD COLUMN brain_url TEXT DEFAULT 'https://api.groq.com/openai/v1',
  ADD COLUMN brain_model TEXT DEFAULT 'llama-3.1-8b-instant',
  ADD COLUMN brain_api_key TEXT;

-- 9. Alter public.clinics table
ALTER TABLE public.clinics
  DROP COLUMN IF EXISTS exotel_caller_id,
  DROP COLUMN IF EXISTS whatsapp_sender_number,
  DROP COLUMN IF EXISTS whatsapp_signature;

ALTER TABLE public.clinics
  ADD COLUMN telecmi_caller_id VARCHAR;

-- 10. Alter public.platform_settings table (Migrate balance credits)
ALTER TABLE public.platform_settings 
  ADD COLUMN master_telecmi_balance NUMERIC DEFAULT 0;

UPDATE public.platform_settings 
SET master_telecmi_balance = COALESCE(master_exotel_balance, 0) + COALESCE(master_whatsapp_balance, 0);

ALTER TABLE public.platform_settings 
  DROP COLUMN IF EXISTS master_exotel_balance,
  DROP COLUMN IF EXISTS master_whatsapp_balance;

-- 11. Alter public.staff table
ALTER TABLE public.staff
  DROP COLUMN IF EXISTS whatsapp_number;

-- 12. Alter public.daily_summaries table
ALTER TABLE public.daily_summaries
  DROP COLUMN IF EXISTS whatsapp_sent_count,
  ADD COLUMN telecmi_sent_count INTEGER DEFAULT 0;

-- 13. Recreate public.increment_usage_and_deduct_master RPC
CREATE OR REPLACE FUNCTION public.increment_usage_and_deduct_master(
  p_clinic_id UUID, 
  p_service TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Decrement the unified Master Wallet (TeleCMI balance)
  UPDATE public.platform_settings 
  SET master_telecmi_balance = master_telecmi_balance - 1;

  -- Increment the clinic's usage count based on service type
  IF p_service = 'telecmi_voice' OR p_service = 'voice' THEN
    INSERT INTO public.clinic_usage (clinic_id, service, total_used_this_month, total_calls_made)
    VALUES (p_clinic_id, 'telecmi_voice'::public.service_type, 1, 1)
    ON CONFLICT (clinic_id, service) DO UPDATE
    SET total_used_this_month = clinic_usage.total_used_this_month + 1,
        total_calls_made = clinic_usage.total_calls_made + 1;
  ELSIF p_service = 'telecmi_sms' OR p_service = 'messaging' THEN
    INSERT INTO public.clinic_usage (clinic_id, service, total_used_this_month, total_messages_sent)
    VALUES (p_clinic_id, 'telecmi_sms'::public.service_type, 1, 1)
    ON CONFLICT (clinic_id, service) DO UPDATE
    SET total_used_this_month = clinic_usage.total_used_this_month + 1,
        total_messages_sent = clinic_usage.total_messages_sent + 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Recreate public.check_and_alert_master_wallet RPC
CREATE OR REPLACE FUNCTION public.check_and_alert_master_wallet()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  settings RECORD;
  alert_msg text;
BEGIN
  -- Get the master settings
  SELECT * INTO settings FROM public.platform_settings LIMIT 1;
  
  IF settings IS NULL OR settings.super_admin_phone IS NULL THEN
    RETURN; -- No phone configured, can't send alert
  END IF;

  -- Check TeleCMI Balance
  IF settings.master_telecmi_balance < settings.alert_threshold THEN
    alert_msg := '⚠️ OMNICARE CRITICAL ALERT: Your TeleCMI Master Wallet balance has dropped to ' || settings.master_telecmi_balance || ' credits. Please refill immediately to prevent voice and messaging service disruption across all clinics.';
    
    -- Check if we already have a pending message for this exact issue to avoid spam
    IF NOT EXISTS (
      SELECT 1 FROM public.pending_messages 
      WHERE patient_phone = settings.super_admin_phone 
      AND message_content = alert_msg 
      AND status = 'pending'
    ) THEN
      INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
      VALUES (NULL, settings.super_admin_phone, 'system_alert', alert_msg, 'pending');
    END IF;
  END IF;
END;
$$;
```

---

## 5. Verification Method

To independently verify the migration script:

1. **Local Migration Dry Run**: Run a local Supabase db reset or execute the migration SQL on a test postgres database:
   ```bash
   supabase db reset
   ```
2. **Schema Verification**: Query the table definitions in psql to confirm the new columns exist and old ones are gone:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'global_settings';
   ```
   *Expected columns*: `telecmi_app_id`, `telecmi_secret_key`, `brain_url`, `brain_model`, `brain_api_key`.
3. **RPC Billing Verification**: Execute a test call to the RPC:
   ```sql
   -- Seed platform settings with a balance
   UPDATE platform_settings SET master_telecmi_balance = 100;
   
   -- Trigger voice decrement
   SELECT increment_usage_and_deduct_master('SOME_CLINIC_UUID', 'telecmi_voice');
   
   -- Verify decrement
   SELECT master_telecmi_balance FROM platform_settings; -- Should equal 99
   ```
