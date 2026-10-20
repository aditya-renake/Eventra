import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

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
 * Uploads a QR code image (Buffer or Base64 Data URL) to Cloudinary
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
