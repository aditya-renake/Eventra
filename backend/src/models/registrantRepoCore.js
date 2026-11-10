import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { readSeats, seatError } from '../services/seatService.js';
import { addNotificationJobs } from '../services/notificationQueue.js';

const DEFAULT_EVENT = 'eventra-2026';
const BATCH_SIZE = 200;
const STATS_TTL_MS = 5000;
const SORT_COLUMNS = { createdAt: 'created_at', updatedAt: 'updated_at', name: 'name', email: 'email', uniqueId: 'unique_id', checkedInAt: 'checked_in_at', ticketType: 'ticket_type', amountPaid: 'amount_paid' };
const normalizedId = value => String(value || '').trim().toUpperCase();
const normalizedEvent = value => String(value || DEFAULT_EVENT).trim().toLowerCase();
const integer = (value, fallback, max = Number.MAX_SAFE_INTEGER) => Math.min(max, Math.max(1, Number.parseInt(value, 10) || fallback));
const isFilter = value => value !== undefined && value !== '' && value !== 'all';
const booleanFilter = value => value === true || value === 'true';
const verified = item => item.verified === true || String(item.verificationStatus).toLowerCase() === 'verified';
function localStats(items) {
  const total = items.length;
  const checked = items.filter(item => item.checkedIn).length;
  const sent = items.filter(item => item.emailSent).length;
  let revenue = 0;
  let paid = 0;
  const breakdown = {};
  for (const item of items) {
    const amount = Number(item.amountPaid) || 0;
    const isPaid = amount > 0 && (String(item.paymentStatus).toUpperCase() === 'PAID' || item.paymentId || item.razorpayPaymentId);
    if (isPaid) { revenue += amount; paid += 1; }
    const type = item.ticketType || 'Standard Pass';
    breakdown[type] ||= { count: 0, revenue: 0 };
    breakdown[type].count += 1;
    if (isPaid) breakdown[type].revenue += amount;
  }
  return { totalRegistrants: total, checkedInCount: checked, checkedInPercentage: total ? Math.round(checked / total * 100) : 0, emailSentCount: sent, pendingEmailCount: total - sent, verifiedCount: items.filter(verified).length, verifiedPendingEmailCount: items.filter(item => verified(item) && !item.emailSent).length, totalRevenue: revenue, paidRegistrantsCount: paid, freeRegistrantsCount: total - paid, averageOrderValue: paid ? Math.round(revenue / paid) : 0, ticketBreakdown: breakdown };
}

export function paymentKeys(db, item) {
  const keys = new Set();
  for (const value of [item.paymentId, item.razorpayPaymentId, item.orderId, item.razorpayOrderId]) {
    if (value) keys.add('payment:' + String(value).trim());
  }
  if (item.utrNumber) keys.add('utr:' + String(item.utrNumber).trim().toUpperCase());
  return [...keys].map(key => db.collection('registration_payment_keys').doc(createHash('sha256').update(key).digest('hex')));
}

function previousDays(item) {
  if (Object.keys(item.checkinDays || {}).length || !item.checkedIn) return { ...item.checkinDays };
  return { day_1: { checkedInAt: item.checkedInAt || null, checkedInBy: item.checkedInBy || null, checkedInPhoto: item.checkedInPhoto || null } };
}

function dayKey(day) {
  const n = Number(String(day).replace(/^day[_-]/, ''));
  if (!Number.isInteger(n) || n < 1) throw Object.assign(new Error('Invalid event day'), { statusCode: 400 });
  return 'day_' + n;
}

const documentItem = doc => doc.exists ? { ...doc.data(), _id: doc.id } : null;

