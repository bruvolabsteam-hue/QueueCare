# Handoff Report: Settings UI Migration to Brain Settings and TeleCMI

## 1. Observation

During a read-only investigation of the Settings UI and related files, the following code structures and references were identified.

### A. Super Admin AI Settings UI (`super_admin_web/src/app/(dashboard)/settings/ai/page.tsx`)

This page manages global configuration values stored in the `global_settings` table.

- **Ollama References**:
  - State declaration (lines 15, 22):
    ```typescript
    const [ollamaUrl, setOllamaUrl] = useState("http://127.0.0.1:11434");
    ...
    const [ollamaModel, setOllamaModel] = useState("llama3");
    ```
  - Settings loading (lines 30, 37):
    ```typescript
    setOllamaUrl(data.ollama_url || "http://127.0.0.1:11434");
    ...
    setOllamaModel(data.ollama_model || "llama3");
    ```
  - Database save mapping (lines 56, 63):
    ```typescript
    const updateData = {
      ollama_url: ollamaUrl,
      ...
      ollama_model: ollamaModel,
    };
    ```
  - Form Fields (lines 106-135):
    ```tsx
    {/* Ollama Engine Settings */}
    <section className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
        <Bot className="h-5 w-5 text-teal-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ollama Engine</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Ollama Local URL / IP Address</label>
          <input 
            type="text" 
            value={ollamaUrl}
            onChange={e => setOllamaUrl(e.target.value)}
            placeholder="http://127.0.0.1:11434"
            className="..." 
          />
          <p className="text-xs text-slate-500 mt-1">Direct URL to your local WSL or remote Ollama instance.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Ollama Model</label>
          <input 
            type="text" 
            value={ollamaModel}
            onChange={e => setOllamaModel(e.target.value)}
            placeholder="llama3"
            className="..." 
          />
          <p className="text-xs text-slate-500 mt-1">Local model name (e.g., llama3, llama3.1, mistral).</p>
        </div>
      </div>
    </section>
    ```

- **Exotel References**:
  - State declaration (lines 17-19):
    ```typescript
    const [exotelAccountSid, setExotelAccountSid] = useState("");
    const [exotelApiKey, setExotelApiKey] = useState("");
    const [exotelApiToken, setExotelApiToken] = useState("");
    ```
  - Settings loading (lines 32-34):
    ```typescript
    setExotelAccountSid(data.exotel_account_sid || "");
    setExotelApiKey(data.exotel_api_key || "");
    setExotelApiToken(data.exotel_api_token || "");
    ```
  - Database save mapping (lines 58-60):
    ```typescript
    exotel_account_sid: exotelAccountSid,
    exotel_api_key: exotelApiKey,
    exotel_api_token: exotelApiToken,
    ```
  - Form Fields (lines 164-211) rendered an "Exotel Credentials" section.

- **WhatsApp References**:
  - State declaration (lines 20-21):
    ```typescript
    const [whatsappApiKey, setWhatsappApiKey] = useState("");
    const [supportWhatsappNumber, setSupportWhatsappNumber] = useState("");
    ```
  - Settings loading (lines 35-36):
    ```typescript
    setWhatsappApiKey(data.whatsapp_api_key || "");
    setSupportWhatsappNumber(data.support_whatsapp_number || "");
    ```
  - Database save mapping (lines 61-62):
    ```typescript
    whatsapp_api_key: whatsappApiKey,
    support_whatsapp_number: supportWhatsappNumber,
    ```
  - Form Fields (lines 214-246) rendered a "WhatsApp Business API" section.

---

### B. Clinic Settings UI (`clinic-dashboard/app/dashboard/settings/page.js`)

This page manages settings for individual clinics stored in the `clinics` table.

- **WhatsApp References**:
  - Database save mapping (line 54):
    ```javascript
    whatsapp_sender_number: clinic.whatsapp_sender_number,
    ```
  - Form Input (lines 109-112):
    ```javascript
    <div>
      <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>WhatsApp Sender Number</label>
      <input type="text" placeholder="+919876543210" value={clinic.whatsapp_sender_number || ''} onChange={e => setClinic({...clinic, whatsapp_sender_number: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
    </div>
    ```
  - WhatsApp Language selection section (lines 144-161):
    ```javascript
    <section style={{background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
      <h2 style={{fontSize: '18px', fontWeight: '600', marginBottom: '0.5rem'}}>🌐 WhatsApp Language</h2>
      <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '1rem'}}>All WhatsApp messages will be sent in English + your selected regional language automatically.</p>
      ...
    </section>
    ```

