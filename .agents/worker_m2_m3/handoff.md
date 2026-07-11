# Handoff Report — Settings UI Refactoring & Ollama Integration

## 1. Observation
I directly observed the following from the codebase:
- **Settings UI (`super_admin_web/src/app/(dashboard)/settings/ai/page.tsx`)**:
  - Initially configured inputs for Claude Model Version, Anthropic API Key, Bland AI Phone Number, Bland API Key, Exotel Account SID, and Exotel API Key & Token.
  - Form state used `modelVersion`, `anthropicKey`, `exotelSid`, `voiceKey`, `whatsappKey`, and `supportNumber`.
  - Database save code targeted deprecated columns:
    ```typescript
    const updateData = {
      anthropic_api_key: anthropicKey,
      voice_api_key: voiceKey,
      whatsapp_api_key: whatsappKey,
      support_whatsapp_number: supportNumber,
    };
    ```
- **AI Integration (`super_admin_web/src/lib/ai/claude.ts`)**:
  - Contained the clinic name bug on line 28:
    ```typescript
    let systemPrompt = `You are an intelligent, polite AI receptionist for ${clinicData?.name || 'BruvoFlow Clinic'}. 
    ```
  - Used an external `fetch` request targeting Groq API `https://api.groq.com/openai/v1/chat/completions` with authorization from `settings.anthropic_api_key`.
- **Exotel Client (`super_admin_web/src/lib/sms/exotel.ts`)**:
  - Extracted Exotel credentials from a single string column using:
    ```typescript
    const [apiKey, apiToken] = settings.voice_api_key.split(':');
    ```

## 2. Logic Chain
- **UI Refactoring**: By removing the Anthropic and Bland AI sections, and introducing dedicated inputs mapped to separate state variables (`ollamaUrl`, `elevenlabsApiKey`, `exotelAccountSid`, `exotelApiKey`, `exotelApiToken`, `whatsappApiKey`, `supportWhatsappNumber`), the interface matches the `global_settings` table columns precisely without conflicts.
- **Ollama Integration**: In `claude.ts`, querying `ollama_url` from `global_settings` (defaulting to `http://127.0.0.1:11434`) allows local WSL hosting. Direct fetch targeting `/api/chat` with model `llama3` and extracting response content from `data.message.content` fulfills the offline LLM requirement. Changing `clinicData?.name` to `clinicData?.clinic_name` fixes the clinic name bug.
- **Exotel Credentials**: In `exotel.ts`, selecting individual columns (`exotel_account_sid`, `exotel_api_key`, `exotel_api_token`) and using them directly to build the basic authorization header avoids the fragile split colon syntax and matches the database schema.

## 3. Caveats
- Direct execution of live Ollama requires WSL to be running and model `llama3` downloaded (`ollama run llama3`).
- E2E tests are configured to verify settings UI saves, Ollama integration, Exotel credentials, and WhatsApp integrations offline using the mock server target.

## 4. Conclusion
Milestones 2 and 3 are fully implemented:
1. The settings dashboard UI allows secure management of Ollama URL, ElevenLabs key, Exotel account credentials, and WhatsApp API configurations.
2. The AI integration has been updated to query local WSL Ollama on port `11434` with model `llama3`, resolving the clinic name bug.
3. Exotel SMS functionality parses individual SID, Key, and Token credentials from `global_settings`.

## 5. Verification Method
To verify the changes, inspect:
1. **Settings UI**: `super_admin_web/src/app/(dashboard)/settings/ai/page.tsx`
2. **Ollama Integration**: `super_admin_web/src/lib/ai/claude.ts`
3. **Exotel SMS Logic**: `super_admin_web/src/lib/sms/exotel.ts`

### Test Commands
Ensure Next.js dashboards are running or start mock target:
```bash
# Run in validation mode
node tests/e2e/runner.js --mock-target

# Run full E2E test suite (ensure Next.js app servers are running)
node tests/e2e/runner.js
```
