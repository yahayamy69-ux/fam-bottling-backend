import express from 'express';
import { generateESPCode, redeemESPCode } from '../controllers/espController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/esp/generate-code
 * Generate a new 4-digit code for ESP32
 * No authentication required
 */
router.post('/generate-code', generateESPCode);

/**
 * POST /api/esp/redeem-code
 * Redeem a code and add ₦10 to user's balance
 * Requires authentication
 */
router.post('/redeem-code', authMiddleware, redeemESPCode);

export default router;
