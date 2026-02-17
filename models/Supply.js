import mongoose from 'mongoose';

const SupplySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  bottleSize: {
    type: String,
    enum: ['30cl', '50cl', '60cl', '75cl', '1L', '1.5L'],
    required: [true, 'Please select a bottle size']
  },
  quantity: {
    type: Number,
    required: [true, 'Please provide quantity'],
    min: [1, 'Quantity must be at least 1']
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'Please provide price per unit'],
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update updatedAt
SupplySchema.pre('findByIdAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

export default mongoose.model('Supply', SupplySchema);
