# Project: BruvoFlow Budget AI Infrastructure

## Architecture
- **Database**: Supabase PostgreSQL database storing a single configuration row in the `global_settings` table.
- **LLM Engine**: Local Ollama instance running `llama3` on WSL, accessed via HTTP POST to `/api/chat` using the `ollama_url` saved in `global_settings`.
- **Speech-to-Text & Inbound Call Routing**: Exotel inbound webhook receiving voice calls, using `<Gather input="speech">` to capture transcription.
- **Text-to-Speech (TTS)**: ElevenLabs API (`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`) generating audio files from Ollama responses.
- **Audio Streamer**: Dynamic Next.js API endpoint `/api/webhooks/exotel/audio` streaming cached ElevenLabs audio back to Exotel via `<Play>`.
- **Settings Dashboard**: Super Admin UI updated to configure Ollama, ElevenLabs, and Exotel credentials, eliminating Anthropic and Bland AI inputs.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Migration & Schema Alignment | Create `global_settings` table migration, fix clinics `clinic_name` references, run migration. | None | DONE |
| M2 | Settings UI Refactoring | Refactor `settings/ai/page.tsx` to use new database columns and resolve input state conflicts. | M1 | DONE |
| M3 | Local Ollama Integration | Refactor `src/lib/ai/claude.ts` to call WSL Ollama `llama3` and align clinic name usage. | M1 | DONE |
| M4 | Exotel Webhook & Audio Streamer | Implement `exotel/route.ts` with Exoml response & ElevenLabs API integration, and create `/exotel/audio` endpoint. | M2, M3 | DONE |
| M5 | WhatsApp Update & E2E Validation | Update WhatsApp webhook to route through Ollama and run full system verification. | M3 | BLOCKED (Victory Rejection) |

## Interface Contracts

### 1. Database Schema (`global_settings` table)
```sql
CREATE TABLE public.global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ollama_url TEXT DEFAULT 'http://127.0.0.1:11434',
  elevenlabs_api_key TEXT,
  exotel_account_sid TEXT,
  exotel_api_key TEXT,
  exotel_api_token TEXT,
  whatsapp_api_key TEXT,
  support_whatsapp_number VARCHAR,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Ollama Chat Completions `/api/chat`
- **Request**:
  ```json
  {
    "model": "llama3",
    "messages": [
      { "role": "system", "content": "system prompt" },
      { "role": "user", "content": "user query" }
    ],
    "stream": false
  }
  ```
- **Response**:
  ```json
  {
    "message": {
      "role": "assistant",
      "content": "AI response text"
    }
  }
  ```

### 3. Exotel Webhook Routing (Exoml XML Response)
- **Response (Gather speech)**:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Gather input="speech" action="/api/webhooks/exotel?action=speech" method="POST" timeout="5">
      <Play>/api/webhooks/exotel/audio?id=[audioId]</Play>
    </Gather>
  </Response>
  ```
- **Response (Hangup)**:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Play>/api/webhooks/exotel/audio?id=[audioId]</Play>
    <Hangup/>
  </Response>
  ```

## Code Layout
- `supabase/migrations/20260101000018_create_global_settings.sql` - DB schema creation
- `super_admin_web/src/app/(dashboard)/settings/ai/page.tsx` - Settings UI page
- `super_admin_web/src/lib/ai/claude.ts` - Local Ollama LLM client
- `super_admin_web/src/lib/sms/exotel.ts` - SMS client (reconfigured for separate SID/key/token)
- `super_admin_web/src/app/api/webhooks/exotel/route.ts` - Exotel webhook orchestrator
- `super_admin_web/src/app/api/webhooks/exotel/audio/route.ts` - ElevenLabs audio caching/streaming route
- `super_admin_web/src/app/api/webhooks/whatsapp/route.ts` - WhatsApp webhook receiver
