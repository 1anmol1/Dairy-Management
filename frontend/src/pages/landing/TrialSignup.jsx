/**
 * Trial / Get Started Page — /start
 * Full Marathi support via useMarathi() toggle.
 */
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Check, ShieldCheck, CheckCircle, Clock, Users, Receipt, Phone } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import SiteFooter from '../../components/SiteFooter';
import { useMarathi } from '../../i18n/marathi';
import LanguageToggle from '../../i18n/marathi/LanguageToggle';
import amritLogo from '../../assets/Amritmanagelogo.png';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry'
];

const TrialSignup = () => {
  const { isMarathi } = useMarathi();
  const [name,         setName]         = useState('');
  const [phone,        setPhone]        = useState('');
  const [email,        setEmail]        = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address1,     setAddress1]     = useState('');
  const [address2,     setAddress2]     = useState('');
  const [city,         setCity]         = useState('');
  const [pincode,      setPincode]      = useState('');
  const [district,     setDistrict]     = useState('');
  const [state,        setState]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [errors,       setErrors]       = useState({});
  const toast = useToast();

  const mr = (en, mr) => isMarathi ? mr : en;

  const clearError = useCallback((field) => {
    setErrors(prev => prev[field] ? { ...prev, [field]: '' } : prev);
  }, []);

  const resetForm = () => {
    setName(''); setPhone(''); setEmail(''); setBusinessName('');
    setAddress1(''); setAddress2(''); setCity(''); setPincode('');
    setDistrict(''); setState(''); setErrors({});
  };

  const validate = () => {
    const e = {};
    if (!name.trim())    e.name    = mr('Name is required.', 'नाव आवश्यक आहे.');
    if (!phone.trim())   e.phone   = mr('Phone is required.', 'फोन आवश्यक आहे.');
    else if (!/^\d{10}$/.test(phone.trim())) e.phone = mr('Enter a valid 10-digit phone number.', 'वैध १० अंकी फोन नंबर टाका.');
    // Email is optional — only validate format if provided
    if (email.trim() && !email.includes('@')) e.email = mr('Enter a valid email address.', 'वैध ईमेल पत्ता टाका.');
    if (!address1.trim()) e.address1 = mr('Address line 1 is required.', 'पत्ता ओळ १ आवश्यक आहे.');
    if (!city.trim())    e.city    = mr('City is required.', 'शहर आवश्यक आहे.');
    if (!pincode.trim()) e.pincode = mr('Pincode is required.', 'पिनकोड आवश्यक आहे.');
    else if (!/^\d{6}$/.test(pincode.trim())) e.pincode = mr('Enter a valid 6-digit pincode.', 'वैध ६ अंकी पिनकोड टाका.');
    if (!district.trim()) e.district = mr('District is required.', 'जिल्हा आवश्यक आहे.');
    if (!state)          e.state   = mr('Please select your state.', 'कृपया राज्य निवडा.');
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await api.post('/payment/request-subscription', {
        contactName:  name.trim(),
        contactEmail: email.trim().toLowerCase(),
        contactPhone: phone.trim(),
        address:      [address1.trim(), address2.trim(), city.trim(), district.trim()].filter(Boolean).join(', '),
        state, pincode: pincode.trim(),
        companyName:  businessName.trim(),
        plan: 'gold', billingCycle: 'monthly', months: 1
      });
      resetForm(); setSubmitted(true);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        resetForm(); setSubmitted(true);
      } else {
        toast.error(err.response?.data?.error || mr('Failed to submit. Please try again.', 'सादर करणे अयशस्वी. पुन्हा प्रयत्न करा.'));
      }
    } finally { setLoading(false); }
  };

  const BENEFITS = [
    { icon: Clock,       en: 'Free setup assistance — we help you get started',  mr: 'विनामूल्य सेटअप सहाय्य — आम्ही तुम्हाला मदत करतो' },
    { icon: Users,       en: 'Up to 200 customers (Amrit Gold limits)',           mr: 'सर्वाधिक २०० ग्राहक (अमृत गोल्ड मर्यादा)' },
    { icon: Receipt,     en: 'Auto billing, WhatsApp alerts, PDF bills',          mr: 'आपोआप बिलिंग, WhatsApp अलर्ट, PDF बिले' },
    { icon: ShieldCheck, en: 'Your data is safe and never deleted',               mr: 'तुमचा डेटा सुरक्षित आणि कधीही डिलीट होत नाही' },
  ];

  const INCLUDED = [
    { en: 'Customer management (up to 200)',       mr: 'ग्राहक व्यवस्थापन (सर्वाधिक २००)' },
    { en: 'Daily milk entry, morning and evening', mr: 'रोजची दूध नोंद, सकाळ आणि संध्याकाळ' },
    { en: 'Automatic monthly bill generation',     mr: 'आपोआप मासिक बिल तयार' },
    { en: 'Payment tracking and history',          mr: 'देयक ट्रॅकिंग आणि इतिहास' },
    { en: 'WhatsApp delivery alerts',              mr: 'WhatsApp वितरण अलर्ट' },
    { en: 'Staff separate login (up to 7)',        mr: 'कर्मचारी स्वतंत्र लॉगिन (सर्वाधिक ७)' },
    { en: 'PDF bill download',                     mr: 'PDF बिल डाउनलोड' },
    { en: 'Default rate management',               mr: 'डिफॉल्ट दर व्यवस्थापन' },
  ];

  const font = isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4F4F4', fontFamily: font }}>
      {/* Top bar */}
      <div style={{ backgroundColor: '#0F62FE', color: '#FFFFFF', textAlign: 'center', padding: '10px 24px', fontSize: '13px', fontWeight: 600 }}>
        {mr(
          'Free setup assistance available. We help you get started step by step.',
          'विनामूल्य सेटअप सहाय्य उपलब्ध. आम्ही तुम्हाला प्रत्येक पायरीवर मदत करतो.'
        )}
      </div>

      {/* Nav */}
      <nav style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E0E0E0', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src={amritLogo} alt="Amrit Manage" style={{ height: '32px', width: 'auto' }} />
        </Link>
        <LanguageToggle />
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }} className="trial-grid">

        {/* Left */}
        <div>
          <h1 style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1.2, marginBottom: '16px', color: '#161616' }}>
            {mr('Get Started with Amrit Manage', 'अमृत मॅनेजसह सुरुवात करा')}
          </h1>
          <p style={{ fontSize: '15px', color: '#525252', lineHeight: 1.6, marginBottom: '28px' }}>
            {mr(
              'Fill in your details below. Our team will review your requirements and call you to set up your account personally.',
              'खाली तुमचे तपशील भरा. आमची टीम तुमच्या आवश्यकता समजून घेण्यासाठी वैयक्तिकरित्या संपर्क करेल.'
            )}
          </p>

          <div style={{ backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.2)', padding: '14px 18px', marginBottom: '28px', fontSize: '13px', color: '#0043CE', display: 'flex', gap: '10px' }}>
            <Phone size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              {mr(
                'We call every new customer personally to understand their business and set up the account correctly. You will hear from us within 24 hours.',
                'आम्ही प्रत्येक नवीन ग्राहकाशी वैयक्तिकरित्या बोलतो. आम्ही २४ तासांत संपर्क करू.'
              )}
            </span>
          </div>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '32px' }}>
            {BENEFITS.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 32, height: 32, backgroundColor: '#EDF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <b.icon size={15} color="#0F62FE" />
                </div>
                <span style={{ fontSize: '13px', color: '#161616', fontWeight: 500 }}>{isMarathi ? b.mr : b.en}</span>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              {mr('What is included in your trial', 'ट्रायलमध्ये काय समाविष्ट आहे')}
            </div>
            {INCLUDED.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '13px', color: '#161616' }}>
                <Check size={12} color="#24A148" />
                {isMarathi ? f.mr : f.en}
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              {mr('Your Details', 'तुमचे तपशील')}
            </h2>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                {mr('Contact Information', 'संपर्क माहिती')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {mr('Full Name', 'पूर्ण नाव')} *
                  </label>
                  <input type="text" className="input" placeholder={mr('Ramesh Patel', 'रमेश पाटील')} value={name}
                    onChange={e => { setName(e.target.value); clearError('name'); }}
                    style={errors.name ? { borderColor: '#DA1E28' } : {}} />
                  {errors.name && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.name}</div>}
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {mr('Phone Number', 'फोन नंबर')} *
                  </label>
                  <input type="tel" className="input" placeholder="9876543210" value={phone} inputMode="numeric"
                    maxLength={10}
                    onChange={e => { setPhone(e.target.value); clearError('phone'); }}
                    style={errors.phone ? { borderColor: '#DA1E28' } : {}} />
                  {errors.phone && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.phone}</div>}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {mr('Email Address', 'ईमेल पत्ता')} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#8D8D8D' }}>({mr('optional', 'पर्यायी')})</span>
                </label>
                <input type="email" className="input" placeholder="ramesh@example.com" value={email} autoCapitalize="none"
                  onChange={e => { setEmail(e.target.value); clearError('email'); }}
                  style={errors.email ? { borderColor: '#DA1E28' } : {}} />
                {errors.email && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.email}</div>}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {mr('Business Name', 'व्यवसायाचे नाव')}
                </label>
                <input type="text" className="input" placeholder={mr('Patel Dairy (optional)', 'पाटील डेअरी (पर्यायी)')} value={businessName}
                  onChange={e => setBusinessName(e.target.value)} />
              </div>

              <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', marginTop: '4px' }}>
                {mr('Address', 'पत्ता')}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {mr('Address Line 1', 'पत्ता ओळ १')} *
                </label>
                <input type="text" className="input" placeholder={mr('House / Flat No., Street Name', 'घर / फ्लॅट नं., रस्त्याचे नाव')} value={address1}
                  onChange={e => { setAddress1(e.target.value); clearError('address1'); }}
                  style={errors.address1 ? { borderColor: '#DA1E28' } : {}} />
                {errors.address1 && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.address1}</div>}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {mr('Address Line 2', 'पत्ता ओळ २')}
                </label>
                <input type="text" className="input" placeholder={mr('Area, Landmark (optional)', 'परिसर, खूण (पर्यायी)')} value={address2}
                  onChange={e => setAddress2(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {mr('City', 'शहर')} *
                  </label>
                  <input type="text" className="input" placeholder={mr('Pune', 'पुणे')} value={city}
                    onChange={e => { setCity(e.target.value); clearError('city'); }}
                    style={errors.city ? { borderColor: '#DA1E28' } : {}} />
                  {errors.city && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.city}</div>}
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {mr('Pincode', 'पिनकोड')} *
                  </label>
                  <input type="text" className="input" placeholder="411001" value={pincode} inputMode="numeric"
                    onChange={e => { setPincode(e.target.value); clearError('pincode'); }}
                    style={errors.pincode ? { borderColor: '#DA1E28' } : {}} />
                  {errors.pincode && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.pincode}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {mr('District', 'जिल्हा')} *
                  </label>
                  <input type="text" className="input" placeholder={mr('Pune', 'पुणे')} value={district}
                    onChange={e => { setDistrict(e.target.value); clearError('district'); }}
                    style={errors.district ? { borderColor: '#DA1E28' } : {}} />
                  {errors.district && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.district}</div>}
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {mr('State', 'राज्य')} *
                  </label>
                  <select className="input" value={state}
                    onChange={e => { setState(e.target.value); clearError('state'); }}
                    style={errors.state ? { borderColor: '#DA1E28' } : {}}>
                    <option value="">{mr('Select state...', 'राज्य निवडा...')}</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{errors.state}</div>}
                </div>
              </div>

              <button type="submit" disabled={loading || submitted}
                style={{
                  width: '100%', height: '50px',
                  backgroundColor: submitted ? '#24A148' : '#0F62FE',
                  color: '#FFFFFF', border: 'none',
                  cursor: (loading || submitted) ? 'not-allowed' : 'pointer',
                  fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '10px', opacity: loading ? 0.7 : 1,
                  fontFamily: 'inherit', transition: 'background-color 0.2s'
                }}
                onMouseOver={e => { if (!loading && !submitted) e.currentTarget.style.backgroundColor = '#0353E9'; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = submitted ? '#24A148' : '#0F62FE'; }}
              >
                {loading
                  ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {mr('Submitting...', 'सादर होत आहे...')}</>
                  : submitted
                    ? <><CheckCircle size={16} /> {mr('Submitted', 'सादर झाले')}</>
                    : <><Phone size={16} /> {mr('Submit Request', 'विनंती सादर करा')}</>}
              </button>

              {submitted && (
                <div style={{ marginTop: '16px', backgroundColor: '#DEFBE6', border: '1px solid #24A148', padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <CheckCircle size={20} color="#24A148" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0E6027', marginBottom: '4px' }}>
                      {mr('Thank you! Your request has been received.', 'धन्यवाद! तुमची विनंती मिळाली.')}
                    </div>
                    <div style={{ fontSize: '13px', color: '#525252', lineHeight: 1.55 }}>
                      {mr(
                        'Our team will review your details and reach out to you shortly to understand your business requirements and get your account set up.',
                        'आमची टीम तुमचे तपशील तपासेल आणि तुमच्या व्यवसायाच्या आवश्यकता समजून घेण्यासाठी लवकरच संपर्क करेल.'
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!submitted && (
                <p style={{ fontSize: '11px', color: '#8D8D8D', textAlign: 'center', marginTop: '12px', lineHeight: 1.5 }}>
                  {mr('By submitting you agree to our', 'सादर करून तुम्ही आमच्या')}{' '}
                  <Link to="/terms" style={{ color: '#0F62FE' }}>{mr('Terms of Service', 'सेवा अटी')}</Link>
                  {' '}{mr('and', 'आणि')}{' '}
                  <Link to="/privacy" style={{ color: '#0F62FE' }}>{mr('Privacy Policy', 'गोपनीयता धोरण')}</Link>
                  {isMarathi ? 'ला सहमती देता.' : '.'}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .trial-grid { display: grid; }
        @media (max-width: 768px) { .trial-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <SiteFooter />
    </div>
  );
};

export default TrialSignup;
