import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import QRSession from '../models/QRSession.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const sanitizeUrlValue = (value) => {
  if (value === undefined || value === null) return '';
  let normalized = String(value).trim();
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1);
  }
  return normalized.replace(/[\r\n]+/g, '').trim();
};

const getFrontendUrl = (req) => {
  const machineUrl = sanitizeUrlValue(process.env.MACHINE_URL);
  const frontendUrl = sanitizeUrlValue(process.env.FRONTEND_URL);
  const requestOrigin = sanitizeUrlValue(req.headers.origin) || `${req.protocol}://${req.get('host')}`;
  const localPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

  // Prefer the actual browser origin for QR redirects, then fall back to configured deploy URLs.
  if (requestOrigin && !localPattern.test(requestOrigin)) {
    return requestOrigin;
  }

  const candidates = [machineUrl, frontendUrl];
  for (const candidate of candidates) {
    if (candidate && !localPattern.test(candidate)) {
      return candidate;
    }
  }

  return null;
};

const buildFrontendUrl = (frontendUrl, path, params = {}) => {
  try {
    const url = new URL(path, frontendUrl.endsWith('/') ? frontendUrl : `${frontendUrl}/`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  } catch (err) {
    console.error('Failed to build frontend URL:', err, { frontendUrl, path, params });
    return null;
  }
};

// Generate QR code for login from SPVRM machine
export const generateLoginQR = async (req, res) => {
  try {
    // Create a unique session code and login code
    const sessionCode = uuidv4();
    const loginCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Create QR session in DB
    const qrSession = await QRSession.create({
      sessionCode,
      loginCode,
      type: 'login',
      status: 'pending',
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    // Generate QR code as data URL
    const frontendUrl = getFrontendUrl(req);
    if (!frontendUrl) {
      return res.status(500).json({
        message: 'Frontend URL is not publicly available. Set MACHINE_URL or FRONTEND_URL to a public deploy URL to generate QR codes.'
      });
    }
    const qrString = buildFrontendUrl(frontendUrl, '/qr-auth', {
      session: sessionCode
    });
    console.log('Generated login QR string:', qrString);
    const qrImage = await qrcode.toDataURL(qrString);

    res.status(200).json({
      message: 'QR code generated for login',
      sessionCode,
      loginCode,
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
    // Diagnostic logging to help track down mysterious validation errors
    console.log('QR auth request body:', req.body);
    console.log('QR auth request headers (Authorization masked):', {
      authorization: req.headers.authorization ? '***masked***' : null
    });
    let { sessionCode } = req.body;
    if (typeof sessionCode === 'string') {
      sessionCode = sessionCode.replace(/[\r\n]+/g, '').trim();
    }

    console.log('QR auth sessionCode:', sessionCode);

    if (!sessionCode) {
      return res.status(400).json({ message: 'Session code is required' });
    }

    // Find QR session by sessionCode string (not by Mongo ObjectId)
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

    // Update QR session with user ID (defensive: ensure _id is a valid ObjectId)
    if (!mongoose.Types.ObjectId.isValid(qrSession._id.toString())) {
      console.error('QRSession._id is not a valid ObjectId:', qrSession._id);
      return res.status(500).json({ message: 'Server-side session id error' });
    }

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
    // Log detailed error info for debugging
    console.error('QR auth error:', err && err.message, err);
    if (err && err.name === 'ValidationError') {
      console.error('Mongoose validation errors:', err.errors);
    }
    // Return sanitized message to client while including original for easier debugging
    res.status(500).json({ message: err.message || 'Authentication failed' });
  }
};

export const authenticateWithCode = async (req, res) => {
  try {
    const { loginCode } = req.body;
    const userId = req.user?.id;

    if (!loginCode) {
      return res.status(400).json({ message: 'Login code is required' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated on mobile device' });
    }

    const qrSession = await QRSession.findOne({ loginCode, type: 'login', status: 'pending' });

    if (!qrSession) {
      return res.status(404).json({ message: 'Login code not found or already used' });
    }

    if (new Date() > qrSession.expiresAt) {
      await QRSession.updateOne({ _id: qrSession._id }, { status: 'expired' });
      return res.status(401).json({ message: 'Login code has expired' });
    }

    await QRSession.findByIdAndUpdate(qrSession._id, {
      userId,
      status: 'authenticated'
    });

    res.status(200).json({
      message: 'Mobile device authenticated successfully',
      loginCode,
      status: 'authenticated'
    });
  } catch (err) {
    console.error('Code auth error:', err);
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
    const frontendUrl = getFrontendUrl(req);
    if (!frontendUrl) {
      return res.status(500).json({
        message: 'Frontend URL is not publicly available. Set FRONTEND_URL to a public deploy URL to generate scan session QR codes.'
      });
    }

    const qrString = buildFrontendUrl(frontendUrl, '/qr-scan', {
      session: sessionCode
    });
    console.log('Generated scan session QR string:', qrString);
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
