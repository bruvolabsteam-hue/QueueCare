# E2E Test Infra: Voice Agent Telephony & Clinic Notification System

## Test Philosophy
- **Opaque-box, Requirement-driven**: Tests derive directly from `ORIGINAL_REQUEST.md` and user specifications, evaluating external HTTP/REST, telephony JSON contracts, Supabase database state, and Realtime event broadcast mechanics.
- **Methodology**: 4-Tier verification hierarchy (Category-Partition, Boundary Value Analysis, Pairwise Combinatorial Testing, and Real-World Workload Testing) followed by adversarial coverage hardening.

---

## Feature Inventory & Test Coverage Matrix
| # | Feature | Requirement Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------|-------------------|:-----------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | Webhook Diagnostics (`/diagnose`) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 2 | Doctor Availability (`/check_availability`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Appointment Booking (`/book_appointment`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | Appointment Cancellation (`/cancel_appointment`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | Indian Carrier Telephony Normalization (`91XXXXXXXXXX`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 6 | Call Transfer Request (`/transfer_to_doctor`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 7 | `queue_actions` Schema & Transfer Logging | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 8 | SECURITY DEFINER RPCs | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 9 | Real-Time Dashboard Subscription & Floating Alert Toast | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 10 | Call Back Button & Error-Free Dismissal | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |

---

## Coverage Thresholds
- **Total inventoried features (N)**: 10
- **Tier 1 (Feature Coverage)**: ≥ 5 × 10 = 50 test cases
- **Tier 2 (Boundary & Extreme Cases)**: ≥ 5 × 10 = 50 test cases
- **Tier 3 (Cross-Feature Combinations)**: ≥ 10 pairwise test cases
- **Tier 4 (Real-World Workloads)**: ≥ max(5, 10 ÷ 2) = 5 scenarios
- **Total Minimum Target**: ≥ 115 test cases across automated harnesses (`tests/e2e/test_telephony_suite.py` and `tests/e2e/runner.js`)

---

## Test Architecture
- **Target Live Backend**: `https://bruvoflow-4dbecaaa15fd.herokuapp.com`
- **Target Database**: `https://oddvrnamlsenvftbnzic.supabase.co`
- **Frontend Target**: `clinic-dashboard/app/dashboard/queue/page.js`
- **Test Runners**:
  - Python E2E Test Suite: `tests/e2e/test_telephony_suite.py` (executes via `python -m pytest` or `python tests/e2e/test_telephony_suite.py`)
  - Node.js E2E Test Suite: `node tests/e2e/runner.js`
- **Pass/Fail Semantics**: All tests must return exit code `0` with 0 failures, 0 database errors, and strict latency < 1.0s on all booking/transfer transactions.
