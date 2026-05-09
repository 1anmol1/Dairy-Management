const mongoose = require('mongoose');

/**
 * PlanConfig — stores the canonical feature set for each plan.
 *
 * Rules:
 * - One document per plan name (silver / gold / platinum).
 * - Superadmin can edit features at any time.
 * - Existing owners keep their current features until their subscription
 *   renews (expiresAt passes). On renewal the new plan config is applied.
 * - Trial users always get the gold plan features regardless of their
 *   subscription.plan field.
 */
const planConfigSchema = new mongoose.Schema({
  plan: {
    type: String,
    enum: ['silver', 'gold', 'platinum'],
    required: true,
    unique: true
  },
  // Human-readable display info
  label: { type: String, required: true },
  description: { type: String, default: '' },
  monthlyPrice: { type: Number, default: 0 },
  setupFee: { type: Number, default: 0 },

  // Feature flags — the source of truth for new/renewing subscribers
  features: {
    whatsapp_alerts:          { type: Boolean, default: false },
    pdf_billing:              { type: Boolean, default: false },
    advanced_reports:         { type: Boolean, default: false },
    custom_message_templates: { type: Boolean, default: false }
  },

  // Limits (informational — enforced in app logic)
  limits: {
    maxCustomers: { type: Number, default: 50 },
    maxStaff:     { type: Number, default: 2 }
  },

  isActive: { type: Boolean, default: true },

  // Track who last changed this config and when
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

module.exports = mongoose.model('PlanConfig', planConfigSchema);
