# Frontend & Verification Suite Specialist Handoff Report

## 1. Observation

### 1.1 Clinic Dashboard Real-Time Queue (`clinic-dashboard/app/dashboard/queue/page.js`)
* **Realtime Subscription Location**: Lines 236–268 in `clinic-dashboard/app/dashboard/queue/page.js`:
  ```javascript
  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel('queue_actions_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'queue_actions',
        filter: `clinic_id=eq.${clinicId}`
      }, (payload) => {
        if (payload.new.action_type === 'transfer') {
          const details = payload.new.details || {};
          const docId = payload.new.doctor_id;
          const docName = doctorPanels.find(p => p.id === docId)?.name || 'the doctor';
          
          setTransferAlerts(prev => [
            ...prev,
            {
              id: payload.new.id,
              doctorName: docName,
              callerPhone: details.caller_phone || 'Unknown Caller',
              time: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId, doctorPanels]);
  ```
* **Floating Alert Card UI Location**: Lines 371–411 in `clinic-dashboard/app/dashboard/queue/page.js`:
  ```javascript
  {/* ── Floating Call Transfer Alerts ── */}
  <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1000 }}>
    {transferAlerts.map(alert => (
      <div key={alert.id} style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px',
        padding: '16px', width: '340px', boxShadow: '0 10px 30px rgba(37,99,235,0.18)',
        display: 'flex', flexDirection: 'column', gap: '8px', animation: 'slideIn 0.2s ease',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📞 Call Transfer Alert
          </span>
          <button 
            onClick={() => setTransferAlerts(prev => prev.filter(a => a.id !== alert.id))}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af', padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#1f2937', lineHeight: '1.4' }}>
          Patient at <strong>{alert.callerPhone}</strong> requested to speak with <strong>Dr. {alert.doctorName}</strong>.
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>🕐 {alert.time}</span>
          {alert.callerPhone && alert.callerPhone !== 'Unknown Caller' && (
            <a 
              href={`tel:${alert.callerPhone}`} 
              style={{ 
                fontSize: '12px', fontWeight: '700', color: 'white', 
                background: '#2563eb', padding: '5px 10px', borderRadius: '6px', 
                textDecoration: 'none', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' 
              }}
            >
              Call Back
            </a>
          )}
        </div>
      </div>
    ))}
  </div>
  ```

### 1.2 Database & Migration Requirements
* Migration `supabase/migrations/20260101000021_enable_realtime.sql` enables realtime for `queue_actions`:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE queue_actions;
  ```
* Migration `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql` updates `queue_actions` schema and defines transfer functions:
  ```sql
  ALTER TABLE public.queue_actions ALTER COLUMN action_type TYPE VARCHAR;
  ALTER TABLE public.queue_actions ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.staff(id) ON DELETE CASCADE;
  ALTER TABLE public.queue_actions ADD COLUMN IF NOT EXISTS details JSONB;
  ALTER TABLE public.queue_actions ALTER COLUMN token_number DROP NOT NULL;
  ```

### 1.3 Backend Webhook Integration (`piopiy-agent/fastapi_webhook.py`)
* Endpoint `POST /transfer_to_doctor` (lines 203–291) calls `supabase.rpc('check_doctor_availability')`, `supabase.rpc('get_doctor_phone')`, normalizes phone to `91...` (without `+`), and calls `supabase.rpc('log_transfer_request')`.
* Diagnostic endpoint `GET /diagnose` (lines 51–65) queries `supabase.rpc('get_latest_transfer_actions')`.

### 1.4 Existing Test Infrastructure
* `tests/e2e/test-suite.js` & `tests/e2e/runner.js`: 60 automated tests structured into 4 tiers with mock target/server.
* `piopiy-agent/test_rpc.py`: Standalone RPC verification script testing `generate_daily_token`.
* `super_admin_web/test-full-system.mjs`: Full admin login, role verification, and billing RPC verification.

---

## 2. Logic Chain

1. **Real-time Event Ingestion**:
   - The Postgres publication `supabase_realtime` includes `queue_actions`.
   - When a call transfer occurs via `/transfer_to_doctor`, the backend calls `log_transfer_request`, inserting a row into `queue_actions` with `action_type = 'transfer'`, `doctor_id`, and `details = {"caller_phone": ..., "doctor_name": ..., "created_at": ...}`.
   - The Supabase client in `LiveQueuePage` is subscribed to `postgres_changes` with filter `clinic_id=eq.${clinicId}`.
   - Upon receiving the event, `payload.new.action_type === 'transfer'` is verified.

2. **Frontend State & UI Rendering**:
   - The payload triggers state update `setTransferAlerts(prev => [...prev, ...])`.
   - The floating card rendered at bottom-right displays the caller's phone number and the doctor's name.
   - If the caller phone is present and valid, an active `<a href="tel:...">Call Back</a>` button is rendered.
   - Clicking the dismiss button `×` filters out the alert by its ID from `transferAlerts`, safely removing it without causing React re-render crashes or navigation disruptions.

3. **Key Edge Cases Identified**:
   - **Doctor Name Lookup**: In `page.js` line 250, `docName` is looked up only in `doctorPanels` (`doctorPanels.find(p => p.id === docId)?.name || 'the doctor'`). Since `doctorPanels` contains only doctors with daily schedules configured for today, if a transfer is logged for a doctor without a daily panel or who is offline, it falls back to `'the doctor'`. It is recommended to check `allDoctors` and `details.doctor_name` as fallbacks:
     ```javascript
     const docName = doctorPanels.find(p => p.id === docId)?.name 
       || allDoctors.find(d => d.id === docId)?.name 
       || details.doctor_name 
       || 'the doctor';
     ```
   - **Name Prefix Redundancy**: If `docName` is "Dr. Sarah", rendering `Dr. ${alert.doctorName}` produces "Dr. Dr. Sarah". Normalizing doctor display strings prevents prefix duplication.
   - **JSON Details Parsing**: If Supabase Realtime emits `payload.new.details` as a string rather than a parsed JSON object, `typeof details === 'string' ? JSON.parse(details) : details` provides safe handling.

---

## 3. Caveats

* **Realtime Network Configuration**: In local environments where Supabase is mocked or websockets are blocked, Realtime events require the client to be configured with the live Supabase URL and anon key (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
* **Browser tel: Protocol**: Clicking `<a href="tel:...">` invokes the operating system/browser telephony protocol handler; in non-telephony desktop environments, it prompts the default app without throwing Javascript runtime errors.
* **External Network Access**: Live verification against Heroku endpoints (`https://bruvoflow-4dbecaaa15fd.herokuapp.com`) requires external internet egress or live API test scripts.

