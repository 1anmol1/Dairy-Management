

import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, LogOut,
  Menu, X, Shield, CreditCard, KeyRound,
  Phone, Mail, ChevronDown, ChevronUp, Activity, MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import amritLogo from '../assets/Amritmanagelogo.png';

const SuperadminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/loginto/lockedaccess/app/secure/adminaccounts/superadmin/login');
  };

  const navItems = [
    { to: '/app/superadmin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/app/superadmin/owners',     icon: Users,     label: 'Owner Accounts' },
    { to: '/app/superadmin/impersonate',icon: KeyRound,  label: 'Direct Impersonate' },
    { to: '/app/superadmin/activities', icon: Activity,  label: 'All Activities' },
    { to: '/app/superadmin/plans',      icon: CreditCard, label: 'Plans & Features' },
    { to: '/app/superadmin/requests',   icon: Phone,     label: 'Subscription Requests' },
    { to: '/app/superadmin/feedback',   icon: MessageSquare, label: 'User Feedbacks' }
  ];

  const SidebarContent = () => (
    <>
      {/* Logo — PNG asset */}
      <Link to="/app/superadmin" className="sidebar-logo" style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{ marginBottom: '6px' }}>
          <img
            src={amritLogo}
            alt="Amrit Manage"
            style={{ height: '30px', width: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={12} color="#DA1E28" />
          <span style={{ color: '#8D8D8D', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Super Admin
          </span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer: profile + logout */}
      <div className="sidebar-footer">
        {/* Profile card */}
        <div
          className="sidebar-profile"
          onClick={() => setProfileOpen(p => !p)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setProfileOpen(p => !p)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                backgroundColor: '#DA1E28',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  color: '#FFFFFF', fontWeight: 600, fontSize: '13px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: '120px'
                }}>
                  {user?.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <Shield size={10} color="#DA1E28" />
                  <span style={{ fontSize: '10px', color: '#8D8D8D' }}>Super Admin</span>
                </div>
              </div>
            </div>
            {profileOpen
              ? <ChevronUp size={14} color="#8D8D8D" />
              : <ChevronDown size={14} color="#8D8D8D" />}
          </div>

          {/* Expanded info */}
          {profileOpen && (
            <div style={{ marginTop: '12px', borderTop: '1px solid #393939', paddingTop: '12px' }}
              onClick={e => e.stopPropagation()}>
              {user?.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Phone size={12} color="#8D8D8D" />
                  <span style={{ fontSize: '12px', color: '#C6C6C6' }}>{user.phone}</span>
                </div>
              )}
              {user?.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Mail size={12} color="#8D8D8D" />
                  <span style={{ fontSize: '12px', color: '#C6C6C6', wordBreak: 'break-all' }}>{user.email}</span>
                </div>
              )}
              {user?.username && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Shield size={12} color="#8D8D8D" />
                  <span style={{ fontSize: '12px', color: '#C6C6C6' }}>@{user.username}</span>
                </div>
              )}
              <button
                className="btn btn-ghost btn-sm btn-full"
                style={{ fontSize: '12px', height: '32px', borderColor: '#525252', color: '#C6C6C6' }}
                onClick={() => { setShowPwModal(true); setProfileOpen(false); setSidebarOpen(false); }}
              >
                <KeyRound size={12} /> Change Password
              </button>
            </div>
          )}
        </div>

        {/* Sign-out reminder */}
        <div style={{ fontSize: '11px', color: '#8D8D8D', textAlign: 'center', marginBottom: '8px', lineHeight: 1.4, padding: '0 4px' }}>
          Sign out when done to keep your account secure.
        </div>

        {/* Logout */}
        <button className="btn btn-danger btn-sm btn-full" onClick={handleLogout}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <SidebarContent />
      </aside>

      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)} />

      <div className="main-content">
        <div className="mobile-header">
          <Link to="/app/superadmin" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src={amritLogo}
              alt="Amrit Manage"
              style={{ height: '26px', width: 'auto', filter: 'brightness(0) invert(1)' }}
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FFFFFF', padding: '4px' }}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <Outlet />
      </div>

      {showPwModal && <SuperadminPasswordModal onClose={() => setShowPwModal(false)} />}
    </div>
  );
};

