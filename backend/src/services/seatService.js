import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore } from '../config/firebase.js';

export function seatError(error) {
  const full = error?.code === 'EVENT_FULL' || error?.message?.includes('EVENT_FULL');
  return Object.assign(new Error(full ? 'Registration is closed. This event is full.' : 'Seat availability could not be verified.'), {
    statusCode: full ? 409 : 503, code: full ? 'EVENT_FULL' : 'SEATS_UNAVAILABLE',
  });
}

// All reservations and registrations for an event contend on the same document.
export async function readSeats(db, tx, eventId, orderId) {
  const ref = db.collection('club_events').doc(eventId);
  const get = query => tx ? tx.get(query) : query.get();
  const [event, registrations, holds] = await Promise.all([
    get(ref), get(db.collection('registrants').where('eventId', '==', eventId).count()),
    get(db.collection('event_seat_holds').where('eventId', '==', eventId)),
  ]);
  if (!event.exists) throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  const active = holds.docs.filter(doc => Date.parse(doc.get('expiresAt')) > Date.now());
  const remaining = Math.max(0, Number(event.get('totalCapacity') ?? 500) - registrations.data().count - active.length);
  return { ref, remaining, reserved: active.some(doc => doc.id === orderId) };
}

export async function getSeatCatalog() {
  const db = getFirestore();
  const events = await db.collection('club_events').select('status').get();
  return Promise.all(events.docs.filter(doc => doc.get('status') !== 'draft').map(async doc => ({
    id: doc.id, remaining: (await readSeats(db, null, doc.id)).remaining,
  })));
}

export async function holdSeat(eventId, orderId) {
  const db = getFirestore();
  return db.runTransaction(async tx => {
    const hold = db.collection('event_seat_holds').doc(orderId);
    const existing = await tx.get(hold);
    if (existing.exists && existing.get('eventId') !== eventId) throw new Error('Order event mismatch');
    const seats = await readSeats(db, tx, eventId, orderId);
    if (seats.reserved) return { success: true };
    if (!seats.remaining) throw seatError({ code: 'EVENT_FULL' });
    tx.set(hold, { eventId, expiresAt: new Date(Date.now() + 1800000).toISOString() });
    tx.update(seats.ref, { seatRevision: FieldValue.increment(1) });
    return { success: true };
  });
}

export async function requireAvailableSeat(eventId) {
  if (!(await readSeats(getFirestore(), null, eventId)).remaining) throw seatError({ code: 'EVENT_FULL' });
}
