import LedgerEntry from '../models/LedgerEntry.js';
import Account from '../models/Account.js';
import { getNextSequence, formatDocNumber } from './sequenceService.js';
import { ensureNonNegative, roundMoney } from '../utils/calculations.js';

export const postLedger = async ({
  type,
  category,
  amount,
  description = '',
  account,
  client,
  vendor,
  project,
  invoice,
  transaction,
  reference = '',
  uniqueKey,
  date,
  userId,
}) => {
  const safeAmount = ensureNonNegative(amount, 'Ledger amount');
  if (safeAmount === 0) return null;

  if (uniqueKey) {
    const existing = await LedgerEntry.findOne({ uniqueKey });
    if (existing) return existing;
  }

  const seq = await getNextSequence('ledger');
  const entry = await LedgerEntry.create({
    entryNumber: formatDocNumber('LDG', seq),
    date: date || new Date(),
    type,
    category,
    description,
    amount: safeAmount,
    account,
    client,
    vendor,
    project,
    invoice,
    transaction,
    reference,
    uniqueKey,
    createdBy: userId,
  });

  if (account) {
    const acc = await Account.findById(account);
    if (acc) {
      // Cashbook: credit = money in, debit = money out
      acc.currentBalance = roundMoney(
        (acc.currentBalance || 0) + (type === 'credit' ? safeAmount : -safeAmount)
      );
      await acc.save();
    }
  }

  return entry;
};

export const ensureDefaultAccounts = async () => {
  const count = await Account.countDocuments();
  if (count > 0) return;
  await Account.insertMany([
    { name: 'Main Cash', type: 'cash', openingBalance: 0, currentBalance: 0 },
    { name: 'Main Bank', type: 'bank', bankName: 'Primary Bank', openingBalance: 0, currentBalance: 0 },
  ]);
};
