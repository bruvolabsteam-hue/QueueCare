# E2E Test Suite Readiness Attestation

This document certifies that the End-to-End (E2E) testing suite and infrastructure for the BruvoFlow Budget AI Infrastructure are fully complete, defined, and ready for execution.

## Summary of E2E Infrastructure
- **Mock Server**: Zero-dependency Node.js mock server running on port `4000` (mocks Supabase Rest, Ollama API, ElevenLabs API, WhatsApp messages API, and Exotel API, and includes control and inspection endpoints).
- **Test Suite**: 60 requirement-driven opaque-box test cases covering:
  - **Tier 1 (Feature Coverage)**: 25 test cases.
  - **Tier 2 (Boundary & Corner Cases)**: 25 test cases.
  - **Tier 3 (Cross-Feature Combinations)**: 5 test cases.
  - **Tier 4 (Real-World Scenarios)**: 5 test cases.
- **Test Runner**: A zero-dependency script (`tests/e2e/runner.js`) that controls server lifecycle, runs tests, asserts outputs, logs progress, and manages clean exit codes.
- **Mock-Target (Validation) Mode**: Integrates an in-process mock target Next.js app simulating all actual routes (settings API, chat API, Exotel webhook, audio streamer, WhatsApp webhook) to verify the E2E pipeline offline.

---

## How to Run the Tests

### Option A: Dry-Run Validation Mode (Fully Mocked Next.js Targets)
Use this mode to verify the test suite, mock server, and runner logic in isolation:
```bash
node tests/e2e/runner.js --mock-target
```

### Option B: Full E2E Mode (Against Live Next.js Applications)
To run against the live Next.js development/production servers, ensure they are running on their default ports:
- Super Admin Dashboard: `http://localhost:3002`
- Clinic Dashboard: `http://localhost:3000`

Then run the E2E runner:
```bash
node tests/e2e/runner.js
```

---

## Test Infrastructure Locations
- Documentation: `TEST_INFRA.md`
- Mock Server: `tests/e2e/mock-server.js`
- Target Simulator: `tests/e2e/mock-target.js`
- Test Cases: `tests/e2e/test-suite.js`
- Test Runner: `tests/e2e/runner.js`
