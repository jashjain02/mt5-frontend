import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import {
  AuthCard,
  PasswordField,
  GradientButton,
  StatusMessage,
} from '../components';
import api from '../services/api';

const ChangePassword = ({ onNavigate, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState(null);

  const validateCurrentPassword = (password) => {
    if (!password) return 'Current password is required';
    return null;
  };

  const validateNewPassword = (password) => {
    if (!password) return 'New password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-z]/.test(password)) return 'Must contain a lowercase letter';
    if (!/[A-Z]/.test(password)) return 'Must contain an uppercase letter';
    if (!/[0-9]/.test(password)) return 'Must contain a number';
    if (password === formData.currentPassword) return 'New password must be different';
    return null;
  };

  const validateConfirmPassword = (confirmPassword) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== formData.newPassword) return 'Passwords do not match';
    return null;
  };

  const isFormValid = useMemo(() => {
    return (
      formData.currentPassword &&
      formData.newPassword &&
      formData.confirmPassword &&
      !validateCurrentPassword(formData.currentPassword) &&
      !validateNewPassword(formData.newPassword) &&
      !validateConfirmPassword(formData.confirmPassword)
    );
  }, [formData]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
    if (field === 'newPassword' && errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: null }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let error = null;
    switch (field) {
      case 'currentPassword':
        error = validateCurrentPassword(formData.currentPassword);
        break;
      case 'newPassword':
        error = validateNewPassword(formData.newPassword);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.confirmPassword);
        break;
    }
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {
      currentPassword: validateCurrentPassword(formData.currentPassword),
      newPassword: validateNewPassword(formData.newPassword),
      confirmPassword: validateConfirmPassword(formData.confirmPassword),
    };

    const hasErrors = Object.values(newErrors).some((error) => error !== null);
    if (hasErrors) {
      setErrors(newErrors);
      setTouched({
        currentPassword: true,
        newPassword: true,
        confirmPassword: true,
      });
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      const response = await api.changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      if (response.success) {
        // Clear auth data since user needs to login again
        api.clearAuth();

        setIsSuccess(true);
        setToast({
          type: 'success',
          message: 'Your password has been updated successfully!',
        });
        setTimeout(() => setToast(null), 5000);
      }
    } catch (err) {
      if (err.message.toLowerCase().includes('current password')) {
        setErrors({ currentPassword: err.message });
      } else {
        setApiError(err.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <StatusMessage type={toast.type} message={toast.message} animate={false} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5"
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h2>
              <p className="text-gray-500 text-sm">Your password has been changed successfully.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-3"
            >
              <Shield className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <p className="text-blue-700 text-xs text-left">
                For security, you need to sign in again with your new password.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6"
            >
              <GradientButton onClick={() => onNavigate?.('login')}>
                Sign In
              </GradientButton>
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
              onClick={() => onNavigate?.('dashboard')}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">Back</span>
            </button>

            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 rounded-2xl mb-3">
                <span className="text-3xl">F</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Change Password</h1>
              <p className="text-gray-500 text-sm">Create a new password for your account</p>
            </div>

            {apiError && (
              <div className="mb-4">
                <StatusMessage type="error" message={apiError} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <PasswordField
                label="Current Password"
                name="currentPassword"
                placeholder="Enter current password"
                value={formData.currentPassword}
                onChange={handleChange('currentPassword')}
                onBlur={handleBlur('currentPassword')}
                error={touched.currentPassword && errors.currentPassword}
                autoComplete="current-password"
                required
              />

              <PasswordField
                label="New Password"
                name="newPassword"
                placeholder="Enter new password"
                value={formData.newPassword}
                onChange={handleChange('newPassword')}
                onBlur={handleBlur('newPassword')}
                error={touched.newPassword && errors.newPassword}
                showStrength={true}
                autoComplete="new-password"
                required
              />

              <PasswordField
                label="Confirm New Password"
                name="confirmPassword"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
                error={touched.confirmPassword && errors.confirmPassword}
                autoComplete="new-password"
                required
              />

              <div className="text-xs text-gray-500 space-y-0.5">
                <p>Password must contain:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li className={formData.newPassword.length >= 8 ? 'text-green-600' : ''}>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                    One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                    One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                    One number
                  </li>
                </ul>
              </div>

              <div className="pt-1">
                <GradientButton type="submit" disabled={!isFormValid} loading={isLoading}>
                  Update Password
                </GradientButton>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthCard>
  );
};

export default ChangePassword;
