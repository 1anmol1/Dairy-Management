require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ role: 'superadmin' });
  if (existing) {
    console.log('Superadmin already exists:', existing.phone);
    process.exit(0);
  }

  const superadmin = await User.create({
    name: 'Super Admin',
    phone: '9999999999',
    username: 'superadmin',
    email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@amrit.in',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Amrit@SuperAdmin2024',
    role: 'superadmin'
  });

  console.log('✅ Superadmin created:', superadmin.phone);
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
