import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequest } from '../frontend/src/services/request.js';
import { imageUrl } from '../frontend/src/utils/imageUrl.js';
const response = value => ({ ok: true, json: async () => value });

test('simultaneous reads deduplicate, but completed reads and mutations do not cache', async () => {
  let calls = 0;
  const request = createRequest({ getToken: () => 'a', fetchImpl: async () => { calls++; return response({ ok: true }); } });
  await Promise.all([request('/event'), request('/event')]);
  assert.equal(calls, 1);
  await request('/event');
  assert.equal(calls, 2);
  await Promise.all([request('/event', { method: 'POST' }), request('/event', { method: 'POST' })]);
  assert.equal(calls, 4);
});

test('reads for different auth tokens never share responses', async () => {
  let token = 'a', calls = 0;
  const request = createRequest({ getToken: () => token, fetchImpl: async () => { calls++; return response({}); } });
  const first = request('/event'); token = 'b';
  await Promise.all([first, request('/event')]);
  assert.equal(calls, 2);
});

test('timeout aborts a stalled fetch and failed reads can retry', async () => {
  let calls = 0;
  const request = createRequest({ getToken: () => null, timeoutMs: 10, fetchImpl: async (_url, { signal }) => {
    if (++calls > 1) return response({ ok: true });
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  } });
  await assert.rejects(request('/event'), { name: 'TimeoutError' });
  assert.deepEqual(await request('/event'), { ok: true });
});

test('only known unsigned CDN images receive WebP transforms', () => {
  assert.match(imageUrl('https://images.unsplash.com/photo-test?auto=format', 720), /fm=webp/);
  assert.match(imageUrl('https://res.cloudinary.com/demo/image/upload/v123/a.jpg', 720), /f_webp,q_auto,c_limit,w_720/);
  for (const url of ['/logo.png', 'data:image/png;base64,abc', 'https://example.com/a.jpg?signature=x', 'https://res.cloudinary.com/demo/image/upload/s--signed--/v123/a.jpg']) assert.equal(imageUrl(url), url);
});

test('synchronous transport failures preserve the original error', async () => {
  const request = createRequest({ getToken: () => null, fetchImpl: () => { throw new Error('Transport unavailable'); } });
  await assert.rejects(request('/event'), /Transport unavailable/);
  await assert.rejects(request('/event'), /Transport unavailable/);
});

test('a mutation prevents subsequent reads from sharing a pre-mutation request', async () => {
  let calls = 0;
  const request = createRequest({ getToken: () => null, fetchImpl: async () => { calls++; return response({}); } });
  await Promise.all([request('/event'), request('/event', { method: 'PUT' }), request('/event')]);
  assert.equal(calls, 3);
});
