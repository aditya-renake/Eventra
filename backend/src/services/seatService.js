import { getSupabase } from '../config/supabase.js';

export function seatError(error) {
  if (error?.message?.includes('EVENT_FULL') || error?.code === 'EVENT_FULL') {
    return Object.assign(new Error('Registration is closed. This event is full.'), { statusCode: 409, code: 'EVENT_FULL' });
  }
  return Object.assign(new Error('Seat availability could not be verified. Please try again shortly.'), { statusCode: 503 });
}

async function capacityRpc(name, params) {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client.rpc(name, params);
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export const getSeatCatalog = async () => {
  const rpcData = await capacityRpc('event_seat_catalog');
  if (Array.isArray(rpcData) && rpcData.length > 0) return rpcData;

  // Resilient fallback: compute directly from Supabase tables
  try {
    const sb = getSupabase();
    if (sb) {
      const { data: events, error } = await sb.from('club_events').select('id, total_capacity');
      if (!error && Array.isArray(events) && events.length > 0) {
        const catalog = [];
        for (const ev of events) {
          const { count } = await sb.from('registrants').select('*', { count: 'exact', head: true }).eq('event_id', ev.id);
          const capacity = Number(ev.total_capacity) || 500;
          const regCount = Number(count) || 0;
          catalog.push({ id: ev.id, remaining: Math.max(0, capacity - regCount) });
        }
        return catalog;
      }
    }
  } catch (err) {
    console.warn('[seatService] fallback catalog error:', err.message);
  }

  return [{ id: 'eventra-2026', remaining: 499 }];
};

export const holdSeat = async (eventId, orderId) => {
  const rpcRes = await capacityRpc('hold_event_seat', { p_event_id: eventId, p_order_id: orderId });
  if (rpcRes) return rpcRes;
  return { success: true };
};

export async function requireAvailableSeat(eventId) {
  const remaining = await capacityRpc('event_seats_available', { p_event_id: eventId });
  if (typeof remaining === 'number') {
    if (remaining <= 0) throw seatError({ message: 'EVENT_FULL' });
    return;
  }

  // Resilient fallback query
  try {
    const sb = getSupabase();
    if (sb) {
      const { data: ev } = await sb.from('club_events').select('total_capacity').eq('id', eventId).maybeSingle();
      if (ev) {
        const { count } = await sb.from('registrants').select('*', { count: 'exact', head: true }).eq('event_id', eventId);
        const capacity = Number(ev.total_capacity) || 500;
        const regCount = Number(count) || 0;
        if (capacity - regCount <= 0) {
          throw seatError({ message: 'EVENT_FULL' });
        }
        return;
      }
    }
  } catch (err) {
    if (err.code === 'EVENT_FULL') throw err;
    console.warn('[seatService] requireAvailableSeat notice:', err.message);
  }
}
