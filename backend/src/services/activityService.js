import Activity from '../models/Activity.js';

export const logActivity = async ({
  action,
  module,
  entityType,
  entityId,
  description,
  user,
  meta,
}) => {
  try {
    await Activity.create({
      action,
      module,
      entityType,
      entityId,
      description,
      user,
      meta,
    });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
};
