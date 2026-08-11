import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Phone, Mail, User, ArrowRight, UserCircle2, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useMarathi } from '../../i18n/marathi';
import api from '../../api/axios';
import LanguageToggle from '../../i18n/marathi/LanguageToggle';

const TABS = [
  { id: 'owner',  label: 'Owner',       labelMr: 'मालक',         icon: UserCircle2, color: '#0F62FE' },
  { id: 'staff',  label: 'Staff',        labelMr: 'कर्मचारी',     icon: User,        color: '#007D79' },
  { id: 'admin',  label: 'Super Admin',  labelMr: 'सुपर अॅडमिन', icon: Settings,    color: '#DA1E28' },
];

/* ─── Eye icon SVGs ────────────────────────────────────────────── */
const EyeOpenIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosedIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const Field = ({ label, children }) => (
  <div>
    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
      {label}
    </label>
    {children}
  </div>
);

const inputBase = {
  width: '100%',
  padding: '12px 14px 12px 44px',
  backgroundColor: '#f8fafc',
  border: '1.5px solid #e2e8f0',
  borderRadius: '10px',
  fontSize: '15px',
  color: '#0f172a',
  outline: 'none',
  transition: 'border-color 0.2s, background-color 0.2s',
  boxSizing: 'border-box',
};

const FieldIcon = ({ children }) => (
  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
    {children}
  </span>
);

