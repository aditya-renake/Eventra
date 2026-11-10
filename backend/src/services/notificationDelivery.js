/** HTTP delivery checks transport and provider errors; a WhatsApp link is not delivery. */
export async function sendQueuedMessage(registrant, context, kind, { fetchImpl = fetch, env = process.env, builders } = {}) {
  const { formatPhoneNumber, buildPassWhatsAppMessage, buildCheckinMessage } = builders || await import('./messagingService.js');
  const phone = formatPhoneNumber(registrant.phone);
  if (!phone) return { skipped: true, reason: 'NO_PHONE' };
  const configuredWhatsApp = env.WHATSAPP_API_URL && env.WHATSAPP_TOKEN;
  if (!configuredWhatsApp && !env.FAST2SMS_API_KEY) return { skipped: true, reason: 'NO_MESSAGING_PROVIDER' };
  const text = (kind === 'checkin_whatsapp' ? buildCheckinMessage : buildPassWhatsAppMessage)({
    ...registrant, ...context,
    eventName: context.eventName, eventVenue: context.eventVenue,
    organizerName: context.clubName || context.organizerName,
    clientUrl: env.CLIENT_URL || 'http://localhost:5173',
  });
  const url = configuredWhatsApp ? env.WHATSAPP_API_URL : 'https://www.fast2sms.com/dev/bulkV2';
  const body = configuredWhatsApp ? { token: env.WHATSAPP_TOKEN, to: phone, body: text } : {
    route: 'q', message: text, language: 'english', flash: 0,
    numbers: phone.startsWith('91') && phone.length === 12 ? phone.slice(2) : phone,
  };
  const response = await fetchImpl(url, {
    method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', ...(configuredWhatsApp ? {} : { authorization: env.FAST2SMS_API_KEY }) },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Messaging provider HTTP ${response.status}`);
  const result = await response.json();
  if (result.success === false || result.return === false || result.error || ['failed', 'error'].includes(String(result.status).toLowerCase())) {
    throw new Error('Messaging provider rejected notification');
  }
  return { success: true };
}

export async function deliverNotification(job, dependencies = {}) {
  const repo = dependencies.repo || (await import('../models/registrantRepo.js')).registrantRepo;
  const resolveContext = dependencies.resolveContext || (await import('../controllers/registrantController.js')).resolveEventContext;
  const registrant = await repo.findByUniqueId(job.registrant_id);
  if (!registrant) return { skipped: true, reason: 'REGISTRANT_REMOVED' };
  if (job.kind.startsWith('pass_') && registrant.verified !== true && String(registrant.verificationStatus).toLowerCase() !== 'verified') {
    return { skipped: true, reason: 'REGISTRATION_NOT_VERIFIED' };
  }
  let attendee = registrant;
  if (job.kind.startsWith('checkin_')) {
    const entry = registrant.checkinDays?.[`day_${job.payload?.eventDay || 1}`];
    if (!entry) return { skipped: true, reason: 'CHECKIN_REVERTED' };
    attendee = { ...registrant, ...entry };
  }
  const context = await resolveContext(registrant.eventId);
  if (job.kind.endsWith('_whatsapp')) return (dependencies.messageSender || sendQueuedMessage)(attendee, context, job.kind);
  const emails = dependencies.emails || await import('./emailService.js');
  const handler = { pass_email: emails.sendPassEmail, registration_email: emails.sendRegistrationReceivedEmail, checkin_email: emails.sendCheckinConfirmationEmail }[job.kind];
  if (!handler) throw new Error(`Unsupported notification kind: ${job.kind}`);
  const result = await handler(attendee, context);
  if (!result?.success) throw new Error(result?.error || 'Email provider did not accept notification');
  return result;
}
