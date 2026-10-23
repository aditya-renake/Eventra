import { v4 as uuidv4 } from 'uuid';
import { registrantRepo } from '../models/registrantRepo.js';
import { configRepo } from '../models/configRepo.js';
import { eventRepo } from '../models/eventRepo.js';
import { createQRPayload, generatePassSignature, generateQRCodeDataUrl } from '../services/qrService.js';
import { sendRegistrationReceivedEmail } from '../services/emailService.js';

/**
 * Helper to resolve full event configuration for a specific eventId or registrant
 */
export const resolveEventContext = async (eventId) => {
  const baseConfig = await configRepo.getConfig().catch(() => ({}));
  const targetId = eventId || baseConfig.activeEventId || 'eventra-2026';
  const ev = await eventRepo.findById(targetId).catch(() => null);

  if (ev) {
    return {
      ...baseConfig,
      eventId: ev.id || ev.eventId,
      eventName: ev.name || baseConfig.eventName || 'Eventra 2026',
      eventTagline: ev.tagline || baseConfig.eventTagline || '',
      eventDescription: ev.description || baseConfig.eventDescription || '',
      category: ev.category || baseConfig.category || 'Event',
      eventDate: ev.dateDisplay || baseConfig.eventDate || 'Dates TBA',
      eventTime: ev.timeDisplay || baseConfig.eventTime || 'Schedule TBA',
      eventVenue: ev.venue || baseConfig.eventVenue || 'Campus Venue',
      venueHall: ev.venueHall || baseConfig.venueHall || '',
      collegeName: ev.collegeName || baseConfig.collegeName || '',
      clubName: ev.clubName || baseConfig.clubName || '',
      organizerName: ev.organizerName || baseConfig.organizerName || 'Event Organizer',
      organizerRole: ev.organizerRole || baseConfig.organizerRole || '',
      organizerEmail: ev.organizerEmail || baseConfig.organizerEmail || '',
      organizerPhone: ev.organizerPhone || baseConfig.organizerPhone || '',
      mapUrl: ev.mapUrl || baseConfig.mapUrl || '',
      whatsappUrl: ev.whatsappUrl || baseConfig.whatsappUrl || '',
      discordUrl: ev.discordUrl || baseConfig.discordUrl || '',
      brochureUrl: ev.brochureUrl || baseConfig.brochureUrl || '',
      bannerUrl: ev.bannerUrl || baseConfig.bannerUrl || '',
      themeColor: ev.themeColor || baseConfig.themeColor || '#596EE6',
    };
  }
  return baseConfig;
};

/**
 * List registrants with search, filter, and pagination
 */
export const getRegistrants = async (req, res) => {
  try {
    const {
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
    } = req.query;

    const result = await registrantRepo.getAll({
      page,
      limit,
      search,
      checkedIn,
      emailSent,
      verified,
      ticketType,
      track,
      eventId,
      sortBy,
      sortOrder,
    });

    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch registrants', error: error.message });
  }
};

/**
 * Webhook receiver for external attendee registration ingestion
 */
