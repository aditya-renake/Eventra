import React, { createContext, useContext, useEffect, useState } from 'react';

const SeatCounts = createContext({});
export const useSeatCounts = () => useContext(SeatCounts);

export function SeatAvailability({ children }) {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const response = await fetch('/api/events/seat-availability', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Availability unavailable');
        const json = await response.json();
        if (Array.isArray(json?.data)) {
          setCounts(Object.fromEntries(json.data.map(({ id, remaining }) => [id, remaining])));
        }
      } catch {
        // Retain previous seat counts on transient fetch failures
      } finally {
        loading = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener('eventra:seats-changed', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('eventra:seats-changed', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return <SeatCounts.Provider value={counts}>{children}</SeatCounts.Provider>;
}
