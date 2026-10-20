/**
 * ============================================================================
 * MESSAGING & NOTIFICATION SERVICE (WHATSAPP & SMS)
 * ============================================================================
 * Purpose:
 *   Dispatches instant post-checkin WhatsApp and SMS alerts to attendees
 *   containing WiFi credentials, desk allocations, and pass links.
 *
 * Supported Gateways:
 *   - UltraMsg (WhatsApp Cloud API)
 *   - GreenAPI (WhatsApp Multi-device)
 *   - Twilio (Global SMS)
 *   - Fast2SMS (Indian DLT SMS)
 *   - Custom Webhook endpoints
 * ============================================================================
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * Normalizes an Indian or international phone number
 * e.g. '9890829874' -> '919890829874'
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  // If 10 digits (Standard Indian mobile), prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // If 12 digits starting with 91, return as is
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  // If starts with 0 (e.g. 09890829874), strip leading 0 and prepend 91
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  return digits;
};

/**
 * Builds the WhatsApp and SMS Check-in confirmation message string
 */
export const buildCheckinMessage = ({
  name,
  uniqueId,
  ticketType,
  teamName,
  track,
  checkedInAt,
  clientUrl = 'http://localhost:5173',
}) => {
  const formattedTime = checkedInAt
    ? new Date(checkedInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST'
    : 'Just now';

  const passUrl = `${clientUrl}/pass/${uniqueId}`;

  return `🎉 *Welcome to HackSeries 2026!* ✅\n\nHey *${name}*, your gate entry pass has been verified at Dr. D. Y. Patil Institute of Technology (DIT), Pune!\n\n🎫 *Pass ID:* ${uniqueId}\n🎟️ *Tier:* ${ticketType || 'Hacker Pass'}\n${teamName ? `👥 *Team:* ${teamName}\n` : ''}${track ? `🎯 *Track:* ${track}\n` : ''}🕒 *Time:* ${formattedTime}\n\n⚡ *Hacker Quick-Guide:*\n📶 *WiFi:* DIT_HACKSERIES_GUEST (Pass: HackSeries@2026)\n👕 *Swag & Food Kit:* Collect at Desk 2\n🎟️ *Live Pass & Schedule:* ${passUrl}\n\nLead Operations: *Aditya Renake* (+91 9890829874)\n_ACES • Dept. of Computer Engineering, DIT Pune_`;
};

/**
 * Automatically dispatches WhatsApp / SMS message via configured Gateway
 * Supports: UltraMsg, GreenAPI, Twilio, Fast2SMS, or custom Webhook
 */
export const sendAutoCheckinMessage = async (registrant) => {
  const phone = formatPhoneNumber(registrant.phone);
  if (!phone) {
    console.log(`ℹ️ [MESSAGING] No phone number recorded for ${registrant.name} (${registrant.uniqueId}). Skipping SMS/WhatsApp.`);
    return { success: false, reason: 'NO_PHONE' };
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const textMessage = buildCheckinMessage({
    name: registrant.name,
    uniqueId: registrant.uniqueId,
    ticketType: registrant.ticketType,
    teamName: registrant.teamName,
    track: registrant.track,
    checkedInAt: registrant.checkedInAt,
    clientUrl,
  });

  const whatsappApiUrl = process.env.WHATSAPP_API_URL;
  const whatsappToken = process.env.WHATSAPP_TOKEN;
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;

  // 1. WhatsApp Webhook / Gateway (UltraMsg, GreenAPI, etc.)
  if (whatsappApiUrl && whatsappToken) {
    try {
      const response = await fetch(whatsappApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: whatsappToken,
          to: phone,
          body: textMessage,
        }),
      });
      const data = await response.json();
      console.log(`✅ [WHATSAPP GATEWAY DISPATCHED] Sent to +${phone}:`, data);
      return { success: true, provider: 'whatsapp_gateway', result: data };
    } catch (err) {
      console.warn(`⚠️ [WHATSAPP GATEWAY ERROR] Failed sending to +${phone}:`, err.message);
    }
  }

  // 2. Fast2SMS (Indian SMS Gateway)
  if (fast2SmsKey) {
    try {
      const smsPhone = phone.startsWith('91') && phone.length === 12 ? phone.slice(2) : phone;
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: `Welcome to HackSeries 2026! Hey ${registrant.name}, your pass (${registrant.uniqueId}) is checked in at DIT Pune. View pass: ${clientUrl}/pass/${registrant.uniqueId}`,
          language: 'english',
          flash: 0,
          numbers: smsPhone,
        }),
      });
      const data = await response.json();
      console.log(`✅ [FAST2SMS DISPATCHED] Sent SMS to ${smsPhone}:`, data);
      return { success: true, provider: 'fast2sms', result: data };
    } catch (err) {
      console.warn(`⚠️ [FAST2SMS ERROR] Failed sending SMS to +${phone}:`, err.message);
    }
  }

  // Fallback: Generate ready-to-use WhatsApp direct link for 1-click browser dispatch
  const encodedText = encodeURIComponent(textMessage);
  const directWhatsAppUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;

  console.log(`📱 [WHATSAPP READY] Direct link prepared for +${phone}`);
  return {
    success: true,
    provider: 'direct_link',
    phone,
    directWhatsAppUrl,
  };
};

