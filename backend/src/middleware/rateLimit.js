import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import jwt from 'jsonwebtoken';

const hash = value => createHash('sha256').update(value).digest('hex');
const positive = (value, fallback) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
const cleanIdentity = value => typeof value === 'string' ? value.trim().toLowerCase().slice(0, 320) : '';

export function clientAddress(req, env = process.env) {
  // Only Vercel's deployed runtime supplies a trusted, overwritten forwarding header.
  // Self-hosted callers use the socket address; an arbitrary client cannot choose a key.
  const forwarded = env.VERCEL === '1' ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  const address = isIP(forwarded) ? forwarded : (req.socket?.remoteAddress || 'unknown');
  return address.startsWith('::ffff:') ? address.slice(7) : address;
}

function verifiedSubject(req, env) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token || !env.JWT_SECRET) return '';
  try {
    const claims = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return cleanIdentity(claims.userId || claims.username || claims.email || claims.sub);
  } catch { return ''; }
}

export function rateLimitRules(req, env = process.env) {
  const path = req.path.replace(/^\/api(?=\/|$)/i, '') || '/';
  const isAuth = /^\/auth\/(login|attendee\/(login|register|signin))\/?$/.test(path);
  const isOrderLookup = req.method === 'GET' && /^(?:\/payment)?\/check-order\//.test(path);
  if (!isAuth && !isOrderLookup && ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return [];
  if (/^\/internal\//.test(path)) return []; // Worker has its own service credential.
  const isPayment = /^(?:\/payment)?\/(create-order|verify-payment|verify|verify-upi|check-order)(\/|$)/.test(path);
  const isScan = /^\/checkin\//.test(path);
  if (req.method === 'POST' && /^\/chat\/?$/i.test(path)) return [{
    key: hash('chat:ip:' + clientAddress(req, env)),
    limit: positive(env.RATE_LIMIT_CHAT_IP_PER_MINUTE, 10),
    window_seconds: 60,
  }];
  const scope = isAuth ? 'auth' : isPayment ? 'payment' : isScan ? 'scan' : 'write';
  const ip = clientAddress(req, env);
  const rules = [{
    key: hash(`${scope}:ip:${ip}`),
    limit: positive(env[`RATE_LIMIT_${scope.toUpperCase()}_IP_PER_MINUTE`], isAuth ? 10000 : 30000),
    window_seconds: 60,
  }];
  const subject = verifiedSubject(req, env);
  const identity = isAuth
    ? cleanIdentity(req.body?.identifier || req.body?.email || req.body?.username)
    : cleanIdentity(req.body?.participantData?.email || req.body?.email);
  const account = isAuth ? identity : subject || identity;
  if (account) rules.push({
    key: hash(`${scope}:account:${account}`),
    limit: positive(env[`RATE_LIMIT_${scope.toUpperCase()}_ACCOUNT`], isAuth ? 20 : isScan ? 1200 : isPayment ? 60 : 600),
    window_seconds: isAuth ? 300 : 60,
  });
  return rules;
}

export function createRateLimit({ consume, env = process.env, log = console.error }) {
  return async function rateLimit(req, res, next) {
    const rules = rateLimitRules(req, env);
    if (!rules.length) return next();
    try {
      const result = await consume(rules);
      if (!result || typeof result.allowed !== 'boolean') throw new Error('Invalid limiter response');
      if (result.allowed) return next();
      res.setHeader('Retry-After', String(Math.max(1, Number(result.retry_after) || 60)));
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' });
    } catch (error) {
      // If remote rate limit storage is temporarily degraded, fall back to in-memory sliding window
      try {
        const fallback = consumeMemoryLimits(rules);
        if (fallback.allowed) return next();
        res.setHeader('Retry-After', String(Math.max(1, Number(fallback.retry_after) || 60)));
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(429).json({ success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' });
      } catch (fallbackError) {
        if (env.NODE_ENV !== 'production' && env.VERCEL !== '1' && env.RATE_LIMIT_DEVELOPMENT_BYPASS === 'true') return next();
        log(JSON.stringify({ event: 'rate_limit_unavailable', code: error.code || 'LIMITER_UNAVAILABLE' }));
        res.setHeader('Retry-After', '5');
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(503).json({ success: false, code: 'LIMITER_UNAVAILABLE', message: 'Requests are temporarily unavailable. Please retry shortly.' });
      }
    }
  };
}

const memoryBuckets = new Map();

export function consumeMemoryLimits(rules) {
  const now = Date.now();
  let retryAfter = 0;
  let allowed = true;

  if (memoryBuckets.size > 10000) {
    for (const [k, v] of memoryBuckets.entries()) {
      if (v.expiresAt <= now) memoryBuckets.delete(k);
    }
  }

  for (const rule of rules) {
    const existing = memoryBuckets.get(rule.key);
    const active = existing && existing.expiresAt > now;
    const count = active ? existing.count + 1 : 1;
    const expiry = active ? existing.expiresAt : now + rule.window_seconds * 1000;
    memoryBuckets.set(rule.key, { count, expiresAt: expiry });

    if (count > rule.limit) {
      allowed = false;
      const wait = Math.max(1, Math.ceil((expiry - now) / 1000));
      retryAfter = Math.max(retryAfter, wait);
    }
  }

  return { allowed, retry_after: retryAfter };
}