export const handleWebhookSubmission = async (req, res) => {
  try {
    // 1. Check if this is explicitly a Google Sheets row edit / status update event
    if (req.body.action === 'update_status' || req.body.action === 'verify' || req.body.action === 'sync_status') {
      const cleanEmail = String(req.body.email || '').toLowerCase().trim();
      const uniqueId = String(req.body.uniqueId || req.body.id || '').toUpperCase().trim();
      
      let existing = null;
      if (uniqueId) {
        existing = await registrantRepo.findByUniqueId(uniqueId);
      }
      if (!existing && cleanEmail) {
        existing = await registrantRepo.findByEmail(cleanEmail);
      }
      if (!existing && req.body.name) {
        const all = await registrantRepo.getAll({ limit: 1000 });
        existing = (all.items || []).find(
          (r) => r.name && r.name.toLowerCase().trim() === String(req.body.name).toLowerCase().trim()
        );
      }

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `Attendee (${cleanEmail || uniqueId || req.body.name}) not found in Eventra database.`,
        });
      }

      const rawVal = String(req.body.verificationStatus || req.body.status || req.body.verified || '').toLowerCase();
      const isVerified =
        rawVal === 'true' ||
        rawVal === 'verified' ||
        rawVal === 'yes' ||
        rawVal === 'approved' ||
        req.body.verified === true;

      const updated = await registrantRepo.update(existing.uniqueId, {
        verified: isVerified,
        verificationStatus: isVerified ? 'Verified' : 'Not Verified',
        verifiedAt: isVerified ? new Date().toISOString() : null,
      });

      console.log(`📊 [GOOGLE SHEET SYNC] Verification status updated for ${existing.email} -> ${isVerified ? 'VERIFIED ✅' : 'NOT VERIFIED ⏳'}`);
      return res.status(200).json({
        success: true,
        message: `Status updated to ${isVerified ? 'Verified' : 'Not Verified'}`,
        data: updated,
      });
    }

    const {
      name,
      email,
      phone,
      ticketType = 'Standard Pass',
      teamName = '',
      track = 'General Track',
      githubUrl = '',
      institution = '',
      formResponses = {},
      verified = false,
      verificationStatus = 'Not Verified',
      eventId,
    } = req.body;

    // Fallback extraction if name/email are inside formResponses or alternate casing
    let attendeeName = name || '';
    let attendeeEmail = email || '';

    const combinedObj = { ...(formResponses || {}), ...(req.body || {}) };
    for (const [k, v] of Object.entries(combinedObj)) {
      if (!v || typeof v !== 'string' || !v.trim()) continue;
      const kLower = k.toLowerCase().trim();
      if (!attendeeEmail && (kLower.includes('email') || kLower.includes('mail') || (v.includes('@') && v.includes('.')))) {
        attendeeEmail = v.trim();
      }
      if (!attendeeName && (kLower.includes('name') || kLower.includes('candidate') || kLower.includes('student') || kLower.includes('participant')) && !kLower.includes('team')) {
        attendeeName = v.trim();
      }
    }

    if (!attendeeEmail) {
      attendeeEmail = `participant.${Date.now()}@eventra.live`;
    }
    if (!attendeeName) {
      attendeeName = attendeeEmail.split('@')[0] || 'Eventra Participant';
    }

    const cleanEmail = attendeeEmail.toLowerCase().trim();
    const eventCtx = await resolveEventContext(eventId);
    const targetEventId = eventCtx.eventId || 'eventra-2026';

    let existing = await registrantRepo.findByEmail(cleanEmail);
    if (existing && (existing.eventId || 'eventra-2026') === targetEventId) {
      const updated = await registrantRepo.update(existing.uniqueId, {
        formResponses: { ...existing.formResponses, ...formResponses },
        phone: phone ? phone.trim() : existing.phone,
        teamName: teamName ? teamName.trim() : existing.teamName,
        track: track || existing.track,
        githubUrl: githubUrl ? githubUrl.trim() : existing.githubUrl,
        institution: institution ? institution.trim() : existing.institution,
        verified: verified !== undefined ? verified : (existing.verified || false),
        verificationStatus: verificationStatus || existing.verificationStatus || 'Not Verified',
      });

      return res.status(200).json({
        success: true,
        message: 'Existing Eventra registrant updated with latest response.',
        data: updated,
        isNew: false,
      });
    }

    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;

    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const newRegistrant = await registrantRepo.create({
      uniqueId,
      eventId: targetEventId,
      name: attendeeName.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      ticketType,
      teamName: teamName ? teamName.trim() : '',
      track,
      githubUrl: githubUrl ? githubUrl.trim() : '',
      institution: institution ? institution.trim() : '',
      formResponses,
      qrPayload,
      qrSignature: signature,
      qrCodeDataUrl,
      verified: verified !== undefined ? verified : false,
      verificationStatus: verificationStatus || 'Not Verified',
      emailSent: false,
      checkedIn: false,
    });

    console.log(`📥 [EVENTRA WEBHOOK] Registered: ${newRegistrant.name} (${newRegistrant.email}) -> Pass ID: ${uniqueId}`);

    sendRegistrationReceivedEmail(newRegistrant, eventCtx)
      .then(() => console.log(`📧 [AUTO-DISPATCH] Registration acknowledgement email delivered to ${newRegistrant.email}`))
      .catch((mailErr) => console.warn(`⚠️ [AUTO-DISPATCH NOTICE] Registration ack email error: ${mailErr.message}`));

    res.status(201).json({
      success: true,
      message: 'Registrant created successfully & verification email dispatched',
      data: newRegistrant,
      isNew: true,
      ackEmailDispatched: true,
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error: error.message });
  }
};

