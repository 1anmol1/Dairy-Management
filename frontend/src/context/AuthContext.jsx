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
  features:        user.features,
  onboardingDone:  user.onboardingDone || false,
  // email and username intentionally omitted from localStorage
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('amrit_user');
    const token = localStorage.getItem('amrit_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);

    // Listen for external auth updates (e.g. superadmin login that bypasses login())
    const handleExternalAuth = () => {
      const s = localStorage.getItem('amrit_user');
      const t = localStorage.getItem('amrit_token');
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
    localStorage.removeItem('amrit_token');
    localStorage.removeItem('amrit_user');
    clearAllCache(); // wipe all cached data on logout
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      const safeUser = sanitizeUserForStorage(data.user);
      localStorage.setItem('amrit_user', JSON.stringify(safeUser));
      setUser(safeUser);
    } catch (err) {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
