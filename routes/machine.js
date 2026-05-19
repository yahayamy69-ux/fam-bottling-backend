import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  generateMachineQRCode,
  startMachineSession,
  completeMachineSession
} from '../controllers/machineController.js';

const router = express.Router();

// Generate a new machine QR code and one-time token
router.post('/generate-qr', protect, generateMachineQRCode);

// Start a machine login session using machine_id and token from QR scan
router.post('/session', startMachineSession);

// Complete a pending machine session after user login
router.post('/session/complete', protect, completeMachineSession);

export default router;
