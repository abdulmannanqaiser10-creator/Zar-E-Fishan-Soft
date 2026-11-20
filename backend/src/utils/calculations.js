/**
 * Centralized financial calculation helpers.
 * All money math for invoices, purchases, and balances lives here.
 */

export const roundMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

export const ensureNonNegative = (value, label = 'Amount') => {
  const n = roundMoney(value);
  if (n < 0) {
    const err = new Error(`${label} cannot be negative`);
    err.statusCode = 400;
    throw err;
  }
  return n;
};

/**
 * Line items: [{ quantity, unitPrice, discount? }]
 * Returns subtotal, taxAmount, discountAmount, total
 */
export const calculateDocumentTotals = ({
  items = [],
  taxRate = 0,
  discountAmount = 0,
  discountPercent = 0,
}) => {
  const lineSubtotals = items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const lineDiscount = Number(item.discount) || 0;
    if (qty < 0 || price < 0) {
      const err = new Error('Quantity and unit price must be non-negative');
      err.statusCode = 400;
      throw err;
    }
    return roundMoney(Math.max(0, qty * price - lineDiscount));
  });

  const subtotal = roundMoney(lineSubtotals.reduce((sum, v) => sum + v, 0));
  const rate = Number(taxRate) || 0;
  const flatDiscount = Number(discountAmount) || 0;
  const pctDiscount = Number(discountPercent) || 0;

  let discount = flatDiscount;
  if (pctDiscount > 0) {
    discount = roundMoney(discount + (subtotal * pctDiscount) / 100);
  }
  discount = Math.min(discount, subtotal);

  const taxable = roundMoney(Math.max(0, subtotal - discount));
  const taxAmount = roundMoney((taxable * rate) / 100);
  const total = roundMoney(taxable + taxAmount);

  return {
    subtotal,
    discountAmount: discount,
    taxRate: rate,
    taxAmount,
    total,
    remainingBalance: total,
  };
};

export const calculateRemaining = (total, paidAmount) => {
  const t = ensureNonNegative(total, 'Total');
  const p = ensureNonNegative(paidAmount, 'Paid amount');
  if (p > t) {
    const err = new Error('Paid amount cannot exceed total');
    err.statusCode = 400;
    throw err;
  }
  return roundMoney(t - p);
};

export const calculateProfit = (revenue, expenses) =>
  roundMoney((Number(revenue) || 0) - (Number(expenses) || 0));

export const calculateInventoryValue = (items = []) =>
  roundMoney(
    items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.costPrice) || 0;
      return sum + qty * cost;
    }, 0)
  );

export const applyPayment = ({ total, previouslyPaid = 0, paymentAmount }) => {
  const amount = ensureNonNegative(paymentAmount, 'Payment amount');
  if (amount === 0) {
    const err = new Error('Payment amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }
  const paid = ensureNonNegative(previouslyPaid, 'Previously paid');
  const newPaid = roundMoney(paid + amount);
  const remaining = calculateRemaining(total, newPaid);
  return { paidAmount: newPaid, remainingBalance: remaining, paymentAmount: amount };
};
