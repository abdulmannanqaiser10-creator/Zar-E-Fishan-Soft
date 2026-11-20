import Counter from '../models/Counter.js';

export const getNextSequence = async (name, session = null) => {
  const opts = { new: true, upsert: true };
  if (session) opts.session = session;

  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    opts
  );
  return counter.seq;
};

export const formatDocNumber = (prefix, seq, pad = 4) =>
  `${prefix}-${String(seq).padStart(pad, '0')}`;
