import express from 'express';
import { claimAdd10 } from '../controllers/claimController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/claim/add10 - authenticated user claims +₦10
router.post('/add10', protect, claimAdd10);

export default router;
