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
import {
  Droplets, Users, Milk, Receipt, ArrowRight,
  CheckCircle, ChevronRight, Zap, Star, CreditCard,
  MessageSquare, BarChart2, FileText
} from 'lucide-react';

// ── Plan feature definitions ──────────────────────────────────
const PLAN_META = {
  silver: {
    label: 'Amrit Silver',
    color: '#8D8D8D',
    bg: '#F4F4F4',
    border: '#C6C6C6',
    icon: CreditCard,
    features: [
      'Up to 50 customers',
      'Up to 2 staff members',
      'Daily delivery recording',
      'Basic payment tracking',
    ],
  },
  gold: {
    label: 'Amrit Gold',
    color: '#B8860B',
    bg: '#FFF8E1',
    border: '#D4AF37',
    icon: Star,
    features: [
      'Up to 300 customers, 7 staff',
      'Automatic monthly billing',
      'PDF bill generation & download',
      'WhatsApp delivery alerts',
      'Payment tracking and history',
    ],
  },
  platinum: {
    label: 'Amrit Platinum',
    color: '#6929C4',
    bg: '#F3F0FF',
    border: '#8A3FFC',
    icon: Zap,
    features: [
      'Unlimited customers and staff',
      'Custom WhatsApp message templates',
      'Advanced reports and analytics',
      'Data export (Excel and PDF)',
      'Priority support',
    ],
  },
};

// ── Page 1 — Welcome ──────────────────────────────────────────
const WelcomePage = ({ user, onNext }) => {
  const plan = user?.subscription?.plan || 'gold';
  const status = user?.subscription?.status || 'trial';
  const meta = PLAN_META[plan] || PLAN_META.gold;
  const PlanIcon = meta.icon;
  const firstName = user?.name?.split(' ')[0] || 'there';
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
            Welcome{biz ? ` to ${biz}` : ''}, {firstName}!
          </h1>
          <p style={{ fontSize: '16px', color: '#525252', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto' }}>
            Your dairy business is now on <strong>Amrit Manage</strong>.
            {status === 'trial' ? ' You\'re on a free trial — all features are unlocked.' : ' Let\'s get you set up in 2 minutes.'}
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
                FREE TRIAL
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
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#8D8D8D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Business</div>
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
          Let's Get Started <ArrowRight size={18} />
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '12px', color: '#8D8D8D' }}>
        Page 1 of 2
      </p>
    </div>
  );
};

// ── Page 2 — Quick Setup ──────────────────────────────────────
const SetupPage = ({ user, onFinish, finishing }) => {
  const firstName = user?.name?.split(' ')[0] || 'there';
  const hasWhatsApp = user?.features?.whatsapp_alerts;
  const hasReports = user?.features?.advanced_reports;
  const hasPdf = user?.features?.pdf_billing;

  const steps = [
    {
      icon: Users,
      color: '#0F62FE',
      bg: '#EDF5FF',
      title: 'Add Your Customers',
      desc: 'Add each customer with their name, phone, and daily milk quantity. Takes about 1 minute per customer.',
      link: '/app/owner/customers',
      tip: 'Set morning and evening quantities separately for each customer.',
    },
    {
      icon: Milk,
      color: '#8A3FFC',
      bg: '#F3F0FF',
      title: 'Set Your Default Milk Rate',
      desc: 'Set the default price per litre. New customers will use this rate automatically.',
      link: '/app/owner/default-rate',
      tip: 'You can always set a custom rate per customer later.',
    },
    ...(hasWhatsApp ? [{
      icon: MessageSquare,
      color: '#24A148',
      bg: '#DEFBE6',
      title: 'Connect WhatsApp',
      desc: 'Link your WhatsApp to send automatic delivery notifications to customers.',
      link: '/app/owner/whatsapp',
      tip: 'Customers get notified every time a delivery is recorded.',
    }] : []),
    ...(hasPdf ? [{
      icon: FileText,
      color: '#FF832B',
      bg: '#FFF3E0',
      title: 'Generate Monthly Bills',
      desc: 'At month end, generate PDF bills for all customers with one click.',
      link: '/app/owner/billing',
      tip: 'Bills are calculated automatically from delivery records.',
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
            Here's how to get started, {firstName}
          </h1>
          <p style={{ fontSize: '15px', color: '#525252', lineHeight: 1.6 }}>
            Follow these steps to set up your dairy business. You can do them now or come back later.
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
            ? 'Setting up...'
            : <><CheckCircle size={18} /> Go to Dashboard</>}
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '12px', color: '#8D8D8D' }}>
        Page 2 of 2
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
      // Mark onboarding complete on the server — persists across devices
      await api.patch('/owner/onboarding-done');
      // Refresh user in context so onboardingDone = true in localStorage
      await refreshUser();
      navigate('/app/owner');
    } catch {
      // Even if the API call fails, let them through — they can always re-trigger
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
        backgroundColor: '#161616', padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Droplets size={20} color="#0F62FE" />
          <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '16px' }}>Amrit Manage</span>
        </div>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[1, 2].map(p => (
            <div key={p} style={{
              width: p === page ? 24 : 8, height: 8,
              borderRadius: 4,
              backgroundColor: p === page ? '#0F62FE' : p < page ? '#24A148' : '#393939',
              transition: 'all 0.3s'
            }} />
          ))}
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
