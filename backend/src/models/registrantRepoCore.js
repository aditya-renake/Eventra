const DEFAULT_EVENT = 'eventra-2026';
const BATCH_SIZE = 200;
const STATS_TTL_MS = 5000;
export const LIST_COLUMNS = 'id,unique_id,event_id,name,email,phone,institution,ticket_type,team_name,track,github_url,payment_status,payment_amount,amount_paid,currency,order_id,payment_id,razorpay_order_id,razorpay_payment_id,utr_number,checked_in,checked_in_at,checked_in_by,email_sent,email_sent_at,verified,verification_status,paid_at,created_at,updated_at';
const SORT_COLUMNS = { createdAt: 'created_at', updatedAt: 'updated_at', name: 'name', email: 'email', uniqueId: 'unique_id', checkedInAt: 'checked_in_at', ticketType: 'ticket_type', amountPaid: 'amount_paid' };
const GENERATED_COLUMNS = new Set(['emailNormalized', 'isVerified', 'paymentReference', 'orderReference', 'utrNormalized', 'searchText']);
const normalizedId = value => String(value || '').trim().toUpperCase();
const normalizedEvent = value => String(value || DEFAULT_EVENT).trim().toLowerCase();
const integer = (value, fallback, max = Number.MAX_SAFE_INTEGER) => Math.min(max, Math.max(1, Number.parseInt(value, 10) || fallback));
const isFilter = value => value !== undefined && value !== '' && value !== 'all';
const booleanFilter = value => value === true || value === 'true';
const verified = item => item.verified === true || String(item.verificationStatus).toLowerCase() === 'verified';
const escapeLike = value => value.replace(/[\\%_]/g, char => `\\${char}`);

export function databaseError(error, operation) {
  const code = error?.code;
  const marker = ['EVENT_FULL', 'EVENT_NOT_FOUND', 'REGISTRATION_EXISTS', 'PAYMENT_CONFLICT', 'INVALID_REGISTRATION', 'INVALID_EVENT_DAY'].find(value => String(error?.message || '').includes(value));
  const missing = ['PGRST202', 'PGRST204', '42883', '42703'].includes(code);
  const result = new Error(missing
    ? 'Database scaling migration is required. Apply migrations 001, 002, and 003 before serving registration traffic.'
    : marker ? marker.replaceAll('_', ' ').toLowerCase() : `Database ${operation} failed`);
  result.code = missing ? 'SCHEMA_MIGRATION_REQUIRED' : marker || code || 'DATABASE_ERROR';
  result.status = missing ? 503 : marker === 'EVENT_NOT_FOUND' ? 404 : marker === 'INVALID_REGISTRATION' || marker === 'INVALID_EVENT_DAY' ? 400 : marker || code === '23505' ? 409 : 503;
  result.statusCode = result.status;
  result.cause = error;
  return result;
}

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

