import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getFirestore } from '../backend/src/config/firebase.js';
import { registrantRepo as repo } from '../backend/src/models/registrantRepo.js';
import { consumeFirestoreLimits } from '../backend/src/middleware/rateLimit.js';
import { holdSeat } from '../backend/src/services/seatService.js';
import { notificationJobs, runNotificationBatch } from '../backend/src/services/notificationQueue.js';
import { userRepo } from '../backend/src/models/userRepo.js';

const emulatorTest = process.env.FIRESTORE_EMULATOR_HOST ? test : test.skip;

emulatorTest('Firestore registration, seat holds, daily scans, outbox and rate limits', async () => {
  const db = getFirestore();
  const eventId = randomUUID();
  const id = eventId.toUpperCase();
  await db.collection('club_events').doc(eventId).set({ totalCapacity: 1 });
  await holdSeat(eventId, id);
  await assert.rejects(holdSeat(eventId, id + '_2'), { code: 'EVENT_FULL' });
  const item = { eventId, uniqueId: id, email: id + '@example.org', orderId: id, verified: true };
  await repo.create(item, { notifications: notificationJobs(id, { type: 'registration' }) });
  await assert.rejects(repo.create(item), { code: 'REGISTRATION_EXISTS' });
  assert.equal((await repo.findByOrderId(id)).uniqueId, id);
  assert.equal((await repo.findByEmail(item.email)).uniqueId, id);
  const scans = await Promise.all([repo.checkinAtomic(id), repo.checkinAtomic(id)]);
  assert.equal(scans.filter(scan => scan.alreadyCheckedIn).length, 1);
  await repo.checkinAtomic(id, { eventDay: 2 });
  assert.deepEqual(Object.keys((await repo.undoCheckinAtomic(id, { eventDay: 1 })).checkinDays), ['day_2']);
  const batch = await runNotificationBatch({ deliver: async () => ({ success: true }) });
  assert.ok(batch.sent >= 1);
  const rule = [{ key: id, limit: 1, window_seconds: 60 }];
  assert.ok((await consumeFirestoreLimits(db, rule)).allowed);
  assert.equal((await consumeFirestoreLimits(db, rule)).allowed, false);
  await userRepo.createUser({ name: 'Test', username: id, email: item.email, password: 'local-sample' });
  assert.ok(await userRepo.verifyPassword('local-sample', (await userRepo.findByEmail(item.email)).passwordHash));
  assert.ok(await repo.delete(id));
});