const UnifiedLogin = () => {
  const [activeTab, setActiveTab]   = useState('owner');
  const [phone,     setPhone]       = useState('');
  const [email,     setEmail]       = useState('');
  const [username,  setUsername]    = useState('');
  const [password,  setPassword]    = useState('');
  const [loading,   setLoading]     = useState(false);
  const [showPass,  setShowPass]    = useState(false);
  
  const [devAccounts, setDevAccounts] = useState({ owners: [], staff: [] });
  const [serverStatus, setServerStatus] = useState('waking');
  const [wakeTimer, setWakeTimer] = useState(0);

  React.useEffect(() => {
    const timerInterval = setInterval(() => setWakeTimer(t => t + 1), 1000);
    // DEV ONLY: fetch created accounts for quick testing & ping server
    api.get('/auth/dev-users')
      .then(res => {
        setDevAccounts(res.data);
        setServerStatus('online');
        clearInterval(timerInterval);
      })
      .catch(err => {
        setServerStatus('error');
        clearInterval(timerInterval);
        console.error(err);
      });
    return () => clearInterval(timerInterval);
  }, []);

  const { setSession } = useAuth();
  const navigate       = useNavigate();
  const toast          = useToast();
  const { isMarathi }  = useMarathi();
  const location       = useLocation();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPhone(''); setEmail(''); setUsername(''); setPassword('');
    setLoading(false); setShowPass(false);
  };

  const currentTab = TABS.find(t => t.id === activeTab);

  const doNavigate = (role) => {
    const from = location.state?.from?.pathname;
    if (from && !from.includes('login')) {
      navigate(from, { replace: true });
    } else {
      navigate(role === 'superadmin' ? '/app/superadmin' : `/app/${role}`, { replace: true });
    }
  };

  const submitLogin = async (phoneVal, passwordVal, emailVal, usernameVal, tab) => {
    setLoading(true);
    try {
      let res;
      if (tab === 'admin') {
        res = await api.post('/auth/admin-login', { phone: phoneVal, email: emailVal, username: usernameVal, password: passwordVal });
      } else {
        res = await api.post('/auth/login', { identifier: phoneVal, password: passwordVal });
      }
      setSession(res.data.user, res.data.token);
      doNavigate(res.data.user.role);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    submitLogin(phone, password, email, username, activeTab);
  };

  // Auto-fill and immediately submit demo credentials
  const fillAndSubmit = (selectedUser = null) => {
    let p, pw, em, un, tab;
    tab = activeTab;
    
    if (selectedUser) {
      p = selectedUser.phone;
      pw = '123456'; // Default test password
      em = ''; un = '';
    } else if (activeTab === 'owner' || activeTab === 'staff') {
      toast.error(isMarathi ? 'हे डेमो खाते उपलब्ध नाही. कृपया नोंदणी करा.' : 'This demo account does not exist. Please create an account.');
      return;
    } else {
      p = '9834628034'; pw = '123456'; em = 'patilanmolkop@gmail.com'; un = 'anmol';
    }
    
    // Update state for visual feedback
    setPhone(p); setPassword(pw); setEmail(em); setUsername(un);
    // Submit immediately
    submitLogin(p, pw, em, un, tab);
  };

  const onFocus = (e, color) => {
    e.currentTarget.style.borderColor = color;
    e.currentTarget.style.backgroundColor = '#ffffff';
  };
  const onBlur = (e) => {
    e.currentTarget.style.borderColor = '#e2e8f0';
    e.currentTarget.style.backgroundColor = '#f8fafc';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f0fdf4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Inter', system-ui, sans-serif", position: 'relative',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
        <LanguageToggle />
      </div>

      {serverStatus === 'waking' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#f59e0b', color: '#ffffff', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '600', zIndex: 50, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          Server is waking up... Please wait ({wakeTimer}s)
        </div>
      )}
      {serverStatus === 'online' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#24A148', color: '#ffffff', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '600', zIndex: 50, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          Server is online, you can login
        </div>
      )}

      <div style={{
        width: '100%', maxWidth: '420px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 24px 48px -12px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '32px 32px 0', textAlign: 'center' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: `linear-gradient(135deg, ${currentTab.color} 0%, ${currentTab.color}cc 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: `0 8px 20px ${currentTab.color}30`,
            transition: 'all 0.3s ease',
          }}>
            <currentTab.icon size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
            Dairy Management
          </h1>
          <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '14px' }}>
            {isMarathi ? 'तुमच्या खात्यात साइन इन करा' : 'Sign in to continue'}
          </p>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', padding: '0 24px', gap: '4px', marginBottom: '4px' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                  padding: '10px 8px 12px',
                  backgroundColor: isActive ? `${tab.color}0f` : 'transparent',
                  border: isActive ? `1.5px solid ${tab.color}25` : '1.5px solid transparent',
                  borderRadius: '12px',
                  color: isActive ? tab.color : '#94a3b8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={18} />
                {isMarathi ? tab.labelMr : tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Form ── */}
        <div style={{ padding: '20px 32px 28px' }}>

          {/* Demo / Quick Login Buttons */}
          {activeTab === 'admin' ? (
            <button
              type="button"
              onClick={() => fillAndSubmit(null)}
              disabled={loading}
              style={{
                width: '100%', marginBottom: '20px',
                padding: '11px 16px',
                background: `${currentTab.color}0a`,
                color: currentTab.color,
                border: `1.5px dashed ${currentTab.color}40`,
                borderRadius: '10px',
                fontWeight: 600, fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = `${currentTab.color}15`; e.currentTarget.style.borderStyle = 'solid'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = `${currentTab.color}0a`; e.currentTarget.style.borderStyle = 'dashed'; }}
            >
              ⚡ Quick Demo — Super Admin
            </button>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {(activeTab === 'owner' ? devAccounts.owners : devAccounts.staff).map(u => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => fillAndSubmit(u)}
                  disabled={loading}
                  style={{
                    padding: '8px 12px',
                    background: `${currentTab.color}0a`,
                    color: currentTab.color,
                    border: `1.5px dashed ${currentTab.color}40`,
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <UserCircle2 size={16} /> 
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{u.name || u.phone}</span>
                    <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: 500 }}>
                      {u.ownerRole === 'dairy_owner' ? 'Dairy Owner' : u.ownerRole === 'milk_supplier' ? 'Milk Supplier' : 'Staff'}
                    </span>
                  </div>
                </button>
              ))}
              {(activeTab === 'owner' ? devAccounts.owners : devAccounts.staff).length === 0 && (
                <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '4px' }}>
                  No accounts created yet.
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#f1f5f9' }} />
            <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>or sign in manually</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#f1f5f9' }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Phone */}
            <Field label={isMarathi ? 'फोन नंबर' : 'Phone Number'}>
              <div style={{ position: 'relative' }}>
                <FieldIcon><Phone size={17} color="#94a3b8" /></FieldIcon>
                <input
                  autoFocus
                  type="tel"
                  autoComplete="tel"
                  placeholder="10-digit phone number"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={loading}
                  required
                  style={inputBase}
                  onFocus={e => onFocus(e, currentTab.color)}
                  onBlur={onBlur}
                />
              </div>
            </Field>

            {/* Admin-only fields */}
            {activeTab === 'admin' && (
              <>
                <Field label="Email">
                  <div style={{ position: 'relative' }}>
                    <FieldIcon><Mail size={17} color="#94a3b8" /></FieldIcon>
                    <input type="email" autoComplete="email" placeholder="admin@example.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      disabled={loading} required style={inputBase}
                      onFocus={e => onFocus(e, currentTab.color)} onBlur={onBlur} />
                  </div>
                </Field>
                <Field label="Username">
                  <div style={{ position: 'relative' }}>
                    <FieldIcon><User size={17} color="#94a3b8" /></FieldIcon>
                    <input type="text" autoComplete="username" placeholder="admin"
                      value={username} onChange={e => setUsername(e.target.value)}
                      disabled={loading} required style={inputBase}
                      onFocus={e => onFocus(e, currentTab.color)} onBlur={onBlur} />
                  </div>
                </Field>
              </>
            )}

            {/* Password */}
            <Field label={isMarathi ? 'पासवर्ड' : 'Password'}>
              <div style={{ position: 'relative' }}>
                <FieldIcon><Lock size={17} color="#94a3b8" /></FieldIcon>
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={isMarathi ? 'पासवर्ड टाका' : 'Enter your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{ ...inputBase, paddingRight: '48px' }}
                  onFocus={e => onFocus(e, currentTab.color)}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    display: 'flex', alignItems: 'center', borderRadius: '6px',
                    color: '#94a3b8', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                  title={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass
                    ? <EyeOpenIcon size={19} />
                    : <EyeClosedIcon size={19} />
                  }
                </button>
              </div>
            </Field>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
                width: '100%', padding: '14px',
                backgroundColor: loading ? `${currentTab.color}80` : currentTab.color,
                color: '#fff', border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: loading ? 'none' : `0 4px 16px ${currentTab.color}35`,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
            >
              {loading
                ? <><span style={{ width: '17px', height: '17px', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} /> Signing in...</>
                : <>{isMarathi ? 'साइन इन करा' : 'Sign In'} <ArrowRight size={17} /></>
              }
            </button>

          </form>

          {/* ── Don't have an account (owner tab only) ── */}
          {activeTab === 'owner' && (
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13.5px', color: '#475569' }}>
              Use Dairy Management?{' '}
              <Link
                to="/register"
                style={{
                  color: currentTab.color,
                  fontWeight: 700,
                  textDecoration: 'none',
                  borderBottom: `1.5px solid ${currentTab.color}40`,
                  paddingBottom: '1px',
                  transition: 'border-color 0.15s',
                  marginLeft: '4px'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = currentTab.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${currentTab.color}40`}
              >
                Create Account
              </Link>
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default UnifiedLogin;
