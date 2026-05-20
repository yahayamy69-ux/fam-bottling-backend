import User from '../models/User.js';
import RedeemCode from '../models/RedeemCode.js';

// Decode points from reward code
// Format: R + points + 2 random checksum digits
// Example: R3050 = 30 points
// Logic: Remove 'R', remove last 2 digits, remainder = points
const decodePoints = (code) => {
  // Remove 'R' prefix
  const stripped = code.substring(1);
  // Remove last 2 digits (checksum)
  const pointsStr = stripped.slice(0, -2);
  const points = parseInt(pointsStr, 10);
  return points;
};

// Validate reward code format
const isValidCodeFormat = (code) => {
  const codeRegex = /^R\d{4,6}$/;
  return codeRegex.test(code.toUpperCase());
};

// Redeem a reward code
export const redeemCode = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user?.id;

    // Validate user is authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Validate code format
    if (!code || !isValidCodeFormat(code)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid code format. Code must be in format R followed by 4-6 digits (e.g., R3050 or R100000)'
      });
    }

    const codeUppercase = code.toUpperCase();

    // Check if code exists and if already redeemed
    const existingCode = await RedeemCode.findOne({ code: codeUppercase });

    if (!existingCode) {
      return res.status(404).json({
        success: false,
        message: 'This reward code has not been activated yet. Please check your code or contact support.'
      });
    }

    if (existingCode.isRedeemed) {
      return res.status(400).json({
        success: false,
        message: 'This reward code has already been redeemed'
      });
    }

    // Decode points from code
    const points = decodePoints(codeUppercase);

    if (points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reward code'
      });
    }

    // Get current user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's previous cashback total
    const previousTotal = user.totalCashback || 0;

    // Update user's totalCashback
    user.totalCashback = (user.totalCashback || 0) + points;
    await user.save();

    // Mark code as redeemed
    existingCode.isRedeemed = true;
    existingCode.redeemedBy = userId;
    existingCode.redeemedAt = new Date();
    await existingCode.save();

    return res.status(200).json({
      success: true,
      message: 'Reward code redeemed successfully',
      data: {
        pointsEarned: points,
        previousTotal: previousTotal,
        newTotal: user.totalCashback,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          totalCashback: user.totalCashback
        }
      }
    });
  } catch (err) {
    console.error('Redeem code error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Unable to process reward code'
    });
  }
};

export default { redeemCode };
