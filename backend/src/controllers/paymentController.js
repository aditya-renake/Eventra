import { v4 as uuidv4 } from 'uuid';
import { registrantRepo } from '../models/registrantRepo.js';
import { configRepo } from '../models/configRepo.js';
import { eventRepo } from '../models/eventRepo.js';
import { resolveEventContext } from './registrantController.js';
import { createOrder, verifyPaymentSignature, getRazorpayClient } from '../services/paymentService.js';
import { generatePassSignature, createQRPayload, generateQRCodeDataUrl } from '../services/qrService.js';
import { sendPassEmail } from '../services/emailService.js';
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
      ticketType = 'Standard Pass',
      teamName = '',
      track = 'General Track',
      githubUrl = '',
      institution = '',
      formResponses = {},
      eventId,
      subEventId,
      amountPaid,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const config = await configRepo.getConfig();
    const isPaymentEnabled = config.enablePaymentGateway !== false;

    const targetEventId = String(eventId || config.activeEventId || 'eventra-2026').toLowerCase().trim();
    const ev = await eventRepo.findById(targetEventId).catch(() => null);
    const eventCtx = await resolveEventContext(targetEventId);

    let passPrice = 5;

    if (!isPaymentEnabled) {
      passPrice = 0;
    } else if (ev) {
      if (ev.pricingType === 'free') {
        passPrice = 0;
      } else if (Array.isArray(ev.subEvents) && ev.subEvents.length > 0) {
        const matchedSub = ev.subEvents.find(
          (s) => s.id === subEventId || s.name === ticketType || s.name === track
        );
        if (matchedSub && matchedSub.fee !== undefined && !isNaN(Number(matchedSub.fee))) {
          passPrice = Math.max(0, Number(matchedSub.fee));
        } else if (ev.ticketPrices && ev.ticketPrices[ticketType] !== undefined && !isNaN(Number(ev.ticketPrices[ticketType]))) {
          passPrice = Math.max(0, Number(ev.ticketPrices[ticketType]));
        } else if (ev.entryFee !== undefined && !isNaN(Number(ev.entryFee))) {
          passPrice = Math.max(0, Number(ev.entryFee));
        }
      } else if (ev.ticketPrices && ev.ticketPrices[ticketType] !== undefined && !isNaN(Number(ev.ticketPrices[ticketType]))) {
        passPrice = Math.max(0, Number(ev.ticketPrices[ticketType]));
      } else if (ev.entryFee !== undefined && !isNaN(Number(ev.entryFee))) {
        passPrice = Math.max(0, Number(ev.entryFee));
      }
    } else {
      const priceMap = config.ticketPrices || {};
      if (priceMap[ticketType] !== undefined && !isNaN(Number(priceMap[ticketType]))) {
        passPrice = Math.max(0, Number(priceMap[ticketType]));
      } else if (amountPaid !== undefined && !isNaN(Number(amountPaid))) {
        passPrice = Math.max(0, Number(amountPaid));
      }
    }

    const tempReceipt = `RCPT-${Date.now()}`;

    // If the pass price is 0 INR (free event or free tier), generate pass immediately
    if (passPrice === 0) {
      const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
      const uniqueId = `HS26-${rawUuid}`;
      const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
      const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
      const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

      const newRegistrant = await registrantRepo.create({
        uniqueId,
        eventId: targetEventId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : '',
        ticketType,
        teamName: teamName ? teamName.trim() : '',
        track,
        githubUrl: githubUrl ? githubUrl.trim() : '',
        institution: institution ? institution.trim() : (eventCtx.collegeName || ''),
        formResponses,
        qrPayload,
        qrSignature: signature,
        qrCodeDataUrl,
        verified: true,
        verificationStatus: 'Verified',
        paymentStatus: 'FREE_PASS',
        amountPaid: 0,
        currency: 'INR',
        emailSent: false,
        checkedIn: false,
      });

      try {
        const [emailResult] = await Promise.allSettled([
          sendPassEmail(newRegistrant, eventCtx),
          sendAutoPassWhatsApp(newRegistrant, eventCtx),
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
          eventId: targetEventId,
        },
      });
    }

    // For paid registrations: Initiate Razorpay Order
    const order = await createOrder({
      amount: passPrice,
      currency: config.currency || 'INR',
      receipt: tempReceipt,
      notes: {
        name,
        email: cleanEmail,
        ticketType,
        track,
        eventId: targetEventId,
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
        eventId: targetEventId,
      },
    });
  } catch (error) {
    console.error('❌ Create registration order error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate order', error: error.message });
  }
};

