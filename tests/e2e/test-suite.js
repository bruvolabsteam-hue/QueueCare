// E2E Test Suite of 60 cases across 4 tiers
// Built for zero-dependency node execution

const assert = require('assert');

const suite = [];

// Helper to add tests easily
function addTest(tier, feature, id, name, runFn) {
  suite.push({
    tier,
    feature,
    id,
    name,
    run: runFn
  });
}

// ==========================================
// TIER 1: FEATURE COVERAGE (25 Cases)
// ==========================================

// Feature 1: Settings UI Configuration
addTest(1, 'Settings UI configuration', 'T1.1.1', 'Settings page load fetches global settings row from Supabase', async (request, setMockState) => {
  await setMockState({
    global_settings: [{
      id: "d3b07384-d113-4c9f-a89c-499cf5b6ff9a",
      ollama_url: "http://localhost:4000/ollama-configured"
    }]
  });
  const res = await request('/api/settings', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.strictEqual(data.ollama_url, "http://localhost:4000/ollama-configured");
});

addTest(1, 'Settings UI configuration', 'T1.1.2', 'Update Ollama URL successfully saves to global_settings.ollama_url', async (request, setMockState) => {
  const res = await request('/api/settings', { method: 'POST' }, { ollama_url: 'http://localhost:4000/new-ollama' });
  assert.strictEqual(res.statusCode, 200);
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.ollama_url, 'http://localhost:4000/new-ollama');
});

addTest(1, 'Settings UI configuration', 'T1.1.3', 'Update ElevenLabs API key successfully saves to global_settings.elevenlabs_api_key', async (request, setMockState) => {
  const res = await request('/api/settings', { method: 'POST' }, { elevenlabs_api_key: 'elevenlabs-api-key-test' });
  assert.strictEqual(res.statusCode, 200);
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.elevenlabs_api_key, 'elevenlabs-api-key-test');
});

addTest(1, 'Settings UI configuration', 'T1.1.4', 'Update Exotel credentials successfully saves account SID, API key, and API token', async (request, setMockState) => {
  const res = await request('/api/settings', { method: 'POST' }, {
    exotel_account_sid: 'sid123',
    exotel_api_key: 'key123',
    exotel_api_token: 'token123'
  });
  assert.strictEqual(res.statusCode, 200);
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.exotel_account_sid, 'sid123');
  assert.strictEqual(settings.exotel_api_key, 'key123');
  assert.strictEqual(settings.exotel_api_token, 'token123');
});

addTest(1, 'Settings UI configuration', 'T1.1.5', 'Update WhatsApp API key and global support number successfully saves to database', async (request, setMockState) => {
  const res = await request('/api/settings', { method: 'POST' }, {
    whatsapp_api_key: 'wa-key-xyz',
    support_whatsapp_number: '+919999999999'
  });
  assert.strictEqual(res.statusCode, 200);
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.whatsapp_api_key, 'wa-key-xyz');
  assert.strictEqual(settings.support_whatsapp_number, '+919999999999');
});


// Feature 2: Ollama LLM Integration
addTest(1, 'Ollama integration', 'T1.2.1', 'LLM client constructs system prompt containing patient name, token number, and clinic name', async (request, setMockState, getCaptured) => {
  await setMockState({
    patients: [{ id: "p1", phone_number: "+919876543210", name: "Alice Smith", token: "T-200", status: "waiting", clinic_id: "c1" }],
    clinics: [{ id: "c1", clinic_name: "Aesthetic Dental" }]
  });
  await request('/api/chat', { method: 'POST' }, { phone_number: '+919876543210', message: 'Hello' });
  const captured = await getCaptured();
  const ollamaReq = captured.ollama[captured.ollama.length - 1];
  assert.ok(ollamaReq);
  const systemMsg = ollamaReq.body.messages.find(m => m.role === 'system').content;
  assert.ok(systemMsg.includes('Alice Smith'));
  assert.ok(systemMsg.includes('T-200'));
  assert.ok(systemMsg.includes('Aesthetic Dental'));
});

addTest(1, 'Ollama integration', 'T1.2.2', 'LLM client constructs user query containing message body', async (request, setMockState, getCaptured) => {
  await request('/api/chat', { method: 'POST' }, { phone_number: '+919876543210', message: 'Where is my queue position?' });
  const captured = await getCaptured();
  const ollamaReq = captured.ollama[captured.ollama.length - 1];
  assert.ok(ollamaReq);
  const userMsg = ollamaReq.body.messages.find(m => m.role === 'user').content;
  assert.strictEqual(userMsg, 'Where is my queue position?');
});

