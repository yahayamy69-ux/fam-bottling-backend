import express from 'express';
import { generateCode, processScan, getUserScannerStats } from '../controllers/barcodeScannerGameController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate a new code/barcode to display to user
router.post('/generate-code', protect, generateCode);

// Process a scanned barcode/code
router.post('/process-scan', protect, processScan);

// Get user's scanner earnings
router.get('/my-stats', protect, getUserScannerStats);

export default router;
