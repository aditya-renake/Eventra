/**
 * ==============================================================================
 * HackSeries 2026 — Global Event Configuration Repository
 * ==============================================================================
 * Purpose:
 *   Manages live administrative settings stored in Supabase Postgres `event_config`.
 *   Controls ticket pricing, active payment gateway toggles, Razorpay API credentials,
 *   event metadata (venue, dates, host college), and email templates.
 * ==============================================================================
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';

// Primary configuration document identifier
const CONFIG_DOC_ID = 'main_event_2026';

/**
 * Baseline default configuration for the event.
 */
const DEFAULT_CONFIG = {
  eventName: 'HackSeries 2026',
  eventTagline: 'Presented by ACES — Dept. of Computer Engineering, Dr. D. Y. Patil Institute of Technology, Pimpri, Pune (DYPDPU)',
  eventDate: 'October 16 - 18, 2026',
  eventTime: '09:00 AM IST (Gate Check-in starts 07:30 AM)',
  eventVenue: 'Dr. D. Y. Patil Institute of Technology (DIT), Sant Tukaram Nagar, Pimpri, Pune - 411018',
  organizerEmail: 'tigeradi1504@gmail.com',
  organizerName: 'ACES (Association of Computer Engineering Students), DIT Pune',
  googleFormUrl: 'https://forms.gle/TmoSjzxUt7yAKz1o6',
  registrationMode: 'native_payment',
  enablePaymentGateway: true,
  ticketPrices: {
    'Hacker Pass': 5,
    'Student Pass': 5,
    'VIP Delegate': 5,
    'Judge / Mentor': 5,
  },
  currency: 'INR',
  upiId: 'tigeradi1504-1@okicici',
  upiPayeeName: 'HackSeries 2026',
  smtpUser: 'tigeradi1504@gmail.com',
  smtpPass: '',
  emailSubjectTemplate: '🎟️ Your Official Entry Pass for HackSeries 2026 — {{name}}',
  emailBodyNotice: 'Please present this digital pass with QR code at the registration desk for express check-in and hacker kit collection.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// In-memory fallback if Supabase is offline
let memoryConfig = { ...DEFAULT_CONFIG };

function rowToConfig(row) {
  if (!row) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    eventName: row.event_name || DEFAULT_CONFIG.eventName,
    eventTagline: row.event_tagline || DEFAULT_CONFIG.eventTagline,
    eventDate: row.event_date || DEFAULT_CONFIG.eventDate,
    eventTime: row.event_time || DEFAULT_CONFIG.eventTime,
    eventVenue: row.event_venue || DEFAULT_CONFIG.eventVenue,
    organizerEmail: row.organizer_email || DEFAULT_CONFIG.organizerEmail,
    organizerName: row.organizer_name || DEFAULT_CONFIG.organizerName,
    googleFormUrl: row.google_form_url || DEFAULT_CONFIG.googleFormUrl,
    registrationMode: row.registration_mode || DEFAULT_CONFIG.registrationMode,
    enablePaymentGateway: row.enable_payment_gateway !== undefined ? row.enable_payment_gateway : true,
    ticketPrices: row.ticket_prices || DEFAULT_CONFIG.ticketPrices,
    currency: row.currency || DEFAULT_CONFIG.currency,
    upiId: row.upi_id || DEFAULT_CONFIG.upiId,
    upiPayeeName: row.upi_payee_name || DEFAULT_CONFIG.upiPayeeName,
    smtpUser: row.smtp_user || DEFAULT_CONFIG.smtpUser,
    smtpPass: row.smtp_pass || DEFAULT_CONFIG.smtpPass,
    emailSubjectTemplate: row.email_subject_template || DEFAULT_CONFIG.emailSubjectTemplate,
    emailBodyNotice: row.email_body_notice || DEFAULT_CONFIG.emailBodyNotice,
    createdAt: row.created_at || DEFAULT_CONFIG.createdAt,
    updatedAt: row.updated_at || DEFAULT_CONFIG.updatedAt,
  };
}

function configToRow(cfg) {
  return {
    id: CONFIG_DOC_ID,
    event_name: cfg.eventName,
    event_tagline: cfg.eventTagline,
    event_date: cfg.eventDate,
    event_time: cfg.eventTime,
    event_venue: cfg.eventVenue,
    organizer_email: cfg.organizerEmail,
    organizer_name: cfg.organizerName,
    google_form_url: cfg.googleFormUrl,
    registration_mode: cfg.registrationMode,
    enable_payment_gateway: cfg.enablePaymentGateway,
    ticket_prices: cfg.ticketPrices,
    currency: cfg.currency,
    upi_id: cfg.upiId,
    upi_payee_name: cfg.upiPayeeName,
    smtp_user: cfg.smtpUser,
    smtp_pass: cfg.smtpPass,
    email_subject_template: cfg.emailSubjectTemplate,
    email_body_notice: cfg.emailBodyNotice,
    updated_at: new Date().toISOString(),
  };
}

export const configRepo = {
  /**
   * Fetch current event configuration
   */
  async getConfig() {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('event_config')
          .select('*')
          .eq('id', CONFIG_DOC_ID)
          .maybeSingle();

        if (data && !error) {
          memoryConfig = rowToConfig(data);
          return memoryConfig;
        }

        // If not found, insert default
        if (!data) {
          await supabase.from('event_config').upsert(configToRow(DEFAULT_CONFIG));
          return DEFAULT_CONFIG;
        }
      } catch (err) {
        console.warn('[configRepo] Supabase getConfig notice, using memory fallback:', err.message);
      }
    }
    return memoryConfig;
  },

  /**
   * Update event configuration
   */
  async updateConfig(updates) {
    const current = await this.getConfig();
    const merged = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    memoryConfig = merged;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const row = configToRow(merged);
        await supabase.from('event_config').upsert(row);
      } catch (err) {
        console.warn('[configRepo] Supabase updateConfig notice:', err.message);
      }
    }

    // Synchronize catalog record for flagship event
    try {
      const { eventRepo } = await import('./eventRepo.js');
      await eventRepo.update('hackseries-2026', {
        name: merged.eventName,
        tagline: merged.eventTagline,
        dateDisplay: merged.eventDate,
        timeDisplay: merged.eventTime,
        venue: merged.eventVenue,
        organizerName: merged.organizerName,
        organizerEmail: merged.organizerEmail,
        googleFormUrl: merged.googleFormUrl,
        entryFee: merged.ticketPrices?.['Hacker Pass'] ?? 5,
        feeDisplay: `₹${merged.ticketPrices?.['Hacker Pass'] ?? 5} Entry Pass`,
      });
    } catch (e) {
      // quiet fallback
    }

    return merged;
  },
};
