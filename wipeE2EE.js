import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Message } from './src/models/Message.js';
import { Device } from './src/models/Device.js';

dotenv.config();

async function runWipe() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nexus_zero_trust');
    console.log('[+] Connected to MongoDB');

    // Wipe old messages and devices
    const msgRes = await Message.deleteMany({});
    console.log(`[+] Deleted ${msgRes.deletedCount} old messages.`);

    const devRes = await Device.deleteMany({});
    console.log(`[+] Deleted ${devRes.deletedCount} old devices.`);

    // Note: We don't wipe ChatRooms, just the content
    console.log('[+] E2EE Environment Wipe Complete! Ready for Pro Level upgrade.');
  } catch (err) {
    console.error('[-] Wipe Error:', err);
  } finally {
    process.exit(0);
  }
}

runWipe();
