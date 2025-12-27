import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import {
  AuthCard,
  InputField,
  PasswordField,
  GradientButton,
  StatusMessage,
} from '../components';
import api from '../services/api';

const Login = ({ onNavigate, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email';
    return null;
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const isFormValid = useMemo(() => {
    return (
      formData.email &&
      formData.password &&
      !validateEmail(formData.email) &&
      !validatePassword(formData.password)
    );
  }, [formData]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let error = null;
    if (field === 'email') error = validateEmail(formData.email);
    if (field === 'password') error = validatePassword(formData.password);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      setTouched({ email: true, password: true });
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      const response = await api.login(formData.email, formData.password);

      if (response.success && response.requires_otp) {
        // OTP required - navigate to OTP verification
        onLoginSuccess?.(formData.email);
      }
    } catch (error) {
      setApiError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 rounded-2xl mb-4">
            <span className="text-3xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Sign in to continue to your account</p>
        </div>

        {apiError && (
          <div className="mb-4">
            <StatusMessage type="error" message={apiError} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Email"
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            error={touched.email && errors.email}
            success={touched.email && formData.email && !errors.email}
            icon={Mail}
            autoComplete="email"
            required
          />

          <PasswordField
            label="Password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            error={touched.password && errors.password}
            autoComplete="current-password"
            required
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onNavigate?.('forgot-password')}
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          <GradientButton type="submit" disabled={!isFormValid} loading={isLoading}>
            Continue
          </GradientButton>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-400">or</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('signup')}
              className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Create Account
            </button>
          </p>
        </div>
      </motion.div>
    </AuthCard>
  );
};

export default Login;
