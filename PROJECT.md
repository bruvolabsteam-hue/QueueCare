# Project: ElevenLabs Voice Agent Telephony, Database Schema & Clinic Dashboard Notification System

## Architecture
- **Voice Agent Webhook Backend**: FastAPI service (`piopiy-agent/fastapi_webhook.py`) deployed on Heroku (`https://bruvoflow-4dbecaaa15fd.herokuapp.com`). Exposes `/diagnose`, `/check_availability`, `/book_appointment`, `/cancel_appointment`, and `/transfer_to_doctor`.
- **Database & Cloud Storage**: Supabase Postgres instance (`https://oddvrnamlsenvftbnzic.supabase.co`). Provides relational tables (`clinics`, `staff`, `patients`, `queue_actions`, `doctor_daily_settings`), Row Level Security (RLS), and SECURITY DEFINER RPC functions.
- **Realtime Broadcast**: Supabase Realtime publication (`supabase_realtime`) broadcasting Postgres `INSERT` events on `queue_actions` to web dashboard clients.
- **Clinic Dashboard Frontend**: Next.js React application (`clinic-dashboard/app/dashboard/queue/page.js`) subscribed to live queue changes and displaying floating, self-dismissible Call Transfer alert toasts with active "Call Back" action buttons.
- **E2E Testing Harness**: Automated verification suite validating live Heroku and Supabase endpoints across functional, boundary, integration, and stress tiers.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | `queue_actions` Schema Integrity | Alter `action_type` to VARCHAR, add `doctor_id` UUID FK and `details` JSONB, make `token_number` nullable | M1 | ORIGINAL_REQUEST §R2 |
| 2 | SECURITY DEFINER Transfer RPCs | Deploy and verify `check_doctor_availability`, `get_doctor_phone`, `log_transfer_request`, and `get_latest_transfer_actions` with proper security search paths | M1 | ORIGINAL_REQUEST §R2 |
| 3 | Performance Indexes & Cancel RPC | Add composite indexes on `queue_actions`, `doctor_daily_settings`, `patients` and create `cancel_appointment` RPC for secure RLS bypass | M1 | Survey Findings |
| 4 | Indian Carrier Telephony Normalization | Strict normalization to 12-digit Indian routing `91XXXXXXXXXX` (no `+`, handling 10-digit, 11-digit with leading 0, 12-digit with 91, and stripping non-digits) | M2 | ORIGINAL_REQUEST §R1 |
| 5 | Sub-Second Webhook Latency | Programmatic wait time computation in Python, background notification tasks, and async event loop concurrency | M2 | ORIGINAL_REQUEST §R1 |
| 6 | Robust Webhook Endpoints | Optimize `/diagnose`, `/check_availability`, `/book_appointment`, `/cancel_appointment`, and `/transfer_to_doctor` with service role key support | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Real-Time Dashboard Subscription | Listen to `queue_actions` `INSERT` events filtered by `clinic_id` in `clinic-dashboard/app/dashboard/queue/page.js` | M3 | ORIGINAL_REQUEST §R3 |
| 8 | Floating Dismissible Alert Toast | Floating card at bottom-right showing caller phone, doctor name, timestamp, close button (`×`), and "Call Back" `<a href="tel:...">` button | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Defensive UI State Resilience | Fallback doctor resolution (`allDoctors`, `details.doctor_name`), safe JSON parsing, and prefix deduplication ("Dr. ") | M3 | Survey Findings |
| 10 | Automated Diagnostic Test Scripts | End-to-end Python / JS test suite verifying live Heroku endpoints (`https://bruvoflow-4dbecaaa15fd.herokuapp.com`) and Supabase state | M4 | ORIGINAL_REQUEST §R4 |
| 11 | Complete Tier 1-4 E2E Test Suite | Comprehensive opaque-box test suite covering feature, boundary, integration, and real-world application scenarios | M4 | ORIGINAL_REQUEST §R4 |
| 12 | 100% E2E Verification & Adversarial Hardening | Pass all test tiers and harden edge cases with adversarial tests | Final Milestone | Project Pattern |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema Integrity & RLS Bypass RPCs | `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql`, RPC search paths, indexes, `cancel_appointment` RPC | none | DONE |
| M2 | Webhook Optimization & Telephony Dialing Formats | `piopiy-agent/fastapi_webhook.py`, Indian carrier format normalization (`91XXXXXXXXXX`), async concurrency, sub-second latency, service role key support | M1 | PLANNED |
| M3 | Real-Time Dashboard Notification UI | `clinic-dashboard/app/dashboard/queue/page.js`, floating card with Call Back button, error-free dismiss, fallback doctor lookup | M1 | PLANNED |
| M4 | E2E Testing Suite & Diagnostic Harness | `tests/e2e/test_telephony_suite.py`, live Heroku & Supabase verification, test runner | M1, M2, M3 | PLANNED |
| Final | 100% E2E Pass & Adversarial Hardening | Execute full test suite against live systems, verify all acceptance criteria, adversarial stress-testing | M4 | PLANNED |

