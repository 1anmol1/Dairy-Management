const mongoose = require('mongoose');

/**
 * SubscriptionRequest — stores manual subscription requests.
 * Owner fills in their details, superadmin calls them and activates.
 * Ads-landing leads are tracked with Meta Pixel + CAPI attribution.
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
  contactEmail: { type: String, required: false, trim: true, lowercase: true, default: '' },
  contactPhone: { type: String, required: true, trim: true },
  address:      { type: String, trim: true, default: '' },
  state:        { type: String, trim: true, default: '' },
  pincode:      { type: String, trim: true, default: '' },
  companyName:  { type: String, trim: true, default: '' },
  city:         { type: String, trim: true, default: '' },
  district:     { type: String, trim: true, default: '' },

  // Plan requested
  plan:         { type: String, enum: ['silver', 'gold', 'platinum'], required: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  months:       { type: Number, default: 1 },

  // Renewal metadata
  isRenewal:    { type: Boolean, default: false },
  currentPlan:  { type: String, default: null },
  changeType:   { type: String, enum: ['upgrade', 'downgrade', 'none', null], default: null },

  // Traffic source — 'ads_landing' for Meta ads traffic, 'organic' for everything else
  source: { type: String, default: 'organic', index: true },

  // Meta attribution data (ads_landing only)
  fbclid: { type: String, default: null },  // Facebook Click ID from URL param
  fbc:    { type: String, default: null },  // _fbc cookie value
  fbp:    { type: String, default: null },  // _fbp cookie value
  ipAddress: { type: String, default: null }, // Client's IP address (unhashed)
  userAgent: { type: String, default: null }, // Client's browser user agent

  // External ID for Meta CAPI deduplication (hashed phone)
  externalId: { type: String, default: null },

  // Meta Pixel event IDs — same ID used in browser + CAPI for deduplication
  leadEventId:         { type: String, default: null },
  registrationEventId: { type: String, default: null },
  trialEventId:        { type: String, default: null },
  subscribeEventId:    { type: String, default: null },

  // UTM params
  utm_source:   { type: String, default: null },
  utm_medium:   { type: String, default: null },
  utm_campaign: { type: String, default: null },
  utm_content:  { type: String, default: null },
  utm_term:     { type: String, default: null },

  // Status
  status: {
    type: String,
    enum: ['pending', 'called', 'activated', 'cancelled'],
    default: 'pending'
  },
  adminNotes:  { type: String, default: '' },
  activatedAt: { type: Date, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('SubscriptionRequest', subscriptionRequestSchema);
