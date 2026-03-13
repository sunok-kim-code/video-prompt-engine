// Vercel serverless proxy for fal.ai file upload
// Browser cannot call fal.ai storage directly due to CORS restrictions
// IMPORTANT: bodyParser must be disabled for multipart forwarding

// Disable Vercel's default body parser to get raw multipart data
module.exports.config = {
  api: { bodyParser: false }
};

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
    const apiKey = authHeader.replace(/^(Key |Bearer )/i, '').trim() || process.env.FAL_API_KEY || '';

    if (!apiKey) {
      return res.status(400).json({ error: 'FAL_API_KEY not provided' });
    }

    // Read raw body as buffer (body parser is disabled)
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';

    console.log(`[fal-upload] Received ${rawBody.length} bytes, content-type: ${contentType.substring(0, 80)}`);

    // Try upload endpoints with different auth formats
    const attempts = [
      { url: 'https://fal.ai/api/storage/upload', auth: 'Key ' + apiKey },
      { url: 'https://fal.ai/api/storage/upload', auth: 'Bearer ' + apiKey },
      { url: 'https://v3.fal.media/files/upload', auth: 'Key ' + apiKey },
      { url: 'https://v3.fal.media/files/upload', auth: 'Bearer ' + apiKey },
      { url: 'https://rest.alpha.fal.ai/storage/upload/file', auth: 'Key ' + apiKey },
      { url: 'https://rest.alpha.fal.ai/storage/upload/file', auth: 'Bearer ' + apiKey },
    ];

    let lastError = null;

    for (const attempt of attempts) {
      try {
        console.log(`[fal-upload] Trying: ${attempt.url} (auth: ${attempt.auth.substring(0, 10)}...)`);
        const falRes = await fetch(attempt.url, {
          method: 'POST',
          headers: {
            'Authorization': attempt.auth,
            'Content-Type': contentType,
          },
          body: rawBody,
        });

        const status = falRes.status;
        if (falRes.ok) {
          const data = await falRes.json();
          const url = data.url || data.file_url || data.access_url;
          console.log(`[fal-upload] ✓ Success via ${attempt.url}: ${url?.substring(0, 80)}`);
          return res.status(200).json(data);
        }

        const errText = await falRes.text().catch(() => '');
        lastError = `${attempt.url} [${attempt.auth.split(' ')[0]}]: ${status} ${errText.substring(0, 200)}`;
        console.warn(`[fal-upload] ${lastError}`);

        // Skip remaining auth variants for this endpoint if it's a 404 (endpoint doesn't exist)
        if (status === 404) continue;
      } catch (e) {
        lastError = `${attempt.url}: ${e.message}`;
        console.warn(`[fal-upload] Error: ${lastError}`);
      }
    }

    return res.status(502).json({ error: 'All fal.ai upload endpoints failed', detail: lastError });

  } catch (e) {
    console.error('[fal-upload] Server error:', e);
    return res.status(500).json({ error: e.message });
  }
};
