import { getFirestore } from '../config/firebase.js';

const CONFIG_DOC_ID = 'main_event_2026';

const DEFAULT_CONFIG = {
  eventName: 'HackSeries 2026',
  eventTagline: 'Presented by ACES — Dept. of Computer Engineering, Dr. D. Y. Patil Institute of Technology, Pimpri, Pune (DYPDPU)',
  eventDate: 'October 16 - 18, 2026',
  eventTime: '09:00 AM IST (Gate Check-in starts 07:30 AM)',
  eventVenue: 'Dr. D. Y. Patil Institute of Technology (DIT), Sant Tukaram Nagar, Pimpri, Pune - 411018',
  organizerEmail: 'tigeradi1504@gmail.com',
  organizerName: 'ACES (Association of Computer Engineering Students), DIT Pune',
  googleFormUrl: 'https://forms.gle/TmoSjzxUt7yAKz1o6',
  registrationMode: 'google_form', // 'google_form' (classic) or 'native_payment' (direct in-app registration + payment)
  enablePaymentGateway: false, // Feature flag: Set true for Razorpay, false for 100% Free / Google Form
  ticketPrices: {
    'Hacker Pass': 5,
    'Student Pass': 5,
    'VIP Delegate': 5,
    'Judge / Mentor': 0,
  },
  currency: 'INR',
  upiId: 'tigeradi1504-1@okicici',
  upiPayeeName: 'HackSeries 2026',
  emailSubjectTemplate: '🎟️ Your Official Entry Pass for HackSeries 2026 — {{name}}',
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
        return doc.data();
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
    return merged;
  },
};
