import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWidgetPayload,
  normalizeBillsForWidgetSync,
} from './sync-widget-payload.ts';

test('normalizeBillsForWidgetSync filters invalid bills and sorts by due date', () => {
  const bills = normalizeBillsForWidgetSync([
    null,
    { id: '3', name: 'Late Bill', amount: 50, due_date: '2026-03-09', is_paid: false },
    { id: '1', name: 'First Bill', amount: 10, due_date: '2026-03-01', is_paid: false },
    { id: '2', name: '', amount: 20, due_date: '2026-03-05', is_paid: false },
    { id: '4', name: 'Bad Date', amount: 30, due_date: '03/15/2026', is_paid: false },
  ]);

  assert.equal(bills.length, 2);
  assert.deepEqual(
    bills.map((bill) => bill.id),
    ['1', '3']
  );
});

test('buildWidgetPayload coerces null amounts to zero and excludes paid bills', () => {
  const payload = buildWidgetPayload([
    { id: '1', name: 'Rent', amount: null, due_date: '2026-03-01', is_paid: false, is_autopay: null, category: null },
    { id: '2', name: 'Internet', amount: 89.45, due_date: '2026-03-05', is_paid: false, is_autopay: false, category: null },
    { id: '3', name: 'Paid Bill', amount: 20, due_date: '2026-03-02', is_paid: true, is_autopay: false, category: null },
  ]);

  assert.equal(payload.totals.totalDue, 89.45);
  assert.equal(payload.nextBill?.id, '1');
  assert.equal(payload.nextBill?.amount, 0);
  assert.equal(payload.upcoming.length, 2);
  assert.deepEqual(
    payload.upcoming.map((bill) => bill.id),
    ['1', '2']
  );
});

test('buildWidgetPayload returns an empty payload for empty bill lists', () => {
  const payload = buildWidgetPayload([]);

  assert.equal(payload.nextBill, null);
  assert.equal(payload.upcoming.length, 0);
  assert.equal(payload.totals.totalDue, 0);
  assert.equal(payload.totals.deltaVsLastMonth, null);
});