---

## Interface Contracts

### 1. Telephony Dialing Interface (`fastapi_webhook.py` ↔ TeleCMI / ElevenLabs)
- **Endpoint**: `POST /transfer_to_doctor`
- **Request Body**:
  ```json
  {
    "doctor_name": "Dr. Sarah",
    "phone_number": "9113526504",
    "call_id": "optional_string"
  }
  ```
- **Response Format** (`200 OK`):
  ```json
  {
    "doctor_phone": "919113526504",
    "message": "Transferring the call to the doctor now. Please hold on."
  }
  ```
- **Constraint**: `doctor_phone` MUST be exactly 12 digits starting with `91` and MUST NOT contain leading `+`. If unavailable, returns `doctor_phone: ""` with explanation message.

### 2. Database RPC Interface (`fastapi_webhook.py` ↔ Supabase Postgres)
- **`check_doctor_availability(p_clinic_id uuid) RETURNS jsonb`**:
  Returns `{"available": boolean, "message": string}`.
- **`get_doctor_phone(p_clinic_id uuid, p_doctor_name text) RETURNS text`**:
  Returns phone number string or `NULL`.
- **`log_transfer_request(p_clinic_id uuid, p_doctor_name text, p_caller_phone text) RETURNS uuid`**:
  Inserts into `queue_actions` with `action_type = 'transfer'` and `details = {"caller_phone": ..., "doctor_name": ..., "created_at": ...}`. Returns action UUID.
- **`get_latest_transfer_actions() RETURNS jsonb`**:
  Returns array of latest 5 transfer records.
- **`cancel_appointment(p_clinic_id uuid, p_phone text) RETURNS jsonb`**:
  Cancels active waiting appointment for given phone number with `SECURITY DEFINER` RLS bypass.

### 3. Real-Time Event Contract (Supabase Realtime ↔ `LiveQueuePage`)
- **Channel**: `queue_actions_changes`
- **Filter**: `clinic_id=eq.<CLINIC_ID>`
- **Event**: `INSERT` on `queue_actions`
- **Payload Schema**:
  ```json
  {
    "id": "uuid",
    "clinic_id": "uuid",
    "doctor_id": "uuid",
    "action_type": "transfer",
    "details": {
      "caller_phone": "9113526504",
      "doctor_name": "Dr. Sarah",
      "created_at": "2026-08-24T08:30:00Z"
    },
    "created_at": "2026-08-24T08:30:00Z"
  }
  ```

---

## Code Layout
- `piopiy-agent/fastapi_webhook.py`: FastApi telephony webhook backend
- `piopiy-agent/requirements.txt`: Python dependencies
- `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql`: Migration script for RPCs and `queue_actions`
- `clinic-dashboard/app/dashboard/queue/page.js`: Live Queue Next.js React client with Realtime subscription & Call Back card
- `tests/e2e/test_telephony_suite.py`: Automated Python verification suite
- `tests/e2e/test-suite.js`: JavaScript verification runner
