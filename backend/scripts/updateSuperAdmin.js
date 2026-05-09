/**
 * Run once to add username to existing superadmin.
 * node scripts/updateSuperAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('../models/User');

  const sa = await User.findOne({ role: 'superadmin' });
  if (!sa) { console.log('No superadmin found.'); process.exit(0); }

  if (!sa.username) {
    sa.username = 'superadmin';
    await sa.save({ validateBeforeSave: false });
    console.log('✅ Username "superadmin" added to superadmin account.');
  } else {
    console.log('Username already set:', sa.username);
  }

  if (!sa.email) {
    sa.email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@amrit.in';
    await sa.save({ validateBeforeSave: false });
    console.log('✅ Email added:', sa.email);
  }

  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
