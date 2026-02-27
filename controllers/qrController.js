import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import QRSession from '../models/QRSession.js';
import User from '../models/User.js';

// Generate QR code for login from SPVRM machine
export const generateLoginQR = async (req, res) => {
  try {
    // Create a unique session code
    const sessionCode = uuidv4();
    
    // Create QR session in DB
    const qrSession = await QRSession.create({
      sessionCode,
      type: 'login',
      status: 'pending',
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    // Generate QR code as data URL
    const qrString = `${process.env.MACHINE_URL || 'https://fam-bottling.com'}/qr-auth?session=${sessionCode}`;
    const qrImage = await qrcode.toDataURL(qrString);

    res.status(200).json({
      message: 'QR code generated for login',
      sessionCode,
      qrImage,
      expiresIn: 600, // 10 minutes in seconds
      qrUrl: qrString
    });
  } catch (err) {
    console.error('Generate QR error:', err);
    res.status(500).json({ message: err.message || 'Failed to generate QR code' });
  }
};

// Authenticate via QR code from mobile device
export const authenticateWithQR = async (req, res) => {
  try {
    const { sessionCode } = req.body;

    if (!sessionCode) {
      return res.status(400).json({ message: 'Session code is required' });
    }

    // Find QR session
    const qrSession = await QRSession.findOne({ sessionCode });

    if (!qrSession) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if session is expired
    if (new Date() > qrSession.expiresAt) {
      await QRSession.updateOne({ _id: qrSession._id }, { status: 'expired' });
      return res.status(401).json({ message: 'QR code session expired' });
    }

    // Get current user from token (mobile device)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated on mobile device' });
    }

    // Update QR session with user ID
    const updatedSession = await QRSession.findByIdAndUpdate(
      qrSession._id,
      { userId, status: 'authenticated' },
      { new: true }
    );

    res.status(200).json({
      message: 'Mobile device authenticated successfully',
      sessionCode,
      status: 'authenticated'
    });
  } catch (err) {
    console.error('QR auth error:', err);
    res.status(500).json({ message: err.message || 'Authentication failed' });
  }
};

// Poll for authentication status (SPVRM machine polls this)
export const checkQRStatus = async (req, res) => {
  try {
    const { sessionCode } = req.params;

    if (!sessionCode) {
      return res.status(400).json({ message: 'Session code is required' });
    }

    const qrSession = await QRSession.findOne({ sessionCode }).populate('userId', 'name email role isReturning totalCashback');

    if (!qrSession) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if expired
    if (new Date() > qrSession.expiresAt) {
      await QRSession.updateOne({ _id: qrSession._id }, { status: 'expired' });
      return res.status(200).json({
        status: 'expired',
        message: 'QR code session has expired'
      });
    }

    if (qrSession.status === 'authenticated' && qrSession.userId) {
      // Generate JWT token for SPVRM machine
      const token = jwt.sign(
        { id: qrSession.userId._id, role: qrSession.userId.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        status: 'authenticated',
        message: 'User authenticated',
        token,
        user: {
          id: qrSession.userId._id,
          name: qrSession.userId.name,
          email: qrSession.userId.email,
          role: qrSession.userId.role,
          isReturning: qrSession.userId.isReturning,
          totalCashback: qrSession.userId.totalCashback
        }
      });
    }

    // Still pending
    res.status(200).json({
      status: 'pending',
      message: 'Waiting for mobile device authentication',
      sessionCode
    });
  } catch (err) {
    console.error('Check QR status error:', err);
    res.status(500).json({ message: err.message || 'Failed to check status' });
  }
};

// Generate QR code for scanning session on SPVRM
export const generateScanSessionQR = async (req, res) => {
  try {
    const sessionCode = uuidv4();

    const qrSession = await QRSession.create({
      sessionCode,
      type: 'scan_session',
      status: 'pending',
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    // Generate QR code for displaying on SPVRM
    const qrString = `${process.env.MACHINE_URL || 'https://fam-bottling.com'}/qr-scan?session=${sessionCode}`;
    const qrImage = await qrcode.toDataURL(qrString);

    res.status(200).json({
      message: 'Scan session QR code generated',
      sessionCode,
      qrImage,
      qrUrl: qrString,
      expiresIn: 600
    });
  } catch (err) {
    console.error('Generate scan session QR error:', err);
    res.status(500).json({ message: err.message || 'Failed to generate QR code' });
  }
};
