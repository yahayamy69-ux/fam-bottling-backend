import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RedeemCode from './models/RedeemCode.js';

dotenv.config();

async function createNewTestCodes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing codes for fresh test
    await RedeemCode.deleteMany({});
    console.log('Cleared existing codes');

    // Create new test codes
    const testCodes = [
      { code: 'R2080', points: 20 },
      { code: 'R4090', points: 40 },
      { code: 'R15088', points: 150 },
      { code: 'R300055', points: 3000 },
      { code: 'R120077', points: 1200 }
    ];

    const created = await RedeemCode.insertMany(testCodes);
    console.log('✅ Created new test codes:');
    created.forEach(code => {
      console.log(`  - ${code.code}: ${code.points} points`);
    });

    await mongoose.disconnect();
    console.log('✅ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createNewTestCodes();
