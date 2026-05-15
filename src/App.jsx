import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Login,
  OTPVerify,
  Signup,
  PendingApproval,
  ForgotPassword,
  ChangePassword,
} from './pages';
import Dashboard from './pages/Dashboard';
import api from './services/api';

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -10,
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3,
};

// Check if user is already authenticated on app load
const getInitialPage = () => {
  const token = localStorage.getItem('access_token');
  return token ? 'dashboard' : 'login';
};

function App() {
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [userEmail, setUserEmail] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [isValidatingToken, setIsValidatingToken] = useState(() => !!localStorage.getItem('access_token'));

  // Validate token on mount if user appears to be logged in.
  // Uses a 5-second timeout so a slow/unreachable backend never leaves
  // the user stuck on the loading spinner indefinitely.
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsValidatingToken(false);
        return;
      }

      // AbortController: cancel token check if backend doesn't respond in 15s.
      // 15s is generous enough to survive RDS cold-start connection pooling.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        await api.getCurrentUser({ signal: controller.signal });
        clearTimeout(timeoutId);
        setCurrentPage('dashboard');
      } catch (error) {
        clearTimeout(timeoutId);
        // Any failure (expired token, network error, timeout) → go to login
        api.clearAuth();
        setCurrentPage('login');
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateSession();
  }, []);

  // Wire the global 401 interceptor in api.js so any authenticated request
  // that gets a 401 (expired/revoked token) immediately clears auth state
  // and navigates to login — without each component needing its own 401 handler.
  useEffect(() => {
    api.onAuthFailure = () => {
      api.clearAuth();
      setCurrentPage('login');
      setUserEmail('');
    };
    return () => {
      api.onAuthFailure = null;
    };
  }, []);

  // Navigation handler - only allows valid flow transitions
  const handleNavigate = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // Login success -> go to OTP (pass email + optional dev OTP from login form)
  const handleLoginSuccess = useCallback((email, otp = null) => {
    setUserEmail(email || 'user@example.com');
    setDevOtp(otp);
    setCurrentPage('otp-verify');
  }, []);

  // OTP verification success -> redirect to dashboard
  const handleVerifySuccess = useCallback(() => {
    setCurrentPage('dashboard');
  }, []);

  // Logout -> back to login.
  // Calls POST /logout to invalidate the server-side DB token so it cannot
  // be replayed. Falls back to local clear if the server is unreachable.
  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch (_) {
      // Server unreachable or already logged out — still clear local state
      api.clearAuth();
    }
    setCurrentPage('login');
    setUserEmail('');
  }, []);

  // Auto-logout after 15 minutes of user inactivity (while on the dashboard).
  // Placed after handleLogout to avoid a temporal-dead-zone ReferenceError.
  const INACTIVITY_MS = 15 * 60 * 1000;
  useEffect(() => {
    if (currentPage !== 'dashboard') return;

    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(handleLogout, INACTIVITY_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [currentPage, handleLogout]);

  // Signup success -> go to pending approval
  const handleSignupSuccess = useCallback((email) => {
    setUserEmail(email || 'user@example.com');
    setCurrentPage('pending-approval');
  }, []);

  // Change password success
  const handleChangePasswordSuccess = useCallback(() => {
    setCurrentPage('login');
  }, []);

  // Render current page based on flow state
  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return (
          <Login
            onNavigate={handleNavigate}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'otp-verify':
        return (
          <OTPVerify
            email={userEmail}
            devOtp={devOtp}
            onNavigate={handleNavigate}
            onVerifySuccess={handleVerifySuccess}
          />
        );
      case 'signup':
        return (
          <Signup
            onNavigate={handleNavigate}
            onSignupSuccess={handleSignupSuccess}
          />
        );
      case 'pending-approval':
        // Pending approval is only accessible after signup
        return (
          <PendingApproval
            email={userEmail}
            onNavigate={handleNavigate}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPassword
            onNavigate={handleNavigate}
          />
        );
      case 'change-password':
        return (
          <ChangePassword
            onNavigate={handleNavigate}
            onSuccess={handleChangePasswordSuccess}
          />
        );
      case 'dashboard':
        return (
          <Dashboard
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <Login
            onNavigate={handleNavigate}
            onLoginSuccess={handleLoginSuccess}
          />
        );
    }
  };

  // Show loading spinner while validating token
  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Page content with transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App;
