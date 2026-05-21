import mongoose from 'mongoose';

const BankAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  accountHolderName: {
    type: String,
    required: [true, 'Please provide account holder name'],
    trim: true
  },
  accountNumber: {
    type: String,
    required: [true, 'Please provide account number'],
    trim: true
  },
  bankName: {
    type: String,
    required: [true, 'Please provide bank name'],
    trim: true
  },
  bankCode: {
    type: String,
    trim: true
  },
  accountType: {
    type: String,
    enum: ['savings', 'current', 'checking'],
    default: 'savings'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('BankAccount', BankAccountSchema);