- **Exotel References**:
  - Database save mapping (line 55):
    ```javascript
    exotel_caller_id: clinic.exotel_caller_id
    ```
  - Form Input (lines 113-116):
    ```javascript
    <div>
      <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>Bland AI Phone Number</label>
      <input type="text" placeholder="+1 (555) 000-0000" value={clinic.exotel_caller_id || ''} onChange={e => setClinic({...clinic, exotel_caller_id: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
    </div>
    ```

---

### C. Additional Related Settings Files (Bonus Findings)

1. **Global Settings API Route (`super_admin_web/src/app/api/settings/route.ts`)**:
   Handles backend requests for reading and writing to `global_settings`.
   - References database fields: `ollama_url`, `elevenlabs_api_key`, `exotel_account_sid`, `exotel_api_key`, `exotel_api_token`, `whatsapp_api_key`, `support_whatsapp_number`, `ollama_model` (lines 31-38, 56-64).
   - Validates `ollama_url` (line 42) and `exotel_api_key` (line 45).

2. **Super Admin Clinic Edit Settings Modal (`super_admin_web/src/app/(dashboard)/clinics/page.tsx`)**:
   Permits super admins to manage individual clinic credentials.
   - Database update (lines 89-90):
     ```typescript
     whatsapp_sender_number: editModalData.whatsapp_sender_number,
     exotel_caller_id: editModalData.exotel_caller_id
     ```
   - Input Fields (lines 222-228):
     Provides inputs for `whatsapp_sender_number` and `exotel_caller_id`.

---

## 2. Logic Chain

1. **AI Terminology Unification**: The user request specifies that we should replace all explicit references to Ollama and Groq with "Brain" or "Brain Settings" in the UI. Under the hood, this unified "Brain" configuration will bind to Groq API credentials. This requires deprecating `ollama_url` and `ollama_model` in the UI and database bindings, and creating new fields for `brain_url`, `brain_model`, and `brain_api_key`.
2. **Exotel & WhatsApp Replacement**: The application is migrating completely away from Exotel and WhatsApp to TeleCMI.
   - For **Global settings (Super Admin)**: Exotel credentials (`exotel_account_sid`, `exotel_api_key`, `exotel_api_token`) and WhatsApp configurations (`whatsapp_api_key`, `support_whatsapp_number`) must be removed from the UI. They are to be replaced by `telecmi_app_id` and `telecmi_secret_key`.
   - For **Clinic-level settings**: Exotel phone config (`exotel_caller_id`) and WhatsApp number config (`whatsapp_sender_number`) must be replaced with `telecmi_caller_id`.
   - For **Language settings**: The "WhatsApp Language" section must be renamed to "Notification Language" or "Patient Language Settings" because notifications will be powered by TeleCMI voice instead of WhatsApp.
3. **Database Bindings**: The frontend UI save handlers (`handleSave`) rely on Supabase client calls. Therefore, the properties written to the database must be updated to align with the new schema columns (`brain_url`, `brain_model`, `brain_api_key`, `telecmi_app_id`, `telecmi_secret_key`, and `telecmi_caller_id`).

---

## 3. Caveats

- This report is purely a read-only analysis and does not write or execute changes.
- It assumes that the corresponding database migration SQL statements to drop the old columns (`ollama_url`, `ollama_model`, `exotel_account_sid`, `exotel_api_key`, `exotel_api_token`, `whatsapp_api_key`, `support_whatsapp_number`, `whatsapp_sender_number`, `exotel_caller_id`) and add the new columns (`brain_url`, `brain_model`, `brain_api_key`, `telecmi_app_id`, `telecmi_secret_key`, `telecmi_caller_id`) are applied in parallel or have already been executed by another worker.

---

## 4. Conclusion

Below are the detailed proposed changes for each file:

### A. Changes in `super_admin_web/src/app/(dashboard)/settings/ai/page.tsx`

