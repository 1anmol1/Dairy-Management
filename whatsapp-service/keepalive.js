const http = require('http');
const https = require('https');

// Use APP_URL from env or fallback to localhost
const appUrl = process.env.APP_URL || 'http://localhost:3001/api/whatsapp/health';

console.log(`[KEEPALIVE] Triggered keep-alive check for: ${appUrl}`);

const client = appUrl.startsWith('https') ? https : http;

const req = client.get(appUrl, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log(`[KEEPALIVE] Response status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log(`[KEEPALIVE] System status is healthy!`);
    } else {
      console.warn(`[KEEPALIVE] Warning: Response body: ${body}`);
    }
  });
});

req.on('error', (err) => {
  console.error(`[KEEPALIVE] Error hitting endpoint:`, err.message);
});

req.end();
