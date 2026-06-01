/**
 * Onboarding — /app/owner/onboarding
 *
 * Shown only on the FIRST login of an owner account.
 * Tracked server-side (User.onboardingDone) so it persists across devices.
 *
 * Page 1 — Welcome: personalised greeting, plan features, business name
 * Page 2 — Quick Setup: 3 key actions to get started
 *
 * Completion is written to the server only after BOTH pages are shown
 * and the owner clicks "Go to Dashboard" on page 2.
 * If the owner backs out or closes before finishing, they see onboarding again.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { useMarathi } from '../../i18n/marathi';
import LanguageToggle from '../../i18n/marathi/LanguageToggle';
import LogoImg from '../../assets/Amritmanagelogo.png';
import {
  Users, Milk, ArrowRight, CheckCircle, ChevronRight, Zap, Star, CreditCard,
  MessageSquare, FileText
} from 'lucide-react';

// ── Plan feature definitions ──────────────────────────────────
const getPlanMeta = (isMarathi) => ({
  silver: {
    label: isMarathi ? 'अमृत सिल्व्हर' : 'Amrit Silver',
    color: '#8D8D8D',
    bg: '#F4F4F4',
    border: '#C6C6C6',
    icon: CreditCard,
    features: isMarathi ? [
      '५० ग्राहकांपर्यंत',
      '२ कर्मचाऱ्यांपर्यंत',
      'रोजच्या वितरणाची नोंद',
      'बेसिक पेमेंट ट्रॅकिंग',
    ] : [
      'Up to 50 customers',
      'Up to 2 staff members',
      'Daily delivery recording',
      'Basic payment tracking',
    ],
  },
  gold: {
    label: isMarathi ? 'अमृत गोल्ड' : 'Amrit Gold',
    color: '#B8860B',
    bg: '#FFF8E1',
    border: '#D4AF37',
    icon: Star,
    features: isMarathi ? [
      '१५० ग्राहकांपर्यंत, ५ कर्मचारी',
      'स्वयंचलित मासिक बिलिंग',
      'पीडीएफ बिल निर्मिती आणि डाउनलोड',
      'व्हॉट्सॲप वितरण अलर्ट',
      'पेमेंट ट्रॅकिंग आणि इतिहास',
    ] : [
      'Up to 150 customers, 5 staff',
      'Automatic monthly billing',
      'PDF bill generation & download',
      'WhatsApp delivery alerts',
      'Payment tracking and history',
    ],
  },
  platinum: {
    label: isMarathi ? 'अमृत प्लॅटिनम' : 'Amrit Platinum',
    color: '#6929C4',
    bg: '#F3F0FF',
    border: '#8A3FFC',
    icon: Zap,
    features: isMarathi ? [
      'अमर्यादित ग्राहक आणि १५ कर्मचारी',
      'सानुकूल व्हॉट्सॲप टेम्पलेट्स',
      'प्रगत अहवाल आणि विश्लेषण',
      'डेटा एक्सपोर्ट (एक्सेल आणि पीडीएफ)',
      'प्राधान्य सपोर्ट',
    ] : [
      'Unlimited customers and 15 staff',
      'Custom WhatsApp message templates',
      'Advanced reports and analytics',
      'Data export (Excel and PDF)',
      'Priority support',
    ],
  },
});

// ── Page 1 — Welcome ──────────────────────────────────────────
const WelcomePage = ({ user, onNext }) => {
  const { isMarathi } = useMarathi();
  const plan = user?.subscription?.plan || 'gold';
  const status = user?.subscription?.status || 'trial';
  const meta = getPlanMeta(isMarathi)[plan] || getPlanMeta(isMarathi).gold;
  const PlanIcon = meta.icon;
  const firstName = user?.name?.split(' ')[0] || (isMarathi ? 'मित्र' : 'there');
  const biz = user?.businessName;

  return (
    <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto' }}>
      {/* Welcome card */}
      <div style={{
        backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0',
        padding: '40px 36px 32px', marginBottom: '16px'
      }}>
        {/* Emoji + greeting */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '60px', lineHeight: 1, marginBottom: '20px' }}>🎉</div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#161616', marginBottom: '10px', lineHeight: 1.3 }}>
            {isMarathi ? (
              <>स्वागत आहे{biz ? ` ${biz} मध्ये` : ''}, {firstName}!</>
            ) : (
              <>Welcome{biz ? ` to ${biz}` : ''}, {firstName}!</>
            )}
          </h1>
          <p style={{ fontSize: '16px', color: '#525252', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto' }}>
            {isMarathi ? (
              <>तुमचा दूध व्यवसाय आता <strong>अमृत मॅनेज</strong> वर आहे. {status === 'trial' ? 'तुम्ही फ्री ट्रायलवर आहात — सर्व फीचर्स अनलॉक आहेत.' : 'चला २ मिनिटांत सेटअप पूर्ण करूया.'}</>
            ) : (
              <>Your dairy business is now on <strong>Amrit Manage</strong>.{status === 'trial' ? ' You\'re on a free trial — all features are unlocked.' : ' Let\'s get you set up in 2 minutes.'}</>
            )}
          </p>
        </div>

        {/* Plan badge */}
        <div style={{
          backgroundColor: meta.bg,
          border: `2px solid ${meta.border}`,
          padding: '20px 24px',
          marginBottom: '28px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <PlanIcon size={20} color={meta.color} />
            <span style={{ fontWeight: 700, fontSize: '16px', color: meta.color }}>{meta.label}</span>
            {status === 'trial' && (
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                backgroundColor: '#DEFBE6', color: '#0E6027',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                {isMarathi ? 'फ्री ट्रायल' : 'FREE TRIAL'}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {meta.features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#161616' }}>
                <CheckCircle size={15} color={meta.color} style={{ flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Business name display if set */}
        {biz && (
          <div style={{
            backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0',
            padding: '14px 18px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>🏪</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#8D8D8D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isMarathi ? 'तुमचा व्यवसाय' : 'Your Business'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#161616' }}>{biz}</div>
            </div>
          </div>
        )}

        <button
          onClick={onNext}
          style={{
            width: '100%', height: '52px', fontSize: '16px', fontWeight: 700,
            backgroundColor: '#0F62FE', color: '#FFFFFF',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'background-color 0.15s'
          }}
          onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0353E9'; }}
          onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0F62FE'; }}
        >
          {isMarathi ? 'चला सुरू करूया' : "Let's Get Started"} <ArrowRight size={18} />
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '12px', color: '#8D8D8D' }}>
        {isMarathi ? 'पृष्ठ १ पैकी २' : 'Page 1 of 2'}
      </p>
    </div>
  );
};

// ── Page 2 — Quick Setup ──────────────────────────────────────
const SetupPage = ({ user, onFinish, finishing }) => {
  const { isMarathi } = useMarathi();
  const firstName = user?.name?.split(' ')[0] || (isMarathi ? 'मित्र' : 'there');
  const hasWhatsApp = user?.features?.whatsapp_alerts;
  const hasPdf = user?.features?.pdf_billing;

  const steps = [
    {
      icon: Users,
      color: '#0F62FE',
      bg: '#EDF5FF',
      title: isMarathi ? 'ग्राहक जोडा' : 'Add Your Customers',
      desc: isMarathi 
        ? 'प्रत्येक ग्राहकाचे नाव, फोन आणि रोजचे दूध प्रमाण जोडा. एका ग्राहकासाठी सुमारे १ मिनिट लागतो.'
        : 'Add each customer with their name, phone, and daily milk quantity. Takes about 1 minute per customer.',
      link: '/app/owner/customers',
      tip: isMarathi 
        ? 'प्रत्येक ग्राहकासाठी सकाळ आणि संध्याकाळचे प्रमाण स्वतंत्रपणे सेट करा.'
        : 'Set morning and evening quantities separately for each customer.',
    },
    {
      icon: Milk,
      color: '#8A3FFC',
      bg: '#F3F0FF',
      title: isMarathi ? 'डीफॉल्ट दूध दर सेट करा' : 'Set Your Default Milk Rate',
      desc: isMarathi
        ? 'प्रति लीटर डीफॉल्ट दर सेट करा. नवीन ग्राहक हा दर स्वयंचलितपणे वापरतील.'
        : 'Set the default price per litre. New customers will use this rate automatically.',
      link: '/app/owner/default-rate',
      tip: isMarathi
        ? 'तुम्ही नंतर कधीही प्रत्येक ग्राहकासाठी स्वतंत्र दर सेट करू शकता.'
        : 'You can always set a custom rate per customer later.',
    },
    ...(hasWhatsApp ? [{
      icon: MessageSquare,
      color: '#24A148',
      bg: '#DEFBE6',
      title: isMarathi ? 'व्हॉट्सॲप कनेक्ट करा' : 'Connect WhatsApp',
      desc: isMarathi
        ? 'ग्राहकांना स्वयंचलित वितरण सूचना पाठवण्यासाठी व्हॉट्सॲप लिंक करा.'
        : 'Link your WhatsApp to send automatic delivery notifications to customers.',
      link: '/app/owner/whatsapp',
      tip: isMarathi
        ? 'प्रत्येक वेळी वितरण नोंदवल्यावर ग्राहकांना सूचना मिळते.'
        : 'Customers get notified every time a delivery is recorded.',
    }] : []),
    ...(hasPdf ? [{
      icon: FileText,
      color: '#FF832B',
      bg: '#FFF3E0',
      title: isMarathi ? 'मासिक बिले तयार करा' : 'Generate Monthly Bills',
      desc: isMarathi
        ? 'महिन्याच्या शेवटी, एका क्लिकवर सर्व ग्राहकांसाठी पीडीएफ बिले तयार करा.'
        : 'At month end, generate PDF bills for all customers with one click.',
      link: '/app/owner/billing',
      tip: isMarathi
        ? 'वितरण नोंदीवरून बिले स्वयंचलितपणे मोजली जातात.'
        : 'Bills are calculated automatically from delivery records.',
    }] : []),
  ];

  return (
    <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0',
        padding: '40px 36px 32px', marginBottom: '16px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '16px' }}>🚀</div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#161616', marginBottom: '10px' }}>
            {isMarathi ? `चला सुरुवात करूया, ${firstName}` : `Here's how to get started, ${firstName}`}
          </h1>
          <p style={{ fontSize: '15px', color: '#525252', lineHeight: 1.6 }}>
            {isMarathi
              ? 'तुमचा दूध व्यवसाय सेट करण्यासाठी या स्टेप्स फॉलो करा. तुम्ही हे आता करू शकता किंवा नंतर करू शकता.'
              : 'Follow these steps to set up your dairy business. You can do them now or come back later.'}
          </p>
        </div>

        {/* Setup steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{
                backgroundColor: s.bg,
                border: `1px solid ${s.color}30`,
                padding: '16px 18px',
                display: 'flex', alignItems: 'flex-start', gap: '14px'
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  backgroundColor: '#FFFFFF', border: `2px solid ${s.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={18} color={s.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#161616', marginBottom: '4px' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#525252', lineHeight: 1.5, marginBottom: '6px' }}>
                    {s.desc}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: s.color }}>
                    <ChevronRight size={12} />
                    {s.tip}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Final CTA */}
        <button
          onClick={onFinish}
          disabled={finishing}
          style={{
            width: '100%', height: '52px', fontSize: '16px', fontWeight: 700,
            backgroundColor: finishing ? '#8D8D8D' : '#24A148', color: '#FFFFFF',
            border: 'none', cursor: finishing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'background-color 0.15s'
          }}
          onMouseOver={e => { if (!finishing) e.currentTarget.style.backgroundColor = '#198038'; }}
          onMouseOut={e => { if (!finishing) e.currentTarget.style.backgroundColor = '#24A148'; }}
        >
          {finishing
            ? (isMarathi ? 'सेटअप होत आहे...' : 'Setting up...')
            : <><CheckCircle size={18} /> {isMarathi ? 'डॅशबोर्डवर जा' : 'Go to Dashboard'}</>}
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '12px', color: '#8D8D8D' }}>
        {isMarathi ? 'पृष्ठ २ पैकी २' : 'Page 2 of 2'}
      </p>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────
const Onboarding = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1); // 1 or 2
  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await api.patch('/owner/onboarding-done');
      await refreshUser();
      navigate('/app/owner');
    } catch {
      navigate('/app/owner');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F4F4F4',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Top bar */}
      <div style={{
        backgroundColor: '#FFFFFF', padding: '14px 24px', borderBottom: '1px solid #E0E0E0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={LogoImg} alt="Amrit Manage Logo" style={{ height: '36px', objectFit: 'contain' }} />
        </div>
        {/* Language switch + Progress dots */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <LanguageToggle style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #D2D2D2', color: '#161616', backgroundColor: '#F4F4F4', borderRadius: '4px' }} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[1, 2].map(p => (
              <div key={p} style={{
                width: p === page ? 24 : 8, height: 8,
                borderRadius: 4,
                backgroundColor: p === page ? '#0F62FE' : p < page ? '#24A148' : '#D2D2D2',
                transition: 'all 0.3s'
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '32px 24px', overflowY: 'auto'
      }}>
        {page === 1 && (
          <WelcomePage user={user} onNext={() => setPage(2)} />
        )}
        {page === 2 && (
          <SetupPage user={user} onFinish={handleFinish} finishing={finishing} />
        )}
      </div>
    </div>
  );
};

export default Onboarding;
