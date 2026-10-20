import { Router } from 'express';
import {
  initiateRegistrationOrder,
  createRazorpayOrder,
  verifyAndCompleteRegistration,
  verifyRazorpayPayment,
  verifyUpiPayment,
  checkOrderStatus,
  handlePaymentWebhook,
} from '../controllers/paymentController.js';

const router = Router();

// Public: Standard Razorpay Web Checkout Order Creation
router.post('/create-order', createRazorpayOrder);

// Public: Standard Razorpay Signature Verification
router.post('/verify-payment', verifyRazorpayPayment);

// Public: Registration Verification & Pass Minting
router.post('/verify', verifyAndCompleteRegistration);

// Public: Check order status and auto-recover pass
router.post('/check-order', checkOrderStatus);
router.get('/check-order/:orderId', checkOrderStatus);
router.post('/check-order/:orderId', checkOrderStatus);

// Public: Verify direct UPI payment (UTR submission) and mint verified pass
router.post('/verify-upi', verifyUpiPayment);

// Public: Razorpay webhook fallback
router.post('/webhook', handlePaymentWebhook);

export default router;
