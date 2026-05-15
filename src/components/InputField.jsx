import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

const InputField = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  success,
  icon: Icon,
  disabled = false,
  required = false,
  autoComplete,
  name,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getBorderClass = () => {
    if (error) return 'border-red-500/50 focus:border-red-500';
    if (success) return 'border-emerald-500/50 focus:border-emerald-500';
    return 'border-white/8 focus:border-emerald-500';
  };

  const getFocusShadow = () => {
    if (error) return 'focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]';
    if (success) return 'focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]';
    return 'focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]';
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            error ? 'text-red-400' : success ? 'text-emerald-400' : isFocused ? 'text-emerald-400' : 'text-gray-500'
          }`}>
            <Icon size={18} />
          </div>
        )}

        <motion.input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          className={`
            w-full border rounded-xl px-4 py-3
            text-sm text-gray-100 placeholder-gray-500
            transition-all duration-200
            focus:outline-none
            ${Icon ? 'pl-10' : ''}
            ${getBorderClass()}
            ${getFocusShadow()}
            ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
          `}
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
            >
              <Check size={18} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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

export default InputField;
