// Vercel Serverless Function: /api/proxy-image
// Fetches an external image and returns it as base64 to bypass CORS

const https = require('https');
const http = require('http');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).json({ error: 'url parameter required' });

  try {
    const protocol = imageUrl.startsWith('https') ? https : http;
    const imageData = await new Promise((resolve, reject) => {
      const request = protocol.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
        // Follow redirects
        if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
          const redirectProto = response.headers.location.startsWith('https') ? https : http;
          redirectProto.get(response.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (rRes) => {
            const chunks = [];
            rRes.on('data', c => chunks.push(c));
            rRes.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: rRes.headers['content-type'] || 'image/jpeg' }));
          }).on('error', reject);
          return;
        }
        const chunks = [];
        response.on('data', c => chunks.push(c));
        response.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: response.headers['content-type'] || 'image/jpeg' }));
      });
      request.on('error', reject);
    });

    const b64 = imageData.buffer.toString('base64');
    const dataUri = `data:${imageData.contentType};base64,${b64}`;
    res.status(200).json({ dataUri });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch image: ' + error.message });
  }
};
