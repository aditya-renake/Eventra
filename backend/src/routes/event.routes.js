import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getClubEvents,
  getEventById,
  createClubEvent,
  updateClubEvent,
  deleteClubEvent,
  setFlagshipEvent,
  getStaffList,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  purgeAllStaffExceptOwner,
  getEventConfig,
  getAdminEventConfig,
  getAdminClubEvents,
  updateEventConfig,
} from '../controllers/eventController.js';

import { getSeatCatalog } from '../services/seatService.js';

const router = Router();
router.get('/seat-availability', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    res.json({ data: await getSeatCatalog() });
  } catch (error) {
    res.status(503).json({ message: error.message });
  }
});

const requireGlobalAdmin = (req, res, next) => {
  if (!['admin', 'super_admin', 'root_owner'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Global administrator privileges required.' });
  }
  next();
};

// Private routes are registered before the public /:id route.
router.get('/admin/config', requireAuth, requireGlobalAdmin, getAdminEventConfig);
router.get('/admin/catalog', requireAuth, requireAdmin, getAdminClubEvents);

// Public / Semi-Public Event Catalog
router.get('/', getClubEvents);
router.get('/config', getEventConfig);
router.put('/config', requireAuth, requireGlobalAdmin, updateEventConfig);
router.get('/:id', getEventById);

// Admin-only Event CRUD
router.post('/', requireAuth, requireAdmin, createClubEvent);
router.post('/:id/flagship', requireAuth, requireGlobalAdmin, setFlagshipEvent);
router.put('/:id', requireAuth, requireAdmin, updateClubEvent);
router.delete('/:id', requireAuth, requireAdmin, deleteClubEvent);

// Admin-only Team & Role Management
router.get('/admin/staff', requireAuth, requireGlobalAdmin, getStaffList);
router.post('/admin/staff', requireAuth, requireGlobalAdmin, createStaffMember);
router.put('/admin/staff/:username', requireAuth, requireGlobalAdmin, updateStaffMember);
router.delete('/admin/staff/:username', requireAuth, requireGlobalAdmin, deleteStaffMember);
router.delete('/admin/staff-purge/all-except-owner', requireAuth, requireGlobalAdmin, purgeAllStaffExceptOwner);

export default router;
