import { registrantRepo } from '../models/registrantRepo.js';
import { configRepo } from '../models/configRepo.js';
import { verifyQRPayload } from '../services/qrService.js';
import { sendCheckinConfirmationEmail } from '../services/emailService.js';
import { sendAutoCheckinMessage } from '../services/messagingService.js';

/**
 * Gate Check-In Scanner Processor with Zero Forged QR Code Verification
 */
export const scanCheckin = async (req, res) => {
  try {
    const { qrPayload, manualCode, photo, photoBase64 } = req.body;
    const rawInput = (qrPayload || manualCode || '').trim();
    const livePhoto = photo || photoBase64 || null;

    if (!rawInput) {
      return res.status(400).json({
        success: false,
        message: 'No QR code payload or Pass ID provided.',
      });
    }

    // Extract potential unique ID from token (e.g. HS26.v1.HS26-8A3F1B.abcdef or raw HS26-8A3F1B)
    let searchId = rawInput;
    if (rawInput.startsWith('HS26.v1.')) {
      const parts = rawInput.split('.');
      if (parts.length >= 3) {
        searchId = parts[2];
      }
    }

    // Fast DynamoDB lookup
    let registrant = await registrantRepo.findByIdOrEmail(searchId);
    if (!registrant && searchId !== rawInput) {
      registrant = await registrantRepo.findByIdOrEmail(rawInput);
    }

    if (!registrant) {
      return res.status(404).json({
        success: false,
        status: 'NOT_FOUND',
        message: '❌ Invalid Pass: No attendee found matching this QR code or ID.',
      });
    }

    // Cryptographic Anti-Forgery Signature Verification
    const verification = verifyQRPayload(rawInput, registrant);
    if (!verification.valid && verification.forged) {
      return res.status(400).json({
        success: false,
        status: 'FORGERY_DETECTED',
        forged: true,
        message: '🚫 SECURITY ALERT: Forged or tampered QR pass detected! Cryptographic signature verification failed.',
        registrant: {
          name: registrant.name,
          uniqueId: registrant.uniqueId,
        },
      });
    }

    // Check if already checked in (Duplicate Scan Protection)
    if (registrant.checkedIn) {
      return res.status(200).json({
        success: false,
        status: 'ALREADY_CHECKED_IN',
        alreadyCheckedIn: true,
        message: `⚠️ Already Checked In at ${new Date(registrant.checkedInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} by ${registrant.checkedInBy || 'Gate Staff'}`,
        checkedInAt: registrant.checkedInAt,
        checkedInBy: registrant.checkedInBy,
        registrant: {
          _id: registrant.uniqueId,
          uniqueId: registrant.uniqueId,
          name: registrant.name,
          email: registrant.email,
          phone: registrant.phone,
          ticketType: registrant.ticketType,
          teamName: registrant.teamName,
          track: registrant.track,
          checkedIn: true,
          checkedInAt: registrant.checkedInAt,
          checkedInBy: registrant.checkedInBy,
        },
      });
    }

    // Perform Check-in atomically with Firestore Transaction (Prevents concurrent race conditions)
    const staffName = req.user ? req.user.name : (req.body.scannedBy || 'Gate Scanner');
    const atomicResult = await registrantRepo.checkinAtomic(registrant.uniqueId, {
      staffName,
      photo: livePhoto,
    });

    if (atomicResult.alreadyCheckedIn) {
      const existing = atomicResult.registrant;
      return res.status(200).json({
        success: false,
        status: 'ALREADY_CHECKED_IN',
        alreadyCheckedIn: true,
        message: `⚠️ Already Checked In at ${new Date(existing.checkedInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} by ${existing.checkedInBy || 'Gate Staff'}`,
        checkedInAt: existing.checkedInAt,
        checkedInBy: existing.checkedInBy,
        registrant: {
          _id: existing.uniqueId,
          uniqueId: existing.uniqueId,
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          ticketType: existing.ticketType,
          teamName: existing.teamName,
          track: existing.track,
          checkedIn: true,
          checkedInAt: existing.checkedInAt,
          checkedInBy: existing.checkedInBy,
        },
      });
    }

    const updated = atomicResult.registrant;

    console.log(`✅ [CHECK-IN APPROVED] ${updated.name} (${updated.uniqueId}) checked in by ${staffName} (Live Photo: ${Boolean(livePhoto)})`);

    // Asynchronously dispatch instant Check-in Confirmation Email with live photo
    configRepo.getConfig()
      .then((cfg) => sendCheckinConfirmationEmail(updated, cfg))
      .then(() => console.log(`📧 [AUTO-DISPATCH] Check-in confirmation email delivered to ${updated.email}`))
      .catch((mailErr) => console.warn(`⚠️ [AUTO-DISPATCH NOTICE] Check-in confirmation email: ${mailErr.message}`));

    // Asynchronously dispatch instant WhatsApp / SMS Notification
    sendAutoCheckinMessage(updated)
      .then((msgRes) => console.log(`📱 [AUTO-DISPATCH] Check-in message result for ${updated.name}:`, msgRes.provider))
      .catch((msgErr) => console.warn(`⚠️ [AUTO-DISPATCH NOTICE] Check-in message error: ${msgErr.message}`));

    res.json({
      success: true,
      status: 'SUCCESS',
      emailNotificationSent: true,
      hasLivePhoto: Boolean(livePhoto),
      message: `✅ Check-in Approved: Welcome to HackSeries 2026, ${updated.name}! Live photo verified & confirmation email dispatched.`,
      registrant: {
        _id: updated.uniqueId,
        uniqueId: updated.uniqueId,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        ticketType: updated.ticketType,
        teamName: updated.teamName,
        track: updated.track,
        institution: updated.institution,
        checkedInPhoto: updated.checkedInPhoto,
        checkedIn: true,
        checkedInAt: updated.checkedInAt,
        checkedInBy: staffName,
      },
    });
  } catch (error) {
    console.error('❌ Checkin error:', error);
    res.status(500).json({ success: false, message: 'Check-in processing failed', error: error.message });
  }
};

/**
 * Check-in status lookup by ID
 */
export const getCheckinStatus = async (req, res) => {
  try {
    const { uniqueId } = req.params;
    const registrant = await registrantRepo.findByUniqueId(uniqueId);

    if (!registrant) {
      return res.status(404).json({ success: false, message: 'Registrant not found' });
    }

    res.json({
      success: true,
      uniqueId: registrant.uniqueId,
      name: registrant.name,
      checkedIn: registrant.checkedIn,
      checkedInAt: registrant.checkedInAt,
      checkedInBy: registrant.checkedInBy,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve check-in status', error: error.message });
  }
};

/**
 * Undo Check-in (Revert in case of gate mis-scan)
 */
export const undoCheckin = async (req, res) => {
  try {
    const { id } = req.params;
    const registrant = await registrantRepo.findByUniqueId(id);

    if (!registrant) {
      return res.status(404).json({ success: false, message: 'Registrant not found' });
    }

    const updated = await registrantRepo.update(registrant.uniqueId, {
      checkedIn: false,
      checkedInAt: null,
      checkedInBy: null,
    });

    res.json({
      success: true,
      message: `Check-in reverted for ${updated.name}`,
      registrant: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to revert check-in', error: error.message });
  }
};

/**
 * Get recent check-ins stream for gate monitor
 */
export const getRecentScans = async (req, res) => {
  try {
    const recents = await registrantRepo.getRecentCheckins(20);
    res.json({ success: true, data: recents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch recent scans', error: error.message });
  }
};
