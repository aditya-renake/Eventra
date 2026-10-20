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