export function createRegistrantRepository({ getFirestore, now = Date.now }) {
  const statsCache = new Map();
  const statsPending = new Map();
  let generation = 0;
  function invalidate() { generation += 1; statsCache.clear(); statsPending.clear(); }
  async function firstMatch(key, value) {
    if (!value) return null;
    const result = await repo.getCollection().where(key, '==', value).limit(1).get();
    return result.empty ? null : documentItem(result.docs[0]);
  }
  async function readRegistrants(options = {}) {
    let query = getFirestore().collection('registrants');
    if (options.eventId && options.eventId !== 'all') query = query.where('eventId', '==', normalizedEvent(options.eventId));
    return (await query.get()).docs.map(documentItem);
  }
  function localFilters(items, options) {
    return items.filter(item => {
      if (isFilter(options.checkedIn) && Boolean(item.checkedIn) !== booleanFilter(options.checkedIn)) return false;
      if (isFilter(options.emailSent) && Boolean(item.emailSent) !== booleanFilter(options.emailSent)) return false;
      if (isFilter(options.verified) && verified(item) !== booleanFilter(options.verified)) return false;
      if (options.ticketType && options.ticketType !== 'all' && item.ticketType !== options.ticketType) return false;
      if (options.track && options.track !== 'all' && item.track !== options.track) return false;
      const search = String(options.search || '').trim().toLowerCase();
      return !search || ['name', 'email', 'phone', 'uniqueId', 'teamName', 'institution'].some(key => String(item[key] || '').toLowerCase().includes(search));
    });
  }
  const repo = {
    getCollection: () => getFirestore().collection('registrants'),
    async create(data, { notifications = [] } = {}) {
      const db = getFirestore();
      const id = normalizedId(data.uniqueId);
      const eventId = normalizedEvent(data.eventId);
      const email = String(data.email || '').trim().toLowerCase();
      if (!id || !email) throw Object.assign(new Error('Invalid registration'), { statusCode: 400 });
      const stamp = new Date(now()).toISOString();
      const item = { ...data, id, uniqueId: id, eventId, email, createdAt: data.createdAt || stamp, updatedAt: stamp };
      if (item.utrNumber) item.utrNumber = String(item.utrNumber).trim().toUpperCase();
      const orderId = item.orderId || item.razorpayOrderId;
      const conflict = code => Object.assign(new Error(code), { status: 409, statusCode: 409, code });
      await db.runTransaction(async tx => {
        const seats = await readSeats(db, tx, eventId, orderId);
        const collection = repo.getCollection();
        const duplicate = await tx.get(collection.where('email', '==', email).where('eventId', '==', eventId).limit(1));
        if (!duplicate.empty || (await tx.get(collection.doc(id))).exists) throw conflict('REGISTRATION_EXISTS');
        const paymentRefs = paymentKeys(db, item);
        if (paymentRefs.length && (await tx.getAll(...paymentRefs)).some(doc => doc.exists)) throw conflict('PAYMENT_CONFLICT');
        if (!seats.reserved && !seats.remaining) throw seatError({ code: 'EVENT_FULL' });
        if (orderId) {
          const hold = db.collection('event_seat_holds').doc(orderId);
          const existing = await tx.get(hold);
          if (existing.exists && existing.get('eventId') !== eventId) throw conflict('ORDER_EVENT_MISMATCH');
        }
        await addNotificationJobs(db, tx, notifications);
        if (orderId) tx.delete(db.collection('event_seat_holds').doc(orderId));
        for (const ref of paymentRefs) tx.create(ref, { uniqueId: id });
        tx.create(collection.doc(id), item);
        tx.update(seats.ref, { seatRevision: FieldValue.increment(1) });
      });
      invalidate();
      return { ...item, _id: id };
    },
    async findByUniqueId(uniqueId) {
      if (!uniqueId) return null;
      return documentItem(await repo.getCollection().doc(normalizedId(uniqueId)).get());
    },
    async findAllByEmail(email) {
      if (!email) return [];
      const result = await repo.getCollection().where('email', '==', String(email).trim().toLowerCase()).get();
      return result.docs.map(documentItem).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },
    async findByEmail(email) { return (await repo.findAllByEmail(email))[0] || null; },
    async findByEmailAndEvent(email, eventId) {
      return (await repo.findAllByEmail(email)).find(item => normalizedEvent(item.eventId) === normalizedEvent(eventId)) || null;
    },
    async findByIdOrEmail(query) {
      if (!query) return null;
      return String(query).includes('@') ? repo.findByEmail(query) : repo.findByUniqueId(query);
    },
    async findByPhone(phone) { return firstMatch('phone', String(phone || '').trim()); },
    async findByUtr(utr) { return firstMatch('utrNumber', String(utr || '').trim().toUpperCase()); },
    async findByOrderId(id) {
      if (!id) return null;
      for (const key of ['orderId', 'razorpayOrderId', 'paymentId', 'razorpayPaymentId']) {
        const match = await firstMatch(key, String(id).trim());
        if (match) return match;
      }
      return null;
    },
    async getAll(options = {}) {
      const page = integer(options.page, 1);
      const limit = integer(options.limit, 50, BATCH_SIZE);
      let items; let total; let stats;
      const all = await readRegistrants(options); stats = localStats(all);
      const filtered = localFilters(all, options).sort((a, b) => { const key = SORT_COLUMNS[options.sortBy] ? options.sortBy : 'createdAt'; return String(a[key] || '').localeCompare(String(b[key] || '')) * (options.sortOrder === 'asc' ? 1 : -1); });
      total = filtered.length;
      items = filtered.slice((page - 1) * limit, page * limit).map(({ qrCodeDataUrl, checkedInPhoto, checkinDays, ...item }) => item);
      const totalPages = Math.ceil(total / limit);
      return { items, pagination: { page, limit, totalItems: total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }, stats };
    },
    async *iterateAll(options = {}) {
      yield* localFilters(await readRegistrants(options), options);
    },
    async getAllForExport(options = {}) { const items = []; for await (const item of repo.iterateAll(options)) items.push(item); return items; },
    async update(uniqueId, updates) {
      if (!uniqueId) return null;
      if ('eventId' in updates) throw Object.assign(new Error('Cannot change registration event'), { statusCode: 400 });
      const db = getFirestore();
      const ref = repo.getCollection().doc(normalizedId(uniqueId));
      const { id, _id, uniqueId: ignored, ...patch } = updates;
      if ('email' in patch) patch.email = String(patch.email).trim().toLowerCase();
      if (patch.utrNumber) patch.utrNumber = patch.utrNumber.trim().toUpperCase();
      patch.updatedAt = new Date(now()).toISOString();
      const updated = await db.runTransaction(async tx => {
        const item = documentItem(await tx.get(ref));
        if (!item) return null;
        const next = { ...item, ...patch };
        if (patch.email && patch.email !== item.email) {
          const duplicates = await tx.get(repo.getCollection().where('eventId','==',item.eventId).where('email','==',patch.email).limit(1));
          if (!duplicates.empty) throw Object.assign(new Error('Registration exists'), { statusCode: 409 });
        }
        const oldKeys = paymentKeys(db, item);
        const newKeys = paymentKeys(db, next);
        const added = newKeys.filter(key => !oldKeys.some(old => old.id === key.id));
        if (added.length && (await tx.getAll(...added)).some(doc => doc.exists)) throw Object.assign(new Error('Payment conflict'), { statusCode: 409 });
        for (const key of added) tx.create(key, { uniqueId: ref.id });
        for (const key of oldKeys) if (!newKeys.some(other => other.id === key.id)) tx.delete(key);
        tx.update(ref, patch);
        return next;
      });
      invalidate();
      return updated;
    },
    async delete(uniqueId) {
      if (!uniqueId) return false;
      const db = getFirestore();
      const ref = repo.getCollection().doc(normalizedId(uniqueId));
      const deleted = await db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        if (!doc.exists) return false;
        for (const key of paymentKeys(db, doc.data())) tx.delete(key);
        tx.delete(ref);
        return true;
      });
      invalidate();
      return deleted;
    },
    async checkinAtomic(uniqueId, { staffName = 'Gate Scanner', photo = null, eventDay = 1, notifications = [] } = {}) {
      if (!uniqueId) return { notFound: true };
      const day = dayKey(eventDay);
      const db = getFirestore();
      const ref = repo.getCollection().doc(normalizedId(uniqueId));
      const result = await db.runTransaction(async tx => {
        const item = documentItem(await tx.get(ref));
        if (!item) return { notFound: true };
        const days = previousDays(item);
        if (days[day]) return { alreadyCheckedIn: true, registrant: item, checkinEntry: days[day] };
        const entry = { checkedInAt: new Date(now()).toISOString(), checkedInBy: staffName, checkedInPhoto: photo };
        const patch = { ...entry, checkedIn: true, checkinDays: { ...days, [day]: entry }, updatedAt: entry.checkedInAt };
        await addNotificationJobs(db, tx, notifications);
        tx.update(ref, patch);
        return { registrant: { ...item, ...patch }, checkinEntry: entry };
      });
      invalidate();
      return result;
    },
    async undoCheckinAtomic(uniqueId, { eventDay = null } = {}) {
      const ref = repo.getCollection().doc(normalizedId(uniqueId));
      const result = await getFirestore().runTransaction(async tx => {
        const item = documentItem(await tx.get(ref));
        if (!item) return null;
        const days = eventDay ? previousDays(item) : {};
        if (eventDay) delete days[dayKey(eventDay)];
        const latest = Object.values(days).sort((a,b) => String(b.checkedInAt).localeCompare(String(a.checkedInAt)))[0];
        const patch = { checkinDays: days, checkedIn: Boolean(latest), checkedInAt: latest?.checkedInAt || null,
          checkedInBy: latest?.checkedInBy || null, checkedInPhoto: latest?.checkedInPhoto || null };
        tx.update(ref, patch);
        return { ...item, ...patch };
      });
      invalidate();
      return result;
    },
    async getRecentCheckins(limitCount = 20) {
      const limit = integer(limitCount, 20, 100);
      const recent = await repo.getCollection().where('checkedIn', '==', true).get();
      const registrants = recent.docs.map(documentItem);
      return registrants.flatMap(item => {
        const days = Object.entries(item.checkinDays || {});
        return days.length ? days.map(([day, entry]) => ({ ...item, ...entry, _id: `${item.uniqueId}-${day}`, eventDay: day, eventDayLabel: `Day ${Number(day.replace(/^day[_-]/, '')) || 1}` })) : [{ ...item, eventDay: 'day_1', eventDayLabel: 'Day 1' }];
      }).sort((a, b) => new Date(b.checkedInAt || 0) - new Date(a.checkedInAt || 0)).slice(0, limit);
    },
    async getAggregateStats(eventId) {
      const key = eventId && eventId !== 'all' ? normalizedEvent(eventId) : 'all';
      const cached = statsCache.get(key);
      if (cached && now() - cached.at < STATS_TTL_MS) return cached.value;
      if (statsPending.has(key)) return statsPending.get(key);
      const version = generation;
      const pending = (async () => {
        const stats = localStats(await readRegistrants({ eventId: key }));
        if (version === generation) {
          if (statsCache.size >= 100) statsCache.delete(statsCache.keys().next().value);
          statsCache.set(key, { at: now(), value: stats });
        }
        return stats;
      })();
      statsPending.set(key, pending);
      try { return await pending; } finally { if (statsPending.get(key) === pending) statsPending.delete(key); }
    },
    async getStats(eventId) { return repo.getAggregateStats(eventId); },
  };
  return repo;
}
