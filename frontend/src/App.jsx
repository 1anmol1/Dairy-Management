import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShortcutProvider } from './context/ShortcutContext';
import { ToastProvider } from './context/ToastContext';
import ScrollToTop from './components/ScrollToTop';
import SignOutGuard from './components/SignOutGuard';
// ── Marathi i18n (self-contained — delete i18n/marathi/ to remove) ──
import { MarathiProvider } from './i18n/marathi';

// ── Static Imports for critical/initial pages ──────────────────
import SuperadminLayout    from './layouts/SuperadminLayout';
import OwnerLayout          from './layouts/OwnerLayout';
import StaffLayout   from './layouts/StaffLayout';

// ── Lazy-loaded Auth / Login ─────────────────────────────────────
const UnifiedLogin  = lazy(() => import('./pages/auth/UnifiedLogin'));
const OwnerRegister = lazy(() => import('./pages/auth/OwnerRegister'));

// ── Lazy-loaded Superadmin ───────────────────────────────────────
const SuperadminDashboard = lazy(() => import('./pages/superadmin/Dashboard'));
const SuperadminOwners = lazy(() => import('./pages/superadmin/Owners'));
const SuperadminPlans = lazy(() => import('./pages/superadmin/Plans'));
const SuperadminRequests = lazy(() => import('./pages/superadmin/Requests'));
const SuperadminActivities = lazy(() => import('./pages/superadmin/Activities'));
const SuperadminImpersonation = lazy(() => import('./pages/superadmin/Impersonation'));
const SuperadminFeedbackList = lazy(() => import('./pages/superadmin/FeedbackList'));
const SuperadminAdmins = lazy(() => import('./pages/superadmin/Admins'));
const SuperadminRecycleBin = lazy(() => import('./pages/superadmin/RecycleBin'));

// ── Lazy-loaded Owner ────────────────────────────────────────────
const OwnerDashboard = lazy(() => import('./pages/owner/Dashboard'));
const OwnerCustomers = lazy(() => import('./pages/owner/Customers'));
const OwnerFarmers = lazy(() => import('./pages/owner/Farmers'));
const OwnerStaff = lazy(() => import('./pages/owner/Staff'));
const OwnerLogs = lazy(() => import('./pages/owner/Logs'));
const OwnerBilling = lazy(() => import('./pages/owner/Billing'));
const OwnerWhatsApp = lazy(() => import('./pages/owner/WhatsApp'));
const OwnerDefaultRate = lazy(() => import('./pages/owner/DefaultRate'));
const OwnerUpgrade = lazy(() => import('./pages/owner/Upgrade'));
const OwnerOnboarding = lazy(() => import('./pages/owner/Onboarding'));
const OwnerDailyCollection = lazy(() => import('./pages/owner/DailyCollection'));
const OwnerMessageTemplates = lazy(() => import('./pages/owner/MessageTemplates'));
const FeedbackPage = lazy(() => import('./pages/owner/Feedback'));
const OwnerShortcuts = lazy(() => import('./pages/owner/Shortcuts'));

// ── Lazy-loaded Staff ────────────────────────────────────────────
const StaffDelivery = lazy(() => import('./pages/staff/Delivery'));

// ── Lazy-loaded 404 ──────────────────────────────────────────────
const NotFound = lazy(() => import('./pages/NotFound'));

// ── Role helpers ─────────────────────────────────────────────
const getRoleHome = (role) => {
  if (role === 'owner') return '/app/owner';
  if (role === 'staff') return '/app/staff';
  if (role === 'superadmin') return '/app/superadmin';
  return '/login';
};

const PortfolioBadge = () => (
  <div style={{
    position: 'fixed',
    bottom: '2px',
    left: '0px',
    right: '0px',
    textAlign: 'center',
    padding: '2px',
    fontSize: '10px',
    color: '#A0A0A0',
    zIndex: 99999,
    pointerEvents: 'none'
  }}>
    Designed and Developed by <a href="https://anmol-patil-portfolio.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ pointerEvents: 'auto', color: '#8D8D8D', textDecoration: 'underline' }}>Anmol Patil</a>
  </div>
);

// ── App Gate — redirects logged in users to their dashboard ──
const AppGate = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }
  return <Navigate to="/login" replace />;
};


// ── Protected route — redirect to correct login page if unauthenticated ─
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
  return <Navigate to="/login" replace />;
};

const PageLoader = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    fontFamily: 'Inter, sans-serif'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid #F3F3F3',
      borderTop: '3px solid #0F62FE',
      borderRadius: '50%',
      animation: 'spinLoader 0.8s linear infinite',
      marginBottom: '16px'
    }} />
    <span style={{ fontSize: '14px', color: '#525252', fontWeight: 500 }}>Loading...</span>
    <style>{`
      @keyframes spinLoader {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const App = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ShortcutProvider>
          <ToastProvider>
            <MarathiProvider>
              <ImpersonationBanner />
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ── Root URL conditional landing ── */}
                  <Route path="/" element={<RootRoute />} />

                {/* ── Secure login URL ──────────────────────── */}
                <Route path="/login"    element={<SignOutGuard><UnifiedLogin /></SignOutGuard>} />
                <Route path="/register" element={<OwnerRegister />} />

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
                  <Route path="shortcuts"         element={<OwnerShortcuts />} />
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
            </Suspense>
          </MarathiProvider>
        </ToastProvider>
      </ShortcutProvider>
    </AuthProvider>
    <PortfolioBadge />
  </BrowserRouter>
  );
};

export default App;
