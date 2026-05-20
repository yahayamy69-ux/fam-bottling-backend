import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RedeemCode from './models/RedeemCode.js';

dotenv.config();

const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

const createTestCodes = async () => {
  await connectToDatabase();

  try {
    // Create sample reward codes
    const testCodes = [
      { code: 'R3050', points: 30 },      // 4 digits: 30 points
      { code: 'R5075', points: 50 },      // 4 digits: 50 points
      { code: 'R10099', points: 100 },    // 5 digits: 100 points
      { code: 'R500042', points: 5000 },  // 6 digits: 5000 points
      { code: 'R100000', points: 1000 },  // 6 digits: 1000 points (50 seconds example)
    ];

    for (const codeData of testCodes) {
      const existingCode = await RedeemCode.findOne({ code: codeData.code.toUpperCase() });
      if (!existingCode) {
        const newCode = new RedeemCode({
          code: codeData.code.toUpperCase(),
          points: codeData.points,
          isRedeemed: false,
        });
        await newCode.save();
        console.log(`✅ Created reward code: ${codeData.code} (${codeData.points} points)`);
      } else {
        console.log(`⚠️  Code ${codeData.code} already exists`);
      }
    }

    console.log('\n✅ Test reward codes created successfully!');
    console.log('\nYou can now test with these codes:');
    testCodes.forEach(c => {
      console.log(`  - ${c.code} = ${c.points} points`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating test codes:', err);
    process.exit(1);
  }
};

createTestCodes();
