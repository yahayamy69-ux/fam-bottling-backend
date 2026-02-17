import express from 'express';
import {
  getAllSupplies,
  updateSupplyStatus,
  toggleReturningCustomer,
  getUserDetails
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// Get all supplies
router.get('/supplies', getAllSupplies);

// Update supply status
router.patch('/supply/:id', updateSupplyStatus);

// Toggle returning customer status
router.patch('/user/:userId/returning', toggleReturningCustomer);

// Get user details
router.get('/user/:userId', getUserDetails);

export default router;
