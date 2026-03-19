// Vercel Serverless Function: /api/upload-ref-image
// Uploads base64 image to freeimage.host and returns public URL

const https = require('https');

function uploadToFreeImage(base64Data) {
  return new Promise((resolve, reject) => {
    const b64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const formData = `key=6d207e02198a847aa98d0a2a901485a5&action=upload&source=${encodeURIComponent(b64)}&format=json`;

    const options = {
      hostname: 'freeimage.host',
      port: 443,
      path: '/api/1/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formData)
      }
    };

    const req = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.image?.url) resolve(parsed.image.url);
          else reject(new Error('Upload failed: ' + data.substring(0, 300)));
        } catch (e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(formData);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const b64 = req.body && req.body.image;
    if (!b64) return res.status(400).json({ error: 'image field required (base64)' });

    const publicUrl = await uploadToFreeImage(b64);
    return res.status(200).json({ url: publicUrl });
  } catch (error) {
    return res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
};
