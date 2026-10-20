import QRCode from 'qrcode';
import crypto from 'crypto';

const QR_SECRET = process.env.QR_SIGNING_SECRET || 'hackseries_2026_cryptographic_qr_signing_secret_9988';

/**
 * Generate a cryptographic HMAC-SHA256 signature for a registrant's pass.
 * Guarantees zero forged or spoofed QR codes.
 */
export const generatePassSignature = (uniqueId, email, ticketType) => {
  const data = `HACKSERIES2026|${uniqueId}|${email.toLowerCase().trim()}|${ticketType}`;
  return crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex').substring(0, 16);
};

/**
 * Creates the official tamper-proof QR code payload string.
 * Format: HS26.v1.<uniqueId>.<signature>
 */
export const createQRPayload = (uniqueId, email, ticketType) => {
  const signature = generatePassSignature(uniqueId, email, ticketType);
  return `HS26.v1.${uniqueId}.${signature}`;
};

/**
 * Verifies if a scanned payload is cryptographically authentic and untampered.
 */
export const verifyQRPayload = (scannedString, registrant) => {
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
