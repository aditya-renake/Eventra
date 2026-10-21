let appInstance = null;
let loadError = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (loadError) throw loadError;

  try {
    const mod = await import('../backend/src/app.js');
    appInstance = mod.default || mod.app;
    return appInstance;
  } catch (err) {
    loadError = err;
    console.error('CRITICAL: Failed to load backend Express app:', err);
    throw err;
  }
}

export default async function handler(req, res) {
  // CORS Preflight headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Preserve original request URL across Vercel rewrites
  const forwardedUri =
    req.headers['x-forwarded-uri'] ||
    req.headers['x-matched-path'] ||
    req.headers['x-original-uri'] ||
    req.headers['x-rewrite-url'] ||
    req.headers['x-now-route-matches'];
  if (forwardedUri && forwardedUri.startsWith('/api')) {
    req.url = forwardedUri;
  }

  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error('Serverless Handler Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Serverless Function Runtime Error',
      error: err?.message || String(err),
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
    });
  }
}
