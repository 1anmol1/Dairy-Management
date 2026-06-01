import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Phone, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import amritLogo from '../assets/Amritmanagelogo.png';
import LanguageToggle from '../i18n/marathi/LanguageToggle';
import { useMarathi } from '../i18n/marathi';

const StaffLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useMarathi();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/loginto/staffaccess');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4F4F4', fontFamily: 'Inter, sans-serif' }}>
      {/* Top bar */}
      <div style={{
        backgroundColor: '#161616', padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 99, height: '52px'
      }}>
        {/* Brand */}
        <Link to="/app/staff" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src={amritLogo} alt="Amrit Manage" style={{ height: '28px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
        </Link>

        {/* Right: profile + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Profile button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(p => !p)}
              style={{
                background: 'none', border: '1px solid #393939', cursor: 'pointer',
                color: '#C6C6C6', padding: '6px 12px', fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.1s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#262626'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', backgroundColor: '#24A148',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </span>
              {profileOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                backgroundColor: '#262626', border: '1px solid #393939',
                minWidth: '220px', zIndex: 200, padding: '12px'
              }}>
                <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #393939' }}>
                  <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>{user?.name}</div>
                  {user?.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Phone size={12} color="#8D8D8D" />
                      <span style={{ fontSize: '12px', color: '#C6C6C6' }}>{user.phone}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={12} color="#8D8D8D" />
                    <span className="badge badge-blue" style={{ fontSize: '9px', padding: '1px 6px' }}>STAFF</span>
                  </div>
                </div>
                {/* No password change for staff — contact owner */}
                <div style={{ fontSize: '11px', color: '#8D8D8D', lineHeight: 1.5, padding: '4px 0' }}>
                  To change your password, contact your owner.
                </div>
              </div>
            )}
          </div>

          {/* Language toggle */}
          <LanguageToggle style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: 'transparent', borderColor: '#525252', color: '#C6C6C6' }} />

          {/* Sign out */}
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: '1px solid #525252', cursor: 'pointer',
              color: '#C6C6C6', padding: '6px 12px', fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.1s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#262626'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={13} /> {t('app.signOut', 'Sign Out')}
          </button>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {profileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setProfileOpen(false)} />
      )}

      <Outlet />
    </div>
  );
};

export default StaffLayout;
