# Project: BruvoFlow AI Infrastructure Recovery

## Architecture
- **Web App**: Next.js (located in `super_admin_web`)
- **Backend & Database**: Supabase (PostgreSQL with a `global_settings` table)
- **Local AI Brain**: Ollama running on WSL (normally mapped to standard local port or WSL IP)
- **Voice Agent Integration**: Exotel webhook inbound call handler (`api/webhooks/exotel`) calling ElevenLabs API for text-to-speech
- **Messaging Integration**: WhatsApp webhook (`api/webhooks/whatsapp`) routing messages to Ollama

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Setup & Reproduction | QA Tester: Spin up local server, run tests to reproduce/capture database schema errors, WhatsApp and Exotel API failures, and UI settings load/save issues. | None | DONE |
| 2 | Code Analysis & Diagnostics | Senior Developer: Analyze failure logs, inspect database schema configuration, verify if migrations are complete, analyze ElevenLabs payload structure, and inspect Ollama WSL connection settings. | M1 | DONE |
| 3 | Implementation of Fixes | Senior Developer: Apply database schema updates or migrations (including adding `ollama_model` column), fix Next.js server actions / API endpoints for global settings UI (add `ollama_model` input), fix Ollama payload/fetch logic in `claude.ts` (dynamic model name), and update ElevenLabs header/payload structure. | M2 | DONE |
| 4 | QA Validation & Verification | QA Tester: Re-run verification tests, ensure Next.js dev server runs cleanly, ensure settings save successfully, and webhooks return 200 OK with correct response payloads. | M3 | IN_PROGRESS |

## Interface Contracts
- **Settings UI Config**:
  - Accept and store: `ollama_url`, `elevenlabs_api_key`, `exotel_account_sid`, `exotel_auth_token`, `exotel_caller_id`, `ollama_model`.
- **Exotel Webhook**:
  - Receives inbound HTTP POST calls.
  - Outputs valid Exoml (XML) response containing `<Gather>` for speech recognition and `<Play>` for streaming synthesized ElevenLabs audio.
- **WhatsApp Webhook**:
  - Receives WhatsApp message webhook events.
  - Responses generated dynamically via the model configured in database (e.g. `qwen2.5`).

## Code Layout
- `super_admin_web/src/app/(dashboard)/settings/ai/page.tsx` — AI Settings UI
- `super_admin_web/src/app/api/webhooks/exotel/route.ts` — Exotel webhook route
- `super_admin_web/src/app/api/webhooks/whatsapp/route.ts` — WhatsApp webhook route
- `super_admin_web/src/lib/ai/claude.ts` — AI model routing / Ollama fetch client
- `super_admin_web/src/lib/sms/exotel.ts` — Exotel client integration
- `super_admin_web/src/lib/supabase-admin.ts` — Supabase admin DB helper