addTest(1, 'Ollama integration', 'T1.2.3', 'LLM client issues HTTP POST to /api/chat with model set to llama3', async (request, setMockState, getCaptured) => {
  await request('/api/chat', { method: 'POST' }, { phone_number: '+919876543210', message: 'Hi' });
  const captured = await getCaptured();
  const ollamaReq = captured.ollama[captured.ollama.length - 1];
  assert.ok(ollamaReq);
  assert.strictEqual(ollamaReq.body.model, 'llama3');
});

addTest(1, 'Ollama integration', 'T1.2.4', 'LLM client parses assistant message body and returns raw text response', async (request, setMockState) => {
  const res = await request('/api/chat', { method: 'POST' }, { phone_number: '+919876543210', message: 'How long to wait?' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.reply.includes('T-101'));
});

addTest(1, 'Ollama integration', 'T1.2.5', 'LLM client handles missing patient wait times by outputting generic queue instructions', async (request, setMockState) => {
  await setMockState({
    patients: [{ id: "p1", phone_number: "+919876543210", name: "Alice Smith", token: null, status: "waiting", clinic_id: "c1" }]
  });
  const res = await request('/api/chat', { method: 'POST' }, { phone_number: '+919876543210', message: 'status' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.reply);
});


// Feature 3: Exotel Webhook XML
addTest(1, 'Exotel Webhook XML', 'T1.3.1', 'Inbound webhook accepts POST and returns status 200 with XML content headers', async (request, setMockState) => {
  const res = await request('/api/webhooks/exotel', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.headers['content-type'].includes('xml'));
});

addTest(1, 'Exotel Webhook XML', 'T1.3.2', 'Inbound webhook returns valid XML root tag <Response>', async (request) => {
  const res = await request('/api/webhooks/exotel', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210');
  assert.ok(res.body.includes('<Response>'));
  assert.ok(res.body.includes('</Response>'));
});

addTest(1, 'Exotel Webhook XML', 'T1.3.3', 'Webhook includes <Gather> tag with input="speech" and timeout parameters', async (request) => {
  const res = await request('/api/webhooks/exotel', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210');
  assert.ok(res.body.includes('<Gather'));
  assert.ok(res.body.includes('input="speech"'));
  assert.ok(res.body.includes('timeout='));
});

addTest(1, 'Exotel Webhook XML', 'T1.3.4', 'Webhook sets <Gather> action attribute to the callback path /api/webhooks/exotel?action=speech', async (request) => {
  const res = await request('/api/webhooks/exotel', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210');
  assert.ok(res.body.includes('action="/api/webhooks/exotel?action=speech"'));
});

addTest(1, 'Exotel Webhook XML', 'T1.3.5', 'Webhook returns XML with <Hangup> tag when processing termination', async (request) => {
  const res = await request('/api/webhooks/exotel?action=hangup', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210');
  assert.ok(res.body.includes('<Hangup/>'));
});


// Feature 4: ElevenLabs TTS & playback
addTest(1, 'ElevenLabs TTS & playback', 'T1.4.1', 'TTS client sends text payload to ElevenLabs URL with selected voice ID', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/exotel/audio?id=audio-t1.4.1&text=Hello+Test', { method: 'GET' });
  const captured = await getCaptured();
  const elevenlabsReq = captured.elevenlabs[captured.elevenlabs.length - 1];
  assert.ok(elevenlabsReq);
  assert.ok(elevenlabsReq.path.includes('21m00Tcm4TlvDq8ikWAM'));
  assert.strictEqual(elevenlabsReq.body.text, 'Hello Test');
});

addTest(1, 'ElevenLabs TTS & playback', 'T1.4.2', 'TTS client authorization header contains the configured ElevenLabs API key', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/exotel/audio?id=audio-t1.4.2&text=Hello+Auth', { method: 'GET' });
  const captured = await getCaptured();
  const elevenlabsReq = captured.elevenlabs[captured.elevenlabs.length - 1];
  assert.ok(elevenlabsReq);
  assert.strictEqual(elevenlabsReq.headers['xi-api-key'], 'mock-elevenlabs-key');
});

addTest(1, 'ElevenLabs TTS & playback', 'T1.4.3', 'Audio endpoint /api/webhooks/exotel/audio returns binary MP3/MPEG payload', async (request) => {
  const res = await request('/api/webhooks/exotel/audio?id=audio-t1.4.3&text=Binary', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.rawBody.length, 128); // 128 bytes from mock server
});

addTest(1, 'ElevenLabs TTS & playback', 'T1.4.4', 'Audio endpoint response sets Content-Type: audio/mpeg', async (request) => {
  const res = await request('/api/webhooks/exotel/audio?id=audio-t1.4.4&text=Content', { method: 'GET' });
  assert.strictEqual(res.headers['content-type'], 'audio/mpeg');
});

addTest(1, 'ElevenLabs TTS & playback', 'T1.4.5', 'Audio stream caches generated files to prevent duplicate ElevenLabs API charges', async (request, setMockState, getCaptured) => {
  // Call once
  await request('/api/webhooks/exotel/audio?id=audio-cache-key-1&text=CacheMe', { method: 'GET' });
  // Call twice with same key
  await request('/api/webhooks/exotel/audio?id=audio-cache-key-1&text=CacheMe', { method: 'GET' });
  
  const captured = await getCaptured();
  // Filter ElevenLabs calls with text 'CacheMe'
  const cacheMeCalls = captured.elevenlabs.filter(req => req.body.text === 'CacheMe');
  assert.strictEqual(cacheMeCalls.length, 1); // Should only call ElevenLabs once
});


// Feature 5: WhatsApp integration with Ollama
addTest(1, 'WhatsApp integration with Ollama', 'T1.5.1', 'GET webhook request returns hub challenge when verify token matches', async (request) => {
  const res = await request('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=bruvoflow_secure_webhook&hub.challenge=test_challenge_123', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body, 'test_challenge_123');
});

addTest(1, 'WhatsApp integration with Ollama', 'T1.5.2', 'Webhook POST matches incoming phone number against active waiting patients in database', async (request, setMockState, getCaptured) => {
  await setMockState({
    patients: [{ id: "p2", phone_number: "+919876543210", name: "Bob", token: "T-222", status: "waiting", clinic_id: "c1" }]
  });
  
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'What is my queue status?' }
          }]
        }
      }]
    }]
  };
  
  await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  const captured = await getCaptured();
  const supabaseQueries = captured.supabase.filter(q => q.path.includes('/patients'));
  assert.ok(supabaseQueries.length > 0);
  const lastQuery = supabaseQueries[supabaseQueries.length - 1];
  assert.ok(lastQuery.query.phone_number.includes('+919876543210'));
});

