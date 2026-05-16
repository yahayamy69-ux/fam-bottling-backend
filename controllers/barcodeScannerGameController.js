import User from '../models/User.js';

// Generate a random 4-digit code or barcode
export const generateCode = async (req, res) => {
  try {
    console.log('🔧 Generating barcode code...');
    
    // Generate random 4-digit code
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Also generate a barcode-like string (could be EAN format or similar)
    const barcode = generateBarcodeString();
    
    const responseData = {
      code: randomCode,
      barcode: barcode,
      displayCode: randomCode // Display the 4-digit code to user
    };
    
    console.log('✅ Code generated:', randomCode);
    
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
    const { scannedValue } = req.body;
    const userId = req.user._id;

    console.log('🔍 Processing scan:', { scannedValue, userId });

    if (!scannedValue) {
      console.warn('⚠️  Scanned value is missing');
      return res.status(400).json({
        success: false,
        message: 'Scanned value is required'
      });
    }

    // Find and update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { totalCashback: 10 } },
      { new: true }
    ).select('-password');

    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Scan processed. New balance:', user.totalCashback);

    res.status(200).json({
      success: true,
      message: 'Scan successful! +10 naira added to your account',
      data: {
        scannedValue,
        earnedAmount: 10,
        newBalance: user.totalCashback,
        user
      }
    });
  } catch (error) {
    console.error('❌ Error processing scan:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};ole.log('📊 Fetching scanner stats for user:', userId);
    
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
    console.error('❌ Error fetching stats:', error);.json({
      success: true,
      data: {
        totalEarnings: user.totalCashback,
        user
      }
    });
  } catch (error) {
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
