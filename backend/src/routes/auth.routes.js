import express from 'express';
import { login, getMe, attendeeSignIn, attendeeRegister, attendeeLogin } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.post('/attendee/signin', attendeeSignIn);
router.post('/attendee/register', attendeeRegister);
router.post('/attendee/login', attendeeLogin);

export default router;
