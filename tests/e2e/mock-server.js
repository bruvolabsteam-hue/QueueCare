const http = require('http');
const url = require('url');

let state = {
  global_settings: [],
  clinics: [],
  patients: []
};

let captured = {
  whatsapp: [],
  exotel: [],
  ollama: [],
  elevenlabs: [],
  supabase: []
};

function resetState() {
  state.global_settings = [
    {
      id: "d3b07384-d113-4c9f-a89c-499cf5b6ff9a",
      ollama_url: "http://localhost:4000/ollama",
      elevenlabs_api_key: "mock-elevenlabs-key",
      exotel_account_sid: "mock-exotel-sid",
      exotel_api_key: "mock-exotel-key",
      exotel_api_token: "mock-exotel-token",
      whatsapp_api_key: "mock-whatsapp-key",
      support_whatsapp_number: "+919876543210",
      updated_at: new Date().toISOString()
    }
  ];
  state.clinics = [
    {
      id: "c1c07384-d113-4c9f-a89c-499cf5b6ff9a",
      name: "General Clinic",
      clinic_name: "General Clinic"
    }
  ];
  state.patients = [
    {
      id: "p1b07384-d113-4c9f-a89c-499cf5b6ff9a",
      phone_number: "+919876543210",
      name: "John Doe",
      token: "T-101",
      status: "waiting",
      clinic_id: "c1c07384-d113-4c9f-a89c-499cf5b6ff9a",
      created_at: new Date().toISOString()
    }
  ];

  captured.whatsapp = [];
  captured.exotel = [];
  captured.ollama = [];
  captured.elevenlabs = [];
  captured.supabase = [];
}

