/**
 * Upgrade / Plan Request page — /app/owner/upgrade
 * Owner fills in their details → superadmin calls them → activates subscription.
 * No automatic payment. Human-in-the-loop activation.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Check, CreditCard, ArrowLeft, CheckCircle,
  Zap, Star, Phone, Clock, MapPin, Building2, Info, AlertTriangle
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useMarathi } from '../../i18n/marathi';

const PLAN_DISPLAY = {
  silver:   { color: '#8D8D8D', bg: '#F4F4F4', border: '#8D8D8D', icon: CreditCard, label: 'Amrit Silver' },
  gold:     { color: '#B8860B', bg: '#FFF8E1', border: '#D4AF37', icon: Star,       label: 'Amrit Gold ⭐', recommended: true },
  platinum: { color: '#6929C4', bg: '#F3F0FF', border: '#8A3FFC', icon: Zap,        label: 'Amrit Platinum' }
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

const PLAN_SETUP_FEES = { silver: 499, gold: 1499, platinum: 1999 };

const Upgrade = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { isMarathi } = useMarathi();

  const [plans, setPlans] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  // Pre-select plan from navigation state (e.g. from UpgradeGate button)
  const [selectedPlan, setSelectedPlan] = useState(location.state?.selectedPlan || 'gold');
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [months, setMonths] = useState(1);
  const [step, setStep] = useState('select'); // 'select' | 'details' | 'submitted'
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);

  // Pre-fill all known owner details
  const [form, setForm] = useState({
    contactName:  user?.name || '',
    contactEmail: user?.email || '',
    contactPhone: user?.phone || '',
    address:      '',
    district:     '',
    state:        '',
    pincode:      '',
    companyName:  user?.businessName || ''
  });
  const [errors, setErrors] = useState({});

  const currentStatus = user?.subscription?.status;
  const currentPlan   = user?.subscription?.plan;

  const PLAN_RANK = { silver: 0, gold: 1, platinum: 2 };
  const isDowngrade = (targetPlan) => {
    if (!currentPlan || currentStatus === 'trial') return false;
    return PLAN_RANK[targetPlan] < PLAN_RANK[currentPlan];
  };

  useEffect(() => {
    api.get('/payment/plans')
      .then(r => setPlans(r.data.plans))
      .catch(() => {})
      .finally(() => setLoadingPlans(false));

    // Check if there's already a pending request — pre-fill address from it
    api.get('/payment/my-request')
      .then(r => {
        const req = r.data.request;
        if (req && req.status === 'pending') {
          setExistingRequest(req);
          setStep('submitted');
        } else if (req) {
          // Pre-fill address fields from last request
          setForm(prev => ({
            ...prev,
            address:     req.address     || prev.address,
            state:       req.state       || prev.state,
            pincode:     req.pincode     || prev.pincode,
            companyName: req.companyName || prev.companyName,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const getPrice = (planKey) => {
    const live = plans?.[planKey];
    const monthly = live?.monthly ?? (planKey === 'silver' ? 99 : planKey === 'gold' ? 199 : 399);
    const setup   = live?.setup   ?? PLAN_SETUP_FEES[planKey];
    const isFirstTime = currentStatus === 'trial' || !currentPlan;

    // Setup fee logic:
    // - First time (trial/no plan): full setup fee for the target plan
    // - Upgrading from paid plan: difference between target setup fee and current plan setup fee
    // - Downgrading or same plan: no setup fee
    let setupCharge = 0;
    if (isFirstTime) {
      setupCharge = setup;
    } else if (currentPlan && currentPlan !== planKey) {
      const currentSetup = plans?.[currentPlan]?.setup ?? PLAN_SETUP_FEES[currentPlan] ?? 0;
      const targetSetup  = setup;
      setupCharge = Math.max(0, targetSetup - currentSetup);
    }
    // Same plan renewal → no setup fee (setupCharge stays 0)

    const subtotal = billingCycle === 'yearly'
      ? (() => { const b = Math.round(monthly * 10); return b - (b % 10) + 9; })()
      : monthly * months;

    return { monthly, setup, subtotal, setupCharge, months: billingCycle === 'yearly' ? 12 : months, isFirstTime };
  };

  const setF = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
  };

  const validateDetails = () => {
    const e = {};
    if (!form.contactName.trim())  e.contactName  = 'Name is required.';
    if (!form.contactPhone.trim()) e.contactPhone = 'Phone is required.';
    else if (!/^\d{10}$/.test(form.contactPhone.trim())) e.contactPhone = 'Enter a valid 10-digit phone number.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateDetails();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const pricing = getPrice(selectedPlan);
      const { data } = await api.post('/payment/request-subscription', {
        ...form,
        plan: selectedPlan,
        billingCycle,
        months: pricing.months
      });
      setExistingRequest(data.request);
      setStep('submitted');
      toast.success('Request submitted! We will call you within 24 hours.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const pricing = getPrice(selectedPlan);

  // ── Already submitted ─────────────────────────────────────
  if (step === 'submitted') {
    const isDowngradeRequest = existingRequest?.plan && currentPlan && PLAN_RANK[existingRequest.plan] < PLAN_RANK[currentPlan];
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">{isMarathi ? 'सदस्यता विनंती' : 'Subscription Request'}</h1>
        </div>
        <div className="page-body" style={{ maxWidth: '560px' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#EDF5FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Phone size={28} color="#0F62FE" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
              {isMarathi ? 'विनंती सादर केली!' : 'Request Submitted!'}
            </h2>
            <p style={{ color: '#525252', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
              {isMarathi
                ? <>{existingRequest?.contactPhone || form.contactPhone} वर आमची टीम <strong>२४ तासांत</strong> कॉल करेल.</>
                : <>Our team will call you at <strong>{existingRequest?.contactPhone || form.contactPhone}</strong> within <strong>24 hours</strong> to confirm your details and activate your subscription.</>}
            </p>

            <div style={{ backgroundColor: '#F4F4F4', padding: '16px 20px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                {isMarathi ? 'विनंती सारांश' : 'Request Summary'}
              </div>
              {[
                { label: isMarathi ? 'योजना' : 'Plan', value: PLAN_DISPLAY[existingRequest?.plan || selectedPlan]?.label },
                { label: isMarathi ? 'बिलिंग' : 'Billing', value: existingRequest?.billingCycle === 'yearly' ? (isMarathi ? 'वार्षिक' : 'Yearly') : `${existingRequest?.months || months} ${isMarathi ? 'महिने' : 'month(s)'}` },
                { label: isMarathi ? 'संपर्क' : 'Contact', value: existingRequest?.contactPhone || form.contactPhone },
                { label: isMarathi ? 'स्थिती' : 'Status', value: existingRequest?.status === 'pending' ? '⏳ Pending call' : existingRequest?.status === 'called' ? '📞 Called' : '✅ Activated' }
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#525252' }}>{r.label}</span>
                  <span style={{ fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Non-refundable notice for downgrade requests */}
            {isDowngradeRequest && (
              <div style={{ backgroundColor: '#FFF8E1', border: '1px solid #F1C21B', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#B28600', textAlign: 'left', display: 'flex', gap: '10px' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  {isMarathi
                    ? `लक्षात ठेवा: तुमच्या ${PLAN_DISPLAY[currentPlan]?.label} योजनेचे शुल्क परत मिळणार नाही. सध्याचा बिलिंग कालावधी संपेपर्यंत तुम्हाला सर्व सुविधा मिळत राहतील.`
                    : `Note: Your current ${PLAN_DISPLAY[currentPlan]?.label} plan payment is non-refundable. You'll retain full access to all ${PLAN_DISPLAY[currentPlan]?.label} features until your current billing period ends.`}
                </span>
              </div>
            )}

            <div style={{ backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.2)', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#0043CE', textAlign: 'left', display: 'flex', gap: '10px' }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                {isMarathi
                  ? 'आम्ही सदस्यता सक्रिय करेपर्यंत तुमची ट्रायल सुरू राहील. कोणताही डेटा गमावला जाणार नाही.'
                  : 'Your trial continues until we activate your subscription. No data will be lost.'}
              </span>
            </div>

            <button className="btn btn-ghost btn-full" onClick={() => navigate('/app/owner')}>
              {isMarathi ? 'डॅशबोर्डवर परत जा' : 'Back to Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Details form ──────────────────────────────────────────
  if (step === 'details') {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('select')}>
              <ArrowLeft size={14} /> {isMarathi ? 'मागे' : 'Back'}
            </button>
            <div>
              <h1 className="page-title">{isMarathi ? 'तुमचे तपशील' : 'Your Details'}</h1>
              <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
                {PLAN_DISPLAY[selectedPlan]?.label} — {billingCycle === 'yearly' ? (isMarathi ? '१२ महिने' : '12 months') : `${months} ${isMarathi ? 'महिने' : `month${months > 1 ? 's' : ''}`}`}
              </div>
            </div>
          </div>
        </div>

        <div className="page-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px', alignItems: 'start' }} className="details-grid">

            {/* Form */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '28px 32px' }}>
              <div style={{ backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.2)', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#0043CE', display: 'flex', gap: '10px' }}>
                <Phone size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  {isMarathi
                    ? 'तुमचे तपशील भरा आणि आम्ही तुम्हाला कॉल करू. या फॉर्मद्वारे कोणतेही पेमेंट घेतले जात नाही.'
                    : 'Fill in your details and we will call you to discuss your requirements and complete the upgrade. No payment is collected through this form.'}
                </span>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {/* Contact details */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                  {isMarathi ? 'संपर्क माहिती' : 'Contact Information'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormField label={isMarathi ? 'पूर्ण नाव *' : 'Full Name *'} value={form.contactName} onChange={v => setF('contactName', v)} placeholder="Ramesh Patel" error={errors.contactName} />
                  <FormField label={isMarathi ? 'फोन नंबर *' : 'Phone Number *'} value={form.contactPhone} onChange={v => setF('contactPhone', v)} placeholder="9876543210" error={errors.contactPhone} hint={isMarathi ? 'आम्ही या नंबरवर कॉल करू' : 'We will call this number'} />
                </div>
                <FormField label={isMarathi ? 'कंपनी / व्यवसायाचे नाव (पर्यायी)' : 'Company / Business Name (optional)'} value={form.companyName} onChange={v => setF('companyName', v)} placeholder="Patel Dairy" />

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  style={{ height: '52px', fontSize: '16px', marginTop: '8px' }}
                  disabled={submitting}
                >
                  {submitting
                    ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {isMarathi ? 'सादर होत आहे...' : 'Submitting...'}</>
                    : <><Phone size={16} /> {isMarathi ? 'विनंती सादर करा — आम्ही कॉल करू' : "Submit Request — We'll Call You"}</>}
                </button>
              </form>
            </div>

            {/* Order summary sidebar */}
            <div>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '20px 24px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                  {isMarathi ? 'ऑर्डर सारांश' : 'Order Summary'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  {(() => { const d = PLAN_DISPLAY[selectedPlan]; return <><d.icon size={16} color={d.color} /><span style={{ fontWeight: 700, color: d.color }}>{d.label}</span></>; })()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#525252' }}>{billingCycle === 'yearly' ? (isMarathi ? '१२ महिने' : '12 months') : `${months} ${isMarathi ? 'महिने' : `month${months > 1 ? 's' : ''}`}`}</span>
                  <span style={{ fontWeight: 600 }}>₹{pricing.subtotal}</span>
                </div>
                {pricing.setupCharge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#525252' }}>
                      {pricing.isFirstTime
                        ? (isMarathi ? 'एकवेळ सेटअप' : 'One-time setup')
                        : (isMarathi ? 'अपग्रेड शुल्क' : 'Upgrade fee')}
                      {!pricing.isFirstTime && currentPlan && currentPlan !== selectedPlan && (
                        <span style={{ fontSize: '11px', color: '#8D8D8D', display: 'block' }}>
                          {PLAN_DISPLAY[selectedPlan]?.label} ₹{pricing.setup} − {PLAN_DISPLAY[currentPlan]?.label} ₹{plans?.[currentPlan]?.setup ?? PLAN_SETUP_FEES[currentPlan] ?? 0}
                        </span>
                      )}
                    </span>
                    <span style={{ fontWeight: 600 }}>₹{pricing.setupCharge}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E0E0E0', paddingTop: '10px', marginTop: '4px', fontSize: '16px', fontWeight: 700 }}>
                  <span>{isMarathi ? 'एकूण' : 'Total'}</span>
                  <span style={{ color: '#0F62FE' }}>₹{pricing.subtotal + pricing.setupCharge}</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#F4F4F4', padding: '16px 20px', fontSize: '13px', color: '#525252' }}>
                <div style={{ fontWeight: 700, marginBottom: '10px', color: '#161616' }}>{isMarathi ? 'कसे काम करते' : 'How it works'}</div>
                {[
                  { icon: '1', text: isMarathi ? 'खाली तुमचे तपशील सादर करा' : 'Submit your details below' },
                  { icon: '2', text: isMarathi ? 'आमची टीम २४ तासांत कॉल करेल' : 'Our team calls you within 24 hours' },
                  { icon: '3', text: isMarathi ? 'योजना निश्चित करा आणि ऑफलाइन पेमेंट करा' : 'Confirm your plan and pay offline' },
                  { icon: '4', text: isMarathi ? 'आम्ही तुमची सदस्यता लगेच सक्रिय करतो' : 'We activate your subscription instantly' }
                ].map(s => (
                  <div key={s.icon} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: 20, height: 20, backgroundColor: '#0F62FE', color: '#FFFFFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                      {s.icon}
                    </div>
                    <span>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .details-grid { display: grid; }
          @media (max-width: 768px) { .details-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </div>
    );
  }

  // ── Plan selection ────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isMarathi ? 'तुमची योजना निवडा' : 'Choose Your Plan'}</h1>
      </div>

      <div className="page-body">
        {/* Current status banner */}
        {currentStatus && (
          <div style={{
            backgroundColor: currentStatus === 'trial' ? '#EDF5FF' : currentStatus === 'active' ? '#DEFBE6' : '#FFF1F1',
            border: `2px solid ${currentStatus === 'trial' ? 'rgba(15,98,254,0.2)' : currentStatus === 'active' ? '#24A148' : '#DA1E28'}`,
            padding: '16px 20px', marginBottom: '24px', fontSize: '14px',
            color: currentStatus === 'trial' ? '#0043CE' : currentStatus === 'active' ? '#0E6027' : '#DA1E28',
            fontWeight: currentStatus === 'expired' || currentStatus === 'inactive' ? 600 : 400
          }}>
            {currentStatus === 'trial'    && (isMarathi ? '🕐 तुम्ही विनामूल्य ट्रायलवर आहात. ट्रायल संपल्यानंतर सुरू ठेवण्यासाठी योजना निवडा.' : '🕐 You are on a free trial. Choose a plan to continue after the trial ends.')}
            {currentStatus === 'active'   && (isMarathi ? `✅ तुम्ही ${currentPlan} योजनेवर आहात. येथे अपग्रेड करा.` : `✅ You are on the ${currentPlan} plan. You can upgrade here.`)}
            {currentStatus === 'expired'  && (isMarathi ? '🔴 तुमची सदस्यता संपली आहे. खाते पुनर्संचयित करण्यासाठी खाली योजना निवडा.' : '🔴 Your subscription has expired. Choose a plan below to reactivate your account and restore all features.')}
            {currentStatus === 'inactive' && (isMarathi ? '⚠️ तुमची सदस्यता निष्क्रिय आहे. सपोर्टशी संपर्क करा किंवा खाली योजना निवडा.' : '⚠️ Your subscription is inactive. Contact support or choose a plan below.')}
          </div>
        )}

        {/* Billing cycle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', border: '1px solid #E0E0E0', overflow: 'hidden' }}>
            {['monthly', 'yearly'].map(c => (
              <button key={c} onClick={() => setBillingCycle(c)} style={{
                padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                backgroundColor: billingCycle === c ? '#161616' : '#FFFFFF',
                color: billingCycle === c ? '#FFFFFF' : '#525252',
                transition: 'all 0.1s', textTransform: 'capitalize'
              }}>
                {c}
              </button>
            ))}
          </div>
          {billingCycle === 'monthly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: '#525252' }}>Months:</span>
              {[1, 3, 6].map(m => (
                <button key={m} onClick={() => setMonths(m)} style={{
                  width: '36px', height: '36px',
                  border: `1px solid ${months === m ? '#0F62FE' : '#E0E0E0'}`,
                  backgroundColor: months === m ? '#EDF5FF' : '#FFFFFF',
                  color: months === m ? '#0F62FE' : '#525252',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600
                }}>
                  {m}
                </button>
              ))}
            </div>
          )}
          {billingCycle === 'yearly' && (
            <span style={{ fontSize: '13px', color: '#24A148', fontWeight: 600, backgroundColor: '#DEFBE6', padding: '4px 10px' }}>
              Get 2 months free*
            </span>
          )}
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {loadingPlans ? (
            [0,1,2].map(i => (
              <div key={i} className="skeleton-card" style={{ minHeight: '180px' }}>
                <div className="skeleton-row">
                  <div className="skeleton skeleton-line-lg" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                  <div className="skeleton skeleton-line-sm" style={{ width: '70%' }} />
                </div>
              </div>
            ))
          ) : (
            ['silver', 'gold', 'platinum'].map(key => {
              const d = PLAN_DISPLAY[key];
              const p = getPrice(key);
              const live = plans?.[key];
              const isSelected = selectedPlan === key;
              const isFirst = currentStatus === 'trial';

              return (
                <button key={key} onClick={() => {
                  if (isDowngrade(key)) {
                    setPendingDowngradePlan(key);
                    setShowDowngradeWarning(true);
                  } else {
                    setSelectedPlan(key);
                  }
                }} style={{
                  border: `2px solid ${isSelected ? d.border : '#E0E0E0'}`,
                  backgroundColor: isSelected ? d.bg : '#FFFFFF',
                  padding: '20px', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  position: 'relative'
                }}>
                  {d.recommended && (
                    <div style={{
                      position: 'absolute', top: '-1px', right: '12px',
                      backgroundColor: d.border, color: '#161616',
                      fontSize: '9px', fontWeight: 700, padding: '2px 8px',
                      textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>
                      POPULAR
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <d.icon size={18} color={d.color} />
                    <span style={{ fontWeight: 700, fontSize: '15px', color: d.color }}>{d.label}</span>
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: '#161616', marginBottom: '2px' }}>
                    ₹{billingCycle === 'yearly' ? p.subtotal : p.monthly}
                    <span style={{ fontSize: '13px', fontWeight: 400, color: '#525252' }}>
                      /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </div>
                  {isFirst && (
                    <div style={{ fontSize: '12px', color: '#8D8D8D', marginBottom: '6px' }}>
                      + ₹{p.setup} one-time setup
                    </div>
                  )}
                  {!isFirst && p.setupCharge > 0 && (
                    <div style={{ fontSize: '12px', color: '#FF832B', marginBottom: '6px', fontWeight: 600 }}>
                      + ₹{p.setupCharge} {isMarathi ? 'अपग्रेड शुल्क' : 'upgrade fee'}
                      {currentPlan && currentPlan !== key && (
                        <div style={{ fontWeight: 400, color: '#8D8D8D', fontSize: '11px', marginTop: '2px' }}>
                          {isMarathi
                            ? `${PLAN_DISPLAY[key]?.label} (₹${p.setup}) − ${PLAN_DISPLAY[currentPlan]?.label} (₹${plans?.[currentPlan]?.setup ?? PLAN_SETUP_FEES[currentPlan] ?? 0})`
                            : `${PLAN_DISPLAY[key]?.label} (₹${p.setup}) − ${PLAN_DISPLAY[currentPlan]?.label} (₹${plans?.[currentPlan]?.setup ?? PLAN_SETUP_FEES[currentPlan] ?? 0})`}
                        </div>
                      )}
                    </div>
                  )}
                  {!isFirst && p.setupCharge === 0 && currentPlan && currentPlan !== key && (
                    <div style={{ fontSize: '12px', color: '#24A148', marginBottom: '6px', fontWeight: 600 }}>
                      ✓ No additional setup fee
                    </div>
                  )}
                  {!isFirst && currentPlan === key && (
                    <div style={{ fontSize: '12px', color: '#24A148', marginBottom: '6px', fontWeight: 600 }}>
                      ✓ Current plan — renew
                    </div>
                  )}
                  {isDowngrade(key) && !isSelected && (
                    <div style={{ fontSize: '11px', color: '#8D8D8D', marginBottom: '6px' }}>⬇ Downgrade — features will be reduced</div>
                  )}
                  <div style={{ fontSize: '12px', color: '#525252', marginTop: '6px' }}>
                    {live?.description || ''}
                  </div>
                  {isSelected && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px', color: d.color, fontSize: '12px', fontWeight: 700 }}>
                      <Check size={12} /> Selected
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Proceed button */}
        <button
          className="btn btn-primary"
          style={{ minWidth: '220px', height: '48px', fontSize: '15px' }}
          onClick={() => setStep('details')}
          disabled={loadingPlans}
        >
          <Phone size={16} /> {isMarathi ? `${PLAN_DISPLAY[selectedPlan]?.label} सह सुरू ठेवा` : `Continue with ${PLAN_DISPLAY[selectedPlan]?.label}`}
        </button>
        <p style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '10px' }}>
          {isMarathi ? 'ऑनलाइन पेमेंट नाही. आमची टीम तुम्हाला कॉल करेल.' : 'No online payment. Our team will call you to complete the process.'}
        </p>
      </div>

      {showDowngradeWarning && (
        <div className="modal-overlay" onClick={() => setShowDowngradeWarning(false)}>
          <div className="modal" style={{ maxWidth: '640px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: 40, height: 40, backgroundColor: '#FFF8E1', border: '2px solid #F1C21B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} color="#B28600" />
              </div>
              <h2 style={{ fontWeight: 700, fontSize: '18px' }}>
                {isMarathi ? 'योजना बदलण्याचा विचार करत आहात?' : 'Thinking of switching plans?'}
              </h2>
            </div>

            <p style={{ color: '#525252', fontSize: '14px', lineHeight: 1.7, marginBottom: '16px' }}>
              {isMarathi
                ? <>तुम्ही सध्या <strong>{PLAN_DISPLAY[currentPlan]?.label}</strong> वर आहात. कमी योजनेवर जाण्यामुळे तुमच्या <strong>{PLAN_DISPLAY[currentPlan]?.label}</strong> च्या सर्व सुविधा परत न मिळणाऱ्या शुल्काशिवाय कमी होतील.</>
                : <>You're currently on <strong>{PLAN_DISPLAY[currentPlan]?.label}</strong>. Downgrading will remove all <strong>{PLAN_DISPLAY[currentPlan]?.label}</strong> features — your current plan payment is non-refundable.</>}
            </p>

            <div style={{ backgroundColor: '#FFF8E1', border: '1px solid #F1C21B', padding: '14px 16px', marginBottom: '16px', fontSize: '13px', color: '#B28600' }}>
              <strong>{isMarathi ? 'महत्त्वाचे:' : 'Important:'}</strong>{' '}
              {isMarathi
                ? `तुमच्या ${PLAN_DISPLAY[currentPlan]?.label} योजनेचे शुल्क परत मिळणार नाही. सध्याचा बिलिंग कालावधी संपेपर्यंत तुम्हाला सर्व सुविधा मिळत राहतील — आत्ता बदल करण्याचा कोणताही फायदा नाही.`
                : `Your ${PLAN_DISPLAY[currentPlan]?.label} plan payment is non-refundable. You'll retain full access until your current billing period ends — there's no benefit to switching now.`}
            </div>

            <p style={{ color: '#525252', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
              {isMarathi
                ? 'आम्ही शिफारस करतो की तुम्ही तुमच्या सध्याच्या योजनेवर राहा आणि पुढील नूतनीकरणाच्या वेळी पुनर्विचार करा. तरीही पुढे जायचे असल्यास, तुमची डाउनग्रेड विनंती आमच्या टीमकडून तपासली जाईल.'
                : 'We recommend staying on your current plan and reconsidering at your next renewal. If you still want to proceed, your downgrade request will be reviewed by our team.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn btn-primary btn-full"
                onClick={() => setShowDowngradeWarning(false)}
              >
                {isMarathi ? `${PLAN_DISPLAY[currentPlan]?.label} ठेवा — सध्याच्या योजनेवर राहा` : `Keep ${PLAN_DISPLAY[currentPlan]?.label} — Stay on current plan`}
              </button>
              <button
                className="btn btn-ghost btn-full"
                style={{ color: '#8D8D8D', fontSize: '13px' }}
                onClick={() => {
                  setSelectedPlan(pendingDowngradePlan);
                  setShowDowngradeWarning(false);
                  setPendingDowngradePlan(null);
                }}
              >
                {isMarathi ? 'डाउनग्रेड विनंती पुढे पाठवा' : 'Proceed with downgrade request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Reusable form field ───────────────────────────────────────
const FormField = ({ label, value, onChange, placeholder, error, hint, type = 'text' }) => (
  <div className="input-group" style={{ marginBottom: '14px' }}>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#525252', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {label}
    </label>
    <input
      type={type}
      className="input"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={error ? { borderColor: '#DA1E28' } : {}}
      autoComplete="off"
    />
    {error && <div style={{ fontSize: '11px', color: '#DA1E28', marginTop: '3px' }}>{error}</div>}
    {hint && !error && <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '3px' }}>{hint}</div>}
  </div>
);

export default Upgrade;
