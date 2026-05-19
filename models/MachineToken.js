import mongoose from 'mongoose';

const MachineTokenSchema = new mongoose.Schema({
  machineId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  used: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Expire token documents automatically
MachineTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('MachineToken', MachineTokenSchema);
