import User from '../models/User.js';

// In-memory storage for codes with expiry
const codeStore = {};

/**
 * Generate a random 4-digit code for ESP32
 * Code expires after 5 minutes
 */
export const generateESPCode = async (req, res) => {
  try {
    // Generate random 4-digit code
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    
    // Store with 5 minute expiry
    const expiryTime = Date.now() + (5 * 60 * 1000); // 5 minutes
    codeStore[code] = {
      used: false,
      expiresAt: expiryTime,
      createdAt: Date.now()
    };

    console.log(`🔐 ESP Code generated: ${code}`);
    
    res.json({
      status: 'success',
      code: code,
      expiresIn: 300, // seconds
      message: 'Code generated successfully'
    });
  } catch (err) {
    console.error('Error generating ESP code:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate code'
    });
  }
};

/**
 * Redeem an ESP code and add ₦10 to user's cashback
 * Requires authentication
 */
export const redeemESPCode = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id; // From auth middleware

    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'Code is required'
      });
    }

    // Check if code exists
    if (!codeStore[code]) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid code'
      });
    }

    const codeData = codeStore[code];

    // Check if code is expired
    if (Date.now() > codeData.expiresAt) {
      delete codeStore[code];
      return res.status(410).json({
        status: 'error',
        message: 'Code has expired'
      });
    }

    // Check if code already used
    if (codeData.used) {
      return res.status(400).json({
        status: 'error',
        message: 'Code has already been used'
      });
    }

    // Mark code as used
    codeData.used = true;
    codeData.usedBy = userId;
    codeData.usedAt = Date.now();

    // Add ₦10 to user's totalCashback
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { totalCashback: 10 }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    console.log(`✅ Code ${code} redeemed by user ${userId}. New balance: ₦${updatedUser.totalCashback}`);

    res.json({
      status: 'success',
      message: '✓ ₦10 added to your balance!',
      newBalance: updatedUser.totalCashback,
      code: code
    });
  } catch (err) {
    console.error('Error redeeming ESP code:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to redeem code'
    });
  }
};

/**
 * Clean up expired codes (called periodically)
 */
export const cleanupExpiredCodes = () => {
  const now = Date.now();
  let cleaned = 0;

  for (const [code, data] of Object.entries(codeStore)) {
    if (now > data.expiresAt) {
      delete codeStore[code];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired ESP codes`);
  }
};

// Run cleanup every 2 minutes
setInterval(cleanupExpiredCodes, 2 * 60 * 1000);
