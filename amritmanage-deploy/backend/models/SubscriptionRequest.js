const mongoose = require('mongoose');

/**
 * SubscriptionRequest — stores manual subscription requests.
 * Owner fills in their details, superadmin calls them and activates.
 */
const subscriptionRequestSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,   // optional — public /start form submissions have no ownerId
    default: null,
    index: true
  },
  // Contact & billing details
  contactName:  { type: String, required: true, trim: true },
  contactEmail: { type: String, required: true, trim: true, lowercase: true },
  contactPhone: { type: String, required: true, trim: true },
  address:      { type: String, required: true, trim: true },
  state:        { type: String, required: true, trim: true },
  pincode:      { type: String, required: true, trim: true, match: [/^\d{6}$/, 'Enter a valid 6-digit pincode'] },
  companyName:  { type: String, trim: true, default: '' },

  // Plan requested
  plan:         { type: String, enum: ['silver', 'gold', 'platinum'], required: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  months:       { type: Number, default: 1 },

  // Status
  status: {
    type: String,
    enum: ['pending', 'called', 'activated', 'cancelled'],
    default: 'pending'
  },
  adminNotes: { type: String, default: '' },
  activatedAt: { type: Date, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('SubscriptionRequest', subscriptionRequestSchema);
