# Project: QueueCare Login Issue Fix

## Architecture
- **Auth Provider**: Supabase auth or local auth setup used by Next.js applications (`super_admin_web` and `clinic-dashboard`).
- **Flow**: Next.js client-side login requests, route handlers / callback routes handling authentication sessions and token management.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Diagnosis | Explore codebase, identify login flow and pinpoint root cause of failure. | None | IN_PROGRESS |
| M2 | Fix Implementation | Apply changes to fix login issues in super_admin_web and/or clinic-dashboard. | M1 | PLANNED |
| M3 | Verification & Auditing | Run automated or manual tests and perform forensic integrity audit. | M2 | PLANNED |

## Interface Contracts
- To be refined during the diagnosis milestone.
