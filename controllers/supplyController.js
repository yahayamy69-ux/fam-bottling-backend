import Supply from '../models/Supply.js';
import User from '../models/User.js';
import RedeemCode from '../models/RedeemCode.js';

// Submit supply (with cashback calculation)
export const submitSupply = async (req, res) => {
  try {
    const { bottleSize, quantity, pricePerUnit } = req.body;

    // Validation
    if (!bottleSize || !quantity || !pricePerUnit) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Get user to check if returning customer
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

    // Create supply record
    const supply = await Supply.create({
      userId: req.user.id,
      bottleSize,
      quantity,
      pricePerUnit,
      totalAmount,
      cashback,
      status: 'pending'
    });

    res.status(201).json({
      message: 'Supply submitted successfully',
      supply,
      cashbackInfo: {
        isReturningCustomer: user.isReturning,
        cashbackAmount: cashback,
        message: user.isReturning 
          ? '🎉 You earned 10% cashback as a returning customer!' 
          : 'Complete your first supply to become a returning customer!'
      }
    });
  } catch (err) {
    console.error('Supply submission error:', err);
    res.status(500).json({ message: err.message || 'Failed to submit supply' });
  }
};

// Get user's supplies and redemptions
export const getUserSupplies = async (req, res) => {
  try {
    const supplies = await Supply.find({ userId: req.user.id }).sort({ createdAt: -1 });
    
    // Fetch user's redemptions
    const redemptions = await RedeemCode.find({ redeemedBy: req.user.id }).sort({ redeemedAt: -1 });
    
    // Convert redemptions to transaction format
    const redemptionTransactions = redemptions.map(redemption => {
      // Decode points from code
      const pointsStr = redemption.code.substring(1).slice(0, -2); // Remove R and last 2 digits
      const points = parseInt(pointsStr, 10);
      
      return {
        _id: redemption._id,
        type: 'reward_redemption',
        code: redemption.code,
        amount: points,
        status: 'completed',
        createdAt: redemption.redeemedAt,
        isRedemption: true
      };
    });
    
    // Combine supplies and redemptions, sort by date
    const allTransactions = [
      ...supplies.map(s => ({ ...s.toObject(), isRedemption: false })),
      ...redemptionTransactions
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate summary stats including redemptions
    const totalSupplies = supplies.length + redemptions.length;
    const totalAmount = supplies.reduce((sum, s) => sum + s.totalAmount, 0) + 
                       redemptions.reduce((sum, r) => {
                         const pointsStr = r.code.substring(1).slice(0, -2);
                         return sum + parseInt(pointsStr, 10);
                       }, 0);
    const totalCashback = supplies.reduce((sum, s) => sum + s.cashback, 0);

    res.status(200).json({
      message: 'Supplies and redemptions retrieved successfully',
      summary: {
        totalSupplies,
        totalAmount,
        totalCashback
      },
      supplies: allTransactions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single supply
export const getSupplyById = async (req, res) => {
  try {
    const supply = await Supply.findById(req.params.id);

    if (!supply) {
      return res.status(404).json({ message: 'Supply not found' });
    }

    // Verify ownership
    if (supply.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this supply' });
    }

    res.status(200).json({ supply });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
