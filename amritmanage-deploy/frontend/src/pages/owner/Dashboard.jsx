import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Droplets, IndianRupee, Clock, TrendingUp,
  UserCheck, ClipboardList, Receipt, MessageSquare, Milk, BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import api from '../../api/axios';
import { getCache, setCache } from '../../utils/cache';
import { useMarathi } from '../../i18n/marathi';

// ── Skeleton for stat cards ───────────────────────────────────
const StatCardSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton-row">
      <div className="skeleton skeleton-line-sm" style={{ width: '60%' }} />
      <div className="skeleton skeleton-line-lg" style={{ width: '50%' }} />
      <div className="skeleton skeleton-line-sm" style={{ width: '40%' }} />
    </div>
  </div>
);

const NavCardSkeleton = () => (
  <div className="skeleton-card" style={{ minHeight: '110px' }}>
    <div className="skeleton-row">
      <div className="skeleton" style={{ width: 40, height: 40, marginBottom: '8px' }} />
      <div className="skeleton skeleton-line-lg" style={{ width: '55%' }} />
      <div className="skeleton skeleton-line-sm" style={{ width: '70%' }} />
    </div>
  </div>
);

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMarathi } = useMarathi();

  // Dashboard stats — 60s TTL (live data, but no need to refetch every visit)
  const { data: stats, loading } = useApi('/owner/dashboard', { ttl: 60 * 1000 });

  // Smart prefetch — preload today's logs in background while user reads dashboard
  // This means Logs page loads instantly when user navigates there
  useEffect(() => {
    const timer = setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `/owner/logs{"date":"${today}"}`;
      if (!getCache(cacheKey)) {
        api.get('/owner/logs', { params: { date: today } })
          .then(r => setCache(cacheKey, r.data, 60 * 1000))
          .catch(() => {});
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Only show skeleton if loading AND no cached data — prevents blank flash
  const showSkeleton = useDelayedLoading(loading && !stats, 800);

  const today = new Date().toLocaleDateString(isMarathi ? 'mr-IN' : 'en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const isTrialing = user?.subscription?.status === 'trial';
  const isExpired  = user?.subscription?.status === 'expired';
  const isActive   = user?.subscription?.status === 'active';
  const isPlatinum = user?.subscription?.plan === 'platinum';

  // Days left for trial
  const trialEnd   = user?.subscription?.trialEndsAt ? new Date(user.subscription.trialEndsAt) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  // Days left for active paid subscription
  const subEnd     = user?.subscription?.expiresAt ? new Date(user.subscription.expiresAt) : null;
  const subDaysLeft = subEnd ? Math.max(0, Math.ceil((subEnd - Date.now()) / (1000 * 60 * 60 * 24))) : null;
  const subExpiringSoon = isActive && subDaysLeft !== null && subDaysLeft <= 10;

  // Legacy alias used in banner below
  const daysLeft = trialDaysLeft;

  const statCards = stats ? [
    {
      label: isMarathi ? 'आजचे उत्पन्न' : "Today's Revenue",
      value: `₹${stats.todayRevenue?.toFixed(0) ?? 0}`,
      icon: IndianRupee,
      color: '#FF832B',
      sub: isMarathi ? `${stats.todayDeliveries} वितरण आज` : `${stats.todayDeliveries} deliveries today`
    },
    {
      label: isMarathi ? 'महिन्याचे उत्पन्न' : 'Month Revenue',
      value: `₹${stats.monthRevenue?.toFixed(0) ?? 0}`,
      icon: TrendingUp,
      color: '#8A3FFC',
      sub: isMarathi ? 'या महिन्यात' : 'this month'
    },
    {
      label: isMarathi ? 'थकबाकी रक्कम' : 'Pending Amount',
      value: `₹${stats.pendingAmount?.toFixed(0) ?? 0}`,
      icon: Clock,
      color: '#DA1E28',
      sub: isMarathi ? 'वसूल करायची' : 'to collect'
    }
  ] : [];

  const navCards = [
    {
      to: '/app/owner/customers',
      icon: Users,
      label: isMarathi ? 'ग्राहक' : 'Customers',
      value: stats?.activeCustomers ?? null,
      sub: stats
        ? (isMarathi ? `${stats.totalCustomers} एकूण` : `${stats.totalCustomers} total`)
        : (isMarathi ? 'ग्राहक व्यवस्थापन' : 'Manage customers'),
      color: '#0F62FE'
    },
    {
      to: '/app/owner/logs',
      icon: ClipboardList,
      label: isMarathi ? 'दैनिक नोंदी' : 'Daily Logs',
      value: stats?.todayDeliveries ?? null,
      sub: stats
        ? (isMarathi ? `${stats.todayLiters?.toFixed(1)}ली. आज वितरित` : `${stats.todayLiters?.toFixed(1)}L delivered today`)
        : (isMarathi ? 'वितरण नोंदी पाहा' : 'View delivery logs'),
      color: '#24A148'
    },
    {
      to: '/app/owner/billing',
      icon: Receipt,
      label: isMarathi ? 'बिलिंग' : 'Billing',
      value: null,
      sub: isMarathi ? 'बिले तयार करा व ट्रॅक करा' : 'Generate & track bills',
      color: '#FF832B'
    },
    {
      to: '/app/owner/staff',
      icon: UserCheck,
      label: isMarathi ? 'कर्मचारी' : 'Staff',
      value: stats?.staffCount ?? null,
      sub: isMarathi ? 'सक्रिय सदस्य' : 'active members',
      color: '#0043CE'
    },
    {
      to: '/app/owner/default-rate',
      icon: Milk,
      label: isMarathi ? 'डिफॉल्ट दर' : 'Default Rate',
      value: null,
      sub: isMarathi ? 'दूध दर सेट करा' : 'Set milk rate',
      color: '#8A3FFC'
    },
    ...(user?.features?.whatsapp_alerts ? [{
      to: '/app/owner/whatsapp',
      icon: MessageSquare,
      label: 'WhatsApp',
      value: null,
      sub: isMarathi ? 'वितरण अलर्ट' : 'Delivery alerts',
      color: '#25D366'
    }] : []),
    ...(user?.features?.whatsapp_alerts || user?.features?.custom_message_templates ? [{
      to: '/app/owner/message-templates',
      icon: BookOpen,
      label: isMarathi ? 'संदेश टेम्पलेट' : 'Message Templates',
      value: null,
      sub: user?.features?.custom_message_templates
        ? (isMarathi ? 'कस्टम टेम्पलेट' : 'Custom templates')
        : (isMarathi ? 'डिफॉल्ट टेम्पलेट' : 'Default template'),
      color: '#0F62FE'
    }] : [])
  ];

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{user?.businessName || 'Dashboard'}</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>{today}</div>
        </div>
      </div>

      <div className="page-body">
        {/* Trial / Expired / Expiring Soon banner */}
        {(isTrialing || isExpired || subExpiringSoon) && (
          <div style={{
            backgroundColor: isExpired || daysLeft <= 2 || subDaysLeft <= 3 ? '#FFF1F1' : subExpiringSoon ? '#FFF8E1' : '#EDF5FF',
            border: `2px solid ${isExpired || daysLeft <= 2 || subDaysLeft <= 3 ? '#DA1E28' : subExpiringSoon ? '#F1C21B' : '#0F62FE'}`,
            padding: '20px 24px', marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: isExpired ? '20px' : '0' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: isExpired || daysLeft <= 2 || subDaysLeft <= 3 ? '#DA1E28' : subExpiringSoon ? '#B28600' : '#0043CE' }}>
                  {isExpired
                    ? (isMarathi ? '🔴 तुमची सदस्यता संपली आहे' : '🔴 Your subscription has expired')
                    : subExpiringSoon
                      ? (isMarathi ? `⚠️ सदस्यता ${subDaysLeft} दिवसात संपेल` : `⚠️ Subscription expires in ${subDaysLeft} day${subDaysLeft !== 1 ? 's' : ''}`)
                      : daysLeft > 0
                        ? (isMarathi ? `⏳ ट्रायल ${daysLeft} दिवसात संपेल` : `⏳ Trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`)
                        : (isMarathi ? '⚠️ ट्रायल संपली' : '⚠️ Trial expired')}
                </div>
                <div style={{ fontSize: '13px', color: '#525252', marginTop: '4px' }}>
                  {isExpired
                    ? (isMarathi ? `तुमची ${user?.subscription?.plan || ''} योजना संपली आहे. सर्व वैशिष्ट्ये पुनर्संचयित करण्यासाठी नूतनीकरण करा.` : `Your ${user?.subscription?.plan || 'plan'} plan has expired. Renew now to restore access to all features.`)
                    : subExpiringSoon
                      ? (isMarathi
                          ? `तुमची ${user?.subscription?.plan || ''} योजना ${subEnd?.toLocaleDateString('mr-IN')} रोजी संपेल. सेवा सुरू ठेवण्यासाठी आत्ता नूतनीकरण करा.`
                          : `Your ${user?.subscription?.plan || 'plan'} plan expires on ${subEnd?.toLocaleDateString('en-IN')}. Renew now to avoid any interruption.`)
                      : (isMarathi ? 'ट्रायल संपल्यानंतर डेटा आणि वैशिष्ट्ये टिकवण्यासाठी अपग्रेड करा.' : 'Upgrade to keep your data and features after the trial ends.')}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/owner/upgrade')}>
                {isExpired
                  ? (isMarathi ? 'आता नूतनीकरण करा' : 'Renew Now')
                  : subExpiringSoon
                    ? (isMarathi ? 'आता वाढवा' : 'Extend Now')
                    : (isMarathi ? 'आता अपग्रेड करा' : 'Upgrade Now')}
              </button>
            </div>

            {/* Plan cards — only show for expired, and only for non-platinum users */}
            {isExpired && !isPlatinum && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginTop: '4px' }}>
                {[
                  { key: 'silver', color: '#8D8D8D', bg: '#F4F4F4', border: '#8D8D8D', label: 'Silver', price: '₹99/mo', features: ['50 customers', '2 staff', 'Manual billing'] },
                  { key: 'gold',   color: '#B8860B', bg: '#FFF8E1', border: '#D4AF37', label: 'Gold ⭐', price: '₹199/mo', features: ['300 customers', '7 staff', 'WhatsApp alerts', 'PDF bills'], popular: true },
                  { key: 'platinum', color: '#6929C4', bg: '#F3F0FF', border: '#8A3FFC', label: 'Platinum', price: '₹399/mo', features: ['Unlimited', 'All features', 'Advanced reports'] }
                ].map(plan => (
                  <button key={plan.key} onClick={() => navigate('/app/owner/upgrade')} style={{
                    border: `2px solid ${plan.border}`, backgroundColor: plan.bg,
                    padding: '14px 12px', cursor: 'pointer', textAlign: 'left',
                    position: 'relative', transition: 'all 0.1s'
                  }}>
                    {plan.popular && (
                      <div style={{ position: 'absolute', top: '-1px', right: '8px', backgroundColor: plan.border, color: '#161616', fontSize: '8px', fontWeight: 700, padding: '2px 6px', textTransform: 'uppercase' }}>
                        POPULAR
                      </div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: '13px', color: plan.color, marginBottom: '4px' }}>{plan.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#161616', marginBottom: '6px' }}>{plan.price}</div>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ fontSize: '10px', color: '#525252' }}>✓ {f}</div>
                    ))}
                    <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 700, color: plan.color }}>Choose Plan →</div>
                  </button>
                ))}
              </div>
            )}

            {/* Platinum expired — just show renew message, no plan cards */}
            {isExpired && isPlatinum && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#525252' }}>
                {isMarathi
                  ? 'तुमची Platinum योजना नूतनीकरण करण्यासाठी वरील बटण दाबा.'
                  : 'Click the button above to renew your Platinum plan and restore all features.'}
              </div>
            )}
          </div>
        )}

        {/* Revenue stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {showSkeleton
            ? [0, 1, 2].map(i => <StatCardSkeleton key={i} />)
            : statCards.map((s, i) => (
              <div key={i} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                  <div style={{ backgroundColor: `${s.color}18`, padding: '8px', flexShrink: 0 }}>
                    <s.icon size={18} color={s.color} />
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8D8D8D', marginBottom: '12px' }}>
          {isMarathi ? 'जलद नेव्हिगेशन' : 'Quick Navigation'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
          {showSkeleton
            ? [0, 1, 2, 3, 4].map(i => <NavCardSkeleton key={i} />)
            : navCards.map((card, i) => (
              <button
                key={i}
                onClick={() => navigate(card.to)}
                style={{
                  backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0',
                  padding: '18px 16px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: '10px',
                  transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.1s',
                  minHeight: '110px'
                }}
                onMouseOver={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${card.color}22`; e.currentTarget.style.borderColor = card.color; }}
                onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E0E0E0'; }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <div style={{ width: 38, height: 38, backgroundColor: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <card.icon size={18} color={card.color} />
                </div>
                <div>
                  {card.value !== null ? (
                    <>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#161616', lineHeight: 1 }}>{card.value}</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#525252', marginTop: '3px' }}>{card.label}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#161616' }}>{card.label}</div>
                  )}
                  <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '2px' }}>{card.sub}</div>
                </div>
              </button>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
