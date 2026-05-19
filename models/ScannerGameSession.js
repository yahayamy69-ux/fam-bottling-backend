import mongoose from 'mongoose';

const ScannerGameSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  displayCode: {
    type: String,
    required: true // 4-digit code displayed to user
  },
  rechargeToken: {
    type: String,
    required: true,
    unique: true
  },
  barcode: {
    type: String,
    required: true // EAN-13 like barcode
  },
  status: {
    type: String,
    enum: ['pending', 'scanned', 'expired'],
    default: 'pending'
  },
  scannedValue: {
    type: String,
    default: null // Value that was actually scanned
  },
  isValid: {
    type: Boolean,
    default: null // null=not yet scanned, true=valid match, false=invalid
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes to scan
  },
  scannedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete expired sessions
ScannerGameSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('ScannerGameSession', ScannerGameSessionSchema);
