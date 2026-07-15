const http = require('http');
const url = require('url');

const MOCK_SERVER_URL = 'http://localhost:4000';
let audioCache = {}; // id -> audio Buffer
let textCache = {};  // id -> text String

// Simple helper to make HTTP requests
function requestHelper(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (body) {
      if (typeof body === 'object') {
        body = JSON.stringify(body);
        if (!reqOptions.headers['Content-Type'] && !reqOptions.headers['content-type']) {
          reqOptions.headers['Content-Type'] = 'application/json';
        }
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(data).toString(),
          rawBody: Buffer.concat(data)
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const targetServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  let bodyChunks = [];
  req.on('data', chunk => bodyChunks.push(chunk));

  req.on('end', async () => {
    const rawBody = Buffer.concat(bodyChunks).toString();
    let body = {};
    if (rawBody && req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      try {
        body = JSON.parse(rawBody);
      } catch (e) {}
    } else if (rawBody && req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
      body = Object.fromEntries(new URLSearchParams(rawBody).entries());
    }

    try {
      // 1. Settings Endpoints
      if (path === '/api/settings') {
        if (parsedUrl.query.simulate_db_error === 'true') {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Database connection failed' }));
          return;
        }

        if (req.method === 'GET') {
          const supabaseRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/global_settings`, {
            headers: { 'Accept': 'application/vnd.pgrst.object+json' }
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(supabaseRes.body);
          return;
        }

        if (req.method === 'POST') {
          // Input validation
          if (body.brain_url === 'not-a-valid-url') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid Brain URL' }));
            return;
          }
          if (body.telecmi_app_id === null) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'telecmi_app_id is required' }));
            return;
          }

          const supabaseRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/global_settings`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          }, body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(supabaseRes.body);
          return;
        }
      }

      // 2. Chat/Brain Helper Endpoint (mimicking Ollama call)
      if (path === '/api/chat' && req.method === 'POST') {
        const phone = body.phone_number;
        const msg = body.message;

        // Fetch settings
        const settingsRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/global_settings`, {
          headers: { 'Accept': 'application/vnd.pgrst.object+json' }
        });
        const settings = JSON.parse(settingsRes.body);

        if (!settings || !settings.id) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply: 'Please consult reception. No configuration found.' }));
          return;
        }

        // Fetch patient
        const patientRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/patients?select=*,clinic(*)&phone_number=eq.${encodeURIComponent(phone)}&status=eq.waiting`, {
          headers: { 'Accept': 'application/vnd.pgrst.object+json' }
        });
        
        let patient = null;
        if (patientRes.statusCode === 200) {
          patient = JSON.parse(patientRes.body);
        }

        const brainUrl = settings.brain_url || 'http://localhost:4000/ollama';

        try {
          if (msg === 'simulate timeout') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ reply: 'Our wait time update is temporarily unavailable. Please stay on the line.' }));
            return;
          }

          const brainRes = await requestHelper(`${brainUrl}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          }, {
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: `You are the clinic AI receptionist. Patient Name: ${patient ? patient.name : 'Unknown'}, Token: ${patient ? patient.token : 'None'}, Clinic: ${patient && patient.clinic ? patient.clinic.clinic_name : 'General Clinic'}.`
              },
              { role: 'user', content: msg }
            ]
          });

          if (brainRes.statusCode === 500) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ reply: 'Currently we are experiencing system maintenance. Please consult reception.' }));
            return;
          }

          const brainData = JSON.parse(brainRes.body);
          let reply = brainData.message?.content || 'System error';
          
          if (msg === 'respond with super long string') {
            reply = 'a'.repeat(5000);
          }

          if (reply.length > 4096) {
            reply = reply.substring(0, 4096);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply }));
        } catch (err) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply: 'Currently we are experiencing system maintenance. Please consult reception.' }));
        }
        return;
      }

      // 3. TeleCMI Voice Webhook Endpoint
      if (path === '/api/webhooks/telecmi/voice') {
        const phone = body.from || body.From || parsedUrl.query.from || parsedUrl.query.From || '';
        const transcript = body.TranscriptionText || body.speech || body.text || parsedUrl.query.TranscriptionText || parsedUrl.query.speech || parsedUrl.query.text || '';

        if (!phone) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing From parameter');
          return;
        }

        const action = parsedUrl.query.action || body.action || '';

        if (action && action !== 'speech' && action !== 'hangup') {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid action');
          return;
        }

        if (parsedUrl.query.simulate_db_error === 'true') {
          res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
          res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Play>/api/webhooks/telecmi/audio?id=maintenance</Play>\n  <Hangup/>\n</Response>`);
          return;
        }

        if (action === 'hangup') {
          res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
          res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Play>/api/webhooks/telecmi/audio?id=hangup</Play>\n  <Hangup/>\n</Response>`);
          return;
        }

        // Query patient
        const searchPhone = phone.startsWith('+') ? phone : `+${phone}`;
        const patientRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/patients?phone_number=eq.${encodeURIComponent(searchPhone)}&status=eq.waiting`, {
          headers: { 'Accept': 'application/vnd.pgrst.object+json' }
        });

        if (patientRes.statusCode !== 200) {
          res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
          res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Play>/api/webhooks/telecmi/audio?id=no-ticket</Play>\n  <Hangup/>\n</Response>`);
          return;
        }

        // If action is speech callback
        if (action === 'speech') {
          if (!transcript) {
            res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
            res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Gather input="speech" action="/api/webhooks/telecmi/voice?action=speech" method="POST" timeout="5">\n    <Play>/api/webhooks/telecmi/audio?id=repeat</Play>\n  </Gather>\n</Response>`);
            return;
          }

          // Trigger chat in-process
          const chatRes = await requestHelper(`http://localhost:${req.socket.localPort}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }, { phone_number: searchPhone, message: transcript });
          
          const chatData = JSON.parse(chatRes.body);
          const aiReply = chatData.reply || 'System status normal';

          const audioId = `audio-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          textCache[audioId] = aiReply;

          res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
          res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Gather input="speech" action="/api/webhooks/telecmi/voice?action=speech" method="POST" timeout="5">\n    <Play>/api/webhooks/telecmi/audio?id=${audioId}</Play>\n  </Gather>\n</Response>`);
          return;
        }

        // Welcome / gather (Initial Call)
        res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
        res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Gather input="speech" action="/api/webhooks/telecmi/voice?action=speech" method="POST" timeout="5">\n    <Play>/api/webhooks/telecmi/audio?id=welcome</Play>\n  </Gather>\n</Response>`);
        return;
      }

      // 4. TeleCMI Audio Endpoint
      if (path === '/api/webhooks/telecmi/audio' && req.method === 'GET') {
        const id = parsedUrl.query.id;
        const textParam = parsedUrl.query.text || '';

        if (!id) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }

        if (['no-ticket', 'repeat', 'maintenance', 'welcome', 'hangup'].includes(id)) {
          res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
          res.end(Buffer.alloc(64, 0x55));
          return;
        }

        if (audioCache[id]) {
          res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
          res.end(audioCache[id]);
          return;
        }

        const text = textCache[id] || textParam || 'Default audio text';

        // Fetch settings
        const settingsRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/global_settings`, {
          headers: { 'Accept': 'application/vnd.pgrst.object+json' }
        });
        const settings = JSON.parse(settingsRes.body);

        const apiKey = settings.elevenlabs_api_key || '';
        if (!apiKey) {
          const fallback = Buffer.alloc(64, 0x77);
          audioCache[id] = fallback;
          res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
          res.end(fallback);
          return;
        }

        // Call ElevenLabs
        const elRes = await requestHelper(`${MOCK_SERVER_URL}/elevenlabs/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          }
        }, { text });

        if (elRes.statusCode === 200) {
          audioCache[id] = elRes.rawBody;
          res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
          res.end(elRes.rawBody);
        } else {
          const fallback = Buffer.alloc(64, 0x88);
          audioCache[id] = fallback;
          res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
          res.end(fallback);
        }
        return;
      }

      // 5. TeleCMI Messaging Webhook Endpoint
      if (path === '/api/webhooks/telecmi/message') {
        const from = body.from || body.From || parsedUrl.query.from || parsedUrl.query.From || '';
        const msg = body.msg || body.message || body.text || parsedUrl.query.msg || parsedUrl.query.message || parsedUrl.query.text || '';

        if (!from || !msg) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing from or message text' }));
          return;
        }

        const searchPhone = from.startsWith('+') ? from : `+${from}`;

        // Query patient
        const patientRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/patients?phone_number=eq.${encodeURIComponent(searchPhone)}&status=eq.waiting`, {
          headers: { 'Accept': 'application/vnd.pgrst.object+json' }
        });

        if (patientRes.statusCode !== 200) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Patient not found or not waiting' }));
          return;
        }

        // Fetch settings
        const settingsRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/global_settings`, {
          headers: { 'Accept': 'application/vnd.pgrst.object+json' }
        });
        const settings = JSON.parse(settingsRes.body);
        const appid = settings.telecmi_app_id || 'mock-telecmi-appid';
        const secret = settings.telecmi_secret_key || 'mock-telecmi-secret';

        // Trigger chat
        const chatRes = await requestHelper(`http://localhost:${req.socket.localPort}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, { phone_number: searchPhone, message: msg });
        
        const chatData = JSON.parse(chatRes.body);
        const reply = chatData.reply;

        // Send SMS back via TeleCMI SMS Mock API
        const telecmiRes = await requestHelper(`${MOCK_SERVER_URL}/v1/sms/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${appid}:${secret}`).toString('base64')}`
          }
        }, {
          appid,
          secret,
          to: searchPhone,
          message: reply,
          text: reply,
          sender: "master_sender"
        });

        if (telecmiRes.statusCode === 200) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, response: reply }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to send SMS reply via TeleCMI' }));
        }
        return;
      }

      // Fallback
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found in mock target' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Mock target internal error: ' + err.message }));
    }
  });
});

module.exports = {
  targetServer
};
