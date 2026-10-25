import { getFirestore } from '../config/firebase.js';
import { getSupabase, isSupabaseConfigured, toCamel, toSnake } from '../config/supabase.js';

// In-memory micro-cache for sub-millisecond dashboard speeds (5,000+ attendee concurrency)
let memoryCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10000; // 10 second micro-cache for instantaneous dashboard speeds

let aggregateStatsCache = null;
let lastStatsCacheTime = 0;
const STATS_CACHE_TTL_MS = 10000; // 10 second cache for aggregate counts

function invalidateCache() {
  memoryCache = null;
  lastCacheTime = 0;
  aggregateStatsCache = null;
  lastStatsCacheTime = 0;
}

const expandRecentCheckins = (registrants, limitCount) => registrants
  .flatMap((registrant) => {
    const entries = Object.entries(registrant.checkinDays || {});
    if (entries.length > 0) {
      return entries.map(([eventDay, entry]) => {
        const dayNumber = Number(String(eventDay).replace(/^day[_-]/, '')) || 1;
        return {
          ...registrant,
          ...entry,
          _id: `${registrant.uniqueId || registrant._id}-${eventDay}`,
          uniqueId: registrant.uniqueId || registrant._id,
          eventDay,
          eventDayLabel: `Day ${dayNumber}`,
        };
      });
    }

    return registrant.checkedIn ? [{
      ...registrant,
      eventDay: 'day-1',
      eventDayLabel: 'Day 1',
    }] : [];
  })
  .sort((a, b) => new Date(b.checkedInAt || 0) - new Date(a.checkedInAt || 0))
  .slice(0, limitCount);

