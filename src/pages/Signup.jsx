import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mail, User, ArrowLeft } from 'lucide-react';
import {
  AuthCard,
  InputField,
  PasswordField,
  GradientButton,
  StatusMessage,
  MT5CredentialsModal,
} from '../components';
import api from '../services/api';

const Signup = ({ onNavigate, onSignupSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showMT5Modal, setShowMT5Modal] = useState(false);
  const [mt5Error, setMt5Error] = useState('');

  const validateName = (name, fieldName) => {
    if (!name) return `${fieldName} is required`;
    if (name.length < 2) return `${fieldName} must be at least 2 characters`;
    if (!/^[a-zA-Z\s]+$/.test(name)) return `${fieldName} can only contain letters`;
    return null;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email';
    return null;
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    return null;
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== password) return 'Passwords do not match';
    return null;
  };

  const isFormValid = useMemo(() => {
    return (
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.password &&
      formData.confirmPassword &&
      !validateName(formData.firstName, 'First name') &&
      !validateName(formData.lastName, 'Last name') &&
      !validateEmail(formData.email) &&
      !validatePassword(formData.password) &&
      !validateConfirmPassword(formData.confirmPassword, formData.password)
    );
  }, [formData]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
    if (field === 'password' && errors.confirmPassword) {
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
      case 'firstName':
        error = validateName(formData.firstName, 'First name');
        break;
      case 'lastName':
        error = validateName(formData.lastName, 'Last name');
        break;
      case 'email':
        error = validateEmail(formData.email);
        break;
      case 'password':
        error = validatePassword(formData.password);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.confirmPassword, formData.password);
        break;
    }
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {
      firstName: validateName(formData.firstName, 'First name'),
      lastName: validateName(formData.lastName, 'Last name'),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.confirmPassword, formData.password),
    };

    const hasErrors = Object.values(newErrors).some((error) => error !== null);
    if (hasErrors) {
      setErrors(newErrors);
      setTouched({
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        confirmPassword: true,
      });
      return;
    }

    // Show MT5 credentials modal
    setApiError('');
    setShowMT5Modal(true);
  };

  const handleMT5Submit = async (mt5Credentials) => {
    setIsLoading(true);
    setMt5Error('');
    setApiError('');

    try {
      const response = await api.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        ...mt5Credentials,
      });

      if (response.success) {
        // Registration successful - navigate to pending approval
        setShowMT5Modal(false);
        onSignupSuccess?.(formData.email);
      }
    } catch (error) {
      setMt5Error(error.message || 'MT5 validation failed. Please check your credentials.');
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
        <button
          type="button"
          onClick={() => onNavigate?.('login')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Login</span>
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 rounded-2xl mb-3">
            <span className="text-3xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-gray-500 text-sm">Join us and start your journey</p>
        </div>

        {apiError && (
          <div className="mb-4">
            <StatusMessage type="error" message={apiError} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="First Name"
              type="text"
              name="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              onBlur={handleBlur('firstName')}
              error={touched.firstName && errors.firstName}
              success={touched.firstName && formData.firstName && !errors.firstName}
              icon={User}
              autoComplete="given-name"
              required
            />
            <InputField
              label="Last Name"
              type="text"
              name="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              onBlur={handleBlur('lastName')}
              error={touched.lastName && errors.lastName}
              success={touched.lastName && formData.lastName && !errors.lastName}
              autoComplete="family-name"
              required
            />
          </div>

          <InputField
            label="Email"
            type="email"
            name="email"
            placeholder="john@example.com"
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
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            error={touched.password && errors.password}
            showStrength={true}
            autoComplete="new-password"
            required
          />

          <PasswordField
            label="Confirm Password"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            onBlur={handleBlur('confirmPassword')}
            error={touched.confirmPassword && errors.confirmPassword}
            autoComplete="new-password"
            required
          />

          <div className="pt-1">
            <GradientButton type="submit" disabled={!isFormValid}>
              Continue to MT5 Setup
            </GradientButton>
          </div>
        </form>

        <p className="text-center text-gray-400 text-xs mt-4">
          By creating an account, you agree to our{' '}
          <button className="text-primary-600 hover:text-primary-700 transition-colors">
            Terms of Service
          </button>{' '}
          and{' '}
          <button className="text-primary-600 hover:text-primary-700 transition-colors">
            Privacy Policy
          </button>
        </p>

        <div className="text-center mt-4">
          <p className="text-gray-500 text-sm">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('login')}
              className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Sign In
            </button>
          </p>
        </div>
      </motion.div>

      <MT5CredentialsModal
        isOpen={showMT5Modal}
        onClose={() => !isLoading && setShowMT5Modal(false)}
        onSubmit={handleMT5Submit}
        isLoading={isLoading}
        error={mt5Error}
      />
    </AuthCard>
  );
};

export default Signup;
