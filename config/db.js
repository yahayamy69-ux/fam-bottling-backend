import mongoose from 'mongoose';

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

const connectDB = async () => {
  try {
    const mongoUri = getMongoUri();
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`❌ Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;
