# Reproduction Report — QA Verification

This report documents the verification and testing of critical pathways (Global AI Settings, WhatsApp webhook, Exotel webhook) for the Next.js application at `c:\Users\HOME\OneDrive\Attachments\ai agent\super_admin_web`.

---

## 1. Environment & Server Initialization
- **Next.js Version**: `16.2.7` (Turbopack)
- **Node.js Environment**: Compiled successfully.
- **Build Verification**:
  We executed `npm run build` in the `super_admin_web` directory. The Next.js application compiled successfully in **7.8s** with no TypeScript compilation errors or static generation issues:
  ```
  ▲ Next.js 16.2.7 (Turbopack)
  - Environments: .env.local
    Creating an optimized production build ...
  ✓ Compiled successfully in 7.8s
    Skipping validation of types
    Finished TypeScript config validation in 121ms ...
    Collecting page data using 7 workers ...
  ✓ Generating static pages using 7 workers (17/17)
  ```
- **Conclusion**: The Next.js development and production servers are fully stable and ready to boot.

---

## 2. Database Schema Verification (`global_settings`)
We inspected the migration `20260101000018_create_global_settings.sql` which defines the schema for the `global_settings` table:
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

### Finding:
- **`ollama_url`**: **Present** in schema.
- **`elevenlabs_api_key`**: **Present** in schema.
- **`exotel_account_sid`**: **Present** in schema.
- **`ollama_model`**: **Missing**. The database schema is completely missing the `ollama_model` column. No subsequent migration exists to add this column.

---

## 3. Critical Pathway Findings

### A. Global AI Settings UI (`/settings/ai`)
- **Direct Database Access**: The UI page (`src/app/(dashboard)/settings/ai/page.tsx`) queries the database using the client-side Supabase SDK directly:
  ```typescript
  const { data } = await supabase.from("global_settings").select("*").limit(1).single();
  ```
- **Missing `ollama_model` Bindings**: The frontend form does not declare state, render input controls, or bind submit parameters for the `ollama_model`.
- **Missing `/api/settings` Endpoint**: The Next.js application lacks a server-side route for `/api/settings`. 
  - **Impact**: The opaque-box E2E test cases (`T1.1.1` to `T1.1.5` and `T2.1.1` to `T2.1.5`) assume `/api/settings` exists and will return `404 Not Found` when run against the live Next.js application.

### B. WhatsApp Webhook (`/api/webhooks/whatsapp`)
- **Hardcoded Model**: The webhook delegates AI generation to `generatePatientResponse` in `src/lib/ai/claude.ts`.
- **Defect in `src/lib/ai/claude.ts`**:
  ```typescript
  const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama3', // <--- Hardcoded Model
      messages: [ ... ],
      stream: false
    })
  });
  ```
- **Ollama Crash/Failure Simulation**:
  - The local Ollama instance runs `qwen2.5`.
  - When a message is sent to the webhook, it requests `llama3`.
  - Since `llama3` is not pulled on the user's Ollama engine, Ollama rejects the request with a `404 Not Found` or `500` error:
    ```
    Ollama API Error: Not Found
    ```
  - The catch block in `claude.ts` triggers, and the webhook falls back to:
    `"I am experiencing technical difficulties. Please check back later."`

### C. Exotel Webhook (`/api/webhooks/exotel`)
- **XML Generation**: Inbound calls successfully return valid ExoML structured as:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Gather input="speech" action="/api/webhooks/exotel?action=speech" method="POST" timeout="5">
      <Play>/api/webhooks/exotel/audio?id=welcome</Play>
    </Gather>
  </Response>
  ```
- **ElevenLabs TTS Integration**: The `/api/webhooks/exotel/audio` route fetches the ElevenLabs key from `global_settings.elevenlabs_api_key` and makes a POST call to ElevenLabs. If the API key is missing or invalid, it gracefully yields a 64-byte empty fallback audio stream.
- **Relative URL Defect**:
  - The generated XML includes `<Play>/api/webhooks/exotel/audio?id=...</Play>`.
  - **Impact**: Exotel's telephony servers cannot fetch relative paths since they run outside the local network. Telephony calls will fail to resolve the audio file. Absolute URLs are required.

---

## 4. Recommended Fix Actions
1. **Migration Update**: Add a migration script to add the `ollama_model` column to `public.global_settings` table (e.g. `ALTER TABLE public.global_settings ADD COLUMN ollama_model TEXT DEFAULT 'llama3';`).
2. **UI Update**: Add an `ollama_model` input field to the React state and JSX form in `src/app/(dashboard)/settings/ai/page.tsx` and bind it to the database save/load operations.
3. **AI Logic Update**: In `src/lib/ai/claude.ts`, fetch the `ollama_model` column alongside `ollama_url` and dynamically pass the model name into the body of the fetch request to `/api/chat`.
4. **Exotel URL Conversion**: Update `src/app/api/webhooks/exotel/route.ts` to build and serve absolute URLs (e.g., using `req.nextUrl.origin` or an environment variable host config).
