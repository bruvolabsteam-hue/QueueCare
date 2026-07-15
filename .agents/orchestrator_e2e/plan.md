# E2E Test and Remediation Plan

## Goal
Perform comprehensive E2E testing of BruvoFlow system, hunt and diagnose bugs, patch code, and achieve 100% test completion with all acceptance criteria met.

## Subagent Roster
1. **Lead QA Tester** (`teamwork_preview_worker`)
   - Dir: `C:/Users/HOME/OneDrive/Attachments/ai agent/.agents/worker_lead_qa`
   - Purpose: Coordinates E2E runner execution, manages server processes, and reviews logs.
2. **Secondary QA Tester** (`teamwork_preview_challenger`)
   - Dir: `C:/Users/HOME/OneDrive/Attachments/ai agent/.agents/challenger_sec_qa`
   - Purpose: Aggressively fires mock payloads to webhooks, stress-tests edge cases.
3. **Senior Developer** (`teamwork_preview_worker`)
   - Dir: `C:/Users/HOME/OneDrive/Attachments/ai agent/.agents/worker_developer`
   - Purpose: Analyzes error logs, applies code fixes, aligns schemas, and resolves crashes.

## Milestones
- **M1: Dry-run/Mock-Target Validation (Option A)**
  - Execute `node tests/e2e/runner.js --mock-target` to verify that the E2E framework itself works correctly.
  - Verification: Exits with 0, all 60 tests passed in simulator.
- **M2: Live App Dev Server Execution (Option B)**
  - Spin up live dashboard and web applications.
  - Run `node tests/e2e/runner.js` against the live dev servers.
  - Verification: Identify which tests fail, capture logs.
- **M3: Bug Hunting and Diagnostic Analysis**
  - Senior Developer investigates failures.
  - Review WSL Ollama binding (localhost vs custom IP), database column names (e.g. `ollama_model`), model name matching (qwen2.5 vs llama3), ElevenLabs key parsing.
- **M4: Bug Fix Implementation and Local Verification**
  - Apply necessary patches to `claude.ts`, settings pages, and webhooks.
  - Verify with live dev servers using Option B.
  - Repeat iteration loop until 100% of the 60 test cases pass.
