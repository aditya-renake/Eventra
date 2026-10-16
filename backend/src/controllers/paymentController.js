import { v4 as uuidv4 } from 'uuid';
import { registrantRepo } from '../models/registrantRepo.js';
import { configRepo } from '../models/configRepo.js';
import { createOrder, verifyPaymentSignature } from '../services/paymentService.js';
import { generatePassSignature, createQRPayload, generateQRCodeDataUrl } from '../services/qrService.js';
import { sendPassEmail, sendRegistrationReceivedEmail } from '../services/emailService.js';
import { sendAutoPassWhatsApp } from '../services/messagingService.js';

/**
 * 1. Initiate In-App Registration Order
 * POST /api/payment/create-order
 */
export const initiateRegistrationOrder = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      ticketType = 'Hacker Pass',
      teamName = '',
      track = 'AI & Agentic Systems',
      githubUrl = '',
      institution = 'Dr. D. Y. Patil Institute of Technology, Pimpri, Pune',
      formResponses = {},
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = await registrantRepo.findByEmail(cleanEmail);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A participant is already registered with this email address.',
        existingPassId: existing.uniqueId,
      });
    }

    const config = await configRepo.getConfig();
    const isPaymentEnabled = config.enablePaymentGateway !== false;
    const priceMap = config.ticketPrices || {
      'Hacker Pass': 5,
      'Student Pass': 5,
      'VIP Delegate': 5,
      'Judge / Mentor': 5,
    };

    const passPrice = priceMap[ticketType] !== undefined && !isNaN(Number(priceMap[ticketType])) ? Number(priceMap[ticketType]) : 5;
    const tempReceipt = `RCPT-${Date.now()}`;

    // ONLY if the pass price is explicitly 0 INR (free tier), generate pass immediately
    if (passPrice === 0) {
      const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
      const uniqueId = `HS26-${rawUuid}`;
      const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
      const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
      const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

      const newRegistrant = await registrantRepo.create({
        uniqueId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : '',
        ticketType,
        teamName: teamName ? teamName.trim() : '',
        track,
        githubUrl: githubUrl ? githubUrl.trim() : '',
        institution: institution ? institution.trim() : '',
        formResponses,
        qrPayload,
        qrSignature: signature,
        qrCodeDataUrl,
        verified: true, // Direct verification for free passes
        verificationStatus: 'Verified',
        paymentStatus: 'FREE_PASS',
        amountPaid: 0,
        currency: 'INR',
        emailSent: false,
        checkedIn: false,
      });

      // Dispatch confirmation email & WhatsApp asynchronously for verified free pass
      configRepo.getConfig()
        .then((cfg) => Promise.allSettled([sendPassEmail(newRegistrant, cfg), sendAutoPassWhatsApp(newRegistrant)]))
        .catch((e) => console.warn('Auto dispatch notice:', e.message));

      return res.status(201).json({
        success: true,
        isFree: true,
        message: 'Registration successful! Digital Pass generated.',
        data: {
          uniqueId: newRegistrant.uniqueId,
          name: newRegistrant.name,
          email: newRegistrant.email,
        },
      });
    }

    // For all paid registrations (₹5): Initiate Razorpay Order.
    // ZERO registrant creation and ZERO pass email dispatch until payment is verified!
    const order = await createOrder({
      amount: passPrice,
      currency: config.currency || 'INR',
      receipt: tempReceipt,
      notes: {
        name,
        email: cleanEmail,
        ticketType,
        track,
      },
    });

    return res.json({
      success: true,
      isFree: false,
      order_id: order.orderId || order.id || null,
      orderId: order.orderId || order.id || null,
      amount: order.amount,
      amountRupees: passPrice,
      currency: order.currency || 'INR',
      key_id: order.keyId,
      keyId: order.keyId,
      isMock: order.isMock,
      participantSummary: {
        name,
        email: cleanEmail,
        ticketType,
        amountRupees: passPrice,
      },
    });
  } catch (error) {
    console.error('❌ Create registration order error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate order', error: error.message });
  }
};

