/**
 * SignOutGuard
 *
 * Wraps any public/login page. When a signed-in user navigates to it
 * (e.g. pressing browser Back from the app), they see a sign-out
 * confirmation modal instead of the page content.
 *
 * - "Sign Out" → logs out and redirects to their role's login page
 * - "Go Back to App" → navigates back to their dashboard
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const getRoleHome = (role) => {
  if (role === 'superadmin') return '/app/superadmin';
  if (role === 'owner')      return '/app/owner';
  if (role === 'staff')      return '/app/staff';
  return '/';
};

const getRoleLogin = (role) => {
  if (role === 'owner')      return '/securelogin/ownerlogin';
  if (role === 'staff')      return '/loginto/staffaccess';
  if (role === 'superadmin') return '/loginto/lockedaccess/app/secure/adminaccounts/superadmin/login';
  return '/securelogin/ownerlogin';
};

const getRoleLabel = (role) => {
  if (role === 'owner')      return 'Owner';
  if (role === 'staff')      return 'Staff';
  if (role === 'superadmin') return 'Super Admin';
  return 'User';
};

const getRoleColor = (role) => {
  if (role === 'owner')      return '#0F62FE';
  if (role === 'staff')      return '#24A148';
  if (role === 'superadmin') return '#DA1E28';
  return '#0F62FE';
};

const SignOutGuard = ({ children }) => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  // Still loading auth state — render nothing to avoid flash
  if (loading) return null;

  // Not logged in — render the page normally
  if (!user) return children;

  // Logged in — show the sign-out prompt modal (not the page behind it)
  const roleColor = getRoleColor(user.role);

  const handleSignOut = () => {
    logout();
    navigate(getRoleLogin(user.role), { replace: true });
  };

  const handleGoBack = () => {
    navigate(getRoleHome(user.role), { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F4F4F4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0',
        maxWidth: '420px', width: '100%', padding: '40px 36px',
        textAlign: 'center'
      }}>
        {/* Role badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          backgroundColor: `${roleColor}14`, border: `1px solid ${roleColor}30`,
          padding: '4px 14px', fontSize: '11px', fontWeight: 700,
          color: roleColor, textTransform: 'uppercase', letterSpacing: '0.6px',
          marginBottom: '24px'
        }}>
          <Shield size={11} />
          {getRoleLabel(user.role)} — Active Session
        </div>

        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          backgroundColor: `${roleColor}14`, border: `2px solid ${roleColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <LogOut size={28} color={roleColor} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#161616', marginBottom: '10px' }}>
          You're still signed in
        </h2>
        <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6, marginBottom: '8px' }}>
          Hi <strong>{user.name}</strong>, you have an active session.
        </p>
        <p style={{ fontSize: '13px', color: '#8D8D8D', lineHeight: 1.6, marginBottom: '32px' }}>
          Sign out to protect your account, or go back to your dashboard.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', padding: '13px 24px',
              backgroundColor: roleColor, color: '#FFFFFF',
              border: 'none', cursor: 'pointer', fontWeight: 700,
              fontSize: '14px', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'opacity 0.15s'
            }}
            onMouseOver={e => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <LogOut size={15} />
            Sign Out
          </button>

          <button
            onClick={handleGoBack}
            style={{
              width: '100%', padding: '13px 24px',
              backgroundColor: '#FFFFFF', color: '#161616',
              border: '1px solid #E0E0E0', cursor: 'pointer', fontWeight: 600,
              fontSize: '14px', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background-color 0.15s'
            }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#F4F4F4'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
          >
            <ArrowLeft size={15} />
            Go Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignOutGuard;
