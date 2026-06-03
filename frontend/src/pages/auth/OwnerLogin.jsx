/**
 * Owner Login — /securelogin/ownerlogin
 * Phone + password. Full Marathi/English toggle support.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Phone, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useMarathi } from '../../i18n/marathi';
import api from '../../api/axios';
import amritLogo from '../../assets/Amritmanagelogo.png';
import LanguageToggle from '../../i18n/marathi/LanguageToggle';

// ── Click-to-copy helper ──────────────────────────────────────
const CopyText = ({ value, display, color = '#0F62FE' }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <span onClick={handleCopy} title="Click to copy"
      style={{ color, cursor: 'pointer', fontWeight: 500, borderBottom: `1px dashed ${color}` }}>
      {copied ? '✓ Copied!' : display}
    </span>
  );
};

// ── Login shell wrapper ───────────────────────────────────────
const LoginShell = ({ children, subtitle, roleLabel, roleColor = '#0F62FE', otherLogins, showHelp = true }) => {
  const { isMarathi } = useMarathi();
  return (
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
        {otherLogins && (
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#8D8D8D' }}>
            {otherLogins}
          </div>
        )}
        {showHelp ? (
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#8D8D8D', marginTop: '16px' }}>
            {isMarathi ? 'मदत हवी आहे? ' : 'Need help? '}
            <CopyText value="business@brandkrit.com" display="business@brandkrit.com" />
          </p>
        ) : (
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#8D8D8D', marginTop: '16px' }}>
            {isMarathi ? 'लॉगिन समस्यांसाठी तुमच्या मालकाशी संपर्क करा.' : 'For login issues, contact your owner.'}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────
const OwnerLogin = () => {
  const { isMarathi } = useMarathi();

  const crossLinks = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
      <a href="/loginto/staffaccess" style={{ color: '#24A148', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
        {isMarathi ? 'कर्मचारी लॉगिन →' : 'Staff Login →'}
      </a>
    </div>
  );

  return (
    <LoginShell
      subtitle={isMarathi ? 'तुमच्या फोन नंबरने साइन इन करा' : 'Sign in with your phone number'}
      roleLabel={isMarathi ? 'मालक पोर्टल' : 'Owner Portal'}
      roleColor="#0F62FE"
      showHelp={true}
      otherLogins={crossLinks}
    >
      <OwnerLoginForm />
    </LoginShell>
  );
};

const OwnerLoginForm = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { isMarathi } = useMarathi();

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!phone) {
      toast.error(isMarathi ? 'फोन नंबर टाका.' : 'Enter phone number.');
      return;
    }
    if (!password) {
      toast.error(isMarathi ? 'पासवर्ड टाका.' : 'Enter password.');
      return;
    }

    if (!showCode) {
      if (!/^\d{10}$/.test(phone.trim())) {
        toast.error(isMarathi ? 'वैध १०-अंकी फोन नंबर टाका.' : 'Enter a valid 10-digit phone number.');
        return;
      }
      setLoading(true);
      try {
        await api.post('/auth/validate-credentials', { phone: phone.trim(), password, role: 'owner' });
        setShowCode(true);
      } catch (err) {
        toast.error(err.response?.data?.error || (isMarathi ? 'खाते सापडले नाही किंवा चुकीचा पासवर्ड.' : 'Invalid credentials.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!code.trim()) {
      toast.error(isMarathi ? 'व्हेरिफिकेशन कोड टाका.' : 'Enter the verification code.');
      return;
    }
    doLogin();
  };

  const doLogin = async () => {
    setLoading(true);
    try {
      const user = await login(phone.trim(), password, code.trim());
      if (user.role !== 'owner') {
        localStorage.removeItem('amrit_token');
        localStorage.removeItem('amrit_user');
        toast.error(isMarathi ? 'हे क्रेडेन्शियल मालक खात्याचे नाहीत.' : 'These credentials do not belong to an owner account.');
        return;
      }
      localStorage.setItem('amrit_last_role', 'owner');
      toast.success(isMarathi ? `परत स्वागत आहे, ${user.name}!` : `Welcome back, ${user.name}!`);
      if (!user.onboardingDone) {
        navigate('/app/owner/onboarding');
      } else {
        navigate('/app/owner');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'व्हेरिफिकेशन कोड चुकीचा आहे.' : 'Incorrect verification code.'));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '36px 32px' }}>
      <form onSubmit={handleSignIn}>
        <div className="input-group">
          <label className="input-label">{isMarathi ? 'फोन नंबर' : 'Phone Number'}</label>
          <div style={{ position: 'relative' }}>
            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input type="tel" className="input" style={{ paddingLeft: '38px' }}
              placeholder="" value={phone} onChange={e => { setPhone(e.target.value.replace(/[^0-9]/g, '')); setShowCode(false); }}
              autoComplete="off" inputMode="numeric" maxLength={10} />
          </div>
        </div>

        <div className="input-group" style={{ marginTop: '16px' }}>
          <label className="input-label">{isMarathi ? 'पासवर्ड' : 'Password'}</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input type={showPass ? 'text' : 'password'} className="input" style={{ paddingLeft: '38px', paddingRight: '44px' }}
              placeholder="" value={password} onChange={e => { setPassword(e.target.value); setShowCode(false); }}
              autoComplete="off" />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8D8D8D', padding: '4px' }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {showCode && (
          <div className="input-group" style={{ animation: 'fadeSlideIn 0.2s ease', marginTop: '16px' }}>
            <label className="input-label">{isMarathi ? 'व्हेरिफिकेशन कोड' : 'Verification Code'}</label>
            <input type="password" className="input" autoFocus
              placeholder="" value={code} onChange={e => setCode(e.target.value)}
              autoComplete="off" />
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '16px' }}>
          {loading
            ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {isMarathi ? 'साइन इन होत आहे...' : 'Signing in...'}</>
            : showCode
              ? (isMarathi ? 'साइन इन करा' : 'Sign In')
              : (isMarathi ? 'पुढे' : 'Continue')}
        </button>
      </form>
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default OwnerLogin;