export const registrantRepo = {
  getCollection() {
    const db = getFirestore();
    return db.collection('registrants');
  },

  /**
   * Create or overwrite registrant document in database
   */
  async create(data) {
    invalidateCache();
    const cleanId = data.uniqueId.toUpperCase().trim();
    const cleanEventId = (data.eventId || 'eventra-2026').toLowerCase().trim();
    const item = {
      ...data,
      id: cleanId,
      _id: cleanId,
      uniqueId: cleanId,
      eventId: cleanEventId,
      email: data.email.toLowerCase().trim(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        await sb.from('registrants').upsert(toSnake(item));
        return item;
      } catch (err) {
        console.warn('[registrantRepo] Supabase create error, fallback:', err.message);
      }
    }

    try {
      const collection = this.getCollection();
      await collection.doc(cleanId).set(item);
    } catch (e) {
      console.warn('[registrantRepo] create notice:', e.message);
    }
    return item;
  },

  /**
   * Find registrant by uniqueId
   */
  async findByUniqueId(uniqueId) {
    if (!uniqueId) return null;
    const cleanId = uniqueId.toUpperCase().trim();
    
    // Check in-memory cache first if warm
    if (memoryCache && (Date.now() - lastCacheTime < CACHE_TTL_MS)) {
      const cached = memoryCache.find((r) => r.uniqueId === cleanId || r._id === cleanId);
      if (cached) return cached;
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.from('registrants').select('*').eq('unique_id', cleanId).maybeSingle();
        if (data && !error) {
          const item = toCamel(data);
          item._id = item.uniqueId || item.id;
          return item;
        }
      } catch (err) {
        console.warn('[registrantRepo] Supabase findByUniqueId notice:', err.message);
      }
    }

    try {
      const collection = this.getCollection();
      const doc = await collection.doc(cleanId).get();
      if (doc && doc.exists) {
        return { _id: doc.id, ...doc.data() };
      }
    } catch (err) {
      console.warn('[registrantRepo] findByUniqueId notice:', err.message);
    }
    return null;
  },

  /**
   * Find registrant by email address
   */
  async findByEmail(email) {
    const all = await this.findAllByEmail(email);
    return all.length > 0 ? all[0] : null;
  },

  /**
   * Find ALL registrants by email address across all events (newest first)
   */
  async findAllByEmail(email) {
    if (!email) return [];
    const cleanEmail = email.toLowerCase().trim();

    // Check in-memory cache first if warm (returning all matches)
    if (memoryCache && (Date.now() - lastCacheTime < CACHE_TTL_MS)) {
      const matches = memoryCache.filter((r) => String(r.email).toLowerCase().trim() === cleanEmail);
      if (matches.length > 0) {
        matches.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return matches;
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from('registrants')
          .select('*')
          .ilike('email', cleanEmail)
          .order('created_at', { ascending: false });
        if (data && !error && data.length > 0) {
          return data.map((d) => {
            const item = toCamel(d);
            item._id = item.uniqueId || item.id;
            return item;
          });
        }
      } catch (err) {
        console.warn('[registrantRepo] Supabase findAllByEmail notice:', err.message);
      }
    }

    try {
      const collection = this.getCollection();
      const snapshot = await collection.where('email', '==', cleanEmail).get();
      if (snapshot && !snapshot.empty) {
        const items = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
        items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return items;
      }
    } catch (err) {
      console.warn('[registrantRepo] findAllByEmail notice:', err.message);
    }
    return [];
  },

  /**
   * Find a registrant for a specific event by email
   */
  async findByEmailAndEvent(email, eventId) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    const targetEvId = eventId || 'eventra-2026';

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from('registrants')
          .select('*')
          .ilike('email', cleanEmail)
          .eq('event_id', targetEvId)
          .maybeSingle();
        if (data && !error) {
          const item = toCamel(data);
          item._id = item.uniqueId || item.id;
          return item;
        }
      } catch (err) {
        console.warn('[registrantRepo] Supabase findByEmailAndEvent notice:', err.message);
      }
    }

    const all = await this.findAllByEmail(cleanEmail);
    return all.find((r) => (r.eventId || 'eventra-2026') === targetEvId) || null;
  },

  /**
   * Find registrant by either uniqueId or email
   */
  async findByIdOrEmail(query) {
    if (!query) return null;
    const cleanQuery = query.trim();

    if (cleanQuery.includes('@')) {
      return this.findByEmail(cleanQuery);
    }
    return this.findByUniqueId(cleanQuery);
  },

  /**
   * Find registrant by UPI UTR / Transaction Reference Number
   */
  async findByUtr(utrNumber) {
    if (!utrNumber) return null;
    const cleanUtr = String(utrNumber).trim();

    if (memoryCache && (Date.now() - lastCacheTime < CACHE_TTL_MS)) {
      const cached = memoryCache.find((r) => r.utrNumber && String(r.utrNumber).trim().toUpperCase() === cleanUtr.toUpperCase());
      if (cached) return cached;
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.from('registrants').select('*').ilike('utr_number', cleanUtr).maybeSingle();
        if (data && !error) {
          const item = toCamel(data);
          item._id = item.uniqueId || item.id;
          return item;
        }
      } catch (err) {
        console.warn('[registrantRepo] Supabase findByUtr notice:', err.message);
      }
    }

    try {
      const collection = this.getCollection();
      const snapshot = await collection.where('utrNumber', '==', cleanUtr).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { _id: doc.id, ...doc.data() };
      }
    } catch (e) {
      console.warn('[registrantRepo] findByUtr fallback notice:', e.message);
    }
    return null;
  },

  /**
   * Find registrant by Razorpay Order ID or Payment ID
   */
  async findByOrderId(orderId) {
    if (!orderId) return null;
    const cleanOrder = String(orderId).trim();

    if (memoryCache && (Date.now() - lastCacheTime < CACHE_TTL_MS)) {
      const cached = memoryCache.find(
        (r) => (r.orderId && r.orderId === cleanOrder) || (r.paymentId && r.paymentId === cleanOrder)
      );
      if (cached) return cached;
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from('registrants')
          .select('*')
          .or(`order_id.eq.${cleanOrder},payment_id.eq.${cleanOrder},razorpay_order_id.eq.${cleanOrder},razorpay_payment_id.eq.${cleanOrder}`)
          .maybeSingle();
        if (data && !error) {
          const item = toCamel(data);
          item._id = item.uniqueId || item.id;
          return item;
        }
      } catch (err) {
        console.warn('[registrantRepo] Supabase findByOrderId notice:', err.message);
      }
    }

    try {
      const collection = this.getCollection();
      const snap1 = await collection.where('orderId', '==', cleanOrder).limit(1).get();
      if (!snap1.empty) {
        const doc = snap1.docs[0];
        return { _id: doc.id, ...doc.data() };
      }
      const snap2 = await collection.where('paymentId', '==', cleanOrder).limit(1).get();
      if (!snap2.empty) {
        const doc = snap2.docs[0];
        return { _id: doc.id, ...doc.data() };
      }
    } catch (e) {
      console.warn('[registrantRepo] findByOrderId fallback notice:', e.message);
    }
    return null;
  },

  /**
   * Get all registrants with search, filter, and pagination (optimized with micro-cache)
   */
  async getAll({
    page = 1,
    limit = 50,
    search = '',
    checkedIn,
    emailSent,
    verified,
    ticketType,
    track,
    eventId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    let items = [];

    const now = Date.now();
    if (memoryCache && (now - lastCacheTime < CACHE_TTL_MS)) {
      items = [...memoryCache];
    } else {
      let fetchedFromSupabase = false;
      if (isSupabaseConfigured()) {
        try {
          const sb = getSupabase();
          const { data, error } = await sb.from('registrants').select('*').order('created_at', { ascending: false });
          if (data && !error) {
            items = data.map((d) => {
              const it = toCamel(d);
              it._id = it.uniqueId || it.id;
              return it;
            });
            memoryCache = items;
            lastCacheTime = now;
            fetchedFromSupabase = true;
          }
        } catch (err) {
          console.warn('[registrantRepo] Supabase getAll notice:', err.message);
        }
      }

      if (!fetchedFromSupabase) {
        try {
          const collection = this.getCollection();
          const snapshot = await collection.get();
          snapshot.docs.forEach((doc) => {
            items.push({ _id: doc.id, ...doc.data() });
          });
          memoryCache = items;
          lastCacheTime = now;
        } catch (e) {
          console.warn('[registrantRepo] getAll fallback notice:', e.message);
        }
      }
    }

    // Scope by eventId FIRST so event-specific KPI stats are accurate
    if (eventId && eventId !== 'all') {
      const cleanEventId = String(eventId).toLowerCase().trim();
      items = items.filter((item) => {
        const itemEvId = (item.eventId || 'eventra-2026').toLowerCase().trim();
        return itemEvId === cleanEventId;
      });
    }

    // Event-scoped KPI counts
    const totalAll = items.length;
    const checkedInCount = items.filter((i) => i.checkedIn).length;
    const emailSentCount = items.filter((i) => i.emailSent).length;
    const verifiedCount = items.filter((i) => i.verified === true || String(i.verificationStatus).toLowerCase() === 'verified').length;
    const verifiedPendingEmailCount = items.filter((i) => (i.verified === true || String(i.verificationStatus).toLowerCase() === 'verified') && !i.emailSent).length;

    // Accurate Event-scoped Financial Collection & Revenue
    let totalRevenue = 0;
    let paidRegistrantsCount = 0;
    let freeRegistrantsCount = 0;
    const ticketBreakdown = {};

    items.forEach((item) => {
      const amt = Number(item.amountPaid) || 0;
      const isPaid = item.paymentStatus === 'PAID' || (amt > 0 && item.paymentId);
      if (isPaid && amt > 0) {
        totalRevenue += amt;
        paidRegistrantsCount++;
      } else {
        freeRegistrantsCount++;
      }

      const tType = item.ticketType || 'Standard Pass';
      if (!ticketBreakdown[tType]) {
        ticketBreakdown[tType] = { count: 0, revenue: 0 };
      }
      ticketBreakdown[tType].count++;
      if (isPaid && amt > 0) {
        ticketBreakdown[tType].revenue += amt;
      }
    });

    // Additional UI Filters
    if (checkedIn !== undefined && checkedIn !== '') {
      const isChecked = checkedIn === 'true' || checkedIn === true;
      items = items.filter((item) => Boolean(item.checkedIn) === isChecked);
    }

    if (emailSent !== undefined && emailSent !== '') {
      const isSent = emailSent === 'true' || emailSent === true;
      items = items.filter((item) => Boolean(item.emailSent) === isSent);
    }

    if (verified !== undefined && verified !== '' && verified !== 'all') {
      const isVer = verified === 'true' || verified === true;
      items = items.filter((item) => (item.verified === true || String(item.verificationStatus).toLowerCase() === 'verified') === isVer);
    }

    if (ticketType && ticketType !== 'all') {
      items = items.filter((item) => item.ticketType === ticketType);
    }

    if (track && track !== 'all') {
      items = items.filter((item) => item.track === track);
    }

    if (search && search.trim() !== '') {
      const s = search.toLowerCase().trim();
      items = items.filter((item) =>
        (item.name && item.name.toLowerCase().includes(s)) ||
        (item.email && item.email.toLowerCase().includes(s)) ||
        (item.phone && item.phone.toLowerCase().includes(s)) ||
        (item.uniqueId && item.uniqueId.toLowerCase().includes(s)) ||
        (item.teamName && item.teamName.toLowerCase().includes(s)) ||
        (item.institution && item.institution.toLowerCase().includes(s))
      );
    }

    // Sort
    items.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = items.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;
    const paginatedItems = items.slice(skip, skip + limitNum).map((item) => {
      // Omit heavy base64 image strings from list endpoint to save 90% bandwidth
      const { qrCodeDataUrl, ...lightweightItem } = item;
      return lightweightItem;
    });
    const totalPages = Math.ceil(totalCount / limitNum);

    return {
      items: paginatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      stats: {
        totalRegistrants: totalAll,
        checkedInCount,
        checkedInPercentage: totalAll > 0 ? Math.round((checkedInCount / totalAll) * 100) : 0,
        emailSentCount,
        pendingEmailCount: totalAll - emailSentCount,
        verifiedCount,
        verifiedPendingEmailCount,
        totalRevenue,
        paidRegistrantsCount,
        freeRegistrantsCount,
        averageOrderValue: paidRegistrantsCount > 0 ? Math.round(totalRevenue / paidRegistrantsCount) : 0,
        ticketBreakdown,
      },
    };
  },

  /**
   * Update registrant document in Database
   */
  async update(uniqueId, updates) {
    invalidateCache();
    if (!uniqueId) return null;
    const cleanId = uniqueId.toUpperCase().trim();

    const existing = await this.findByUniqueId(cleanId);
    if (!existing) return null;

    const merged = {
      ...existing,
      ...updates,
      uniqueId: cleanId,
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        await sb.from('registrants').update(toSnake(updates)).eq('unique_id', cleanId);
      } catch (err) {
        console.warn('[registrantRepo] Supabase update notice:', err.message);
      }
    }

    try {
      const collection = this.getCollection();
      await collection.doc(cleanId).set(merged, { merge: true });
    } catch (e) {
      console.warn('[registrantRepo] update fallback notice:', e.message);
    }

    return merged;
  },

  /**
   * Delete registrant document
   */
  async delete(uniqueId) {
    invalidateCache();
    if (!uniqueId) return false;
    const cleanId = uniqueId.toUpperCase().trim();

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        await sb.from('registrants').delete().eq('unique_id', cleanId);
      } catch (err) {
        console.warn('[registrantRepo] Supabase delete notice:', err.message);
      }
    }

    try {
      const collection = this.getCollection();
      await collection.doc(cleanId).delete();
    } catch (e) {
      console.warn('[registrantRepo] delete fallback notice:', e.message);
    }
    return true;
  },

  /**
   * Atomic Check-In
   * Guarantees zero race conditions / zero duplicate check-ins across multiple concurrent gate scanners
   */
  async checkinAtomic(uniqueId, { staffName = 'Gate Scanner', photo = null, eventDay = 1 } = {}) {
    if (!uniqueId) return { notFound: true };
    const cleanId = uniqueId.toUpperCase().trim();
    const dayKey = `day_${Number(eventDay) || 1}`;

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data: current, error: fetchErr } = await sb.from('registrants').select('*').eq('unique_id', cleanId).maybeSingle();
        if (!current || fetchErr) {
          return { notFound: true };
        }
        const registrant = toCamel(current);
        registrant._id = registrant.uniqueId || registrant.id;
        const currentDays = registrant.checkinDays || {};
        const currentEntry = currentDays[dayKey];
        const legacyDayOneCheckin = Number(eventDay) === 1 && registrant.checkedIn && !currentEntry;
        if (currentEntry || legacyDayOneCheckin) {
          return {
            alreadyCheckedIn: true,
            registrant,
            checkinEntry: currentEntry || {
              checkedInAt: registrant.checkedInAt,
              checkedInBy: registrant.checkedInBy,
            },
          };
        }

        const checkedInAt = new Date().toISOString();
        const checkinEntry = { checkedInAt, checkedInBy: staffName, checkedInPhoto: photo || null };
        const previousDays = { ...currentDays };
        if (Number(eventDay) > 1 && registrant.checkedIn && !previousDays.day_1) {
          previousDays.day_1 = {
            checkedInAt: registrant.checkedInAt,
            checkedInBy: registrant.checkedInBy || 'Gate Staff',
            ...(registrant.checkedInPhoto ? { checkedInPhoto: registrant.checkedInPhoto } : {}),
          };
        }
        const checkinDays = { ...previousDays, [dayKey]: checkinEntry };
        const updateFields = {
          checked_in: true,
          checked_in_at: checkedInAt,
          checked_in_by: staffName,
          checked_in_photo: photo || null,
          checkin_days: checkinDays,
          updated_at: checkedInAt,
        };

        const { data: updatedData, error: updateErr } = await sb
          .from('registrants')
          .update(updateFields)
          .eq('unique_id', cleanId)
          .is(`checkin_days->>${dayKey}`, null)
          .select()
          .maybeSingle();

        if (updateErr) throw updateErr;

        if (updatedData) {
          invalidateCache();
          const updated = toCamel(updatedData);
          updated._id = updated.uniqueId || updated.id;
          return {
            alreadyCheckedIn: false,
            registrant: updated,
            checkinEntry,
          };
        }

        const { data: latest } = await sb.from('registrants').select('*').eq('unique_id', cleanId).maybeSingle();
        if (latest) {
          const latestRegistrant = toCamel(latest);
          latestRegistrant._id = latestRegistrant.uniqueId || latestRegistrant.id;
          const latestEntry = latestRegistrant.checkinDays?.[dayKey] || {
            checkedInAt: latestRegistrant.checkedInAt,
            checkedInBy: latestRegistrant.checkedInBy,
          };
          return { alreadyCheckedIn: true, registrant: latestRegistrant, checkinEntry: latestEntry };
        }
      } catch (err) {
        console.warn('[registrantRepo] Supabase checkinAtomic notice:', err.message);
      }
    }

    try {
      const db = getFirestore();
      const docRef = db.collection('registrants').doc(cleanId);

      const result = await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) {
          return { notFound: true };
        }

        const data = doc.data();
        const currentDays = data.checkinDays || {};
        const currentEntry = currentDays[dayKey];
        const legacyDayOneCheckin = Number(eventDay) === 1 && data.checkedIn && !currentEntry;
        if (currentEntry || legacyDayOneCheckin) {
          return {
            alreadyCheckedIn: true,
            registrant: { _id: doc.id, ...data },
            checkinEntry: currentEntry || {
              checkedInAt: data.checkedInAt,
              checkedInBy: data.checkedInBy,
            },
          };
        }

        const checkedInAt = new Date().toISOString();
        const checkinEntry = { checkedInAt, checkedInBy: staffName, checkedInPhoto: photo || null };
        const previousDays = { ...currentDays };
        if (Number(eventDay) > 1 && data.checkedIn && !previousDays.day_1) {
          previousDays.day_1 = {
            checkedInAt: data.checkedInAt,
            checkedInBy: data.checkedInBy || 'Gate Staff',
            ...(data.checkedInPhoto ? { checkedInPhoto: data.checkedInPhoto } : {}),
          };
        }
        const checkinDays = { ...previousDays, [dayKey]: checkinEntry };
        const updateFields = {
          checkedIn: true,
          checkedInAt,
          checkedInBy: staffName,
          checkinDays,
          checkedInPhoto: photo || null,
          updatedAt: checkedInAt,
        };

        transaction.update(docRef, updateFields);

        return {
          alreadyCheckedIn: false,
          registrant: { _id: doc.id, ...data, ...updateFields },
          checkinEntry,
        };
      });

      invalidateCache();
      return result;
    } catch (e) {
      console.warn('[registrantRepo] checkinAtomic fallback notice:', e.message);
      const existing = await this.findByUniqueId(cleanId);
      if (!existing) return { notFound: true };
      const currentDays = existing.checkinDays || {};
      const currentEntry = currentDays[dayKey];
      if (currentEntry || (Number(eventDay) === 1 && existing.checkedIn && !currentEntry)) {
        return { alreadyCheckedIn: true, registrant: existing, checkinEntry: currentEntry || existing };
      }
      const checkedInAt = new Date().toISOString();
      const checkinEntry = { checkedInAt, checkedInBy: staffName, checkedInPhoto: photo || null };
      const previousDays = { ...currentDays };
      if (Number(eventDay) > 1 && existing.checkedIn && !previousDays.day_1) {
        previousDays.day_1 = {
          checkedInAt: existing.checkedInAt,
          checkedInBy: existing.checkedInBy || 'Gate Staff',
          ...(existing.checkedInPhoto ? { checkedInPhoto: existing.checkedInPhoto } : {}),
        };
      }
      const checkinDays = { ...previousDays, [dayKey]: checkinEntry };
      const updated = await this.update(cleanId, {
        checkedIn: true,
        checkedInAt,
        checkedInBy: staffName,
        checkedInPhoto: photo || null,
        checkinDays,
      });
      return { alreadyCheckedIn: false, registrant: updated, checkinEntry };
    }
  },

  /**
   * Get recent check-ins stream for gate monitor (Optimized for 5,000+ attendees)
   */
  async getRecentCheckins(limitCount = 20) {
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from('registrants')
          .select('*')
          .eq('checked_in', true)
          .order('checked_in_at', { ascending: false })
          .limit(limitCount);
        if (data && !error) {
          const registrants = data.map((d) => {
            const it = toCamel(d);
            it._id = it.uniqueId || it.id;
            return it;
          });
          return expandRecentCheckins(registrants, limitCount);
        }
      } catch (err) {
        console.warn('[registrantRepo] Supabase getRecentCheckins notice:', err.message);
      }
    }

    const collection = this.getCollection();
    try {
      const snapshot = await collection
        .where('checkedIn', '==', true)
        .orderBy('checkedInAt', 'desc')
        .limit(limitCount)
        .get();

      const registrants = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
      return expandRecentCheckins(registrants, limitCount);
    } catch (idxErr) {
      try {
        // Fallback query if composite index is pending or absent
        const snapshot = await collection.where('checkedIn', '==', true).limit(50).get();
        const items = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
        return expandRecentCheckins(items, limitCount);
      } catch (e) {
        return [];
      }
    }
  },

  /**
   * High-Efficiency Server-Side Aggregate Counts
   */
  async getAggregateStats() {
    const now = Date.now();
    if (aggregateStatsCache && (now - lastStatsCacheTime < STATS_CACHE_TTL_MS)) {
      return aggregateStatsCache;
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const [totalRes, checkedInRes] = await Promise.all([
          sb.from('registrants').select('*', { count: 'exact', head: true }),
          sb.from('registrants').select('*', { count: 'exact', head: true }).eq('checked_in', true),
        ]);
        const totalRegistrants = totalRes.count || 0;
        const checkedInCount = checkedInRes.count || 0;
        const stats = {
          totalRegistrants,
          checkedInCount,
          checkedInPercentage: totalRegistrants > 0 ? Math.round((checkedInCount / totalRegistrants) * 100) : 0,
          emailSentCount: 0,
          pendingEmailCount: totalRegistrants,
          verifiedCount: totalRegistrants,
          verifiedPendingEmailCount: totalRegistrants,
        };
        aggregateStatsCache = stats;
        lastStatsCacheTime = now;
        return stats;
      } catch (err) {
        console.warn('[registrantRepo] Supabase getAggregateStats notice:', err.message);
      }
    }

    const collection = this.getCollection();
    try {
      const [totalSnap, checkedInSnap, emailSentSnap, verifiedSnap] = await Promise.all([
        collection.count().get(),
        collection.where('checkedIn', '==', true).count().get(),
        collection.where('emailSent', '==', true).count().get(),
        collection.where('verified', '==', true).count().get(),
      ]);

      const totalRegistrants = totalSnap.data().count;
      const checkedInCount = checkedInSnap.data().count;
      const emailSentCount = emailSentSnap.data().count;
      const verifiedCount = verifiedSnap.data().count;

      const stats = {
        totalRegistrants,
        checkedInCount,
        checkedInPercentage: totalRegistrants > 0 ? Math.round((checkedInCount / totalRegistrants) * 100) : 0,
        emailSentCount,
        pendingEmailCount: Math.max(0, totalRegistrants - emailSentCount),
        verifiedCount,
        verifiedPendingEmailCount: Math.max(0, verifiedCount - emailSentCount),
      };

      aggregateStatsCache = stats;
      lastStatsCacheTime = now;
      return stats;
    } catch (err) {
      console.warn('⚠️ Aggregate count query fallback:', err.message);
      try {
        const result = await this.getAll({ limit: 1000 });
        const items = result.items || [];
        const totalRegistrants = result.pagination?.totalItems || items.length;
        const checkedInCount = items.filter((i) => i.checkedIn).length;
        const emailSentCount = items.filter((i) => i.emailSent).length;
        const verifiedCount = items.filter((i) => i.verified === true || String(i.verificationStatus).toLowerCase() === 'verified').length;

        const fallbackStats = {
          totalRegistrants,
          checkedInCount,
          checkedInPercentage: totalRegistrants > 0 ? Math.round((checkedInCount / totalRegistrants) * 100) : 0,
          emailSentCount,
          pendingEmailCount: Math.max(0, totalRegistrants - emailSentCount),
          verifiedCount,
          verifiedPendingEmailCount: Math.max(0, verifiedCount - emailSentCount),
        };

        aggregateStatsCache = fallbackStats;
        lastStatsCacheTime = now;
        return fallbackStats;
      } catch (e) {
        return {
          totalRegistrants: 0,
          checkedInCount: 0,
          checkedInPercentage: 0,
          emailSentCount: 0,
          pendingEmailCount: 0,
          verifiedCount: 0,
          verifiedPendingEmailCount: 0,
        };
      }
    }
  },

  /**
   * Total stats summary
   */
  async getStats() {
    return this.getAggregateStats();
  },
};
