import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ScrollToTop from './components/ScrollToTop';
import SignOutGuard from './components/SignOutGuard';
// ── Marathi i18n (self-contained — delete i18n/marathi/ to remove) ──
import { MarathiProvider } from './i18n/marathi';

// ── Auth / Login ──────────────────────────────────────────────
import OwnerLogin    from './pages/auth/OwnerLogin';
import StaffLogin    from './pages/auth/StaffLogin';
import AdminLogin    from './pages/auth/AdminLogin';

// ── Landing pages (marketing site) ───────────────────────────
import LandingPage   from './pages/landing/Landing';
import AdsLanding    from './pages/landing/AdsLanding';
import FeaturesPage  from './pages/landing/Features';
import PricingPage   from './pages/landing/Pricing';
import HowItWorks    from './pages/landing/HowItWorks';
import FAQPage       from './pages/landing/FAQ';
import PrivacyPage   from './pages/landing/Privacy';
import TermsPage     from './pages/landing/Terms';
import TrialSignup   from './pages/landing/TrialSignup';

// ── Superadmin ────────────────────────────────────────────────
import SuperadminLayout    from './layouts/SuperadminLayout';
import SuperadminDashboard from './pages/superadmin/Dashboard';
import SuperadminOwners    from './pages/superadmin/Owners';
import SuperadminPlans     from './pages/superadmin/Plans';
import SuperadminRequests  from './pages/superadmin/Requests';
import SuperadminActivities from './pages/superadmin/Activities';

// ── Owner ─────────────────────────────────────────────────────
import OwnerLayout          from './layouts/OwnerLayout';
import OwnerDashboard       from './pages/owner/Dashboard';
import OwnerCustomers       from './pages/owner/Customers';
import OwnerStaff           from './pages/owner/Staff';
import OwnerLogs            from './pages/owner/Logs';
import OwnerBilling         from './pages/owner/Billing';
import OwnerWhatsApp        from './pages/owner/WhatsApp';
import OwnerDefaultRate     from './pages/owner/DefaultRate';
import OwnerUpgrade         from './pages/owner/Upgrade';
import OwnerOnboarding      from './pages/owner/Onboarding';
import OwnerDailyCollection from './pages/owner/DailyCollection';
import OwnerMessageTemplates from './pages/owner/MessageTemplates';

// ── Staff ─────────────────────────────────────────────────────
import StaffLayout   from './layouts/StaffLayout';
import StaffDelivery from './pages/staff/Delivery';

// ── 404 ───────────────────────────────────────────────────────
import NotFound from './pages/NotFound';

// ── Role helpers ─────────────────────────────────────────────
const getRoleHome = (role) => {
  if (role === 'superadmin') return '/app/superadmin';
  if (role === 'owner')      return '/app/owner';
  if (role === 'staff')      return '/app/staff';
  return '/';
};

// ── Private Access Portal — shown at app.* root (/) ──────────
const PrivateAccessPortal = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0d0d0d', fontFamily: 'Inter, sans-serif', padding: '24px'
  }}>
    <div style={{ textAlign: 'center', maxWidth: '480px', width: '100%' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        backgroundColor: '#1a1a1a', border: '2px solid #333',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 28px', fontSize: '32px'
      }}>🔐</div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginBottom: '12px', letterSpacing: '-0.3px' }}>
        Private Access Portal
      </h1>
      <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.7, marginBottom: '8px' }}>
        This application is restricted to authorized users only.
      </p>
      <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.7, marginBottom: '8px' }}>
        Access is provided through secure invitation links.
      </p>
      <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.7, marginBottom: '8px' }}>
        If you already have access, use the direct link shared with you.
      </p>
      <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.7, marginTop: '20px' }}>
        Unauthorized access attempts are monitored.
      </p>
    </div>
  </div>
);

