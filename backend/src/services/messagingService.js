import dotenv from 'dotenv';

dotenv.config();

/**
 * Normalizes an Indian or international phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
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
  eventName = 'Eventra 2026',
  eventVenue = 'Campus Venue',
  organizerName = 'Eventra Operations',
  organizerPhone = '',
  clientUrl = 'http://localhost:5173',
}) => {
  const formattedTime = checkedInAt
    ? new Date(checkedInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST'
    : 'Just now';

  const passUrl = `${clientUrl}/pass/${uniqueId}`;

  return `🎉 *Welcome to ${eventName}!* ✅\n\nHey *${name}*, your gate entry pass has been verified at *${eventVenue}*!\n\n🎫 *Pass ID:* ${uniqueId}\n🎟️ *Tier:* ${ticketType || 'Standard Pass'}\n${teamName ? `👥 *Team:* ${teamName}\n` : ''}${track ? `🎯 *Track:* ${track}\n` : ''}🕒 *Time:* ${formattedTime}\n\n🎟️ *Live Pass & Schedule:* ${passUrl}\n\nOrganizer: *${organizerName}*${organizerPhone ? ` (${organizerPhone})` : ''}\n_Powered by Eventra Platform_`;
};

/**
 * Automatically dispatches WhatsApp / SMS message via configured Gateway
 */
export const sendAutoCheckinMessage = async (registrant, eventCtx = {}) => {
  const phone = formatPhoneNumber(registrant.phone);
  if (!phone) {
    return { success: false, reason: 'NO_PHONE' };
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const eventName = eventCtx.eventName || 'Eventra 2026';
  const eventVenue = eventCtx.eventVenue || 'Campus Venue';
  const organizerName = eventCtx.clubName || eventCtx.organizerName || 'Eventra Operations';
  const organizerPhone = eventCtx.organizerPhone || '';

  const textMessage = buildCheckinMessage({
    name: registrant.name,
    uniqueId: registrant.uniqueId,
    ticketType: registrant.ticketType,
    teamName: registrant.teamName,
    track: registrant.track,
    checkedInAt: registrant.checkedInAt,
    eventName,
    eventVenue,
    organizerName,
    organizerPhone,
    clientUrl,
  });

  const whatsappApiUrl = process.env.WHATSAPP_API_URL;
  const whatsappToken = process.env.WHATSAPP_TOKEN;
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;

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
      return { success: true, provider: 'whatsapp_gateway', result: data };
    } catch (err) {
      console.warn(`⚠️ [WHATSAPP GATEWAY ERROR] Failed sending to +${phone}:`, err.message);
    }
  }

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
          message: `Welcome to ${eventName}! Hey ${registrant.name}, your pass (${registrant.uniqueId}) is checked in at ${eventVenue}. View pass: ${clientUrl}/pass/${registrant.uniqueId}`,
          language: 'english',
          flash: 0,
          numbers: smsPhone,
        }),
      });
      const data = await response.json();
      return { success: true, provider: 'fast2sms', result: data };
    } catch (err) {
      console.warn(`⚠️ [FAST2SMS ERROR] Failed sending SMS to +${phone}:`, err.message);
    }
  }

  const encodedText = encodeURIComponent(textMessage);
  const directWhatsAppUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;

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
  eventName = 'Eventra 2026',
  eventDate = 'Dates TBA',
  eventTime = 'Schedule TBA',
  eventVenue = 'Campus Venue',
  organizerName = 'Eventra Operations',
  organizerPhone = '',
  clientUrl = 'https://eventra-2026.vercel.app',
}) => {
  const passUrl = `${clientUrl}/pass/${uniqueId}`;
  return `🎫 *Official Entry Pass • ${eventName}* ✅\n\nHey *${name}*, your registration has been VERIFIED! Here is your official entry pass for *${eventName}*.\n\n🎟️ *Pass ID:* ${uniqueId}\n🏷️ *Ticket Tier:* ${ticketType || 'Standard Pass'}\n${teamName ? `👥 *Team:* ${teamName}\n` : ''}${track ? `🎯 *Track:* ${track}\n` : ''}📅 *Date & Time:* ${eventDate} (${eventTime})\n🏛️ *Venue:* ${eventVenue}\n\n📱 *Your Live Digital Pass & Dynamic QR:* \n👉 ${passUrl}\n\n⚠️ *Gate Entry Instructions:*\n• Present the QR code on your phone at the entrance gate for express check-in.\n• Carry a valid College / Photo ID.\n\nOrganizer: *${organizerName}*${organizerPhone ? ` (${organizerPhone})` : ''}\n_Powered by Eventra Platform_`;
};

/**
 * Automatically dispatches WhatsApp pass with QR link to attendee simultaneously with email
 */
export const sendAutoPassWhatsApp = async (registrant, eventCtx = {}) => {
  const phone = formatPhoneNumber(registrant.phone);
  if (!phone) {
    return { success: false, reason: 'NO_PHONE' };
  }

  const clientUrl = process.env.CLIENT_URL || 'https://eventra-2026.vercel.app';
  const eventName = eventCtx.eventName || 'Eventra 2026';
  const eventDate = eventCtx.eventDate || 'Dates TBA';
  const eventTime = eventCtx.eventTime || 'Schedule TBA';
  const eventVenue = eventCtx.eventVenue || 'Campus Venue';
  const organizerName = eventCtx.clubName || eventCtx.organizerName || 'Eventra Operations';
  const organizerPhone = eventCtx.organizerPhone || '';

  const textMessage = buildPassWhatsAppMessage({
    name: registrant.name,
    uniqueId: registrant.uniqueId,
    ticketType: registrant.ticketType,
    teamName: registrant.teamName,
    track: registrant.track,
    eventName,
    eventDate,
    eventTime,
    eventVenue,
    organizerName,
    organizerPhone,
    clientUrl,
  });

  const whatsappApiUrl = process.env.WHATSAPP_API_URL;
  const whatsappToken = process.env.WHATSAPP_TOKEN;
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;

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
      return { success: true, provider: 'whatsapp_gateway', result: data };
    } catch (err) {
      console.warn(`⚠️ [WHATSAPP PASS GATEWAY ERROR] Failed sending to +${phone}:`, err.message);
    }
  }

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
          message: `${eventName}: Hey ${registrant.name}, your verified pass (${registrant.uniqueId}) is ready! View your QR pass: ${clientUrl}/pass/${registrant.uniqueId}`,
          language: 'english',
          flash: 0,
          numbers: smsPhone,
        }),
      });
      const data = await response.json();
      return { success: true, provider: 'fast2sms', result: data };
    } catch (err) {
      console.warn(`⚠️ [FAST2SMS PASS ERROR] Failed sending SMS to +${phone}:`, err.message);
    }
  }

  const encodedText = encodeURIComponent(textMessage);
  const directWhatsAppUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
  return {
    success: true,
    provider: 'direct_link',
    phone,
    directWhatsAppUrl,
  };
};
