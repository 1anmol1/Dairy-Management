/**
 * Superadmin Login
 * Step 1: phone + email + username + password → validate credentials
 * Step 2: verification code → full login
 * No forgot password — use the setup page to reset credentials.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Phone, Mail, AtSign, Shield } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useMarathi } from '../../i18n/marathi';
import api from '../../api/axios';
import amritLogo from '../../assets/Amritmanagelogo.png';
import LanguageToggle from '../../i18n/marathi/LanguageToggle';

// ── Login shell wrapper ───────────────────────────────────────
const LoginShell = ({ children, subtitle, roleLabel, roleColor = '#0F62FE' }) => (
  <div style={{
    minHeight: '100vh', backgroundColor: '#F4F4F4',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', fontFamily: 'Inter, sans-serif', position: 'relative'
  }}>
    <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000 }}>
      <LanguageToggle />
    </div>
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <img src={amritLogo} alt="Amrit Manage" style={{ height: '48px', width: 'auto', display: 'block' }} />
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: `${roleColor}18`, border: `1px solid ${roleColor}40`,
          padding: '4px 14px', fontSize: '11px', fontWeight: 700,
          color: roleColor, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px'
        }}>
          {roleLabel}
        </div>
        <p style={{ fontSize: '14px', color: '#525252', margin: 0 }}>{subtitle}</p>
      </div>
      {children}
      <p style={{ textAlign: 'center', fontSize: '12px', color: '#8D8D8D', marginTop: '16px' }}>
        To reset credentials, use the setup page.
      </p>
    </div>
  </div>
);

const AdminLogin = () => (
  <LoginShell
    subtitle="All credentials required for access"
    roleLabel="Super Admin"
    roleColor="#DA1E28"
  >
    <AdminLoginForm />
  </LoginShell>
);

const AdminLoginForm = () => {
  const [phone,    setPhone]    = useState('');
  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code,     setCode]     = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const toast    = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!phone.trim() || !email.trim() || !username.trim() || !password) {
      toast.error('All credential fields are required.');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      toast.error('Enter a valid 10-digit phone number.');
      return;
    }
    if (!email.includes('@')) {
      toast.error('Enter a valid email address.');
      return;
    }

    if (!showCode) {
      setLoading(true);
      try {
        await api.post('/auth/admin-validate', {
          phone:    phone.trim(),
          email:    email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          password
        });
        setShowCode(true);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Invalid credentials.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!code.trim()) {
      toast.error('Enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/admin-login', {
        phone:            phone.trim(),
        email:            email.trim().toLowerCase(),
        username:         username.trim().toLowerCase(),
        password,
        verificationCode: code.trim()
      });

      localStorage.setItem('amrit_token', data.token);
      const safeUser = {
        _id:          data.user._id,
        name:         data.user.name,
        role:         data.user.role,
        phone:        data.user.phone,
        subscription: data.user.subscription,
        features:     data.user.features
      };
      localStorage.setItem('amrit_user', JSON.stringify(safeUser));
      window.dispatchEvent(new Event('amrit_auth_update'));
      toast.success(`Welcome, ${data.user.name}!`);
      navigate('/app/superadmin', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials.');
      setShowCode(false);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '32px' }}>
      <div style={{
        backgroundColor: '#FFF1F1', border: '1px solid rgba(218,30,40,0.25)',
        padding: '10px 14px', marginBottom: '24px', fontSize: '13px', color: '#DA1E28',
        display: 'flex', alignItems: 'flex-start', gap: '8px'
      }}>
        <Shield size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span><strong>Restricted access.</strong> All credentials are required.</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="input-group">
          <label className="input-label">Phone Number *</label>
          <div style={{ position: 'relative' }}>
            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input type="tel" className="input" style={{ paddingLeft: '38px' }}
              value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric" autoComplete="off" maxLength={10} disabled={showCode} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Email Address *</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input type="email" className="input" style={{ paddingLeft: '38px' }}
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="off" autoCapitalize="none" disabled={showCode} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Username *</label>
          <div style={{ position: 'relative' }}>
            <AtSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input type="text" className="input" style={{ paddingLeft: '38px' }}
              value={username} onChange={e => setUsername(e.target.value)}
              autoComplete="off" autoCapitalize="none" disabled={showCode} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Password *</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input type={showPass ? 'text' : 'password'} className="input"
              style={{ paddingLeft: '38px', paddingRight: '44px' }}
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="off" disabled={showCode} />
            <button type="button" onClick={() => setShowPass(v => !v)} style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#8D8D8D', padding: '4px'
            }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {showCode && (
          <div className="input-group" style={{ animation: 'fadeSlideIn 0.2s ease' }}>
            <label className="input-label">Verification Code *</label>
            <input type="password" className="input" autoFocus
              value={code} onChange={e => setCode(e.target.value)} autoComplete="off" />
            <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
              Enter the superadmin verification code set during setup.
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-full btn-lg" disabled={loading}
          style={{ marginTop: '8px', backgroundColor: '#DA1E28', color: '#FFFFFF' }}>
          {loading
            ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Verifying...</>
            : showCode ? 'Sign In' : 'Continue'}
        </button>

        {showCode && (
          <button type="button" onClick={() => { setShowCode(false); setCode(''); }}
            style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: '#525252', fontSize: '13px', cursor: 'pointer', textAlign: 'center', padding: '4px' }}>
            ← Back
          </button>
        )}
      </form>
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default AdminLogin;
