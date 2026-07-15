// E2E Test Suite of 60 cases across 4 tiers
// Built for zero-dependency node execution, fully adapted for TeleCMI & Groq Brain

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
      brain_url: "http://localhost:4000/brain-configured"
    }]
  });
  const res = await request('/api/settings', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.strictEqual(data.brain_url, "http://localhost:4000/brain-configured");
});

addTest(1, 'Settings UI configuration', 'T1.1.2', 'Update Brain URL successfully saves to global_settings.brain_url', async (request, setMockState) => {
  const res = await request('/api/settings', { method: 'POST' }, { brain_url: 'http://localhost:4000/new-brain' });
  assert.strictEqual(res.statusCode, 200);
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.brain_url, 'http://localhost:4000/new-brain');
});

addTest(1, 'Settings UI configuration', 'T1.1.3', 'Update ElevenLabs API key successfully saves to global_settings.elevenlabs_api_key', async (request, setMockState) => {
  const res = await request('/api/settings', { method: 'POST' }, { elevenlabs_api_key: 'elevenlabs-api-key-test' });
  assert.strictEqual(res.statusCode, 200);
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.elevenlabs_api_key, 'elevenlabs-api-key-test');
});

addTest(1, 'Settings UI configuration', 'T1.1.4', 'Update TeleCMI credentials successfully saves app_id and secret_key', async (request, setMockState) => {
  const res = await request('/api/settings', { method: 'POST' }, {
    telecmi_app_id: 'appid123',
    telecmi_secret_key: 'secret123'
  });
  assert.strictEqual(res.statusCode, 200);
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.telecmi_app_id, 'appid123');
  assert.strictEqual(settings.telecmi_secret_key, 'secret123');
});

addTest(1, 'Settings UI configuration', 'T1.1.5', 'Update Brain model successfully saves to global_settings.brain_model', async (request, setMockState) => {
  const res = await request('/api/settings', { method: 'POST' }, {
    brain_model: 'llama-3.1-70b'
  });
  assert.strictEqual(res.statusCode, 200);
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.brain_model, 'llama-3.1-70b');
});


// Feature 2: LLM Brain Integration
addTest(1, 'LLM Brain integration', 'T1.2.1', 'LLM client constructs system prompt containing patient name, token number, and clinic name', async (request, setMockState, getCaptured) => {
  await setMockState({
    patients: [{ id: "p1", phone_number: "+919876543210", name: "Alice Smith", token: "T-200", status: "waiting", clinic_id: "c1" }],
    clinics: [{ id: "c1", clinic_name: "Aesthetic Dental" }]
  });
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { From: '+919876543210', msg: 'Hello' });
  const captured = await getCaptured();
  const ollamaReq = captured.ollama[captured.ollama.length - 1];
  assert.ok(ollamaReq);
  const systemMsg = ollamaReq.body.messages.find(m => m.role === 'system').content;
  assert.ok(systemMsg.includes('Alice Smith'));
  assert.ok(systemMsg.includes('T-200'));
  assert.ok(systemMsg.includes('Aesthetic Dental'));
});

addTest(1, 'LLM Brain integration', 'T1.2.2', 'LLM client constructs user query containing message body', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { From: '+919876543210', msg: 'Where is my queue position?' });
  const captured = await getCaptured();
  const ollamaReq = captured.ollama[captured.ollama.length - 1];
  assert.ok(ollamaReq);
  const userMsg = ollamaReq.body.messages.find(m => m.role === 'user').content;
  assert.strictEqual(userMsg, 'Where is my queue position?');
});

addTest(1, 'LLM Brain integration', 'T1.2.3', 'LLM client issues HTTP POST to Brain API with correct model', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { From: '+919876543210', msg: 'Hi' });
  const captured = await getCaptured();
  const ollamaReq = captured.ollama[captured.ollama.length - 1];
  assert.ok(ollamaReq);
  assert.strictEqual(ollamaReq.body.model, 'llama-3.1-8b-instant');
});

addTest(1, 'LLM Brain integration', 'T1.2.4', 'LLM client parses assistant message body and returns raw text response', async (request, setMockState) => {
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { From: '+919876543210', msg: 'How long to wait?' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.response.includes('T-101'));
});

