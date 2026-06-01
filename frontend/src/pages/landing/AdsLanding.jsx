/**
 * AdsLanding — /landing
 * Meta-ads optimised landing page. Bilingual (English / Marathi).
 * Meta Pixel + CAPI tracking for ads_landing source ONLY.
 * Do NOT modify Landing.jsx — this is a separate ad-traffic page.
 */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check, Phone, CheckCircle, ShieldCheck,
  Users, Receipt, ClipboardList, Droplets,
  ArrowRight, X, Star
} from 'lucide-react';
import api from '../../api/axios';
import { useMarathi } from '../../i18n/marathi';
import LanguageToggle from '../../i18n/marathi/LanguageToggle';
import SiteFooter from '../../components/SiteFooter';
import amritLogo from '../../assets/Amritmanagelogo.png';

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '2219545345248014';

// ── Meta Pixel helpers ────────────────────────────────────────
// Only fire events on ads_landing page — never on landing.jsx

const initPixel = () => {
  if (typeof window === 'undefined') return;
  if (window.fbq) return; // already loaded
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView', {}, { eventID: crypto.randomUUID() });
};

const trackLead = (userData, eventId) => {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', 'Lead', {
    em: userData.email || '',
    ph: userData.phone || '',
    fn: userData.firstName || '',
  }, { eventID: eventId });
};

const trackCompleteRegistration = (userData, eventId) => {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', 'CompleteRegistration', {
    em:      userData.email || '',
    ph:      userData.phone || '',
    fn:      userData.firstName || '',
    ct:      userData.city || '',
    st:      userData.state || '',
    zp:      userData.zipCode || '',
    country: 'IN',
  }, { eventID: eventId });
};

// Read Meta attribution cookies
const getMetaAttribution = () => {
  if (typeof document === 'undefined') return {};
  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  };
  return {
    fbc: getCookie('_fbc'),
    fbp: getCookie('_fbp'),
  };
};

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry'
];

