import { getFirestore } from '../config/firebase.js';

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

export const registrantRepo = {
  getCollection() {
    const db = getFirestore();
    return db.collection('registrants');
  },

  /**
   * Create or overwrite registrant document in Firestore
   */
  async create(data) {
    invalidateCache();
    const collection = this.getCollection();
    const cleanId = data.uniqueId.toUpperCase().trim();
    const item = {
      ...data,
      _id: cleanId,
      uniqueId: cleanId,
      email: data.email.toLowerCase().trim(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await collection.doc(cleanId).set(item);
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

    const collection = this.getCollection();
    const doc = await collection.doc(cleanId).get();
    if (doc.exists) {
      return { _id: doc.id, ...doc.data() };
    }
    return null;
  },

  /**
   * Find registrant by email address
   */
  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();

    // Check in-memory cache first if warm (returning newest)
    if (memoryCache && (Date.now() - lastCacheTime < CACHE_TTL_MS)) {
      const matches = memoryCache.filter((r) => String(r.email).toLowerCase().trim() === cleanEmail);
      if (matches.length > 0) {
        matches.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return matches[0];
      }
    }

    const collection = this.getCollection();
    const snapshot = await collection.where('email', '==', cleanEmail).get();
    if (!snapshot.empty) {
      const items = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return items[0];
    }
    return null;
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

    const collection = this.getCollection();
    const snapshot = await collection.where('utrNumber', '==', cleanUtr).limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { _id: doc.id, ...doc.data() };
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
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    let items = [];

    const now = Date.now();
    if (memoryCache && (now - lastCacheTime < CACHE_TTL_MS)) {
      items = [...memoryCache];
    } else {
      const collection = this.getCollection();
      const snapshot = await collection.get();
      snapshot.docs.forEach((doc) => {
        items.push({ _id: doc.id, ...doc.data() });
      });
      memoryCache = items;
      lastCacheTime = now;
    }

    // Total counts across all items
    const totalAll = items.length;
    const checkedInCount = items.filter((i) => i.checkedIn).length;
    const emailSentCount = items.filter((i) => i.emailSent).length;
    const verifiedCount = items.filter((i) => i.verified === true || String(i.verificationStatus).toLowerCase() === 'verified').length;
    const verifiedPendingEmailCount = items.filter((i) => (i.verified === true || String(i.verificationStatus).toLowerCase() === 'verified') && !i.emailSent).length;

    // Filters
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
      },
    };
  },

  /**
   * Update registrant document in Firestore
   */
  async update(uniqueId, updates) {
    invalidateCache();
    if (!uniqueId) return null;
    const cleanId = uniqueId.toUpperCase().trim();
    const collection = this.getCollection();

    const existing = await this.findByUniqueId(cleanId);
    if (!existing) return null;

    const merged = {
      ...existing,
      ...updates,
      uniqueId: cleanId,
      updatedAt: new Date().toISOString(),
    };

    await collection.doc(cleanId).set(merged, { merge: true });
    return merged;
  },

  /**
   * Delete registrant document
   */
  async delete(uniqueId) {
    invalidateCache();
    if (!uniqueId) return false;
    const cleanId = uniqueId.toUpperCase().trim();
    const collection = this.getCollection();
    await collection.doc(cleanId).delete();
    return true;
  },

  /**
   * Atomic Check-In via Firestore Transaction
   * Guarantees zero race conditions / zero duplicate check-ins across multiple concurrent gate scanners
   */
  async checkinAtomic(uniqueId, { staffName = 'Gate Scanner', photo = null } = {}) {
    if (!uniqueId) return { notFound: true };
    const cleanId = uniqueId.toUpperCase().trim();
    const db = getFirestore();
    const docRef = db.collection('registrants').doc(cleanId);

    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) {
        return { notFound: true };
      }

      const data = doc.data();
      if (data.checkedIn) {
        return {
          alreadyCheckedIn: true,
          registrant: { _id: doc.id, ...data },
        };
      }

      const checkedInAt = new Date().toISOString();
      const updateFields = {
        checkedIn: true,
        checkedInAt,
        checkedInBy: staffName,
        updatedAt: checkedInAt,
      };

      if (photo) {
        updateFields.checkedInPhoto = photo;
      }

      transaction.update(docRef, updateFields);

      return {
        alreadyCheckedIn: false,
        registrant: { _id: doc.id, ...data, ...updateFields },
      };
    });

    invalidateCache();
    return result;
  },

  /**
   * Get recent check-ins stream for gate monitor (Optimized for 5,000+ attendees)
   */
  async getRecentCheckins(limitCount = 20) {
    const collection = this.getCollection();
    try {
      const snapshot = await collection
        .where('checkedIn', '==', true)
        .orderBy('checkedInAt', 'desc')
        .limit(limitCount)
        .get();

      return snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
    } catch (idxErr) {
      // Fallback query if composite index is pending or absent
      const snapshot = await collection.where('checkedIn', '==', true).limit(50).get();
      const items = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
      items.sort((a, b) => new Date(b.checkedInAt || 0) - new Date(a.checkedInAt || 0));
      return items.slice(0, limitCount);
    }
  },

  /**
   * High-Efficiency Server-Side Aggregate Counts
   * Uses native Firestore collection.count().get() to calculate stats without scanning 5,000 documents
   */
  async getAggregateStats() {
    const now = Date.now();
    if (aggregateStatsCache && (now - lastStatsCacheTime < STATS_CACHE_TTL_MS)) {
      return aggregateStatsCache;
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
      // Fallback calculation
      const snapshot = await collection.get();
      const items = snapshot.docs.map((d) => d.data());
      const totalRegistrants = items.length;
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
    }
  },

  /**
   * Total stats summary
   */
  async getStats() {
    return this.getAggregateStats();
  },
};
