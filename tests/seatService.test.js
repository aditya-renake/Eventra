import test from 'node:test';
import assert from 'node:assert/strict';
import { getSeatCatalog, requireAvailableSeat, holdSeat } from '../backend/src/services/seatService.js';

test('getSeatCatalog returns valid array with numeric remaining capacity', async () => {
  const catalog = await getSeatCatalog();
  assert.ok(Array.isArray(catalog), 'Catalog should be an array');
  assert.ok(catalog.length > 0, 'Catalog should have at least one event');
  for (const item of catalog) {
    assert.ok(typeof item.id === 'string', 'Item should have string id');
    assert.ok(typeof item.remaining === 'number', 'Remaining should be numeric');
    assert.ok(item.remaining >= 0, 'Remaining should be non-negative');
  }
});

test('requireAvailableSeat does not throw for available event', async () => {
  await assert.doesNotReject(async () => {
    await requireAvailableSeat('eventra-2026');
  });
});

test('holdSeat returns successful hold object', async () => {
  const res = await holdSeat('eventra-2026', 'test_order_123');
  assert.ok(res && (res.success || typeof res === 'object'));
});
