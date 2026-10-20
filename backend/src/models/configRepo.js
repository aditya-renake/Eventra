import { getFirestore } from '../config/firebase.js';

const CONFIG_DOC_ID = 'main_event_2026';

const DEFAULT_CONFIG = {
  eventName: 'Eventra 2026',
  eventTagline: 'Presented by ACES — Dept. of Computer Engineering, Dr. D. Y. Patil Institute of Technology, Pimpri, Pune (DYPDPU)',
  eventDate: 'October 16 - 18, 2026',
  eventTime: '09:00 AM IST (Gate Check-in starts 07:30 AM)',
  eventVenue: 'Dr. D. Y. Patil Institute of Technology (DIT), Sant Tukaram Nagar, Pimpri, Pune - 411018',
  organizerEmail: 'tigeradi1504@gmail.com',
  organizerName: 'ACES (Association of Computer Engineering Students), DIT Pune',
  googleFormUrl: 'https://forms.gle/TmoSjzxUt7yAKz1o6',
  registrationMode: 'native_payment', // 'native_payment' (direct in-app registration + payment) or 'google_form'
  enablePaymentGateway: true, // Enabled: Razorpay and direct payments active
  ticketPrices: {
    'Hacker Pass': 5,
    'Student Pass': 5,
    'VIP Delegate': 5,
    'Judge / Mentor': 5,
  },
  currency: 'INR',
  upiId: 'tigeradi1504-1@okicici',
  upiPayeeName: 'Eventra 2026',
  smtpUser: 'tigeradi1504@gmail.com',
  smtpPass: '',
  emailSubjectTemplate: '🎟️ Your Official Entry Pass for Eventra 2026 — {{name}}',
  emailBodyNotice: 'Please present this digital pass with QR code at the registration desk for express check-in and hacker kit collection.',
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
        return {
          ...DEFAULT_CONFIG,
          ...data,
          registrationMode: data.registrationMode || 'native_payment',
          enablePaymentGateway: data.enablePaymentGateway !== undefined ? data.enablePaymentGateway : true,
          ticketPrices: {
            'Hacker Pass': data.ticketPrices?.['Hacker Pass'] !== undefined && !isNaN(Number(data.ticketPrices?.['Hacker Pass'])) ? Number(data.ticketPrices['Hacker Pass']) : 5,
            'Student Pass': data.ticketPrices?.['Student Pass'] !== undefined && !isNaN(Number(data.ticketPrices?.['Student Pass'])) ? Number(data.ticketPrices['Student Pass']) : 5,
            'VIP Delegate': data.ticketPrices?.['VIP Delegate'] !== undefined && !isNaN(Number(data.ticketPrices?.['VIP Delegate'])) ? Number(data.ticketPrices['VIP Delegate']) : 5,
            'Judge / Mentor': data.ticketPrices?.['Judge / Mentor'] !== undefined && !isNaN(Number(data.ticketPrices?.['Judge / Mentor'])) ? Number(data.ticketPrices['Judge / Mentor']) : 5,
          },
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

    await collection.doc(CONFIG_DOC_ID).set(merged, { merge: true });

    // Also synchronize the flagship event catalog record
    try {
      const { eventRepo, DEFAULT_EVENTS } = await import('./eventRepo.js');
      if (DEFAULT_EVENTS && DEFAULT_EVENTS[0]) {
        DEFAULT_EVENTS[0].name = merged.eventName || DEFAULT_EVENTS[0].name;
        DEFAULT_EVENTS[0].tagline = merged.eventTagline || DEFAULT_EVENTS[0].tagline;
        DEFAULT_EVENTS[0].dateDisplay = merged.eventDate || DEFAULT_EVENTS[0].dateDisplay;
        DEFAULT_EVENTS[0].timeDisplay = merged.eventTime || DEFAULT_EVENTS[0].timeDisplay;
        DEFAULT_EVENTS[0].venue = merged.eventVenue || DEFAULT_EVENTS[0].venue;
        DEFAULT_EVENTS[0].organizerName = merged.organizerName || DEFAULT_EVENTS[0].organizerName;
        DEFAULT_EVENTS[0].organizerEmail = merged.organizerEmail || DEFAULT_EVENTS[0].organizerEmail;
        DEFAULT_EVENTS[0].googleFormUrl = merged.googleFormUrl || DEFAULT_EVENTS[0].googleFormUrl;
        if (merged.ticketPrices?.['Hacker Pass'] !== undefined) {
          DEFAULT_EVENTS[0].entryFee = Number(merged.ticketPrices['Hacker Pass']);
          DEFAULT_EVENTS[0].feeDisplay = `₹${merged.ticketPrices['Hacker Pass']} Entry Pass`;
        }
      }
      await eventRepo.update('eventra-2026', {
        name: merged.eventName,
        tagline: merged.eventTagline,
        dateDisplay: merged.eventDate,
        timeDisplay: merged.eventTime,
        venue: merged.eventVenue,
        organizerName: merged.organizerName,
        organizerEmail: merged.organizerEmail,
        googleFormUrl: merged.googleFormUrl,
        entryFee: merged.ticketPrices?.['Hacker Pass'] ?? 1,
        feeDisplay: `₹${merged.ticketPrices?.['Hacker Pass'] ?? 1} Entry Pass`,
      });
    } catch (e) {
      // quiet fallback
    }

    return merged;
  },
};
