import { getFirestore } from '../config/firebase.js';

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
  bannerUrl: '/gallery/futuristic_hackathon_1775424262777.png',
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
      const collection = this.getCollection();
      const doc = await collection.doc(CONFIG_DOC_ID).get();

      if (doc.exists) {
        const data = doc.data();
        let ticketPrices = DEFAULT_CONFIG.ticketPrices;
        if (data.ticketPrices && typeof data.ticketPrices === 'object' && Object.keys(data.ticketPrices).length > 0) {
          ticketPrices = {};
          for (const [key, val] of Object.entries(data.ticketPrices)) {
            const num = Number(val);
            ticketPrices[key] = !isNaN(num) && num >= 0 ? num : 0;
          }
        }
        return {
          ...DEFAULT_CONFIG,
          ...data,
          registrationMode: data.registrationMode || 'native_payment',
          enablePaymentGateway: data.enablePaymentGateway !== undefined ? data.enablePaymentGateway : true,
          ticketPrices,
        };
      }

      await collection.doc(CONFIG_DOC_ID).set(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    } catch (e) {
      console.warn('[configRepo] getConfig notice:', e.message);
      return DEFAULT_CONFIG;
    }
  },

  /**
   * Update event configuration
   */
  async updateConfig(updates) {
    const collection = this.getCollection();
    const current = await this.getConfig();
    const merged = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // If updates explicitly provided ticketPrices, replace ticketPrices rather than deep-merging old keys
    if (updates.ticketPrices && typeof updates.ticketPrices === 'object' && Object.keys(updates.ticketPrices).length > 0) {
      merged.ticketPrices = {};
      for (const [k, v] of Object.entries(updates.ticketPrices)) {
        const num = Number(v);
        merged.ticketPrices[k] = !isNaN(num) && num >= 0 ? num : 0;
      }
    }

    // Write full document (no { merge: true }) so replaced maps like ticketPrices don't retain stale keys
    await collection.doc(CONFIG_DOC_ID).set(merged);

    // Synchronize with the corresponding active event in eventRepo (do NOT overwrite eventra-2026 if another event is active!)
    try {
      const { eventRepo } = await import('./eventRepo.js');
      const targetEventId = merged.activeEventId || 'eventra-2026';
      const existingEvent = await eventRepo.findById(targetEventId);
      if (existingEvent) {
        const tiers = Array.isArray(merged.ticketTiers) && merged.ticketTiers.length > 0
          ? merged.ticketTiers
          : (merged.ticketPrices ? Object.keys(merged.ticketPrices) : existingEvent.ticketTiers);
        const firstPrice = merged.entryFee !== undefined
          ? Number(merged.entryFee)
          : (merged.ticketPrices && tiers?.[0] !== undefined ? Number(merged.ticketPrices[tiers[0]]) : existingEvent.entryFee);
        const cleanFee = !isNaN(firstPrice) && firstPrice >= 0 ? firstPrice : 0;

        await eventRepo.update(targetEventId, {
          name: merged.eventName || existingEvent.name,
          tagline: merged.eventTagline !== undefined ? merged.eventTagline : existingEvent.tagline,
          description: merged.eventDescription !== undefined ? merged.eventDescription : existingEvent.description,
          dateDisplay: merged.eventDate || existingEvent.dateDisplay,
          timeDisplay: merged.eventTime || existingEvent.timeDisplay,
          venue: merged.eventVenue || existingEvent.venue,
          organizerName: merged.organizerName || existingEvent.organizerName,
          organizerEmail: merged.organizerEmail || existingEvent.organizerEmail,
          organizerPhone: merged.organizerPhone !== undefined ? merged.organizerPhone : existingEvent.organizerPhone,
          ticketTiers: tiers,
          ticketPrices: merged.ticketPrices || existingEvent.ticketPrices,
          entryFee: cleanFee,
          pricingType: cleanFee === 0 ? 'free' : 'paid',
          feeDisplay: cleanFee === 0 ? 'Free Entry Pass' : `₹${cleanFee} Entry Pass`,
        });
      }
    } catch (e) {
      // quiet fallback
    }

    return merged;
  },
};