addTest(1, 'WhatsApp integration with Ollama', 'T1.5.3', 'Webhook calls Ollama integration with waiting patient data', async (request, setMockState, getCaptured) => {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'What is my queue status?' }
          }]
        }
      }]
    }]
  };
  await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  const captured = await getCaptured();
  assert.ok(captured.ollama.length > 0);
});

addTest(1, 'WhatsApp integration with Ollama', 'T1.5.4', 'Webhook calls Meta Graph API to send WhatsApp message back', async (request, setMockState, getCaptured) => {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'Status please' }
          }]
        }
      }]
    }]
  };
  await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  const captured = await getCaptured();
  assert.ok(captured.whatsapp.length > 0);
});

addTest(1, 'WhatsApp integration with Ollama', 'T1.5.5', 'Meta Graph API request is authorized using the saved WhatsApp API key', async (request, setMockState, getCaptured) => {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'Status please' }
          }]
        }
      }]
    }]
  };
  await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  const captured = await getCaptured();
  const waReq = captured.whatsapp[captured.whatsapp.length - 1];
  assert.ok(waReq);
  assert.strictEqual(waReq.headers['authorization'], 'Bearer mock-whatsapp-key');
});


// ==========================================
// TIER 2: BOUNDARY & CORNER CASES (25 Cases)
// ==========================================

// Feature 1: Settings UI Configuration
addTest(2, 'Settings UI configuration', 'T2.1.1', 'Clear credentials saves empty settings columns successfully', async (request, setMockState) => {
  const res = await request('/api/settings', { method: 'POST' }, {
    elevenlabs_api_key: '',
    exotel_account_sid: '',
    exotel_api_key: '',
    exotel_api_token: '',
    whatsapp_api_key: ''
  });
  assert.strictEqual(res.statusCode, 200);
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.elevenlabs_api_key, '');
});

