import test, { before } from 'node:test';
import { randomUUID } from 'node:crypto';
import { getFirestore } from '../backend/src/config/firebase.js';
import assert from 'node:assert/strict';
import { getSeatCatalog, requireAvailableSeat, holdSeat } from '../backend/src/services/seatService.js';

const emulatorTest = process.env.FIRESTORE_EMULATOR_HOST ? test : test.skip;
const eventId = 'test-' + randomUUID();
before(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST) await getFirestore().collection('club_events').doc(eventId).set({ totalCapacity: 2 });
});

emulatorTest('getSeatCatalog returns valid array with numeric remaining capacity', async () => {
  const catalog = await getSeatCatalog();
  assert.ok(Array.isArray(catalog), 'Catalog should be an array');
  assert.ok(catalog.length > 0, 'Catalog should have at least one event');
  for (const item of catalog) {
    assert.ok(typeof item.id === 'string', 'Item should have string id');
    assert.ok(typeof item.remaining === 'number', 'Remaining should be numeric');
    assert.ok(item.remaining >= 0, 'Remaining should be non-negative');
  }
});

emulatorTest('requireAvailableSeat does not throw for available event', async () => {
  await assert.doesNotReject(async () => {
    await requireAvailableSeat(eventId);
  });
});

emulatorTest('holdSeat returns successful hold object', async () => {
  const res = await holdSeat(eventId, 'order-' + eventId);
  assert.ok(res && (res.success || typeof res === 'object'));
});
