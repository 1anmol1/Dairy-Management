/**
 * Shared components for all login pages.
 * Includes Marathi/English toggle fixed to top-right of the page.
 */
import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';
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
    <span
      onClick={handleCopy}
      title="Click to copy"
      style={{ color, cursor: 'pointer', fontWeight: 500, borderBottom: `1px dashed ${color}`, transition: 'opacity 0.15s' }}
    >
      {copied ? '✓ Copied!' : display}
    </span>
  );
};

// ── Shell wrapper ─────────────────────────────────────────────
// showHelp: true  = show "Need help?" with email (owner/admin)
//           false = show "For login issues, contact your owner." (staff)
export const LoginShell = ({ children, subtitle, roleLabel, roleColor = '#0F62FE', otherLogins, showHelp = true }) => {
  const { isMarathi } = useMarathi();

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F4F4F4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Inter, sans-serif', position: 'relative'
    }}>
      {/* Language toggle — fixed top-right corner */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000 }}>
        <LanguageToggle />
      </div>

      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <img src={amritLogo} alt="Amrit Manage" style={{ height: '48px', width: 'auto', display: 'block' }} />
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: `${roleColor}18`, border: `1px solid ${roleColor}40`,
            padding: '4px 14px', fontSize: '11px', fontWeight: 700,
            color: roleColor, textTransform: 'uppercase', letterSpacing: '0.6px',
            marginBottom: '10px'
          }}>
            {roleLabel}
          </div>
          <p style={{ fontSize: '14px', color: '#525252', margin: 0 }}>{subtitle}</p>
        </div>

        {children}

        {/* Cross-login links */}
        {otherLogins && (
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#8D8D8D' }}>
            {otherLogins}
          </div>
        )}

        {/* Help line */}
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

// ── Forgot password — Step 1: Send reset code ────────────────
export const ForgotSend = ({ onBack, onSent, role }) => {
  const [identifier, setIdentifier] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [showVerify, setShowVerify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();
  const { isMarathi } = useMarathi();

  const handleContinue = (e) => {
    e.preventDefault();
    if (!identifier.trim()) { toast.error(isMarathi ? 'फोन किंवा ईमेल टाका.' : 'Enter your phone or email.'); return; }
    if (!showVerify) { setShowVerify(true); return; }
    if (!verifyCode.trim()) { toast.error(isMarathi ? 'व्हेरिफिकेशन कोड टाका.' : 'Enter the verification code.'); return; }
    doSend();
  };

  const doSend = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
        verificationCode: verifyCode.trim(),
        role,
      });
      setResult(data);
      toast.info(isMarathi ? 'रीसेट कोड तयार झाला. सर्व्हर कन्सोल तपासा.' : 'Reset code generated. Check the server console.');
      setTimeout(() => onSent(identifier.trim()), 1800);
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'रीसेट कोड तयार करता आला नाही.' : 'Failed to generate reset code.'));
      setShowVerify(false);
      setVerifyCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '36px 32px' }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: '6px', background: 'none',
        border: 'none', cursor: 'pointer', color: '#525252', fontSize: '13px',
        marginBottom: '20px', padding: 0
      }}>
        <ArrowLeft size={14} /> {isMarathi ? 'लॉगिनवर परत' : 'Back to login'}
      </button>
      <p style={{ fontSize: '14px', color: '#525252', marginBottom: '20px', lineHeight: 1.6 }}>
        {isMarathi
          ? 'पासवर्ड रीसेट करण्यासाठी तुमचा नोंदणीकृत फोन नंबर किंवा ईमेल टाका.'
          : 'Enter your registered phone number or email to reset your password.'}
      </p>
      {result ? (
        <div style={{ backgroundColor: '#DEFBE6', border: '1px solid #24A148', padding: '16px', textAlign: 'center' }}>
          <ShieldCheck size={24} color="#24A148" style={{ marginBottom: '8px' }} />
          <div style={{ fontWeight: 700, color: '#0E6027', marginBottom: '4px' }}>
            {isMarathi ? 'रीसेट कोड तयार झाला' : 'Reset Code Generated'}
          </div>
          {result.maskedPhone && <div style={{ fontSize: '13px', color: '#525252' }}>{isMarathi ? 'फोन' : 'Phone'}: {result.maskedPhone}</div>}
          {result.maskedEmail && <div style={{ fontSize: '13px', color: '#525252' }}>{isMarathi ? 'ईमेल' : 'Email'}: {result.maskedEmail}</div>}
          <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '8px' }}>
            {isMarathi ? 'सर्व्हर कन्सोलमध्ये कोड तपासा. पुनर्निर्देशित होत आहे...' : 'Check the server console for the code. Redirecting...'}
          </div>
        </div>
      ) : (
        <form onSubmit={handleContinue}>
          <div className="input-group">
            <label className="input-label">{isMarathi ? 'फोन किंवा ईमेल' : 'Phone or Email'}</label>
            <input type="text" className="input" placeholder=""
              value={identifier} onChange={e => setIdentifier(e.target.value)} autoCapitalize="none" autoComplete="off" />
          </div>
          {showVerify && (
            <div className="input-group" style={{ animation: 'fadeSlideIn 0.2s ease' }}>
              <label className="input-label">{isMarathi ? 'व्हेरिफिकेशन कोड' : 'Verification Code'}</label>
              <input type="password" className="input" autoFocus placeholder=""
                value={verifyCode} onChange={e => setVerifyCode(e.target.value)} autoComplete="off" />
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading
              ? (isMarathi ? 'तयार होत आहे...' : 'Generating...')
              : showVerify
                ? (isMarathi ? 'रीसेट कोड तयार करा' : 'Generate Reset Code')
                : (isMarathi ? 'पुढे' : 'Continue')}
          </button>
        </form>
      )}
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

