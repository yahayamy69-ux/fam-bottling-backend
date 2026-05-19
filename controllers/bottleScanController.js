import BottleScan from '../models/BottleScan.js';
import User from '../models/User.js';
import QRSession from '../models/QRSession.js';
import mongoose from 'mongoose';

// Submit scanned bottle data
export const submitScannedBottle = async (req, res) => {
  try {
    const { barcode, bottleSize, quantity, pricePerUnit, sessionCode } = req.body;

    // Validation
    if (!barcode || !bottleSize || !quantity || !pricePerUnit) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Get user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate total amount
    const totalAmount = quantity * pricePerUnit;

    // Calculate cashback (10% for returning customers, 0% for new customers)
    let cashback = 0;
    if (user.isReturning) {
      cashback = totalAmount * 0.10;
    }

    // Create bottle scan record
    const bottleScan = await BottleScan.create({
      userId: req.user.id,
      barcode,
      bottleSize,
      quantity,
      pricePerUnit,
      totalAmount,
      cashback,
      status: 'pending',
      sessionId: sessionCode ? await QRSession.findOne({ sessionCode }).then(s => s?._id) : null
    });

    res.status(201).json({
      message: 'Bottle scanned and submitted successfully',
      bottleScan,
      cashbackInfo: {
        isReturningCustomer: user.isReturning,
        cashbackAmount: cashback,
        message: user.isReturning
          ? '🎉 You earned 10% cashback as a returning customer!'
          : 'Complete your first supply to become a returning customer!'
      }
    });
  } catch (err) {
    console.error('Bottle scan submission error:', err);
    res.status(500).json({ message: err.message || 'Failed to submit scanned bottle' });
  }
};

// Get user's scanned bottles
export const getUserScannedBottles = async (req, res) => {
  try {
    const bottles = await BottleScan.find({ userId: req.user.id }).sort({ scannedAt: -1 });

    // Calculate summary stats
    const totalScans = bottles.length;
    const totalAmount = bottles.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalCashback = bottles.reduce((sum, b) => sum + b.cashback, 0);
    const totalBottles = bottles.reduce((sum, b) => sum + b.quantity, 0);

    res.status(200).json({
      message: 'Scanned bottles retrieved successfully',
      summary: {
        totalScans,
        totalBottles,
        totalAmount,
        totalCashback
      },
      bottles
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get scanned bottle by ID
export const getScannedBottleById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid bottle scan id' });
    }

    const bottle = await BottleScan.findById(id);

    if (!bottle) {
      return res.status(404).json({ message: 'Bottle scan not found' });
    }

    // Verify ownership
    if (bottle.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this record' });
    }

    res.status(200).json({ bottle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update scanned bottle (admin approval)
export const updateScannedBottle = async (req, res) => {
  try {
    const { status, notes } = req.body;

    // Validate status
    if (!['approved', 'rejected', 'paid', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid bottle scan id' });
    }

    const bottle = await BottleScan.findByIdAndUpdate(
      id,
      { status, notes: notes || '' },
      { new: true, runValidators: true }
    );

    if (!bottle) {
      return res.status(404).json({ message: 'Bottle scan not found' });
    }

    // If approved, add cashback to user's total
    if (status === 'approved' && bottle.status !== 'approved') {
      await User.findByIdAndUpdate(
        bottle.userId,
        { $inc: { totalCashback: bottle.cashback } }
      );
    }

    res.status(200).json({
      message: `Bottle scanned record marked as ${status}`,
      bottle
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Verify barcode format (can be extended for database validation)
export const verifyBarcode = async (req, res) => {
  try {
    const { barcode, bottleSize } = req.body;

    if (!barcode || !bottleSize) {
      return res.status(400).json({ message: 'Barcode and bottle size are required' });
    }

    // Basic validation
    if (!['30cl', '50cl', '60cl', '1L'].includes(bottleSize)) {
      return res.status(400).json({ message: 'Invalid bottle size' });
    }

    // You can add barcode database validation here if needed
    // For now, we just verify format

    res.status(200).json({
      message: 'Barcode verified',
      isValid: true,
      barcode,
      bottleSize
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
