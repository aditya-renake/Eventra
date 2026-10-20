/**
 * ============================================================================
 * EMAIL DISPATCH API ROUTES
 * ============================================================================
 * Purpose:
 *   Handles transactional email dispatching for event passes, bulk blast
 *   campaigns, and in-browser HTML template previewing.
 *
 * Route Mapping:
 *   - POST /send/:id  : Dispatches single branded pass email to a specific registrant.
 *   - POST /bulk-send : Mass email blast with rate-limiting and failure tracking.
 *   - GET /preview    : Renders live HTML email template in browser for previewing.
 * ============================================================================
 */

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
