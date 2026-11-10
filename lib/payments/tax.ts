/** Display-only mirror of `withTax` in supabase/functions/_shared/razorpay.ts. Money is always integer paise. */
export function withTax(amountPaise: number, percent: number, inclusive: boolean) {
  if (inclusive) {
    const tax = Math.round(amountPaise - amountPaise / (1 + percent / 100));
    return { amount: amountPaise - tax, tax, total: amountPaise };
  }
  const tax = Math.round((amountPaise * percent) / 100);
  return { amount: amountPaise, tax, total: amountPaise + tax };
}
