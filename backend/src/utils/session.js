import mongoose from 'mongoose';

/**
 * Standalone MongoDB does not support multi-document transactions.
 * Prefer sequential writes + uniqueKey idempotency when transactions are unavailable.
 */
export const withOptionalTransaction = async (work) => {
  let session = null;
  let useTxn = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTxn = true;
  } catch {
    session = null;
    useTxn = false;
  }

  try {
    const result = await work(useTxn ? session : null);
    if (useTxn && session) await session.commitTransaction();
    return result;
  } catch (err) {
    // Retry without transaction if replica-set requirement fails mid-flight
    if (
      useTxn &&
      (err.message?.includes('replica set') || err.code === 20 || err.codeName === 'IllegalOperation')
    ) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
          /* ignore */
        }
        session.endSession();
        session = null;
      }
      return work(null);
    }
    if (useTxn && session) {
      try {
        await session.abortTransaction();
      } catch {
        /* ignore */
      }
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
};
