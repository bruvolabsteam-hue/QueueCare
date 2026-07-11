const http = require('http');

const url = 'http://127.0.0.1:54321/rest/v1/global_settings?select=*';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const req = http.request(url, {
  method: 'GET',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', res.headers);
    console.log('BODY:', body);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