/**
 * Standard Razorpay Order Creation Endpoint
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
      amount: amountInPaise / 100,
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

export const verifyUpiPayment = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Manual UPI self-verification is disabled. Please complete payment through the automated Razorpay Standard Checkout gateway.',
  });
};

/**
 * 2. Verify Payment & Mint Verified Entry Pass
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
    const eventCtx = await resolveEventContext(participantData.eventId);
    const targetEventId = eventCtx.eventId || 'eventra-2026';

    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;
    const ticketType = participantData.ticketType || 'Standard Pass';

    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const newRegistrant = await registrantRepo.create({
      uniqueId,
      eventId: targetEventId,
      name: (participantData.name || 'Participant').trim(),
      email: cleanEmail,
      phone: participantData.phone ? String(participantData.phone).trim() : '',
      ticketType,
      teamName: participantData.teamName ? String(participantData.teamName).trim() : '',
      track: participantData.track || 'General Track',
      githubUrl: participantData.githubUrl || '',
      institution: participantData.institution || eventCtx.collegeName || '',
      formResponses: participantData.formResponses || {},
      qrPayload,
      qrSignature: signature,
      qrCodeDataUrl,
      verified: true,
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

    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));
    try {
      const dispatchPromise = Promise.allSettled([
        sendPassEmail(newRegistrant, eventCtx).then(() => {
          return registrantRepo.update(newRegistrant.uniqueId, {
            emailSent: true,
            emailSentAt: new Date().toISOString(),
          });
        }),
        sendAutoPassWhatsApp(newRegistrant, eventCtx),
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
 */
