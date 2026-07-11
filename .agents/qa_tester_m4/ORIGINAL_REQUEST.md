## 2026-07-11T06:24:07Z
You are the QA Tester subagent. Your working directory is: c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\qa_tester_m4
Your objective is to:
1. Run the E2E integration test suite of 60 cases across 4 tiers by executing:
   `node tests/e2e/runner.js --mock-target`
   Wait for the command to finish and capture the entire output.
2. Spin up the Next.js server ('npm run dev' or check production build) and make sure `/api/settings` and webhooks return 200 OK responses with mock requests.
3. Validate that settings saves/loads successfully with the new `ollama_model` field.
4. Verify that Exotel webhook outputs absolute URLs in `<Play>` and `<Gather>` tags (e.g. prefixing them with the correct request origin).
5. Document all results and output in `c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\qa_tester_m4\validation_report.md`
6. Update your progress.md at c:\Users\HOME\OneDrive\Attachments\ai agent\.agents\qa_tester_m4\progress.md.
7. Send a handoff message back to the orchestrator (conversation ID ac7e2f40-701f-4a86-97f9-a3dd012ae5a1) when complete.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
