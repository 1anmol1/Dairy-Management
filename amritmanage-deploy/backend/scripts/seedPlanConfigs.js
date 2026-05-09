/**
 * One-time seed: creates default PlanConfig documents.
 * Run: node backend/scripts/seedPlanConfigs.js
 * Or called automatically from server startup if configs are missing.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const PlanConfig = require('../models/PlanConfig');

const defaults = [
  {
    plan: 'silver',
    label: 'Amrit Silver',
    description: 'Entry plan – basic usage only',
    monthlyPrice: 99,
    setupFee: 499,
    features: { whatsapp_alerts: false, pdf_billing: false, advanced_reports: false, custom_message_templates: false },
    limits: { maxCustomers: 50, maxStaff: 2 }
  },
  {
    plan: 'gold',
    label: 'Amrit Gold',
    description: 'Main plan – full working system',
    monthlyPrice: 199,
    setupFee: 1499,
    features: { whatsapp_alerts: true, pdf_billing: true, advanced_reports: false, custom_message_templates: false },
    limits: { maxCustomers: 300, maxStaff: 7 }
  },
  {
    plan: 'platinum',
    label: 'Amrit Platinum',
    description: 'Premium plan – advanced usage',
    monthlyPrice: 399,
    setupFee: 1999,
    features: { whatsapp_alerts: true, pdf_billing: true, advanced_reports: true, custom_message_templates: true },
    limits: { maxCustomers: 999999, maxStaff: 999999 }
  }
];

async function seedPlanConfigs(existingConnection = null) {
  const shouldDisconnect = !existingConnection;
  if (!existingConnection) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  let seeded = 0;
  for (const cfg of defaults) {
    const result = await PlanConfig.findOneAndUpdate(
      { plan: cfg.plan },
      { $setOnInsert: cfg },
      { upsert: true, new: true }
    );
    if (result) seeded++;
    console.log(`✓ ${cfg.plan} plan config seeded.`);
  }
  if (shouldDisconnect) {
    await mongoose.disconnect();
    console.log('Done.');
  }
  return seeded;
}

// Run directly
if (require.main === module) {
  seedPlanConfigs().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { seedPlanConfigs };