// ── Multi-step lead form ──────────────────────────────────────
const LeadForm = ({ utmParams, mr }) => {
  const [step, setStep] = useState(1);
  const [leadId, setLeadId] = useState(null); // DB record ID from step 1
  const [form, setForm] = useState({
    name: '', phone: '', businessName: '',
    address: '', city: '', district: '', state: '', pincode: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim())
      e.name = mr('Name is required.', 'नाव आवश्यक आहे.');
    if (!form.phone.trim())
      e.phone = mr('Phone is required.', 'फोन आवश्यक आहे.');
    else if (!/^\d{10}$/.test(form.phone.trim()))
      e.phone = mr('Enter a valid 10-digit number.', 'वैध १० अंकी नंबर टाका.');
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.address.trim())
      e.address = mr('Address is required.', 'पत्ता आवश्यक आहे.');
    if (!form.city.trim())
      e.city = mr('City is required.', 'शहर आवश्यक आहे.');
    if (!form.state)
      e.state = mr('Please select your state.', 'कृपया राज्य निवडा.');
    if (!form.pincode.trim())
      e.pincode = mr('Pincode is required.', 'पिनकोड आवश्यक आहे.');
    else if (!/^\d{6}$/.test(form.pincode.trim()))
      e.pincode = mr('Enter a valid 6-digit pincode.', 'वैध ६ अंकी पिनकोड टाका.');
    return e;
  };

  const handleNext = async (e) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      // Generate unique event ID for Lead event (same ID used in browser + CAPI)
      const leadEventId = crypto.randomUUID();
      const { fbc, fbp } = getMetaAttribution();

      // Fire browser Pixel Lead event
      trackLead({
        email:     '',
        phone:     form.phone.trim(),
        firstName: form.name.trim().split(' ')[0],
      }, leadEventId);

      // Save lead to DB + fire CAPI Lead event from backend
      const { data } = await api.post('/payment/request-subscription', {
        contactName:  form.name.trim(),
        contactPhone: form.phone.trim(),
        companyName:  form.businessName.trim(),
        plan: 'gold', billingCycle: 'monthly', months: 1,
        source: 'ads_landing',
        leadEventId,
        fbc,
        fbp,
        ...utmParams,
      });

      setLeadId(data.leadId || data.request?._id);
      setStep(2);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setStep(2); // still proceed to step 2
      } else {
        setErrors({ submit: err.response?.data?.error || mr('Something went wrong. Please try again.', 'काहीतरी चुकले. पुन्हा प्रयत्न करा.') });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      // Generate unique event ID for CompleteRegistration (different from Lead event ID)
      const registrationEventId = crypto.randomUUID();

      // Fire browser Pixel CompleteRegistration event
      trackCompleteRegistration({
        phone:     form.phone.trim(),
        firstName: form.name.trim().split(' ')[0],
        city:      form.city.trim(),
        state:     form.state,
        zipCode:   form.pincode.trim(),
      }, registrationEventId);

      // Update existing lead record with address + fire CAPI CompleteRegistration
      if (leadId) {
        await api.patch(`/payment/update-lead/${leadId}`, {
          address:             form.address.trim(),
          city:                form.city.trim(),
          district:            form.district.trim(),
          state:               form.state,
          pincode:             form.pincode.trim(),
          registrationEventId,
        });
      }

      setSubmitted(true);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setSubmitted(true);
      } else {
        setErrors({ submit: err.response?.data?.error || mr('Something went wrong. Please try again.', 'काहीतरी चुकले. पुन्हा प्रयत्न करा.') });
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{
          width: 64, height: 64, backgroundColor: '#DEFBE6', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
        }}>
          <CheckCircle size={32} color="#24A148" />
        </div>
        <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: '#161616' }}>
          {mr('Request Received!', 'विनंती मिळाली!')}
        </h3>
        <p style={{ color: '#525252', fontSize: '15px', lineHeight: 1.6, marginBottom: '20px' }}>
          {mr(
            <>Our team will contact you on <strong>WhatsApp</strong> at <strong>{form.phone}</strong> within 24 hours.</>,
            <>आमची टीम <strong>{form.phone}</strong> वर <strong>WhatsApp</strong> द्वारे २४ तासांत संपर्क करेल.</>
          )}
        </p>
        <div style={{
          backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.2)',
          padding: '12px 16px', fontSize: '13px', color: '#0043CE',
          textAlign: 'left', display: 'flex', gap: '8px'
        }}>
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{mr('No payment required. We help you set up everything step by step.', 'कोणतेही पेमेंट आवश्यक नाही. आम्ही प्रत्येक पायरीवर मदत करतो.')}</span>
        </div>
      </div>
    );
  }

  const inputStyle = (field) => ({
    width: '100%', height: '48px',
    border: `1px solid ${errors[field] ? '#DA1E28' : '#D2D2D2'}`,
    padding: '0 14px', fontSize: '15px', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', borderRadius: '2px',
    backgroundColor: '#FFFFFF'
  });

  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: '#525252',
    marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px'
  };

  return (
    <div>
      {/* Step progress bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {[1, 2].map(s => (
          <div key={s} style={{
            flex: 1, height: '3px',
            backgroundColor: s <= step ? '#0F62FE' : '#E0E0E0',
            transition: 'background-color 0.2s'
          }} />
        ))}
      </div>
      <div style={{ fontSize: '12px', color: '#8D8D8D', marginBottom: '16px' }}>
        {mr(
          `Step ${step} of 2: ${step === 1 ? 'Your Contact Details' : 'Your Location'}`,
          `पायरी ${step} पैकी २: ${step === 1 ? 'तुमचे संपर्क तपशील' : 'तुमचे स्थान'}`
        )}
      </div>

      {errors.submit && (
        <div style={{
          backgroundColor: '#FFF1F1', border: '1px solid #DA1E28',
          padding: '10px 14px', color: '#DA1E28', fontSize: '13px', marginBottom: '16px'
        }}>
          {errors.submit}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleNext} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{mr('Your Name', 'तुमचे नाव')} *</label>
            <input
              type="text"
              placeholder={mr('Ramesh Patil', 'रमेश पाटील')}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              style={inputStyle('name')}
              autoComplete="name"
            />
            {errors.name && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.name}</div>}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{mr('Mobile Number', 'मोबाइल नंबर')} *</label>
            <input
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              inputMode="numeric"
              maxLength={10}
              onChange={e => set('phone', e.target.value.replace(/[^0-9]/g, ''))}
              style={inputStyle('phone')}
              autoComplete="tel"
            />
            {errors.phone && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.phone}</div>}
            <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '4px' }}>
              {mr('We will contact you on WhatsApp.', 'आम्ही WhatsApp वर संपर्क करू.')}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>
              {mr('Dairy / Business Name', 'डेअरी / व्यवसायाचे नाव')}{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                ({mr('optional', 'पर्यायी')})
              </span>
            </label>
            <input
              type="text"
              placeholder={mr('Ramesh Dairy', 'रमेश डेअरी')}
              value={form.businessName}
              onChange={e => set('businessName', e.target.value)}
              style={inputStyle('businessName')}
            />
          </div>

          <button type="submit" style={{
            width: '100%', height: '52px', backgroundColor: '#0F62FE', color: '#FFFFFF',
            border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'inherit', borderRadius: '2px'
          }}>
            {mr('Next: Add Location', 'पुढे: स्थान जोडा')} <ArrowRight size={18} />
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{mr('Address', 'पत्ता')} *</label>
            <input
              type="text"
              placeholder={mr('House No., Street Name', 'घर नं., रस्त्याचे नाव')}
              value={form.address}
              onChange={e => set('address', e.target.value)}
              style={inputStyle('address')}
            />
            {errors.address && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.address}</div>}
          </div>

          <div className="ads-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{mr('City', 'शहर')} *</label>
              <input
                type="text"
                placeholder={mr('Pune', 'पुणे')}
                value={form.city}
                onChange={e => set('city', e.target.value.replace(/[^a-zA-Z\u0900-\u097F\s]/g, ''))}
                style={inputStyle('city')}
              />
              {errors.city && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.city}</div>}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{mr('Pincode', 'पिनकोड')} *</label>
              <input
                type="text"
                placeholder="411001"
                value={form.pincode}
                inputMode="numeric"
                onChange={e => set('pincode', e.target.value.replace(/[^0-9]/g, ''))}
                style={inputStyle('pincode')}
              />
              {errors.pincode && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.pincode}</div>}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{mr('District', 'जिल्हा')}</label>
            <input
              type="text"
              placeholder={mr('Pune', 'पुणे')}
              value={form.district}
              onChange={e => set('district', e.target.value.replace(/[^a-zA-Z\u0900-\u097F\s]/g, ''))}
              style={inputStyle('district')}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>{mr('State', 'राज्य')} *</label>
            <select
              value={form.state}
              onChange={e => set('state', e.target.value)}
              style={{ ...inputStyle('state'), height: '48px' }}
            >
              <option value="">{mr('Select state...', 'राज्य निवडा...')}</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.state && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.state}</div>}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                height: '52px', padding: '0 20px', backgroundColor: '#FFFFFF', color: '#525252',
                border: '1px solid #E0E0E0', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                fontFamily: 'inherit', borderRadius: '2px', flexShrink: 0
              }}
            >
              {mr('Back', 'मागे')}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1, height: '52px',
                backgroundColor: loading ? '#8D8D8D' : '#0F62FE',
                color: '#FFFFFF', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontFamily: 'inherit', borderRadius: '2px'
              }}
            >
              {loading
                ? (
                  <>
                    <div style={{
                      width: 18, height: 18,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFFFFF', borderRadius: '50%',
                      animation: 'ads-spin 0.8s linear infinite'
                    }} />
                    {mr('Submitting...', 'सादर होत आहे...')}
                  </>
                )
                : (
                  <>
                    <Phone size={18} />
                    {mr('Book Free Demo', 'मोफत डेमो बुक करा')}
                  </>
                )}
            </button>
          </div>

          <div style={{
            marginTop: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#8D8D8D'
          }}>
            <ShieldCheck size={13} color="#24A148" />
            {mr(
              'No payment required. We will contact you on WhatsApp.',
              'कोणतेही पेमेंट आवश्यक नाही. आम्ही WhatsApp वर संपर्क करू.'
            )}
          </div>
        </form>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────
const AdsLanding = () => {
  const [searchParams] = useSearchParams();
  const { isMarathi } = useMarathi();

  const mr = (en, mrText) => isMarathi ? mrText : en;

  const font = isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif';

  const utmParams = {
    utm_source:   searchParams.get('utm_source'),
    utm_medium:   searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),
    utm_content:  searchParams.get('utm_content'),
    utm_term:     searchParams.get('utm_term'),
    fbclid:       searchParams.get('fbclid'),
  };

  const scrollToForm = () => {
    document.getElementById('ads-lead-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize Meta Pixel on mount — ads_landing only
  useEffect(() => {
    initPixel();
    // Store fbclid in cookie as _fbc if present in URL
    const fbclid = searchParams.get('fbclid');
    if (fbclid) {
      const ts = Math.floor(Date.now() / 1000);
      document.cookie = `_fbc=fb.1.${ts}.${fbclid}; path=/; max-age=7776000; SameSite=Lax`;
    }
  }, []);

  const TRUST_ITEMS = [
    { en: 'Simple mobile-friendly system',    mr: 'सोपी मोबाइल-फ्रेंडली प्रणाली' },
    { en: 'Designed for Indian milk vendors', mr: 'भारतीय दूध विक्रेत्यांसाठी' },
    { en: 'Works for small and large dairies', mr: 'लहान आणि मोठ्या डेअरींसाठी' },
    { en: 'Staff can use it easily',           mr: 'कर्मचारी सहज वापरू शकतात' },
  ];

  const BENEFITS = [
    { en: 'Bills calculate automatically every month',    mr: 'दर महिन्याला बिले आपोआप तयार होतात' },
    { en: 'Your delivery staff gets a separate login',    mr: 'वितरण कर्मचाऱ्यांना स्वतंत्र लॉगिन मिळते' },
    { en: 'See pending payments from every customer',     mr: 'प्रत्येक ग्राहकाचे थकीत पेमेंट पाहा' },
    { en: 'Works on your phone, no laptop needed',        mr: 'फोनवर काम करते, लॅपटॉप लागत नाही' },
  ];

  const BEFORE_AFTER = [
    {
      before: { en: 'You calculate each customer\'s bill manually every month end.', mr: 'तुम्ही दर महिन्याच्या शेवटी प्रत्येक ग्राहकाचे बिल हाताने मोजता.' },
      after:  { en: 'Bills are calculated automatically. Review in 2 minutes.',      mr: 'बिले आपोआप तयार होतात. २ मिनिटांत तपासा.' }
    },
    {
      before: { en: 'Disputes happen because nobody knows the exact delivery record.', mr: 'वाद होतात कारण कोणालाच अचूक वितरण नोंद माहीत नसते.' },
      after:  { en: 'Every delivery is logged with date, quantity, and time. No disputes.', mr: 'प्रत्येक वितरण तारीख, प्रमाण आणि वेळासह नोंदवले जाते. वाद नाही.' }
    },
    {
      before: { en: 'You don\'t know how much money is pending from which customer.', mr: 'कोणत्या ग्राहकाकडून किती पैसे थकले आहेत हे माहीत नसते.' },
      after:  { en: 'See total outstanding and per-customer balance at a glance.',    mr: 'एका नजरेत एकूण थकबाकी आणि प्रत्येक ग्राहकाची शिल्लक पाहा.' }
    },
  ];

  const FEATURES = [
    { icon: ClipboardList, en: { title: 'Daily Delivery Logs',   desc: 'Morning and evening entries for every customer.' },        mr: { title: 'रोजची वितरण नोंद',    desc: 'प्रत्येक ग्राहकासाठी सकाळ आणि संध्याकाळच्या नोंदी.' } },
    { icon: Receipt,       en: { title: 'Auto Monthly Bills',    desc: 'Bills generated automatically at month end.' },            mr: { title: 'आपोआप मासिक बिले',    desc: 'महिन्याच्या शेवटी बिले आपोआप तयार होतात.' } },
    { icon: Users,         en: { title: 'Customer Management',   desc: 'Track balances, rates, and payment history.' },            mr: { title: 'ग्राहक व्यवस्थापन',   desc: 'शिल्लक, दर आणि पेमेंट इतिहास ट्रॅक करा.' } },
    { icon: Droplets,      en: { title: 'Staff Login',           desc: 'Separate login for delivery staff. No confusion.' },       mr: { title: 'कर्मचारी लॉगिन',      desc: 'वितरण कर्मचाऱ्यांसाठी स्वतंत्र लॉगिन. गोंधळ नाही.' } },
  ];

  const OBJECTIONS = [
    {
      q:  { en: '"I am not good with technology."',          mr: '"मला तंत्रज्ञान जमत नाही."' },
      a:  { en: 'If you can use WhatsApp, you can use Amrit Manage.', mr: 'WhatsApp वापरता येत असेल तर अमृत मॅनेज वापरता येईल.' },
      ex: { en: 'Large buttons. Simple screens. Everything in plain language.', mr: 'मोठे बटण. सोपे स्क्रीन. सर्व काही सोप्या भाषेत.' }
    },
    {
      q:  { en: '"My business is small. Do I need this?"',   mr: '"माझा व्यवसाय लहान आहे. मला हे हवे का?"' },
      a:  { en: 'Even 10 customers benefit from this.',      mr: '१० ग्राहक असले तरी फायदा होतो.' },
      ex: { en: 'The smaller your business, the less time you have to waste. Saves 2 to 3 hours every month.', mr: 'व्यवसाय जितका लहान, वेळ वाया घालवणे परवडत नाही. दर महिन्याला २ ते ३ तास वाचतात.' }
    },
    {
      q:  { en: '"What if I try and don\'t like it?"',       mr: '"वापरून पाहिले आणि आवडले नाही तर?"' },
      a:  { en: 'No payment required to try.',               mr: 'वापरण्यासाठी कोणतेही पेमेंट नाही.' },
      ex: { en: 'Our team sets it up with you personally. If it does not work, you lose nothing.', mr: 'आमची टीम तुमच्यासोबत वैयक्तिकरित्या सेटअप करते. काम नाही केले तर काहीही गमावत नाही.' }
    },
  ];

  return (
    <div style={{ backgroundColor: '#FFFFFF', color: '#161616', fontFamily: font, minHeight: '100vh' }}>

      {/* Trust bar */}
      <div style={{
        backgroundColor: '#0F62FE', color: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '10px 16px', fontSize: '13px', gap: '12px',
        flexWrap: 'wrap', textAlign: 'center'
      }}>
        {TRUST_ITEMS.map((item, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
            <Check size={13} />
            {isMarathi ? item.mr : item.en}
          </span>
        ))}
      </div>

      {/* Nav */}
      <nav style={{
        height: '56px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E0E0E0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px'
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src={amritLogo} alt="Amrit Manage" style={{ height: '32px', width: 'auto' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LanguageToggle />
          <button
            onClick={scrollToForm}
            style={{
              backgroundColor: '#0F62FE', color: '#FFFFFF', border: 'none',
              padding: '8px 20px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
              fontFamily: 'inherit', borderRadius: '2px'
            }}
          >
            {mr('Book Free Demo', 'मोफत डेमो बुक करा')}
          </button>
        </div>
      </nav>

      {/* Hero + Form */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px' }}>
        <div className="ads-hero-grid">

          {/* Left — copy */}
          <div>
            <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.2, marginBottom: '18px', color: '#161616' }}>
              {mr(
                'Manage Milk Customers, Bills, and Payments From Your Phone',
                'तुमच्या फोनवरून दूध ग्राहक, बिले आणि पेमेंट व्यवस्थापित करा'
              )}
            </h1>
            <p style={{ fontSize: '17px', color: '#525252', lineHeight: 1.6, marginBottom: '28px' }}>
              {mr(
                'Milk entries get forgotten and disputes happen later. Amrit Manage records every delivery automatically, so you always have proof.',
                'दूध नोंदी विसरल्या जातात आणि नंतर वाद होतात. अमृत मॅनेज प्रत्येक वितरण आपोआप नोंदवते, त्यामुळे तुमच्याकडे नेहमी पुरावा असतो.'
              )}
            </p>

            {/* Quick benefits */}
            <div style={{ display: 'grid', gap: '12px', marginBottom: '32px' }}>
              {BENEFITS.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 500 }}>
                  <Check size={16} color="#24A148" style={{ flexShrink: 0 }} />
                  {isMarathi ? b.mr : b.en}
                </div>
              ))}
            </div>

            {/* Stars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#525252' }}>
              <div style={{ display: 'flex' }}>
                {[0,1,2,3,4].map(i => <Star key={i} size={14} color="#F1C21B" fill="#F1C21B" />)}
              </div>
              <span>{mr('Free setup assistance available', 'विनामूल्य सेटअप सहाय्य उपलब्ध')}</span>
            </div>

            {/* Mobile CTA */}
            <button
              onClick={scrollToForm}
              className="ads-mobile-cta"
              style={{
                display: 'none', marginTop: '24px', width: '100%', height: '52px',
                backgroundColor: '#0F62FE', color: '#FFFFFF', border: 'none',
                fontSize: '16px', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', borderRadius: '2px',
                alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {mr('Book Free Demo', 'मोफत डेमो बुक करा')} <ArrowRight size={18} />
            </button>
          </div>

          {/* Right — form */}
          <div
            id="ads-lead-form"
            style={{ backgroundColor: '#FFFFFF', border: '2px solid #0F62FE', padding: '28px', borderRadius: '2px' }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px', color: '#161616' }}>
              {mr('Book a Free Demo', 'मोफत डेमो बुक करा')}
            </h2>
            <p style={{ fontSize: '14px', color: '#525252', marginBottom: '20px' }}>
              {mr(
                'We help you set up everything step by step.',
                'आम्ही तुम्हाला प्रत्येक पायरीवर सेटअप करण्यात मदत करतो.'
              )}
            </p>
            <LeadForm utmParams={utmParams} mr={mr} />
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section style={{ backgroundColor: '#F4F4F4', padding: '56px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '40px', color: '#161616' }}>
            {mr('What Changes When You Use Amrit Manage', 'अमृत मॅनेज वापरल्यावर काय बदलते')}
          </h2>
          <div className="ads-cards-grid">
            {BEFORE_AFTER.map((item, i) => (
              <div key={i} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '20px', borderRadius: '2px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', color: '#525252', fontSize: '14px' }}>
                  <X size={16} color="#DA1E28" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{isMarathi ? item.before.mr : item.before.en}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', fontWeight: 600, fontSize: '14px', color: '#161616' }}>
                  <Check size={16} color="#24A148" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{isMarathi ? item.after.mr : item.after.en}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: '56px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '40px', color: '#161616' }}>
            {mr('Everything You Need to Run Your Dairy', 'तुमची डेअरी चालवण्यासाठी सर्व काही')}
          </h2>
          <div className="ads-features-grid">
            {FEATURES.map((f, i) => {
              const content = isMarathi ? f.mr : f.en;
              return (
                <div key={i} style={{ border: '1px solid #E0E0E0', padding: '20px', borderRadius: '2px' }}>
                  <div style={{
                    width: 40, height: 40, backgroundColor: '#EDF5FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
                    borderRadius: '2px'
                  }}>
                    <f.icon size={20} color="#0F62FE" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px', color: '#161616' }}>{content.title}</div>
                  <div style={{ fontSize: '13px', color: '#525252', lineHeight: 1.5 }}>{content.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Objections */}
      <section style={{ backgroundColor: '#F4F4F4', padding: '56px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '40px', color: '#161616' }}>
            {mr('You Are Probably Thinking...', 'तुम्ही कदाचित विचार करत असाल...')}
          </h2>
          <div className="ads-cards-grid">
            {OBJECTIONS.map((item, i) => (
              <div key={i} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '20px', borderRadius: '2px' }}>
                <div style={{ fontStyle: 'italic', color: '#525252', marginBottom: '8px', fontSize: '14px' }}>
                  {isMarathi ? item.q.mr : item.q.en}
                </div>
                <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '15px', color: '#161616' }}>
                  {isMarathi ? item.a.mr : item.a.en}
                </div>
                <p style={{ fontSize: '13px', color: '#525252', lineHeight: 1.6, margin: 0 }}>
                  {isMarathi ? item.ex.mr : item.ex.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ backgroundColor: '#0F62FE', padding: '56px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '30px', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>
          {mr('Start Managing Your Dairy the Right Way', 'तुमची डेअरी योग्य पद्धतीने व्यवस्थापित करणे सुरू करा')}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '16px', marginBottom: '28px' }}>
          {mr(
            'Free setup assistance available. We help you get started step by step.',
            'विनामूल्य सेटअप सहाय्य उपलब्ध. आम्ही तुम्हाला प्रत्येक पायरीवर मदत करतो.'
          )}
        </p>
        <button
          onClick={scrollToForm}
          style={{
            backgroundColor: '#FFFFFF', color: '#0F62FE', height: '52px', border: 'none',
            padding: '0 36px', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
            fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '8px',
            borderRadius: '2px'
          }}
        >
          {mr('Book Free Demo', 'मोफत डेमो बुक करा')} <ArrowRight size={18} />
        </button>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '16px'
        }}>
          <ShieldCheck size={14} />
          {mr(
            'No payment required. We will contact you on WhatsApp.',
            'कोणतेही पेमेंट आवश्यक नाही. आम्ही WhatsApp वर संपर्क करू.'
          )}
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />

      <style>{`
        @keyframes ads-spin { to { transform: rotate(360deg); } }

        /* Hero two-column layout */
        .ads-hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 56px;
          align-items: start;
        }

        /* Card grids */
        .ads-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        .ads-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        /* Mobile overrides */
        @media (max-width: 768px) {
          .ads-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .ads-mobile-cta {
            display: flex !important;
          }
          .ads-two-col {
            grid-template-columns: 1fr !important;
          }
          .ads-cards-grid {
            grid-template-columns: 1fr !important;
          }
          .ads-features-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .ads-features-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdsLanding;
