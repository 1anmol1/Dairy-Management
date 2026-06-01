import React, { useState, useEffect } from 'react';
import { Check, X, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SiteFooter from '../../components/SiteFooter';
import { useMarathi } from '../../i18n/marathi';
import axios from 'axios';

// ── Plan display config ───────────────────────────────────────
const PLAN_DISPLAY = {
  silver: {
    color: '#8D8D8D', bg: '#FFFFFF', borderTop: null, shadow: null,
    badge: false, badgeColor: null, badgeText: null,
    ctaStyle: { backgroundColor: '#FFFFFF', color: '#0F62FE', border: '1px solid #0F62FE' }
  },
  gold: {
    color: '#B8860B', bg: 'linear-gradient(135deg, #FFFDF5 0%, #FFF3CC 100%)',
    borderTop: '4px solid #D4AF37',
    shadow: '0 10px 40px rgba(212,175,55,0.15)',
    badge: true, badgeColor: '#D4AF37',
    ctaStyle: { backgroundColor: '#D4AF37', color: '#161616', border: 'none', boxShadow: '0 4px 14px rgba(212,175,55,0.4)' }
  },
  platinum: {
    color: '#525252', bg: 'linear-gradient(135deg, #F8F9FA 0%, #E5E4E2 100%)',
    borderTop: '4px solid #A0A0A0',
    shadow: '0 10px 40px rgba(160,160,160,0.15)',
    badge: true, badgeColor: '#A0A0A0',
    ctaStyle: { backgroundColor: '#161616', color: '#FFFFFF', border: 'none' }
  }
};

// ── Static features ───────────────────────────────────────────
const PLAN_STATIC_FEATURES = {
  silver: {
    included: ['Up to 50 customers', 'Up to 2 staff', 'Daily milk entry (morning + evening)', 'Manual billing', 'Payment recording'],
    excluded: ['Automatic Monthly Billing', 'PDF Bill Generation', 'WhatsApp Alerts', 'Advanced Reports', 'Data export (Excel/PDF)']
  },
  gold: {
    included: ['Everything in Silver', 'Up to 150 customers', 'Up to 5 staff', 'Automatic monthly billing', 'Payment tracking and history', 'PDF bill download', 'WhatsApp alerts', 'Employee separate login'],
    excluded: ['Advanced analytics', 'Data export (Excel/PDF)']
  },
  platinum: {
    included: ['Everything in Gold', 'Unlimited customers', 'Up to 15 staff', 'Automatic monthly billing', 'Payment tracking and history', 'Advanced reports and analytics', 'Priority support', 'Data export (Excel/PDF)', 'Dedicated onboarding support', 'Custom rate management', 'Custom WhatsApp message templates'],
    excluded: []
  }
};

// Marathi feature labels
const MR_FEATURES = {
  'Up to 50 customers': 'सर्वाधिक ५० ग्राहक',
  'Up to 2 staff': 'सर्वाधिक २ कर्मचारी',
  'Daily milk entry (morning + evening)': 'रोजची दूध नोंद (सकाळ + संध्याकाळ)',
  'Manual billing': 'मॅन्युअल बिलिंग',
  'Payment recording': 'देयक नोंद',
  'Automatic Monthly Billing': 'आपोआप मासिक बिलिंग',
  'PDF Bill Generation': 'PDF बिल तयार करणे',
  'WhatsApp Alerts': 'WhatsApp अलर्ट',
  'Advanced Reports': 'प्रगत अहवाल',
  'Data export (Excel/PDF)': 'डेटा एक्सपोर्ट (Excel/PDF)',
  'Everything in Silver': 'सिल्व्हरमधील सर्व काही',
  'Up to 150 customers': 'सर्वाधिक १५० ग्राहक',
  'Up to 5 staff': 'सर्वाधिक ५ कर्मचारी',
  'Automatic monthly billing': 'आपोआप मासिक बिलिंग',
  'Payment tracking and history': 'देयक ट्रॅकिंग आणि इतिहास',
  'PDF bill download': 'PDF बिल डाउनलोड',
  'WhatsApp alerts': 'WhatsApp अलर्ट',
  'Employee separate login': 'कर्मचारी स्वतंत्र लॉगिन',
  'Advanced analytics': 'प्रगत विश्लेषण',
  'Everything in Gold': 'गोल्डमधील सर्व काही',
  'Unlimited customers': 'अमर्यादित ग्राहक',
  'Up to 15 staff': 'सर्वाधिक १५ कर्मचारी',
  'Advanced reports and analytics': 'प्रगत अहवाल आणि विश्लेषण',
  'Priority support': 'प्राधान्य सपोर्ट',
  'Dedicated onboarding support': 'समर्पित ऑनबोर्डिंग सपोर्ट',
  'Custom rate management': 'कस्टम दर व्यवस्थापन',
  'Custom WhatsApp message templates': 'कस्टम WhatsApp संदेश टेम्पलेट',
};

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [plans, setPlans] = useState(null);
  const { isMarathi } = useMarathi();

  useEffect(() => {
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    axios.get(`${baseURL}/payment/plans`)
      .then(r => setPlans(r.data.plans))
      .catch(() => {});
  }, []);

  const planOrder = ['silver', 'gold', 'platinum'];

  const getPlanCard = (key) => {
    const live = plans?.[key];
    const display = PLAN_DISPLAY[key];
    const staticF = PLAN_STATIC_FEATURES[key];

    return {
      key,
      name: live?.label || (key === 'silver' ? 'Amrit Silver' : key === 'gold' ? 'Amrit Gold' : 'Amrit Platinum'),
      description: live?.description || (
        key === 'silver' ? (isMarathi ? 'एंट्री योजना – मूलभूत वापर' : 'Entry plan – basic usage only') :
        key === 'gold'   ? (isMarathi ? 'मुख्य योजना – पूर्ण कार्यप्रणाली' : 'Main plan – full working system') :
                           (isMarathi ? 'प्रीमियम योजना – प्रगत वापर' : 'Premium plan – advanced usage')
      ),
      monthlyPrice: live?.monthly ?? (key === 'silver' ? 99 : key === 'gold' ? 199 : 399),
      yearlyPrice: live
        ? (() => { const base = Math.round(live.monthly * 10); return base - (base % 10) + 9; })()
        : (key === 'silver' ? 999 : key === 'gold' ? 1999 : 3999),
      monthlyStrike: live ? Math.round(live.monthly * 1.5) : (key === 'silver' ? 149 : key === 'gold' ? 299 : 599),
      yearlyStrike: live ? Math.round(live.monthly * 12) : null,
      setupFee: live?.setup ?? (key === 'silver' ? 499 : key === 'gold' ? 1499 : 1999),
      included: staticF.included,
      excluded: staticF.excluded,
      display
    };
  };

  const mr = (en) => isMarathi ? (MR_FEATURES[en] || en) : en;

  const badgeText = {
    gold:     isMarathi ? 'सर्वात लोकप्रिय (सर्वोत्तम मूल्य)' : 'Most Popular (Best Value)',
    platinum: isMarathi ? 'एंटरप्राइझ निवड' : 'Enterprise Choice',
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF', color: '#161616',
      fontFamily: isMarathi ? '"Noto Sans Devanagari", sans-serif' : 'Inter, sans-serif',
      minHeight: '100vh'
    }}>
      <Navbar />

      <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '80px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '24px' }}>
            {isMarathi ? 'सोपी, प्रामाणिक किंमत' : 'Simple, Honest Pricing'}
          </h1>

          <p style={{ color: '#525252', fontSize: '18px', maxWidth: '700px', margin: '0 auto', marginBottom: '40px' }}>
            {isMarathi
              ? 'ट्रायल आमच्या टीमशी चर्चेनंतर सुरू होते. तयार झाल्यावरच अपग्रेड करा.'
              : 'Trial starts upon discussion with our team. Upgrade only when you are ready.'}
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', border: '1px solid #E0E0E0', padding: '4px', backgroundColor: '#F4F4F4' }}>
              {['monthly', 'yearly'].map(cycle => (
                <button key={cycle} onClick={() => setBillingCycle(cycle)} style={{
                  padding: '8px 24px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                  backgroundColor: billingCycle === cycle ? '#FFFFFF' : 'transparent',
                  color: billingCycle === cycle ? '#0F62FE' : '#525252',
                  boxShadow: billingCycle === cycle ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s', textTransform: 'capitalize'
                }}>
                  {isMarathi ? (cycle === 'monthly' ? 'मासिक' : 'वार्षिक') : cycle}
                </button>
              ))}
            </div>
            <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {billingCycle === 'yearly' && (
                <span style={{
                  color: '#24A148', fontSize: '14px', fontWeight: 700,
                  backgroundColor: '#E5F6EB', padding: '4px 20px',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div className="shine-sweep" />
                  <Tag size={14} style={{ position: 'relative', zIndex: 1 }} />
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {isMarathi ? 'वार्षिक बिलिंगसह २ महिने मोफत' : 'Get 2 months free with yearly billing'}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '64px' }}>
          {planOrder.map(key => {
            const plan = getPlanCard(key);
            const d = plan.display;
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const strike = billingCycle === 'monthly' ? plan.monthlyStrike : plan.yearlyStrike;
            // Silver has no badge strip — add top padding to match gold/platinum visual height
            const topPad = d.badge ? '40px' : '56px';

            return (
              <div key={key}
                style={{
                  background: d.bg || '#FFFFFF',
                  border: '1px solid #E0E0E0',
                  borderTop: d.borderTop || '1px solid #E0E0E0',
                  padding: `${topPad} 32px 40px`,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: d.shadow || 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  overflow: 'hidden'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = d.shadow
                    ? d.shadow.replace('0.15)', '0.25)')
                    : '0 12px 32px rgba(0,0,0,0.08)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = d.shadow || 'none';
                }}
              >
                {/* Badge */}
                {d.badge && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    backgroundColor: d.badgeColor,
                    color: d.badgeColor === '#D4AF37' ? '#161616' : 'white',
                    textAlign: 'center', fontSize: '12px', fontWeight: 700, padding: '6px 0',
                    textTransform: 'uppercase', letterSpacing: '1px', zIndex: 2
                  }}>
                    {badgeText[key]}
                  </div>
                )}

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Name + description */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: d.color }}>
                      {plan.name}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.5 }}>{plan.description}</p>
                  </div>

                  {/* Pricing — no asterisk */}
                  <div style={{ marginBottom: '28px' }}>
                    {strike && (
                      <div style={{ fontSize: '14px', color: '#8D8D8D', textDecoration: 'line-through', marginBottom: '2px' }}>
                        ₹{strike}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '42px', fontWeight: 700 }}>₹{price}</span>
                      <span style={{ fontSize: '16px', color: '#525252' }}>
                        /{billingCycle === 'monthly' ? (isMarathi ? 'महिना' : 'mo') : (isMarathi ? 'वर्ष' : 'yr')}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#525252', marginTop: '6px' }}>
                      ₹{plan.setupFee} {isMarathi ? 'एकवेळ सेटअप' : 'one-time setup'}
                    </div>
                  </div>

                  {/* Features */}
                  <div style={{ display: 'grid', gap: '12px', flexGrow: 1, marginBottom: '28px' }}>
                    {plan.included.map((f, j) => {
                      const is15Staff = f === 'Up to 15 staff';
                      const tooltipText = isMarathi
                        ? '१५ पेक्षा जास्त कर्मचाऱ्यांची आवश्यकता आहे? तुमच्या मर्जीनुसार मर्यादा वाढवण्यासाठी आमच्याशी संपर्क साधा.'
                        : 'Staff limit can be extended beyond 15 upon request. Contact support for details.';
                      return (
                        <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px' }}>
                          <Check size={16} color={key === 'gold' ? '#B8860B' : '#24A148'} style={{ flexShrink: 0, marginTop: '1px' }} />
                          <span
                            title={is15Staff ? tooltipText : undefined}
                            style={is15Staff ? { borderBottom: '1px dotted #8D8D8D', cursor: 'help' } : {}}
                          >
                            {mr(f)}{is15Staff ? '*' : ''}
                          </span>
                        </div>
                      );
                    })}
                    {plan.excluded.map((f, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#8D8D8D' }}>
                        <X size={16} color="#DA1E28" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>{mr(f)}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link to="/start"
                    style={{
                      ...d.ctaStyle,
                      padding: '14px', textAlign: 'center', fontWeight: 700,
                      textDecoration: 'none', fontSize: '15px',
                      display: 'block', transition: 'filter 0.15s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.filter = 'brightness(0.88)'; }}
                    onMouseOut={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
                  >
                    {isMarathi ? 'सुरू करा' : 'Start Free Trial'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Yearly footnote — no asterisk, just plain text */}
        {billingCycle === 'yearly' && (
          <p style={{ fontSize: '12px', color: '#8D8D8D', textAlign: 'center', marginBottom: '64px', lineHeight: 1.5 }}>
            {isMarathi
              ? 'वार्षिक किंमत अंदाजे दोन महिन्यांच्या बचतीइतकी आहे.'
              : 'Equivalent to approximately two months of savings; annual pricing standardized.'}
          </p>
        )}

        {/* FAQ section — fully in Marathi when active */}
        <div style={{ maxWidth: '800px', margin: '0 auto', borderTop: '1px solid #E0E0E0', paddingTop: '64px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '32px', textAlign: 'center' }}>
            {isMarathi ? 'वारंवार विचारले जाणारे प्रश्न' : 'Frequently Asked Questions'}
          </h2>
          <div style={{ display: 'grid', gap: '32px', textAlign: 'left' }}>
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>
                {isMarathi ? 'नंतर योजना बदलता येते का?' : 'Can I switch plans later?'}
              </h4>
              <p style={{ color: '#525252', fontSize: '15px' }}>
                {isMarathi
                  ? 'हो, तुम्ही कधीही डॅशबोर्डवरून अपग्रेड किंवा डाउनग्रेड करू शकता.'
                  : 'Yes, you can upgrade or downgrade at any time from your dashboard.'}
              </p>
            </div>
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>
                {isMarathi ? 'दीर्घकालीन करार आहे का?' : 'Is there a long-term contract?'}
              </h4>
              <p style={{ color: '#525252', fontSize: '15px' }}>
                {isMarathi
                  ? 'नाही. जसे वापरा तसे द्या. कधीही रद्द करा आणि पुढील कालावधीसाठी शुल्क आकारले जाणार नाही.'
                  : "No. Pay as you go. Cancel anytime and you won't be charged for the next period."}
              </p>
            </div>
          </div>

          {/* View all FAQs — button style, Marathi */}
          <div style={{ marginTop: '48px', textAlign: 'center' }}>
            <Link to="/faq" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#EDF5FF', color: '#0F62FE',
              border: '1.5px solid #0F62FE',
              padding: '12px 28px', fontWeight: 700, fontSize: '15px',
              textDecoration: 'none', transition: 'background-color 0.15s'
            }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#D0E2FF'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = '#EDF5FF'; }}
            >
              {isMarathi ? 'सर्व प्रश्न पाहा →' : 'View all FAQs →'}
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />

      <style>{`
        @keyframes shineSweep {
          0%   { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(220%) skewX(-20deg); }
        }
        .shine-sweep {
          position: absolute;
          top: -20%;
          left: 0;
          width: 40%;
          height: 140%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0) 30%,
            rgba(255,255,255,0.55) 50%,
            rgba(255,255,255,0) 70%,
            transparent 100%
          );
          filter: blur(6px);
          animation: shineSweep 3.5s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
