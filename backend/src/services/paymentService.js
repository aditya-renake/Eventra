import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

let razorpayInstance = null;

let currentClientKey = null;

/**
 * Lazily instantiate Razorpay client if credentials are configured
 */
export const getRazorpayClient = async () => {
  let keyId = process.env.RAZORPAY_KEY_ID;
  let keySecret = process.env.RAZORPAY_KEY_SECRET;

  try {
    const { configRepo } = await import('../models/configRepo.js');
    const cfg = await configRepo.getConfig();
    if (cfg?.razorpayKeyId) keyId = cfg.razorpayKeyId.trim();
    if (cfg?.razorpayKeySecret) keySecret = cfg.razorpayKeySecret.trim();
  } catch (e) {
    // fallback to env
  }

  if (!keyId || !keySecret) {
    return null;
  }

  const credentialsHash = `${keyId}:${keySecret}`;
  if (!razorpayInstance || currentClientKey !== credentialsHash) {
    try {
      const { default: Razorpay } = await import('razorpay');
      razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      currentClientKey = credentialsHash;
      console.log('💳 Razorpay Payment Gateway client initialized with active keys.');
    } catch (err) {
      console.warn('⚠️ Razorpay SDK load notice:', err.message);
      return null;
    }
  }

  return { client: razorpayInstance, keyId };
};

/**
 * Create a new payment order
 */
export const createOrder = async ({ amount, currency = 'INR', receipt, notes = {}, customer = {}, callbackUrl = '' }) => {
  const clientData = await getRazorpayClient();
  const client = clientData?.client;
  const keyId = clientData?.keyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_mode';
  const amountInPaise = Math.round(Number(amount) * 100);

  // If Razorpay credentials are not set (e.g. Test / Demo mode)
  if (!client) {
    console.log(`ℹ️ [PAYMENT] Initializing Razorpay direct checkout (₹${amount})`);
    return {
      id: null,
      orderId: null,
      amount: amountInPaise,
      currency,
      receipt,
      isMock: true,
      keyId,
      paymentLinkUrl: null,
      paymentLinkId: null,
    };
  }

  try {
    const order = await client.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes,
    });

    // Also generate official Razorpay Hosted Payment Link (rzp.io)
    // Hosted by Razorpay itself, completely immune to custom domain whitelisting restrictions
    let paymentLinkUrl = null;
    let paymentLinkId = null;
    try {
      const cleanPhone = customer.phone ? String(customer.phone).replace(/\D/g, '').slice(-10) : '';
      const finalCallback = callbackUrl || (process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/register` : 'https://eventra-2026.vercel.app/register');
      const link = await client.paymentLink.create({
        amount: amountInPaise,
        currency,
        accept_partial: false,
        description: `${notes.ticketType || 'Eventra 2026'} Entry Pass`,
        customer: {
          name: customer.name || notes.name || 'Participant',
          email: customer.email || notes.email || '',
          contact: cleanPhone,
        },
        notify: { sms: false, email: false },
        reminder_enable: false,
        notes: {
          ...notes,
          orderId: order.id,
        },
        callback_url: `${finalCallback}?plink_id={payment_link_id}&plink_status={payment_link_status}&order_id=${order.id}`,
        callback_method: 'get',
      });
      paymentLinkUrl = link.short_url;
      paymentLinkId = link.id;
    } catch (linkErr) {
      console.warn('⚠️ [Razorpay] paymentLink generation notice:', linkErr.message);
    }

    return {
      ...order,
      orderId: order.id,
      isMock: false,
      keyId,
      paymentLinkUrl,
      paymentLinkId,
    };
  } catch (err) {
    console.warn('⚠️ [Razorpay] orders.create failed:', err.message);
    return {
      id: null,
      orderId: null,
      amount: amountInPaise,
      currency,
      receipt,
      isMock: true,
      keyId,
      paymentLinkUrl: null,
      paymentLinkId: null,
    };
  }
};

/**
 * Fetch a Razorpay Payment Link by ID
 */
export const fetchPaymentLink = async (paymentLinkId) => {
  const clientData = await getRazorpayClient();
  const client = clientData?.client;
  if (!client || !paymentLinkId) return null;
  try {
    return await client.paymentLink.fetch(paymentLinkId);
  } catch (err) {
    console.warn('⚠️ [Razorpay] paymentLink.fetch notice:', err.message);
    return null;
  }
};

/**
 * Cryptographic HMAC SHA256 Signature Verification
 */
export const verifyPaymentSignature = async ({ orderId, paymentId, signature }) => {
  let keySecret = process.env.RAZORPAY_KEY_SECRET;
  try {
    const { configRepo } = await import('../models/configRepo.js');
    const cfg = await configRepo.getConfig();
    if (cfg?.razorpayKeySecret) keySecret = cfg.razorpayKeySecret.trim();
  } catch (e) {}

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  if (!keySecret) {
    console.error('❌ [Razorpay] Verification failed: RAZORPAY_KEY_SECRET is not configured.');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
};
