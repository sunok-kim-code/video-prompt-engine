// Vercel Serverless Function: /api/ninjachat-images
// Proxies image generation requests to NinjaChat API to avoid CORS

const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = (req.body && req.body._apiKey) || req.headers['x-api-key'] || '';
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required', bodyKeys: Object.keys(req.body || {}) });
    }

    // Remove _apiKey from forwarded body
    const forwardBody = { ...req.body };
    delete forwardBody._apiKey;
    const postData = JSON.stringify(forwardBody);

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'ninjachat.ai',
        port: 443,
        path: '/api/v1/images',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: response.statusCode, data: { raw: data.substring(0, 500) } });
          }
        });
      });

      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('NinjaChat proxy error:', error.message);
    return res.status(500).json({ error: 'Proxy error: ' + error.message });
  }
};
