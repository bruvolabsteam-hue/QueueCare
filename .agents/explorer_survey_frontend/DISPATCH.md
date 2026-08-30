## 2026-08-24T08:34:52Z

Investigate the frontend dashboard and verification suite:
1. Inspect `clinic-dashboard/app/dashboard/queue/page.js` and surrounding React/Next.js files in `clinic-dashboard/`.
2. Inspect real-time Supabase subscriptions to `queue_actions` insert events.
3. Check UI requirements for the floating self-dismissible card at bottom-right for incoming call transfers (caller's number, "Call Back" button, dismissible without crashing).
4. Inspect existing test scripts, diagnostic tools, and verify what test harnesses exist to verify against Heroku (`https://bruvoflow-4dbecaaa15fd.herokuapp.com`) and live Supabase.
5. Outline test cases needed for Tier 1-4 opaque-box verification.