resetState();

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS, DELETE, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, apikey, prefer, x-client-info');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  let bodyChunks = [];
  req.on('data', chunk => {
    bodyChunks.push(chunk);
  });

  req.on('end', () => {
    const rawBody = Buffer.concat(bodyChunks).toString();
    let body = {};
    if (rawBody && req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        // Safe fallback
      }
    }

    // Capture Supabase REST calls
    if (path.includes('/supabase/') || path.includes('/rest/v1/')) {
      captured.supabase.push({
        method: req.method,
        path: path,
        query: parsedUrl.query,
        headers: req.headers,
        body: body,
        rawBody: rawBody,
        timestamp: new Date().toISOString()
      });
    }

    // ROUTING

    // A. Control & Inspection Endpoints
    if (path === '/mock-inspect/state/reset' && req.method === 'POST') {
      resetState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', message: 'State and captured queues reset' }));
      return;
    }

    if (path === '/mock-inspect/state/set' && req.method === 'POST') {
      if (body.patients) state.patients = body.patients;
      if (body.clinics) state.clinics = body.clinics;
      if (body.global_settings) state.global_settings = body.global_settings;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', state }));
      return;
    }

    if (path === '/mock-inspect/state' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(state));
      return;
    }

    if (path === '/mock-inspect/whatsapp/last' && req.method === 'GET') {
      const last = captured.whatsapp[captured.whatsapp.length - 1] || null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(last));
      return;
    }

    if (path === '/mock-inspect/exotel/last' && req.method === 'GET') {
      const last = captured.exotel[captured.exotel.length - 1] || null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(last));
      return;
    }

    if (path === '/mock-inspect/ollama/last' && req.method === 'GET') {
      const last = captured.ollama[captured.ollama.length - 1] || null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(last));
      return;
    }

    if (path === '/mock-inspect/requests' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(captured));
      return;
    }

    // B. Supabase REST Mock
    if (path.includes('/global_settings')) {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        // Handle single selection Accept header or parameter
        if (req.headers['accept'] && req.headers['accept'].includes('vnd.pgrst.object')) {
          res.end(JSON.stringify(state.global_settings[0] || {}));
        } else {
          res.end(JSON.stringify(state.global_settings));
        }
        return;
      }
      if (req.method === 'PATCH') {
        // Update first setting row
        if (state.global_settings.length > 0) {
          state.global_settings[0] = { ...state.global_settings[0], ...body, updated_at: new Date().toISOString() };
        } else {
          state.global_settings.push({ id: "d3b07384-d113-4c9f-a89c-499cf5b6ff9a", ...body, updated_at: new Date().toISOString() });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(state.global_settings[0]));
        return;
      }
    }

    if (path.includes('/clinics')) {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(state.clinics));
        return;
      }
    }

    if (path.includes('/patients')) {
      if (req.method === 'GET') {
        let results = [...state.patients];
        
        // Simple filter parsing
        for (const [key, val] of Object.entries(parsedUrl.query)) {
          if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
          if (val.startsWith('eq.')) {
            const matchVal = val.substring(3);
            results = results.filter(p => String(p[key]) === matchVal);
          }
        }

        // Embed clinics join if select has clinic
        const selectParam = parsedUrl.query.select || '';
        if (selectParam.includes('clinic')) {
          results = results.map(p => {
            const patientWithClinic = { ...p };
            const clinic = state.clinics.find(c => c.id === p.clinic_id);
            if (clinic) {
              patientWithClinic.clinic = clinic;
            }
            return patientWithClinic;
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (req.headers['accept'] && req.headers['accept'].includes('vnd.pgrst.object')) {
          if (results.length > 0) {
            res.end(JSON.stringify(results[0]));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Patient not found' }));
          }
        } else {
          res.end(JSON.stringify(results));
        }
        return;
      }
    }

    if (path.includes('/rpc/generate_daily_token')) {
      if (req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token: "T-" + Math.floor(Math.random() * 900 + 100) }));
        return;
      }
    }

    // C. Ollama Mock API
    if (path.includes('/ollama/api/chat') || (path.includes('/api/chat') && req.headers['host'] && req.headers['host'].includes('localhost:4000'))) {
      captured.ollama.push({
        method: req.method,
        headers: req.headers,
        body: body,
        rawBody: rawBody,
        timestamp: new Date().toISOString()
      });

      // Simple response logic based on input query
      let replyContent = "Mock Ollama Response: Queue status normal.";
      const messages = body.messages || [];
      const userMessage = messages.find(m => m.role === 'user')?.content || '';
      
      if (userMessage.includes('wait') || userMessage.includes('status') || userMessage.includes('queue')) {
        replyContent = "Mock Ollama Response: You are currently number T-101 in the queue at General Clinic. Estimated wait is 15 minutes.";
      } else if (userMessage.includes('empty')) {
        replyContent = "";
      } else if (userMessage.includes('error')) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ollama model error simulation' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        model: body.model || "llama3",
        created_at: new Date().toISOString(),
        message: {
          role: "assistant",
          content: replyContent
        },
        done: true
      }));
      return;
    }

    // D. ElevenLabs Mock API
    if (path.includes('/v1/text-to-speech') || path.includes('/elevenlabs/')) {
      captured.elevenlabs.push({
        method: req.method,
        headers: req.headers,
        body: body,
        rawBody: rawBody,
        timestamp: new Date().toISOString()
      });

      const apiKey = req.headers['xi-api-key'] || '';
      if (apiKey === 'invalid-key') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { status: "unauthorized", message: "Invalid API key" } }));
        return;
      }
      if (apiKey === 'rate-limit-key') {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { status: "rate_limited", message: "Too many requests" } }));
        return;
      }

      // Return small mock MP3 buffer
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
      const mockAudio = Buffer.alloc(128, 0xAA); // mock binary representation
      res.end(mockAudio);
      return;
    }

    // E. WhatsApp Mock API
    if (path.includes('/messages') && (path.includes('/whatsapp/') || path.includes('/v19.0/'))) {
      captured.whatsapp.push({
        method: req.method,
        headers: req.headers,
        body: body,
        rawBody: rawBody,
        timestamp: new Date().toISOString()
      });

      const authHeader = req.headers['authorization'] || '';
      if (authHeader.includes('invalid-key') || authHeader.includes('invalid_key')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: "Invalid OAuth access token", type: "OAuthException", code: 190 } }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        messaging_product: "whatsapp",
        contacts: [{ input: body.to, wa_id: body.to }],
        messages: [{ id: "wamid.mockid_" + Math.random().toString(36).substring(7) }]
      }));
      return;
    }

    // F. Exotel Mock API
    if (path.includes('/Sms/send.json') || (path.includes('/exotel/') && path.includes('/Sms/'))) {
      captured.exotel.push({
        method: req.method,
        headers: req.headers,
        body: body,
        rawBody: rawBody,
        timestamp: new Date().toISOString()
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        RestResponse: {
          Status: "Success",
          Sid: "exotel-sms-sid-" + Math.random().toString(36).substring(7)
        }
      }));
      return;
    }

    // Fallback
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Mock endpoint not found', path }));
  });
});

if (require.main === module) {
  const PORT = process.env.MOCK_SERVER_PORT || 4000;
  server.listen(PORT, () => {
    console.log(`Mock server listening on port ${PORT}`);
  });
}

module.exports = {
  server,
  state,
  captured,
  resetState
};