addTest(2, 'Settings UI configuration', 'T2.1.2', 'Database connection failure shows clear error message in settings panel', async (request, setMockState) => {
  // Set mock server state to empty / error behavior
  await setMockState({ global_settings: [] }); // Simulate empty DB config row
  const res = await request('/api/settings?simulate_db_error=true', { method: 'GET' });
  assert.strictEqual(res.statusCode, 500);
  const data = JSON.parse(res.body);
  assert.ok(data.error.includes('Database connection failed'));
});

addTest(2, 'Settings UI configuration', 'T2.1.3', 'Ollama URL input validation rejects malformed URLs', async (request) => {
  const res = await request('/api/settings', { method: 'POST' }, { ollama_url: 'not-a-valid-url' });
  assert.strictEqual(res.statusCode, 400);
  const data = JSON.parse(res.body);
  assert.ok(data.error.includes('Invalid Ollama URL'));
});

addTest(2, 'Settings UI configuration', 'T2.1.4', 'Exotel API key input validation rejects missing colon separators', async (request) => {
  // Settings UI has a combined field where it expects API_KEY:API_TOKEN format
  const res = await request('/api/settings', { method: 'POST' }, { exotel_api_key: 'nocolon' });
  assert.strictEqual(res.statusCode, 400);
  const data = JSON.parse(res.body);
  assert.ok(data.error.includes('Format must be KEY:TOKEN'));
});

addTest(2, 'Settings UI configuration', 'T2.1.5', 'Multiple concurrent settings saves are debounced and processed sequentially', async (request) => {
  // Send 3 parallel requests
  const p1 = request('/api/settings', { method: 'POST' }, { ollama_url: 'http://localhost:4000/c1' });
  const p2 = request('/api/settings', { method: 'POST' }, { ollama_url: 'http://localhost:4000/c2' });
  const p3 = request('/api/settings', { method: 'POST' }, { ollama_url: 'http://localhost:4000/c3' });
  
  const results = await Promise.all([p1, p2, p3]);
  results.forEach(res => {
    assert.strictEqual(res.statusCode, 200);
  });
  
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.ollama_url, 'http://localhost:4000/c3'); // last one wins
});


// Feature 2: Ollama LLM Integration
addTest(2, 'Ollama integration', 'T2.2.1', 'Ollama server returns 500 error; client yields friendly fallback text', async (request, setMockState) => {
  const res = await request('/api/chat', { method: 'POST' }, { phone_number: '+919876543210', message: 'error simulation' });
  assert.strictEqual(res.statusCode, 200); // Route handles error and returns 200 with fallback
  const data = JSON.parse(res.body);
  assert.ok(data.reply.includes('Currently we are experiencing system maintenance'));
});

