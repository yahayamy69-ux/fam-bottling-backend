import express from 'express';
import { processRechargeQRCode } from '../controllers/rechargeController.js';

const router = express.Router();

// Public route for mobile devices to complete recharge via QR link.
router.get('/qr', processRechargeQRCode);

export default router;
