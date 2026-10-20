import express from 'express';
import { sendSinglePassEmail, sendBulkEmails, previewPassEmail } from '../controllers/emailController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 1-Click Send Pass to Single Registrant
router.post('/send/:id', requireAuth, sendSinglePassEmail);

// Bulk send passes
router.post('/bulk-send', requireAuth, requireAdmin, sendBulkEmails);

// HTML Email template preview
router.get('/preview', previewPassEmail);

export default router;
