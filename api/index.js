import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from '../routes/auth.js';
import supplyRoutes from '../routes/supply.js';
import adminRoutes from '../routes/admin.js';
import contactRoutes from '../routes/contact.js';
import qrRoutes from '../routes/qr.js';
import machineRoutes from '../routes/machine.js';
import bottleScanRoutes from '../routes/bottleScan.js';
import barcodeScannerGameRoutes from '../routes/barcodeScannerGame.js';
import rechargeRoutes from '../routes/recharge.js';
import claimRoutes from '../routes/claim.js';
import errorHandler from '../middleware/errorHandler.js';

dotenv.config();

const sanitizeEnvValue = (value) => {
  if (value === undefined || value === null) return '';
  let normalized = String(value).trim();
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1);
  }
  return normalized.replace(/\\r|\\n/g, '').trim();
};

const getMongoUri = () => {
  const envUri = sanitizeEnvValue(process.env.MONGODB_URI);
  return envUri || 'mongodb://localhost:27017/fam_bottling';
};

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection with timeout settings
const connectToDatabase = async () => {
  try {
    const mongoUri = getMongoUri();
    const mongoHost = mongoUri.includes('@')
      ? mongoUri.split('@')[1].split('/')[0]
      : mongoUri;
    console.log('🔗 Connecting to MongoDB host:', mongoHost);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      bufferCommands: false
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
};

const dbConnectionPromise = connectToDatabase();

const ensureDbConnected = async (req, res, next) => {
  try {
    await dbConnectionPromise;
  } catch (err) {
    return res.status(503).json({
      message: 'Database connection is not ready. Please try again later.'
    });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection is not ready. Please try again later.'
    });
  }

  next();
};

app.use(ensureDbConnected);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/supply', supplyRoutes);
app.use('/api/bottle-scan', bottleScanRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/scanner-game', barcodeScannerGameRoutes);
app.use('/api/recharge', rechargeRoutes);
app.use('/api/claim', claimRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;
