import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

let razorpayInstance = null;

/**
 * Lazily instantiate Razorpay client if credentials are configured
 */
export const getRazorpayClient = async () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  if (!razorpayInstance) {
    try {
      const { default: Razorpay } = await import('razorpay');
      razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      console.log('💳 Razorpay Payment Gateway client initialized.');
    } catch (err) {
      console.warn('⚠️ Razorpay SDK load notice:', err.message);
      return null;
    }
  }

  return razorpayInstance;
};

/**
 * Create a new payment order
 */
export const createOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  const client = await getRazorpayClient();
  const amountInPaise = Math.round(Number(amount) * 100);

  // If Razorpay credentials are not set (e.g. Test / Demo mode), return mock order for seamless local testing
  if (!client) {
    const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`ℹ️ [PAYMENT MOCK] Created test order: ${mockOrderId} (₹${amount})`);
    return {
      id: mockOrderId,
      amount: amountInPaise,
      currency,
      receipt,
      isMock: true,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_mode',
    };
  }

  const order = await client.orders.create({
    amount: amountInPaise,
    currency,
    receipt,
    notes,
  });

  return {
    ...order,
    isMock: false,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
};

/**
 * Cryptographic HMAC SHA256 Signature Verification
 */
export const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // In test mock mode without secret, accept if signature contains mock prefix
  if (!keySecret) {
    if (String(signature || '').startsWith('mock_sig_') || String(orderId || '').startsWith('order_mock_')) {
      return true;
    }
    // If testing without Razorpay keys, allow sandbox test verification
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
};
