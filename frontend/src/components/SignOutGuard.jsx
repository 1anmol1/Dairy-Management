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
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getRoleHome = (role) => {
  if (role === 'superadmin') return '/app/superadmin';
  if (role === 'owner')      return '/app/owner';
  if (role === 'staff')      return '/app/staff';
  return '/';
};

const SignOutGuard = ({ children }) => {
  const { user, loading } = useAuth();

  // Still loading auth state — render nothing to avoid flash
  if (loading) return null;

  // Not logged in — render the page normally
  if (!user) return children;

  // Logged in — automatically redirect to their dashboard
  return <Navigate to={getRoleHome(user.role)} replace />;
};

export default SignOutGuard;

