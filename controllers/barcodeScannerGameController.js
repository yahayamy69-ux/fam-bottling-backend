import crypto from 'crypto';
import User from '../models/User.js';
import ScannerGameSession from '../models/ScannerGameSession.js';

// Generate a random 4-digit code or barcode
export const generateCode = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    console.log('🔧 Generating barcode code for user:', userId);
    
    // Check for rate-limiting: prevent generating new code too soon
    const recentSession = await ScannerGameSession.findOne({
      userId,
      status: 'pending',
      createdAt: { $gt: new Date(Date.now() - 30 * 1000) } // Last 30 seconds
    });
    
    if (recentSession) {
      console.warn('⚠️  Rate limit: user has pending code, wait 30s');
      return res.status(429).json({
        success: false,
        message: 'Please wait 30 seconds before generating a new code. Use the existing code first!'
      });
    }
    
    // Generate random 4-digit code
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Generate a secure one-time token for mobile QR checkout.
    const rechargeToken = crypto.randomBytes(20).toString('hex');
    
    // Also generate a barcode-like string (could be EAN format or similar)
    const barcode = generateBarcodeString();
    
    // Store the session in database. This token is later validated by /recharge/qr.
    const session = await ScannerGameSession.create({
      userId,
      displayCode: randomCode,
      rechargeToken,
      barcode: barcode,
      status: 'pending'
    });
    
    const responseData = {
      sessionId: session._id,
      displayCode: randomCode,
      rechargeToken,
      barcode: barcode,
      expiresAt: session.expiresAt
    };
    
    console.log('✅ Code generated and stored:', randomCode, 'expires at', session.expiresAt);
    
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('❌ Error generating code:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Process scanned barcode/code
export const processScan = async (req, res) => {
  try {
    const { scannedValue, sessionId } = req.body;
    const userId = req.user.id || req.user._id;

    console.log('🔍 Processing scan:', { scannedValue, userId, sessionId });

    if (!scannedValue) {
      console.warn('⚠️  Scanned value is missing');
      return res.status(400).json({
        success: false,
        message: 'Scanned value is required'
      });
    }

    // Find the user's most recent pending session (if sessionId not provided)
    let session;
    if (sessionId) {
      session = await ScannerGameSession.findOne({
        _id: sessionId,
        userId,
        status: 'pending'
      });
    } else {
      // Find the latest pending session for this user
      session = await ScannerGameSession.findOne({
        userId,
        status: 'pending'
      }).sort({ createdAt: -1 });
    }

    if (!session) {
      console.error('❌ No active session found for user:', userId);
      return res.status(404).json({
        success: false,
        message: 'No active code to scan. Generate a new code first.'
      });
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      await ScannerGameSession.updateOne({ _id: session._id }, { status: 'expired' });
      console.warn('⚠️  Session expired:', session._id);
      return res.status(400).json({
        success: false,
        message: 'Code has expired. Generate a new code.'
      });
    }

    // Validate scanned value matches displayCode
    const isValidScan = scannedValue.toString().trim() === session.displayCode;
    
    console.log('🔎 Validation check:', { scannedValue, displayCode: session.displayCode, isValid: isValidScan });

    if (!isValidScan) {
      // Mark session as scanned but invalid
      await ScannerGameSession.updateOne(
        { _id: session._id },
        {
          status: 'scanned',
          scannedValue,
          isValid: false,
          scannedAt: new Date()
        }
      );
      console.warn('❌ Invalid scan - value does not match code');
      return res.status(400).json({
        success: false,
        message: `Invalid code. Expected ${session.displayCode}, got ${scannedValue}. Try again with the correct code.`
      });
    }

    // Valid scan - mark as used (single-use)
    await ScannerGameSession.updateOne(
      { _id: session._id },
      {
        status: 'scanned',
        scannedValue,
        isValid: true,
        scannedAt: new Date()
      }
    );

    // Get current user to check monthly claim limit
    let user = await User.findById(userId).select('-password');

    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if we need to reset the monthly counter (new month)
    const today = new Date();
    const lastReset = user.lastClaimResetDate ? new Date(user.lastClaimResetDate) : new Date();
    const isNewMonth = 
      today.getMonth() !== lastReset.getMonth() || 
      today.getFullYear() !== lastReset.getFullYear();

    if (isNewMonth) {
      // Reset monthly counter for new month
      user.monthlyClaimsCount = 0;
      user.lastClaimResetDate = today;
      await user.save();
      console.log('✅ Monthly counter reset for user:', userId);
    }

    // Check if user has already claimed 3 times this month
    if (user.monthlyClaimsCount >= 3) {
      console.warn('⚠️  User has reached monthly claim limit (3/3):', userId);
      return res.status(429).json({
        success: false,
        message: 'You have reached your monthly limit of 3 claims. Please come back next month!',
        data: {
          claimsUsed: user.monthlyClaimsCount,
          claimsRemaining: 0,
          resetDate: new Date(today.getFullYear(), today.getMonth() + 1, 1)
        }
      });
    }

    // User can claim - update cashback and increment claim count
    user = await User.findByIdAndUpdate(
      userId,
      { 
        $inc: { 
          totalCashback: 10,
          monthlyClaimsCount: 1
        }
      },
      { new: true }
    ).select('-password');

    console.log('✅ Valid scan processed. New balance:', user.totalCashback, 'Claims this month:', user.monthlyClaimsCount);

    res.status(200).json({
      success: true,
      message: 'Scan successful! +₦10 added to your account 🎉',
      data: {
        scannedValue,
        earnedAmount: 10,
        newBalance: user.totalCashback,
        claimsUsed: user.monthlyClaimsCount,
        claimsRemaining: 3 - user.monthlyClaimsCount,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('❌ Error processing scan:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user's scanner earnings history
export const getUserScannerStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    console.log('📊 Fetching scanner stats for user:', userId);
    
    const user = await User.findById(userId).select('totalCashback name email');

    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const statsData = {
      totalEarnings: user.totalCashback || 0,
      user: {
        name: user.name,
        email: user.email
      }
    };

    console.log('✅ Scanner stats:', statsData);

    res.status(200).json({
      success: true,
      data: statsData
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to generate barcode-like strings
function generateBarcodeString() {
  // Generate EAN-13 like barcode string
  const digits = [];
  for (let i = 0; i < 12; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }
  
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  digits.push(checkDigit);
  
  return digits.join('');
}
