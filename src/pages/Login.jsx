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

      if (response.access_token) {
        api.setToken(response.access_token);
        if (response.user) api.setUser(response.user);
        onLoginSuccess?.(formData.email, response.dev_otp || null);
      } else if (response.requires_otp || response.success) {
        onLoginSuccess?.(formData.email, response.dev_otp || null);
      } else {
        setApiError('Unexpected response from server. Please try again.');
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
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Welcome Back</h1>
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
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          <GradientButton
            type="submit"
            disabled={!isFormValid}
            loading={isLoading}
            loadingText="Signing in..."
          >
            Continue
          </GradientButton>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 text-gray-500" style={{ background: 'transparent' }}>or</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('signup')}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
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
