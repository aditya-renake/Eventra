import { randomUUID } from 'node:crypto';

const KINDS = new Set(['pass_email', 'pass_whatsapp', 'registration_email', 'checkin_email', 'checkin_whatsapp']);
const bounded = (value, fallback, min, max) => Math.min(max, Math.max(min, Number(value) || fallback));

/** Small jobs contain identifiers, never QR images, photos or SMTP credentials. */
export function notificationJobs(registrantId, { type = 'pass', key = registrantId, eventDay } = {}) {
  const kinds = type === 'registration' ? ['registration_email'] : [`${type}_email`, `${type}_whatsapp`];
  return kinds.map((kind) => {
    if (!KINDS.has(kind)) throw new Error('Invalid notification kind');
    return { dedupe_key: `${key}:${kind}`, kind, registrant_id: registrantId, payload: eventDay ? { eventDay } : {} };
  });
}

export async function getQueueClient() {
  const { getSupabase } = await import('../config/supabase.js');
  const client = getSupabase();
  if (!client) throw Object.assign(new Error('Durable notifications require Supabase and the notification queue migration.'), { status: 503 });
  return client;
}

async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw Object.assign(new Error(`Notification queue ${name} failed: ${error.message}`), { status: 503 });
  return data;
}

export async function enqueueNotifications(jobs, { client } = {}) {
  if (!jobs.length) return 0;
  return rpc(client || await getQueueClient(), 'enqueue_notification_jobs', { p_notifications: jobs });
}

/**
 * Claims only one concurrency-sized batch at a time. Database leases recover work
 * after process termination; SKIP LOCKED allows multiple independent workers.
 * Delivery is at-least-once: a crash after provider acceptance and before the
 * acknowledgement can produce a duplicate email. We never claim exactly-once SMTP.
 */
export async function runNotificationBatch({
  client,
  deliver,
  concurrency = process.env.NOTIFICATION_CONCURRENCY,
  maxJobs = process.env.NOTIFICATION_BATCH_SIZE,
  maxAttempts = process.env.NOTIFICATION_MAX_ATTEMPTS,
  budgetMs = 25000,
  shouldStop = () => false,
  now = Date.now,
} = {}) {
  const queue = client || await getQueueClient();
  const send = deliver || (await import('./notificationDelivery.js')).deliverNotification;
  const parallel = bounded(concurrency, 2, 1, 10);
  const limit = bounded(maxJobs, 20, 1, 100);
  const attempts = bounded(maxAttempts, 6, 1, 20);
  const workerId = randomUUID();
  const started = now();
  const results = { claimed: 0, sent: 0, skipped: 0, failed: 0, leaseLost: 0 };
  do {
    if (shouldStop()) break;
    const jobs = await rpc(queue, 'claim_notification_jobs', {
      p_worker_id: workerId, p_limit: Math.min(parallel, limit - results.claimed), p_lease_seconds: 120, p_max_attempts: attempts,
    });
    if (!jobs?.length) break;
    results.claimed += jobs.length;
    await Promise.all(jobs.map(async (job) => {
      let delivery;
      try {
        delivery = await send(job);
        if (!delivery || (!delivery.success && !delivery.skipped)) throw new Error(delivery?.error || 'Provider did not accept notification');
      } catch (error) {
        results.failed++;
        const recorded = await rpc(queue, 'fail_notification_job', {
          p_id: job.id, p_worker_id: workerId, p_error: String(error.message || error), p_max_attempts: attempts,
        });
        if (!recorded) results.leaseLost++;
        return;
      }
      // If acknowledgement fails, let the lease recover it. Never immediately
      // retry a provider send whose acceptance is already known.
      const outcome = delivery.skipped ? 'skipped' : 'sent';
      const completed = await rpc(queue, 'complete_notification_job', {
        p_id: job.id, p_worker_id: workerId, p_outcome: outcome, p_note: delivery.reason || null,
      });
      if (completed) results[outcome]++;
      else results.leaseLost++;
    }));
  } while (results.claimed < limit && now() - started < budgetMs);
  return results;
}

export async function notificationQueueStatus() {
  const client = await getQueueClient();
  const counts = await rpc(client, 'notification_queue_stats', {});
  const { data: dead, error } = await client.from('notification_jobs')
    .select('id,kind,registrant_id,attempts,last_error,updated_at').eq('status', 'dead').order('updated_at', { ascending: false }).limit(50);
  if (error) throw error;
  return { ...counts, deadLetters: dead };
}

export async function retryDeadNotification(id) {
  const client = await getQueueClient();
  const { data, error } = await client.from('notification_jobs').update({
    status: 'pending', attempts: 0, available_at: new Date().toISOString(), locked_by: null, locked_until: null, last_error: null,
  }).eq('id', id).eq('status', 'dead').select('id');
  if (error) throw error;
  return Boolean(data?.length);
}