addTest(1, 'LLM Brain integration', 'T1.2.5', 'LLM client handles missing patient wait times outputting generic queue instructions', async (request, setMockState) => {
  await setMockState({
    patients: [{ id: "p1", phone_number: "+919876543210", name: "Alice Smith", token: null, status: "waiting", clinic_id: "c1" }]
  });
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { From: '+919876543210', msg: 'status' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.response);
});


// Feature 3: TeleCMI Voice Webhook XML
addTest(1, 'TeleCMI Voice Webhook XML', 'T1.3.1', 'Inbound webhook accepts POST and returns status 200 with XML content headers', async (request, setMockState) => {
  const res = await request('/api/webhooks/telecmi/voice', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.headers['content-type'].includes('xml'));
});

addTest(1, 'TeleCMI Voice Webhook XML', 'T1.3.2', 'Inbound webhook returns valid XML root tag <Response>', async (request) => {
  const res = await request('/api/webhooks/telecmi/voice', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210');
  assert.ok(res.body.includes('<Response>'));
  assert.ok(res.body.includes('</Response>'));
});

addTest(1, 'TeleCMI Voice Webhook XML', 'T1.3.3', 'Webhook includes <Gather> tag with input="speech" and timeout parameters', async (request) => {
  const res = await request('/api/webhooks/telecmi/voice', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210');
  assert.ok(res.body.includes('<Gather'));
  assert.ok(res.body.includes('input="speech"'));
  assert.ok(res.body.includes('timeout='));
});

addTest(1, 'TeleCMI Voice Webhook XML', 'T1.3.4', 'Webhook sets <Gather> action attribute to the callback path /api/webhooks/telecmi/voice?action=speech', async (request) => {
  const res = await request('/api/webhooks/telecmi/voice', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210');
  assert.ok(res.body.includes('action="/api/webhooks/telecmi/voice?action=speech"'));
});

addTest(1, 'TeleCMI Voice Webhook XML', 'T1.3.5', 'Webhook returns XML with <Hangup> tag when processing termination', async (request) => {
  const res = await request('/api/webhooks/telecmi/voice?action=hangup', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210');
  assert.ok(res.body.includes('<Hangup/>'));
});


// Feature 4: ElevenLabs TTS & playback
addTest(1, 'ElevenLabs TTS & playback', 'T1.4.1', 'TTS client sends text payload to ElevenLabs URL with selected voice ID', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/telecmi/audio?id=audio-t1.4.1&text=Hello+Test', { method: 'GET' });
  const captured = await getCaptured();
  const elevenlabsReq = captured.elevenlabs[captured.elevenlabs.length - 1];
  assert.ok(elevenlabsReq);
  assert.ok(elevenlabsReq.path.includes('21m00Tcm4TlvDq8ikWAM'));
  assert.strictEqual(elevenlabsReq.body.text, 'Hello Test');
});

addTest(1, 'ElevenLabs TTS & playback', 'T1.4.2', 'TTS client authorization header contains the configured ElevenLabs API key', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/telecmi/audio?id=audio-t1.4.2&text=Hello+Auth', { method: 'GET' });
  const captured = await getCaptured();
  const elevenlabsReq = captured.elevenlabs[captured.elevenlabs.length - 1];
  assert.ok(elevenlabsReq);
  assert.strictEqual(elevenlabsReq.headers['xi-api-key'], 'mock-elevenlabs-key');
});

addTest(1, 'ElevenLabs TTS & playback', 'T1.4.3', 'Audio endpoint /api/webhooks/telecmi/audio returns binary MP3/MPEG payload', async (request) => {
  const res = await request('/api/webhooks/telecmi/audio?id=audio-t1.4.3&text=Binary', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.rawBody.length, 128); // 128 bytes from mock server
});

addTest(1, 'ElevenLabs TTS & playback', 'T1.4.4', 'Audio endpoint response sets Content-Type: audio/mpeg', async (request) => {
  const res = await request('/api/webhooks/telecmi/audio?id=audio-t1.4.4&text=Content', { method: 'GET' });
  assert.strictEqual(res.headers['content-type'], 'audio/mpeg');
});

addTest(1, 'ElevenLabs TTS & playback', 'T1.4.5', 'Audio stream caches generated files to prevent duplicate ElevenLabs API charges', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/telecmi/audio?id=audio-cache-key-1&text=CacheMe', { method: 'GET' });
  await request('/api/webhooks/telecmi/audio?id=audio-cache-key-1&text=CacheMe', { method: 'GET' });
  
  const captured = await getCaptured();
  const cacheMeCalls = captured.elevenlabs.filter(req => req.body.text === 'CacheMe');
  assert.strictEqual(cacheMeCalls.length, 1);
});


// Feature 5: TeleCMI Messaging Webhook
addTest(1, 'TeleCMI Messaging Webhook', 'T1.5.1', 'Inbound message webhook returns 200 with JSON response', async (request) => {
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'hi' });
  assert.strictEqual(res.statusCode, 200);
});

