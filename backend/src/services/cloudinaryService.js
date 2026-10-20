/**
 * ==============================================================================
 * HackSeries 2026 — Cloudinary Image CDN Service
 * ==============================================================================
 * Purpose:
 *   Hosts generated QR passes on Cloudinary's global content delivery network.
 *   
 * Architectural Rationale:
 *   - Storing Base64 QR code strings directly in the database inflates table
 *     storage (30KB-50KB per attendee) and drastically slows queries.
 *   - By uploading the PNG image buffer to Cloudinary at the time of pass issuance,
 *     the database only stores a lightweight HTTPS CDN URL (`qr_code_url`).
 *   - Attendees and gate scanners load the QR code from the nearest CDN edge node.
 * ==============================================================================
 */

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Determine if all required Cloudinary API credentials exist in environment
const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('✅ Cloudinary initialized for Pass QR code CDN hosting.');
} else {
  console.warn('⚠️ Cloudinary credentials missing in .env. Falling back to local data URLs.');
}

/**
 * Uploads a QR code image (PNG Buffer or Base64 Data URL) to Cloudinary CDN.
 * 
 * Pipeline:
 * 1. Checks if Cloudinary is configured; returns null fallback if not.
 * 2. Sanitizes the pass uniqueId for use as the Cloudinary public_id.
 * 3. Pipes raw Buffer through upload_stream directly into folder `hackseries-2026/passes/`.
 * 4. Returns the secure HTTPS URL (e.g., https://res.cloudinary.com/.../hs26_qr_HS26-XXXX.png).
 * 
 * @param {Buffer|string} imageSource - PNG Buffer or Base64 data string
 * @param {string} uniqueId - Registrant pass ID (e.g. HS26-A1B2C3D4)
 * @returns {Promise<string|null>} Secure CDN URL of the uploaded QR code
 */
export const uploadQRCodeToCloudinary = async (imageSource, uniqueId) => {
  if (!isConfigured) return null;

  try {
    const cleanId = String(uniqueId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `hs26_qr_${cleanId}`;

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: 'hackseries-2026/passes',
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        format: 'png',
        tags: ['hackseries2026', 'pass', 'qr'],
      };

      if (Buffer.isBuffer(imageSource)) {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.warn(`⚠️ Cloudinary stream upload failed for ${uniqueId}:`, error.message);
              return resolve(null);
            }
            resolve(result.secure_url);
          }
        );
        uploadStream.end(imageSource);
      } else if (typeof imageSource === 'string') {
        cloudinary.uploader.upload(imageSource, uploadOptions)
          .then((result) => resolve(result.secure_url))
          .catch((error) => {
            console.warn(`⚠️ Cloudinary string upload failed for ${uniqueId}:`, error.message);
            resolve(null);
          });
      } else {
        resolve(null);
      }
    });
  } catch (err) {
    console.warn(`⚠️ Cloudinary upload exception for ${uniqueId}:`, err.message);
    return null;
  }
};