/**
 * Manual registrant creation by staff/admin (e.g. VIP Pass generator)
 */
export const createRegistrant = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      ticketType = 'VIP Guest',
      teamName = '',
      track = 'General Track',
      githubUrl = '',
      institution = '',
      formResponses = {},
      eventId,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const eventCtx = await resolveEventContext(eventId);
    const targetEventId = eventCtx.eventId || 'eventra-2026';

    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;

    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const registrant = await registrantRepo.create({
      uniqueId,
      eventId: targetEventId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone || '',
      ticketType,
      teamName: teamName || '',
      track,
      githubUrl: githubUrl || '',
      institution: institution || '',
      formResponses: formResponses || {},
      qrPayload,
      qrSignature: signature,
      qrCodeDataUrl,
      verified: true,
      verificationStatus: 'Verified',
      emailSent: false,
      checkedIn: false,
    });

    res.status(201).json({
      success: true,
      message: 'Attendee registered successfully',
      data: registrant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create registrant', error: error.message });
  }
};

/**
 * Public Pass Lookup (by uniqueId or Email) for attendee mobile portal
 */
export const getPublicPass = async (req, res) => {
  try {
    const { idOrEmail } = req.params;
    res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
    const registrant = await registrantRepo.findByIdOrEmail(idOrEmail);

    if (!registrant) {
      return res.status(404).json({
        success: false,
        message: 'No Eventra pass found matching the provided ID or Email address.',
      });
    }

    const eventCtx = await resolveEventContext(registrant.eventId);

    res.json({
      success: true,
      data: {
        uniqueId: registrant.uniqueId,
        eventId: registrant.eventId || eventCtx.eventId || 'eventra-2026',
        eventName: eventCtx.eventName || 'Eventra 2026',
        eventTagline: eventCtx.eventTagline || '',
        eventDate: eventCtx.eventDate || 'Dates TBA',
        eventTime: eventCtx.eventTime || 'Schedule TBA',
        eventVenue: eventCtx.eventVenue || 'Campus Venue',
        venueHall: eventCtx.venueHall || '',
        organizerName: eventCtx.organizerName || '',
        organizerEmail: eventCtx.organizerEmail || '',
        organizerPhone: eventCtx.organizerPhone || '',
        clubName: eventCtx.clubName || '',
        collegeName: eventCtx.collegeName || '',
        mapUrl: eventCtx.mapUrl || '',
        whatsappUrl: eventCtx.whatsappUrl || '',
        discordUrl: eventCtx.discordUrl || '',
        brochureUrl: eventCtx.brochureUrl || '',
        broadcastNotice: eventCtx.broadcastActive ? eventCtx.broadcastNotice : '',
        name: registrant.name,
        email: registrant.email,
        phone: registrant.phone,
        ticketType: registrant.ticketType,
        teamName: registrant.teamName,
        track: registrant.track,
        institution: registrant.institution,
        formResponses: registrant.formResponses || {},
        qrCodeDataUrl: registrant.qrCodeDataUrl,
        qrPayload: registrant.qrPayload,
        checkedIn: registrant.checkedIn,
        checkedInAt: registrant.checkedInAt,
        createdAt: registrant.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve pass', error: error.message });
  }
};

/**
 * Get single registrant by uniqueId or DB ID
 */
export const getRegistrantById = async (req, res) => {
  try {
    const registrant = await registrantRepo.findByUniqueId(req.params.id);
    if (!registrant) {
      return res.status(404).json({ success: false, message: 'Registrant not found' });
    }
    res.json({ success: true, data: registrant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch registrant', error: error.message });
  }
};

/**
 * Regenerate QR Code
 */
export const regenerateQR = async (req, res) => {
  try {
    const registrant = await registrantRepo.findByUniqueId(req.params.id);
    if (!registrant) {
      return res.status(404).json({ success: false, message: 'Registrant not found' });
    }

    const signature = generatePassSignature(registrant.uniqueId, registrant.email, registrant.ticketType);
    const qrPayload = createQRPayload(registrant.uniqueId, registrant.email, registrant.ticketType);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const updated = await registrantRepo.update(registrant.uniqueId, {
      qrSignature: signature,
      qrPayload,
      qrCodeDataUrl,
    });

    res.json({
      success: true,
      message: 'Cryptographic QR Pass regenerated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to regenerate QR', error: error.message });
  }
};

/**
 * Delete a registrant
 */
export const deleteRegistrant = async (req, res) => {
  try {
    const deleted = await registrantRepo.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Registrant not found' });
    }
    res.json({ success: true, message: 'Registrant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete registrant', error: error.message });
  }
};

/**
 * Toggle verification status of an attendee from Admin Dashboard
 */
export const toggleVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, status } = req.body || {};
    const registrant = await registrantRepo.findByIdOrEmail(id);
    if (!registrant) {
      return res.status(404).json({ success: false, message: 'Registrant not found' });
    }

    let nextVerified;
    if (status !== undefined) {
      const s = String(status).toLowerCase().trim();
      nextVerified = s === 'verified' || s === 'true';
    } else if (verified !== undefined) {
      if (typeof verified === 'string') {
        const v = verified.toLowerCase().trim();
        nextVerified = v === 'verified' || v === 'true';
      } else {
        nextVerified = Boolean(verified);
      }
    } else {
      nextVerified = !registrant.verified;
    }

    const updated = await registrantRepo.update(registrant.uniqueId, {
      verified: nextVerified,
      verificationStatus: nextVerified ? 'Verified' : 'Pending',
      verifiedAt: nextVerified ? new Date().toISOString() : null,
    });

    return res.json({
      success: true,
      message: `Registrant ${updated.name} marked as ${nextVerified ? 'Verified ✅' : 'Pending ⏳'}`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update verification status', error: error.message });
  }
};

/**
 * Bulk verify or unverify multiple attendees simultaneously
 */
export const bulkVerifyRegistrants = async (req, res) => {
  try {
    const { ids, verified = true } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of attendee IDs is required' });
    }

    const isVerified = Boolean(verified);
    const updatePayload = {
      verified: isVerified,
      verificationStatus: isVerified ? 'Verified' : 'Not Verified',
      verifiedAt: isVerified ? new Date().toISOString() : null,
    };

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return await registrantRepo.update(id, updatePayload);
        } catch {
          return null;
        }
      })
    );

    return res.json({
      success: true,
      message: `Successfully marked ${results.filter(Boolean).length} attendees as ${isVerified ? 'Verified' : 'Not Verified'}`,
      updatedCount: results.filter(Boolean).length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed bulk verification', error: error.message });
  }
};

