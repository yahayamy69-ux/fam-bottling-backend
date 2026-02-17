import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fam_bottling');
    console.log('✅ MongoDB Connected');

    // Admin credentials
    const adminName = 'Admin User';
    const adminEmail = 'admin@fambottling.com';
    const adminPassword = 'Admin@123456';

    // Check if admin already exists
    const adminExists = await User.findOne({ email: adminEmail });
    if (adminExists) {
      console.log('⚠️  Admin user already exists with this email!');
      console.log(`Email: ${adminExists.email}`);
      console.log(`Role: ${adminExists.role}`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isReturning: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Name: ${admin.name}`);
    console.log(`Role: ${admin.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Use these credentials to login to the admin dashboard at /admin');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin user:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdminUser();