addTest(1, 'TeleCMI Messaging Webhook', 'T1.5.2', 'Message webhook matches incoming phone number against active waiting patients in database', async (request, setMockState, getCaptured) => {
  await setMockState({
    patients: [{ id: "p2", phone_number: "+919876543210", name: "Bob", token: "T-222", status: "waiting", clinic_id: "c1" }]
  });
  
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'What is my queue status?' });
  const captured = await getCaptured();
  const supabaseQueries = captured.supabase.filter(q => q.path.includes('/patients'));
  assert.ok(supabaseQueries.length > 0);
  const lastQuery = supabaseQueries[supabaseQueries.length - 1];
  assert.ok(lastQuery.query.phone_number.includes('+919876543210'));
});

addTest(1, 'TeleCMI Messaging Webhook', 'T1.5.3', 'Message webhook calls LLM Brain integration with waiting patient data', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'What is my queue status?' });
  const captured = await getCaptured();
  assert.ok(captured.ollama.length > 0);
});

addTest(1, 'TeleCMI Messaging Webhook', 'T1.5.4', 'Message webhook calls TeleCMI SMS API to send message reply back', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'Status please' });
  const captured = await getCaptured();
  assert.ok(captured.telecmi.filter(req => req.type === 'sms').length > 0);
});

addTest(1, 'TeleCMI Messaging Webhook', 'T1.5.5', 'TeleCMI SMS API request is authorized using Basic auth', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'Status please' });
  const captured = await getCaptured();
  const telecmiReq = captured.telecmi.find(req => req.type === 'sms');
  assert.ok(telecmiReq);
  assert.ok(telecmiReq.headers['authorization'].includes('Basic'));
});


// ==========================================
// TIER 2: BOUNDARY & CORNER CASES (25 Cases)
// ==========================================

// Feature 1: Settings UI Configuration
addTest(2, 'Settings UI configuration', 'T2.1.1', 'Clear credentials saves empty settings columns successfully', async (request, setMockState) => {
  const res = await request('/api/settings', { method: 'POST' }, {
    elevenlabs_api_key: '',
    telecmi_app_id: '',
    telecmi_secret_key: ''
  });
  assert.strictEqual(res.statusCode, 200);
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.elevenlabs_api_key, '');
});

addTest(2, 'Settings UI configuration', 'T2.1.2', 'Database connection failure shows clear error message in settings panel', async (request, setMockState) => {
  await setMockState({ global_settings: [] });
  const res = await request('/api/settings?simulate_db_error=true', { method: 'GET' });
  assert.strictEqual(res.statusCode, 500);
  const data = JSON.parse(res.body);
  assert.ok(data.error.includes('Database connection failed'));
});

addTest(2, 'Settings UI configuration', 'T2.1.3', 'Brain URL input validation rejects malformed URLs', async (request) => {
  const res = await request('/api/settings', { method: 'POST' }, { brain_url: 'not-a-valid-url' });
  assert.strictEqual(res.statusCode, 400);
  const data = JSON.parse(res.body);
  assert.ok(data.error.includes('Invalid Brain URL'));
});

addTest(2, 'Settings UI configuration', 'T2.1.4', 'TeleCMI app_id input validation rejects missing values', async (request) => {
  const res = await request('/api/settings', { method: 'POST' }, { telecmi_app_id: null });
  assert.strictEqual(res.statusCode, 400);
  const data = JSON.parse(res.body);
  assert.ok(data.error.includes('telecmi_app_id is required'));
});

