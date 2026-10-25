import express from 'express';
import { cloudinaryService } from '../services/cloudinaryService.js';

const router = express.Router();

/**
 * Check if Cloudinary is configured
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    configured: cloudinaryService.isConfigured(),
    message: cloudinaryService.isConfigured()
      ? 'Cloudinary Media CDN is active.'
      : 'Cloudinary credentials missing in .env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
  });
});

/**
 * Upload an image to Cloudinary
 */
router.post('/', async (req, res) => {
  try {
    const { image, file, dataUrl, folder } = req.body || {};
    const payload = image || file || dataUrl;

    if (!payload) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided. Provide a base64 Data URL or public image URL.',
      });
    }

    if (!cloudinaryService.isConfigured()) {
      return res.status(503).json({
        success: false,
        configured: false,
        message:
          'Cloudinary is not yet configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your backend environment variables.',
      });
    }

    const targetFolder = folder || 'banners';
    const result = await cloudinaryService.uploadImage(payload, targetFolder);

    return res.json({
      success: true,
      message: 'Image uploaded to Cloudinary successfully',
      url: result.secure_url,
      secure_url: result.secure_url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    });
  } catch (err) {
    console.error('Upload endpoint error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Image upload to Cloudinary failed.',
    });
  }
});

export default router;
