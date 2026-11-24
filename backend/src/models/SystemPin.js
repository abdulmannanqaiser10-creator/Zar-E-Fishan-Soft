import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const systemPinSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'main' },
    pinHash: { type: String, required: true, select: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

systemPinSchema.statics.ensureDefault = async function ensureDefault(defaultPin = '1234') {
  let doc = await this.findOne({ key: 'main' }).select('+pinHash');
  if (!doc) {
    doc = await this.create({
      key: 'main',
      pinHash: await bcrypt.hash(String(defaultPin), 12),
    });
  }
  return doc;
};

systemPinSchema.methods.matchPin = function matchPin(pin) {
  return bcrypt.compare(String(pin), this.pinHash);
};

systemPinSchema.methods.setPin = async function setPin(pin) {
  this.pinHash = await bcrypt.hash(String(pin), 12);
  await this.save();
};

export default mongoose.model('SystemPin', systemPinSchema);
