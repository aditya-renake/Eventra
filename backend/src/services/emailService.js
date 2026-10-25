import nodemailer from 'nodemailer';
import { generateQRCodeBuffer } from './qrService.js';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

export const getTransporter = async () => {
  if (transporter) return transporter;

  let resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  let sendgridApiKey = (process.env.SENDGRID_API_KEY || '').trim();
  let customHost = (process.env.SMTP_HOST || '').trim();
  let user = (process.env.SMTP_USER || 'tigeradi1504@gmail.com').trim();
  let pass = (process.env.SMTP_PASS || '').trim();

  try {
    const { configRepo } = await import('../models/configRepo.js');
    const cfg = await configRepo.getConfig();
    if (cfg?.smtpUser) user = cfg.smtpUser.trim();
    if (cfg?.smtpPass) pass = cfg.smtpPass.trim();
    if (cfg?.smtpHost) customHost = cfg.smtpHost.trim();
    if (cfg?.resendApiKey) resendApiKey = cfg.resendApiKey.trim();
  } catch (e) {}

  if (resendApiKey || pass.startsWith('re_') || customHost.includes('resend.com') || user.toLowerCase() === 'resend') {
    const activeResendKey = resendApiKey || pass;
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: activeResendKey,
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
    });
    return transporter;
  }

  if (sendgridApiKey || pass.startsWith('SG.') || customHost.includes('sendgrid.net') || user.toLowerCase() === 'apikey') {
    const activeSendgridKey = sendgridApiKey || pass;
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: activeSendgridKey,
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
    });
    return transporter;
  }

  const isOutlook =
    user.includes('@outlook.') ||
    user.includes('@hotmail.') ||
    user.includes('@live.') ||
    customHost.includes('outlook') ||
    customHost.includes('office365');
  const isGmail = !isOutlook && (user.includes('@gmail.com') || customHost.includes('gmail'));

  // Microsoft OAuth2 Support if Azure credentials are provided
  const msClientId = process.env.MICROSOFT_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID || '';
  const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET || '';
  const msRefreshToken = process.env.MICROSOFT_REFRESH_TOKEN || process.env.OUTLOOK_REFRESH_TOKEN || '';

  if (isOutlook && msClientId && msRefreshToken) {
    transporter = nodemailer.createTransport({
      host: customHost || 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        type: 'OAuth2',
        user,
        clientId: msClientId,
        clientSecret: msClientSecret,
        refreshToken: msRefreshToken,
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3',
      },
      connectionTimeout: 15000,
    });
    return transporter;
  }

  if (pass && pass !== '') {
    let host = customHost;
    if (!host) {
      if (isOutlook) host = 'smtp-mail.outlook.com';
      else if (isGmail) host = 'smtp.gmail.com';
      else host = 'smtp.gmail.com';
    }

    // Outlook strictly uses port 587 with STARTTLS (not port 465 SSL)
    let port = isOutlook
      ? (process.env.SMTP_PORT && process.env.SMTP_PORT !== '465' ? parseInt(process.env.SMTP_PORT, 10) : 587)
      : parseInt(process.env.SMTP_PORT || (isGmail ? '465' : '587'), 10);
    let secure = isOutlook ? false : port === 465;

    const transportConfig = {
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
        ...(isOutlook ? { ciphers: 'SSLv3' } : {}),
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    };

    if (isGmail) {
      transportConfig.service = 'gmail';
    }

    transporter = nodemailer.createTransport(transportConfig);
    return transporter;
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (err) {
    transporter = {
      sendMail: async (mailOptions) => {
        console.log(`📨 [SIMULATED EMAIL] From: ${mailOptions.from} | To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
        return { messageId: 'eventra-simulated-' + Date.now(), simulated: true };
      },
    };
  }

  return transporter;
};

/**
 * Builds the Eventra Pass Email Template with dynamic event metadata
 */
export const buildPassEmailHtml = ({
  attendeeName,
  ticketType,
  uniqueId,
  teamName,
  track,
  eventName = 'Eventra 2026',
  eventDate = 'Dates TBA',
  eventTime = 'Schedule TBA',
  eventVenue = 'Campus Venue',
  organizerName = 'Eventra Operations',
  organizerEmail = '',
  organizerPhone = '',
  passUrl,
  notice,
}) => {
  const badgeColor =
    ticketType === 'VIP Pass' || ticketType === 'VIP Delegate'
      ? '#f59e0b'
      : ticketType === 'Mentor / Judge' || ticketType === 'Judge / Mentor'
      ? '#ec4899'
      : ticketType === 'Team Lead Pass'
      ? '#06b6d4'
      : '#6366f1';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Pass for ${eventName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #030712;
      color: #f3f4f6;
    }
    .wrapper {
      max-width: 600px;
      margin: 20px auto;
      background: #0b0f19;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #1f293d;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .header {
      background: linear-gradient(135deg, #312e81 0%, #4338ca 50%, #596ee6 100%);
      padding: 36px 30px;
      text-align: center;
    }
    .header .college-sub {
      margin: 0 0 6px 0;
      font-size: 11px;
      font-weight: 800;
      color: #c7d2fe;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 13px;
      color: #e0e7ff;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .subtext {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .ticket-card {
      background: #111827;
      border-radius: 16px;
      border: 1px solid rgba(89, 110, 230, 0.35);
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
    }
    .ticket-badge {
      display: inline-block;
      padding: 6px 18px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      background: ${badgeColor}22;
      color: ${badgeColor};
      border: 1px solid ${badgeColor}66;
      margin-bottom: 14px;
    }
    .attendee-name {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 4px 0;
    }
    .ticket-id {
      font-family: monospace;
      font-size: 13px;
      color: #a5b4fc;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 20px;
    }
    .qr-container {
      background: #ffffff;
      padding: 16px;
      border-radius: 14px;
      display: inline-block;
      margin: 0 auto 16px auto;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .qr-image {
      width: 220px;
      height: 220px;
      display: block;
    }
    .security-notice {
      font-size: 12px;
      color: #22c55e;
      font-weight: 700;
      display: block;
      margin-bottom: 16px;
      letter-spacing: 0.5px;
    }
    .meta-box {
      background: #030712;
      border-radius: 12px;
      border: 1px solid #1f2937;
      padding: 16px;
      text-align: left;
      margin-top: 16px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
    }
    .meta-val {
      color: #f1f5f9;
      font-weight: 600;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0 20px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #596ee6 0%, #4338ca 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 800;
      font-size: 15px;
      padding: 14px 32px;
      border-radius: 12px;
      letter-spacing: 0.5px;
    }
    .footer {
      background: #030712;
      padding: 24px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #1f2937;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div style="text-align: center; margin-bottom: 12px;">
        <img src="https://eventra-2026.vercel.app/eventra-logo.png" alt="Eventra" style="height: 38px; width: auto; background: rgba(255, 255, 255, 0.95); padding: 5px 14px; border-radius: 8px; display: inline-block;" />
      </div>
      <div class="college-sub">⚡ OFFICIAL ENTRY PASS • ZERO-TAMPER QR ACCESS</div>
      <h1>⚡ ${eventName}</h1>
      <p>${organizerName ? `Presented by ${organizerName}` : 'Official Campus Event Pass'}</p>
    </div>
    <div class="content">
      <div class="greeting">Hey ${attendeeName}! 🚀</div>
      <p class="subtext">
        Your spot for <strong>${eventName}</strong> at <strong>${eventVenue}</strong> is confirmed! Present the verified QR code below at the check-in gates for express entry.
      </p>

      <div class="ticket-card">
        <div class="ticket-badge">${ticketType}</div>
        <div class="attendee-name">${attendeeName}</div>
        <div class="ticket-id">PASS ID: ${uniqueId}</div>

        <div class="qr-container">
          <img src="cid:hackpassqr" alt="Eventra Entry QR" class="qr-image" />
        </div>

        <div class="security-notice">
          🛡️ Cryptographically Signed Pass • Zero-Tamper Verified
        </div>

        <div class="meta-box">
          <div class="meta-row">
            <span class="meta-label">📅 Date & Time:</span>
            <span class="meta-val">${eventDate} • ${eventTime}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">📍 Venue:</span>
            <span class="meta-val">${eventVenue}</span>
          </div>
          ${
            teamName
              ? `<div class="meta-row">
            <span class="meta-label">👥 Team:</span>
            <span class="meta-val">${teamName}</span>
          </div>`
              : ''
          }
          ${
            track
              ? `<div class="meta-row">
            <span class="meta-label">🎯 Track / Category:</span>
            <span class="meta-val">${track}</span>
          </div>`
              : ''
          }
          ${
            organizerEmail || organizerPhone
              ? `<div class="meta-row">
            <span class="meta-label">📞 Contact POC:</span>
            <span class="meta-val">${[organizerEmail, organizerPhone].filter(Boolean).join(' • ')}</span>
          </div>`
              : ''
          }
        </div>
      </div>

      <div class="btn-container">
        <a href="${passUrl}" class="btn" target="_blank">
          📱 Open Mobile Pass & Offline Wallet
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
        ${notice || 'Tip: Save this pass to your phone or take a screenshot for ultra-fast check-in upon arrival.'}
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">Powered by <strong>Eventra Platform</strong> • High-Security Gate Verification</p>
      <p style="margin: 0;">Organizer: <strong>${organizerName || 'Eventra Operations'}</strong></p>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Sends a single pass email to a registrant
 */
export const sendPassEmail = async (registrant, eventConfig = {}) => {
  const mailTransporter = await getTransporter();

  const eventName = eventConfig.eventName || 'Eventra 2026';
  const eventDate = eventConfig.eventDate || 'Dates TBA';
  const eventTime = eventConfig.eventTime || 'Schedule TBA';
  const eventVenue = eventConfig.eventVenue || 'Campus Venue';
  const organizerName = eventConfig.clubName || eventConfig.organizerName || 'Eventra Operations';
  const organizerEmail = eventConfig.organizerEmail || '';
  const organizerPhone = eventConfig.organizerPhone || '';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const passUrl = `${clientUrl}/pass/${registrant.uniqueId}`;
  const senderEmail = process.env.SMTP_USER || 'tigeradi1504@gmail.com';

  const qrBuffer = await generateQRCodeBuffer(registrant.qrPayload);

  const html = buildPassEmailHtml({
    attendeeName: registrant.name,
    ticketType: registrant.ticketType,
    uniqueId: registrant.uniqueId,
    teamName: registrant.teamName,
    track: registrant.track,
    eventName,
    eventDate,
    eventTime,
    eventVenue,
    organizerName,
    organizerEmail,
    organizerPhone,
    passUrl,
    notice: eventConfig.emailBodyNotice,
  });

  const subject = (eventConfig.emailSubjectTemplate || '🎟️ Your Official Entry Pass for {{eventName}} — {{name}}')
    .replace(/\{\{eventName\}\}/g, eventName)
    .replace(/Eventra 2026/g, eventName)
    .replace(/\{\{name\}\}/g, registrant.name);

  const fromAddress = process.env.EMAIL_FROM || `"${eventName}" <${senderEmail}>`;

  const mailOptions = {
    from: fromAddress,
    to: registrant.email,
    replyTo: organizerEmail || process.env.REPLY_TO || senderEmail,
    subject: subject,
    html: html,
    attachments: [
      {
        filename: `eventra-pass-${registrant.uniqueId}.png`,
        content: qrBuffer,
        cid: 'hackpassqr',
      },
    ],
  };

  const info = await mailTransporter.sendMail(mailOptions);
  let previewUrl = null;

  if (nodemailer.getTestMessageUrl) {
    previewUrl = nodemailer.getTestMessageUrl(info);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl: previewUrl,
    passUrl: passUrl,
    recipient: registrant.email,
  };
};

/**
 * Bulk send pass emails with batching
 */
export const sendBulkPassEmails = async (registrants, eventConfig, onProgress) => {
  const results = {
    total: registrants.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  const BATCH_SIZE = 5;
  for (let i = 0; i < registrants.length; i += BATCH_SIZE) {
    const batch = registrants.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (reg) => {
        try {
          await sendPassEmail(reg, eventConfig);
          reg.emailSent = true;
          reg.emailSentAt = new Date().toISOString();
          reg.emailSendCount = (reg.emailSendCount || 0) + 1;
          if (typeof reg.save === 'function') {
            await reg.save();
          }
          results.sent++;
        } catch (err) {
          results.failed++;
          results.errors.push({ id: reg._id || reg.uniqueId, email: reg.email, error: err.message });
        }
      })
    );

    if (onProgress) {
      onProgress(results.sent + results.failed, results.total);
    }

    if (i + BATCH_SIZE < registrants.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
};

/**
 * Builds the instant Gate Check-In Confirmation Email HTML
 */
export const buildCheckinConfirmationEmailHtml = ({
  attendeeName,
  uniqueId,
  ticketType,
  teamName,
  track,
  checkedInAt,
  hasLivePhoto = false,
  eventName = 'Eventra 2026',
  eventVenue = 'Campus Venue',
  organizerName = 'Eventra Operations',
  organizerEmail = 'tigeradi1504@gmail.com',
  clientUrl = 'http://localhost:5173',
}) => {
  const passUrl = `${clientUrl}/pass/${uniqueId}`;
  const formattedTime = checkedInAt
    ? new Date(checkedInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST'
    : 'Just now';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${eventName} — You are Checked In!</title>
  <style>
    body { margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb; }
    .email-container { max-width: 600px; margin: 20px auto; background-color: #0b0f19; border: 1px solid #1f293d; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
    .header { background: linear-gradient(135deg, #052e16 0%, #022c22 50%, #030712 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #22c55e; }
    .tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); margin-bottom: 12px; }
    .h1 { font-size: 26px; font-weight: 900; color: #ffffff; margin: 0 0 8px 0; letter-spacing: -0.5px; }
    .subtitle { font-size: 14px; color: #9ca3af; margin: 0; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .card { background: #0e1424; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .btn { display: block; width: fit-content; margin: 24px auto 0 auto; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 14px; text-align: center; }
    .footer { background-color: #060913; padding: 24px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #1f293d; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div style="text-align: center; margin-bottom: 12px;">
        <img src="https://eventra-2026.vercel.app/eventra-logo.png" alt="Eventra" style="height: 36px; width: auto; background: rgba(255, 255, 255, 0.95); padding: 4px 12px; border-radius: 8px; display: inline-block;" />
      </div>
      <div class="tag">GATE ACCESS VERIFIED ✅</div>
      <h1 class="h1">You Are Checked In!</h1>
      <p class="subtitle">Welcome to ${eventName}</p>
    </div>

    <div class="content">
      <div class="greeting">Hey ${attendeeName}, welcome to the event! 🚀</div>
      <p style="font-size: 14px; line-height: 1.5; color: #9ca3af; margin: 0 0 16px 0;">
        Your digital entry pass has been scanned and verified at the gate entrance for <strong>${eventName}</strong>.
      </p>

      ${hasLivePhoto ? `
      <div style="background: #0e1424; border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
        <div style="font-size: 11px; font-weight: 800; color: #4ade80; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
          📷 VERIFIED GATE ENTRY SNAPSHOT
        </div>
        <img src="cid:gatephoto" alt="Gate Check-In Snapshot" style="max-width: 280px; width: 100%; height: auto; border-radius: 10px; border: 2px solid #22c55e; display: block; margin: 0 auto;" />
        <div style="font-size: 11px; color: #9ca3af; margin-top: 10px;">
          Verified live on-site at ${eventVenue}
        </div>
      </div>
      ` : ''}

      <div class="card">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #9ca3af; font-size: 13px;">Pass ID:</td>
            <td style="padding: 6px 0; color: #f7d070; font-family: monospace; font-size: 14px; font-weight: 800; text-align: right;">${uniqueId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #9ca3af; font-size: 13px;">Check-In Time:</td>
            <td style="padding: 6px 0; color: #4ade80; font-size: 13px; font-weight: 700; text-align: right;">${formattedTime}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #9ca3af; font-size: 13px;">Pass Tier:</td>
            <td style="padding: 6px 0; color: #ffffff; font-size: 13px; font-weight: 700; text-align: right;">${ticketType}</td>
          </tr>
          ${teamName ? `
          <tr>
            <td style="padding: 6px 0; color: #9ca3af; font-size: 13px;">Team Name:</td>
            <td style="padding: 6px 0; color: #22d3ee; font-size: 13px; font-weight: 700; text-align: right;">${teamName}</td>
          </tr>
          ` : ''}
          ${track ? `
          <tr>
            <td style="padding: 6px 0; color: #9ca3af; font-size: 13px;">Track / Category:</td>
            <td style="padding: 6px 0; color: #f7d070; font-size: 13px; font-weight: 700; text-align: right;">${track}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 6px 0; color: #9ca3af; font-size: 13px;">Venue:</td>
            <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: 600; text-align: right;">${eventVenue}</td>
          </tr>
        </table>
      </div>

      <a href="${passUrl}" class="btn" target="_blank">
        🎟️ View Your Live Digital Pass
      </a>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 700; color: #9ca3af;">${eventName} • ${organizerName}</p>
      <p style="margin: 0;">Contact: <a href="mailto:${organizerEmail}" style="color: #f7d070; text-decoration: none;">${organizerEmail}</a></p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Sends check-in confirmation email automatically upon gate QR scan
 */
export const sendCheckinConfirmationEmail = async (registrant, eventConfig = {}) => {
  try {
    const mailTransporter = await getTransporter();

    const eventName = eventConfig.eventName || 'Eventra 2026';
    const eventVenue = eventConfig.eventVenue || 'Campus Venue';
    const organizerName = eventConfig.clubName || eventConfig.organizerName || 'Eventra Operations';
    const organizerEmail = eventConfig.organizerEmail || 'tigeradi1504@gmail.com';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const senderEmail = process.env.SMTP_USER || 'tigeradi1504@gmail.com';

    const attachments = [];
    let hasLivePhoto = false;

    if (registrant.checkedInPhoto && typeof registrant.checkedInPhoto === 'string' && registrant.checkedInPhoto.startsWith('data:image')) {
      const base64Data = registrant.checkedInPhoto.split(';base64,').pop();
      attachments.push({
        filename: `gate-snapshot-${registrant.uniqueId}.jpg`,
        content: Buffer.from(base64Data, 'base64'),
        cid: 'gatephoto',
      });
      hasLivePhoto = true;
    }

    const html = buildCheckinConfirmationEmailHtml({
      attendeeName: registrant.name,
      uniqueId: registrant.uniqueId,
      ticketType: registrant.ticketType,
      teamName: registrant.teamName,
      track: registrant.track,
      institution: registrant.institution,
      checkedInAt: registrant.checkedInAt || new Date().toISOString(),
      checkedInBy: registrant.checkedInBy || 'Gate Staff',
      hasLivePhoto,
      eventName,
      eventVenue,
      organizerName,
      organizerEmail,
      clientUrl,
    });

    const subject = `🎉 Welcome to ${eventName}! You are Checked In ✅ [${registrant.uniqueId}]`;
    const fromAddress = process.env.EMAIL_FROM || `"${eventName}" <${senderEmail}>`;

    const mailOptions = {
      from: fromAddress,
      to: registrant.email,
      replyTo: organizerEmail || process.env.REPLY_TO || senderEmail,
      subject,
      html,
      attachments,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      recipient: registrant.email,
      hasLivePhoto,
    };
  } catch (err) {
    console.error(`❌ [CHECK-IN EMAIL ERROR] Failed sending checkin email to ${registrant?.email}:`, err.message);
    throw err;
  }
};

/**
 * Builds the "Registration Received • Details Under Verification" HTML email template
 */
export const buildRegistrationReceivedEmailHtml = ({
  attendeeName,
  uniqueId,
  ticketType = 'Standard Pass',
  teamName,
  track,
  institution,
  eventName = 'Eventra 2026',
  eventVenue = 'Campus Venue',
  organizerName = 'Eventra Operations',
  organizerEmail = 'tigeradi1504@gmail.com',
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Received — ${eventName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f9fafb;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #0b0f19; border: 1px solid rgba(89, 110, 230, 0.4); border-radius: 16px; overflow: hidden;">

    <div style="background: linear-gradient(135deg, #312e81 0%, #4338ca 50%, #596ee6 100%); padding: 32px 24px; text-align: center;">
      <div style="text-align: center; margin-bottom: 12px;">
        <img src="https://eventra-2026.vercel.app/eventra-logo.png" alt="Eventra" style="height: 36px; width: auto; background: rgba(255, 255, 255, 0.95); padding: 4px 12px; border-radius: 8px; display: inline-block;" />
      </div>
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.15em; color: #c7d2fe; text-transform: uppercase; margin-bottom: 6px;">
        ${organizerName}
      </div>
      <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
        ${eventName}
      </h1>
      <div style="display: inline-block; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(199, 210, 254, 0.6); padding: 5px 14px; border-radius: 9999px; margin-top: 12px; font-size: 12px; font-weight: 700; color: #e0e7ff;">
        ⚡ REGISTRATION APPLICATION RECEIVED
      </div>
    </div>

    <div style="padding: 32px 24px;">
      <p style="font-size: 18px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0;">
        Hello <span style="color: #a5b4fc;">${attendeeName}</span>,
      </p>

      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px 0;">
        Thank you for registering for <strong>${eventName}</strong> at <strong>${eventVenue}</strong>. We have received your registration details.
      </p>

      <div style="background-color: #060913; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #9ca3af; width: 40%;">Application Ref:</td>
            <td style="padding: 6px 0; color: #a5b4fc; font-weight: 800; font-family: monospace;">${uniqueId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #9ca3af;">Participant Name:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${attendeeName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #9ca3af;">Pass Category:</td>
            <td style="padding: 6px 0; color: #22d3ee; font-weight: 700;">${ticketType}</td>
          </tr>
          ${teamName ? `
          <tr>
            <td style="padding: 6px 0; color: #9ca3af;">Team Name:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${teamName}</td>
          </tr>` : ''}
          ${track ? `
          <tr>
            <td style="padding: 6px 0; color: #9ca3af;">Track:</td>
            <td style="padding: 6px 0; color: #4ade80; font-weight: 700;">${track}</td>
          </tr>` : ''}
          ${institution ? `
          <tr>
            <td style="padding: 6px 0; color: #9ca3af;">Institution:</td>
            <td style="padding: 6px 0; color: #ffffff;">${institution}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #9ca3af;">Event Venue:</td>
            <td style="padding: 6px 0; color: #ffffff;">${eventVenue}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin: 0; text-align: center;">
        For any queries, reach out to <a href="mailto:${organizerEmail}" style="color: #a5b4fc; text-decoration: none;">${organizerEmail}</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Sends instant registration received acknowledgement email
 */
export const sendRegistrationReceivedEmail = async (registrant, eventConfig = {}) => {
  try {
    const mailTransporter = await getTransporter();
    const eventName = eventConfig.eventName || 'Eventra 2026';
    const eventDate = eventConfig.eventDate || 'Dates TBA';
    const eventVenue = eventConfig.eventVenue || 'Campus Venue';
    const organizerName = eventConfig.clubName || eventConfig.organizerName || 'Eventra Operations';
    const organizerEmail = eventConfig.organizerEmail || 'tigeradi1504@gmail.com';
    const senderEmail = process.env.SMTP_USER || 'tigeradi1504@gmail.com';

    const html = buildRegistrationReceivedEmailHtml({
      attendeeName: registrant.name,
      uniqueId: registrant.uniqueId,
      ticketType: registrant.ticketType,
      teamName: registrant.teamName,
      track: registrant.track,
      institution: registrant.institution,
      eventName,
      eventDate,
      eventVenue,
      organizerName,
      organizerEmail,
    });

    const subject = `⏳ Registration Received for ${eventName} — Verification Pending [${registrant.uniqueId}]`;
    const fromAddress = process.env.EMAIL_FROM || `"${eventName}" <${senderEmail}>`;

    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to: registrant.email,
      replyTo: organizerEmail || process.env.REPLY_TO || senderEmail,
      subject,
      html,
    });

    return {
      success: true,
      messageId: info.messageId,
      recipient: registrant.email,
    };
  } catch (err) {
    console.warn(`⚠️ [REGISTRATION ACK EMAIL ERROR] Failed sending to ${registrant?.email}:`, err.message);
    return { success: false, error: err.message };
  }
};