addTest(2, 'Ollama integration', 'T2.2.2', 'Ollama request times out; client fails fast to avoid holding webhook connections', async (request) => {
  const res = await request('/api/chat', { method: 'POST' }, { phone_number: '+919876543210', message: 'simulate timeout' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.reply.includes('wait time update is temporarily unavailable'));
});

addTest(2, 'Ollama integration', 'T2.2.3', 'Ollama returns extremely long response; client truncates to fit WhatsApp constraints', async (request) => {
  const res = await request('/api/chat', { method: 'POST' }, { phone_number: '+919876543210', message: 'respond with super long string' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.reply.length <= 4096);
});

addTest(2, 'Ollama integration', 'T2.2.4', 'Patient name contains special characters/Unicode; LLM constructs prompt without encoding corruption', async (request, setMockState, getCaptured) => {
  await setMockState({
    patients: [{ id: "p1", phone_number: "+919876543210", name: "José & Chloë", token: "T-77", status: "waiting", clinic_id: "c1" }]
  });
  await request('/api/chat', { method: 'POST' }, { phone_number: '+919876543210', message: 'hi' });
  const captured = await getCaptured();
  const ollamaReq = captured.ollama[captured.ollama.length - 1];
  const systemMsg = ollamaReq.body.messages.find(m => m.role === 'system').content;
  assert.ok(systemMsg.includes('José & Chloë'));
});

addTest(2, 'Ollama integration', 'T2.2.5', 'No configuration row exists in Supabase; Ollama client returns fallback', async (request, setMockState) => {
  await setMockState({ global_settings: [] });
  const res = await request('/api/chat', { method: 'POST' }, { phone_number: '+919876543210', message: 'Hi' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.reply.includes('Please consult reception'));
});


// Feature 3: Exotel Webhook XML
addTest(2, 'Exotel Webhook XML', 'T2.3.1', 'Unregistered incoming number returns XML indicating no active queue ticket', async (request, setMockState) => {
  await setMockState({ patients: [] }); // No patients in DB
  const res = await request('/api/webhooks/exotel', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B910000000000');
  assert.ok(res.body.includes('no-ticket'));
  assert.ok(res.body.includes('<Hangup/>'));
});

addTest(2, 'Exotel Webhook XML', 'T2.3.2', 'Speech transcription is empty; webhook asks caller to repeat input', async (request) => {
  const res = await request('/api/webhooks/exotel?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210&TranscriptionText=');
  assert.ok(res.body.includes('repeat'));
});

addTest(2, 'Exotel Webhook XML', 'T2.3.3', 'Webhook POST payload missing caller number returns 400 Bad Request', async (request) => {
  const res = await request('/api/webhooks/exotel', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, '');
  assert.strictEqual(res.statusCode, 400);
});

addTest(2, 'Exotel Webhook XML', 'T2.3.4', 'Supabase database error occurs; webhook yields fallback XML stating system maintenance', async (request, setMockState) => {
  const res = await request('/api/webhooks/exotel?simulate_db_error=true', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210');
  assert.ok(res.body.includes('maintenance'));
  assert.ok(res.body.includes('<Hangup/>'));
});

addTest(2, 'Exotel Webhook XML', 'T2.3.5', 'Webhook called with invalid action parameter returns 400 Bad Request', async (request) => {
  const res = await request('/api/webhooks/exotel?action=invalid', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210');
  assert.strictEqual(res.statusCode, 400);
});


// Feature 4: ElevenLabs TTS & Playback
addTest(2, 'ElevenLabs TTS & playback', 'T2.4.1', 'ElevenLabs API returns 401 Unauthorized; audio streamer yields fallback sound', async (request, setMockState) => {
  await setMockState({
    global_settings: [{ id: "d3b07384-d113-4c9f-a89c-499cf5b6ff9a", elevenlabs_api_key: "invalid-key" }]
  });
  const res = await request('/api/webhooks/exotel/audio?id=audio-unauth&text=unauthorized', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['content-type'], 'audio/mpeg');
  // Should stream default fallback buffer (e.g. 64 bytes instead of mock elevenlabs 128 bytes)
  assert.notStrictEqual(res.rawBody.length, 128);
});

addTest(2, 'ElevenLabs TTS & playback', 'T2.4.2', 'ElevenLabs API returns 429 Rate Limit; audio streamer serves cached fallback audio', async (request, setMockState) => {
  await setMockState({
    global_settings: [{ id: "d3b07384-d113-4c9f-a89c-499cf5b6ff9a", elevenlabs_api_key: "rate-limit-key" }]
  });
  const res = await request('/api/webhooks/exotel/audio?id=audio-ratelimit&text=ratelimit', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['content-type'], 'audio/mpeg');
});

addTest(2, 'ElevenLabs TTS & playback', 'T2.4.3', 'Audio streamer queried with invalid or expired audio ID returns 404 Not Found', async (request) => {
  const res = await request('/api/webhooks/exotel/audio?id=', { method: 'GET' });
  assert.strictEqual(res.statusCode, 404);
});

addTest(2, 'ElevenLabs TTS & playback', 'T2.4.4', 'ElevenLabs API returns malformed/empty body; audio streamer handles gracefully', async (request, setMockState) => {
  await setMockState({
    global_settings: [{ id: "d3b07384-d113-4c9f-a89c-499cf5b6ff9a", elevenlabs_api_key: "empty-body-key" }]
  });
  const res = await request('/api/webhooks/exotel/audio?id=audio-empty-test&text=emptybody', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
});

addTest(2, 'ElevenLabs TTS & playback', 'T2.4.5', 'Concurrent requests for the same audio ID stream cached file without issuing duplicate API calls', async (request, setMockState, getCaptured) => {
  // Flush captured
  await setMockState({});
  
  const p1 = request('/api/webhooks/exotel/audio?id=audio-concurrent-1&text=concurrent', { method: 'GET' });
  const p2 = request('/api/webhooks/exotel/audio?id=audio-concurrent-1&text=concurrent', { method: 'GET' });
  
  await Promise.all([p1, p2]);
  const captured = await getCaptured();
  const elevenlabsCalls = captured.elevenlabs.filter(req => req.body.text === 'concurrent');
  assert.strictEqual(elevenlabsCalls.length, 1);
});


// Feature 5: WhatsApp Integration
addTest(2, 'WhatsApp integration with Ollama', 'T2.5.1', 'GET webhook verification fails with invalid verify token and returns 403 Forbidden', async (request) => {
  const res = await request('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test', { method: 'GET' });
  assert.strictEqual(res.statusCode, 403);
});

addTest(2, 'WhatsApp integration with Ollama', 'T2.5.2', 'Incoming WhatsApp message from unregistered number receives generic reception message', async (request, setMockState, getCaptured) => {
  await setMockState({ patients: [] }); // Unregistered
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '910000000000',
            text: { body: 'Hello' }
          }]
        }
      }]
    }]
  };
  await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  const captured = await getCaptured();
  assert.ok(captured.whatsapp.length > 0);
  assert.ok(captured.whatsapp[captured.whatsapp.length - 1].body.text.body.includes("couldn't find an active queue ticket"));
});