export function createRegistrantRepository({ getSupabase, isSupabaseConfigured, getFirestore, toCamel, toSnake, prepareRegistrantForStorage = async item => item, hydrateRegistrantMedia = async item => item, storeCheckinPhoto = async photo => photo, now = Date.now }) {
  const statsCache = new Map();
  const statsPending = new Map();
  let generation = 0;
  function invalidate() { generation += 1; statsCache.clear(); statsPending.clear(); }
  function requireSupabase() {
    if (!isSupabaseConfigured()) {
      const error = new Error('Supabase and the database scaling migrations are required for atomic registrations and check-ins.');
      error.code = 'DATABASE_REQUIRED'; error.status = 503; error.statusCode = 503;
      throw error;
    }
    return getSupabase();
  }
  async function result(query, operation) {
    let response;
    try { response = await query; } catch (error) { throw databaseError(error, operation); }
    if (response.error) throw databaseError(response.error, operation);
    return response;
  }
  function fromRow(row) {
    if (!row) return null;
    const item = toCamel(row);
    for (const key of GENERATED_COLUMNS) delete item[key];
    item._id = item.uniqueId || item.id;
    return item;
  }
  async function hydrated(row, options) { return row ? hydrateRegistrantMedia(fromRow(row), options) : null; }
  function filterQuery(query, options = {}) {
    if (options.eventId && options.eventId !== 'all') query = query.eq('event_id', normalizedEvent(options.eventId));
    if (isFilter(options.checkedIn)) query = query.eq('checked_in', booleanFilter(options.checkedIn));
    if (isFilter(options.emailSent)) query = query.eq('email_sent', booleanFilter(options.emailSent));
    if (isFilter(options.verified)) query = query.eq('is_verified', booleanFilter(options.verified));
    if (options.ticketType && options.ticketType !== 'all') query = query.eq('ticket_type', options.ticketType);
    if (options.track && options.track !== 'all') query = query.eq('track', options.track);
    if (String(options.search || '').trim()) query = query.ilike('search_text', `%${escapeLike(String(options.search).trim().toLowerCase())}%`);
    return query;
  }
  async function lookup(column, value, options) {
    const { data } = await result(getSupabase().from('registrants').select('*').eq(column, value).maybeSingle(), 'lookup');
    return hydrated(data, options);
  }
  async function legacyAll(options = {}) {
    const snapshot = await getFirestore().collection('registrants').get();
    let items = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    if (options.eventId && options.eventId !== 'all') items = items.filter(item => normalizedEvent(item.eventId) === normalizedEvent(options.eventId));
    return items;
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
      const sb = requireSupabase();
      const stamp = new Date(now()).toISOString();
      const cleanId = normalizedId(data.uniqueId);
      const item = await prepareRegistrantForStorage({ ...data, id: cleanId, uniqueId: cleanId, eventId: normalizedEvent(data.eventId), email: String(data.email || '').trim().toLowerCase(), createdAt: data.createdAt || stamp, updatedAt: stamp });
      const { data: created } = await result(sb.rpc('create_registrant_atomic', { p_registrant: toSnake(item), p_notifications: notifications }), 'registration');
      invalidate();
      return hydrated(created);
    },
    async findByUniqueId(uniqueId, options) {
      if (!uniqueId) return null;
      const id = normalizedId(uniqueId);
      if (isSupabaseConfigured()) return lookup('unique_id', id, options);
      const doc = await repo.getCollection().doc(id).get();
      return doc.exists ? hydrateRegistrantMedia({ _id: doc.id, ...doc.data() }, options) : null;
    },
    async findAllByEmail(email, options) {
      if (!email) return [];
      const cleanEmail = String(email).trim().toLowerCase();
      if (!isSupabaseConfigured()) return Promise.all((await legacyAll()).filter(item => String(item.email).trim().toLowerCase() === cleanEmail).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(item => hydrateRegistrantMedia(item, options)));
      const items = [];
      let offset = 0;
      while (true) {
        const { data } = await result(getSupabase().from('registrants').select('*').eq('email_normalized', cleanEmail).order('created_at', { ascending: false }).order('id', { ascending: true }).range(offset, offset + BATCH_SIZE - 1), 'email lookup');
        if (!data?.length) break;
        items.push(...await Promise.all(data.map(row => hydrated(row, options))));
        offset += data.length;
        if (data.length < BATCH_SIZE) break;
      }
      return items;
    },
    async findByEmail(email, options) { return (await repo.findAllByEmail(email, options))[0] || null; },
    async findByEmailAndEvent(email, eventId, options) {
      if (!email) return null;
      if (!isSupabaseConfigured()) return (await repo.findAllByEmail(email, options)).find(item => normalizedEvent(item.eventId) === normalizedEvent(eventId)) || null;
      const { data } = await result(getSupabase().from('registrants').select('*').eq('email_normalized', String(email).trim().toLowerCase()).eq('event_id', normalizedEvent(eventId)).maybeSingle(), 'event attendee lookup');
      return hydrated(data, options);
    },
    async findByIdOrEmail(query, options) { if (!query) return null; return String(query).includes('@') ? repo.findByEmail(query, options) : repo.findByUniqueId(query, options); },
    async findByPhone(phone, options) {
      if (!phone) return null;
      if (isSupabaseConfigured()) {
        const { data } = await result(getSupabase().from('registrants').select('*').eq('phone', String(phone).trim()).order('created_at', { ascending: false }).limit(1).maybeSingle(), 'phone lookup');
        return hydrated(data, options);
      }
      return (await legacyAll()).find(item => String(item.phone || '').trim() === String(phone).trim()) || null;
    },
    async findByUtr(utr, options) {
      if (!utr) return null;
      if (isSupabaseConfigured()) return lookup('utr_normalized', String(utr).trim().toUpperCase(), options);
      return (await legacyAll()).find(item => String(item.utrNumber || '').trim().toUpperCase() === String(utr).trim().toUpperCase()) || null;
    },
    async findByOrderId(id, options) {
      if (!id) return null;
      const clean = String(id).trim();
      if (isSupabaseConfigured()) {
        // Separate indexed equality lookups avoid interpolating user text into PostgREST filters.
        return await lookup('order_reference', clean, options) || await lookup('payment_reference', clean, options);
      }
      return (await legacyAll()).find(item => [item.orderId, item.paymentId, item.razorpayOrderId, item.razorpayPaymentId].includes(clean)) || null;
    },
    async getAll(options = {}) {
      const page = integer(options.page, 1);
      const limit = integer(options.limit, 50, BATCH_SIZE);
      let items; let total; let stats;
      if (isSupabaseConfigured()) {
        const query = filterQuery(getSupabase().from('registrants').select(LIST_COLUMNS, { count: 'exact' }), options)
          .order(SORT_COLUMNS[options.sortBy] || 'created_at', { ascending: options.sortOrder === 'asc', nullsFirst: false })
          .order('id', { ascending: true }).range((page - 1) * limit, page * limit - 1);
        const [response, aggregate] = await Promise.all([result(query, 'list'), repo.getAggregateStats(options.eventId)]);
        items = await Promise.all((response.data || []).map(row => hydrated(row, { includeQr: false, includePhoto: false })));
        total = response.count || 0; stats = aggregate;
      } else {
        const all = await legacyAll(options); stats = localStats(all);
        const filtered = localFilters(all, options).sort((a, b) => { const key = SORT_COLUMNS[options.sortBy] ? options.sortBy : 'createdAt'; return String(a[key] || '').localeCompare(String(b[key] || '')) * (options.sortOrder === 'asc' ? 1 : -1); });
        total = filtered.length;
        items = filtered.slice((page - 1) * limit, page * limit).map(({ qrCodeDataUrl, checkedInPhoto, checkinDays, ...item }) => item);
      }
      const totalPages = Math.ceil(total / limit);
      return { items, pagination: { page, limit, totalItems: total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }, stats };
    },
    async *iterateAll(options = {}) {
      if (!isSupabaseConfigured()) { yield* localFilters(await legacyAll(options), options); return; }
      let cursor = null;
      while (true) {
        let query = filterQuery(getSupabase().from('registrants').select(LIST_COLUMNS), options).order('id', { ascending: true }).limit(BATCH_SIZE);
        if (cursor) query = query.gt('id', cursor);
        const { data } = await result(query, 'export');
        if (!data?.length) break;
        for (const row of data) yield fromRow(row);
        cursor = data.at(-1).id;
        if (data.length < BATCH_SIZE) break;
      }
    },
    async getAllForExport(options = {}) { const items = []; for await (const item of repo.iterateAll(options)) items.push(item); return items; },
    async update(uniqueId, updates) {
      if (!uniqueId) return null;
      const id = normalizedId(uniqueId);
      const prepared = await prepareRegistrantForStorage({ ...updates, uniqueId: id, updatedAt: new Date(now()).toISOString() });
      // Identity changes and generated columns must never be written by a general profile update.
      for (const key of ['id', '_id', 'uniqueId', ...GENERATED_COLUMNS]) delete prepared[key];
      if ('email' in prepared) prepared.email = String(prepared.email).trim().toLowerCase();
      if ('eventId' in prepared) {
        throw Object.assign(new Error('Changing a registration event requires a new atomic registration.'), { code: 'INVALID_REGISTRATION', status: 400, statusCode: 400 });
      }
      if (isSupabaseConfigured()) {
        const { data } = await result(getSupabase().from('registrants').update(toSnake(prepared)).eq('unique_id', id).select('*').maybeSingle(), 'update');
        invalidate(); return hydrated(data);
      }
      const ref = repo.getCollection().doc(id); const existing = await ref.get();
      if (!existing.exists) return null;
      await ref.update(prepared); invalidate(); return hydrateRegistrantMedia({ _id: id, ...existing.data(), ...prepared });
    },
    async delete(uniqueId) {
      if (!uniqueId) return false;
      const id = normalizedId(uniqueId);
      if (isSupabaseConfigured()) {
        const { data } = await result(getSupabase().from('registrants').delete().eq('unique_id', id).select('id'), 'delete');
        invalidate(); return Boolean(data?.length);
      }
      await repo.getCollection().doc(id).delete(); invalidate(); return true;
    },
    async checkinAtomic(uniqueId, { staffName = 'Gate Scanner', photo = null, eventDay = 1, notifications = [] } = {}) {
      if (!uniqueId) return { notFound: true };
      const sb = requireSupabase(); const id = normalizedId(uniqueId);
      if (!Number.isInteger(Number(eventDay)) || Number(eventDay) < 1) throw Object.assign(new Error('Invalid event day'), { status: 400, statusCode: 400, code: 'INVALID_EVENT_DAY' });
      const photoReference = await storeCheckinPhoto(photo, { uniqueId: id, eventDay: Number(eventDay) });
      const { data } = await result(sb.rpc('checkin_registrant_atomic', { p_unique_id: id, p_staff_name: staffName, p_photo: photoReference, p_event_day: Number(eventDay), p_notifications: notifications }), 'check-in');
      invalidate();
      if (!data?.registrant) return data;
      const registrant = await hydrated(data.registrant, { includeQr: false, includePhoto: true });
      return { ...data, registrant, checkinEntry: registrant.checkinDays?.[`day_${Number(eventDay)}`] || data.checkinEntry };
    },
    async undoCheckinAtomic(uniqueId, { eventDay = null } = {}) {
      if (!uniqueId) return null;
      const day = eventDay === null || eventDay === undefined || eventDay === '' ? null : Number(String(eventDay).replace(/^day[_-]/, ''));
      if (day !== null && (!Number.isInteger(day) || day < 1)) throw Object.assign(new Error('Invalid event day'), { status: 400, statusCode: 400, code: 'INVALID_EVENT_DAY' });
      const { data } = await result(requireSupabase().rpc('undo_registrant_checkin_atomic', { p_unique_id: normalizedId(uniqueId), p_event_day: day }), 'undo check-in');
      invalidate(); return hydrated(data, { includeQr: false, includePhoto: true });
    },
    async getRecentCheckins(limitCount = 20) {
      const limit = integer(limitCount, 20, 100);
      let registrants;
      if (isSupabaseConfigured()) {
        const { data } = await result(getSupabase().from('registrants').select(`${LIST_COLUMNS},checked_in_photo,checkin_days`).eq('checked_in', true).order('checked_in_at', { ascending: false }).limit(limit), 'recent check-ins');
        registrants = await Promise.all((data || []).map(row => hydrated(row, { includeQr: false, includePhoto: true })));
      } else registrants = (await legacyAll()).filter(item => item.checkedIn);
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
        let stats;
        if (isSupabaseConfigured()) {
          const { data } = await result(getSupabase().rpc('registrant_aggregate_stats', { p_event_id: key === 'all' ? null : key }), 'aggregate statistics');
          stats = data;
        } else stats = localStats(await legacyAll({ eventId: key }));
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
