import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Mail, Lock, Building2, ArrowRight, ArrowLeft, Check, CreditCard, Shield, Activity, Users } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const PLANS = [
  {
    id: 'silver',
    name: 'Silver',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#cbd5e1',
    features: ['Up to 50 customers', '2 staff members', 'Manual billing', 'Basic reports'],
    icon: '🥈',
  },
  {
    id: 'gold',
    name: 'Gold',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fcd34d',
    features: ['Up to 150 customers', '5 staff members', 'Auto PDF billing', 'WhatsApp alerts'],
    icon: '🥇',
    popular: true,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#c4b5fd',
    features: ['Unlimited customers', '15 staff members', 'Auto + Export billing', 'Advanced reports', 'Priority support'],
    icon: '💎',
  },
];

/* ─── Eye SVGs ──────────────────────────────────────────────── */
const EyeOpen = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeClosed = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const loadScript = (src) => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const inputStyle = {
  width: '100%', padding: '12px 14px 12px 44px',
  backgroundColor: '#f8fafc', border: '1.5px solid #e2e8f0',
  borderRadius: '10px', fontSize: '15px', color: '#0f172a',
  outline: 'none', transition: 'border-color 0.2s, background-color 0.2s', boxSizing: 'border-box',
};

const selectStyle = {
  ...inputStyle,
  paddingLeft: '44px',
  appearance: 'none',
  cursor: 'pointer'
};

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b',
  marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px',
};

const IconWrap = ({ children }) => (
  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
    {children}
  </span>
);

