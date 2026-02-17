import Supply from '../models/Supply.js';
import User from '../models/User.js';

// Get all supplies (admin only)
export const getAllSupplies = async (req, res) => {
  try {
    const supplies = await Supply.find().populate('userId', 'name email').sort({ createdAt: -1 });

    res.status(200).json({
      message: 'All supplies retrieved',
      count: supplies.length,
      supplies
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Approve or reject supply
export const updateSupplyStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    // Validate status
    if (!['approved', 'rejected', 'paid', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const supply = await Supply.findByIdAndUpdate(
      req.params.id,
      { status, notes: notes || '' },
      { new: true, runValidators: true }
    );

    if (!supply) {
      return res.status(404).json({ message: 'Supply not found' });
    }

    // If approved, add cashback to user's total cashback
    if (status === 'approved' && supply.status !== 'approved') {
      await User.findByIdAndUpdate(
        supply.userId,
        { $inc: { totalCashback: supply.cashback } }
      );
    }

    res.status(200).json({
      message: `Supply marked as ${status}`,
      supply
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Toggle returning customer status
export const toggleReturningCustomer = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isReturning = !user.isReturning;
    await user.save();

    res.status(200).json({
      message: `User marked as ${user.isReturning ? 'returning' : 'new'} customer`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isReturning: user.isReturning,
        totalCashback: user.totalCashback
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get user details
export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch user's supplies
    const supplies = await Supply.find({ userId: user._id });

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isReturning: user.isReturning,
        totalCashback: user.totalCashback,
        createdAt: user.createdAt
      },
      totalSupplies: supplies.length,
      totalAmount: supplies.reduce((sum, s) => sum + s.totalAmount, 0),
      supplies
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
