import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { clearAllCache } from '../utils/cache';

const AuthContext = createContext(null);

// Strip fields that don't need to be in localStorage
// Keep only what the UI actually needs for rendering
const sanitizeUserForStorage = (user) => ({
  _id:             user._id,
  name:            user.name,
  phone:           user.phone,
  role:            user.role,
  ownerId:         user.ownerId,
  businessName:    user.businessName,
  subscription:    user.subscription
    ? {
        status:      user.subscription.status,
        plan:        user.subscription.plan,
        trialEndsAt: user.subscription.trialEndsAt,
        expiresAt:   user.subscription.expiresAt,
      }
    : undefined,
  ownerRole:       user.ownerRole,
  features:        user.features,
  onboardingDone:  user.onboardingDone || false,
  // email and username intentionally omitted from localStorage
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const impersonateUser = sessionStorage.getItem('amrit_impersonate_user');
      const stored = impersonateUser || localStorage.getItem('amrit_user');
      const token = sessionStorage.getItem('amrit_impersonate_token') || localStorage.getItem('amrit_token');
      if (stored && token) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const impersonateUser = sessionStorage.getItem('amrit_impersonate_user');
    const stored = impersonateUser || localStorage.getItem('amrit_user');
    const token = sessionStorage.getItem('amrit_impersonate_token') || localStorage.getItem('amrit_token');

    if (stored && token) {
      // Async refresh profile to ensure stale local values (e.g., ownerRole, subscription) are corrected
      api.get('/auth/me')
        .then(({ data }) => {
          const safeUser = sanitizeUserForStorage(data.user);
          if (sessionStorage.getItem('amrit_impersonate_token')) {
            const impUser = { ...safeUser, impersonated: true };
            sessionStorage.setItem('amrit_impersonate_user', JSON.stringify(impUser));
            setUser(impUser);
          } else {
            localStorage.setItem('amrit_user', JSON.stringify(safeUser));
            setUser(safeUser);
          }
        })
        .catch((err) => {
          // If token expired/invalid (401/403), clear appropriate session
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            if (sessionStorage.getItem('amrit_impersonate_token')) {
              sessionStorage.removeItem('amrit_impersonate_token');
              sessionStorage.removeItem('amrit_impersonate_user');
            } else {
              localStorage.removeItem('amrit_token');
              localStorage.removeItem('amrit_user');
            }
            setUser(null);
          }
        });
    }
    setLoading(false);

    // Listen for external auth updates (e.g. superadmin login that bypasses login())
    const handleExternalAuth = () => {
      const impUser = sessionStorage.getItem('amrit_impersonate_user');
      const s = impUser || localStorage.getItem('amrit_user');
      const t = sessionStorage.getItem('amrit_impersonate_token') || localStorage.getItem('amrit_token');
      if (s && t) setUser(JSON.parse(s));
    };
    window.addEventListener('amrit_auth_update', handleExternalAuth);
    return () => window.removeEventListener('amrit_auth_update', handleExternalAuth);
  }, []);

  const login = async (identifier, password, verificationCode) => {
    const { data } = await api.post('/auth/login', { identifier, password, verificationCode });
    localStorage.setItem('amrit_token', data.token);
    // Strip sensitive fields before storing user in localStorage
    const safeUser = sanitizeUserForStorage(data.user);
    localStorage.setItem('amrit_user', JSON.stringify(safeUser));
    clearAllCache(); // fresh cache for new session
    setUser(safeUser);
    return safeUser;
  };

  const logout = () => {
    if (sessionStorage.getItem('amrit_impersonate_token')) {
      sessionStorage.removeItem('amrit_impersonate_token');
      sessionStorage.removeItem('amrit_impersonate_user');
      clearAllCache();
      
      // Re-load the superadmin user from localStorage if it exists
      const storedAdmin = localStorage.getItem('amrit_user');
      if (storedAdmin) {
        setUser(JSON.parse(storedAdmin));
      } else {
        setUser(null);
      }
      return;
    }
    localStorage.removeItem('amrit_token');
    localStorage.removeItem('amrit_user');
    clearAllCache(); // wipe all cached data on logout
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      const safeUser = sanitizeUserForStorage(data.user);
      if (sessionStorage.getItem('amrit_impersonate_token')) {
        const impUser = { ...safeUser, impersonated: true };
        sessionStorage.setItem('amrit_impersonate_user', JSON.stringify(impUser));
        setUser(impUser);
      } else {
        localStorage.setItem('amrit_user', JSON.stringify(safeUser));
        setUser(safeUser);
      }
    } catch (err) {
      logout();
    }
  };

  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  let activeUser = user;
  if (!user && isLocalhost) {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (path.includes('/superadmin')) {
      activeUser = {
        _id: 'mock-superadmin-id',
        name: 'Mock Superadmin (Dev)',
        phone: '9999999999',
        role: 'superadmin',
        ownerRole: 'superadmin',
        features: {}
      };
    } else if (path.includes('/owner')) {
      activeUser = {
        _id: 'mock-owner-id',
        name: 'Mock Owner (Dev)',
        phone: '8888888888',
        role: 'owner',
        ownerRole: 'dairy_owner',
        businessName: 'Mock Dairy Farm',
        subscription: { status: 'active', plan: 'gold' },
        features: { whatsapp: true, sms: true, marathi: true },
        onboardingDone: true
      };
    } else if (path.includes('/staff')) {
      activeUser = {
        _id: 'mock-staff-id',
        name: 'Mock Staff (Dev)',
        phone: '7777777777',
        role: 'staff',
        ownerId: 'mock-owner-id',
        businessName: 'Mock Dairy Farm'
      };
    }
  }

  return (
    <AuthContext.Provider value={{ user: activeUser, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