// ── Forgot password — Step 2: Verify reset code ──────────────
export const ForgotVerify = ({ onBack, prefillIdentifier = '' }) => {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { isMarathi } = useMarathi();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirm) { toast.error(isMarathi ? 'सर्व फील्ड आवश्यक आहेत.' : 'All fields are required.'); return; }
    if (newPassword !== confirm) { toast.error(isMarathi ? 'पासवर्ड जुळत नाहीत.' : 'Passwords do not match.'); return; }
    if (newPassword.length < 6) { toast.error(isMarathi ? 'पासवर्ड किमान ६ अक्षरांचा असावा.' : 'Password must be at least 6 characters.'); return; }
    if (otp.length !== 6) { toast.error(isMarathi ? '६ अंकी रीसेट कोड टाका.' : 'Enter the 6-digit reset code.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        identifier: prefillIdentifier.trim(), otp: otp.trim(), newPassword
      });
      localStorage.setItem('amrit_token', data.token);
      localStorage.setItem('amrit_user', JSON.stringify(data.user));
      toast.success(isMarathi ? 'पासवर्ड रीसेट झाला! लॉगिन होत आहे...' : 'Password reset! Logging you in...');
      setTimeout(() => {
        const role = data.user.role;
        if (role === 'superadmin') navigate('/app/superadmin');
        else if (role === 'owner') navigate('/app/owner');
        else navigate('/app/staff');
      }, 800);
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'अवैध कोड किंवा विनंती कालबाह्य.' : 'Invalid code or request expired.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', padding: '36px 32px' }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: '6px', background: 'none',
        border: 'none', cursor: 'pointer', color: '#525252', fontSize: '13px',
        marginBottom: '16px', padding: 0
      }}>
        <ArrowLeft size={14} /> {isMarathi ? 'मागे' : 'Back'}
      </button>
      <div style={{ backgroundColor: '#EDF5FF', border: '1px solid rgba(15,98,254,0.2)', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: '#0043CE' }}>
        {isMarathi ? 'सर्व्हर कन्सोलमध्ये दाखवलेला ६ अंकी रीसेट कोड टाका.' : 'Enter the 6-digit reset code shown in the server console.'}
      </div>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">{isMarathi ? 'रीसेट कोड' : 'Reset Code'}</label>
          <input type="text" className="input" placeholder=""
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric" maxLength={6} autoFocus
            style={{ letterSpacing: '6px', fontSize: '20px', textAlign: 'center', fontWeight: 700 }} />
        </div>
        <div className="input-group">
          <label className="input-label">{isMarathi ? 'नवीन पासवर्ड' : 'New Password'}</label>
          <div style={{ position: 'relative' }}>
            <input type={showPass ? 'text' : 'password'} className="input"
              style={{ paddingRight: '44px' }} placeholder=""
              value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#8D8D8D', padding: '4px'
            }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">{isMarathi ? 'पासवर्ड पुष्टी करा' : 'Confirm Password'}</label>
          <input type="password" className="input" placeholder=""
            value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '8px' }}>
          {loading
            ? (isMarathi ? 'तपासत आहे...' : 'Verifying...')
            : (isMarathi ? 'पासवर्ड रीसेट करा आणि लॉगिन करा' : 'Reset Password & Login')}
        </button>
      </form>
    </div>
  );
};
