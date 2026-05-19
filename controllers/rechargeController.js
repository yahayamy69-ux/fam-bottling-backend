import mongoose from 'mongoose';
import User from '../models/User.js';
import ScannerGameSession from '../models/ScannerGameSession.js';

// Public endpoint used by the scanned QR landing page.
// It validates sessionId + token before crediting +10 to the session owner.
export const processRechargeQRCode = async (req, res) => {
  try {
    const rawSessionId = req.query.sessionId;
    const rawToken = req.query.token;

    const sessionId = typeof rawSessionId === 'string' ? rawSessionId.trim() : '';
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';

    console.log('Recharge QR request params:', {
      sessionId,
      token: token ? '***masked***' : null
    });

    if (!sessionId || !token) {
      return res.status(400).json({
        success: false,
        message: 'sessionId and token are required to validate recharge QR code.'
      });
    }

    // Defensive lookup: some scanners or QR readers may mangle the sessionId string.
    // Instead of relying solely on casting to ObjectId, first find by the unique
    // `rechargeToken` and then validate the session id if possible. This prevents
    // Mongo driver errors when a malformed sessionId is supplied.
    const session = await ScannerGameSession.findOne({
      rechargeToken: token,
      status: 'pending'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Recharge session not found or token is invalid.'
      });
    }

    // If a sessionId was supplied and appears to be a valid ObjectId, ensure it
    // matches the session we found by token. If it looks invalid, just log it
    // and continue using the session matched by token (safer than throwing).
    if (sessionId) {
      if (mongoose.Types.ObjectId.isValid(sessionId)) {
        if (session._id.toString() !== sessionId) {
          console.warn('SessionId mismatch for token:', { provided: sessionId, expected: session._id.toString() });
          return res.status(400).json({
            success: false,
            message: 'sessionId does not match the token provided.'
          });
        }
      } else {
        console.warn('Malformed sessionId supplied in recharge QR request:', sessionId);
        // proceed — token match is authoritative
      }
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Recharge session not found or token is invalid.'
      });
    }

    if (session.expiresAt < new Date()) {
      await ScannerGameSession.updateOne({ _id: session._id }, { status: 'expired' });
      return res.status(400).json({
        success: false,
        message: 'Recharge QR session has expired. Please generate a new code.'
      });
    }

    const user = await User.findByIdAndUpdate(
      session.userId,
      { $inc: { totalCashback: 10 } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User for this recharge session was not found.'
      });
    }

    await ScannerGameSession.updateOne(
      { _id: session._id },
      {
        status: 'scanned',
        scannedValue: 'recharge-qr',
        isValid: true,
        scannedAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: 'Recharge successful! ₦10 has been added to your balance.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          totalCashback: user.totalCashback
        }
      }
    });
  } catch (error) {
    console.error('Recharge QR validation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to process recharge QR code at this time.'
    });
  }
};
