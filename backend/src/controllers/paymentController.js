import { v4 as uuidv4 } from 'uuid';
import { registrantRepo } from '../models/registrantRepo.js';
import { configRepo } from '../models/configRepo.js';
import { createOrder, verifyPaymentSignature } from '../services/paymentService.js';
import { generatePassSignature, createQRPayload, generateQRCodeDataUrl, generatePassQRCode } from '../services/qrService.js';
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
    // Duplicate registrations are allowed for now

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
      const { qrCodeUrl, qrCodeDataUrl } = await generatePassQRCode(qrPayload, uniqueId);

      const effectiveEventId = req.body.eventId || 'hackseries-2026';
      const effectiveEventName = req.body.eventName || 'HackSeries 2026';

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
        formResponses: {
          ...formResponses,
          eventId: effectiveEventId,
          eventName: effectiveEventName,
        },
        qrPayload,
        qrSignature: signature,
        qrCodeUrl: qrCodeUrl || qrCodeDataUrl,
        qrCodeDataUrl,
        verified: true, // Direct verification for free passes
        verificationStatus: 'Verified',
        paymentStatus: 'FREE_PASS',
        amountPaid: 0,
        currency: 'INR',
        emailSent: false,
        checkedIn: false,
      });

      // Dispatch confirmation email & WhatsApp for verified free pass
      try {
        const cfg = await configRepo.getConfig().catch(() => ({}));
        const [emailResult] = await Promise.allSettled([
          sendPassEmail(newRegistrant, cfg),
          sendAutoPassWhatsApp(newRegistrant),
        ]);
        if (emailResult.status === 'fulfilled') {
          await registrantRepo.update(newRegistrant.uniqueId, {
            emailSent: true,
            emailSentAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('Auto dispatch notice:', e.message);
      }

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
        eventId: req.body.eventId || 'hackseries-2026',
        eventName: req.body.eventName || 'HackSeries 2026',
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
  return res.status(400).json({
    success: false,
    message: 'Manual UPI self-verification is disabled. Please complete payment through the automated Razorpay Standard Checkout gateway.',
  });
};

/**
 * 2. Verify Payment & Mint Verified Entry Pass
 * POST /api/payment/verify or POST /api/verify-payment
 */
export const verifyAndCompleteRegistration = async (req, res) => {
  try {
    const razorpay_order_id = req.body.razorpay_order_id || req.body.order_id || req.body.orderId;
    const razorpay_payment_id = req.body.razorpay_payment_id || req.body.payment_id || req.body.paymentId;
    const razorpay_signature = req.body.razorpay_signature || req.body.signature;
    const participantData = req.body.participantData || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: razorpay_order_id, razorpay_payment_id, and razorpay_signature are strictly required.',
      });
    }

    const isValid = await verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Cryptographic signature mismatch. Payment was not confirmed.',
      });
    }

    const effectiveOrderId = razorpay_order_id;
    const cleanEmail = String(participantData.email || '').toLowerCase().trim();
    // Duplicate entries allowed: Always mint a new official pass for every successful payment

    // Generate Official Cryptographic Pass
    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;
    const ticketType = participantData.ticketType || 'Hacker Pass';

    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const { qrCodeUrl, qrCodeDataUrl } = await generatePassQRCode(qrPayload, uniqueId);

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
      formResponses: {
        ...(participantData.formResponses || {}),
        eventId: participantData.eventId || 'hackseries-2026',
        eventName: participantData.eventName || 'HackSeries 2026',
      },
      qrPayload,
      qrSignature: signature,
      qrCodeUrl: qrCodeUrl || qrCodeDataUrl,
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

    // Dispatch pass email & WhatsApp notification with a 3.5s race timeout so response is never timed out by Vercel
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));
    try {
      const cfg = await configRepo.getConfig().catch(() => ({}));
      const dispatchPromise = Promise.allSettled([
        sendPassEmail(newRegistrant, cfg).then(() => {
          return registrantRepo.update(newRegistrant.uniqueId, {
            emailSent: true,
            emailSentAt: new Date().toISOString(),
          });
        }),
        sendAutoPassWhatsApp(newRegistrant),
      ]);

      await Promise.race([dispatchPromise, timeoutPromise]);
    } catch (dispatchErr) {
      console.warn('⚠️ Dispatch warning:', dispatchErr.message);
    }

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
 * 3. Check Order Status directly with Razorpay
 * POST /api/payment/check-order or GET /api/payment/check-order/:orderId
 * Recovers pass if user closed or switched away from the browser on mobile
 */
