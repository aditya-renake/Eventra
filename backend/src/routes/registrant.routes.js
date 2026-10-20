/**
 * ============================================================================
 * REGISTRANT MANAGEMENT API ROUTES
 * ============================================================================
 * Purpose:
 *   Handles intake from external sources (Google Forms webhook), public pass
 *   lookups, bulk CSV operations, verification updates, and attendee CRUD.
 *
 * Route Mapping:
 *   - POST /webhook        : Primary external intake webhook (Google Forms / Sheets).
 *   - GET /pass/:idOrEmail : Public ticket lookup by Unique ID or attendee email.
 *   - GET /                : Paginated and searchable attendee list (Staff Auth).
 *   - GET /export/csv      : Export attendee roster to CSV for print/backup.
 *   - POST /bulk-verify    : Batch approval of registered attendees.
 *   - POST /bulk-import    : Batch import from CSV/JSON.
 *   - POST /:id/generate-qr: Explicit QR regeneration and CDN sync.
 *   - DELETE /:id          : Permanent record deletion (Root Owner/Admin only).
 * ============================================================================
 */

import express from 'express';
import {
  getRegistrants,
  handleWebhookSubmission,
  createRegistrant,
  getPublicPass,
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

// Primary Intake Webhook from Google Form / Google Apps Script trigger
router.post('/webhook', handleWebhookSubmission);

// Public Digital Pass Lookup (by UniqueId or Email)
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
