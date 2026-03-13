// Vercel Serverless Function: /api/firebase-config
// Returns Firebase config from Vercel environment variables
// Set these in Vercel Dashboard > Settings > Environment Variables

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const config = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || ''
  };

  // Also serve Vertex AI config if set
  const vertexConfig = {
    projectId: process.env.VERTEX_PROJECT_ID || '',
    location: process.env.VERTEX_LOCATION || 'us-central1',
    accessToken: process.env.VERTEX_ACCESS_TOKEN || '',
    grokApiKey: process.env.GROK_API_KEY || ''
  };

  // API keys for image generation providers
  const apiKeys = {
    FAL_API_KEY: process.env.FAL_API_KEY || '',
    STABILITY_API_KEY: process.env.STABILITY_API_KEY || '',
    XAI_API_KEY: process.env.XAI_API_KEY || ''
  };

  // Check if Firebase is configured
  const firebaseConfigured = !!(config.apiKey && config.projectId);
  const vertexConfigured = !!(vertexConfig.projectId && vertexConfig.accessToken);

  res.status(200).json({
    firebase: firebaseConfigured ? config : null,
    vertex: vertexConfigured ? vertexConfig : null,
    apiKeys,
    status: {
      firebase: firebaseConfigured ? 'configured' : 'not_configured',
      vertex: vertexConfigured ? 'configured' : 'not_configured'
    }
  });
}