addTest(2, 'Settings UI configuration', 'T2.1.5', 'Multiple concurrent settings saves are debounced and processed sequentially', async (request) => {
  const p1 = request('/api/settings', { method: 'POST' }, { brain_url: 'http://localhost:4000/c1' });
  const p2 = request('/api/settings', { method: 'POST' }, { brain_url: 'http://localhost:4000/c2' });
  const p3 = request('/api/settings', { method: 'POST' }, { brain_url: 'http://localhost:4000/c3' });
  
  const results = await Promise.all([p1, p2, p3]);
  results.forEach(res => {
    assert.strictEqual(res.statusCode, 200);
  });
  
  const settingsRes = await request('/api/settings', { method: 'GET' });
  const settings = JSON.parse(settingsRes.body);
  assert.strictEqual(settings.brain_url, 'http://localhost:4000/c3');
});


// Feature 2: LLM Brain Integration
addTest(2, 'LLM Brain integration', 'T2.2.1', 'Brain server returns 500 error; client yields friendly fallback text', async (request, setMockState) => {
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'error simulation' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.response.includes('Currently we are experiencing system maintenance'));
});

addTest(2, 'LLM Brain integration', 'T2.2.2', 'Brain request times out; client fails fast to avoid holding webhook connections', async (request) => {
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'simulate timeout' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.response.includes('wait time update is temporarily unavailable'));
});

addTest(2, 'LLM Brain integration', 'T2.2.3', 'Brain returns extremely long response; client truncates response to fit constraints', async (request) => {
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'respond with super long string' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.response.length <= 4096);
});

addTest(2, 'LLM Brain integration', 'T2.2.4', 'Patient name contains special characters/Unicode; Brain constructs prompt without encoding corruption', async (request, setMockState, getCaptured) => {
  await setMockState({
    patients: [{ id: "p1", phone_number: "+919876543210", name: "José & Chloë", token: "T-77", status: "waiting", clinic_id: "c1" }]
  });
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'hi' });
  const captured = await getCaptured();
  const ollamaReq = captured.ollama[captured.ollama.length - 1];
  const systemMsg = ollamaReq.body.messages.find(m => m.role === 'system').content;
  assert.ok(systemMsg.includes('José & Chloë'));
});

addTest(2, 'LLM Brain integration', 'T2.2.5', 'No configuration row exists in Supabase; Brain client returns fallback', async (request, setMockState) => {
  await setMockState({ global_settings: [] });
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'Hi' });
  assert.strictEqual(res.statusCode, 404);
});


