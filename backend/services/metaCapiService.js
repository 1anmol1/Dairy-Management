/**
 * Meta Conversions API (CAPI) Service
 * Sends server-side conversion events to Meta for ads_landing leads only.
 *
 * Deduplication: browser Pixel and CAPI must use the SAME eventID.
 * The eventID is generated on the frontend and passed to the backend.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

const https = require('https');
const crypto = require('crypto');

const PIXEL_ID = process.env.META_PIXEL_ID || '2219545345248014';
const API_VERSION = 'v19.0';

// Hash a value with SHA-256 for Meta PII requirements
const hash = (value) => {
  if (!value) return null;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
};

// Hash phone — strip non-digits, add country code if 10 digits
const hashPhone = (phone) => {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10) clean = '91' + clean;
  return crypto.createHash('sha256').update(clean).digest('hex');
};

/**
 * Send a single event to Meta CAPI.
 * @param {Object} params
 * @param {string} params.eventName - e.g. 'Lead', 'CompleteRegistration', 'StartTrial', 'Subscribe'
 * @param {string} params.eventId   - UUID matching the browser Pixel eventID
 * @param {string} params.sourceUrl - URL where the event occurred
 * @param {Object} params.userData  - { email, phone, firstName, externalId, fbc, fbp, clientIp, userAgent }
 * @param {Object} params.customData - event-specific data (value, currency, plan_name, etc.)
 */
const sendCapiEvent = async (params) => {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('[META CAPI] META_CAPI_ACCESS_TOKEN not set — skipping CAPI event:', params.eventName);
    return;
  }

  const { eventName, eventId, sourceUrl, userData = {}, customData = {} } = params;

  const eventTime = Math.floor(Date.now() / 1000);

  const userDataPayload = {};
  if (userData.email)      userDataPayload.em         = [hash(userData.email)];
  if (userData.phone)      userDataPayload.ph         = [hashPhone(userData.phone)];
  if (userData.firstName)  userDataPayload.fn         = [hash(userData.firstName)];
  if (userData.externalId) userDataPayload.external_id = [hash(userData.externalId)];
  if (userData.fbc)        userDataPayload.fbc        = userData.fbc;
  if (userData.fbp)        userDataPayload.fbp        = userData.fbp;
  if (userData.clientIp)   userDataPayload.client_ip_address = userData.clientIp;
  if (userData.userAgent)  userDataPayload.client_user_agent = userData.userAgent;
  if (userData.city)       userDataPayload.ct         = [hash(userData.city)];
  if (userData.state)      userDataPayload.st         = [hash(userData.state)];
  if (userData.zip)        userDataPayload.zp         = [hash(userData.zip)];
  if (userData.country)    userDataPayload.country    = [hash(userData.country)];

  const event = {
    event_name:       eventName,
    event_time:       eventTime,
    event_id:         eventId,
    event_source_url: sourceUrl || 'https://amritmanage.eurekai.in/landing',
    action_source:    'website',
    user_data:        userDataPayload,
  };

  if (Object.keys(customData).length > 0) {
    event.custom_data = customData;
  }

  const body = JSON.stringify({
    data: [event],
  });

  const path = `/v19.0/${PIXEL_ID}/events?access_token=${accessToken}`;

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'graph.facebook.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[META CAPI] ${eventName} sent (eventId: ${eventId})`);
        } else {
          console.error(`[META CAPI] ${eventName} failed (${res.statusCode}):`, data);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('[META CAPI] Request error:', err.message);
      resolve(); // never throw — CAPI failure must not break the main flow
    });

    req.write(body);
    req.end();
  });
};

// ── Convenience wrappers ──────────────────────────────────────

const sendLeadEvent = (lead, eventId, req) => sendCapiEvent({
  eventName:  'Lead',
  eventId,
  sourceUrl:  req?.headers?.referer || 'https://amritmanage.eurekai.in/landing',
  userData: {
    email:      lead.contactEmail,
    phone:      lead.contactPhone,
    firstName:  lead.contactName?.split(' ')[0],
    fbc:        lead.fbc,
    fbp:        lead.fbp,
    clientIp:   req?.headers?.['x-forwarded-for'] || req?.ip,
    userAgent:  req?.headers?.['user-agent'],
  },
});

const sendCompleteRegistrationEvent = (lead, eventId, req) => sendCapiEvent({
  eventName:  'CompleteRegistration',
  eventId,
  sourceUrl:  req?.headers?.referer || 'https://amritmanage.eurekai.in/landing',
  userData: {
    email:      lead.contactEmail,
    phone:      lead.contactPhone,
    firstName:  lead.contactName?.split(' ')[0],
    fbc:        lead.fbc,
    fbp:        lead.fbp,
    clientIp:   req?.headers?.['x-forwarded-for'] || req?.ip,
    userAgent:  req?.headers?.['user-agent'],
    city:       lead.city,
    state:      lead.state,
    zip:        lead.pincode,
    country:    'IN',
  },
});

const sendStartTrialEvent = (lead, eventId) => sendCapiEvent({
  eventName:  'StartTrial',
  eventId,
  sourceUrl:  'https://amritmanage.eurekai.in/landing',
  userData: {
    email:      lead.contactEmail,
    phone:      lead.contactPhone,
    firstName:  lead.contactName?.split(' ')[0],
    externalId: lead.contactPhone,
    fbc:        lead.fbc,
    fbp:        lead.fbp,
    clientIp:   lead.ipAddress,
    userAgent:  lead.userAgent,
    country:    'IN',
  },
});

const sendSubscribeEvent = (lead, eventId, planData) => sendCapiEvent({
  eventName:  'Subscribe',
  eventId,
  sourceUrl:  'https://amritmanage.eurekai.in/landing',
  userData: {
    email:      lead.contactEmail,
    phone:      lead.contactPhone,
    firstName:  lead.contactName?.split(' ')[0],
    externalId: lead.contactPhone,
    fbc:        lead.fbc,
    fbp:        lead.fbp,
    clientIp:   lead.ipAddress,
    userAgent:  lead.userAgent,
    state:      lead.state,
    zip:        lead.pincode,
    country:    'IN',
  },
  customData: {
    value:        planData.value || 0,
    currency:     'INR',
    plan_name:    planData.planName,
    billing_cycle: planData.billingCycle,
  },
});

const sendViewContentEvent = (userData, eventId, req) => sendCapiEvent({
  eventName:  'ViewContent',
  eventId,
  sourceUrl:  req?.headers?.referer || 'https://amritmanage.eurekai.in/landing',
  userData: {
    fbc:        userData.fbc,
    fbp:        userData.fbp,
    clientIp:   req?.headers?.['x-forwarded-for'] || req?.ip,
    userAgent:  req?.headers?.['user-agent'],
  },
});

module.exports = {
  sendCapiEvent,
  sendLeadEvent,
  sendCompleteRegistrationEvent,
  sendStartTrialEvent,
  sendSubscribeEvent,
  sendViewContentEvent,
};