/**
 * Export registrants to CSV format
 */
export const exportCSV = async (req, res) => {
  try {
    const { eventId } = req.query;
    const result = await registrantRepo.getAll({ limit: 10000, eventId });
    const registrants = result.items || [];

    const headers = ['Unique ID', 'Event ID', 'Name', 'Email', 'Phone', 'Institution', 'Verification Status', 'Ticket Type', 'Team Name', 'Track', 'Checked In', 'Checked In At', 'Checked In By', 'Pass Emailed', 'Created At'];
    const rows = registrants.map((r) => [
      r.uniqueId,
      r.eventId || 'eventra-2026',
      `"${(r.name || '').replace(/"/g, '""')}"`,
      r.email,
      r.phone || '',
      `"${(r.institution || '').replace(/"/g, '""')}"`,
      r.verified ? 'VERIFIED' : 'NOT VERIFIED',
      `"${(r.ticketType || '').replace(/"/g, '""')}"`,
      `"${(r.teamName || '').replace(/"/g, '""')}"`,
      `"${(r.track || '').replace(/"/g, '""')}"`,
      r.checkedIn ? 'YES' : 'NO',
      r.checkedInAt ? new Date(r.checkedInAt).toISOString() : '',
      r.checkedInBy || '',
      r.emailSent ? 'YES' : 'NO',
      r.createdAt ? new Date(r.createdAt).toISOString() : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${eventId || 'eventra'}-registrants.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate CSV export', error: error.message });
  }
};

/**
 * Bulk import registrants from Excel / CSV with default Verification Pending & acknowledgement email
 */
export const bulkImportRegistrants = async (req, res) => {
  try {
    const { rows, attendees, autoVerify = false, sendAckEmail = true, sendEmails = false, eventId } = req.body || {};
    const records = Array.isArray(rows) ? rows : (Array.isArray(attendees) ? attendees : []);
    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of attendee records is required.' });
    }

    const shouldSendAck = sendAckEmail || sendEmails;
    const imported = [];
    const eventCtx = await resolveEventContext(eventId);
    const targetEventId = eventCtx.eventId || 'eventra-2026';

    for (const item of records) {
      const cleanEmail = String(item.email || '').toLowerCase().trim();
      const rawName = String(item.name || item.fullName || '').trim() || 'Participant';

      if (!cleanEmail) continue;

      let existing = await registrantRepo.findByEmail(cleanEmail);
      const isVerified = Boolean(autoVerify);

      if (existing && (existing.eventId || 'eventra-2026') === targetEventId) {
        const updated = await registrantRepo.update(existing.uniqueId, {
          name: rawName,
          phone: item.phone ? String(item.phone).trim() : existing.phone,
          teamName: item.teamName ? String(item.teamName).trim() : existing.teamName,
          track: item.track || existing.track,
          institution: item.institution || existing.institution,
          verified: isVerified,
          verificationStatus: isVerified ? 'Verified' : 'Not Verified',
          verifiedAt: isVerified ? new Date().toISOString() : null,
          formResponses: { ...(existing.formResponses || {}), ...(item.formResponses || {}) },
        });
        imported.push(updated);

        if (shouldSendAck) {
          sendRegistrationReceivedEmail(updated, eventCtx)
            .catch((e) => console.warn('[BulkImport Ack Email Error]:', e.message));
        }
      } else {
        const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
        const uniqueId = `HS26-${rawUuid}`;
        const ticketType = item.ticketType || (eventCtx.ticketTiers?.[0] || 'Standard Pass');
        const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
        const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
        const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

        const newAttendee = await registrantRepo.create({
          uniqueId,
          eventId: targetEventId,
          name: rawName,
          email: cleanEmail,
          phone: item.phone ? String(item.phone).trim() : '',
          ticketType,
          teamName: item.teamName ? String(item.teamName).trim() : '',
          track: item.track || (eventCtx.tracks?.[0] || 'General Track'),
          githubUrl: item.githubUrl ? String(item.githubUrl).trim() : '',
          institution: item.institution ? String(item.institution).trim() : (eventCtx.collegeName || ''),
          formResponses: item.formResponses || {},
          qrPayload,
          qrSignature: signature,
          qrCodeDataUrl,
          verified: isVerified,
          verificationStatus: isVerified ? 'Verified' : 'Not Verified',
          verifiedAt: isVerified ? new Date().toISOString() : null,
          emailSent: false,
          checkedIn: false,
        });

        imported.push(newAttendee);

        if (shouldSendAck) {
          sendRegistrationReceivedEmail(newAttendee, eventCtx)
            .catch((e) => console.warn('[BulkImport Ack Email Error]:', e.message));
        }
      }
    }

    return res.json({
      success: true,
      message: `Successfully imported ${imported.length} attendees for ${eventCtx.eventName || targetEventId}!`,
      importedCount: imported.length,
      ackEmailsDispatched: shouldSendAck,
    });
  } catch (error) {
    console.error('Bulk Import error:', error);
    return res.status(500).json({ success: false, message: 'Failed to import attendees', error: error.message });
  }
};
