import { getFirestore } from '../config/firebase.js';
import { getSupabase, isSupabaseConfigured, toCamel, toSnake } from '../config/supabase.js';

const CONFIG_DOC_ID = 'main_event_2026';

const DEFAULT_CONFIG = {
  activeEventId: 'eventra-2026',
  eventName: 'Eventra 2026',
  eventTagline: 'Presented by ACES — Dept. of Computer Engineering, Dr. D. Y. Patil Institute of Technology, Pimpri, Pune (DYPDPU)',
  eventDescription: '48-hour continuous hackathon with ₹15,00,000+ prize pool, Gigabit Wi-Fi, mentorship, and high-density computing labs at Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune.',
  category: 'Hackathon',
  structureType: 'single',
  collegeName: 'Dr. D. Y. Patil Institute of Technology, Pimpri, Pune',
  clubName: 'ACES (Association of Computer Engineering Students)',
  clubCode: 'ACES-DIT',
  eventDate: 'October 16 - 18, 2026',
  eventTime: '09:00 AM IST (Gate Check-in starts 07:30 AM)',
  startDate: '2026-10-16T09:00',
  endDate: '2026-10-18T18:00',
  eventVenue: 'Dr. D. Y. Patil Institute of Technology (DIT), Sant Tukaram Nagar, Pimpri, Pune - 411018',
  venueHall: 'DIT Main Auditorium & High-Density Compute Labs',
  mode: 'in_person',
  mapUrl: 'https://maps.google.com/?q=Dr.+D.+Y.+Patil+Institute+of+Technology+Pimpri+Pune',
  meetingUrl: '',
  organizerEmail: 'tigeradi1504@gmail.com',
  organizerName: 'Aditya Renake',
  organizerRole: 'Lead Operations & Main Event Organizer',
  organizerPhone: '+91 9890829874',
  alternatePOC: '',
  themeColor: '#596EE6',
  bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
  registrationMode: 'native_payment',
  enablePaymentGateway: true,
  pricingType: 'paid',
  entryFee: 5,
  feeDisplay: '₹5 Entry Pass',
  totalCapacity: 500,
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
  currency: 'INR',
  upiId: 'tigeradi1504-1@okicici',
  upiPayeeName: 'Eventra 2026',
  smtpUser: 'tigeradi1504@gmail.com',
  smtpPass: '',
  emailSubjectTemplate: '🎟️ Your Official Entry Pass for {{eventName}} — {{name}}',
  emailBodyNotice: 'Please present this digital pass with QR code at the registration desk for express check-in.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const configRepo = {
  getCollection() {
    const db = getFirestore();
    return db.collection('event_config');
  },

  /**
   * Fetch current event configuration
   */
  async getConfig() {
    try {
      let data = {};

      if (isSupabaseConfigured()) {
        try {
          const sb = getSupabase();
          const { data: row, error } = await sb.from('system_config').select('*').eq('id', CONFIG_DOC_ID).maybeSingle();
          if (row && !error && row.config_data) {
            data = row.config_data;
          }
        } catch (err) {
          console.warn('[configRepo] Supabase getConfig notice:', err.message);
        }
      }

      if (Object.keys(data).length === 0) {
        try {
          const collection = this.getCollection();
          const doc = await collection.doc(CONFIG_DOC_ID).get();
          if (doc && doc.exists) {
            data = doc.data() || {};
          }
        } catch (err) {
          console.warn('[configRepo] Firestore getConfig notice:', err.message);
        }
      }

      if (Object.keys(data).length === 0) {
        data = { ...DEFAULT_CONFIG };
      }

      // Check for active event in eventRepo and dynamically merge its real properties
      const activeId = data.activeEventId || 'eventra-2026';
      let activeEvent = null;
      try {
        const { eventRepo } = await import('./eventRepo.js');
        activeEvent = await eventRepo.findById(activeId);
      } catch (e) {
        // quiet fallback
      }

      const mergedFromEvent = activeEvent ? {
        activeEventId: activeEvent.id || activeId,
        eventName: activeEvent.name || data.eventName || DEFAULT_CONFIG.eventName,
        eventTagline: activeEvent.tagline !== undefined ? activeEvent.tagline : (data.eventTagline || DEFAULT_CONFIG.eventTagline),
        eventDescription: activeEvent.description !== undefined ? activeEvent.description : (data.eventDescription || DEFAULT_CONFIG.eventDescription),
        category: activeEvent.category || data.category || DEFAULT_CONFIG.category,
        structureType: activeEvent.structureType || data.structureType || DEFAULT_CONFIG.structureType,
        collegeName: activeEvent.collegeName || data.collegeName || DEFAULT_CONFIG.collegeName,
        clubName: activeEvent.clubName || data.clubName || DEFAULT_CONFIG.clubName,
        clubCode: activeEvent.clubCode || data.clubCode || DEFAULT_CONFIG.clubCode,
        eventDate: activeEvent.dateDisplay || data.eventDate || DEFAULT_CONFIG.eventDate,
        eventTime: activeEvent.timeDisplay || data.eventTime || DEFAULT_CONFIG.eventTime,
        startDate: activeEvent.startDate || data.startDate || DEFAULT_CONFIG.startDate,
        endDate: activeEvent.endDate || data.endDate || DEFAULT_CONFIG.endDate,
        eventVenue: activeEvent.venue || data.eventVenue || DEFAULT_CONFIG.eventVenue,
        venueHall: activeEvent.venueHall || data.venueHall || DEFAULT_CONFIG.venueHall,
        mode: activeEvent.mode || data.mode || DEFAULT_CONFIG.mode,
        mapUrl: activeEvent.mapUrl !== undefined ? activeEvent.mapUrl : (data.mapUrl || DEFAULT_CONFIG.mapUrl),
        meetingUrl: activeEvent.meetingUrl !== undefined ? activeEvent.meetingUrl : (data.meetingUrl || ''),
        organizerName: activeEvent.organizerName || data.organizerName || DEFAULT_CONFIG.organizerName,
        organizerRole: activeEvent.organizerRole || data.organizerRole || DEFAULT_CONFIG.organizerRole,
        organizerEmail: activeEvent.organizerEmail || data.organizerEmail || DEFAULT_CONFIG.organizerEmail,
        organizerPhone: activeEvent.organizerPhone !== undefined ? activeEvent.organizerPhone : (data.organizerPhone || DEFAULT_CONFIG.organizerPhone),
        alternatePOC: activeEvent.alternatePOC !== undefined ? activeEvent.alternatePOC : (data.alternatePOC || ''),
        themeColor: activeEvent.themeColor || data.themeColor || DEFAULT_CONFIG.themeColor,
        bannerUrl: activeEvent.bannerUrl || data.bannerUrl || DEFAULT_CONFIG.bannerUrl,
        pricingType: activeEvent.pricingType || data.pricingType || (activeEvent.entryFee === 0 ? 'free' : 'paid'),
        entryFee: activeEvent.entryFee !== undefined ? Number(activeEvent.entryFee) : (data.entryFee !== undefined ? Number(data.entryFee) : DEFAULT_CONFIG.entryFee),
        feeDisplay: activeEvent.feeDisplay || data.feeDisplay || (activeEvent.entryFee === 0 ? 'Free Entry Pass' : `₹${activeEvent.entryFee} Entry Pass`),
        totalCapacity: activeEvent.totalCapacity || data.totalCapacity || DEFAULT_CONFIG.totalCapacity,
        ticketTiers: Array.isArray(activeEvent.ticketTiers) && activeEvent.ticketTiers.length > 0 ? activeEvent.ticketTiers : (data.ticketTiers || DEFAULT_CONFIG.ticketTiers),
        ticketPrices: activeEvent.ticketPrices && typeof activeEvent.ticketPrices === 'object' && Object.keys(activeEvent.ticketPrices).length > 0
          ? activeEvent.ticketPrices
          : (data.ticketPrices && typeof data.ticketPrices === 'object' && Object.keys(data.ticketPrices).length > 0 ? data.ticketPrices : DEFAULT_CONFIG.ticketPrices),
        tracks: Array.isArray(activeEvent.tracks) && activeEvent.tracks.length > 0 ? activeEvent.tracks : (data.tracks || DEFAULT_CONFIG.tracks),
        subEvents: Array.isArray(activeEvent.subEvents) ? activeEvent.subEvents : (data.subEvents || []),
        requiredFields: activeEvent.requiredFields || data.requiredFields || DEFAULT_CONFIG.requiredFields,
        customQuestion: activeEvent.customQuestion !== undefined ? activeEvent.customQuestion : (data.customQuestion || ''),
        whatsappUrl: activeEvent.whatsappUrl !== undefined ? activeEvent.whatsappUrl : (data.whatsappUrl || ''),
        discordUrl: activeEvent.discordUrl !== undefined ? activeEvent.discordUrl : (data.discordUrl || ''),
        brochureUrl: activeEvent.brochureUrl !== undefined ? activeEvent.brochureUrl : (data.brochureUrl || ''),
        socialUrl: activeEvent.socialUrl !== undefined ? activeEvent.socialUrl : (data.socialUrl || ''),
      } : {};

      const baseResult = {
        ...DEFAULT_CONFIG,
        ...data,
        ...mergedFromEvent,
      };

      // Sanitize ticketPrices
      let cleanTicketPrices = {};
      if (baseResult.ticketPrices && typeof baseResult.ticketPrices === 'object') {
        for (const [key, val] of Object.entries(baseResult.ticketPrices)) {
          const num = Number(val);
          cleanTicketPrices[key] = !isNaN(num) && num >= 0 ? num : 0;
        }
      }
      if (Object.keys(cleanTicketPrices).length === 0) {
        cleanTicketPrices = { ...DEFAULT_CONFIG.ticketPrices };
      }

      baseResult.ticketPrices = cleanTicketPrices;
      baseResult.registrationMode = baseResult.registrationMode || 'native_payment';
      const isFree = baseResult.pricingType === 'free' || Number(baseResult.entryFee) === 0;
      baseResult.enablePaymentGateway = isFree ? false : (baseResult.enablePaymentGateway !== undefined ? baseResult.enablePaymentGateway : true);

      return baseResult;
    } catch (e) {
      console.warn('[configRepo] getConfig notice:', e.message);
      return DEFAULT_CONFIG;
    }
  },

  /**
   * Update event configuration
   */
  async updateConfig(updates = {}) {
    const collection = this.getCollection();
    const doc = await collection.doc(CONFIG_DOC_ID).get();
    const existingDocData = doc.exists ? (doc.data() || {}) : {};

    const targetEventId = updates.activeEventId || existingDocData.activeEventId || 'eventra-2026';

    // Synchronize explicit updates to eventRepo
    try {
      const { eventRepo } = await import('./eventRepo.js');
      const existingEvent = await eventRepo.findById(targetEventId);

      const eventUpdates = {};
      if (updates.eventName !== undefined) eventUpdates.name = updates.eventName;
      if (updates.eventTagline !== undefined) eventUpdates.tagline = updates.eventTagline;
      if (updates.eventDescription !== undefined) eventUpdates.description = updates.eventDescription;
      if (updates.category !== undefined) eventUpdates.category = updates.category;
      if (updates.structureType !== undefined) eventUpdates.structureType = updates.structureType;
      if (updates.collegeName !== undefined) eventUpdates.collegeName = updates.collegeName;
      if (updates.clubName !== undefined) eventUpdates.clubName = updates.clubName;
      if (updates.clubCode !== undefined) eventUpdates.clubCode = updates.clubCode;
      if (updates.eventDate !== undefined) eventUpdates.dateDisplay = updates.eventDate;
      if (updates.eventTime !== undefined) eventUpdates.timeDisplay = updates.eventTime;
      if (updates.startDate !== undefined) eventUpdates.startDate = updates.startDate;
      if (updates.endDate !== undefined) eventUpdates.endDate = updates.endDate;
      if (updates.eventVenue !== undefined) eventUpdates.venue = updates.eventVenue;
      if (updates.venueHall !== undefined) eventUpdates.venueHall = updates.venueHall;
      if (updates.mode !== undefined) eventUpdates.mode = updates.mode;
      if (updates.mapUrl !== undefined) eventUpdates.mapUrl = updates.mapUrl;
      if (updates.meetingUrl !== undefined) eventUpdates.meetingUrl = updates.meetingUrl;
      if (updates.organizerName !== undefined) eventUpdates.organizerName = updates.organizerName;
      if (updates.organizerRole !== undefined) eventUpdates.organizerRole = updates.organizerRole;
      if (updates.organizerEmail !== undefined) eventUpdates.organizerEmail = updates.organizerEmail;
      if (updates.organizerPhone !== undefined) eventUpdates.organizerPhone = updates.organizerPhone;
      if (updates.alternatePOC !== undefined) eventUpdates.alternatePOC = updates.alternatePOC;
      if (updates.themeColor !== undefined) eventUpdates.themeColor = updates.themeColor;
      if (updates.bannerUrl !== undefined) eventUpdates.bannerUrl = updates.bannerUrl;
      if (updates.pricingType !== undefined) eventUpdates.pricingType = updates.pricingType;
      if (updates.entryFee !== undefined) {
        const fee = Number(updates.entryFee);
        eventUpdates.entryFee = !isNaN(fee) && fee >= 0 ? fee : 0;
        eventUpdates.pricingType = eventUpdates.entryFee === 0 ? 'free' : 'paid';
        eventUpdates.feeDisplay = eventUpdates.entryFee === 0 ? 'Free Entry Pass' : `₹${eventUpdates.entryFee} Entry Pass`;
      }
      if (updates.ticketTiers !== undefined) eventUpdates.ticketTiers = updates.ticketTiers;
      if (updates.ticketPrices !== undefined && typeof updates.ticketPrices === 'object') {
        const cleanPrices = {};
        for (const [k, v] of Object.entries(updates.ticketPrices)) {
          const num = Number(v);
          cleanPrices[k] = !isNaN(num) && num >= 0 ? num : 0;
        }
        eventUpdates.ticketPrices = cleanPrices;
      }
      if (updates.tracks !== undefined) eventUpdates.tracks = updates.tracks;
      if (updates.subEvents !== undefined) eventUpdates.subEvents = updates.subEvents;
      if (updates.requiredFields !== undefined) eventUpdates.requiredFields = updates.requiredFields;
      if (updates.customQuestion !== undefined) eventUpdates.customQuestion = updates.customQuestion;
      if (updates.whatsappUrl !== undefined) eventUpdates.whatsappUrl = updates.whatsappUrl;
      if (updates.discordUrl !== undefined) eventUpdates.discordUrl = updates.discordUrl;
      if (updates.brochureUrl !== undefined) eventUpdates.brochureUrl = updates.brochureUrl;
      if (updates.socialUrl !== undefined) eventUpdates.socialUrl = updates.socialUrl;

      if (existingEvent && Object.keys(eventUpdates).length > 0) {
        await eventRepo.update(targetEventId, eventUpdates);
      }
    } catch (e) {
      console.warn('[configRepo] sync to eventRepo notice:', e.message);
    }

    const newDocData = {
      ...existingDocData,
      ...updates,
      activeEventId: targetEventId,
      updatedAt: new Date().toISOString(),
    };

    // If activeEvent changed and no explicit eventName was provided in updates, clear stale event-specific fields from config doc so they don't shadow target event!
    if (updates.activeEventId && updates.activeEventId !== existingDocData.activeEventId && !updates.eventName) {
      delete newDocData.eventName;
      delete newDocData.eventTagline;
      delete newDocData.eventDescription;
      delete newDocData.category;
      delete newDocData.structureType;
      delete newDocData.collegeName;
      delete newDocData.clubName;
      delete newDocData.clubCode;
      delete newDocData.eventDate;
      delete newDocData.eventTime;
      delete newDocData.startDate;
      delete newDocData.endDate;
      delete newDocData.eventVenue;
      delete newDocData.venueHall;
      delete newDocData.ticketTiers;
      delete newDocData.ticketPrices;
      delete newDocData.entryFee;
      delete newDocData.feeDisplay;
      delete newDocData.pricingType;
      delete newDocData.tracks;
      delete newDocData.subEvents;
    }

    if (updates.ticketPrices && typeof updates.ticketPrices === 'object' && Object.keys(updates.ticketPrices).length > 0) {
      newDocData.ticketPrices = {};
      for (const [k, v] of Object.entries(updates.ticketPrices)) {
        const num = Number(v);
        newDocData.ticketPrices[k] = !isNaN(num) && num >= 0 ? num : 0;
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        await sb.from('system_config').upsert({
          id: CONFIG_DOC_ID,
          config_data: newDocData,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[configRepo] Supabase updateConfig notice:', err.message);
      }
    }

    try {
      await collection.doc(CONFIG_DOC_ID).set(newDocData);
    } catch (err) {
      console.warn('[configRepo] Firestore updateConfig notice:', err.message);
    }
    return this.getConfig();
  },
};
