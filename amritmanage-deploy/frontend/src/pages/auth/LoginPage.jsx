import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Eye, EyeOff, Lock, User, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/axios';

const STEP = {
  LOGIN: 'login',
  FORGOT_SEND: 'forgot_send',
  FORGOT_VERIFY: 'forgot_verify'
};

const LoginPage = () => {
  const [step, setStep] = useState(STEP.LOGIN);

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F4F4F4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Droplets size={32} color="#0F62FE" />
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#161616' }}>Amrit Manage</span>
          </div>
          <p style={{ fontSize: '14px', color: '#525252' }}>
            {step === STEP.LOGIN ? 'Sign in to your account' :
             step === STEP.FORGOT_SEND ? 'Reset your password' :
             'Enter OTP & new password'}
          </p>
        </div>

        {step === STEP.LOGIN && <LoginForm onForgot={() => setStep(STEP.FORGOT_SEND)} />}
        {step === STEP.FORGOT_SEND && (
          <ForgotSendForm
            onBack={() => setStep(STEP.LOGIN)}
            onSent={() => setStep(STEP.FORGOT_VERIFY)}
          />
        )}
        {step === STEP.FORGOT_VERIFY && (
          <ForgotVerifyForm
            onBack={() => setStep(STEP.FORGOT_SEND)}
            onDone={() => setStep(STEP.LOGIN)}
          />
        )}

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#8D8D8D', marginTop: '24px' }}>
          Need help? <a href="mailto:business@brandkrit.com" style={{ color: '#0F62FE' }}>business@brandkrit.com</a>
        </p>
      </div>
    </div>
  );
};

// ── Login Form ────────────────────────────────────────────────
const LoginForm = ({ onForgot }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const identifierType = () => {
    if (/^\d+$/.test(identifier)) return 'Phone';
    if (identifier.includes('@')) return 'Email';
    if (identifier.length > 0) return 'Username';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) { toast.error('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const user = await login(identifier.trim(), password);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === 'superadmin') navigate('/app/superadmin');
      else if (user.role === 'owner') navigate('/app/owner');
      else navigate('/app/staff');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const type = identifierType();

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '40px 32px' }}>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">
            Phone / Email / Username
            {type && (
              <span style={{ color: '#0F62FE', marginLeft: '8px', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                ({type})
              </span>
            )}
          </label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input
              type="text" className="input" style={{ paddingLeft: '38px' }}
              placeholder="Phone, email, or username"
              value={identifier} onChange={e => setIdentifier(e.target.value)}
              autoComplete="username" autoCapitalize="none"
            />
          </div>
          <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
            Staff & owners: phone number. Superadmin: phone, email, or username.
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
            <input
              type={showPass ? 'text' : 'password'} className="input"
              style={{ paddingLeft: '38px', paddingRight: '44px' }}
              placeholder="Enter your password"
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#8D8D8D', padding: '4px'
            }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
          {loading
            ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</>
            : 'Sign In'}
        </button>

        <button type="button" onClick={onForgot} style={{
          width: '100%', marginTop: '16px', background: 'none', border: 'none',
          color: '#0F62FE', fontSize: '13px', cursor: 'pointer', textAlign: 'center', padding: '4px'
        }}>
          Forgot password?
        </button>
      </form>
    </div>
  );
};

// ── Forgot — Step 1: Send OTP ─────────────────────────────────
const ForgotSendForm = ({ onBack, onSent }) => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();

  // OTP value shown in UI — read from env so changing OTP_CODE in .env updates everywhere
  const OTP_HINT = import.meta.env.VITE_OTP_CODE || '000000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier) { toast.error('Enter your phone, email, or username.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { identifier: identifier.trim() });
      setResult(data);
      toast.info(`OTP sent! Use ${OTP_HINT}.`);
      setTimeout(() => onSent(), 1800);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '40px 32px' }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: '6px', background: 'none',
        border: 'none', cursor: 'pointer', color: '#525252', fontSize: '13px',
        marginBottom: '20px', padding: 0
      }}>
        <ArrowLeft size={14} /> Back to login
      </button>

      <p style={{ fontSize: '14px', color: '#525252', marginBottom: '24px', lineHeight: 1.6 }}>
        Enter your registered phone number, email, or username. An OTP will be sent to reset your password.
      </p>

      {result ? (
        <div style={{ backgroundColor: '#DEFBE6', border: '1px solid #24A148', padding: '16px', textAlign: 'center' }}>
          <ShieldCheck size={24} color="#24A148" style={{ marginBottom: '8px' }} />
          <div style={{ fontWeight: 700, color: '#0E6027', marginBottom: '4px' }}>OTP Sent!</div>
          {result.maskedPhone && <div style={{ fontSize: '13px', color: '#525252' }}>Phone: {result.maskedPhone}</div>}
          {result.maskedEmail && <div style={{ fontSize: '13px', color: '#525252' }}>Email: {result.maskedEmail}</div>}
          <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '8px' }}>Redirecting...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Phone / Email / Username</label>
            <input
              type="text" className="input"
              placeholder="9876543210 or you@email.com or username"
              value={identifier} onChange={e => setIdentifier(e.target.value)}
              autoCapitalize="none"
            />
            <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
              Superadmin can use phone, email, or username.
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
      )}
    </div>
  );
};

// ── Forgot — Step 2: Verify OTP + new password ────────────────
const ForgotVerifyForm = ({ onBack, onDone }) => {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  // OTP hint from env — change VITE_OTP_CODE in frontend/.env to update everywhere
  const OTP_HINT = import.meta.env.VITE_OTP_CODE || '000000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !otp || !newPassword || !confirm) { toast.error('All fields are required.'); return; }
    if (newPassword !== confirm) { toast.error('Passwords do not match.'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword
      });
      localStorage.setItem('amrit_token', data.token);
      localStorage.setItem('amrit_user', JSON.stringify(data.user));
      toast.success('Password reset! Logging you in...');
      setTimeout(() => {
        const role = data.user.role;
        if (role === 'superadmin') navigate('/app/superadmin');
        else if (role === 'owner') navigate('/app/owner');
        else navigate('/app/staff');
      }, 800);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP or request expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '40px 32px' }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: '6px', background: 'none',
        border: 'none', cursor: 'pointer', color: '#525252', fontSize: '13px',
        marginBottom: '20px', padding: 0
      }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* OTP hint — value from VITE_OTP_CODE in frontend/.env */}
      <div style={{
        backgroundColor: '#FFF8E1', border: '1px solid #F1C21B',
        padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: '#B28600'
      }}>
        ⚠️ OTP is <strong>{OTP_HINT}</strong> (dev mode). Real delivery coming soon.
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">Phone / Email / Username</label>
          <input type="text" className="input"
            placeholder="Same identifier as previous step"
            value={identifier} onChange={e => setIdentifier(e.target.value)}
            autoCapitalize="none" />
          <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
            Superadmin can use phone, email, or username.
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">OTP Code</label>
          <input
            type="text" className="input"
            placeholder={`Enter 6-digit OTP (${OTP_HINT})`}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric" maxLength={6}
            style={{ letterSpacing: '6px', fontSize: '20px', textAlign: 'center', fontWeight: 700 }}
          />
        </div>

        <div className="input-group">
          <label className="input-label">New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'} className="input"
              style={{ paddingRight: '44px' }}
              placeholder="Min 6 characters"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#8D8D8D', padding: '4px'
            }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Confirm New Password</label>
          <input type="password" className="input" placeholder="Repeat new password"
            value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Verifying...' : 'Reset Password & Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