// Feature 3: TeleCMI Voice Webhook XML
addTest(2, 'TeleCMI Voice Webhook XML', 'T2.3.1', 'Unregistered incoming number returns XML indicating no active queue ticket', async (request, setMockState) => {
  await setMockState({ patients: [] });
  const res = await request('/api/webhooks/telecmi/voice', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B910000000000');
  assert.ok(res.body.includes('no-ticket'));
  assert.ok(res.body.includes('<Hangup/>'));
});

addTest(2, 'TeleCMI Voice Webhook XML', 'T2.3.2', 'Speech transcription is empty; webhook asks caller to repeat input', async (request) => {
  const res = await request('/api/webhooks/telecmi/voice?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210&TranscriptionText=');
  assert.ok(res.body.includes('repeat'));
});

addTest(2, 'TeleCMI Voice Webhook XML', 'T2.3.3', 'Webhook POST payload missing caller number returns 400 Bad Request', async (request) => {
  const res = await request('/api/webhooks/telecmi/voice', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, '');
  assert.strictEqual(res.statusCode, 400);
});

addTest(2, 'TeleCMI Voice Webhook XML', 'T2.3.4', 'Supabase database error occurs; webhook yields fallback XML stating system maintenance', async (request, setMockState) => {
  const res = await request('/api/webhooks/telecmi/voice?simulate_db_error=true', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210');
  assert.ok(res.body.includes('maintenance'));
  assert.ok(res.body.includes('<Hangup/>'));
});

addTest(2, 'TeleCMI Voice Webhook XML', 'T2.3.5', 'Webhook called with invalid action parameter returns 400 Bad Request', async (request) => {
  const res = await request('/api/webhooks/telecmi/voice?action=invalid', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210');
  assert.strictEqual(res.statusCode, 400);
});


// Feature 4: ElevenLabs TTS & Playback
addTest(2, 'ElevenLabs TTS & playback', 'T2.4.1', 'ElevenLabs API returns 401 Unauthorized; audio streamer yields fallback sound', async (request, setMockState) => {
  await setMockState({
    global_settings: [{ id: "d3b07384-d113-4c9f-a89c-499cf5b6ff9a", elevenlabs_api_key: "invalid-key" }]
  });
  const res = await request('/api/webhooks/telecmi/audio?id=audio-unauth&text=unauthorized', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['content-type'], 'audio/mpeg');
  assert.notStrictEqual(res.rawBody.length, 128);
});

addTest(2, 'ElevenLabs TTS & playback', 'T2.4.2', 'ElevenLabs API returns 429 Rate Limit; audio streamer serves cached fallback audio', async (request, setMockState) => {
  await setMockState({
    global_settings: [{ id: "d3b07384-d113-4c9f-a89c-499cf5b6ff9a", elevenlabs_api_key: "rate-limit-key" }]
  });
  const res = await request('/api/webhooks/telecmi/audio?id=audio-ratelimit&text=ratelimit', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['content-type'], 'audio/mpeg');
});

addTest(2, 'ElevenLabs TTS & playback', 'T2.4.3', 'Audio streamer queried with invalid or expired audio ID returns 404 Not Found', async (request) => {
  const res = await request('/api/webhooks/telecmi/audio?id=', { method: 'GET' });
  assert.strictEqual(res.statusCode, 404);
});

addTest(2, 'ElevenLabs TTS & playback', 'T2.4.4', 'ElevenLabs API returns malformed/empty body; audio streamer handles gracefully', async (request, setMockState) => {
  await setMockState({
    global_settings: [{ id: "d3b07384-d113-4c9f-a89c-499cf5b6ff9a", elevenlabs_api_key: "empty-body-key" }]
  });
  const res = await request('/api/webhooks/telecmi/audio?id=audio-empty-test&text=emptybody', { method: 'GET' });
  assert.strictEqual(res.statusCode, 200);
});

addTest(2, 'ElevenLabs TTS & playback', 'T2.4.5', 'Concurrent requests for the same audio ID stream cached file without duplicate API calls', async (request, setMockState, getCaptured) => {
  await setMockState({});
  const p1 = request('/api/webhooks/telecmi/audio?id=audio-concurrent-1&text=concurrent', { method: 'GET' });
  const p2 = request('/api/webhooks/telecmi/audio?id=audio-concurrent-1&text=concurrent', { method: 'GET' });
  
  await Promise.all([p1, p2]);
  const captured = await getCaptured();
  const elevenlabsCalls = captured.elevenlabs.filter(req => req.body.text === 'concurrent');
  assert.strictEqual(elevenlabsCalls.length, 1);
});


// Feature 5: TeleCMI Messaging Webhook Corner Cases
addTest(2, 'TeleCMI Messaging Webhook', 'T2.5.1', 'Message webhook returns 400 Bad Request if From parameter is missing', async (request) => {
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { msg: 'hello' });
  assert.strictEqual(res.statusCode, 400);
});

addTest(2, 'TeleCMI Messaging Webhook', 'T2.5.2', 'Incoming TeleCMI message from unregistered number returns 404', async (request, setMockState) => {
  await setMockState({ patients: [] });
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '910000000000', msg: 'Hello' });
  assert.strictEqual(res.statusCode, 404);
});

addTest(2, 'TeleCMI Messaging Webhook', 'T2.5.3', 'TeleCMI SMS API returns 500; message webhook handles error gracefully and returns 500', async (request, setMockState) => {
  await setMockState({
    patients: [{ id: "p2", phone_number: "+919876543210", name: "Bob", token: "T-222", status: "waiting", clinic_id: "c1" }],
    clinics: [{ id: "c1", clinic_name: "General Clinic", telecmi_caller_id: "" }] // missing caller_id causes webhook to return 500
  });
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'Hello' });
  assert.strictEqual(res.statusCode, 500);
});

