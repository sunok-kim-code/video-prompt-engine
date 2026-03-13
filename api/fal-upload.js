// Vercel serverless proxy for fal.ai file upload using official SDK
// Uses @fal-ai/client for reliable file upload to fal.ai CDN

const { fal } = require('@fal-ai/client');

// Disable Vercel's default body parser for raw multipart access
module.exports.config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Fal-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Get API key from header or env
    const apiKey = (req.headers['x-fal-key'] || '').trim()
      || (req.headers['authorization'] || '').replace(/^(Key |Bearer )/i, '').trim()
      || process.env.FAL_API_KEY || '';

    if (!apiKey) {
      return res.status(400).json({ error: 'FAL_API_KEY not provided' });
    }

    // Configure fal client with the API key
    fal.config({ credentials: apiKey });

    // Accept JSON body with base64 image data
    const { base64, mimeType } = req.body || {};
    if (!base64) {
      return res.status(400).json({ error: 'Missing base64 image data in request body' });
    }

    // Convert base64 to Blob/Buffer for upload
    const buffer = Buffer.from(base64, 'base64');
    const blob = new Blob([buffer], { type: mimeType || 'image/png' });

    console.log(`[fal-upload] Uploading ${buffer.length} bytes via fal SDK...`);

    // Use fal SDK to upload
    const url = await fal.storage.upload(blob);

    console.log(`[fal-upload] ✓ Upload succeeded: ${url}`);
    return res.status(200).json({ url, file_url: url });

  } catch (e) {
    console.error('[fal-upload] Error:', e.message, e.stack?.substring(0, 500));
    return res.status(500).json({ error: e.message });
  }
};
