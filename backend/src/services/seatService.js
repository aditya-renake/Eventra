import { getSupabase } from '../config/supabase.js';

export function seatError(error) {
  if (error?.message?.includes('EVENT_FULL')) {
    return Object.assign(new Error('Registration is closed. This event is full.'), { statusCode: 409, code: 'EVENT_FULL' });
  }
  return Object.assign(new Error('Seat availability could not be verified. Please try again shortly.'), { statusCode: 503 });
}

async function capacityRpc(name, params) {
  const client = getSupabase();
  if (!client) throw seatError();
  const { data, error } = await client.rpc(name, params);
  if (error) throw seatError(error);
  return data;
}

export const getSeatCatalog = () => capacityRpc('event_seat_catalog');
export const holdSeat = (eventId, orderId) => capacityRpc('hold_event_seat', { p_event_id: eventId, p_order_id: orderId });
export async function requireAvailableSeat(eventId) {
  const remaining = await capacityRpc('event_seats_available', { p_event_id: eventId });
  if (remaining === null) throw seatError();
  if (remaining <= 0) throw seatError({ message: 'EVENT_FULL' });
}
