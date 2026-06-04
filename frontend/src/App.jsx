import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ScrollToTop from './components/ScrollToTop';
import SignOutGuard from './components/SignOutGuard';
// ── Marathi i18n (self-contained — delete i18n/marathi/ to remove) ──
import { MarathiProvider } from './i18n/marathi';
import { Eye } from 'lucide-react';

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
import SuperadminImpersonation from './pages/superadmin/Impersonation';
import SuperadminFeedbackList from './pages/superadmin/FeedbackList';
import SuperadminAdmins from './pages/superadmin/Admins';
import SuperadminRecycleBin from './pages/superadmin/RecycleBin';

// ── Owner ─────────────────────────────────────────────────────
import OwnerLayout          from './layouts/OwnerLayout';
import OwnerDashboard       from './pages/owner/Dashboard';
import OwnerCustomers       from './pages/owner/Customers';
import OwnerFarmers         from './pages/owner/Farmers';
import OwnerStaff           from './pages/owner/Staff';
import OwnerLogs            from './pages/owner/Logs';
import OwnerBilling         from './pages/owner/Billing';
import OwnerWhatsApp        from './pages/owner/WhatsApp';
import OwnerDefaultRate     from './pages/owner/DefaultRate';
import OwnerUpgrade         from './pages/owner/Upgrade';
import OwnerOnboarding      from './pages/owner/Onboarding';
import OwnerDailyCollection from './pages/owner/DailyCollection';
import OwnerMessageTemplates from './pages/owner/MessageTemplates';
import PromotePage from './pages/landing/Promote';
import FeedbackPage         from './pages/owner/Feedback';

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
const AppGate = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  if (loading) return null;

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

  return <Navigate to="/securelogin/ownerlogin" replace />;
};

// ── Protected route — redirect to correct login page if unauthenticated ─
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    const path = window.location.pathname;
    if (path.includes('/superadmin')) {
      return <Navigate to="/loginto/lockedaccess/app/secure/adminaccounts/superadmin/login" replace />;
    }
    if (path.includes('/staff')) {
      return <Navigate to="/loginto/staffaccess" replace />;
    }
    return <Navigate to="/securelogin/ownerlogin" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) return <SignOutGuard>{null}</SignOutGuard>;
  return children;
};

const OwnerCollectionGuard = ({ children }) => {
  const { user } = useAuth();
  if (!user || user.ownerRole !== 'dairy_owner') {
    return <Navigate to="/app/owner" replace />;
  }
  return children;
};

const ImpersonationBanner = () => {
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [windowWidth, setWindowWidth] = React.useState(window.innerWidth);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user || !user.impersonated) return null;

  const handleLogout = () => {
    logout();
    setShowConfirm(false);
    navigate('/app/superadmin');
  };

  const hasSidebar = user && user.role !== 'staff';
  const showSidebarOffset = hasSidebar && windowWidth > 768;
  const marginLeft = showSidebarOffset ? '240px' : '0px';

  return (
    <>
      <div style={{
        backgroundColor: '#DA1E28',
        color: '#FFFFFF',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 99999,
        fontFamily: 'Inter, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        marginLeft: marginLeft,
        transition: 'margin-left 0.25s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={16} style={{ flexShrink: 0 }} />
          <span>
            Impersonating {user.role.toUpperCase()}: <strong>{user.name}</strong> ({user.phone})
          </span>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          style={{
            backgroundColor: '#FFFFFF',
            color: '#DA1E28',
            border: 'none',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            borderRadius: '2px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F4F4F4'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
        >
          Exit Session
        </button>
      </div>

      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#161616', margin: '0 0 10px 0' }}>
              Confirm Exit Session?
            </h3>
            <p style={{ fontSize: '14px', color: '#525252', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              Are you sure you want to exit the impersonated session? You will be returned to the Super Admin panel.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FFFFFF',
                  color: '#525252',
                  border: '1px solid #E0E0E0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#DA1E28',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const StaffHomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return null;
  const permissions = user.permissions || ['milk_delivery'];
  if (!permissions.includes('milk_delivery') && permissions.includes('milk_collection')) {
    return <Navigate to="/app/staff/collection" replace />;
  }
  return <Navigate to="/app/staff/delivery" replace />;
};

const RootRoute = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isAppSubdomain =
    hostname === 'amritmanage-app.eurekai.in' ||
    hostname.startsWith('app.') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  if (isAppSubdomain) {
    return <PrivateAccessPortal />;
  }
  return <SignOutGuard><LandingPage /></SignOutGuard>;
};

const App = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <MarathiProvider>
            <ImpersonationBanner />
            <ScrollToTop />
            <Routes>
              {/* ── Root URL conditional landing ── */}
              <Route path="/" element={<RootRoute />} />

              {/* ── Public Landing pages ─────────────────────── */}
              <Route path="/promote"      element={<SignOutGuard><PromotePage /></SignOutGuard>} />
              <Route path="/landing"      element={<SignOutGuard><AdsLanding /></SignOutGuard>} />
              <Route path="/features"     element={<SignOutGuard><FeaturesPage /></SignOutGuard>} />
              <Route path="/pricing"      element={<SignOutGuard><PricingPage /></SignOutGuard>} />
              <Route path="/how-it-works" element={<SignOutGuard><HowItWorks /></SignOutGuard>} />
              <Route path="/faq"          element={<SignOutGuard><FAQPage /></SignOutGuard>} />
              <Route path="/privacy"      element={<SignOutGuard><PrivacyPage /></SignOutGuard>} />
              <Route path="/terms"        element={<SignOutGuard><TermsPage /></SignOutGuard>} />
              <Route path="/start"        element={<SignOutGuard><TrialSignup /></SignOutGuard>} />

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
                <Route path="owners"      element={<SuperadminOwners />} />
                <Route path="activities"  element={<SuperadminActivities />} />
                <Route path="plans"       element={<SuperadminPlans />} />
                <Route path="requests"    element={<SuperadminRequests />} />
                <Route path="impersonate" element={<SuperadminImpersonation />} />
                <Route path="feedback"    element={<SuperadminFeedbackList />} />
                <Route path="admins"      element={<SuperadminAdmins />} />
                <Route path="recycle-bin" element={<SuperadminRecycleBin />} />
              </Route>

              {/* ── Owner ─────────────────────────────────── */}
              <Route path="/app/owner" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <OwnerLayout />
                </ProtectedRoute>
              }>
                <Route index element={<OwnerDashboard />} />
                <Route path="customers"         element={<OwnerCustomers />} />
                <Route path="farmers"           element={<OwnerFarmers />} />
                <Route path="staff"             element={<OwnerStaff />} />
                <Route path="collection"        element={<OwnerDailyCollection />} />
                <Route path="logs"              element={<OwnerLogs />} />
                <Route path="billing"           element={<OwnerBilling />} />
                <Route path="whatsapp"          element={<OwnerWhatsApp />} />
                <Route path="default-rate"      element={<OwnerDefaultRate />} />
                <Route path="upgrade"           element={<OwnerUpgrade />} />
                <Route path="message-templates" element={<OwnerMessageTemplates />} />
                <Route path="delivery"          element={<StaffDelivery />} />
                <Route path="feedback"          element={<FeedbackPage />} />
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
                <Route index element={<StaffHomeRedirect />} />
                <Route path="delivery" element={<StaffDelivery />} />
                <Route path="collection" element={<OwnerDailyCollection />} />
              </Route>

              {/* ── /app root ─────────────────────────────── */}
              <Route path="/app" element={<AppGate />} />

              {/* ── 404 ───────────────────────────────────── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MarathiProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
