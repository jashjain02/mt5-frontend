import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock } from 'lucide-react';

const PasswordField = ({
  label,
  placeholder = 'Enter password',
  value,
  onChange,
  onBlur,
  error,
  showStrength = false,
  disabled = false,
  required = false,
  autoComplete,
  name,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const strength = useMemo(() => {
    if (!value || !showStrength) return null;

    let score = 0;
    const checks = {
      length: value.length >= 8,
      lowercase: /[a-z]/.test(value),
      uppercase: /[A-Z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    };

    score = Object.values(checks).filter(Boolean).length;

    if (score <= 2) return { level: 'weak', label: 'Weak', color: 'bg-red-500', width: '33%' };
    if (score <= 3) return { level: 'medium', label: 'Medium', color: 'bg-yellow-500', width: '66%' };
    return { level: 'strong', label: 'Strong', color: 'bg-green-500', width: '100%' };
  }, [value, showStrength]);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
          error ? 'text-red-400' : isFocused ? 'text-primary-500' : 'text-gray-400'
        }`}>
          <Lock size={18} />
        </div>

        <motion.input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          className={`
            w-full bg-white border rounded-xl pl-10 pr-10 py-3
            text-sm text-gray-900 placeholder-gray-400
            transition-all duration-200
            focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]
            ${error ? 'border-red-300 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : 'border-gray-300'}
            ${disabled ? 'bg-gray-50 opacity-60 cursor-not-allowed' : ''}
          `}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {showStrength && value && strength && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: strength.width }}
                transition={{ duration: 0.3 }}
                className={`h-full ${strength.color} rounded-full`}
              />
            </div>
            <p className={`text-xs ${
              strength.level === 'weak' ? 'text-red-500' :
              strength.level === 'medium' ? 'text-yellow-600' :
              'text-green-500'
            }`}>
              Password strength: {strength.label}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PasswordField;
