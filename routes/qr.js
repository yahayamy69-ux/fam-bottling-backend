import express from 'express';
import {
  generateLoginQR,
  authenticateWithQR,
  authenticateWithCode,
  checkQRStatus,
  generateScanSessionQR
} from '../controllers/qrController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate QR code for login on SPVRM machine (no auth needed)
router.post('/generate-login', generateLoginQR);

// Authenticate via QR code from mobile device (requires auth on mobile)
router.post('/authenticate', protect, authenticateWithQR);
router.post('/authenticate-with-code', protect, authenticateWithCode);

// Check QR session status (SPVRM polls this, no auth needed)
router.get('/status/:sessionCode', checkQRStatus);

// Generate QR for scanning session
router.post('/generate-scan-session', generateScanSessionQR);

export default router;
