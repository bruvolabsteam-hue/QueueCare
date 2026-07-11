## 2026-07-10T18:15:17Z

You are the worker for Milestone 1: Database Migration & Schema Alignment.
Your working directory is C:\Users\HOME\OneDrive\Attachments\ai agent\.agents\worker_m1.
Your task is to:
1. Create a database migration file `20260101000018_create_global_settings.sql` in `supabase/migrations/` defining the `global_settings` table.
   The table schema must include:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `ollama_url` TEXT DEFAULT 'http://127.0.0.1:11434'
   - `elevenlabs_api_key` TEXT
   - `exotel_account_sid` TEXT
   - `exotel_api_key` TEXT
   - `exotel_api_token` TEXT
   - `whatsapp_api_key` TEXT
   - `support_whatsapp_number` VARCHAR
   - `updated_at` TIMESTAMPTZ DEFAULT NOW()
   Enable Row Level Security (RLS) on the table and add policies:
   - Super admins (`get_user_role() = 'super_admin'`) can do all actions (SELECT, INSERT, UPDATE, DELETE).
   - Authenticated/anon users can SELECT (read) the settings.
   Pre-populate/seed exactly one default row with a static UUID (e.g. `d3b07384-d113-4c9f-a89c-499cf5b6ff9a`) and default `ollama_url` so that a query for the single configuration row returns it successfully.
2. Check if a local Supabase stack is running and run the migration. You can run migrations using the Supabase CLI if it is installed (e.g., `supabase db reset`), or execute the SQL file directly using a database connection script or client. Inspect the workspace files and `.env.local` to find database connection details.
3. Verify that the table `global_settings` exists in the database and contains the default row.
4. Update progress.md in your working directory to track your status.
5. Write your final handoff report to handoff.md in your working directory.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

When done, message the parent orchestrator (conversation ID 874b0b0c-afad-4bc5-a42e-40206197b926) with the path to your handoff.md.

## 2026-07-10T23:51:26Z

You are the E2E Testing Worker.
Your task is to implement the E2E test infrastructure, the test cases, and the documentation for the BruvoFlow Budget AI Infrastructure.

You must:
1. Create C:\Users\HOME\OneDrive\Attachments\ai agent\TEST_INFRA.md following the template in the instructions.
2. Put the test code and files in C:\Users\HOME\OneDrive\Attachments\ai agent\tests\e2e.
   - Implement `tests/e2e/mock-server.js`: a zero-dependency mock HTTP server on port 4000 that mocks Supabase Rest (GET/PATCH settings, GET clinics, GET patients), Ollama chat completions, ElevenLabs TTS stream, WhatsApp message sending, and Exotel API. It must expose inspection endpoints to reset state and retrieve captured outgoing requests.
   - Implement `tests/e2e/test-suite.js`: defines 60 test cases across 4 tiers (N=5 features: Ollama integration, Exotel Webhook XML, ElevenLabs TTS & playback, WhatsApp integration with Ollama, Settings UI configuration).
     - Tier 1 (Feature Coverage): 25 cases (5 per feature).
     - Tier 2 (Boundary & Corner Cases): 25 cases (5 per feature).
     - Tier 3 (Cross-Feature Combinations): 5 cases.
     - Tier 4 (Real-World Application Scenarios): 5 scenarios.
   - Implement `tests/e2e/runner.js`: the test runner script that starts the mock server, runs the 60 tests (sending requests to the Next.js endpoints on port 3000/3002 or using mock endpoints for validation/dry-run), asserts outputs, prints results, shuts down the server, and exits with 0/1.
3. Since the product endpoints might not be fully implemented yet by the developer, the runner should have a validation/dry-run mode (e.g. `node tests/e2e/runner.js --mock-target` or similar) where the runner spins up a dummy Next.js app in-process to simulate target responses and verifies that the test runner, mock server, and assertions are fully operational.
4. Verify the test suite by running the runner in this mock-target mode. Include the command and passing output in your handoff report.
5. Create and publish C:\Users\HOME\OneDrive\Attachments\ai agent\TEST_READY.md when the test suite is fully complete and all tests are defined, including the exact command to run the full test suite.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your code and output files. Write a handoff report at C:\Users\HOME\OneDrive\Attachments\ai agent\.agents\worker_m1\handoff.md detailing your file locations, test designs, and validation output. Send a message to the parent orchestrator with the status when done.

## 2026-07-10T18:27:13Z

Please run the validation test command to verify that all 60 test cases pass.
Run the following command exactly in the workspace:
node tests/e2e/runner.js --mock-target
Wait for the command to complete, check the test output logs, and verify that all 60 tests pass. Then write your verification report to C:\Users\HOME\OneDrive\Attachments\ai agent\.agents\worker_m1\verification.md and send me a message with the results.
