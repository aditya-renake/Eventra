import { v4 as uuidv4 } from 'uuid';
import { registrantRepo } from '../models/registrantRepo.js';
import { configRepo } from '../models/configRepo.js';
import { createQRPayload, generatePassSignature, generateQRCodeDataUrl } from '../services/qrService.js';
import { sendRegistrationReceivedEmail } from '../services/emailService.js';

/**
 * List registrants with search, filter, and pagination (optimized via DynamoDB).
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
      ticketType = 'Hacker Pass',
      teamName = '',
      track = 'AI & Agentic Systems',
      githubUrl = '',
      institution = '',
      formResponses = {},
      verified = false,
      verificationStatus = 'Not Verified',
    } = req.body;

    // Fallback extraction if name/email are inside formResponses or alternate casing
    let attendeeName = name || '';
    let attendeeEmail = email || '';

    // Deep search all body and formResponses keys for email and name
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
      attendeeEmail = `hacker.${Date.now()}@hackseries.org`;
    }
    if (!attendeeName) {
      attendeeName = attendeeEmail.split('@')[0] || 'Eventra Participant';
    }

    const cleanEmail = attendeeEmail.toLowerCase().trim();

    // Check if registrant already exists in Firestore
    let existing = await registrantRepo.findByEmail(cleanEmail);
    if (existing) {
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

    // Generate unique ID: HS26-<8 CHARS>
    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;

    // Generate cryptographic anti-forgery HMAC signature
    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const newRegistrant = await registrantRepo.create({
      uniqueId,
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

    console.log(`📥 [HACKSERIES WEBHOOK] Registered in Firestore: ${newRegistrant.name} (${newRegistrant.email}) -> Pass ID: ${uniqueId}`);

    // Asynchronously dispatch instant "Registration Received • Details Under Verification" email
    configRepo.getConfig()
      .then((cfg) => sendRegistrationReceivedEmail(newRegistrant, cfg))
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
 * Manual registrant creation by staff/admin
 */
export const createRegistrant = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      ticketType = 'Hacker Pass',
      teamName = '',
      track = 'AI & Agentic Systems',
      githubUrl = '',
      institution = '',
      formResponses = {},
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    // Duplicate registrations are allowed for now

    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;

    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const registrant = await registrantRepo.create({
      uniqueId,
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
      emailSent: false,
      checkedIn: false,
    });

    res.status(201).json({
      success: true,
      message: 'Hacker registered successfully',
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
    // Edge CDN caching: absorbs thousands of concurrent attendee pass reloads
    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    const registrant = await registrantRepo.findByIdOrEmail(idOrEmail);

    if (!registrant) {
      return res.status(404).json({
        success: false,
        message: 'No Eventra pass found matching the provided ID or Email address.',
      });
    }

    res.json({
      success: true,
      data: {
        uniqueId: registrant.uniqueId,
        name: registrant.name,
        email: registrant.email,
        phone: registrant.phone,
        ticketType: registrant.ticketType,
        teamName: registrant.teamName,
        track: registrant.track,
        institution: registrant.institution,
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
    const result = await registrantRepo.getAll({ limit: 10000 });
    const registrants = result.items || [];

    const headers = ['Unique ID', 'Name', 'Email', 'Phone', 'Verification Status', 'Ticket Type', 'Team Name', 'Track', 'Checked In', 'Checked In At', 'Checked In By', 'Pass Emailed', 'Created At'];
    const rows = registrants.map((r) => [
      r.uniqueId,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      r.email,
      r.phone || '',
      r.verified ? 'VERIFIED' : 'NOT VERIFIED',
      r.ticketType,
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
    res.setHeader('Content-Disposition', 'attachment; filename=eventra-2026-registrants.csv');
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
    const { attendees, autoVerify = false, sendAckEmail = true, sendEmails = false } = req.body || {};
    if (!Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of attendee records is required.' });
    }

    const shouldSendAck = sendAckEmail || sendEmails;
    const imported = [];
    const eventConfig = await configRepo.getConfig().catch(() => ({}));

    for (const item of attendees) {
      const cleanEmail = String(item.email || '').toLowerCase().trim();
      const rawName = String(item.name || item.fullName || '').trim() || 'Hacker';

      if (!cleanEmail) continue;

      let existing = await registrantRepo.findByEmail(cleanEmail);
      const isVerified = Boolean(autoVerify);

      if (existing) {
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

        // Send "Registration Received • Details Under Verification" Acknowledgement Email (NO QR PASS)
        if (shouldSendAck) {
          sendRegistrationReceivedEmail(updated, eventConfig)
            .catch((e) => console.warn('[BulkImport Ack Email Error]:', e.message));
        }
      } else {
        const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
        const uniqueId = `HS26-${rawUuid}`;
        const ticketType = item.ticketType || 'Hacker Pass';
        const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
        const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
        const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

        const newAttendee = await registrantRepo.create({
          uniqueId,
          name: rawName,
          email: cleanEmail,
          phone: item.phone ? String(item.phone).trim() : '',
          ticketType,
          teamName: item.teamName ? String(item.teamName).trim() : '',
          track: item.track || 'AI & Agentic Systems',
          githubUrl: item.githubUrl ? String(item.githubUrl).trim() : '',
          institution: item.institution ? String(item.institution).trim() : 'DYP DPU Pune',
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

        // Send "Registration Received • Details Under Verification" Acknowledgement Email (NO QR PASS)
        if (shouldSendAck) {
          sendRegistrationReceivedEmail(newAttendee, eventConfig)
            .catch((e) => console.warn('[BulkImport Ack Email Error]:', e.message));
        }
      }
    }

    return res.json({
      success: true,
      message: `Successfully imported ${imported.length} attendees as "Verification Pending"!`,
      importedCount: imported.length,
      ackEmailsDispatched: shouldSendAck,
    });
  } catch (error) {
    console.error('Bulk Import error:', error);
    return res.status(500).json({ success: false, message: 'Failed to import attendees', error: error.message });
  }
};
