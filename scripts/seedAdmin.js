import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/configs/db.js';
import { User } from '../src/models/User.js';

async function main() {
  await connectDB();

  const password = 'nexus123';

  const seedUsers = [
    {
      name: 'Admin User',
      email: 'admin@nexus.com',
      role: 'ADMIN',
      mfaEnabled: true,
      trustScore: 98,
    },
    {
      name: 'Manager User',
      email: 'manager@nexus.com',
      role: 'MANAGER',
      mfaEnabled: false,
      trustScore: 96,
    },
    {
      name: 'Staff User',
      email: 'staff@nexus.com',
      role: 'STAFF',
      mfaEnabled: false,
      trustScore: 94,
    },
  ];

  for (const info of seedUsers) {
    let user = await User.findOne({ email: info.email });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({
        name: info.name,
        email: info.email,
        passwordHash,
        role: info.role,
        isLocked: false,
        mfaEnabled: info.mfaEnabled,
        trustScore: info.trustScore,
      });
      console.log('Created user:', info.email, 'role =', info.role);
    } else {
      console.log('User already exists:', info.email, 'role =', user.role);
    }
  }

  console.log('\nYou can now login with:');
  console.log(`  Password (all users): ${password}`);
  console.log('  Admin   : admin@nexus.com');
  console.log('  Manager : manager@nexus.com');
  console.log('  Staff   : staff@nexus.com');

  await disconnectDB();
}

main().catch((err) => {
  console.error('Seed admin error:', err);
  process.exit(1);
});

