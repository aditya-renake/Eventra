// Share only simultaneous reads. Never retain private responses after completion.
export function createRequest({ fetchImpl = (...args) => fetch(...args), getToken = () => localStorage.getItem('hs26_auth_token'), timeoutMs = 30000 } = {}) {
  const pending = new Map();
  return function request(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = getToken();
    if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
    // Caller-controlled cancellation must never cancel another subscriber.
    const key = method === 'GET' && !options.signal ? JSON.stringify([endpoint, headers]) : null;
    if (method !== 'GET') pending.clear();
    if (key && pending.has(key)) return pending.get(key);
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal.reason);
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);
    const promise = (async () => {
      try {
        const response = await Promise.resolve().then(() => fetchImpl(`/api${endpoint}`, { ...options, method, headers, signal: controller.signal }));
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || `Request failed with status ${response.status}`);
        return data;
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
        if (key && pending.get(key) === promise) pending.delete(key);
      }
    })();
    if (key) pending.set(key, promise);
    return promise;
  };
}
