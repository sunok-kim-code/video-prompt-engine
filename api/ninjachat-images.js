// Vercel Serverless Function: /api/ninjachat-images
// Proxies image generation requests to NinjaChat API to avoid CORS
// Handles base64 reference images by uploading to imgbb for public URL

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
      headers: { ...headers, 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = https.request(options, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        const redirectUrl = response.headers.location.startsWith('http')
          ? response.headers.location
          : `https://${parsed.hostname}${response.headers.location}`;
        return httpsPost(redirectUrl, headers, postData).then(resolve).catch(reject);
      }
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try { resolve({ status: response.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: response.statusCode, data: { raw: data.substring(0, 500) } }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Upload base64 image to imgbb.com (free, no API key needed for anonymous)
function uploadToImgbb(base64Data) {
  return new Promise((resolve, reject) => {
    // Strip data URI prefix if present
    const b64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const formData = `image=${encodeURIComponent(b64)}`;

    const options = {
      hostname: 'api.imgbb.com',
      port: 443,
      path: '/1/upload?key=00000000000000000000000000000000',  // anonymous upload
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
          if (parsed.data?.url) resolve(parsed.data.url);
          else reject(new Error('imgbb upload failed: ' + data.substring(0, 200)));
        } catch (e) { reject(new Error('imgbb parse error')); }
      });
    });
    req.on('error', reject);
    req.write(formData);
    req.end();
  });
}

// Alternative: upload using freeimage.host (no API key needed)
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
          else reject(new Error('freeimage upload failed: ' + data.substring(0, 200)));
        } catch (e) { reject(new Error('freeimage parse error')); }
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = (req.body && req.body._apiKey) || req.headers['x-api-key'] || '';
    if (!apiKey) return res.status(401).json({ error: 'API key required' });

    const forwardBody = { ...req.body };
    delete forwardBody._apiKey;

    // If _refBase64 is provided, upload to public hosting and set as image URL
    let refUploadStatus = 'no_ref';
    if (req.body._refBase64) {
      const b64 = req.body._refBase64;
      delete forwardBody._refBase64;
      refUploadStatus = 'uploading';
      try {
        const publicUrl = await uploadToFreeImage(b64);
        forwardBody.image = publicUrl;
        refUploadStatus = 'uploaded: ' + publicUrl;
      } catch (uploadErr) {
        refUploadStatus = 'upload_failed: ' + uploadErr.message;
        // Don't proceed without ref — return error so client knows
        return res.status(400).json({
          error: 'ref_upload_failed',
          message: 'Reference image upload failed: ' + uploadErr.message,
          refUploadStatus
        });
      }
    }

    const result = await httpsPost('https://www.ninjachat.ai/api/v1/images', {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    }, forwardBody);

    // Add debug info to successful response
    if (result.data && typeof result.data === 'object') {
      result.data._refUploadStatus = refUploadStatus;
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('NinjaChat proxy error:', error.message);
    return res.status(500).json({ error: 'Proxy error: ' + error.message });
  }
};
