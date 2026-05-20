import express from 'express';
import { redeemCode } from '../controllers/redeemController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/redeem - Redeem a reward code (authenticated)
router.post('/', protect, redeemCode);

export default router;
