import { Device } from '../models/Device.js';
import { User } from '../models/User.js';

// 1. Register a new device with its Public Key
export const registerDevice = async (req, res) => {
  try {
    const { deviceId, deviceName, publicKey } = req.body;
    const userId = req.user.id; // Assumes requireAuth middleware is used

    if (!deviceId || !publicKey) {
      return res.status(400).json({ message: 'Missing deviceId or publicKey' });
    }

    // Check if device already exists
    let device = await Device.findOne({ deviceId, userId });
    
    if (device) {
      // Update existing device's key (e.g., if re-installed but same ID)
      device.publicKey = publicKey;
      device.deviceName = deviceName || device.deviceName;
      device.isActive = true;
      device.lastActiveAt = new Date();
      await device.save();
    } else {
      // Create new device
      device = new Device({
        userId,
        deviceId,
        deviceName,
        publicKey
      });
      await device.save();
    }

    res.status(200).json({ message: 'Device registered successfully for E2EE', device });
  } catch (error) {
    console.error('Error in E2EE registerDevice:', error);
    res.status(500).json({ message: 'Server error during device registration' });
  }
};

// 2. Get Public Keys of specific users (to send messages to them)
export const getPublicKeys = async (req, res) => {
  try {
    const { userIds } = req.body; // Array of user IDs
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Invalid payload, expected userIds array' });
    }

    // Get all active devices for these users
    const devices = await Device.find({ 
      userId: { $in: userIds },
      isActive: true 
    }).select('userId deviceId publicKey deviceName');

    // Group by userId for easier client processing
    const keysByUser = {};
    devices.forEach(device => {
      const uid = device.userId.toString();
      if (!keysByUser[uid]) {
        keysByUser[uid] = [];
      }
      keysByUser[uid].push(device);
    });

    res.status(200).json({ keys: keysByUser });
  } catch (error) {
    console.error('Error in E2EE getPublicKeys:', error);
    res.status(500).json({ message: 'Server error retrieving public keys' });
  }
};

// 3. Setup Encrypted Backup (Solution 2)
export const setupBackup = async (req, res) => {
  try {
    const { encryptedMasterKey, masterKeySalt, masterKeyIv } = req.body;
    const userId = req.user.id;

    if (!encryptedMasterKey || !masterKeySalt || !masterKeyIv) {
      return res.status(400).json({ message: 'Missing backup encryption materials' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.hasE2EEBackup = true;
    user.encryptedMasterKey = encryptedMasterKey;
    user.masterKeySalt = masterKeySalt;
    user.masterKeyIv = masterKeyIv;
    
    await user.save();

    res.status(200).json({ message: 'E2EE Backup setup successfully' });
  } catch (error) {
    console.error('Error in E2EE setupBackup:', error);
    res.status(500).json({ message: 'Server error setting up backup' });
  }
};

// 4. Retrieve Encrypted Backup (Solution 2)
export const getBackup = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('hasE2EEBackup encryptedMasterKey masterKeySalt masterKeyIv');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.hasE2EEBackup) {
      return res.status(404).json({ message: 'No E2EE backup found for this user' });
    }

    res.status(200).json({ 
      encryptedMasterKey: user.encryptedMasterKey,
      masterKeySalt: user.masterKeySalt,
      masterKeyIv: user.masterKeyIv
    });
  } catch (error) {
    console.error('Error in E2EE getBackup:', error);
    res.status(500).json({ message: 'Server error retrieving backup' });
  }
};
