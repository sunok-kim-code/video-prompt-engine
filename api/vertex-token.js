// Vercel Serverless Function: /api/vertex-token
// Mints a fresh Google OAuth2 access token using a service account key
// Env vars needed: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY

const crypto = require('crypto');

function createJWT(clientEmail, privateKey) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
          iss: clientEmail,
          scope: 'https://www.googleapis.com/auth/cloud-platform',
          aud: 'https://oauth2.googleapis.com/token',
          iat: now,
          exp: now + 3600
    };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const headerB64 = encode(header);
    const payloadB64 = encode(payload);
    const signInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('RSA-SHA256');
    sign.update(signInput);
    const signature = sign.sign(privateKey, 'base64url');

  return `${signInput}.${signature}`;
}

module.exports = async function handler(req, res) {
    // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
        return res.status(200).end();
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
        return res.status(500).json({ error: 'Service account not configured' });
  }

  // Vercel stores env vars with escaped newlines - restore them
  privateKey = privateKey.replace(/\\n/g, '\n');

  try {
        const jwt = createJWT(clientEmail, privateKey);

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
      });

      if (!tokenRes.ok) {
              const errText = await tokenRes.text();
              return res.status(500).json({ error: 'Token exchange failed', detail: errText });
      }

      const tokenData = await tokenRes.json();

      return res.status(200).json({
              access_token: tokenData.access_token,
              e/x/p iVreersc_eiln :S etrovkeernlDeastsa .Feuxnpcitrieosn_:i n/,a
    p i / v e r tteoxk-etno_kteynp
    e/:/  tMoiknetnsD aat af.rteoskhe nG_otoygplee
      O A u t}h)2; 
a c c}e scsa ttcohk e(ne rurs)i n{g
  a   s errevtiucren  arcecso.usntta tkuesy(
    5/0/0 )E.njvs ovna(r{s  enrereodre:d :' TGoOkOeGnL Eg_eCnLeIrEaNtTi_oEnM AfIaLi,l eGdO'O,G LdEe_tPaRiIlV:A TeEr_rK.EmYe
                         s
                         siamgpeo r}t) ;c
                                  r y p}t
o} from 'crypto';

function createJWT(clientEmail, privateKey) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
          iss: clientEmail,
          scope: 'https://www.googleapis.com/auth/cloud-platform',
          aud: 'https://oauth2.googleapis.com/token',
          iat: now,
          exp: now + 3600
    };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const headerB64 = encode(header);
    const payloadB64 = encode(payload);
    const signInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('RSA-SHA256');
    sign.update(signInput);
    con
