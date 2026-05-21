import express from 'express';
import { 
  submitBankAccount, 
  getBankAccount, 
  getAllUserBankAccounts,
  markPaymentProcessed
} from '../controllers/bankAccountController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes
router.post('/submit', protect, submitBankAccount);
router.get('/my-account', protect, getBankAccount);

// Admin routes
router.get('/admin/all-accounts', protect, getAllUserBankAccounts);
router.post('/admin/mark-payment', protect, markPaymentProcessed);

export default router;
