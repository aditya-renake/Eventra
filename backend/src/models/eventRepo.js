import { getFirestore } from '../config/firebase.js';

let eventsMemoryCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5000;

function invalidateCache() {
  eventsMemoryCache = null;
  lastCacheTime = 0;
}

export const DEFAULT_EVENTS = [
  {
    id: 'eventra-2026',
    eventId: 'eventra-2026',
    name: 'Eventra 2026',
    tagline: "India's Flagship 48-Hour National Hackathon • ACES DIT Pune",
    category: 'Hackathon',
    description: '48-hour continuous hackathon with ₹15,00,000+ prize pool, Gigabit Wi-Fi, mentorship, and high-density computing labs at Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune.',
    bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    startDate: '2026-10-16T09:00:00.000Z',
    endDate: '2026-10-18T18:00:00.000Z',
    dateDisplay: 'October 16 – 18, 2026',
    timeDisplay: '09:00 AM IST (Gate Check-in starts 07:30 AM)',
    venue: 'Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune',
    organizerName: 'ACES (Association of Computer Engineering Students)',
    organizerEmail: 'tigeradi1504@gmail.com',
    ticketTiers: ['Hacker Pass', 'VIP Delegate', 'Judge Pass', 'Mentor'],
    tracks: [
      'AI & Agentic Systems',
      'Cybersecurity & Privacy',
      'Web3 & Decentralized Tech',
      'Cloud & Distributed Systems',
      'Open Innovation & Campus Tech',
    ],
    status: 'live',
    isFlagship: true,
    totalCapacity: 500,
    assignedEventHeads: ['adityarenake'],
    assignedScanners: ['adityarenake'],
    entryFee: 5,
    feeDisplay: '₹5 Entry Pass',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ai-agents-workshop-2026',
    eventId: 'ai-agents-workshop-2026',
    name: 'AI & Multi-Agent Swarms Bootcamp',
    tagline: 'Deep Dive into LLM Orchestration, LangChain & Autonomous Workflows',
    category: 'Workshop',
    description: 'Hands-on 2-day technical bootcamp where students build autonomous agent swarms, tool-calling agents, and production RAG pipelines with live GPU workstations.',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    startDate: '2026-11-05T10:00:00.000Z',
    endDate: '2026-11-06T17:00:00.000Z',
    dateDisplay: 'November 5 – 6, 2026',
    timeDisplay: '10:00 AM – 05:00 PM IST',
    venue: 'ACES High-Performance AI Lab (Block 402), DIT Pune',
    organizerName: 'ACES Technical Council',
    organizerEmail: 'tigeradi1504@gmail.com',
    ticketTiers: ['Workshop Pass', 'Student Pass'],
    tracks: ['Multi-Agent Systems', 'Model Fine-tuning', 'Vector Search'],
    status: 'upcoming',
    isFlagship: false,
    totalCapacity: 120,
    assignedEventHeads: ['adityarenake'],
    assignedScanners: ['adityarenake'],
    entryFee: 5,
    feeDisplay: '₹5 Bootcamp Pass',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'aces-esports-cup-2026',
    eventId: 'aces-esports-cup-2026',
    name: 'ACES Inter-College Esports Arena',
    tagline: 'Valorant & BGMI LAN Championship with Live Stage Projection',
    category: 'Gaming',
    description: 'High-octane collegiate LAN esports championship featuring 32 shortlisted teams competing on ultra-low latency fiber networks with live shoutcasting.',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    startDate: '2026-11-20T11:00:00.000Z',
    endDate: '2026-11-21T20:00:00.000Z',
    dateDisplay: 'November 20 – 21, 2026',
    timeDisplay: '11:00 AM – 08:00 PM IST',
    venue: 'DIT Main Auditorium & ACES Esports Zone, Pimpri, Pune',
    organizerName: 'ACES Sports & Esports Committee',
    organizerEmail: 'tigeradi1504@gmail.com',
    ticketTiers: ['Player Pass', 'Spectator Pass', 'VIP Lounge'],
    tracks: ['Valorant 5v5', 'BGMI Squads'],
    status: 'upcoming',
    isFlagship: false,
    totalCapacity: 350,
    assignedEventHeads: ['adityarenake'],
    assignedScanners: ['adityarenake'],
    entryFee: 5,
    feeDisplay: '₹5 Arena Pass',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const eventRepo = {
  getCollection() {
    const db = getFirestore();
    return db.collection('club_events');
  },

  /**
   * Seed default events if collection is empty
   */
  async seedDefaultEvents() {
    try {
      const collection = this.getCollection();
      const snapshot = await collection.limit(1).get();

      if (snapshot.empty) {
        console.log('🌱 [eventRepo] Seeding initial ACES events catalog...');
        for (const ev of DEFAULT_EVENTS) {
          await collection.doc(ev.id).set(ev);
        }
      }
    } catch (e) {
      console.warn('[eventRepo] seedDefaultEvents notice:', e.message);
    }
  },

  /**
   * Fetch all club events with micro-caching
   */
  async getAll({ category, status, search } = {}) {
    await this.seedDefaultEvents();
    let events = [];

    const now = Date.now();
    if (eventsMemoryCache && now - lastCacheTime < CACHE_TTL_MS) {
      events = [...eventsMemoryCache];
    } else {
      try {
        const collection = this.getCollection();
        const snapshot = await collection.get();
        snapshot.docs.forEach((doc) => {
          events.push({ id: doc.id, eventId: doc.id, ...doc.data() });
        });

        if (events.length === 0) {
          events = [...DEFAULT_EVENTS];
        }

        eventsMemoryCache = events;
        lastCacheTime = now;
      } catch (e) {
        console.warn('[eventRepo] getAll fallback to defaults:', e.message);
        events = [...DEFAULT_EVENTS];
      }
    }

    // Apply filters
    if (category && category !== 'all') {
      events = events.filter((ev) => String(ev.category).toLowerCase() === category.toLowerCase());
    }

    if (status && status !== 'all') {
      events = events.filter((ev) => String(ev.status).toLowerCase() === status.toLowerCase());
    }

    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      events = events.filter(
        (ev) =>
          (ev.name && ev.name.toLowerCase().includes(s)) ||
          (ev.tagline && ev.tagline.toLowerCase().includes(s)) ||
          (ev.category && ev.category.toLowerCase().includes(s))
      );
    }

    return events;
  },

  /**
   * Find event by ID or slug
   */
  async findById(eventId) {
    if (!eventId) return null;
    const cleanId = String(eventId).toLowerCase().trim();
    const all = await this.getAll();
    const match = all.find((ev) => ev.id === cleanId || ev.eventId === cleanId);
    if (match) return match;

    try {
      const collection = this.getCollection();
      const doc = await collection.doc(cleanId).get();
      if (doc.exists) {
        return { id: doc.id, eventId: doc.id, ...doc.data() };
      }
    } catch (e) {
      console.warn('[eventRepo] findById error:', e.message);
    }

    return DEFAULT_EVENTS.find((ev) => ev.id === cleanId) || null;
  },

  /**
   * Create a new club event
   */
  async create(data) {
    invalidateCache();
    const cleanId = (data.eventId || data.id || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')).toLowerCase().trim();

    const eventItem = {
      ...data,
      id: cleanId,
      eventId: cleanId,
      name: data.name.trim(),
      category: data.category || 'Workshop',
      status: data.status || 'upcoming',
      ticketTiers: data.ticketTiers || ['Standard Pass'],
      tracks: data.tracks || ['General Track'],
      totalCapacity: parseInt(data.totalCapacity || 200, 10),
      assignedEventHeads: Array.isArray(data.assignedEventHeads) ? data.assignedEventHeads : [],
      assignedScanners: Array.isArray(data.assignedScanners) ? data.assignedScanners : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const collection = this.getCollection();
      await collection.doc(cleanId).set(eventItem);
    } catch (e) {
      console.warn('[eventRepo] create notice (persisting in memory):', e.message);
    }

    // Maintain in memory list for instantaneous offline/dev fallback access
    const existingIdx = DEFAULT_EVENTS.findIndex((ev) => ev.id === cleanId || ev.eventId === cleanId);
    if (existingIdx >= 0) {
      DEFAULT_EVENTS[existingIdx] = eventItem;
    } else {
      DEFAULT_EVENTS.unshift(eventItem);
    }

    return eventItem;
  },

  /**
   * Update an existing event
   */
  async update(eventId, updates) {
    invalidateCache();
    if (!eventId) return null;
    const cleanId = String(eventId).toLowerCase().trim();
    const collection = this.getCollection();

    const existing = await this.findById(cleanId);
    if (!existing) return null;

    const merged = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await collection.doc(cleanId).set(merged, { merge: true });
    return merged;
  },

  /**
   * Delete an event
   */
  async delete(eventId) {
    invalidateCache();
    if (!eventId) return false;
    const cleanId = String(eventId).toLowerCase().trim();
    const collection = this.getCollection();
    await collection.doc(cleanId).delete();
    return true;
  },
};