1. **State variables to replace**:
   - Remove: `ollamaUrl`, `exotelAccountSid`, `exotelApiKey`, `exotelApiToken`, `whatsappApiKey`, `supportWhatsappNumber`, `ollamaModel`.
   - Add:
     ```typescript
     const [brainUrl, setBrainUrl] = useState("https://api.groq.com/openai/v1");
     const [brainModel, setBrainModel] = useState("llama-3.1-8b-instant");
     const [brainApiKey, setBrainApiKey] = useState("");
     const [telecmiAppId, setTelecmiAppId] = useState("");
     const [telecmiSecretKey, setTelecmiSecretKey] = useState("");
     ```

2. **Load settings (`useEffect`) mapping update**:
   - Replace old setters with:
     ```typescript
     setBrainUrl(data.brain_url || "https://api.groq.com/openai/v1");
     setBrainModel(data.brain_model || "llama-3.1-8b-instant");
     setBrainApiKey(data.brain_api_key || "");
     setTelecmiAppId(data.telecmi_app_id || "");
     setTelecmiSecretKey(data.telecmi_secret_key || "");
     ```

3. **Handler function (`handleSave`) payload update**:
   - Replace `updateData` object with:
     ```typescript
     const updateData = {
       brain_url: brainUrl,
       brain_model: brainModel,
       brain_api_key: brainApiKey,
       telecmi_app_id: telecmiAppId,
       telecmi_secret_key: telecmiSecretKey,
       elevenlabs_api_key: elevenlabsApiKey, // preserve this field
     };
     ```

4. **UI Layout (JSX)**:
   - Rename "Ollama Engine" section to "Brain Settings". Update input labels and place value/onChange hooks for `brainUrl`, `brainModel`, and `brainApiKey` (with password-toggle).
   - Remove "Exotel Credentials" and "WhatsApp Business API" sections.
   - Add a new "TeleCMI Credentials" section with fields for "TeleCMI App ID" (`telecmiAppId`) and "TeleCMI Secret Key" (`telecmiSecretKey`, with password-toggle).

### B. Changes in `clinic-dashboard/app/dashboard/settings/page.js`

1. **State / Bindings inside `handleSave`**:
   - Remove `whatsapp_sender_number` and `exotel_caller_id` from the Supabase update.
   - Add `telecmi_caller_id: clinic.telecmi_caller_id`.

2. **UI Layout (JSX)**:
   - In "Communication Sender Numbers", replace the WhatsApp and Bland AI input fields with:
     ```javascript
     <div>
       <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px'}}>TeleCMI Caller ID</label>
       <input type="text" placeholder="e.g. 08047112345" value={clinic.telecmi_caller_id || ''} onChange={e => setClinic({...clinic, telecmi_caller_id: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}} />
     </div>
     ```
   - Rename the "🌐 WhatsApp Language" section header to `"🌐 Patient Language Settings"` or `"🌐 Notification Language"`. Change description text to: `"Automated TeleCMI Voice and message notifications will be sent in the selected regional language."`

### C. Changes in `super_admin_web/src/app/(dashboard)/clinics/page.tsx`

1. **Edit Modal Submit (`handleSaveSettings`) mapping update**:
   - Replace payload bindings with `telecmi_caller_id: editModalData.telecmi_caller_id`.

2. **Edit Modal JSX**:
   - Replace WhatsApp and Exotel inputs with a single input for "TeleCMI Caller ID" bound to `editModalData.telecmi_caller_id`.

### D. Changes in `super_admin_web/src/app/api/settings/route.ts`

1. **Destructuring and Payload updating**:
   - Destructure and write `brain_url`, `brain_model`, `brain_api_key`, `telecmi_app_id`, and `telecmi_secret_key` instead of the old variables.
   - Update input validation check to test `brain_url` instead of `ollama_url`.

---

## 5. Verification Method

To verify these settings UI changes independently after they are implemented:

1. **Build Verification**:
   Navigate to each workspace subdirectory and run the Next.js production builds to ensure no TS/compilation errors exist:
   - `cd super_admin_web; npm run build`
   - `cd clinic-dashboard; npm run build`
2. **Linting Check**:
   Validate code formatting and type safety:
   - `cd super_admin_web; npm run lint`
   - `cd clinic-dashboard; npm run lint`
3. **Database Sync Check**:
   Ensure the database table schemas match the updated bindings by inspecting tables via the Supabase Dashboard or running:
   - `supabase db lint`
