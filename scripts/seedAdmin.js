import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/configs/db.js';
import { User } from '../src/models/User.js';

async function main() {
  await connectDB();

  const email = 'admin@nexus.com';
  const password = 'nexus123';

  let user = await User.findOne({ email });

  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({
      name: 'Admin User',
      email,
      passwordHash,
      role: 'ADMIN',
      isLocked: false,
      mfaEnabled: true,
      trustScore: 98,
    });
    console.log('Created admin user:', email);
  } else {
    console.log('Admin user already exists:', email);
  }

  console.log('You can now login with:');
  console.log(`  Email   : ${email}`);
  console.log(`  Password: ${password}`);

  await disconnectDB();
}

main().catch((err) => {
  console.error('Seed admin error:', err);
  process.exit(1);
});

