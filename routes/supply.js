import express from 'express';
import {
  submitSupply,
  getUserSupplies,
  getSupplyById
} from '../controllers/supplyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All supply routes require authentication
router.use(protect);

// Submit new supply
router.post('/', submitSupply);

// Get user's supplies
router.get('/my', getUserSupplies);

// Get specific supply
router.get('/:id', getSupplyById);

export default router;