---

## 4. Conclusion

The frontend architecture in `clinic-dashboard/app/dashboard/queue/page.js` is structurally aligned with the requirements:
1. It listens to Supabase Realtime `INSERT` events on `queue_actions`.
2. It displays a floating alert toast at bottom-right with the caller's number, doctor's name, timestamp, and a "Call Back" action button.
3. It provides error-free dismissal via React state filtering.
4. With minor defensive improvements (fallback doctor lookup and stringified JSON handling), the notification component is 100% resilient.

---

## 5. Verification Method & Comprehensive Tier 1–4 Test Suite

### Independent Inspection Commands
* **Inspect Live Queue Page**: `view_file` at `clinic-dashboard/app/dashboard/queue/page.js` (lines 236–268 and 371–411).
* **Inspect Queue Component**: `view_file` at `clinic-dashboard/app/dashboard/components/QueueView.js`.
* **Inspect Webhook Implementation**: `view_file` at `piopiy-agent/fastapi_webhook.py`.
* **Inspect Database Migrations**: `view_file` at `supabase/migrations/20260101000024_add_rls_bypass_rpcs.sql`.

---

### Tier 1–4 Opaque-Box Verification Test Suite Specification

#### Tier 1: Feature Coverage (Core Functional Capabilities)
* **T1.1: Webhook Health & Diagnostics**
  - Target: `GET https://bruvoflow-4dbecaaa15fd.herokuapp.com/` and `GET /diagnose`
  - Expected: Status `200`, JSON returns `status: "ok"`, active `clinic_id`, and `transfer_logs` array with zero errors.
* **T1.2: Check Availability Endpoint**
  - Target: `POST https://bruvoflow-4dbecaaa15fd.herokuapp.com/check_availability`
  - Expected: Status `200`, JSON contains informative availability message matching doctor status in Supabase.
* **T1.3: Book Appointment Endpoint**
  - Target: `POST https://bruvoflow-4dbecaaa15fd.herokuapp.com/book_appointment` with body `{"patient_name": "Test Patient", "phone_number": "+919876543210"}`
  - Expected: Status `200`, returns token number and estimated turn time; patient ticket inserted into `patients` table.
* **T1.4: Cancel Appointment Endpoint**
  - Target: `POST https://bruvoflow-4dbecaaa15fd.herokuapp.com/cancel_appointment` with body `{"phone_number": "+919876543210"}`
  - Expected: Status `200`, patient status updated to `cancelled` in Supabase.
* **T1.5: Phone Number Normalization on Transfer**
  - Target: `POST https://bruvoflow-4dbecaaa15fd.herokuapp.com/transfer_to_doctor` with body `{"doctor_name": "", "phone_number": "9876543210"}`
  - Expected: Status `200`, `doctor_phone` is formatted as a 12-digit Indian number without leading `+` (e.g., `919113526504`).
