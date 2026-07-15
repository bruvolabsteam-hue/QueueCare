# Plan: TeleCMI Migration and Branding Updates

This document outlines the planning for migrating BruvoFlow's budget AI infrastructure from Exotel/WhatsApp to TeleCMI, updating login branding to "BruvoLabs", and simplifying AI settings to "Brain" (running on Groq).

## Architecture changes
1. **Branding**: Update login screens in `super_admin_web` and `clinic-dashboard` to display "BruvoLabs" branding instead of "OmniCare".
2. **AI Settings**: Rename the settings UI inputs to "Brain Settings". The backend will use Groq API (using a configurable `brain_url`, `brain_api_key`, and `brain_model`).
3. **TeleCMI Integration**: Remove Exotel/WhatsApp routes. Replace them with TeleCMI webhooks for Voice/Messaging and integrate TeleCMI client in the backend.
4. **Database Schema**: Modify `global_settings`, `clinics`, and `platform_settings` tables to remove old Exotel and WhatsApp columns and add TeleCMI and Brain columns.

## Milestones

| # | Milestone Name | Scope | Dependencies | Status |
|---|----------------|-------|--------------|--------|
| M1 | Database Schema Update | Drop `exotel_*` and `whatsapp_*` columns. Add `telecmi_app_id`, `telecmi_secret_key` and `telecmi_caller_id` fields. Add `brain_url`, `brain_model`, and `brain_api_key`. Add unified `master_telecmi_balance` and update billing RPCs. | None | DONE |
| M2 | Branding Updates | Update login screen text and titles in both `super_admin_web` and `clinic-dashboard` to "BruvoLabs". | None | DONE |
| M3 | UI Settings Simplification | Update Settings page in `super_admin_web` to expose "Brain" & "TeleCMI" credentials. Update Settings page in `clinic-dashboard` to show TeleCMI fields. | M1 | DONE |
| M4 | TeleCMI & Brain Code Migration | Replace Ollama client with Groq client in `super_admin_web`. Replace Exotel/WhatsApp webhooks and lib files with TeleCMI Voice/Messaging routes. Update Deno processPendingMessages function. | M1, M3 | IN_PROGRESS |
| M5 | Test Suite Migration & Verification | Update E2E test runner, mock-server, mock-target, and test suite to use TeleCMI endpoints. Ensure token generation and queue system tests are fully functional. | M4 | PLANNED |
| M6 | Deployment & Linking | Verify configuration and connectivity to BruvoLabs GitHub repository and BruvoLabs Supabase cloud account. | M5 | PLANNED |

## Detailed Action Steps

### Milestone 1: Schema Updates
(Completed)

### Milestone 2: Branding Updates
(Completed)

### Milestone 3: UI Settings
(Completed)

### Milestone 4: TeleCMI & Brain Migration
(In Progress)

### Milestone 5: E2E Verification
1. Update `tests/e2e/mock-server.js` to mock TeleCMI APIs instead of Exotel/WhatsApp.
2. Update `tests/e2e/mock-target.js` to simulate TeleCMI voice/message endpoints.
3. Update `tests/e2e/test-suite.js` to test TeleCMI credentials, voice/message pipelines, and the token/queue lifecycle.
4. Run tests and verify success.

### Milestone 6: Deployment & Linking
1. Use GitHub tools to verify project is correctly connected to the BruvoLabs repository.
2. Use Supabase tools to inspect organizations and project status for BruvoLabs.
3. Verify that environment variables or configurations are correctly linked to the live repository and Supabase settings.