const OwnerRegister = () => {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('gold');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  
  // Step 2: Business Details
  const [businessName, setBusinessName] = useState('');
  const [ownerRole, setOwnerRole] = useState('dairy_owner');
  const [maxCustomers, setMaxCustomers] = useState('');
  const [maxStaff, setMaxStaff] = useState('');

  // Step 3: Account Setup
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentId, setPaymentId] = useState(null);

  const toast = useToast();
  const { setSession, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If they navigate to /register while logged in, redirect them (unless on success/fail steps)
    if (user && step < 5) {
      navigate('/app/owner', { replace: true });
    }
  }, [user, step, navigate]);

  const handleNext = () => {
    if (step === 2 && !businessName.trim()) {
      toast.error('Dairy / Business Name is required');
      return;
    }
    if (step === 3) {
      if (!name.trim() || !phone.trim() || !password) {
        toast.error('Name, phone, and password are required');
        return;
      }
      if (phone.length !== 10) {
        toast.error('Enter a valid 10-digit phone number');
        return;
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      if (password !== confirm) {
        toast.error('Passwords do not match');
        return;
      }
    }
    // Only allow max step of 4 from the "Next" buttons manually
    setStep(s => Math.min(s + 1, 4));
  };

  const currentPlanObj = PLANS.find(p => p.id === selectedPlan) || PLANS[1];
  const currentAmount = billingCycle === 'yearly' ? currentPlanObj.yearlyPrice : currentPlanObj.monthlyPrice;

  // Razorpay Checkout
  const handlePayment = async () => {
    setLoading(true);
    
    // Ensure script is loaded
    const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you offline?');
      setLoading(false);
      return;
    }

    try {
      // 1. Create order on backend
      const { data: orderData } = await api.post('/auth/create-razorpay-order', {
        amount: currentAmount,
        currency: 'INR'
      });

      // 2. Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TOR9jjo2EcGCo3',
        amount: orderData.amount,
        currency: 'INR',
        name: 'Dairy Management System',
        description: `${currentPlanObj.name} Plan (${billingCycle})`,
        image: 'https://cdn-icons-png.flaticon.com/512/375/375073.png',
        order_id: orderData.orderId,
        handler: async function (response) {
          // 3. Verify and register
          await finalizeRegistration(response);
        },
        prefill: {
          name: name,
          email: email,
          contact: phone
        },
        theme: {
          color: '#0F62FE'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setPaymentError({
          code: response.error.code,
          description: response.error.description,
          source: response.error.source,
          step: response.error.step,
          reason: response.error.reason,
          metadata: response.error.metadata,
        });
        setLoading(false);
        setStep(5); // Show explicit failure page
      });
      rzp.open();
    } catch (err) {
      console.error('Payment initialization error:', err);
      toast.error(err.response?.data?.error || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  const handleSkipPayment = async () => {
    setLoading(true);
    await finalizeRegistration({});
  };

  const finalizeRegistration = async (paymentDetails = {}) => {
    try {
      const res = await api.post('/auth/register', {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        businessName: businessName.trim(),
        password,
        plan: selectedPlan,
        billingCycle,
        ownerRole,
        maxCustomers: maxCustomers ? parseInt(maxCustomers) : undefined,
        maxStaff: maxStaff ? parseInt(maxStaff) : undefined,
        razorpay_payment_id: paymentDetails.razorpay_payment_id,
        razorpay_order_id: paymentDetails.razorpay_order_id,
        razorpay_signature: paymentDetails.razorpay_signature,
      });
      
      setSession(res.data.user, res.data.token);
      setPaymentId(paymentDetails.razorpay_payment_id || 'trial_opt_in');
      setStep(6); // Success Step
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
      setPaymentError({ description: err.response?.data?.error || 'Failed to complete registration on our end.' });
      setStep(5); // Registration failed page
      setLoading(false);
    }
  };

  const onFocus = (e) => { e.currentTarget.style.borderColor = '#0F62FE'; e.currentTarget.style.backgroundColor = '#fff'; };
  const onBlur  = (e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #fafafa 50%, #f0fdf4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: (step === 1 || step === 4) ? '780px' : '440px', transition: 'max-width 0.3s ease' }}>

        {/* ── Top bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          {step >= 5 ? <div /> : (
            <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/login')} 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#0f172a'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          
          {/* Step indicator */}
          {step < 5 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {[1, 2, 3, 4].map(s => (
                <React.Fragment key={s}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: step >= s ? '#0F62FE' : '#e2e8f0',
                    color: step >= s ? '#fff' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, transition: 'all 0.3s',
                  }}>
                    {step > s ? <Check size={13} /> : s}
                  </div>
                  {s < 4 && <div style={{ width: '20px', height: '2px', backgroundColor: step > s ? '#0F62FE' : '#e2e8f0', transition: 'background-color 0.3s' }} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* ── STEP 1: Plan Selection ── */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
                Choose Your Plan
              </h1>
              
              {/* Billing Toggle */}
              <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#e2e8f0', borderRadius: '30px', padding: '4px' }}>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    padding: '8px 20px', borderRadius: '24px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: billingCycle === 'monthly' ? '#fff' : 'transparent',
                    color: billingCycle === 'monthly' ? '#0f172a' : '#64748b',
                    boxShadow: billingCycle === 'monthly' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                  }}>
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  style={{
                    padding: '8px 20px', borderRadius: '24px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
                    backgroundColor: billingCycle === 'yearly' ? '#fff' : 'transparent',
                    color: billingCycle === 'yearly' ? '#0f172a' : '#64748b',
                    boxShadow: billingCycle === 'yearly' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                  }}>
                  Yearly <span style={{ backgroundColor: '#dcfce3', color: '#166534', padding: '2px 6px', borderRadius: '10px', fontSize: '10px' }}>Save 16%</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {PLANS.map(plan => {
                const selected = selectedPlan === plan.id;
                const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    style={{
                      backgroundColor: selected ? plan.bg : '#fff',
                      border: `2px solid ${selected ? plan.color : '#e2e8f0'}`,
                      borderRadius: '16px', padding: '24px',
                      cursor: 'pointer', position: 'relative',
                      transition: 'all 0.2s ease',
                      boxShadow: selected ? `0 8px 24px ${plan.color}20` : '0 1px 3px rgba(0,0,0,0.04)',
                      transform: selected ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    {plan.popular && (
                      <div style={{
                        position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                        backgroundColor: '#0F62FE', color: '#fff',
                        fontSize: '10px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px',
                        textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap',
                      }}>Most Popular</div>
                    )}
                    {selected && (
                      <div style={{
                        position: 'absolute', top: '12px', right: '12px',
                        width: '22px', height: '22px', borderRadius: '50%',
                        backgroundColor: plan.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={13} color="#fff" />
                      </div>
                    )}
                    <div style={{ fontSize: '28px', marginBottom: '10px' }}>{plan.icon}</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: plan.color, marginBottom: '2px' }}>{plan.name}</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      ₹{price} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                      {billingCycle === 'yearly' && (
                        <span style={{ marginLeft: 'auto', backgroundColor: '#dcfce3', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                          16% OFF
                        </span>
                      )}
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: '#475569' }}>
                          <Check size={13} color={plan.color} style={{ flexShrink: 0 }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleNext}
              style={{
                width: '100%', padding: '15px',
                backgroundColor: '#0F62FE', color: '#fff',
                border: 'none', borderRadius: '12px',
                fontSize: '16px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 16px #0F62FE35',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              Continue with {PLANS.find(p => p.id === selectedPlan)?.name} Plan <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Business Profile ── */}
        {step === 2 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -12px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '32px 32px 0', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', color: '#0F62FE', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Building2 size={24} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                Business Profile
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>Tell us a bit about your dairy operations.</p>
            </div>

            <div style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Business Name */}
              <div>
                <label style={labelStyle}>Dairy / Business Name</label>
                <div style={{ position: 'relative' }}>
                  <IconWrap><Building2 size={17} color="#94a3b8" /></IconWrap>
                  <input type="text" placeholder="e.g. Amrit Dairy"
                    value={businessName} onChange={e => setBusinessName(e.target.value)} required
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              {/* Owner Role */}
              <div>
                <label style={labelStyle}>Business Type</label>
                <div style={{ position: 'relative' }}>
                  <IconWrap><Shield size={17} color="#94a3b8" /></IconWrap>
                  <select 
                    value={ownerRole} onChange={e => setOwnerRole(e.target.value)}
                    style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
                    <option value="dairy_owner">Dairy Owner (Purchases Milk)</option>
                    <option value="milk_supplier">Milk Supplier (Sells Milk)</option>
                  </select>
                  <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Max Customers */}
                <div>
                  <label style={labelStyle}>Expected Customers</label>
                  <div style={{ position: 'relative' }}>
                    <IconWrap><Users size={17} color="#94a3b8" /></IconWrap>
                    <input type="number" placeholder="Optional"
                      value={maxCustomers} onChange={e => setMaxCustomers(e.target.value)}
                      style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>

                {/* Max Staff */}
                <div>
                  <label style={labelStyle}>Expected Staff</label>
                  <div style={{ position: 'relative' }}>
                    <IconWrap><User size={17} color="#94a3b8" /></IconWrap>
                    <input type="number" placeholder="Optional"
                      value={maxStaff} onChange={e => setMaxStaff(e.target.value)}
                      style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                style={{
                  marginTop: '12px', width: '100%', padding: '14px',
                  backgroundColor: '#0F62FE', color: '#fff', border: 'none', borderRadius: '12px',
                  fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 16px #0F62FE35', transition: 'all 0.2s',
                }}
              >
                Next Step <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Account Setup ── */}
        {step === 3 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -12px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '32px 32px 0', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', color: '#0F62FE', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <User size={24} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                Account Setup
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>Set your login credentials.</p>
            </div>

            <div style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Full Name */}
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <IconWrap><User size={17} color="#94a3b8" /></IconWrap>
                    <input type="text" autoComplete="name" placeholder="Your name"
                      value={name} onChange={e => setName(e.target.value)} required
                      style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <IconWrap><Phone size={17} color="#94a3b8" /></IconWrap>
                    <input type="tel" autoComplete="tel" placeholder="10-digit number"
                      value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required
                      style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email Address (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <IconWrap><Mail size={17} color="#94a3b8" /></IconWrap>
                  <input type="email" autoComplete="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Password */}
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <IconWrap><Lock size={17} color="#94a3b8" /></IconWrap>
                    <input type={showPw ? 'text' : 'password'} autoComplete="new-password"
                      placeholder="Min 6 characters" value={password}
                      onChange={e => setPassword(e.target.value)} required minLength={6}
                      style={{ ...inputStyle, paddingRight: '44px' }} onFocus={onFocus} onBlur={onBlur} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                      {showPw ? <EyeOpen size={17} /> : <EyeClosed size={17} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <IconWrap><Lock size={17} color="#94a3b8" /></IconWrap>
                    <input type={showCf ? 'text' : 'password'} autoComplete="new-password"
                      placeholder="Repeat password" value={confirm}
                      onChange={e => setConfirm(e.target.value)} required
                      style={{ ...inputStyle, paddingRight: '44px', borderColor: confirm && confirm !== password ? '#ef4444' : undefined }}
                      onFocus={onFocus} onBlur={onBlur} />
                    <button type="button" onClick={() => setShowCf(v => !v)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                      {showCf ? <EyeOpen size={17} /> : <EyeClosed size={17} />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0' }}>Passwords don't match</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleNext}
                style={{
                  marginTop: '12px', width: '100%', padding: '14px',
                  backgroundColor: '#0F62FE', color: '#fff', border: 'none', borderRadius: '12px',
                  fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 16px #0F62FE35', transition: 'all 0.2s',
                }}
              >
                Proceed to Checkout <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Payment / Checkout ── */}
        {step === 4 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Left: Summary */}
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px' }}>Order Summary</h2>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{currentPlanObj.name} Plan</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{billingCycle === 'yearly' ? 'Annual billing' : 'Monthly billing'}</div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>₹{currentAmount}</div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '14px', color: '#475569' }}>
                <span>Subtotal</span>
                <span>₹{currentAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '14px', color: '#16a34a', fontWeight: 500 }}>
                <span>Discount</span>
                <span>-₹0</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Total Due Today</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F62FE' }}>₹{currentAmount}</span>
              </div>
            </div>
            
            {/* Right: Payment Actions */}
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0 16px' }}>
                <Shield size={24} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Secure Checkout</h2>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 32px' }}>Complete your purchase securely via Razorpay.</p>
              
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '16px',
                    backgroundColor: '#0F62FE', color: '#fff', border: 'none', borderRadius: '12px',
                    fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 16px #0F62FE35', transition: 'all 0.2s',
                  }}
                >
                  {loading ? 'Processing...' : <>Pay ₹{currentAmount} Securely <CreditCard size={18} /></>}
                </button>
                
                <button
                  onClick={handleSkipPayment}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '16px',
                    backgroundColor: 'transparent', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '12px',
                    fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if(!loading) { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.borderColor = '#cbd5e1'; } }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  Start 14-Day Free Trial Instead
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '24px', color: '#94a3b8', fontSize: '12px' }}>
                <Lock size={12} /> 256-bit SSL Encrypted
              </div>
            </div>
          </div>
        )}
        
        {/* ── STEP 5: Payment Failed ── */}
        {step === 5 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '48px 32px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <Shield size={40} strokeWidth={2} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Payment Failed</h2>
            <p style={{ color: '#475569', fontSize: '15px', margin: '0 0 24px' }}>
              We couldn't process your payment. Your details are saved, please try again.
            </p>
            
            {paymentError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#b91c1c', fontWeight: 600 }}>Error Details:</p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#7f1d1d' }}>{paymentError.description || paymentError.reason || 'Unknown error occurred.'}</p>
                {paymentError.metadata?.payment_id && (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#991b1b' }}>Payment ID: {paymentError.metadata.payment_id}</p>
                )}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => { setStep(4); setPaymentError(null); }}
                style={{
                  padding: '12px 24px', backgroundColor: '#0F62FE', color: '#fff', border: 'none', borderRadius: '12px',
                  fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(15, 98, 254, 0.2)'
                }}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: Success & Welcome ── */}
        {step === 6 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '48px 32px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#22c55e', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Welcome Aboard!</h2>
            <p style={{ color: '#475569', fontSize: '16px', margin: '0 0 12px' }}>Your account has been successfully created.</p>
            
            {paymentId && paymentId !== 'trial_opt_in' && (
              <div style={{ marginBottom: '32px', fontSize: '13px', color: '#64748b', backgroundColor: '#f8fafc', display: 'inline-block', padding: '8px 16px', borderRadius: '20px' }}>
                Payment ID: <span style={{ fontWeight: 600, color: '#0f172a' }}>{paymentId}</span>
              </div>
            )}
            <br/>

            <button 
              onClick={() => navigate('/app/owner', { replace: true })}
              style={{
                padding: '14px 32px', backgroundColor: '#0F62FE', color: '#fff', border: 'none', borderRadius: '12px',
                fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(15, 98, 254, 0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '8px'
              }}>
              Go to Dashboard <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

// SVG component helper for ChevronDown
const ChevronDown = ({ size = 24, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default OwnerRegister;