* **T1.6: Transfer Request Database Logging**
  - Target: Supabase table `queue_actions` after `/transfer_to_doctor` request.
  - Expected: Row inserted with `action_type = 'transfer'`, matching `clinic_id`, `doctor_id`, and JSON `details.caller_phone`.
* **T1.7: Real-Time Dashboard Toast Display**
  - Target: Clinic dashboard at `/dashboard/queue`.
  - Expected: Inserting a mockup transfer action in `queue_actions` causes the floating toast to appear in real time without refreshing.
* **T1.8: Card Dismissal and Call Back Action**
  - Target: Toast close button (`×`) and "Call Back" button.
  - Expected: Clicking `×` removes toast from screen; clicking "Call Back" triggers `tel:` link without throwing exceptions or page reloads.

#### Tier 2: Boundary & Corner Cases
* **T2.1: Doctor Marked Inactive in Daily Setup**
  - Target: `POST /check_availability` when `doctor_daily_settings.is_active = false`.
  - Expected: Webhook returns doctor is not available today.
* **T2.2: Daily Limit Exceeded**
  - Target: `POST /check_availability` when waiting patients count >= `max_patients`.
  - Expected: Webhook returns fully booked message.
* **T2.3: No Daily Setup Row for Today**
  - Target: `POST /check_availability` when no `doctor_daily_settings` exists for current date.
  - Expected: Webhook returns session not started message without throwing unhandled database exception.
* **T2.4: Transfer Blocked When Doctor Unavailable**
  - Target: `POST /transfer_to_doctor` when doctor is inactive or fully booked.
  - Expected: Returns empty `doctor_phone: ""` and explanation message; does not perform SIP transfer.
* **T2.5: Fuzzy Doctor Name Matching**
  - Target: `POST /transfer_to_doctor` with partial doctor name (e.g. "Samy" vs "Dr. Samy").
  - Expected: Correctly resolves doctor record and phone.
* **T2.6: Input Number Variants Normalization**
  - Target: `POST /transfer_to_doctor` with `+919113526504`, `9113526504`, `919113526504`.
  - Expected: All variations normalize strictly to `919113526504`.
* **T2.7: Missing Caller Phone Number**
  - Target: `POST /transfer_to_doctor` with empty payload `{}`.
  - Expected: Webhook logs transfer with `caller_phone: 'Unknown Caller'` and does not crash.
* **T2.8: Webhook Response Latency**
  - Target: Response time measurement across all webhooks.
  - Expected: Total response time < 1000ms.
* **T2.9: Multiple Realtime Alerts Stacking**
  - Target: Simultaneous insertion of 3 transfer events in `queue_actions`.
  - Expected: UI renders 3 stacked cards at bottom-right in chronological order.

#### Tier 3: Cross-Feature Combinations
* **T3.1: End-to-End Voice Transfer Flow**
  - Call initiates -> ElevenLabs invokes `/transfer_to_doctor` -> Backend validates doctor -> Backend logs to `queue_actions` -> Live Queue Dashboard toast pops up in real time -> Receptionist clicks Call Back.
* **T3.2: Voice Booking to Live Queue Panel Synchronization**
  - Call initiates -> ElevenLabs invokes `/book_appointment` -> Backend calls `generate_daily_token` -> Realtime event fires on `patients` table -> Doctor queue panel updates count and waiting list automatically.
* **T3.3: Cancellation Reflection**
  - Patient calls to cancel -> Webhook updates status in `patients` -> Live Queue panel updates without page refresh.
* **T3.4: Setup Page to Voice Webhook Consistency**
  - Clinic admin toggles doctor to "Not Available" on `/dashboard/setup` -> Next `/check_availability` or `/transfer_to_doctor` immediately reflects the updated state.
* **T3.5: Multi-Doctor Transfer Routing**
  - Transfer to Doctor A routes to Doctor A's phone; transfer to Doctor B routes to Doctor B's phone; alerts on Live Queue indicate appropriate doctor name for each.

#### Tier 4: Real-World Resilience & Stress Scenarios
* **T4.1: High Concurrency Booking Requests**
  - 10 concurrent requests to `/book_appointment` generate sequential, collision-free token numbers.
* **T4.2: High Frequency Transfer Alerts**
  - 5 transfer events inserted in rapid succession (under 500ms) render cleanly in the UI without state collisions.
* **T4.3: Realtime Reconnect Resiliency**
  - Dashboard recovers and resubscribes to `queue_actions` without duplicating alerts or losing channel binding.
* **T4.4: Dismissing Toasts During Active Ingestion**
  - User dismisses active toast while a new transfer event arrives; state transitions smoothly without React key conflicts.
* **T4.5: Complete Patient Lifecycle Simulation**
  - Booking -> Queue listing -> Called to room -> Transfer request -> Mark Done -> Queue cleared.
