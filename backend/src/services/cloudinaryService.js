import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  console.log(`✅ Cloudinary Media CDN configured (${cloudName}).`);
} else if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ secure: true });
  console.log('✅ Cloudinary Media CDN configured via CLOUDINARY_URL.');
} else {
  console.log('ℹ️ Cloudinary credentials not yet set in environment. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env');
}

export const cloudinaryService = {
  isConfigured() {
    return Boolean(
      (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) ||
      process.env.CLOUDINARY_URL
    );
  },

  /**
   * Upload an image (base64 string, data URI, or remote URL) to Cloudinary
   * @param {string} fileInput - Data URI or URL
   * @param {string} folder - Destination subfolder (e.g. 'banners', 'avatars', 'payments')
   */
  async uploadImage(fileInput, folder = 'general') {
    if (!this.isConfigured()) {
      throw new Error(
        'Cloudinary is not configured yet. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables.'
      );
    }

    try {
      const cleanFolder = `eventra/${folder.replace(/^eventra\/?/, '')}`;
      const result = await cloudinary.uploader.upload(fileInput, {
        folder: cleanFolder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      return {
        success: true,
        url: result.secure_url || result.url,
        secure_url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch (err) {
      console.error('[Cloudinary] Upload failed:', err.message);
      throw new Error(`Cloudinary upload failed: ${err.message}`);
    }
  },

  /**
   * Delete an image from Cloudinary by public ID
   */
  async deleteImage(publicId) {
    if (!this.isConfigured() || !publicId) return false;
    try {
      const res = await cloudinary.uploader.destroy(publicId);
      return res.result === 'ok';
    } catch (err) {
      console.warn('[Cloudinary] Delete error:', err.message);
      return false;
    }
  },
};