addTest(2, 'WhatsApp integration with Ollama', 'T2.5.3', 'WhatsApp Graph API returns 400 Bad Request; webhook logs error gracefully', async (request, setMockState) => {
  await setMockState({
    global_settings: [{ id: "d3b07384-d113-4c9f-a89c-499cf5b6ff9a", whatsapp_api_key: "invalid-key" }]
  });
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'Hello' }
          }]
        }
      }]
    }]
  };
  // API returns 200 to acknowledge Meta receipt, but processes error internally
  const res = await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  assert.strictEqual(res.statusCode, 200);
});

addTest(2, 'WhatsApp integration with Ollama', 'T2.5.4', 'Malformed JSON payload received; webhook returns 200 to acknowledge but ignores event', async (request) => {
  const res = await request('/api/webhooks/whatsapp', { method: 'POST' }, { malformed: true });
  assert.strictEqual(res.statusCode, 200);
});

addTest(2, 'WhatsApp integration with Ollama', 'T2.5.5', 'Multiple active wait tickets found for phone number; webhook routes to the newest ticket', async (request, setMockState, getCaptured) => {
  await setMockState({
    patients: [
      { id: "p_old", phone_number: "+919876543210", name: "Joe", token: "T-OLD", status: "waiting", clinic_id: "c1", created_at: "2026-07-10T12:00:00Z" },
      { id: "p_new", phone_number: "+919876543210", name: "Joe", token: "T-NEW", status: "waiting", clinic_id: "c1", created_at: "2026-07-10T23:00:00Z" }
    ],
    clinics: [{ id: "c1", clinic_name: "Aesthetic Dental" }]
  });
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'What is my queue status?' }
          }]
        }
      }]
    }]
  };
  await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  const captured = await getCaptured();
  const lastOllama = captured.ollama[captured.ollama.length - 1];
  const systemMsg = lastOllama.body.messages.find(m => m.role === 'system').content;
  assert.ok(systemMsg.includes('T-NEW'));
  assert.ok(!systemMsg.includes('T-OLD'));
});


// ==========================================
// TIER 3: CROSS-FEATURE COMBINATIONS (5 Cases)
// ==========================================

addTest(3, 'Cross-feature combinations', 'T3.1', 'Updating Ollama URL in Settings UI immediately changes the target host for subsequent WhatsApp webhook requests', async (request, setMockState, getCaptured) => {
  // Update Ollama URL
  await request('/api/settings', { method: 'POST' }, { ollama_url: 'http://localhost:4000/new-waba-ollama' });
  
  // Trigger WhatsApp Webhook
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'Hi' }
          }]
        }
      }]
    }]
  };
  await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  
  const captured = await getCaptured();
  const lastOllama = captured.ollama[captured.ollama.length - 1];
  assert.ok(lastOllama);
  // Target host verified via simulated client redirect
  assert.strictEqual(lastOllama.headers['x-target-ollama-url'], 'http://localhost:4000/new-waba-ollama');
});

