import 'dotenv/config';
import { setTimeout as sleep } from 'node:timers/promises';
import { runNotificationBatch } from '../services/notificationQueue.js';

let stopping = false;
const controller = new AbortController();
const stop = () => { stopping = true; controller.abort(); };
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
const once = process.argv.includes('--once');
do {
  try {
    const results = await runNotificationBatch({ budgetMs: 25000, shouldStop: () => stopping });
    console.log(JSON.stringify({ event: 'notification_batch', ...results }));
  } catch (error) {
    console.error(JSON.stringify({ event: 'notification_worker_error', message: error.message }));
    if (once) process.exitCode = 1;
  }
  if (!once && !stopping) await sleep(5000, undefined, { signal: controller.signal }).catch(() => {});
} while (!once && !stopping);
