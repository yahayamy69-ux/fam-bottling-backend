import mongoose from 'mongoose';

const BottleScanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  barcode: {
    type: String,
    required: [true, 'Barcode is required'],
    trim: true
  },
  bottleSize: {
    type: String,
    enum: ['30cl', '50cl', '60cl', '1L'],
    required: [true, 'Bottle size is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0.01, 'Price must be greater than 0']
  },
  totalAmount: {
    type: Number,
    required: true
  },
  cashback: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'rejected'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QRSession'
  },
  scannedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update updatedAt
BottleScanSchema.pre('findByIdAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

export default mongoose.model('BottleScan', BottleScanSchema);