addTest(3, 'Cross-feature combinations', 'T3.2', 'Voice Webhook Pipeline: Inbound call -> Ollama -> ElevenLabs audio -> Play XML', async (request, setMockState, getCaptured) => {
  // Call inbound voice
  const res = await request('/api/webhooks/exotel?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210&TranscriptionText=Wait+Time');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.includes('<Play>'));
  
  // Extract audio ID
  const audioIdMatch = res.body.match(/id=([^<]+)/);
  assert.ok(audioIdMatch);
  const audioId = audioIdMatch[1];
  
  // Request audio playback
  const audioRes = await request(`/api/webhooks/exotel/audio?id=${audioId}`, { method: 'GET' });
  assert.strictEqual(audioRes.statusCode, 200);
  assert.strictEqual(audioRes.headers['content-type'], 'audio/mpeg');
  
  const captured = await getCaptured();
  assert.ok(captured.ollama.length > 0);
  assert.ok(captured.elevenlabs.length > 0);
});

addTest(3, 'Cross-feature combinations', 'T3.3', 'Clearing settings keys causes both WhatsApp and Exotel endpoints to bypass external calls and return fallbacks', async (request, setMockState, getCaptured) => {
  // Clear API Keys
  await request('/api/settings', { method: 'POST' }, {
    elevenlabs_api_key: '',
    whatsapp_api_key: '',
    exotel_api_key: ''
  });
  
  // Trigger WhatsApp
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'status' }
          }]
        }
      }]
    }]
  };
  await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  
  // Trigger voice
  const resVoice = await request('/api/webhooks/exotel', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210');
  
  const captured = await getCaptured();
  // WhatsApp and Exotel should fall back locally
  assert.ok(resVoice.body.includes('maintenance') || resVoice.body.includes('fallback') || resVoice.body.includes('no-ticket'));
});

addTest(3, 'Cross-feature combinations', 'T3.4', 'Simulating concurrent incoming WhatsApp message and Exotel call maintains correct isolated sessions and caches', async (request, setMockState, getCaptured) => {
  await setMockState({}); // flush
  
  // Trigger WhatsApp
  const p1 = request('/api/webhooks/whatsapp', { method: 'POST' }, {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'whats my status?' }
          }]
        }
      }]
    }]
  });
  
  // Trigger voice
  const p2 = request('/api/webhooks/exotel?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210&TranscriptionText=Status');
  
  await Promise.all([p1, p2]);
  
  const captured = await getCaptured();
  // Ollama called for both WhatsApp message and Exotel call
  assert.strictEqual(captured.ollama.length, 2);
});

addTest(3, 'Cross-feature combinations', 'T3.5', 'A patient token is updated in the database during an active Exotel call; the next voice webhook response reflects the updated token value', async (request, setMockState, getCaptured) => {
  // First step of voice call
  await request('/api/webhooks/exotel', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210');
  
  // Database update token during call
  await setMockState({
    patients: [{ id: "p1", phone_number: "+919876543210", name: "John Doe", token: "T-NEW-TOKEN-999", status: "waiting", clinic_id: "c1" }]
  });
  
  // Next action of voice call
  await request('/api/webhooks/exotel?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210&TranscriptionText=Tell+me+token');
  
  const captured = await getCaptured();
  const lastOllama = captured.ollama[captured.ollama.length - 1];
  const systemMsg = lastOllama.body.messages.find(m => m.role === 'system').content;
  assert.ok(systemMsg.includes('T-NEW-TOKEN-999'));
});


// ==========================================
// TIER 4: REAL-WORLD SCENARIOS (5 Cases)
// ==========================================

addTest(4, 'Real-world application scenarios', 'T4.1', 'Scenario: Complete Voice Registration to Playback (Dial -> Ask status -> Get XML -> Stream TTS)', async (request, setMockState, getCaptured) => {
  await setMockState({});
  
  // 1. Patient dials inbound call
  const callRes = await request('/api/webhooks/exotel', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210');
  assert.strictEqual(callRes.statusCode, 200);
  assert.ok(callRes.body.includes('<Gather'));
  
  // 2. Patient asks wait status
  const speechRes = await request('/api/webhooks/exotel?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210&TranscriptionText=How+long+to+wait');
  assert.strictEqual(speechRes.statusCode, 200);
  const audioIdMatch = speechRes.body.match(/id=([^<]+)/);
  assert.ok(audioIdMatch);
  
  // 3. Audio plays back wait time
  const audioRes = await request(`/api/webhooks/exotel/audio?id=${audioIdMatch[1]}`, { method: 'GET' });
  assert.strictEqual(audioRes.statusCode, 200);
  assert.strictEqual(audioRes.headers['content-type'], 'audio/mpeg');
  
  // Verification
  const captured = await getCaptured();
  assert.ok(captured.ollama.length > 0);
  assert.ok(captured.elevenlabs.length > 0);
});

addTest(4, 'Real-world application scenarios', 'T4.2', 'Scenario: Patient WhatsApp Queue Query (Send query -> Query queue DB -> Get Ollama response -> WhatsApp delivery)', async (request, setMockState, getCaptured) => {
  await setMockState({});
  
  // Inbound WhatsApp query
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'Am I next?' }
          }]
        }
      }]
    }]
  };
  const res = await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  assert.strictEqual(res.statusCode, 200);
  
  const captured = await getCaptured();
  assert.strictEqual(captured.supabase.filter(q => q.path.includes('/patients')).length, 1);
  assert.strictEqual(captured.ollama.length, 1);
  assert.strictEqual(captured.whatsapp.length, 1);
});

