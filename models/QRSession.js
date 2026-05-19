import mongoose from 'mongoose';

const QRSessionSchema = new mongoose.Schema({
  sessionCode: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  loginCode: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['login', 'scan_session'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'authenticated', 'expired'],
    default: 'pending'
  },
  deviceInfo: {
    userAgent: String,
    ipAddress: String
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Automatically expire sessions
QRSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('QRSession', QRSessionSchema);
