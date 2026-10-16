import { Router } from 'express';
import {
  initiateRegistrationOrder,
  verifyAndCompleteRegistration,
  verifyUpiPayment,
  handlePaymentWebhook,
} from '../controllers/paymentController.js';

const router = Router();

// Public: Create order for in-app registration (generates UPI QR code + Razorpay order)
router.post('/create-order', initiateRegistrationOrder);

// Public: Verify direct UPI payment (UTR submission) and mint verified pass
router.post('/verify-upi', verifyUpiPayment);

// Public: Verify Razorpay payment signature and mint verified pass
router.post('/verify', verifyAndCompleteRegistration);

// Public: Razorpay webhook fallback
router.post('/webhook', handlePaymentWebhook);

export default router;