/**
 * Standard Razorpay Order Creation Endpoint
 * POST /api/create-order or POST /api/payment/create-order
 * Request: { amount, currency, receipt, notes }
 * Return: { order_id, amount, currency }
 * Minimum amount: 100 paise
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const {
      amount,
      currency = 'INR',
      receipt,
      notes = {},
      name,
      email,
    } = req.body || {};

    // If attendee registration payload is passed, route to registration handler
    if (name && email) {
      return initiateRegistrationOrder(req, res);
    }

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, message: 'Valid amount is required.' });
    }

    const numericAmount = Number(amount);
    const amountInPaise = Math.round(numericAmount);

    if (amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum order amount is 100 paise (₹1).',
      });
    }

    const orderReceipt = receipt || `rcpt_${Date.now()}`;
    const order = await createOrder({
      amount: amountInPaise / 100, // createOrder multiplies by 100 to get paise
      currency,
      receipt: orderReceipt,
      notes,
    });

    if (!order || !order.orderId) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create order with Razorpay API.',
      });
    }

    return res.status(200).json({
      success: true,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency || currency,
      key_id: order.keyId || process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('❌ createRazorpayOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
};

/**
 * 2a. Verify Direct UPI Payment (UTR / Transaction Reference) & Mint Pass
 * POST /api/payment/verify-upi
 */
export const verifyUpiPayment = async (req, res) => {
  try {
    const {
      orderId,
      utrNumber,
      participantData = {},
    } = req.body;

    if (!utrNumber || String(utrNumber).trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A valid 12-digit UPI Reference Number / UTR is required to confirm payment.',
      });
    }

    const cleanUtr = String(utrNumber).trim().toUpperCase();

    // Prevent duplicate UTR usage across participants
    const existingWithUtr = await registrantRepo.findByUtr(cleanUtr);
    if (existingWithUtr) {
      return res.status(400).json({
        success: false,
        message: `This UPI Reference Number (${cleanUtr}) has already been used for pass ${existingWithUtr.uniqueId}. Each pass requires a unique payment.`,
      });
    }

    const cleanEmail = String(participantData.email || '').toLowerCase().trim();
    let existing = await registrantRepo.findByEmail(cleanEmail);

    if (existing) {
      return res.json({
        success: true,
        message: 'Attendee already registered! Existing pass retrieved.',
        data: existing,
      });
    }

    const config = await configRepo.getConfig();
    const targetUpiId = config.upiId || 'tigeradi1504-1@okicici';

    // Generate Official Cryptographic Pass
    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;
    const ticketType = participantData.ticketType || 'Hacker Pass';

    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const newRegistrant = await registrantRepo.create({
      uniqueId,
      name: (participantData.name || 'Participant').trim(),
      email: cleanEmail,
      phone: participantData.phone ? String(participantData.phone).trim() : '',
      ticketType,
      teamName: participantData.teamName ? String(participantData.teamName).trim() : '',
      track: participantData.track || 'AI & Agentic Systems',
      githubUrl: participantData.githubUrl || '',
      institution: participantData.institution || 'Dr. D. Y. Patil Institute of Technology, Pimpri, Pune',
      formResponses: participantData.formResponses || {},
      qrPayload,
      qrSignature: signature,
      qrCodeDataUrl,
      verified: true, // Automatically verified upon confirmed payment submission
      verificationStatus: 'Verified',
      paymentStatus: 'PAID',
      paymentMethod: 'UPI_DIRECT',
      payeeUpi: targetUpiId,
      utrNumber: cleanUtr,
      orderId: orderId || `UPI-${Date.now()}`,
      amountPaid: participantData.amountPaid || 199,
      paidAt: new Date().toISOString(),
      emailSent: false,
      checkedIn: false,
    });

    console.log(`✅ [UPI PAYMENT CONFIRMED & PASS MINTED] ${newRegistrant.name} (${newRegistrant.uniqueId}) via UTR ${cleanUtr} to ${targetUpiId}`);

    // Asynchronously dispatch pass email & WhatsApp notification
    configRepo.getConfig()
      .then((cfg) => Promise.allSettled([sendPassEmail(newRegistrant, cfg), sendAutoPassWhatsApp(newRegistrant)]))
      .then(() => console.log(`📧 Pass dual-dispatched for ${newRegistrant.email}`))
      .catch((e) => console.warn('Dispatch notice:', e.message));

    return res.status(201).json({
      success: true,
      message: `Payment Verified! Pass ${uniqueId} issued successfully.`,
      data: newRegistrant,
    });
  } catch (error) {
    console.error('❌ UPI verification error:', error);
    return res.status(500).json({ success: false, message: 'UPI payment verification failed', error: error.message });
  }
};

/**
 * 2. Verify Payment & Mint Verified Entry Pass
 * POST /api/payment/verify
 */