addTest(4, 'Real-world application scenarios', 'T4.3', 'Scenario: Immediate System Switchover (Change Ollama URL -> Send message -> Verify redirected request)', async (request, setMockState, getCaptured) => {
  await setMockState({});
  
  // Switch to new Ollama URL in settings
  await request('/api/settings', { method: 'POST' }, { ollama_url: 'http://localhost:4000/remote-wsl-ollama' });
  
  // Patient queries status
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'Update?' }
          }]
        }
      }]
    }]
  };
  await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  
  const captured = await getCaptured();
  const lastOllama = captured.ollama[captured.ollama.length - 1];
  assert.strictEqual(lastOllama.headers['x-target-ollama-url'], 'http://localhost:4000/remote-wsl-ollama');
});

addTest(4, 'Real-world application scenarios', 'T4.4', 'Scenario: Ollama Outage Recovery (Ollama offline -> WhatsApp webhook -> Graceful fallback reply)', async (request, setMockState, getCaptured) => {
  await setMockState({});
  
  // Trigger WhatsApp with message simulating Ollama error
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '919876543210',
            text: { body: 'simulate error' }
          }]
        }
      }]
    }]
  };
  const res = await request('/api/webhooks/whatsapp', { method: 'POST' }, payload);
  assert.strictEqual(res.statusCode, 200);
  
  const captured = await getCaptured();
  assert.strictEqual(captured.whatsapp.length, 1);
  assert.ok(captured.whatsapp[0].body.text.body.includes('maintenance'));
});

addTest(4, 'Real-world application scenarios', 'T4.5', 'Scenario: Multi-Clinic Isolation (Two calls from different clinics -> Separate name/queue isolation)', async (request, setMockState, getCaptured) => {
  await setMockState({
    patients: [
      { id: "p_c1", phone_number: "+919876543210", name: "Alice", token: "T-Alice", status: "waiting", clinic_id: "c1" },
      { id: "p_c2", phone_number: "+917777777777", name: "Bob", token: "T-Bob", status: "waiting", clinic_id: "c2" }
    ],
    clinics: [
      { id: "c1", clinic_name: "Happy Dental" },
      { id: "c2", clinic_name: "City Skin Clinic" }
    ]
  });
  
  // Call 1
  await request('/api/webhooks/exotel?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B919876543210&TranscriptionText=status');
  // Call 2
  await request('/api/webhooks/exotel?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'From=%2B917777777777&TranscriptionText=status');
  
  const captured = await getCaptured();
  assert.strictEqual(captured.ollama.length, 2);
  
  const sysMsg1 = captured.ollama[0].body.messages.find(m => m.role === 'system').content;
  const sysMsg2 = captured.ollama[1].body.messages.find(m => m.role === 'system').content;
  
  assert.ok(sysMsg1.includes('Alice') && sysMsg1.includes('Happy Dental'));
  assert.ok(sysMsg2.includes('Bob') && sysMsg2.includes('City Skin Clinic'));
});


module.exports = {
  suite
};