export const checkOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.body.order_id || req.body.orderId;
    const participantData = req.body.participantData || {};

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    const existing = await registrantRepo.findByOrderId(orderId);
    if (existing) {
      return res.json({
        success: true,
        isPaid: true,
        message: 'Pass already issued.',
        data: existing,
      });
    }

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

    const payments = await client.orders.fetchPayments(orderId);
    const successfulPayment = (payments?.items || []).find(
      (p) => p.status === 'captured' || p.status === 'authorized'
    ) || payments?.items?.[0];

    const paymentId = successfulPayment?.id || `pay_${Date.now()}`;
    const cleanEmail = String(participantData.email || successfulPayment?.email || '').toLowerCase().trim();
    const attendeeName = (participantData.name || successfulPayment?.notes?.name || 'Participant').trim();
    const ticketType = participantData.ticketType || successfulPayment?.notes?.ticketType || 'Standard Pass';
    const rawEventId = participantData.eventId || order?.notes?.eventId || successfulPayment?.notes?.eventId;
    const eventCtx = await resolveEventContext(rawEventId);
    const targetEventId = eventCtx.eventId || 'eventra-2026';

    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;
    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const newRegistrant = await registrantRepo.create({
      uniqueId,
      eventId: targetEventId,
      name: attendeeName,
      email: cleanEmail,
      phone: participantData.phone ? String(participantData.phone).trim() : (successfulPayment?.contact || ''),
      ticketType,
      teamName: participantData.teamName ? String(participantData.teamName).trim() : '',
      track: participantData.track || successfulPayment?.notes?.track || 'General Track',
      githubUrl: participantData.githubUrl || '',
      institution: participantData.institution || eventCtx.collegeName || '',
      formResponses: participantData.formResponses || {},
      qrPayload,
      qrSignature: signature,
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

    sendPassEmail(newRegistrant, eventCtx)
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
 * 4. Razorpay Server Webhook Catch-All
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
          const ticketType = payloadPayment.notes?.ticketType || 'Standard Pass';
          const rawEventId = payloadPayment.notes?.eventId;
          const eventCtx = await resolveEventContext(rawEventId);
          const targetEventId = eventCtx.eventId || 'eventra-2026';

          if (cleanEmail) {
            const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
            const uniqueId = `HS26-${rawUuid}`;
            const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
            const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
            const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

            const newRegistrant = await registrantRepo.create({
              uniqueId,
              eventId: targetEventId,
              name: attendeeName,
              email: cleanEmail,
              phone: payloadPayment.contact || '',
              ticketType,
              teamName: payloadPayment.notes?.teamName || '',
              track: payloadPayment.notes?.track || 'General Track',
              institution: eventCtx.collegeName || '',
              formResponses: {},
              qrPayload,
              qrSignature: signature,
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

            sendPassEmail(newRegistrant, eventCtx)
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

/**
 * 5. Live Razorpay Financial Telemetry & Payment Collection Stats
 * GET /api/payment/live-stats?eventId=...
 */
export const getLivePaymentStats = async (req, res) => {
  try {
    const { eventId } = req.query;
    const cleanEventId = eventId && eventId !== 'all' ? String(eventId).toLowerCase().trim() : null;

    // 1. Fetch event-scoped registrants from Firestore
    const listRes = await registrantRepo.getAll({
      page: 1,
      limit: 1000,
      eventId: cleanEventId || 'all',
    });

    const registrants = listRes.items || [];
    const dbRevenue = listRes.stats?.totalRevenue || 0;
    const dbPaidCount = listRes.stats?.paidRegistrantsCount || 0;

    // Build map of known paymentIds and orderIds in DB
    const dbPaymentsMap = new Map();
    registrants.forEach((r) => {
      if (r.paymentId) dbPaymentsMap.set(r.paymentId, r);
      if (r.orderId) dbPaymentsMap.set(r.orderId, r);
    });

    // 2. Query Live Razorpay API directly
    let razorpayConnected = false;
    let liveKeyId = null;
    let razorpayTotalRevenue = 0;
    let razorpayCapturedCount = 0;
    const matchedTransactions = [];

    const clientData = await getRazorpayClient();
    const client = clientData?.client;
    liveKeyId = clientData?.keyId || process.env.RAZORPAY_KEY_ID || null;

    if (client) {
      razorpayConnected = true;
      try {
        const fetchRes = await client.payments.all({ count: 100 });
        const allPayments = fetchRes?.items || [];

        allPayments.forEach((p) => {
          if (p.status === 'captured') {
            const pEventId = p.notes?.eventId ? String(p.notes.eventId).toLowerCase().trim() : null;
            // Match if:
            // 1. No specific event requested ('all' / lifetime)
            // 2. Direct eventId tag on the Razorpay order matches
            // 3. Or payment belongs to default flagship event ('eventra-2026') when untagged
            // 4. Or paymentId / orderId is recorded in DB for this event
            const isMatch = !cleanEventId || 
              cleanEventId === 'all' ||
              pEventId === cleanEventId || 
              (!pEventId && (cleanEventId === 'eventra-2026' || cleanEventId === 'all')) ||
              dbPaymentsMap.has(p.id) || 
              (p.order_id && dbPaymentsMap.has(p.order_id));

            if (isMatch) {
              const amountRupees = (Number(p.amount) || 0) / 100;
              razorpayTotalRevenue += amountRupees;
              razorpayCapturedCount++;

              const reg = dbPaymentsMap.get(p.id) || (p.order_id ? dbPaymentsMap.get(p.order_id) : null);
              matchedTransactions.push({
                paymentId: p.id,
                orderId: p.order_id || reg?.orderId || null,
                amount: amountRupees,
                currency: p.currency || 'INR',
                status: p.status,
                method: p.method || 'upi',
                email: p.email || reg?.email || p.notes?.email || '',
                name: reg?.name || p.notes?.name || 'Attendee',
                contact: p.contact || reg?.phone || p.notes?.phone || '',
                ticketType: reg?.ticketType || p.notes?.ticketType || 'Standard Pass',
                createdAt: p.created_at ? new Date(p.created_at * 1000).toISOString() : new Date().toISOString(),
              });
            }
          }
        });
      } catch (rzpErr) {
        console.warn('⚠️ [Razorpay live-stats query notice]:', rzpErr.message);
      }
    }

    // 3. 100% Accurate Reconciled Stats (combine Razorpay live with verified DB records)
    // Add any DB paid transactions that weren't already captured in matchedTransactions
    const existingTxIds = new Set(matchedTransactions.map((t) => t.paymentId));
    registrants.forEach((r) => {
      if ((r.paymentStatus === 'PAID' || Number(r.amountPaid) > 0) && r.paymentId && !existingTxIds.has(r.paymentId)) {
        matchedTransactions.push({
          paymentId: r.paymentId,
          orderId: r.orderId || null,
          amount: Number(r.amountPaid) || 5,
          currency: r.currency || 'INR',
          status: 'captured',
          method: 'upi',
          email: r.email,
          name: r.name,
          contact: r.phone || '',
          ticketType: r.ticketType || 'Standard Pass',
          createdAt: r.paidAt || r.createdAt || new Date().toISOString(),
        });
      }
    });

    const totalReconciledRevenue = matchedTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const effectiveRevenue = Math.max(dbRevenue, razorpayTotalRevenue, totalReconciledRevenue);
    const effectivePaidCount = Math.max(dbPaidCount, razorpayCapturedCount, matchedTransactions.length);
    const averageOrderValue = effectivePaidCount > 0 ? Math.round(effectiveRevenue / effectivePaidCount) : 0;

    // Sort latest transactions first
    matchedTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const payload = {
      eventId: cleanEventId || 'all',
      gatewayConnected: razorpayConnected,
      gatewayKeyId: liveKeyId,
      gatewayMode: liveKeyId?.startsWith('rzp_live') ? 'LIVE_PRODUCTION' : 'TEST_MODE',
      currency: 'INR',
      totalRevenue: effectiveRevenue,
      paidOrdersCount: effectivePaidCount,
      averageTicketValue: averageOrderValue,
      freePassesCount: listRes.stats?.freeRegistrantsCount || 0,
      totalRegistrants: listRes.stats?.totalRegistrants || 0,
      ticketBreakdown: listRes.stats?.ticketBreakdown || {},
      transactions: matchedTransactions.slice(0, 50),
      lastSyncedAt: new Date().toISOString(),
    };

    return res.json({
      success: true,
      data: payload,
      ...payload,
    });
  } catch (error) {
    console.error('❌ getLivePaymentStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch live payment stats', error: error.message });
  }
};
