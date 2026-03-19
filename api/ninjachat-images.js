// Vercel Serverless Function: /api/ninjachat-images
// Proxies image generation requests to NinjaChat API to avoid CORS

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract API key from body (avoids Vercel stripping Authorization header)
    const { _apiKey, ...bodyWithoutKey } = req.body || {};
    if (!_apiKey) {
      return res.status(401).json({ error: 'API key required in _apiKey field' });
    }

    const response = await fetch('https://ninjachat.ai/api/v1/images', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + _apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyWithoutKey)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('NinjaChat proxy error:', error.message);
    return res.status(500).json({ error: 'Proxy error: ' + error.message });
  }
};
