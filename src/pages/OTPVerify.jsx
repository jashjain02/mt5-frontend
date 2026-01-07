import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import {
  AuthCard,
  OTPInput,
  GradientButton,
  StatusMessage,
} from '../components';
import api from '../services/api';

const OTPVerify = ({ email = 'user@example.com', onNavigate, onVerifySuccess }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mt5Accounts, setMt5Accounts] = useState([]);
  const [showMt5Status, setShowMt5Status] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleResendOTP = useCallback(async () => {
    setIsResending(true);
    setError('');
    setOtp('');

    try {
      await api.resendOTP(email);
      setCanResend(false);
      setCountdown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.verifyOTP(email, otp);

      if (response.success) {
        // Store the token and user data
        api.setToken(response.access_token);
        api.setUser(response.user);

        // Check if MT5 accounts were connected
        if (response.mt5_accounts && response.mt5_accounts.length > 0) {
          setMt5Accounts(response.mt5_accounts);
          setShowMt5Status(true);
        }

        setIsSuccess(true);
        setTimeout(() => {
          onVerifySuccess?.();
        }, 3000); // Extended to 3 seconds to show MT5 status
      }
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  return (
    <AuthCard>
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Successful!</h2>
              <p className="text-gray-500 text-sm">Redirecting you to your dashboard...</p>
            </motion.div>

            {/* MT5 Connection Status */}
            {showMt5Status && mt5Accounts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 space-y-2"
              >
                <p className="text-sm font-medium text-gray-700 mb-2">MT5 Account Status:</p>
                {mt5Accounts.map((account, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                      account.status === 'connected'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {account.status === 'connected' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-red-500" />
                      )}
                      <span className={account.status === 'connected' ? 'text-green-700' : 'text-red-700'}>
                        <span className="font-medium">MT5 #{account.account_number}</span>
                        {account.status === 'connected' ? ' - Connected' : ' - Failed'}
                      </span>
                    </div>
                    {account.status === 'connected' && account.balance && (
                      <span className="text-green-600 font-medium">
                        ${account.balance.toLocaleString()}
                      </span>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}

            <motion.div className="mt-6 mx-auto w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary-600"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              onClick={() => onNavigate?.('login')}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">Back to Login</span>
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 rounded-2xl mb-3">
                <span className="text-3xl">F</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Verify Your Identity</h1>
              <p className="text-gray-500 text-sm">
                We've sent a 6-digit code to{' '}
                <span className="text-primary-600 font-medium">{maskedEmail}</span>
              </p>
            </div>

            {error && (
              <div className="mb-4">
                <StatusMessage type="error" message={error} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <OTPInput
                length={6}
                value={otp}
                onChange={setOtp}
                error={null}
                disabled={isLoading}
              />

              <div className="text-center">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isResending}
                    className="text-sm text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
                  >
                    {isResending ? 'Sending...' : 'Resend verification code'}
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">
                    Resend code in{' '}
                    <span className="text-primary-600 font-medium">{formatTime(countdown)}</span>
                  </p>
                )}
              </div>

              <GradientButton type="submit" disabled={otp.length !== 6} loading={isLoading}>
                Verify & Login
              </GradientButton>
            </form>

            <p className="text-center text-gray-400 text-xs mt-5">
              Didn't receive the code? Check your spam folder or try resending.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthCard>
  );
};

export default OTPVerify;
