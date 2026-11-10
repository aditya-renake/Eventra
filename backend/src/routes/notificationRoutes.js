import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { runNotificationBatch, notificationQueueStatus, retryDeadNotification } from '../services/notificationQueue.js';

export function requireWorkerSecret(req, res, next) {
  const expected = process.env.NOTIFICATION_WORKER_SECRET || process.env.CRON_SECRET;
  const provided = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected) return res.status(503).json({ success: false, message: 'Notification worker secret is not configured.' });
  const a = Buffer.from(provided), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ success: false, message: 'Unauthorized' });
  res.setHeader('Cache-Control', 'private, no-store');
  next();
}

const router = Router();
router.use(requireWorkerSecret);
router.all('/run', async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return res.sendStatus(405);
  try { res.json({ success: true, results: await runNotificationBatch() }); }
  catch (error) { console.error('Notification worker failed:', error.message); res.status(503).json({ success: false, message: 'Notification worker failed; jobs remain available for retry.' }); }
});
router.get('/status', async (req, res) => {
  try { res.json({ success: true, data: await notificationQueueStatus() }); }
  catch (error) { res.status(503).json({ success: false, message: error.message }); }
});
router.post('/retry/:id', async (req, res) => {
  if (!/^[0-9a-f]{64}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid job ID.' });
  try {
    const retried = await retryDeadNotification(req.params.id);
    res.status(retried ? 202 : 404).json({ success: retried, queued: retried });
  } catch (error) { res.status(503).json({ success: false, message: error.message }); }
});
export default router;
