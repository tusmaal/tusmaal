const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcCouponDiscount, applyCredits } = require('../server/utils/pricing');

test('percent coupon reduces price correctly', () => {
  const { discount, final, error } = calcCouponDiscount(
    { discount_type: 'percent', discount_value: 20, is_active: true }, 50
  );
  assert.equal(error, null);
  assert.equal(discount, 10);
  assert.equal(final, 40);
});

test('fixed coupon never goes below zero', () => {
  const { discount, final } = calcCouponDiscount(
    { discount_type: 'fixed', discount_value: 100, is_active: true }, 30
  );
  assert.equal(discount, 30);
  assert.equal(final, 0);
});

test('expired coupon returns error', () => {
  const past = new Date(Date.now() - 86400000).toISOString();
  const { error } = calcCouponDiscount(
    { discount_type: 'percent', discount_value: 10, is_active: true, expires_at: past }, 50
  );
  assert.match(error, /expired/i);
});

test('inactive coupon returns error', () => {
  const { error } = calcCouponDiscount(
    { discount_type: 'percent', discount_value: 10, is_active: false }, 50
  );
  assert.match(error, /inactive/i);
});

test('coupon below minimum purchase is rejected', () => {
  const { error } = calcCouponDiscount(
    { discount_type: 'percent', discount_value: 10, is_active: true, min_purchase: 100 }, 50
  );
  assert.match(error, /minimum/i);
});

test('usage limit reached returns error', () => {
  const { error } = calcCouponDiscount(
    { discount_type: 'percent', discount_value: 10, is_active: true, max_uses: 5, used_count: 5 }, 50
  );
  assert.match(error, /limit/i);
});

test('applyCredits caps applied amount at the price', () => {
  const { applied, final } = applyCredits([{ amount: 5 }, { amount: 10 }], 12);
  assert.equal(applied, 12);
  assert.equal(final, 0);
});

test('applyCredits leaves remainder when credits are smaller', () => {
  const { applied, final } = applyCredits([{ amount: 3 }], 10);
  assert.equal(applied, 3);
  assert.equal(final, 7);
});
