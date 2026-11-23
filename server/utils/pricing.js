// Pure pricing helpers — no DB, no side effects. Unit-tested in /test.

// Calculate the discount a coupon produces on a given amount.
// Returns { discount, final, error }.
function calcCouponDiscount(coupon, amount) {
  const price = Number(amount) || 0;
  if (!coupon) return { discount: 0, final: price, error: 'No coupon.' };

  const now = new Date();
  if (coupon.is_active === false) return { discount: 0, final: price, error: 'Coupon is inactive.' };
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return { discount: 0, final: price, error: 'Coupon is not active yet.' };
  if (coupon.expires_at && new Date(coupon.expires_at) < now) return { discount: 0, final: price, error: 'Coupon has expired.' };
  if (coupon.max_uses != null && Number(coupon.used_count) >= Number(coupon.max_uses)) {
    return { discount: 0, final: price, error: 'Coupon usage limit reached.' };
  }
  if (coupon.min_purchase != null && price < Number(coupon.min_purchase)) {
    return { discount: 0, final: price, error: `Minimum purchase of ${coupon.min_purchase} required.` };
  }

  let discount = 0;
  if (coupon.discount_type === 'percent') {
    discount = price * (Number(coupon.discount_value) / 100);
  } else {
    discount = Number(coupon.discount_value);
  }
  discount = Math.min(discount, price);          // never below zero
  discount = Math.round(discount * 100) / 100;    // 2dp
  const final = Math.round((price - discount) * 100) / 100;
  return { discount, final, error: null };
}

// Apply available account credit (wallet) to an amount.
// credits: array of { amount } that are unused. Returns { applied, final }.
function applyCredits(credits, amount) {
  const price = Number(amount) || 0;
  const total = (credits || []).reduce((s, c) => s + Number(c.amount || 0), 0);
  const applied = Math.min(total, price);
  const final = Math.round((price - applied) * 100) / 100;
  return { applied: Math.round(applied * 100) / 100, final };
}

module.exports = { calcCouponDiscount, applyCredits };
