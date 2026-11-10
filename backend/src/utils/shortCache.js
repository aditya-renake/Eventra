// A bounded, per-process optimization; consistency never depends on this cache.
export function createShortCache({ ttlMs = 5000, maxEntries = 100, now = Date.now } = {}) {
  const entries = new Map();
  let version = 0;
  return {
    clear() { version += 1; entries.clear(); },
    async get(key, load) {
      const existing = entries.get(key);
      if (existing && (existing.pending || existing.expires > now())) return existing.value;
      if (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
      const entryVersion = version;
      const entry = { pending: true, expires: 0 };
      entry.value = Promise.resolve().then(load);
      entries.set(key, entry);
      try {
        const value = await entry.value;
        if (version === entryVersion && entries.get(key) === entry) {
          entry.value = value;
          entry.pending = false;
          entry.expires = now() + ttlMs;
        }
        return value;
      } catch (error) {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      }
    },
  };
}
