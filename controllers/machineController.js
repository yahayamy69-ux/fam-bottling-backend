import crypto from 'crypto';
import qrcode from 'qrcode';
import Machine from '../models/Machine.js';
import MachineToken from '../models/MachineToken.js';
import MachineSession from '../models/MachineSession.js';
import mongoose from 'mongoose';

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const getFrontendUrl = (req) => {
  const configuredUrl = (process.env.MACHINE_URL || process.env.FRONTEND_URL || '')
    .replace(/[\r\n]+/g, '')
    .trim();
  const requestOrigin = String(req.headers.origin || '').replace(/[\r\n]+/g, '').trim() || `${req.protocol}://${req.get('host')}`;
  const localPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

  if (requestOrigin && !localPattern.test(requestOrigin)) {
    return requestOrigin;
  }

  if (configuredUrl && !localPattern.test(configuredUrl)) {
    return configuredUrl;
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

// Generate a secure machine login QR code for a machine ID.
// This creates a one-time token, stores only the hashed token, and returns a QR code URL.
export const generateMachineQRCode = async (req, res) => {
  try {
    const { machineId, name } = req.body;

    if (!machineId) {
      return res.status(400).json({ message: 'machineId is required' });
    }

    const normalizedMachineId = machineId.toUpperCase().trim();
    let machine = await Machine.findOne({ machineId: normalizedMachineId });

    if (!machine) {
      machine = await Machine.create({ machineId: normalizedMachineId, name: name || normalizedMachineId });
    }

    if (!machine.active) {
      return res.status(403).json({ message: 'Machine is not active' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await MachineToken.create({ machineId: normalizedMachineId, tokenHash, expiresAt });

    const frontendUrl = getFrontendUrl(req);
    if (!frontendUrl) {
      return res.status(500).json({
        message: 'Frontend URL is not publicly available. Set MACHINE_URL or FRONTEND_URL to a public deploy URL to generate machine QR codes.'
      });
    }

    const loginUrl = buildFrontendUrl(frontendUrl, '/machine-login', {
      machine_id: normalizedMachineId,
      token
    });
    console.log('Generated machine login QR string:', loginUrl);
    const qrImage = await qrcode.toDataURL(loginUrl);

    res.status(200).json({
      message: 'Machine QR generated successfully',
      machineId: normalizedMachineId,
      loginUrl,
      qrImage,
      expiresIn: 600
    });
  } catch (err) {
    console.error('Machine QR generation error:', err);
    res.status(500).json({ message: err.message || 'Failed to generate machine QR code' });
  }
};

// Start or resume a machine login session from the machine QR URL.
// If the user is already authenticated, attach the user immediately.
// If not, create a pending session that can be completed after the user logs in.
export const startMachineSession = async (req, res) => {
  try {
    const { machineId, token } = req.body;
    if (!machineId || !token) {
      return res.status(400).json({ message: 'machineId and token are required' });
    }

    const normalizedMachineId = machineId.toUpperCase().trim();
    const machine = await Machine.findOne({ machineId: normalizedMachineId, active: true });

    if (!machine) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    const tokenHash = hashToken(token);
    const machineToken = await MachineToken.findOne({
      machineId: normalizedMachineId,
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!machineToken) {
      return res.status(401).json({ message: 'Machine token is invalid, expired, or already used' });
    }

    machineToken.used = true;
    await machineToken.save();

    const sessionExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes for machine session
    const machineSession = await MachineSession.create({
      machineId: normalizedMachineId,
      expiresAt: sessionExpiresAt,
      status: req.user ? 'active' : 'pending',
      userId: req.user ? req.user.id : null
    });

    if (req.user) {
      machine.lastUsedAt = new Date();
      await machine.save();
      return res.status(200).json({
        message: 'Machine session started and user authenticated',
        status: 'active',
        sessionId: machineSession._id,
        machineId: normalizedMachineId
      });
    }

    return res.status(200).json({
      message: 'Machine session started and pending user login',
      status: 'pending',
      sessionId: machineSession._id,
      machineId: normalizedMachineId
    });
  } catch (err) {
    console.error('Machine session start error:', err);
    res.status(500).json({ message: err.message || 'Failed to start machine session' });
  }
};

// Complete a pending machine session once the user logs in.
export const completeMachineSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      console.warn('Invalid machine sessionId format:', sessionId);
      return res.status(400).json({ message: 'Invalid sessionId format' });
    }

    const session = await MachineSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Machine session not found' });
    }

    if (session.expiresAt <= new Date()) {
      session.status = 'expired';
      await session.save();
      return res.status(401).json({ message: 'Machine session has expired' });
    }

    if (session.status === 'active' && session.userId) {
      return res.status(200).json({ message: 'Machine session already active', status: 'active' });
    }

    session.userId = req.user.id;
    session.status = 'active';
    session.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await session.save();

    const machine = await Machine.findOne({ machineId: session.machineId });
    if (machine) {
      machine.lastUsedAt = new Date();
      await machine.save();
    }

    res.status(200).json({
      message: 'Machine login completed successfully',
      status: 'active',
      sessionId: session._id,
      machineId: session.machineId
    });
  } catch (err) {
    console.error('Machine session complete error:', err);
    res.status(500).json({ message: err.message || 'Failed to complete machine session' });
  }
};