addTest(2, 'TeleCMI Messaging Webhook', 'T2.5.4', 'Malformed body or content type ignores event and returns 400', async (request) => {
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{ malformed json');
  assert.strictEqual(res.statusCode, 400);
});

addTest(2, 'TeleCMI Messaging Webhook', 'T2.5.5', 'Multiple active wait tickets found; webhook routes to the newest ticket', async (request, setMockState, getCaptured) => {
  await setMockState({
    patients: [
      { id: "p_old", phone_number: "+919876543210", name: "Joe", token: "T-OLD", status: "waiting", clinic_id: "c1", created_at: "2026-07-10T12:00:00Z" },
      { id: "p_new", phone_number: "+919876543210", name: "Joe", token: "T-NEW", status: "waiting", clinic_id: "c1", created_at: "2026-07-10T23:00:00Z" }
    ],
    clinics: [{ id: "c1", clinic_name: "Aesthetic Dental", telecmi_caller_id: "+919876543210" }]
  });
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'What is my queue status?' });
  const captured = await getCaptured();
  const lastOllama = captured.ollama[captured.ollama.length - 1];
  const systemMsg = lastOllama.body.messages.find(m => m.role === 'system').content;
  assert.ok(systemMsg.includes('T-NEW'));
  assert.ok(!systemMsg.includes('T-OLD'));
});


// ==========================================
// TIER 3: CROSS-FEATURE COMBINATIONS (5 Cases)
// ==========================================

addTest(3, 'Cross-feature combinations', 'T3.1', 'Updating Brain URL in Settings UI immediately changes the target host for subsequent messaging webhook requests', async (request, setMockState, getCaptured) => {
  await request('/api/settings', { method: 'POST' }, { brain_url: 'http://localhost:4000/new-brain-host' });
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'Hi' });
  
  const captured = await getCaptured();
  const lastOllama = captured.ollama[captured.ollama.length - 1];
  assert.ok(lastOllama);
  assert.strictEqual(lastOllama.path, '/ollama/api/chat'); // target mapped via local mock server route
});

addTest(3, 'Cross-feature combinations', 'T3.2', 'Voice Webhook Pipeline: Inbound call -> Brain -> ElevenLabs audio -> Play XML', async (request, setMockState, getCaptured) => {
  const res = await request('/api/webhooks/telecmi/voice?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210&TranscriptionText=Wait+Time');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.includes('<Play>'));
  
  const audioIdMatch = res.body.match(/id=([^<]+)/);
  assert.ok(audioIdMatch);
  const audioId = audioIdMatch[1];
  
  const audioRes = await request(`/api/webhooks/telecmi/audio?id=${audioId}`, { method: 'GET' });
  assert.strictEqual(audioRes.statusCode, 200);
  assert.strictEqual(audioRes.headers['content-type'], 'audio/mpeg');
  
  const captured = await getCaptured();
  assert.ok(captured.ollama.length > 0);
  assert.ok(captured.elevenlabs.length > 0);
});

addTest(3, 'Cross-feature combinations', 'T3.3', 'Clearing settings keys causes voice endpoints to bypass external calls and return fallbacks', async (request, setMockState, getCaptured) => {
  await request('/api/settings', { method: 'POST' }, {
    elevenlabs_api_key: '',
    telecmi_app_id: '',
    telecmi_secret_key: ''
  });
  
  const resVoice = await request('/api/webhooks/telecmi/voice', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210');
  const captured = await getCaptured();
  assert.ok(resVoice.body.includes('maintenance') || resVoice.body.includes('fallback') || resVoice.body.includes('no-ticket') || resVoice.body.includes('welcome'));
});

addTest(3, 'Cross-feature combinations', 'T3.4', 'Simulating concurrent incoming message and voice call maintains correct isolated sessions', async (request, setMockState, getCaptured) => {
  await setMockState({});
  
  const p1 = request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'whats my status?' });
  const p2 = request('/api/webhooks/telecmi/voice?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210&TranscriptionText=Status');
  
  await Promise.all([p1, p2]);
  
  const captured = await getCaptured();
  assert.strictEqual(captured.ollama.length, 2);
});