export const checkOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.body.order_id || req.body.orderId;
    const participantData = req.body.participantData || {};

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    // 1. Check if pass was already minted in Firestore
    const existing = await registrantRepo.findByOrderId(orderId);
    if (existing) {
      return res.json({
        success: true,
        isPaid: true,
        message: 'Pass already issued.',
        data: existing,
      });
    }

    // 2. Query Razorpay API directly
    const clientData = await getRazorpayClient();
    const client = clientData?.client;
    if (!client) {
      return res.status(500).json({ success: false, message: 'Razorpay client unavailable' });
    }

    const order = await client.orders.fetch(orderId);
    if (!order || order.status !== 'paid') {
      return res.json({
        success: true,
        isPaid: false,
        status: order?.status || 'unpaid',
        message: 'Payment has not been completed yet.',
      });
    }

    // Order is confirmed paid on Razorpay!
    const payments = await client.orders.fetchPayments(orderId);
    const successfulPayment = (payments?.items || []).find(
      (p) => p.status === 'captured' || p.status === 'authorized'
    ) || payments?.items?.[0];

    const paymentId = successfulPayment?.id || `pay_${Date.now()}`;
    const cleanEmail = String(participantData.email || successfulPayment?.email || '').toLowerCase().trim();
    const attendeeName = (participantData.name || successfulPayment?.notes?.name || 'Participant').trim();
    const ticketType = participantData.ticketType || 'Hacker Pass';

    // Mint official pass
    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;
    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const { qrCodeUrl, qrCodeDataUrl } = await generatePassQRCode(qrPayload, uniqueId);

    const newRegistrant = await registrantRepo.create({
      uniqueId,
      name: attendeeName,
      email: cleanEmail,
      phone: participantData.phone ? String(participantData.phone).trim() : (successfulPayment?.contact || ''),
      ticketType,
      teamName: participantData.teamName ? String(participantData.teamName).trim() : '',
      track: participantData.track || 'AI & Agentic Systems',
      githubUrl: participantData.githubUrl || '',
      institution: participantData.institution || 'Dr. D. Y. Patil Institute of Technology, Pimpri, Pune',
      formResponses: {
        ...(participantData.formResponses || {}),
        eventId: participantData.eventId || successfulPayment?.notes?.eventId || 'hackseries-2026',
        eventName: participantData.eventName || successfulPayment?.notes?.eventName || 'HackSeries 2026',
      },
      qrPayload,
      qrSignature: signature,
      qrCodeUrl: qrCodeUrl || qrCodeDataUrl,
      qrCodeDataUrl,
      verified: true,
      verificationStatus: 'Verified',
      paymentStatus: 'PAID',
      paymentId,
      orderId,
      amountPaid: (order.amount_paid || 500) / 100,
      paidAt: new Date().toISOString(),
      emailSent: false,
      checkedIn: false,
    });

    console.log(`✅ [ORDER CHECK RECOVERY] Minted pass ${newRegistrant.uniqueId} for ${newRegistrant.email} via Razorpay ${paymentId}`);

    // Asynchronously dispatch pass email
    configRepo.getConfig()
      .then((cfg) => sendPassEmail(newRegistrant, cfg))
      .then(() => registrantRepo.update(newRegistrant.uniqueId, { emailSent: true, emailSentAt: new Date().toISOString() }))
      .catch((e) => console.warn('Email dispatch notice:', e.message));

    return res.status(201).json({
      success: true,
      isPaid: true,
      message: `Payment Verified! Pass ${uniqueId} issued successfully.`,
      data: newRegistrant,
    });
  } catch (error) {
    console.error('checkOrderStatus error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Razorpay Server Webhook Catch-All (For resilience against dropped user tabs)
 * POST /api/payment/webhook
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    const event = req.body.event;
    console.log(`📥 [RAZORPAY WEBHOOK RECEIVED] Event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const payloadPayment = req.body.payload?.payment?.entity;
      const orderId = payloadPayment?.order_id || req.body.payload?.order?.entity?.id;
      const paymentId = payloadPayment?.id;

      if (orderId) {
        const existing = await registrantRepo.findByOrderId(orderId);
        if (!existing && payloadPayment) {
          const cleanEmail = String(payloadPayment.email || payloadPayment.notes?.email || '').toLowerCase().trim();
          const attendeeName = (payloadPayment.notes?.name || 'Participant').trim();
          const ticketType = payloadPayment.notes?.ticketType || 'Hacker Pass';

          if (cleanEmail) {
            const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
            const uniqueId = `HS26-${rawUuid}`;
            const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
            const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
            const { qrCodeUrl, qrCodeDataUrl } = await generatePassQRCode(qrPayload, uniqueId);

            const newRegistrant = await registrantRepo.create({
              uniqueId,
              name: attendeeName,
              email: cleanEmail,
              phone: payloadPayment.contact || '',
              ticketType,
              teamName: payloadPayment.notes?.teamName || '',
              track: payloadPayment.notes?.track || 'AI & Agentic Systems',
              institution: 'Dr. D. Y. Patil Institute of Technology, Pimpri, Pune',
              formResponses: {
                eventId: payloadPayment.notes?.eventId || 'hackseries-2026',
                eventName: payloadPayment.notes?.eventName || 'HackSeries 2026',
              },
              qrPayload,
              qrSignature: signature,
              qrCodeUrl: qrCodeUrl || qrCodeDataUrl,
              qrCodeDataUrl,
              verified: true,
              verificationStatus: 'Verified',
              paymentStatus: 'PAID',
              paymentId: paymentId || `pay_${Date.now()}`,
              orderId,
              amountPaid: (payloadPayment.amount || 500) / 100,
              paidAt: new Date().toISOString(),
              emailSent: false,
              checkedIn: false,
            });

            console.log(`✅ [WEBHOOK PASS MINTED] ${newRegistrant.name} (${newRegistrant.uniqueId}) via ${paymentId}`);

            configRepo.getConfig()
              .then((cfg) => sendPassEmail(newRegistrant, cfg))
              .then(() => registrantRepo.update(newRegistrant.uniqueId, { emailSent: true, emailSentAt: new Date().toISOString() }))
              .catch((e) => console.warn('Webhook email error:', e.message));
          }
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ status: 'error' });
  }
};
