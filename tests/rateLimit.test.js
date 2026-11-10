import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimit, consumeMemoryLimits, rateLimitRules } from '../backend/src/middleware/rateLimit.js';

test('consumeMemoryLimits enforces rate limits and returns retry_after when exceeded', () => {
  const testKey = 'unit_test_key_' + Date.now();
  const rule = [{ key: testKey, limit: 2, window_seconds: 60 }];

  const res1 = consumeMemoryLimits(rule);
  assert.equal(res1.allowed, true);

  const res2 = consumeMemoryLimits(rule);
  assert.equal(res2.allowed, true);

  const res3 = consumeMemoryLimits(rule);
  assert.equal(res3.allowed, false);
  assert.ok(res3.retry_after > 0);
});

test('createRateLimit falls back to in-memory limiter without returning 503 when remote fails', async () => {
  const middleware = createRateLimit({
    consume: async () => { throw new Error('Simulated Supabase RPC Failure'); },
    env: { VERCEL: '1', NODE_ENV: 'production' }
  });

  const req = {
    method: 'POST',
    path: '/api/auth/login',
    headers: { 'x-forwarded-for': '203.0.113.195' },
    body: { identifier: 'test_fallback_user_' + Date.now() },
    socket: {}
  };

  let nextCalled = false;
  let status = null;
  let jsonBody = null;

  const res = {
    setHeader: () => {},
    status: (s) => {
      status = s;
      return { json: (b) => { jsonBody = b; } };
    }
  };

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true, 'Request should proceed via in-memory fallback instead of 503');
  assert.equal(status, null, 'Status should not be set to 503');
});
