/**
 * Staff Login — /loginto/staffaccess
 * Phone + password + verification code only.
 * No forgot password — staff must contact their owner.
 * LoginShell inlined — no shared.jsx dependency.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Phone, AlertCircle, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useMarathi } from '../../i18n/marathi';
import LanguageToggle from '../../i18n/marathi/LanguageToggle';
import api from '../../api/axios';
import amritLogo from '../../assets/Amritmanagelogo.png';

// ── Shell wrapper ─────────────────────────────────────────────
const LoginShell = ({ children, subtitle, roleLabel, roleColor = '#24A148' }) => {
  const { isMarathi } = useMarathi();
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif', position: 'relative' }}>
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000 }}>
        <LanguageToggle />
      </div>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <img src={amritLogo} alt="Amrit Manage" style={{ height: '48px', width: 'auto', display: 'block' }} />
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${roleColor}18`, border: `1px solid ${roleColor}40`, padding: '4px 14px', fontSize: '11px', fontWeight: 700, color: roleColor, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
            {roleLabel}
          </div>
          <p style={{ fontSize: '14px', color: '#525252', margin: 0 }}>{subtitle}</p>
        </div>
        {children}
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#8D8D8D', marginTop: '16px' }}>
          {isMarathi ? 'लॉगिन समस्यांसाठी तुमच्या मालकाशी संपर्क करा.' : 'For login issues, contact your owner.'}
        </p>
      </div>
    </div>
  );
};

// ── Friendly error mapper ─────────────────────────────────────
const friendlyError = (err, isMarathi) => {
  const status = err?.response?.status;
  const msg = err?.response?.data?.error || '';
  const isNetworkError = !err?.response && (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK' || err?.message?.toLowerCase().includes('network') || err?.message?.toLowerCase().includes('timeout'));
  if (isNetworkError) return { type: 'network', text: isMarathi ? 'सर्व्हरशी संपर्क होत नाही. इंटरनेट तपासा.' : 'Unable to reach the server. Check your internet connection.' };
  if (status === 401) return { type: 'credentials', text: isMarathi ? 'फोन नंबर किंवा पासवर्ड चुकीचा आहे.' : 'Phone number or password is incorrect.' };
  if (status === 403) return { type: 'disabled', text: isMarathi ? 'तुमचे खाते अक्षम केले आहे. मालकाशी संपर्क करा.' : 'Your account has been disabled. Contact your owner.' };
  if (status === 429) return { type: 'ratelimit', text: isMarathi ? 'खूप जास्त प्रयत्न. काही मिनिटे थांबा.' : 'Too many attempts. Please wait a few minutes.' };
  if (status >= 500) return { type: 'server', text: isMarathi ? 'आमच्या बाजूने काहीतरी चुकले. थोड्या वेळाने पुन्हा प्रयत्न करा.' : 'Something went wrong on our end. Try again in a moment.' };
  return { type: 'unknown', text: isMarathi ? 'काहीतरी चुकले. पुन्हा प्रयत्न करा.' : 'Something went wrong. Please try again.' };
};

// ── Staff Login ───────────────────────────────────────────────
const StaffLogin = () => {
  const { isMarathi } = useMarathi();
  return (
    <LoginShell subtitle={isMarathi ? 'तुमच्या फोन नंबरने साइन इन करा' : 'Sign in with your phone number'} roleLabel={isMarathi ? 'कर्मचारी पोर्टल' : 'Staff Portal'} roleColor="#24A148">
      <StaffLoginForm />
    </LoginShell>
  );
};
const StaffLoginForm = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { isMarathi } = useMarathi();

  const setError = (err) => setErrorInfo(friendlyError(err, isMarathi));
  const clearError = () => setErrorInfo(null);

  const handleSignIn = async (e) => {
    e.preventDefault();
    clearError();
    if (!phone) { setErrorInfo({ type: 'input', text: isMarathi ? 'कृपया तुमचा फोन नंबर टाका.' : 'Please enter your phone number.' }); return; }
    if (!password) { setErrorInfo({ type: 'input', text: isMarathi ? 'कृपया तुमचा पासवर्ड टाका.' : 'Please enter your password.' }); return; }
    if (!/^\d{10}$/.test(phone.trim())) { setErrorInfo({ type: 'input', text: isMarathi ? 'वैध १०-अंकी फोन नंबर टाका.' : 'Enter a valid 10-digit phone number.' }); return; }
    
    setLoading(true);
    try {
      // Direct login without verification code or OTP step!
      const user = await login(phone.trim(), password, '');
      if (user.role !== 'staff') {
        localStorage.removeItem('amrit_token');
        localStorage.removeItem('amrit_user');
        setErrorInfo({ type: 'credentials', text: isMarathi ? 'हे क्रेडेन्शियल कर्मचारी खात्याचे नाहीत.' : 'These credentials do not belong to a staff account.' });
        return;
      }
      toast.success(isMarathi ? `स्वागत आहे, ${user.name}!` : `Welcome, ${user.name}!`);
      navigate('/app/staff');
    } catch (err) {
      setError(err);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '36px 32px' }}>
      {errorInfo && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: errorInfo.type === 'network' ? '#FFF8E1' : '#FFF1F1', border: `1px solid ${errorInfo.type === 'network' ? '#F1C21B' : 'rgba(218,30,40,0.25)'}`, padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: errorInfo.type === 'network' ? '#B28600' : '#DA1E28', lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0, marginTop: '1px' }}>{errorInfo.type === 'network' ? <WifiOff size={14} /> : <AlertCircle size={14} />}</span>
          <span>{errorInfo.text}</span>
        </div>
      )}
      <form onSubmit={handleSignIn} noValidate>
        <div className="input-group">
          <label className="input-label">{isMarathi ? 'फोन नंबर' : 'Phone Number'}</label>
          <div style={{ position: 'relative' }}>
            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input type="tel" className="input" style={{ paddingLeft: '38px' }} placeholder="" value={phone} onChange={e => { setPhone(e.target.value.replace(/[^0-9]/g, '')); clearError(); }} autoComplete="off" inputMode="numeric" maxLength={10} />
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">{isMarathi ? 'पासवर्ड' : 'Password'}</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input type={showPass ? 'text' : 'password'} className="input" style={{ paddingLeft: '38px', paddingRight: '44px' }} placeholder="" value={password} onChange={e => { setPassword(e.target.value); clearError(); }} autoComplete="off" />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8D8D8D', padding: '4px' }}>
              {showPass ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" className="btn btn-full btn-lg" disabled={loading} style={{ marginTop: '16px', backgroundColor: '#24A148', color: '#FFFFFF', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {isMarathi ? 'साइन इन होत आहे...' : 'Signing in...'}</> : (isMarathi ? 'साइन इन करा' : 'Sign In')}
        </button>
      </form>
    </div>
  );
};

export default StaffLogin;
