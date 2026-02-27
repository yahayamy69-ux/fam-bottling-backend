import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from '../routes/auth.js';
import supplyRoutes from '../routes/supply.js';
import adminRoutes from '../routes/admin.js';
import contactRoutes from '../routes/contact.js';
import qrRoutes from '../routes/qr.js';
import bottleScanRoutes from '../routes/bottleScan.js';
import errorHandler from '../middleware/errorHandler.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection with timeout settings
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fam_bottling', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.log('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/supply', supplyRoutes);
app.use('/api/bottle-scan', bottleScanRoutes);
app.use('/api/qr', qrRoutes);
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
