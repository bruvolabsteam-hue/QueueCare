## 2026-07-15T07:39:32Z
<USER_REQUEST>
You are a Senior Developer / QA Tester for the TeleCMI Migration and Branding Updates.
Your mission is to perform Milestone 5 (E2E Verification) and Milestone 6 (Deployment & Linking) under the guidance of the Project Orchestrator.
Working Directory: c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\worker_m5_remediation\

Tasks:
1. Fix the integrity violations in these production files:
   - super_admin_web/src/lib/ai/claude.ts (Remove the message === 'simulate timeout' check and hardcoded response. Let it naturally hit the AbortController timeout).
   - super_admin_web/src/app/api/webhooks/telecmi/voice/route.ts (Remove parameter-based bypass logic for simulateDbError. Instead, if simulateDbError is true, create a custom Supabase client that forwards the 'x-simulate-db-error': 'true' header, and execute the actual query so that database error is handled and propagated naturally through the standard client error handling paths).
   - super_admin_web/src/app/api/settings/route.ts (Remove parameter-based bypass logic for simulateDbError. If simulateDbError is true, create a custom Supabase client that forwards the 'x-simulate-db-error': 'true' header to mock-server, and execute the query. Replace the hardcoded checks for brain_url === 'not-a-valid-url' and telecmi_secret_key === 'nocolon' with authentic validation logic: check if brain_url does not start with 'http://' or 'https://' to throw the 'Invalid Brain URL' error, and check if telecmi_secret_key does not contain ':' to throw the format error).

2. Modify the test mock files:
   - tests/e2e/mock-server.js:
     - In the Ollama/Brain mock endpoint, if the user message contains 'simulate timeout' or 'timeout', delay the HTTP response by 6000ms using a setTimeout.
     - In the Supabase REST Mock section, if the request has the header 'x-simulate-db-error' equal to 'true', respond immediately with status 500 and database connection failed error.
   - tests/e2e/mock-target.js:
     - In the helper chat endpoint, if msg === 'simulate timeout', delay the HTTP response by 6000ms using a setTimeout before responding.

3. Run build checks for the Next.js apps:
   - Verify that clinic-dashboard and super_admin_web compile/build cleanly.

4. Run the E2E verification test suite:
   - Run node tests/e2e/runner.js --mock-target
   - Run node tests/e2e/runner.js
   - Verify that all test cases pass.

5. Perform Milestone 6: Deployment & Linking:
   - Verify that the active git repository is connected to the BruvoLabs remote.
   - Verify Supabase project credentials/organization configurations.

MANDATORY INTEGRITY WARNING — DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please report back with:
- Detailed changes made to each file
- Output/results of the build checks
- E2E test execution output (for both --mock-target and live mode)
- Verification findings for git remote settings and Supabase settings
- Absolute path to your handoff report (handoff.md)
</USER_REQUEST>
