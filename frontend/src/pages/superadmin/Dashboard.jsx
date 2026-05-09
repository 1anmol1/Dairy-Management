import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, Clock, ShoppingBag, TrendingUp, CreditCard, Activity, Phone } from 'lucide-react';
import api from '../../api/axios';
import useDelayedLoading from '../../hooks/useDelayedLoading';

const StatCardSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton-row">
      <div className="skeleton skeleton-line-sm" style={{ width: '55%' }} />
      <div className="skeleton skeleton-line-lg" style={{ width: '40%' }} />
    </div>
  </div>
);

const NavCardSkeleton = () => (
  <div className="skeleton-card" style={{ minHeight: '100px' }}>
    <div className="skeleton-row">
      <div className="skeleton" style={{ width: 38, height: 38, marginBottom: '8px' }} />
      <div className="skeleton skeleton-line-lg" style={{ width: '50%' }} />
      <div className="skeleton skeleton-line-sm" style={{ width: '65%' }} />
    </div>
  </div>
);

const SuperadminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/superadmin/stats')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const showSkeleton = useDelayedLoading(loading, 2000);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const statCards = stats ? [
    { label: 'Total Owners',          value: stats.totalOwners,    icon: Users,       color: '#0F62FE' },
    { label: 'Active Subscriptions',  value: stats.activeOwners,   icon: UserCheck,   color: '#24A148' },
    { label: 'On Trial',              value: stats.trialOwners,    icon: Clock,       color: '#F1C21B' },
    { label: 'Total Customers',       value: stats.totalCustomers, icon: ShoppingBag, color: '#8A3FFC' },
    { label: "Today's Deliveries",    value: stats.todayLogs,      icon: TrendingUp,  color: '#FF832B' }
  ] : [];

  // Clickable nav cards for superadmin
  const navCards = [
    {
      to: '/app/superadmin/owners',
      icon: Users,
      label: 'Owner Accounts',
      value: stats?.totalOwners ?? null,
      sub: 'Manage all owners',
      color: '#0F62FE'
    },
    {
      to: '/app/superadmin/activities',
      icon: Activity,
      label: 'All Activities',
      value: null,
      sub: 'Security & auth event log',
      color: '#FF832B'
    },
    {
      to: '/app/superadmin/plans',
      icon: CreditCard,
      label: 'Plans & Features',
      value: null,
      sub: 'Manage subscriptions & pricing',
      color: '#8A3FFC'
    },
    {
      to: '/app/superadmin/requests',
      icon: Phone,
      label: 'Subscription Requests',
      value: null,
      sub: 'Pending owner requests',
      color: '#24A148'
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>{today}</div>
        </div>
      </div>

      <div className="page-body">
        {/* Stat cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '28px'
        }}>
          {showSkeleton
            ? [0, 1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)
            : statCards.map((s, i) => (
              <div key={i} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value ?? '—'}</div>
                  </div>
                  <div style={{ backgroundColor: `${s.color}18`, padding: '8px', flexShrink: 0 }}>
                    <s.icon size={18} color={s.color} />
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Section label */}
        <div style={{
          fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.5px', color: '#8D8D8D', marginBottom: '12px'
        }}>
          Quick Navigation
        </div>

        {/* Nav cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '12px'
        }}>
          {showSkeleton
            ? [0, 1, 2, 3].map(i => <NavCardSkeleton key={i} />)
            : navCards.map((card, i) => (
              <button
                key={i}
                onClick={() => navigate(card.to)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E0E0E0',
                  padding: '18px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.1s',
                  minHeight: '100px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.boxShadow = `0 4px 16px ${card.color}22`;
                  e.currentTarget.style.borderColor = card.color;
                }}
                onMouseOut={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#E0E0E0';
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <div style={{
                  width: 38, height: 38,
                  backgroundColor: `${card.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <card.icon size={18} color={card.color} />
                </div>
                <div>
                  {card.value !== null ? (
                    <>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#161616', lineHeight: 1 }}>
                        {card.value}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#525252', marginTop: '3px' }}>
                        {card.label}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#161616' }}>
                      {card.label}
                    </div>
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

export default SuperadminDashboard;
