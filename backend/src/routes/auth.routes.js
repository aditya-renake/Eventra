/**
 * ============================================================================
 * AUTHENTICATION API ROUTES
 * ============================================================================
 * Purpose:
 *   Handles staff and organizer authentication, session verification, and
 *   current user profile retrieval.
 *
 * Route Mapping:
 *   - POST /login : Validates credentials via Supabase GoTrue Auth / staff table.
 *   - GET /me     : Returns current authenticated session details and staff role.
 * ============================================================================
 */

import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, getMe);

export default router;