// ── "Not signed in" message for /app when unauthenticated ────
// When signed in, show the sign-out guard instead of redirecting
const AppGate = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  if (loading) return null;

  // Signed in — show sign-out prompt (same as SignOutGuard)
  if (user) {
    const roleColor = user.role === 'owner' ? '#0F62FE' : user.role === 'staff' ? '#24A148' : '#DA1E28';
    const roleLabel = user.role === 'owner' ? 'Owner' : user.role === 'staff' ? 'Staff' : 'Super Admin';
    const roleLogin = user.role === 'owner' ? '/securelogin/ownerlogin' : user.role === 'staff' ? '/loginto/staffaccess' : '/loginto/lockedaccess/app/secure/adminaccounts/superadmin/login';
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F4F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', maxWidth: '420px', width: '100%', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: `${roleColor}14`, border: `1px solid ${roleColor}30`, padding: '4px 14px', fontSize: '11px', fontWeight: 700, color: roleColor, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '24px' }}>
            {roleLabel} — Active Session
          </div>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: `${roleColor}14`, border: `2px solid ${roleColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: '28px' }}>🔒</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#161616', marginBottom: '10px' }}>You're still signed in</h2>
          <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6, marginBottom: '8px' }}>Hi <strong>{user.name}</strong>, you have an active session.</p>
          <p style={{ fontSize: '13px', color: '#8D8D8D', lineHeight: 1.6, marginBottom: '32px' }}>Sign out to protect your account, or go back to your dashboard.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => { logout(); navigate(roleLogin, { replace: true }); }} style={{ width: '100%', padding: '13px 24px', backgroundColor: roleColor, color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', fontFamily: 'inherit' }}>
              Sign Out
            </button>
            <button onClick={() => navigate(getRoleHome(user.role), { replace: true })} style={{ width: '100%', padding: '13px 24px', backgroundColor: '#FFFFFF', color: '#161616', border: '1px solid #E0E0E0', cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
              Go Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#F4F4F4', fontFamily: 'Inter, sans-serif', padding: '24px'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: '#161616' }}>
          If you are subscribed, you will be redirected soon!
        </h2>
        <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.6, marginBottom: '24px' }}>
          Please sign in to access your account. Use the correct login link for your role.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a href="/securelogin/ownerlogin" style={{
            backgroundColor: '#0F62FE', color: '#FFFFFF', padding: '12px 24px',
            textDecoration: 'none', fontWeight: 600, fontSize: '14px', display: 'block'
          }}>
            Owner Login
          </a>
          <a href="/loginto/staffaccess" style={{
            backgroundColor: '#24A148', color: '#FFFFFF', padding: '12px 24px',
            textDecoration: 'none', fontWeight: 600, fontSize: '14px', display: 'block'
          }}>
            Staff Login
          </a>
        </div>
      </div>
    </div>
  );
};

// ── Protected route — no redirects, show 404 for unauthenticated ─
// - Not logged in → 404
// - Wrong role    → sign-out guard (they're logged in but wrong area)
// - Correct role  → render children
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <NotFound />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <SignOutGuard>{null}</SignOutGuard>;
  return children;
};

const App = () => {
  // Detect if running on the app domain (amritmanage-app.eurekai.in or localhost dev)
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isAppSubdomain =
    hostname === 'amritmanage-app.eurekai.in' ||
    hostname.startsWith('app.');

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <MarathiProvider>
            <ScrollToTop />
          <Routes>
            {isAppSubdomain ? (
              /* ── APP SUBDOMAIN (app.amritmanage.eurekai.in) ── */
              <>
                {/* Root → Private Access Portal */}
                <Route path="/" element={<PrivateAccessPortal />} />

                {/* ── Secure login URLs ─────────────────────── */}
                <Route path="/securelogin/ownerlogin"  element={<SignOutGuard><OwnerLogin /></SignOutGuard>} />
                <Route path="/loginto/staffaccess"     element={<SignOutGuard><StaffLogin /></SignOutGuard>} />
                <Route path="/loginto/lockedaccess/app/secure/adminaccounts/superadmin/login" element={<SignOutGuard><AdminLogin /></SignOutGuard>} />

                {/* ── Legacy → 404 ──────────────────────────── */}
                <Route path="/ownerlogin"  element={<NotFound />} />
                <Route path="/staffaccess" element={<NotFound />} />
                <Route path="/app/login"   element={<NotFound />} />
                <Route path="/app/secure/adminaccounts/superadmin/login" element={<NotFound />} />
                <Route path="/loginto/staffaccess/app/secure/adminaccounts/superadmin/login" element={<NotFound />} />

                {/* ── Superadmin ────────────────────────────── */}
                <Route path="/app/superadmin" element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <SuperadminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<SuperadminDashboard />} />
                  <Route path="owners"     element={<SuperadminOwners />} />
                  <Route path="activities" element={<SuperadminActivities />} />
                  <Route path="plans"      element={<SuperadminPlans />} />
                  <Route path="requests"   element={<SuperadminRequests />} />
                </Route>

                {/* ── Owner ─────────────────────────────────── */}
                <Route path="/app/owner" element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <OwnerLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<OwnerDashboard />} />
                  <Route path="customers"         element={<OwnerCustomers />} />
                  <Route path="staff"             element={<OwnerStaff />} />
                  <Route path="collection"        element={<OwnerDailyCollection />} />
                  <Route path="logs"              element={<OwnerLogs />} />
                  <Route path="billing"           element={<OwnerBilling />} />
                  <Route path="whatsapp"          element={<OwnerWhatsApp />} />
                  <Route path="default-rate"      element={<OwnerDefaultRate />} />
                  <Route path="upgrade"           element={<OwnerUpgrade />} />
                  <Route path="message-templates" element={<OwnerMessageTemplates />} />
                </Route>

                {/* ── Onboarding ────────────────────────────── */}
                <Route path="/app/owner/onboarding" element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <OwnerOnboarding />
                  </ProtectedRoute>
                } />

                {/* ── Staff ─────────────────────────────────── */}
                <Route path="/app/staff" element={
                  <ProtectedRoute allowedRoles={['staff']}>
                    <StaffLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<StaffDelivery />} />
                </Route>

                {/* ── /app root ─────────────────────────────── */}
                <Route path="/app" element={<AppGate />} />

                {/* ── 404 ───────────────────────────────────── */}
                <Route path="*" element={<NotFound />} />
              </>
            ) : (
              /* ── MARKETING DOMAIN (amritmanage.eurekai.in) ── */
              <>
                <Route path="/"             element={<SignOutGuard><LandingPage /></SignOutGuard>} />
                <Route path="/landing"      element={<SignOutGuard><AdsLanding /></SignOutGuard>} />
                <Route path="/features"     element={<SignOutGuard><FeaturesPage /></SignOutGuard>} />
                <Route path="/pricing"      element={<SignOutGuard><PricingPage /></SignOutGuard>} />
                <Route path="/how-it-works" element={<SignOutGuard><HowItWorks /></SignOutGuard>} />
                <Route path="/faq"          element={<SignOutGuard><FAQPage /></SignOutGuard>} />
                <Route path="/privacy"      element={<SignOutGuard><PrivacyPage /></SignOutGuard>} />
                <Route path="/terms"        element={<SignOutGuard><TermsPage /></SignOutGuard>} />
                <Route path="/start"        element={<SignOutGuard><TrialSignup /></SignOutGuard>} />
                <Route path="*"             element={<NotFound />} />
              </>
            )}
          </Routes>
          </MarathiProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
