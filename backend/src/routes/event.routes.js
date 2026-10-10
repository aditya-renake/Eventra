import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getClubEvents,
  getEventById,
  createClubEvent,
  updateClubEvent,
  deleteClubEvent,
  getStaffList,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  purgeAllStaffExceptOwner,
} from '../controllers/eventController.js';

const router = Router();

// Public / Semi-Public Event Catalog
router.get('/', getClubEvents);
router.get('/:id', getEventById);

// Admin-only Event CRUD
router.post('/', requireAuth, createClubEvent);
router.put('/:id', requireAuth, updateClubEvent);
router.delete('/:id', requireAuth, deleteClubEvent);

// Admin-only Team & Role Management
router.get('/admin/staff', requireAuth, getStaffList);
router.post('/admin/staff', requireAuth, createStaffMember);
router.put('/admin/staff/:username', requireAuth, updateStaffMember);
router.delete('/admin/staff/:username', requireAuth, deleteStaffMember);
router.delete('/admin/staff-purge/all-except-owner', requireAuth, purgeAllStaffExceptOwner);

export default router;
