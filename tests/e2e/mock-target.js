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
      // Parse form encoded body
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
          if (body.ollama_url === 'not-a-valid-url') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid Ollama URL' }));
            return;
          }
          if (body.exotel_api_key === 'nocolon') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Format must be KEY:TOKEN' }));
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

      // 2. Ollama /api/chat Endpoint
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
        const patientRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/patients?phone_number=eq.${encodeURIComponent(phone)}&status=eq.waiting`, {
          headers: { 'Accept': 'application/vnd.pgrst.object+json' }
        });
        
        let patient = null;
        if (patientRes.statusCode === 200) {
          patient = JSON.parse(patientRes.body);
        }

        // Get configured Ollama URL
        const ollamaUrl = settings.ollama_url || 'http://localhost:4000/ollama';

        // Call Ollama
        try {
          if (msg === 'simulate timeout') {
            // Fast timeout fallback
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ reply: 'Our wait time update is temporarily unavailable. Please stay on the line.' }));
            return;
          }

          const ollamaRes = await requestHelper(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-target-ollama-url': ollamaUrl // Pass this header so mock server captures it
            }
          }, {
            model: 'llama3',
            messages: [
              {
                role: 'system',
                content: `You are the clinic AI receptionist. Patient Name: ${patient ? patient.name : 'Unknown'}, Token: ${patient ? patient.token : 'None'}, Clinic: ${patient && patient.clinic ? patient.clinic.clinic_name : 'General Clinic'}.`
              },
              { role: 'user', content: msg }
            ]
          });

          if (ollamaRes.statusCode === 500) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ reply: 'Currently we are experiencing system maintenance. Please consult reception.' }));
            return;
          }

          const ollamaData = JSON.parse(ollamaRes.body);
          let reply = ollamaData.message?.content || 'System error';
          
          if (msg === 'respond with super long string') {
            reply = 'a'.repeat(5000); // Simulate long response
          }

          // Truncate reply if exceeds WhatsApp limits
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

      // 3. Exotel Webhook Endpoint
      if (path === '/api/webhooks/exotel' && req.method === 'POST') {
        const phone = body.From || '';
        const transcript = body.TranscriptionText || '';

        if (!phone) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing From parameter');
          return;
        }

        if (parsedUrl.query.action === 'invalid') {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid action');
          return;
        }

        if (parsedUrl.query.simulate_db_error === 'true') {
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Play>/api/webhooks/exotel/audio?id=maintenance</Play><Hangup/></Response>`);
          return;
        }

        if (parsedUrl.query.action === 'hangup') {
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Play>/api/webhooks/exotel/audio?id=hangup</Play><Hangup/></Response>`);
          return;
        }

        // Query patient
        const patientRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/patients?phone_number=eq.${encodeURIComponent(phone)}&status=eq.waiting`, {
          headers: { 'Accept': 'application/vnd.pgrst.object+json' }
        });

        if (patientRes.statusCode !== 200) {
          // Patient not found in waiting queue
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Play>/api/webhooks/exotel/audio?id=no-ticket</Play><Hangup/></Response>`);
          return;
        }

        // If action is speech callback
        if (parsedUrl.query.action === 'speech') {
          if (!transcript) {
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech" action="/api/webhooks/exotel?action=speech" method="POST" timeout="5"><Play>/api/webhooks/exotel/audio?id=repeat</Play></Gather></Response>`);
            return;
          }

          // Trigger chat in-process
          const chatRes = await requestHelper(`http://localhost:${req.socket.localPort}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }, { phone_number: phone, message: transcript });
          
          const chatData = JSON.parse(chatRes.body);
          const aiReply = chatData.reply || 'System status normal';

          const audioId = `audio-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          textCache[audioId] = aiReply;

          res.writeHead(200, { 'Content-Type': 'text/xml' });
          res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech" action="/api/webhooks/exotel?action=speech" method="POST" timeout="5"><Play>/api/webhooks/exotel/audio?id=${audioId}</Play></Gather></Response>`);
          return;
        }

        // Welcome / gather
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech" action="/api/webhooks/exotel?action=speech" method="POST" timeout="5"><Play>/api/webhooks/exotel/audio?id=welcome</Play></Gather></Response>`);
        return;
      }

      // 4. ElevenLabs Audio Endpoint
      if (path === '/api/webhooks/exotel/audio' && req.method === 'GET') {
        const id = parsedUrl.query.id;
        const textParam = parsedUrl.query.text || '';

        if (!id) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }

        // Static fallbacks
        if (['no-ticket', 'repeat', 'maintenance', 'welcome', 'hangup'].includes(id)) {
          res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
          res.end(Buffer.alloc(64, 0x55)); // Small dummy audio
          return;
        }

        // Cache hit check
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
          // fallback without ElevenLabs
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
          // fallback
          const fallback = Buffer.alloc(64, 0x88);
          audioCache[id] = fallback;
          res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
          res.end(fallback);
        }
        return;
      }

      // 5. WhatsApp Webhook Endpoints
      if (path === '/api/webhooks/whatsapp') {
        if (req.method === 'GET') {
          const mode = parsedUrl.query['hub.mode'];
          const token = parsedUrl.query['hub.verify_token'];
          const challenge = parsedUrl.query['hub.challenge'];

          if (mode === 'subscribe' && token === 'bruvoflow_secure_webhook') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(challenge);
          } else {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
          }
          return;
        }

        if (req.method === 'POST') {
          // WhatsApp events
          if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const val = changes?.value;
            const messages = val?.messages;

            if (messages && messages.length > 0) {
              const message = messages[0];
              const fromNumber = message.from;
              let text = message.text?.body || '';

              if (fromNumber) {
                const searchPhone = fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`;

                // Query patient
                const patientRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/patients?phone_number=eq.${encodeURIComponent(searchPhone)}&status=eq.waiting`, {
                  headers: { 'Accept': 'application/vnd.pgrst.object+json' }
                });

                // Fetch settings
                const settingsRes = await requestHelper(`${MOCK_SERVER_URL}/supabase/v1/global_settings`, {
                  headers: { 'Accept': 'application/vnd.pgrst.object+json' }
                });
                const settings = JSON.parse(settingsRes.body);
                const waKey = settings.whatsapp_api_key || 'mock-whatsapp-key';

                if (patientRes.statusCode !== 200) {
                  // Send reception fallback
                  await requestHelper(`${MOCK_SERVER_URL}/whatsapp/v19.0/mock-waba-id/messages`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${waKey}`
                    }
                  }, {
                    messaging_product: "whatsapp",
                    to: fromNumber,
                    text: { body: "I'm sorry, I couldn't find an active queue ticket for this phone number. Please check with the clinic reception." }
                  });
                } else {
                  // Trigger chat
                  const chatRes = await requestHelper(`http://localhost:${req.socket.localPort}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  }, { phone_number: searchPhone, message: text });
                  
                  const chatData = JSON.parse(chatRes.body);
                  const reply = chatData.reply;

                  // Send message back
                  await requestHelper(`${MOCK_SERVER_URL}/whatsapp/v19.0/mock-waba-id/messages`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${waKey}`
                    }
                  }, {
                    messaging_product: "whatsapp",
                    to: fromNumber,
                    text: { body: reply }
                  });
                }
              }
            }
          }

          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('EVENT_RECEIVED');
          return;
        }
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
