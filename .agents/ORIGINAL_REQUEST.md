# Original User Request

## Initial Request — 2026-08-24T08:26:46Z

Fix, optimize, and verify the ElevenLabs voice agent webhook backend, database schema, and clinic dashboard notifications. Ensure the entire patient booking, doctor availability checks, phone call transfer, and dashboard callback alert features work flawlessly and are thoroughly tested.

Working directory: `C:\Users\HOME\OneDrive\Attachments\ai agent`
Integrity mode: development

## Requirements

### R1. Webhook Optimization & Telephony Dialing Formats
- Verify and optimize `/check_availability`, `/book_appointment`, `/cancel_appointment`, and `/transfer_to_doctor` webhooks in `piopiy-agent/fastapi_webhook.py`.
- Ensure doctor phone numbers are normalized specifically for Indian carrier routing (starts with `91` without any leading `+` symbol, e.g., `919113526504`) to prevent TeleCMI routing failure.
- Webhooks must execute database queries in parallel or programmatically compute variables (e.g., token-based estimated wait times) to ensure response times are under 1 second.

### R2. Database Schema Integrity & RLS Bypass RPCs
- Alter and fix `queue_actions` table so it has correct `doctor_id` (UUID references staff) and `details` (JSONB) columns, and make `action_type` VARCHAR compatible.
- Ensure the SECURITY DEFINER functions `check_doctor_availability`, `get_doctor_phone`, `log_transfer_request`, and `get_latest_transfer_actions` in `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` are correct and fully deployed to the Supabase cloud instance.

### R3. Real-Time Dashboard Notification UI
- Ensure the `Live Queue` dashboard (`clinic-dashboard/app/dashboard/queue/page.js`) correctly subscribes to `queue_actions` insert events in real time.
- Display a floating, self-dismissible card at the bottom-right of the screen for incoming call transfer requests containing the caller's number and a "Call Back" button.

### R4. Automated Testing & Verification Suite
- Create automated diagnostic test scripts to execute and verify every endpoint against the live Heroku server (`https://bruvoflow-4dbecaaa15fd.herokuapp.com`).
- Verify that every status check, booking event, and transfer log is successfully recorded in the Supabase database.

## Acceptance Criteria

### Technical & Telephony Verification
- [ ] Direct HTTP GET requests to `/diagnose` return status `200` with correct versions and zero database errors.
- [ ] Direct HTTP POST requests to `/transfer_to_doctor` return the exact 12-digit number (e.g., `919113526504` without `+`) and successfully create a log entry in the `queue_actions` table.
- [ ] Automated booking checks create a patient ticket in Supabase and return the token details within 1 second.

### Dashboard Notification Verification
- [ ] Inserting a mockup transfer action in the `queue_actions` table causes the alert toast to appear on the clinic dashboard live page in real time.
- [ ] Closing the alert toast or clicking "Call Back" functions correctly without crashing the page.
