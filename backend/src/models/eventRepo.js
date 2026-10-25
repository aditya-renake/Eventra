import { getFirestore } from '../config/firebase.js';

let eventsMemoryCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000;
let hasSeededEvents = false;

function invalidateCache() {
  eventsMemoryCache = null;
  lastCacheTime = 0;
}

export const DEFAULT_EVENTS = [
  {
    id: 'eventra-2026',
    eventId: 'eventra-2026',
    slug: 'eventra-2026',
    name: 'Eventra 2026',
    tagline: "India's Flagship 48-Hour National Hackathon • ACES DIT Pune",
    category: 'Hackathon',
    structureType: 'single',
    collegeName: 'Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune',
    clubName: 'ACES (Association of Computer Engineering Students)',
    clubCode: 'ACES-DIT',
    description: '48-hour continuous hackathon with ₹15,00,000+ prize pool, Gigabit Wi-Fi, mentorship, and high-density computing labs at Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune.',
    bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    themeColor: '#596EE6',
    mode: 'in_person',
    startDate: '2026-10-16T09:00',
    endDate: '2026-10-18T18:00',
    dateDisplay: 'October 16 – 18, 2026',
    timeDisplay: '09:00 AM IST (Gate Check-in starts 07:30 AM)',
    venue: 'Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune',
    venueHall: 'DIT Main Auditorium & High-Density Compute Labs',
    mapUrl: 'https://maps.google.com/?q=Dr.+D.+Y.+Patil+Institute+of+Technology+Pimpri+Pune',
    meetingUrl: '',
    organizerName: 'Aditya Renake',
    organizerRole: 'Lead Operations & Main Event Organizer',
    organizerEmail: 'tigeradi1504@gmail.com',
    organizerPhone: '+91 9890829874',
    alternatePOC: '',
    pricingType: 'paid',
    entryFee: 5,
    feeDisplay: '₹5 Entry Pass',
    ticketTiers: ['Hacker Pass', 'Student Pass', 'VIP Delegate', 'Judge / Mentor'],
    ticketPrices: {
      'Hacker Pass': 5,
      'Student Pass': 5,
      'VIP Delegate': 5,
      'Judge / Mentor': 5,
    },
    tracks: [
      'AI & Agentic Systems',
      'Cybersecurity & Privacy',
      'Web3 & Decentralized Tech',
      'Cloud & Distributed Systems',
      'Open Innovation & Campus Tech',
    ],
    schedule: [
      { day: 'DAY 1', time: '07:30 AM', title: 'Express Gate Check-in & Breakfast', desc: 'Scan your digital QR pass at the main entrance to collect your badge and kit.' },
      { day: 'DAY 1', time: '09:30 AM', title: 'Inauguration & Track Release', desc: 'Official keynote by dignitaries and release of problem statements in the Main Auditorium.' },
      { day: 'DAY 1', time: '11:00 AM', title: '48-Hour Hackathon Commences ⚡', desc: 'Hacking begins with Gigabit Wi-Fi, high-density lab access, and uninterrupted power.' },
      { day: 'DAY 2', time: '02:00 PM', title: 'Midway Mentor Review', desc: '1-on-1 architecture reviews and dry runs with industry engineers and startup founders.' },
      { day: 'DAY 3', time: '11:00 AM', title: 'Code Freeze & Project Submission', desc: 'GitHub repositories frozen and demo verification completed.' },
      { day: 'DAY 3', time: '03:00 PM', title: 'Grand Finale & Award Ceremony', desc: 'Top team live stage pitches and prize distribution.' },
    ],
    subEvents: [],
    requiredFields: {
      fullName: true,
      email: true,
      phone: true,
      college: true,
      branch: false,
      year: false,
      prn: false,
      github: false,
      linkedin: false,
    },
    customQuestion: '',
    whatsappUrl: '',
    discordUrl: '',
    brochureUrl: '',
    socialUrl: '',
    status: 'live',
    isFlagship: true,
    totalCapacity: 500,
    assignedEventHeads: ['adityarenake'],
    assignedScanners: ['adityarenake'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ai-agents-workshop-2026',
    eventId: 'ai-agents-workshop-2026',
    slug: 'ai-agents-workshop-2026',
    name: 'AI & Multi-Agent Swarms Bootcamp',
    tagline: 'Deep Dive into LLM Orchestration, LangChain & Autonomous Workflows',
    category: 'Workshop',
    structureType: 'single',
    collegeName: 'Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune',
    clubName: 'ACES Technical Council',
    clubCode: 'ACES-AI',
    description: 'Hands-on 2-day technical bootcamp where students build autonomous agent swarms, tool-calling agents, and production RAG pipelines with live GPU workstations.',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    themeColor: '#8B5CF6',
    mode: 'in_person',
    startDate: '2026-11-05T10:00',
    endDate: '2026-11-06T17:00',
    dateDisplay: 'November 5 – 6, 2026',
    timeDisplay: '10:00 AM – 05:00 PM IST',
    venue: 'ACES High-Performance AI Lab (Block 402), DIT Pune',
    venueHall: 'Block 402 AI Lab',
    mapUrl: 'https://maps.google.com/?q=Dr.+D.+Y.+Patil+Institute+of+Technology+Pimpri+Pune',
    meetingUrl: '',
    organizerName: 'Aditya Renake',
    organizerRole: 'Technical Lead',
    organizerEmail: 'tigeradi1504@gmail.com',
    organizerPhone: '+91 9890829874',
    alternatePOC: '',
    pricingType: 'paid',
    entryFee: 5,
    feeDisplay: '₹5 Bootcamp Pass',
    ticketTiers: ['Workshop Pass', 'Student Pass'],
    ticketPrices: {
      'Workshop Pass': 5,
      'Student Pass': 5,
    },
    tracks: ['Multi-Agent Systems', 'Model Fine-tuning', 'Vector Search'],
    schedule: [
      { day: 'DAY 1', time: '09:30 AM', title: 'Welcome & Environment Setup', desc: 'Colab, GPU keys, and agent framework initialization in Block 402 AI Lab.' },
      { day: 'DAY 1', time: '11:00 AM', title: 'Multi-Agent Architectures Deep-Dive', desc: 'Hands-on orchestration of supervisor and worker LLM agent pipelines.' },
      { day: 'DAY 2', time: '10:00 AM', title: 'Production Tool Calling & RAG Pipelines', desc: 'Building secure tool execution, vector storage, and long-term memory.' },
      { day: 'DAY 2', time: '03:30 PM', title: 'Autonomous Swarm Hack & Showcase', desc: 'Build and deploy an autonomous campus agent demo live on stage.' },
    ],
    subEvents: [],
    status: 'upcoming',
    isFlagship: false,
    totalCapacity: 120,
    assignedEventHeads: ['adityarenake'],
    assignedScanners: ['adityarenake'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'aces-esports-cup-2026',
    eventId: 'aces-esports-cup-2026',
    slug: 'aces-esports-cup-2026',
    name: 'ACES Inter-College Esports Arena',
    tagline: 'Valorant & BGMI LAN Championship with Live Stage Projection',
    category: 'Gaming',
    structureType: 'single',
    collegeName: 'Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune',
    clubName: 'ACES Sports & Esports Committee',
    clubCode: 'ACES-LAN',
    description: 'High-octane collegiate LAN esports championship featuring 32 shortlisted teams competing on ultra-low latency fiber networks with live shoutcasting.',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    themeColor: '#10B981',
    mode: 'in_person',
    startDate: '2026-11-20T11:00',
    endDate: '2026-11-21T20:00',
    dateDisplay: 'November 20 – 21, 2026',
    timeDisplay: '11:00 AM – 08:00 PM IST',
    venue: 'DIT Main Auditorium & ACES Esports Zone, Pimpri, Pune',
    venueHall: 'DIT Main Auditorium',
    mapUrl: 'https://maps.google.com/?q=Dr.+D.+Y.+Patil+Institute+of+Technology+Pimpri+Pune',
    meetingUrl: '',
    organizerName: 'Aditya Renake',
    organizerRole: 'Esports Lead',
    organizerEmail: 'tigeradi1504@gmail.com',
    organizerPhone: '+91 9890829874',
    alternatePOC: '',
    pricingType: 'paid',
    entryFee: 5,
    feeDisplay: '₹5 Arena Pass',
    ticketTiers: ['Player Pass', 'Spectator Pass', 'VIP Lounge'],
    ticketPrices: {
      'Player Pass': 5,
      'Spectator Pass': 5,
      'VIP Lounge': 5,
    },
    tracks: ['Valorant 5v5', 'BGMI Squads'],
    schedule: [
      { day: 'DAY 1', time: '10:30 AM', title: 'LAN Seat Allocation & Ping Tests', desc: 'Rig check, peripherals verification, and low-latency LAN routing check.' },
      { day: 'DAY 1', time: '12:00 PM', title: 'Valorant 5v5 Quarterfinals', desc: 'Bo3 elimination matches on high-refresh stage monitors.' },
      { day: 'DAY 2', time: '11:00 AM', title: 'BGMI Squad LAN Championship', desc: '4 map matches with custom tournament lobbies and live broadcast.' },
      { day: 'DAY 2', time: '06:00 PM', title: 'Grand Finals & Trophy Ceremony', desc: 'Championship trophy presentation and cash prize awards in Auditorium.' },
    ],
    subEvents: [],
    status: 'upcoming',
    isFlagship: false,
    totalCapacity: 350,
    assignedEventHeads: ['adityarenake'],
    assignedScanners: ['adityarenake'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const deletedEventIds = new Set();

export const eventRepo = {
  getCollection() {
    const db = getFirestore();
    return db.collection('club_events');
  },

  /**
   * Seed default events if collection is empty
   */
  async seedDefaultEvents() {
    if (hasSeededEvents) return;
    hasSeededEvents = true;
    try {
      const collection = this.getCollection();
      const snapshot = await collection.limit(1).get();

      if (snapshot.empty) {
        console.log('🌱 [eventRepo] Seeding initial ACES events catalog...');
        for (const ev of DEFAULT_EVENTS) {
          if (!deletedEventIds.has(ev.id)) {
            await collection.doc(ev.id).set(ev);
          }
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
          const data = doc.data();
          const docId = doc.id;
          if (!deletedEventIds.has(docId)) {
            events.push({ ...data, id: docId, eventId: docId });
          }
        });

        if (events.length === 0) {
          events = DEFAULT_EVENTS.filter((ev) => !deletedEventIds.has(ev.id));
        }

        // Sort so flagship event is first, then live, then latest
        events.sort((a, b) => {
          if (a.isFlagship && !b.isFlagship) return -1;
          if (b.isFlagship && !a.isFlagship) return 1;
          if (a.status === 'live' && b.status !== 'live') return -1;
          if (b.status === 'live' && a.status !== 'live') return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        eventsMemoryCache = events;
        lastCacheTime = now;
      } catch (e) {
        console.warn('[eventRepo] getAll fallback to defaults:', e.message);
        events = DEFAULT_EVENTS.filter((ev) => !deletedEventIds.has(ev.id));
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
          (ev.category && ev.category.toLowerCase().includes(s)) ||
          (ev.clubName && ev.clubName.toLowerCase().includes(s)) ||
          (ev.collegeName && ev.collegeName.toLowerCase().includes(s))
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
    if (!cleanId || cleanId === '[object object]') return null;

    const all = await this.getAll();
    const match = all.find(
      (ev) =>
        String(ev.id || '').toLowerCase() === cleanId ||
        String(ev.eventId || '').toLowerCase() === cleanId ||
        String(ev.slug || '').toLowerCase() === cleanId
    );
    if (match) return match;

    try {
      const collection = this.getCollection();
      const doc = await collection.doc(cleanId).get();
      if (doc.exists) {
        return { ...doc.data(), id: doc.id, eventId: doc.id };
      }
    } catch (e) {
      console.warn('[eventRepo] findById error:', e.message);
    }

    return DEFAULT_EVENTS.find((ev) => ev.id === cleanId || ev.slug === cleanId) || null;
  },

  /**
   * Create a new club event
   */
  async create(data) {
    invalidateCache();
    const rawId = data.eventId || data.id || data.slug || data.name || `event-${Date.now()}`;
    const cleanId = String(rawId)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `event-${Date.now()}`;

    deletedEventIds.delete(cleanId);

    const parsedEntryFee = data.pricingType === 'free'
      ? 0
      : (data.entryFee !== undefined && !isNaN(Number(data.entryFee)) ? Math.max(0, Number(data.entryFee)) : 5);

    const tiers = Array.isArray(data.ticketTiers) && data.ticketTiers.length > 0
      ? data.ticketTiers
      : (typeof data.ticketTiers === 'string' && data.ticketTiers.trim()
          ? data.ticketTiers.split(',').map((t) => t.trim()).filter(Boolean)
          : ['Standard Pass']);

    const tracks = Array.isArray(data.tracks) && data.tracks.length > 0
      ? data.tracks
      : (typeof data.tracks === 'string' && data.tracks.trim()
          ? data.tracks.split(',').map((t) => t.trim()).filter(Boolean)
          : ['General Track']);

    let ticketPrices = {};
    if (data.ticketPrices && typeof data.ticketPrices === 'object' && Object.keys(data.ticketPrices).length > 0) {
      for (const [k, v] of Object.entries(data.ticketPrices)) {
        const num = Number(v);
        ticketPrices[k] = !isNaN(num) && num >= 0 ? num : parsedEntryFee;
      }
    } else {
      tiers.forEach((t) => {
        ticketPrices[t] = parsedEntryFee;
      });
    }

    const eventItem = {
      ...data,
      id: cleanId,
      eventId: cleanId,
      slug: data.slug || cleanId,
      name: data.name.trim(),
      tagline: data.tagline ? data.tagline.trim() : (data.description ? data.description.trim().slice(0, 120) : ''),
      description: data.description ? data.description.trim() : '',
      category: data.category || 'Workshop',
      structureType: data.structureType || 'single',
      collegeName: data.collegeName ? data.collegeName.trim() : '',
      clubName: data.clubName ? data.clubName.trim() : '',
      clubCode: data.clubCode ? data.clubCode.trim() : '',
      mode: data.mode || 'in_person',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      dateDisplay: data.dateDisplay || 'Dates TBA',
      timeDisplay: data.timeDisplay || 'Schedule TBA',
      venue: data.venue ? data.venue.trim() : 'Campus Venue',
      venueHall: data.venueHall ? data.venueHall.trim() : '',
      mapUrl: data.mapUrl ? data.mapUrl.trim() : '',
      meetingUrl: data.meetingUrl ? data.meetingUrl.trim() : '',
      themeColor: data.themeColor || '#596EE6',
      bannerUrl: data.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      organizerName: data.organizerName ? data.organizerName.trim() : '',
      organizerRole: data.organizerRole ? data.organizerRole.trim() : '',
      organizerEmail: data.organizerEmail ? data.organizerEmail.trim() : '',
      organizerPhone: data.organizerPhone ? data.organizerPhone.trim() : '',
      alternatePOC: data.alternatePOC ? data.alternatePOC.trim() : '',
      pricingType: parsedEntryFee === 0 ? 'free' : (data.pricingType || 'paid'),
      entryFee: parsedEntryFee,
      feeDisplay: data.feeDisplay || (parsedEntryFee === 0 ? 'Free Entry Pass' : `₹${parsedEntryFee} Entry Pass`),
      ticketTiers: tiers,
      ticketPrices,
      tracks,
      schedule: Array.isArray(data.schedule) ? data.schedule : [],
      subEvents: Array.isArray(data.subEvents) ? data.subEvents : [],
      requiredFields: data.requiredFields || {
        fullName: true,
        email: true,
        phone: true,
        college: true,
        branch: false,
        year: false,
        prn: false,
        github: false,
        linkedin: false,
      },
      customQuestion: data.customQuestion ? data.customQuestion.trim() : '',
      whatsappUrl: data.whatsappUrl ? data.whatsappUrl.trim() : '',
      discordUrl: data.discordUrl ? data.discordUrl.trim() : '',
      brochureUrl: data.brochureUrl ? data.brochureUrl.trim() : '',
      socialUrl: data.socialUrl ? data.socialUrl.trim() : '',
      status: data.status || 'live',
      isFlagship: Boolean(data.isFlagship),
      allowSpotRegistration: data.allowSpotRegistration !== false,
      totalCapacity: parseInt(data.totalCapacity || 250, 10),
      assignedEventHeads: Array.isArray(data.assignedEventHeads) ? data.assignedEventHeads : ['adityarenake'],
      assignedScanners: Array.isArray(data.assignedScanners) ? data.assignedScanners : ['adityarenake'],
      createdAt: data.createdAt || new Date().toISOString(),
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

    if (data.isFlagship) {
      await this.setFlagship(cleanId);
    }

    return eventItem;
  },

  /**
   * Set an event as the sole Flagship Event and sync with site config
   */
  async setFlagship(eventId) {
    invalidateCache();
    if (!eventId) return null;
    const cleanId = String(eventId).toLowerCase().trim();
    const collection = this.getCollection();

    try {
      const snapshot = await collection.get();
      const batch = getFirestore().batch();
      snapshot.docs.forEach((doc) => {
        const docId = doc.id.toLowerCase().trim();
        if (docId === cleanId) {
          batch.update(doc.ref, { isFlagship: true, updatedAt: new Date().toISOString() });
        } else if (doc.data().isFlagship) {
          batch.update(doc.ref, { isFlagship: false, updatedAt: new Date().toISOString() });
        }
      });
      await batch.commit();
    } catch (e) {
      console.warn('[eventRepo] setFlagship batch notice:', e.message);
    }

    DEFAULT_EVENTS.forEach((ev) => {
      ev.isFlagship = ((ev.id || '').toLowerCase() === cleanId || (ev.slug || '').toLowerCase() === cleanId);
    });
    if (eventsMemoryCache) {
      eventsMemoryCache.forEach((ev) => {
        ev.isFlagship = ((ev.id || '').toLowerCase() === cleanId || (ev.slug || '').toLowerCase() === cleanId);
      });
    }

    const targetEvent = await this.findById(cleanId);
    if (targetEvent) {
      targetEvent.isFlagship = true;
      try {
        const { configRepo } = await import('./configRepo.js');
        const parsedFee = targetEvent.pricingType === 'free' ? 0 : (targetEvent.entryFee !== undefined ? Number(targetEvent.entryFee) : 5);
        await configRepo.updateConfig({
          activeEventId: cleanId,
          eventName: targetEvent.name,
          eventTagline: targetEvent.tagline || '',
          eventDescription: targetEvent.description || '',
          category: targetEvent.category || 'Hackathon',
          structureType: targetEvent.structureType || 'single',
          collegeName: targetEvent.collegeName || '',
          clubName: targetEvent.clubName || '',
          clubCode: targetEvent.clubCode || '',
          eventDate: targetEvent.dateDisplay || 'Dates TBA',
          eventTime: targetEvent.timeDisplay || 'Schedule TBA',
          startDate: targetEvent.startDate || '',
          endDate: targetEvent.endDate || '',
          eventVenue: targetEvent.venue || 'Campus Venue',
          venueHall: targetEvent.venueHall || '',
          mapUrl: targetEvent.mapUrl || '',
          meetingUrl: targetEvent.meetingUrl || '',
          bannerUrl: targetEvent.bannerUrl || '',
          themeColor: targetEvent.themeColor || '#596EE6',
          entryFee: parsedFee,
          pricingType: parsedFee === 0 ? 'free' : 'paid',
          feeDisplay: targetEvent.feeDisplay || (parsedFee === 0 ? 'Free Entry Pass' : `₹${parsedFee} Entry Pass`),
          totalCapacity: targetEvent.totalCapacity || 250,
          ticketTiers: targetEvent.ticketTiers || ['Standard Pass'],
          ticketPrices: targetEvent.ticketPrices || { 'Standard Pass': parsedFee },
          tracks: targetEvent.tracks || [],
          subEvents: targetEvent.subEvents || [],
          schedule: targetEvent.schedule || [],
        });
      } catch (cfgErr) {
        console.warn('[eventRepo] setFlagship config sync error:', cfgErr.message);
      }
    }

    return targetEvent;
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
      id: existing.id || cleanId,
      eventId: existing.eventId || cleanId,
      updatedAt: new Date().toISOString(),
    };

    if (updates.schedule !== undefined) {
      merged.schedule = Array.isArray(updates.schedule) ? updates.schedule : [];
    }

    if (updates.ticketTiers && typeof updates.ticketTiers === 'string') {
      merged.ticketTiers = updates.ticketTiers.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (updates.tracks && typeof updates.tracks === 'string') {
      merged.tracks = updates.tracks.split(',').map((t) => t.trim()).filter(Boolean);
    }

    if (updates.pricingType === 'free' || (updates.entryFee !== undefined && Number(updates.entryFee) === 0)) {
      merged.pricingType = 'free';
      merged.entryFee = 0;
      merged.feeDisplay = 'Free Entry Pass';
    } else if (updates.entryFee !== undefined && !isNaN(Number(updates.entryFee))) {
      merged.entryFee = Number(updates.entryFee);
      merged.pricingType = merged.entryFee === 0 ? 'free' : 'paid';
      merged.feeDisplay = updates.feeDisplay || (merged.entryFee === 0 ? 'Free Entry Pass' : `₹${merged.entryFee} Entry Pass`);
    }

    if (!updates.ticketPrices && Array.isArray(merged.ticketTiers)) {
      const nextPrices = {};
      merged.ticketTiers.forEach((tier) => {
        nextPrices[tier] = merged.entryFee !== undefined ? Number(merged.entryFee) : 5;
      });
      merged.ticketPrices = nextPrices;
    }

    try {
      await collection.doc(merged.id).set(merged);
    } catch (e) {
      console.warn('[eventRepo] update notice:', e.message);
    }

    const idx = DEFAULT_EVENTS.findIndex((ev) => ev.id === merged.id || ev.eventId === merged.id);
    if (idx >= 0) {
      DEFAULT_EVENTS[idx] = merged;
    }

    if (updates.isFlagship === true) {
      await this.setFlagship(cleanId);
    }

    return merged;
  },

  /**
   * Delete an event
   */
  async delete(eventId) {
    invalidateCache();
    if (!eventId) return false;
    const cleanId = String(eventId).toLowerCase().trim();
    deletedEventIds.add(cleanId);
    const idx = DEFAULT_EVENTS.findIndex((ev) => ev.id === cleanId || ev.eventId === cleanId);
    if (idx >= 0) {
      DEFAULT_EVENTS.splice(idx, 1);
    }
    try {
      const collection = this.getCollection();
      await collection.doc(cleanId).delete();
    } catch (e) {
      console.warn('[eventRepo] delete notice:', e.message);
    }
    return true;
  },
};
