// Vercel Serverless Function: /api/ninjachat-images
// Proxies image generation requests to NinjaChat API to avoid CORS

const https = require('https');

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = typeof body === 'string' ? body : JSON.stringify(body);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (response) => {
      // Follow redirects (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        const redirectUrl = response.headers.location.startsWith('http')
          ? response.headers.location
          : `https://${parsed.hostname}${response.headers.location}`;
        return httpsPost(redirectUrl, headers, postData).then(resolve).catch(reject);
      }

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

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = (req.body && req.body._apiKey) || req.headers['x-api-key'] || '';
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const forwardBody = { ...req.body };
    delete forwardBody._apiKey;

    const result = await httpsPost('https://www.ninjachat.ai/api/v1/images', {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    }, forwardBody);

    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('NinjaChat proxy error:', error.message);
    return res.status(500).json({ error: 'Proxy error: ' + error.message });
  }
};
