// Vercel Serverless Function: /api/ninjachat-images
// Proxies image generation requests to NinjaChat API to avoid CORS

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try multiple sources for API key
    const apiKey = (req.body && req.body._apiKey)
      || req.headers['x-api-key']
      || (req.headers.authorization || '').replace('Bearer ', '');

    if (!apiKey || !apiKey.startsWith('nj_sk_')) {
      return res.status(401).json({
        error: 'Valid NinjaChat API key required',
        debug: {
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : [],
          hasXApiKey: !!req.headers['x-api-key'],
          hasAuth: !!req.headers.authorization
        }
      });
    }

    // Remove _apiKey from body before forwarding
    const forwardBody = {...req.body};
    delete forwardBody._apiKey;

    const response = await fetch('https://ninjachat.ai/api/v1/images', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(forwardBody)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('NinjaChat proxy error:', error.message);
    return res.status(500).json({ error: 'Proxy error: ' + error.message });
  }
};
