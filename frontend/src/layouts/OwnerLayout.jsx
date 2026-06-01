import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck,
  ClipboardList, Receipt, LogOut,
  Menu, X, Milk, KeyRound, Phone, Mail, Building2,
  ChevronDown, ChevronUp, Droplets, BookOpen, CheckCircle, MessageSquare,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import amritLogo from '../assets/Amritmanagelogo.png';
import LanguageToggle from '../i18n/marathi/LanguageToggle';
import { useMarathi } from '../i18n/marathi';

// WhatsApp SVG icon for sidebar
const WhatsAppNavIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isMarathi, t } = useMarathi();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const toast = useToast();

  const handleLogout = () => {
    logout();
    navigate('/securelogin/ownerlogin');
  };

  const subStatus = user?.subscription?.status;

  useEffect(() => {
    if (subStatus !== 'expired') return;

    const handleGlobalClick = (e) => {
      const target = e.target;
      
      // Allow clicking inside sidebar or mobile header
      if (target.closest('.sidebar') || target.closest('.mobile-header')) {
        return;
      }
      
      // Allow clicking inside renewal modal or any standard modal overlay
      if (target.closest('.renewal-modal') || target.closest('.modal-overlay') || target.closest('.modal')) {
        return;
      }

      // Allow language toggle clicks
      if (target.closest('[title*="मराठी"]') || target.closest('[title*="English"]') || target.closest('button[aria-label*="Marathi"]')) {
        return;
      }

      // Allow toast messages
      if (target.closest('.toast') || target.closest('.go3130511874') || target.closest('.hot-toast')) {
        return;
      }

      // Allow date pickers, search input, filters, dropdowns, and pagination/refresh buttons
      const isDateOrFilter = 
        target.tagName === 'INPUT' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'OPTION' || 
        target.tagName === 'LABEL' ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('.flatpickr-calendar') ||
        target.closest('.react-calendar') ||
        target.closest('[class*="calendar"]') ||
        target.closest('[class*="filter"]') ||
        target.closest('[class*="date"]') ||
        target.closest('[class*="search"]') ||
        (target.closest('svg') && (
          target.closest('svg').innerHTML.includes('filter') || 
          target.closest('svg').innerHTML.includes('calendar') || 
          target.closest('svg').innerHTML.includes('search')
        )) ||
        (target.textContent && (
          target.textContent.toLowerCase().includes('filter') || 
          target.textContent.toLowerCase().includes('फिल्टर') || 
          target.textContent.toLowerCase().includes('date') || 
          target.textContent.toLowerCase().includes('तारीख') ||
          target.textContent.toLowerCase().includes('search') ||
          target.textContent.toLowerCase().includes('शोधा')
        ));

      if (isDateOrFilter) {
        return;
      }

      // Otherwise, block any clickable elements
      const clickable = target.closest('button') || target.closest('a') || target.closest('[role="button"]') || target.closest('.btn');
      
      if (clickable) {
        e.preventDefault();
        e.stopPropagation();
        
        setShowRenewalModal(true);
        toast.error(isMarathi ? 'तुमची सदस्यता संपली आहे. कृपया नूतनीकरण करा.' : 'Your subscription has expired. Please renew.');
      }
    };

    window.addEventListener('click', handleGlobalClick, true);
    return () => window.removeEventListener('click', handleGlobalClick, true);
  }, [subStatus, isMarathi, toast]);

  const isDairyOwner = user?.ownerRole === 'dairy_owner';

  const navItems = [
    { to: '/app/owner', icon: LayoutDashboard, label: t('app.nav.dashboard', 'Dashboard'), end: true },
    ...(isDairyOwner ? [
      { to: '/app/owner/farmers', icon: Users, label: isMarathi ? 'शेतकरी (दूध उत्पादक)' : 'Farmers (Suppliers)' },
      { to: '/app/owner/customers', icon: Users, label: isMarathi ? 'ग्राहक (दूध खरेदीदार)' : 'Customers (Buyers)' }
    ] : [
      { to: '/app/owner/customers', icon: Users, label: t('app.nav.customers', 'Customers') }
    ]),
    { to: '/app/owner/delivery', icon: CheckCircle, label: isMarathi ? 'वितरण नोंदवा' : 'Log Deliveries' },
    { to: '/app/owner/staff', icon: UserCheck, label: t('app.nav.staff', 'Staff') },
    { to: '/app/owner/collection', icon: Droplets, label: t('app.nav.dailyCollection', 'Daily Collection') },
    { to: '/app/owner/logs', icon: ClipboardList, label: t('app.nav.logs', 'Logs') },
    { to: '/app/owner/billing', icon: Receipt, label: t('app.nav.billing', 'Billing') },
    { to: '/app/owner/default-rate', icon: Milk, label: t('app.nav.defaultRate', 'Default Rate') },
    ...(user?.features?.whatsapp_alerts || user?.features?.custom_message_templates
      ? [{ to: '/app/owner/message-templates', icon: BookOpen, label: t('app.nav.messageTemplates', 'Message Templates') }]
      : []),
    ...(user?.features?.whatsapp_alerts
      ? [{ to: '/app/owner/whatsapp', icon: WhatsAppNavIcon, label: t('app.nav.whatsapp', 'WhatsApp') }]
      : []),
    { to: '/app/owner/feedback', icon: MessageSquare, label: isMarathi ? 'अभिप्राय (फीडबॅक)' : 'Feedback & Support' }
  ];

  const subBadgeClass =
    subStatus === 'active' ? 'badge-green' :
    subStatus === 'trial'  ? 'badge-blue'  : 'badge-red';

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <Link to="/app/owner" className="sidebar-logo" style={{ display: 'block', textDecoration: 'none' }}>
        <img src={amritLogo} alt="Amrit Manage" style={{ height: '32px', width: 'auto', display: 'block', marginBottom: '4px', filter: 'brightness(0) invert(1)' }} />
        {user?.businessName && (
          <div style={{ color: '#8D8D8D', fontSize: '12px', marginTop: '2px' }}>{user.businessName}</div>
        )}
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
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                backgroundColor: '#0F62FE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'O'}
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
                  <span className={`badge ${subBadgeClass}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                    {subStatus?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '10px', color: '#8D8D8D', textTransform: 'capitalize' }}>
                    {user?.subscription?.plan}
                  </span>
                </div>
              </div>
            </div>
            {profileOpen
              ? <ChevronUp size={14} color="#8D8D8D" />
              : <ChevronDown size={14} color="#8D8D8D" />}
          </div>

          {/* Expanded profile info */}
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
              {user?.businessName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Building2 size={12} color="#8D8D8D" />
                  <span style={{ fontSize: '12px', color: '#C6C6C6' }}>{user.businessName}</span>
                </div>
              )}
              <button
                className="btn btn-ghost btn-sm btn-full"
                style={{ fontSize: '12px', height: '32px', borderColor: '#525252', color: '#C6C6C6' }}
                onClick={() => { setShowPwModal(true); setProfileOpen(false); setSidebarOpen(false); }}
              >
                <KeyRound size={12} /> {t('app.changePassword', 'Change Password')}
              </button>
            </div>
          )}
        </div>

        {/* Language toggle */}
        <div style={{ marginBottom: '8px' }}>
          <LanguageToggle style={{ width: '100%', justifyContent: 'center', borderColor: '#525252', backgroundColor: 'transparent', color: '#C6C6C6' }} />
        </div>

        {/* Sign-out reminder */}
        <div style={{ fontSize: '11px', color: '#8D8D8D', textAlign: 'center', marginBottom: '8px', lineHeight: 1.4, padding: '0 4px' }}>
          {isMarathi
            ? 'तुमचा डेटा सुरक्षित ठेवण्यासाठी वापर झाल्यावर साइन आउट करा.'
            : 'Sign out when done to keep your account secure.'}
        </div>

        {/* Logout */}
        <button className="btn btn-danger btn-sm btn-full" onClick={handleLogout}>
          <LogOut size={14} /> {t('app.signOut', 'Sign Out')}
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
          <Link to="/app/owner" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src={amritLogo} alt="Amrit Manage" style={{ height: '26px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
            {user?.businessName && (
              <span style={{ color: '#8D8D8D', fontSize: '13px' }}>· {user.businessName}</span>
            )}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LanguageToggle style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: 'transparent', borderColor: '#525252', color: '#C6C6C6' }} />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FFFFFF', padding: '4px' }}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <Outlet />
      </div>

      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}
      {showRenewalModal && (
        <RenewalModal
          isMarathi={isMarathi}
          onClose={() => setShowRenewalModal(false)}
          onRenew={() => {
            setShowRenewalModal(false);
            navigate('/app/owner/upgrade');
          }}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

// ── Renewal Modal ─────────────────────────────────────────────
const RenewalModal = ({ onClose, onRenew, onLogout, isMarathi }) => {
  return (
    <div className="modal-overlay" style={{ zIndex: 99999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div className="modal renewal-modal" style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '8px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #EAEAEA' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#FFF1F1',
          color: '#DA1E28',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <AlertCircle size={32} />
        </div>
        
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#161616', marginBottom: '12px' }}>
          {isMarathi ? 'सदस्यता संपली आहे' : 'Subscription Expired'}
        </h2>
        
        <p style={{ fontSize: '14.5px', color: '#525252', lineHeight: 1.6, marginBottom: '28px' }}>
          {isMarathi 
            ? 'तुमची सदस्यता संपली आहे. सर्व वैशिष्ट्ये पुनर्संचयित करण्यासाठी आणि तुमचा व्यवसाय सुरू ठेवण्यासाठी कृपया नूतनीकरण करा.'
            : 'Your subscription has expired. Please renew or upgrade your plan to restore access to all features.'}
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            type="button" 
            className="btn btn-primary btn-full" 
            style={{ height: '44px', fontWeight: 600, justifyContent: 'center' }}
            onClick={onRenew}
          >
            {isMarathi ? 'नूतनीकरण / अपग्रेड करा' : 'Renew / Upgrade Now'}
          </button>
          
          <button 
            type="button" 
            className="btn btn-ghost btn-full" 
            style={{ height: '44px', fontWeight: 600, justifyContent: 'center', borderColor: '#E0E0E0', color: '#161616' }}
            onClick={onClose}
          >
            {isMarathi ? 'बंद करा (फक्त पाहा)' : 'Close (View Only)'}
          </button>
          
          <button 
            type="button" 
            className="btn btn-danger btn-full" 
            style={{ height: '44px', fontWeight: 600, justifyContent: 'center', marginTop: '10px' }}
            onClick={onLogout}
          >
            <LogOut size={16} style={{ marginRight: '8px' }} />
            {isMarathi ? 'बाहेर पडा (लॉगआउट)' : 'Sign Out (Logout)'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Change Password Modal ─────────────────────────────────────
const ChangePasswordModal = ({ onClose }) => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '', verificationCode: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('New passwords do not match.'); return; }
    if (form.newPassword.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (!form.verificationCode.trim()) { toast.error('Verification code is required.'); return; }
    setLoading(true);
    try {
      await api.patch('/owner/password', {
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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <KeyRound size={20} color="#0F62FE" />
          <h2 style={{ fontWeight: 700, fontSize: '20px' }}>Change Password</h2>
        </div>
        <p style={{ color: '#525252', fontSize: '14px', marginBottom: '24px' }}>
          Enter your current password and verification code to set a new one.
        </p>
        <form onSubmit={handleSubmit}>
          {[
            { key: 'currentPassword',  label: 'Current Password',    placeholder: 'Your current password' },
            { key: 'newPassword',      label: 'New Password',        placeholder: 'Min 6 characters' },
            { key: 'confirm',          label: 'Confirm Password',    placeholder: 'Repeat new password' },
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
              The same code you use when logging in.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerLayout;
