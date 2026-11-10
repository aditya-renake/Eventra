import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeatService } from '../backend/src/services/seatService.js';

const serviceWith = response => createSeatService(() => ({ rpc: async () => response }));

test('returns database seat counts and accepts available seats', async () => {
  const rows = [{ id: 'a', remaining: 1 }];
  assert.deepEqual(await serviceWith({ data: rows }).getSeatCatalog(), rows);
  await serviceWith({ data: 1 }).requireAvailableSeat('a');
  await serviceWith({ data: null }).holdSeat('a', 'order');
});

test('rejects full events at both availability check and checkout hold', async () => {
  await assert.rejects(serviceWith({ data: 0 }).requireAvailableSeat('a'), { statusCode: 409 });
  await assert.rejects(serviceWith({ error: { message: 'EVENT_FULL' } }).holdSeat('a', 'order'), { statusCode: 409 });
});

test('cannot promise seats without a database', async () => {
  const service = createSeatService(() => null);
  await assert.rejects(service.getSeatCatalog(), { statusCode: 503 });
  await assert.rejects(service.holdSeat('a', 'order'), { statusCode: 503 });
});
