import express from 'express';
import {
  getRegistrants,
  handleWebhookSubmission,
  createRegistrant,
  getPublicPass,
  getAttendeeProfile,
  getRegistrantById,
  regenerateQR,
  deleteRegistrant,
  exportCSV,
  toggleVerification,
  bulkVerifyRegistrants,
  bulkImportRegistrants,
} from '../controllers/registrantController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Primary Intake Webhook for external attendee registration
router.post('/webhook', handleWebhookSubmission);

// Public Attendee Profile & Smart Pre-fill Lookup
router.get('/attendee/profile', getAttendeeProfile);

// Public Digital Pass Lookup (by UniqueId or Email - returns all passes if email)
router.get('/pass/:idOrEmail', getPublicPass);

// Protected Staff / Admin Routes
router.get('/', requireAuth, getRegistrants);
router.get('/export/csv', requireAuth, exportCSV);
router.post('/bulk-verify', requireAuth, bulkVerifyRegistrants);
router.post('/bulk-import', requireAuth, bulkImportRegistrants);
router.get('/:id', requireAuth, getRegistrantById);
router.post('/', requireAuth, createRegistrant);
router.post('/:id/generate-qr', requireAuth, regenerateQR);
router.put('/:id/verify', requireAuth, toggleVerification);
router.patch('/:id/verify', requireAuth, toggleVerification);
router.delete('/:id', requireAuth, requireAdmin, deleteRegistrant);

export default router;
