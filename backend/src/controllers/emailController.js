import { registrantRepo } from '../models/registrantRepo.js';
import { configRepo } from '../models/configRepo.js';
import { sendPassEmail, sendBulkPassEmails, buildPassEmailHtml } from '../services/emailService.js';
import { sendAutoPassWhatsApp } from '../services/messagingService.js';

/**
 * 1-Click Send Pass Email & WhatsApp to a single registrant (STRICTLY VERIFIED ONLY)
 */
export const sendSinglePassEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const registrant = await registrantRepo.findByUniqueId(id);

    if (!registrant) {
      return res.status(404).json({ success: false, message: 'Registrant not found' });
    }

    const isVerified = registrant.verified === true || String(registrant.verificationStatus).toLowerCase() === 'verified';
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: `Cannot send QR pass to ${registrant.name} because their status is "Pending / Not Verified". Please verify them first.`,
      });
    }

    const config = await configRepo.getConfig();

    // Dual Parallel Dispatch: Simultaneously send Email and WhatsApp pass
    const [emailRes, whatsappRes] = await Promise.allSettled([
      sendPassEmail(registrant, config),
      sendAutoPassWhatsApp(registrant),
    ]);

    if (emailRes.status === 'rejected') {
      throw emailRes.reason;
    }

    const emailResult = emailRes.value;
    const whatsappResult = whatsappRes.status === 'fulfilled' ? whatsappRes.value : null;

    const updated = await registrantRepo.update(registrant.uniqueId, {
      emailSent: true,
      emailSentAt: new Date().toISOString(),
      emailSendCount: (registrant.emailSendCount || 0) + 1,
      whatsappSent: whatsappResult?.success || false,
      whatsappSentAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Pass dispatched on Email and WhatsApp for ${updated.name} (${updated.email})!`,
      result: emailResult,
      whatsapp: whatsappResult,
      registrant: {
        _id: updated.uniqueId,
        email: updated.email,
        phone: updated.phone,
        emailSent: updated.emailSent,
        emailSentAt: updated.emailSentAt,
        emailSendCount: updated.emailSendCount,
        whatsappSent: updated.whatsappSent,
      },
    });
  } catch (error) {
    console.error('❌ Send email/whatsapp error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send pass email',
      error: error.message,
    });
  }
};

/**
 * Bulk send pass emails & WhatsApp (STRICTLY VERIFIED ONLY)
 */
export const sendBulkEmails = async (req, res) => {
  try {
    const { onlyPending = true, selectedIds } = req.body;

    const allResult = await registrantRepo.getAll({ limit: 10000 });
    let registrants = allResult.items || [];

    if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
      const idSet = new Set(selectedIds.map((id) => String(id).toUpperCase().trim()));
      const emailSet = new Set(selectedIds.map((id) => String(id).toLowerCase().trim()));
      
      registrants = registrants.filter((r) => 
        idSet.has(String(r.uniqueId || '').toUpperCase().trim()) ||
        idSet.has(String(r._id || '').toUpperCase().trim()) ||
        emailSet.has(String(r.email || '').toLowerCase().trim())
      );
    }

    // STRICT VERIFICATION FILTER: Only verified attendees will ever receive pass emails
    registrants = registrants.filter((r) => r.verified === true || String(r.verificationStatus).toLowerCase() === 'verified');

    if (onlyPending) {
      registrants = registrants.filter((r) => !r.emailSent);
    }

    if (registrants.length === 0) {
      return res.json({
        success: true,
        message: 'No eligible verified registrants found to email. Ensure attendees are marked as "Verified" first.',
        results: { total: 0, sent: 0, failed: 0 },
      });
    }

    const config = await configRepo.getConfig();
    const results = await sendBulkPassEmails(registrants, config);

    // Update sent flags & dispatch WhatsApp simultaneously
    for (const r of registrants) {
      await registrantRepo.update(r.uniqueId, {
        emailSent: true,
        emailSentAt: new Date().toISOString(),
        emailSendCount: (r.emailSendCount || 0) + 1,
      });

      // Parallel WhatsApp dispatch
      sendAutoPassWhatsApp(r).catch((err) =>
        console.warn(`⚠️ [BULK WHATSAPP NOTICE] Failed for ${r.uniqueId}:`, err.message)
      );
    }

    res.json({
      success: true,
      message: `Bulk pass dispatch completed. Sent: ${results.sent}, Failed: ${results.failed}`,
      results,
    });
  } catch (error) {
    console.error('❌ Bulk send email error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Bulk email dispatch failed',
      error: error.message,
    });
  }
};

/**
 * Preview Pass Email HTML
 */
export const previewPassEmail = async (req, res) => {
  try {
    const { registrantId } = req.query;
    let registrant;

    if (registrantId) {
      registrant = await registrantRepo.findByUniqueId(registrantId);
    }

    if (!registrant) {
      registrant = {
        name: 'Aditya Renake',
        email: 'aditya.renake@outlook.com',
        ticketType: 'Team Lead Pass',
        uniqueId: 'HS26-9B4D2E1A',
        teamName: 'NeuralHackers',
        track: 'AI & Agentic Systems',
      };
    }

    const config = await configRepo.getConfig();
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const html = buildPassEmailHtml({
      attendeeName: registrant.name,
      ticketType: registrant.ticketType,
      uniqueId: registrant.uniqueId,
      teamName: registrant.teamName,
      track: registrant.track,
      eventName: config.eventName,
      eventDate: config.eventDate,
      eventTime: config.eventTime,
      eventVenue: config.eventVenue,
      passUrl: `${clientUrl}/pass/${registrant.uniqueId}`,
      notice: config.emailBodyNotice,
    });

    res.send(html);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate preview', error: error.message });
  }
};
