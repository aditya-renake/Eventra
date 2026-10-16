import { Router } from 'express';
import {
  initiateRegistrationOrder,
  verifyAndCompleteRegistration,
  handlePaymentWebhook,
} from '../controllers/paymentController.js';

const router = Router();

// Public: Create order for in-app registration
router.post('/create-order', initiateRegistrationOrder);

// Public: Verify payment signature and mint verified pass
router.post('/verify', verifyAndCompleteRegistration);

// Public: Razorpay webhook fallback
router.post('/webhook', handlePaymentWebhook);

export default router;
