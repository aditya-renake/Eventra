/**
 * ============================================================================
 * GATE CHECK-IN API ROUTES
 * ============================================================================
 * Purpose:
 *   Secured routes used by gate volunteers and hardware scanners to validate
 *   attendee QR codes, capture entry snapshots, and prevent duplicate check-ins.
 *
 * Route Mapping (All Require Staff JWT Auth):
 *   - POST /scan           : Validates HMAC-SHA256 token and marks attendee checked in.
 *   - GET /status/:uniqueId : Inspects real-time check-in timestamp and attendee data.
 *   - POST /undo/:id       : Reverses an accidental check-in (authorized staff only).
 *   - GET /recent          : Fetches recently processed scans for the live scanner feed.
 * ============================================================================
 */

import express from 'express';
import { scanCheckin, getCheckinStatus, undoCheckin, getRecentScans } from '../controllers/checkinController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Gate check-in scanner (requires staff token)
router.post('/scan', requireAuth, scanCheckin);
router.get('/status/:uniqueId', requireAuth, getCheckinStatus);
router.post('/undo/:id', requireAuth, undoCheckin);
router.get('/recent', requireAuth, getRecentScans);

export default router;