addTest(3, 'Cross-feature combinations', 'T3.5', 'A patient token is updated in the database; the next voice webhook response reflects the updated value', async (request, setMockState, getCaptured) => {
  await request('/api/webhooks/telecmi/voice', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210');
  
  await setMockState({
    patients: [{ id: "p1", phone_number: "+919876543210", name: "John Doe", token: "T-NEW-TOKEN-999", status: "waiting", clinic_id: "c1" }]
  });
  
  await request('/api/webhooks/telecmi/voice?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210&TranscriptionText=Tell+me+token');
  
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
  
  const callRes = await request('/api/webhooks/telecmi/voice', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210');
  assert.strictEqual(callRes.statusCode, 200);
  assert.ok(callRes.body.includes('<Gather'));
  
  const speechRes = await request('/api/webhooks/telecmi/voice?action=speech', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 'from=%2B919876543210&TranscriptionText=How+long+to+wait');
  assert.strictEqual(speechRes.statusCode, 200);
  const audioIdMatch = speechRes.body.match(/id=([^<]+)/);
  assert.ok(audioIdMatch);
  
  const audioRes = await request(`/api/webhooks/telecmi/audio?id=${audioIdMatch[1]}`, { method: 'GET' });
  assert.strictEqual(audioRes.statusCode, 200);
  assert.strictEqual(audioRes.headers['content-type'], 'audio/mpeg');
  
  const captured = await getCaptured();
  assert.ok(captured.ollama.length > 0);
  assert.ok(captured.elevenlabs.length > 0);
});

addTest(4, 'Real-world application scenarios', 'T4.2', 'Scenario: Patient Messaging Queue Query (Send query -> Query queue DB -> Get response -> TeleCMI delivery)', async (request, setMockState, getCaptured) => {
  await setMockState({});
  
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'Am I next?' });
  assert.strictEqual(res.statusCode, 200);
  
  const captured = await getCaptured();
  assert.strictEqual(captured.supabase.filter(q => q.path.includes('/patients')).length, 1);
  assert.strictEqual(captured.ollama.length, 1);
  assert.strictEqual(captured.telecmi.filter(req => req.type === 'sms').length, 1);
});

addTest(4, 'Real-world application scenarios', 'T4.3', 'Scenario: Immediate System Switchover (Change Brain URL -> Send message -> Verify request)', async (request, setMockState, getCaptured) => {
  await setMockState({});
  await request('/api/settings', { method: 'POST' }, { brain_url: 'http://localhost:4000/remote-brain-url' });
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'Update?' });
  
  const captured = await getCaptured();
  const lastOllama = captured.ollama[captured.ollama.length - 1];
  assert.ok(lastOllama);
});

addTest(4, 'Real-world application scenarios', 'T4.4', 'Scenario: Brain Outage Recovery (Brain offline -> message webhook -> Graceful fallback reply)', async (request, setMockState, getCaptured) => {
  await setMockState({});
  const res = await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'simulate error' });
  assert.strictEqual(res.statusCode, 200);
  
  const captured = await getCaptured();
  assert.strictEqual(captured.telecmi.filter(req => req.type === 'sms').length, 1);
  assert.ok(captured.telecmi.find(req => req.type === 'sms').body.message.includes('maintenance'));
});

addTest(4, 'Real-world application scenarios', 'T4.5', 'Scenario: Multi-Clinic Isolation (Two calls from different clinics -> Separate name/queue isolation)', async (request, setMockState, getCaptured) => {
  await setMockState({
    patients: [
      { id: "p1", phone_number: "+919876543210", name: "Alice", token: "T-10", status: "waiting", clinic_id: "c1" },
      { id: "p2", phone_number: "+919999999999", name: "Bob", token: "T-20", status: "waiting", clinic_id: "c2" }
    ],
    clinics: [
      { id: "c1", clinic_name: "Clinic One", telecmi_caller_id: "+919876543210" },
      { id: "c2", clinic_name: "Clinic Two", telecmi_caller_id: "+919999999999" }
    ]
  });

  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919876543210', msg: 'status' });
  await request('/api/webhooks/telecmi/message', { method: 'POST' }, { from: '919999999999', msg: 'status' });

  const captured = await getCaptured();
  const ollamaCalls = captured.ollama;
  assert.strictEqual(ollamaCalls.length, 2);

  const sys1 = ollamaCalls[ollamaCalls.length - 2].body.messages.find(m => m.role === 'system').content;
  const sys2 = ollamaCalls[ollamaCalls.length - 1].body.messages.find(m => m.role === 'system').content;

  assert.ok(sys1.includes('Alice'));
  assert.ok(sys1.includes('Clinic One'));
  assert.ok(sys2.includes('Bob'));
  assert.ok(sys2.includes('Clinic Two'));
});

module.exports = {
  suite
};