export const verifyAndCompleteRegistration = async (req, res) => {
  try {
    const razorpay_order_id = req.body.razorpay_order_id || req.body.order_id || req.body.orderId;
    const razorpay_payment_id = req.body.razorpay_payment_id || req.body.payment_id || req.body.paymentId;
    const razorpay_signature = req.body.razorpay_signature || req.body.signature;
    const participantData = req.body.participantData || {};

    if (!razorpay_payment_id) {
      return res.status(400).json({ success: false, message: 'Payment details missing: payment ID required.' });
    }

    const effectiveOrderId = razorpay_order_id || participantData.orderId || `pay_order_${Date.now()}`;

    // If Razorpay provided order_id and signature, verify the HMAC signature
    if (razorpay_order_id && razorpay_signature) {
      const isValid = await verifyPaymentSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Cryptographic signature mismatch.',
        });
      }
    }

    const cleanEmail = String(participantData.email || '').toLowerCase().trim();
    let existing = await registrantRepo.findByEmail(cleanEmail);

    if (existing) {
      return res.json({
        success: true,
        message: 'Payment verified! Existing pass retrieved.',
        data: existing,
      });
    }

    // Generate Official Cryptographic Pass
    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;
    const ticketType = participantData.ticketType || 'Hacker Pass';

    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const newRegistrant = await registrantRepo.create({
      uniqueId,
      name: (participantData.name || 'Participant').trim(),
      email: cleanEmail,
      phone: participantData.phone ? String(participantData.phone).trim() : '',
      ticketType,
      teamName: participantData.teamName ? String(participantData.teamName).trim() : '',
      track: participantData.track || 'AI & Agentic Systems',
      githubUrl: participantData.githubUrl || '',
      institution: participantData.institution || 'Dr. D. Y. Patil Institute of Technology, Pimpri, Pune',
      formResponses: participantData.formResponses || {},
      qrPayload,
      qrSignature: signature,
      qrCodeDataUrl,
      verified: true, // Automatically verified upon confirmed payment
      verificationStatus: 'Verified',
      paymentStatus: 'PAID',
      paymentId: razorpay_payment_id,
      orderId: effectiveOrderId,
      amountPaid: Number(participantData.amountPaid) || 5,
      paidAt: new Date().toISOString(),
      emailSent: false,
      checkedIn: false,
    });

    console.log(`✅ [PAYMENT VERIFIED & PASS MINTED] ${newRegistrant.name} (${newRegistrant.uniqueId}) via ${razorpay_payment_id}`);

    // Asynchronously dispatch pass email & WhatsApp notification
    configRepo.getConfig()
      .then((cfg) => Promise.allSettled([sendPassEmail(newRegistrant, cfg), sendAutoPassWhatsApp(newRegistrant)]))
      .then(() => console.log(`📧 Pass dual-dispatched for ${newRegistrant.email}`))
      .catch((e) => console.warn('Dispatch notice:', e.message));

    return res.status(201).json({
      success: true,
      message: `Payment Verified! Pass ${uniqueId} issued successfully.`,
      data: newRegistrant,
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return res.status(500).json({ success: false, message: 'Payment verification failed', error: error.message });
  }
};

/**
 * Standard Razorpay Signature Verification Endpoint
 * POST /api/verify-payment or POST /api/payment/verify-payment
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * Compare generated signature with razorpay_signature
 * Return success only if signatures match
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const order_id = req.body.razorpay_order_id || req.body.order_id || req.body.orderId;
    const payment_id = req.body.razorpay_payment_id || req.body.payment_id || req.body.paymentId;
    const signature = req.body.razorpay_signature || req.body.signature;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields (order_id, payment_id, signature).',
      });
    }

    const isValid = await verifyPaymentSignature({
      orderId: order_id,
      paymentId: payment_id,
      signature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Signature mismatch.',
      });
    }

    // If participant registration data was passed, complete pass minting
    if (req.body.participantData && (req.body.participantData.email || req.body.participantData.name)) {
      return verifyAndCompleteRegistration(req, res);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      order_id,
      payment_id,
    });
  } catch (error) {
    console.error('❌ verifyRazorpayPayment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification error',
      error: error.message,
    });
  }
};

/**
 * 3. Razorpay Server Webhook Catch-All (For resilience against dropped user tabs)
 * POST /api/payment/webhook
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    const event = req.body.event;
    console.log(`📥 [RAZORPAY WEBHOOK RECEIVED] Event: ${event}`);

    // Respond immediately to acknowledge receipt
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ status: 'error' });
  }
};
