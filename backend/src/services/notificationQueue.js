import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore } from '../config/firebase.js';
import { createHash, randomUUID } from 'node:crypto';

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

export const notificationId = key => createHash('sha256').update(key).digest('hex');

// Call after all other transaction reads and before writing the business document.
export async function addNotificationJobs(db, tx, jobs) {
  if (!jobs.length) return 0;
  const unique = new Map(jobs.map(job => [notificationId(job.dedupe_key), job]));
  const refs = [...unique.keys()].map(id => db.collection('notification_jobs').doc(id));
  const existing = await tx.getAll(...refs);
  const stamp = new Date().toISOString();
  for (const doc of existing) {
    if (!doc.exists) tx.create(doc.ref, { ...unique.get(doc.id), id: doc.id, status: 'pending', attempts: 0,
      available_at: stamp, created_at: stamp, updated_at: stamp });
  }
  return existing.filter(doc => !doc.exists).length;
}

export async function enqueueNotifications(jobs, { client = getFirestore() } = {}) {
  let added = 0;
  for (let i = 0; i < jobs.length; i += 400) {
    added += await client.runTransaction(tx => addNotificationJobs(client, tx, jobs.slice(i, i + 400)));
  }
  return added;
}

async function claimJobs(db, worker, limit, attempts) {
  const jobs = db.collection('notification_jobs');
  const stamp = new Date().toISOString();
  // Re-read each candidate under lock before taking ownership.
  const candidates = await Promise.all(['pending', 'processing'].map(status =>
    jobs.where('status', '==', status).get()));
  const readyAt = job => job.status === 'pending' ? job.available_at : job.locked_until;
  const ready = candidates.flatMap(result => result.docs).filter(doc => readyAt(doc.data()) <= stamp)
    .sort((a, b) => readyAt(a.data()).localeCompare(readyAt(b.data())));
  const claimed = [];
  for (const candidate of ready) {
    const job = await db.runTransaction(async tx => {
      const current = (await tx.get(candidate.ref)).data();
      if (!current || !['pending','processing'].includes(current.status) || readyAt(current) > stamp) return null;
      if (current.attempts >= attempts) {
        tx.update(candidate.ref, { status: 'dead', locked_by: null, locked_until: null, updated_at: stamp });
        return null;
      }
      const lease = { status: 'processing', locked_by: worker, attempts: current.attempts + 1,
        locked_until: new Date(Date.now() + 120000).toISOString(), updated_at: stamp };
      tx.update(candidate.ref, lease);
      return { ...current, ...lease, id: candidate.id };
    });
    if (job) claimed.push(job);
    if (claimed.length >= limit) break;
  }
  return claimed;
}

function finishJob(db, job, worker, status, note, attempts) {
  const ref = db.collection('notification_jobs').doc(job.id);
  return db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data();
    const stamp = new Date().toISOString();
    if (current?.status !== 'processing' || current.locked_by !== worker || current.locked_until <= stamp) return false;
    const update = { status, last_error: note?.slice(0, 1000) || null, updated_at: stamp, locked_by: null, locked_until: null };
    if (status === 'pending') {
      if (current.attempts >= attempts) update.status = 'dead';
      else update.available_at = new Date(Date.now() + Math.min(3600000, 30000 * 2 ** (current.attempts - 1))).toISOString();
    }
    if (status === 'sent') {
      update.sent_at = stamp;
      const reg = db.collection('registrants').doc(job.registrant_id);
      if (['pass_email','pass_whatsapp'].includes(job.kind) && (await tx.get(reg)).exists) {
        tx.update(reg, job.kind === 'pass_email' ? { emailSent: true, emailSentAt: stamp, emailSendCount: FieldValue.increment(1) }
          : { whatsappSent: true, whatsappSentAt: stamp });
      }
    }
    tx.update(ref, update);
    return true;
  });
}

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
  const queue = client || getFirestore();
  const send = deliver || (await import('./notificationDelivery.js')).deliverNotification;
  const parallel = bounded(concurrency, 2, 1, 10);
  const limit = bounded(maxJobs, 20, 1, 100);
  const attempts = bounded(maxAttempts, 6, 1, 20);
  const workerId = randomUUID();
  const started = now();
  const results = { claimed: 0, sent: 0, skipped: 0, failed: 0, leaseLost: 0 };
  do {
    if (shouldStop()) break;
    const jobs = await claimJobs(queue, workerId, Math.min(parallel, limit - results.claimed), attempts);
    if (!jobs?.length) break;
    results.claimed += jobs.length;
    await Promise.all(jobs.map(async (job) => {
      let delivery;
      try {
        delivery = await send(job);
        if (!delivery || (!delivery.success && !delivery.skipped)) throw new Error(delivery?.error || 'Provider did not accept notification');
      } catch (error) {
        results.failed++;
        const recorded = await finishJob(queue, job, workerId, 'pending', String(error.message || error), attempts);
        if (!recorded) results.leaseLost++;
        return;
      }
      // If acknowledgement fails, let the lease recover it. Never immediately
      // retry a provider send whose acceptance is already known.
      const outcome = delivery.skipped ? 'skipped' : 'sent';
      const completed = await finishJob(queue, job, workerId, outcome, delivery.reason, attempts);
      if (completed) results[outcome]++;
      else results.leaseLost++;
    }));
  } while (results.claimed < limit && now() - started < budgetMs);
  return results;
}

export async function notificationQueueStatus() {
  const jobs = getFirestore().collection('notification_jobs');
  const counts = {};
  await Promise.all(['pending','processing','sent','skipped','dead'].map(async status => {
    counts[status] = (await jobs.where('status', '==', status).count().get()).data().count;
  }));
  const pending = await jobs.where('status', '==', 'pending').select('created_at').get();
  const dead = await jobs.where('status', '==', 'dead').select('kind','registrant_id','attempts','last_error','updated_at').get();
  return { ...counts, oldestPendingAt: pending.docs.map(doc => doc.get('created_at')).sort()[0] || null,
    deadLetters: dead.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.updated_at.localeCompare(a.updated_at)).slice(0,50) };
}

export async function retryDeadNotification(id) {
  const db = getFirestore();
  const ref = db.collection('notification_jobs').doc(id);
  return db.runTransaction(async tx => {
    if ((await tx.get(ref)).get('status') !== 'dead') return false;
    tx.update(ref, { status: 'pending', attempts: 0, available_at: new Date().toISOString(), last_error: null });
    return true;
  });
}
