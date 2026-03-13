// Vercel serverless proxy for fal.ai file upload
// Browser cannot call fal.ai storage directly due to CORS restrictions
const FAL_UPLOAD_URL = 'https://fal.ai/api/storage/upload';

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get API key from request header or env
    const authHeader = req.headers['authorization'] || '';
    const apiKey = authHeader.replace('Key ', '') || process.env.FAL_API_KEY || '';

    if (!apiKey) {
      return res.status(400).json({ error: 'FAL_API_KEY not provided' });
    }

    // Read the raw body as buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Forward the multipart request to fal.ai
    const contentType = req.headers['content-type'] || '';

    // Try multiple fal.ai upload endpoints
    const endpoints = [
      'https://fal.ai/api/storage/upload',
      'https://v3.fal.media/files/upload',
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const falRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': 'Key ' + apiKey,
            'Content-Type': contentType,
          },
          body: body,
        });

        if (falRes.ok) {
          const data = await falRes.json();
          return res.status(200).json(data);
        }

        lastError = `${endpoint}: ${falRes.status} ${await falRes.text().catch(() => '')}`;
        console.warn('[fal-upload] Failed:', lastError);
      } catch (e) {
        lastError = `${endpoint}: ${e.message}`;
        console.warn('[fal-upload] Error:', lastError);
      }
    }

    // All endpoints failed — try initiating upload via fal.ai REST queue
    // The fal queue API accepts base64 data URLs inline, so as last resort
    // we can return the body as a data URL
    return res.status(502).json({ error: 'All fal.ai upload endpoints failed', detail: lastError });

  } catch (e) {
    console.error('[fal-upload] Server error:', e);
    return res.status(500).json({ error: e.message });
  }
};
