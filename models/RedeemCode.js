import mongoose from 'mongoose';

const RedeemCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^R\d{4,6}$/, 'Code must be in format R followed by 4-6 digits (e.g., R3050 or R100000)']
  },
  points: {
    type: Number,
    required: true
  },
  isRedeemed: {
    type: Boolean,
    default: false
  },
  redeemedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  redeemedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('RedeemCode', RedeemCodeSchema);
