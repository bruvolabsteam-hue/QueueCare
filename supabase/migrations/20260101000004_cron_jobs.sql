-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Set up the net extension for HTTP requests if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Note: In Supabase, pg_cron is usually enabled by default, but calling http endpoints via pg_net is common.
-- However, invoking an Edge Function from pg_cron natively requires pg_net or using pg_cron to call a postgres function that uses pg_net.

CREATE OR REPLACE FUNCTION invoke_process_reminders()
RETURNS void AS $$
BEGIN
  -- Replace with your actual project URL and ANON KEY in production
  perform net.http_post(
      url:='http://kong:8000/functions/v1/processReminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.role', true) || '"}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION invoke_process_pending_messages()
RETURNS void AS $$
BEGIN
  perform net.http_post(
      url:='http://kong:8000/functions/v1/processPendingMessages',
      headers:='{"Content-Type": "application/json"}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION invoke_check_clinic_balances()
RETURNS void AS $$
BEGIN
  perform net.http_post(
      url:='http://kong:8000/functions/v1/checkClinicBalances',
      headers:='{"Content-Type": "application/json"}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule the cron jobs
-- processReminders every hour
SELECT cron.schedule('process-reminders-hourly', '0 * * * *', 'SELECT invoke_process_reminders()');

-- processPendingMessages every minute
SELECT cron.schedule('process-pending-messages-minutely', '* * * * *', 'SELECT invoke_process_pending_messages()');

-- checkClinicBalances daily at midnight
SELECT cron.schedule('check-clinic-balances-daily', '0 0 * * *', 'SELECT invoke_check_clinic_balances()');
