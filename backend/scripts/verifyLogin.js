require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('../models/User');
  const user = await User.findOne({ phone: '9999999999' }).select('+password');
  if (!user) { console.log('ERROR: user not found'); process.exit(1); }
  const match = await bcrypt.compare('Amrit@SuperAdmin2024', user.password);
  console.log('Password match:', match);
  console.log('Role:', user.role);
  console.log('Active:', user.isActive);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
