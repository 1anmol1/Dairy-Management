/**
 * UpgradeGate — shows a locked overlay when a feature requires a higher plan.
 * Usage:
 *   <UpgradeGate requiredPlan="platinum" currentPlan={user.subscription.plan}>
 *     <YourFeatureContent />
 *   </UpgradeGate>
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Star } from 'lucide-react';

const PLAN_ORDER = { silver: 0, gold: 1, platinum: 2, trial: 1 };
const PLAN_LABELS = { silver: 'Amrit Silver', gold: 'Amrit Gold', platinum: 'Amrit Platinum' };
const PLAN_COLORS = { silver: '#8D8D8D', gold: '#D4AF37', platinum: '#525252' };

// Platinum plan highlights shown in the upgrade prompt
const PLATINUM_HIGHLIGHTS = [
  'Unlimited customers, up to 15 staff',
  'Custom WhatsApp message templates',
  'Advanced reports and analytics',
  'Data export (Excel and PDF)',
  'Dedicated onboarding support',
  'Custom rate management per customer',
  'Priority support',
];

// Gold plan highlights
const GOLD_HIGHLIGHTS = [
  'Up to 150 customers, 5 staff',
  'Automatic monthly billing',
  'PDF bill generation & download',
  'WhatsApp delivery alerts',
  'Payment tracking and history',
  'Employee separate login',
];

const UpgradeGate = ({
  requiredPlan = 'platinum',
  currentPlan,
  featureName = 'This feature',
  children,
  inline = false,
}) => {
  const navigate = useNavigate();
  // Platinum users always have full access — never show upgrade gate
  const current = currentPlan === 'trial' ? 'gold' : (currentPlan || 'silver');
  const hasAccess = PLAN_ORDER[current] >= PLAN_ORDER[requiredPlan] || currentPlan === 'platinum';

  // Navigate to upgrade page with the required plan pre-selected via URL state
  const goUpgrade = () => navigate('/app/owner/upgrade', { state: { selectedPlan: requiredPlan } });

  if (hasAccess) return children;

  if (inline) {
    return (
      <div style={{
        backgroundColor: '#FFF8E1', border: '1px solid #F1C21B',
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#B28600' }}>
          <Lock size={14} />
          <span>
            <strong>{featureName}</strong> requires{' '}
            <strong style={{ color: PLAN_COLORS[requiredPlan] }}>{PLAN_LABELS[requiredPlan]}</strong>.
            You are on <strong>{PLAN_LABELS[current] || 'your current plan'}</strong>.
          </span>
        </div>
        <button onClick={goUpgrade} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          backgroundColor: '#D4AF37', color: '#161616',
          padding: '6px 14px', fontWeight: 700, fontSize: '12px',
          border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
        }}>
          Upgrade <ArrowRight size={12} />
        </button>
      </div>
    );
  }

  // Full upgrade gate
  return (
    <div>
      {/* Blurred preview of children */}
      <div style={{ position: 'relative', pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ filter: 'blur(3px)', opacity: 0.4 }}>
          {children}
        </div>
        {/* Lock overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.6)'
        }}>
          <Lock size={32} color="#8D8D8D" />
        </div>
      </div>

      {/* Upgrade prompt */}
      <div style={{
        backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0',
        padding: '32px', marginTop: '24px', textAlign: 'center'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          backgroundColor: '#FFF8E1', border: '2px solid #D4AF37',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Lock size={24} color="#D4AF37" />
        </div>

        <h3 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>
          {featureName} requires {PLAN_LABELS[requiredPlan]}
        </h3>
        <p style={{ color: '#525252', fontSize: '14px', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>
          You are currently on <strong>{PLAN_LABELS[current] || 'your current plan'}</strong>.
          Upgrade to <strong style={{ color: PLAN_COLORS[requiredPlan] }}>{PLAN_LABELS[requiredPlan]}</strong> to unlock this feature and more.
        </p>

        {/* Plan highlights */}
        <div style={{
          backgroundColor: '#F8F9FA',
          border: '1px solid #A0A0A0',
          padding: '20px 24px', marginBottom: '24px',
          textAlign: 'left', maxWidth: '480px', margin: '0 auto 24px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Star size={12} color="#D4AF37" /> What you get with {PLAN_LABELS[requiredPlan]}
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {(requiredPlan === 'platinum' ? PLATINUM_HIGHLIGHTS : GOLD_HIGHLIGHTS).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#161616' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#D4AF37', flexShrink: 0 }} />
                {h}
              </div>
            ))}
          </div>
        </div>

        <button onClick={goUpgrade} style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          backgroundColor: '#161616', color: '#FFFFFF',
          padding: '14px 32px', fontWeight: 700, fontSize: '15px',
          border: 'none', cursor: 'pointer', transition: 'background-color 0.15s'
        }}
          onMouseOver={e => { e.currentTarget.style.backgroundColor = '#393939'; }}
          onMouseOut={e => { e.currentTarget.style.backgroundColor = '#161616'; }}
        >
          Upgrade to {PLAN_LABELS[requiredPlan]} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default UpgradeGate;