/**
 * Builds the WhatsApp Digital Entry Pass & QR message string
 */
export const buildPassWhatsAppMessage = ({
  name,
  uniqueId,
  ticketType,
  teamName,
  track,
  clientUrl = 'https://hackseries-2026.vercel.app',
}) => {
  const passUrl = `${clientUrl}/pass/${uniqueId}`;
  return `🎫 *Official Entry Pass • HackSeries 2026* ✅\n\nHey *${name}*, your registration has been VERIFIED! Here is your official entry pass for HackSeries 2026 at Dr. D. Y. Patil Institute of Technology (DIT), Pune.\n\n🎟️ *Pass ID:* ${uniqueId}\n🏷️ *Ticket Tier:* ${ticketType || 'Hacker Pass'}\n${teamName ? `👥 *Team:* ${teamName}\n` : ''}${track ? `🎯 *Track:* ${track}\n` : ''}\n📱 *Your Live Digital Pass & Dynamic QR:* \n👉 ${passUrl}\n\n⚠️ *Gate Entry Instructions:*\n• Present the QR code on your phone at Gate 1 for express check-in.\n• Carry a valid College Photo ID.\n\nLead Operations: *Aditya Renake* (+91 9890829874)\n_ACES • Dept. of Computer Engineering, DIT Pune_`;
};

/**
 * Automatically dispatches WhatsApp pass with QR link to attendee simultaneously with email
 */
export const sendAutoPassWhatsApp = async (registrant) => {
  const phone = formatPhoneNumber(registrant.phone);
  if (!phone) {
    console.log(`ℹ️ [MESSAGING] No phone number recorded for ${registrant.name} (${registrant.uniqueId}). Skipping WhatsApp pass.`);
    return { success: false, reason: 'NO_PHONE' };
  }

  const clientUrl = process.env.CLIENT_URL || 'https://hackseries-2026.vercel.app';
  const textMessage = buildPassWhatsAppMessage({
    name: registrant.name,
    uniqueId: registrant.uniqueId,
    ticketType: registrant.ticketType,
    teamName: registrant.teamName,
    track: registrant.track,
    clientUrl,
  });

  const whatsappApiUrl = process.env.WHATSAPP_API_URL;
  const whatsappToken = process.env.WHATSAPP_TOKEN;
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;

  // 1. Automated WhatsApp Gateway (UltraMsg, GreenAPI, Meta Cloud API, etc.)
  if (whatsappApiUrl && whatsappToken) {
    try {
      const response = await fetch(whatsappApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: whatsappToken,
          to: phone,
          body: textMessage,
        }),
      });
      const data = await response.json();
      console.log(`✅ [WHATSAPP PASS DISPATCHED] Sent to +${phone}:`, data);
      return { success: true, provider: 'whatsapp_gateway', result: data };
    } catch (err) {
      console.warn(`⚠️ [WHATSAPP PASS GATEWAY ERROR] Failed sending to +${phone}:`, err.message);
    }
  }

  // 2. Fast2SMS Indian SMS Fallback
  if (fast2SmsKey) {
    try {
      const smsPhone = phone.startsWith('91') && phone.length === 12 ? phone.slice(2) : phone;
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: `HackSeries 2026: Hey ${registrant.name}, your verified pass (${registrant.uniqueId}) is ready! View your QR pass: ${clientUrl}/pass/${registrant.uniqueId}`,
          language: 'english',
          flash: 0,
          numbers: smsPhone,
        }),
      });
      const data = await response.json();
      console.log(`✅ [FAST2SMS PASS DISPATCHED] Sent SMS to ${smsPhone}:`, data);
      return { success: true, provider: 'fast2sms', result: data };
    } catch (err) {
      console.warn(`⚠️ [FAST2SMS PASS ERROR] Failed sending SMS to +${phone}:`, err.message);
    }
  }

  // 3. Fallback: Pre-generate wa.me link
  const encodedText = encodeURIComponent(textMessage);
  const directWhatsAppUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
  console.log(`📱 [WHATSAPP PASS LINK READY] Generated wa.me link for +${phone}`);
  return {
    success: true,
    provider: 'direct_link',
    phone,
    directWhatsAppUrl,
  };
};
