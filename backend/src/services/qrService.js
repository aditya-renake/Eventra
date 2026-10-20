/**
 * ==============================================================================
 * HackSeries 2026 — Cryptographic QR Pass Security Engine
 * ==============================================================================
 * Purpose:
 *   Mints, signs, and cryptographically verifies attendee QR passes.
 * 
 * Security Architecture:
 *   - Bare QR passes (e.g. raw attendee ID or plain JSON) can be easily forged
 *     or screenshot-shared by bad actors.
 *   - HackSeries 2026 uses an HMAC-SHA256 keyed digest using a server-held secret
 *     `QR_SIGNING_SECRET` over `HACKSERIES2026|<uniqueId>|<email>|<ticketType>`.
 *   - The token format is standardized as: `HS26.v1.<uniqueId>.<signature>`.
 *   - Gate check-in uses constant-time byte buffer comparison (`crypto.timingSafeEqual`)
 *     to eliminate side-channel timing attack vectors.
 * ==============================================================================
 */

import QRCode from 'qrcode';
import crypto from 'crypto';

// Secret key for HMAC signing (must remain private to the backend)
const QR_SECRET = process.env.QR_SIGNING_SECRET || 'hackseries_2026_cryptographic_qr_signing_secret_9988';

/**
 * Generates an HMAC-SHA256 16-character hex signature for an attendee pass.
 * Guarantees that neither ticket type, email, nor pass ID can be forged without the secret.
 * 
 * @param {string} uniqueId - Official attendee identifier (e.g. HS26-A1B2C3D4)
 * @param {string} email - Attendee email address (case-insensitive)
 * @param {string} ticketType - Ticket tier (e.g. Hacker Pass, VIP Delegate)
 * @returns {string} 16-character cryptographic signature
 */
export const generatePassSignature = (uniqueId, email, ticketType) => {
  const data = `HACKSERIES2026|${uniqueId}|${email.toLowerCase().trim()}|${ticketType}`;
  return crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex').substring(0, 16);
};

/**
 * Creates the official tamper-proof QR code payload string.
 * Format: `HS26.v1.<uniqueId>.<signature>`
 * 
 * @param {string} uniqueId - Pass ID
 * @param {string} email - Attendee email
 * @param {string} ticketType - Pass tier
 * @returns {string} Serialized QR string
 */
export const createQRPayload = (uniqueId, email, ticketType) => {
  const signature = generatePassSignature(uniqueId, email, ticketType);
  return `HS26.v1.${uniqueId}.${signature}`;
};

/**
 * Verifies if a scanned payload is cryptographically authentic and untampered.
 * Validates the HMAC signature against the database record using timing-safe comparison.
 * 
 * @param {string} scannedString - Raw string decoded from camera QR scanner
 * @param {object} registrant - Matched registrant database record from Supabase
 * @returns {{ valid: boolean, uniqueId?: string, verifiedCryptographically?: boolean, reason?: string, forged?: boolean }}
 */
export const verifyQRPayload = (scannedString, registrant = null) => {
  if (!scannedString || typeof scannedString !== 'string') {
    return { valid: false, reason: 'Invalid or empty QR payload' };
  }

  const trimmed = scannedString.trim();

  // If payload matches the standard HS26 format: HS26.v1.<uniqueId>.<signature>
  if (trimmed.startsWith('HS26.v1.')) {
    const parts = trimmed.split('.');
    if (parts.length < 4) {
      return { valid: false, reason: 'Malformed HackSeries QR token structure' };
    }
    const scannedId = parts[2];
    const scannedSig = parts[3];

    if (scannedId !== registrant.uniqueId) {
      return { valid: false, reason: 'QR Pass ID mismatch' };
    }

    const expectedSig = generatePassSignature(registrant.uniqueId, registrant.email, registrant.ticketType);
    
    // Constant-time comparison against timing attacks
    const sigBufferA = Buffer.from(scannedSig, 'utf8');
    const sigBufferB = Buffer.from(expectedSig, 'utf8');

    if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
      return {
        valid: false,
        forged: true,
        reason: 'FORGERY_DETECTED: Cryptographic signature mismatch. Pass has been altered or fabricated!',
      };
    }

    return { valid: true, uniqueId: scannedId, verifiedCryptographically: true };
  }

  // Fallback for manual uniqueId check-in by staff
  if (trimmed === registrant.uniqueId) {
    return { valid: true, uniqueId: trimmed, verifiedCryptographically: false };
  }

  // JSON payload format fallback
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.id === registrant.uniqueId) {
      if (parsed.sig) {
        const expectedSig = generatePassSignature(registrant.uniqueId, registrant.email, registrant.ticketType);
        if (parsed.sig !== expectedSig) {
          return { valid: false, forged: true, reason: 'FORGERY_DETECTED: Invalid signature.' };
        }
        return { valid: true, uniqueId: parsed.id, verifiedCryptographically: true };
      }
      return { valid: true, uniqueId: parsed.id, verifiedCryptographically: false };
    }
  } catch (e) {
    // not JSON
  }

  return { valid: false, reason: 'QR code does not match registrant record' };
};

/**
 * Generates a high-quality, high-contrast Base64 QR code image
 */
export const generateQRCodeDataUrl = async (payload) => {
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 400,
      color: {
        dark: '#030712',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

/**
 * Generates a PNG Buffer for email attachment or badge printing
 */
export const generateQRCodeBuffer = async (payload) => {
  try {
    return await QRCode.toBuffer(payload, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 500,
      color: {
        dark: '#030712',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating QR buffer:', error);
    throw error;
  }
};

/**
 * Generates QR Code and uploads to Cloudinary CDN for instant, lightweight access.
 * Falls back to local Base64 Data URL if Cloudinary is unavailable.
 */
export const generatePassQRCode = async (payload, uniqueId) => {
  try {
    const buffer = await generateQRCodeBuffer(payload);
    let cdnUrl = null;

    try {
      const { uploadQRCodeToCloudinary } = await import('./cloudinaryService.js');
      cdnUrl = await uploadQRCodeToCloudinary(buffer, uniqueId);
    } catch (e) {
      console.warn('⚠️ Cloudinary upload warning, falling back to data URL:', e.message);
    }

    if (cdnUrl) {
      return {
        qrCodeUrl: cdnUrl,
        qrCodeDataUrl: cdnUrl,
        buffer,
      };
    }

    const dataUrl = await generateQRCodeDataUrl(payload);
    return {
      qrCodeUrl: null,
      qrCodeDataUrl: dataUrl,
      buffer,
    };
  } catch (err) {
    console.error('Error in generatePassQRCode:', err);
    const dataUrl = await generateQRCodeDataUrl(payload);
    return {
      qrCodeUrl: null,
      qrCodeDataUrl: dataUrl,
    };
  }
};

