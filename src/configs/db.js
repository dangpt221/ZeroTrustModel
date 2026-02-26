import mongoose from 'mongoose';
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus_zero_trust';

export async function connectDB() {
  try {
    mongoose.set('strictQuery', false);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(` MongoDB connected: ${mongoose.connection.host}`);
    console.log(`   Database: ${mongoose.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(' MongoDB error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('  MongoDB disconnected. Reconnecting...');
    });

    return mongoose.connection;
  } catch (err) {
    console.error(' MongoDB connection failed:', err.message);
    console.error('   Make sure MongoDB is running: mongod --dbpath /data/db');
    process.exit(1);
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

export default mongoose;