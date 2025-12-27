import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, Send } from 'lucide-react';
import {
  AuthCard,
  InputField,
  GradientButton,
  StatusMessage,
} from '../components';
import api from '../services/api';

const ForgotPassword = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email';
    return null;
  };

  const isFormValid = useMemo(() => {
    return email && !validateEmail(email);
  }, [email]);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
    if (apiError) setApiError('');
  };

  const handleBlur = () => {
    setTouched(true);
    const emailError = validateEmail(email);
    if (emailError) setError(emailError);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      setTouched(true);
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      const response = await api.forgotPassword(email);

      if (response.success) {
        setIsSuccess(true);
      }
    } catch (err) {
      setApiError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setApiError('');

    try {
      await api.forgotPassword(email);
    } catch (err) {
      setApiError(err.message || 'Failed to resend. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard>
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center"
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-500 text-sm mb-1">Password reset link has been sent to</p>
              <p className="text-primary-600 font-medium">{email}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 p-5 bg-gray-50 rounded-xl border border-gray-200"
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="flex justify-center mb-2"
              >
                <Send className="w-8 h-8 text-primary-500" />
              </motion.div>
              <p className="text-gray-500 text-sm">The link will expire in 24 hours</p>
            </motion.div>

            {apiError && (
              <div className="mt-4">
                <StatusMessage type="error" message={apiError} />
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 space-y-3"
            >
              <GradientButton onClick={() => onNavigate?.('login')}>
                Back to Login
              </GradientButton>
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="text-sm text-gray-500 hover:text-primary-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : "Didn't receive it? Resend email"}
              </button>
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
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot Password?</h1>
              <p className="text-gray-500 text-sm">
                No worries! Enter your email and we'll send you a reset link.
              </p>
            </div>

            {apiError && (
              <div className="mb-4">
                <StatusMessage type="error" message={apiError} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <InputField
                label="Email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched && error}
                success={touched && email && !error}
                icon={Mail}
                autoComplete="email"
                required
              />

              <GradientButton type="submit" disabled={!isFormValid} loading={isLoading}>
                Send Reset Link
              </GradientButton>
            </form>

            <p className="text-center text-gray-400 text-xs mt-5">
              Remember your password?{' '}
              <button
                onClick={() => onNavigate?.('login')}
                className="text-primary-600 hover:text-primary-700 transition-colors"
              >
                Sign in
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthCard>
  );
};

export default ForgotPassword;