// ── Superadmin Change Password Modal ─────────────────────────
const SuperadminPasswordModal = ({ onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('change'); // 'change' | 'forgot'
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '', verificationCode: '' });
  // Forgot flow — requires all three credentials + verification code
  const [forgot, setForgot] = useState({
    phone: user?.phone || '',
    email: user?.email || '',
    username: user?.username || '',
    verifyCode: '',
    showVerify: false,
    sent: false,
    otp: '',
    newPw: '',
    confirmPw: '',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // ── Change with current password ─────────────────────────
  const handleChangeSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('Passwords do not match.'); return; }
    if (form.newPassword.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (!form.verificationCode.trim()) { toast.error('Verification code is required.'); return; }
    setLoading(true);
    try {
      await api.patch('/superadmin/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        verificationCode: form.verificationCode.trim()
      });
      toast.success('Password updated successfully.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: Step 1 — verify all three credentials + code ─
  const handleForgotContinue = async (e) => {
    e.preventDefault();
    if (!forgot.phone.trim() || !forgot.email.trim() || !forgot.username.trim()) {
      toast.error('All three credential fields are required.');
      return;
    }
    if (!forgot.showVerify) {
      setForgot(f => ({ ...f, showVerify: true }));
      return;
    }
    if (!forgot.verifyCode.trim()) { toast.error('Enter the verification code.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/admin-forgot-password', {
        phone:            forgot.phone.trim(),
        email:            forgot.email.trim().toLowerCase(),
        username:         forgot.username.trim().toLowerCase(),
        verificationCode: forgot.verifyCode.trim(),
      });
      setForgot(f => ({ ...f, sent: true }));
      toast.success('Identity verified. Reset code generated — check server console.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Credentials do not match.');
      setForgot(f => ({ ...f, showVerify: false, verifyCode: '' }));
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: Step 2 — verify OTP + set new password ───────
  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (forgot.newPw !== forgot.confirmPw) { toast.error('Passwords do not match.'); return; }
    if (forgot.newPw.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (!forgot.otp || forgot.otp.length !== 6) { toast.error('Enter the 6-digit reset code.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', {
        identifier: forgot.phone.trim(),
        otp:        forgot.otp.trim(),
        newPassword: forgot.newPw
      });
      toast.success('Password reset successfully.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid code or request expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <KeyRound size={20} color="#0F62FE" />
          <h2 style={{ fontWeight: 700, fontSize: '20px' }}>Change Password</h2>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '24px', border: '1px solid #E0E0E0' }}>
          {[
            { key: 'change', label: 'Current Password' },
            { key: 'forgot', label: 'Forgot Password' }
          ].map(t => (
            <button key={t.key} onClick={() => setStep(t.key)} style={{
              flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
              backgroundColor: step === t.key ? '#0F62FE' : '#FFFFFF',
              color: step === t.key ? '#FFFFFF' : '#525252',
              fontWeight: 600, fontSize: '13px', transition: 'all 0.1s'
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Change with current password */}
        {step === 'change' && (
          <form onSubmit={handleChangeSubmit}>
            {[
              { key: 'currentPassword', label: 'Current Password', placeholder: 'Your current password' },
              { key: 'newPassword',     label: 'New Password',     placeholder: 'Min 6 characters' },
              { key: 'confirm',         label: 'Confirm Password', placeholder: 'Repeat new password' }
            ].map(f => (
              <div key={f.key} className="input-group">
                <label className="input-label">{f.label}</label>
                <input type="password" className="input" placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  required />
              </div>
            ))}
            <div className="input-group">
              <label className="input-label">Verification Code</label>
              <input
                type="password"
                className="input"
                placeholder="Enter your verification code"
                value={form.verificationCode}
                onChange={e => setForm(p => ({ ...p, verificationCode: e.target.value }))}
                autoComplete="off"
                required
              />
              <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '3px' }}>
                The same code you use when logging in as superadmin.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}

        {/* Forgot — Step 1: verify all three + code */}
        {step === 'forgot' && !forgot.sent && (
          <form onSubmit={handleForgotContinue} noValidate>
            <div style={{ backgroundColor: '#FFF1F1', border: '1px solid rgba(218,30,40,0.25)', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: '#DA1E28' }}>
              Enter all three credentials to verify your identity before resetting.
            </div>
            {[
              { key: 'phone',    label: 'Phone Number',  type: 'tel',   inputMode: 'numeric' },
              { key: 'email',    label: 'Email Address', type: 'email', inputMode: undefined },
              { key: 'username', label: 'Username',      type: 'text',  inputMode: undefined },
            ].map(f => (
              <div key={f.key} className="input-group">
                <label className="input-label">{f.label} *</label>
                <input type={f.type} className="input" placeholder=""
                  value={forgot[f.key]}
                  onChange={e => setForgot(p => ({ ...p, [f.key]: e.target.value }))}
                  inputMode={f.inputMode} autoComplete="off" autoCapitalize="none" />
              </div>
            ))}
            {forgot.showVerify && (
              <div className="input-group" style={{ animation: 'fadeSlideIn 0.2s ease' }}>
                <label className="input-label">Verification Code *</label>
                <input type="password" className="input" autoFocus placeholder=""
                  value={forgot.verifyCode}
                  onChange={e => setForgot(p => ({ ...p, verifyCode: e.target.value }))}
                  autoComplete="off" />
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Verifying...' : forgot.showVerify ? 'Verify & Get Reset Code' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {/* Forgot — Step 2: enter OTP + new password */}
        {step === 'forgot' && forgot.sent && (
          <form onSubmit={handleOtpVerify}>
            <div style={{ backgroundColor: '#DEFBE6', border: '1px solid #24A148', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: '#0E6027' }}>
              Reset code generated for <strong>{forgot.phone}</strong>. Check the server console for the 6-digit code.
            </div>
            <div className="input-group">
              <label className="input-label">Reset Code</label>
              <input type="text" className="input"
                placeholder="6-digit code"
                value={forgot.otp}
                onChange={e => setForgot(p => ({ ...p, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                inputMode="numeric" maxLength={6}
                style={{ letterSpacing: '8px', fontSize: '20px', textAlign: 'center', fontWeight: 700 }} />
            </div>
            <div className="input-group">
              <label className="input-label">New Password</label>
              <input type="password" className="input" placeholder="Min 6 characters"
                value={forgot.newPw} onChange={e => setForgot(p => ({ ...p, newPw: e.target.value }))} required />
            </div>
            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <input type="password" className="input" placeholder="Repeat new password"
                value={forgot.confirmPw} onChange={e => setForgot(p => ({ ...p, confirmPw: e.target.value }))} required />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost btn-full"
                onClick={() => setForgot(f => ({ ...f, sent: false, showVerify: false, verifyCode: '', otp: '' }))}>
                Back
              </button>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
        <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    </div>
  );
};

export default SuperadminLayout;
