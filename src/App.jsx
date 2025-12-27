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
  const [isValidatingToken, setIsValidatingToken] = useState(() => !!localStorage.getItem('access_token'));

  // Validate token on mount if user appears to be logged in
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsValidatingToken(false);
        return;
      }

      try {
        // Verify token is still valid by calling /me endpoint
        await api.getCurrentUser();
        setCurrentPage('dashboard');
      } catch (error) {
        // Token is invalid or expired - clear auth and go to login
        api.clearAuth();
        setCurrentPage('login');
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateSession();
  }, []);

  // Navigation handler - only allows valid flow transitions
  const handleNavigate = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // Login success -> go to OTP (pass email from login form)
  const handleLoginSuccess = useCallback((email) => {
    setUserEmail(email || 'user@example.com');
    setCurrentPage('otp-verify');
  }, []);

  // OTP verification success -> redirect to dashboard
  const handleVerifySuccess = useCallback(() => {
    setCurrentPage('dashboard');
  }, []);

  // Logout -> back to login
  const handleLogout = useCallback(() => {
    api.clearAuth();
    setCurrentPage('login');
    setUserEmail('');
  }, []);

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
        // OTP is only accessible after login success
        return (
          <OTPVerify
            email={userEmail}
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
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
