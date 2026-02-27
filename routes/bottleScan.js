import express from 'express';
import {
  submitScannedBottle,
  getUserScannedBottles,
  getScannedBottleById,
  updateScannedBottle,
  verifyBarcode
} from '../controllers/bottleScanController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// All bottle scan routes require authentication
router.use(protect);

// Submit scanned bottle
router.post('/', submitScannedBottle);

// Verify barcode
router.post('/verify-barcode', verifyBarcode);

// Get user's scanned bottles
router.get('/my', getUserScannedBottles);

// Get specific scanned bottle
router.get('/:id', getScannedBottleById);

// Update scanned bottle status (admin only)
router.patch('/:id', adminOnly, updateScannedBottle);

export default router;
