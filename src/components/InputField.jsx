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
    if (error) return 'border-red-300 focus:border-red-500';
    if (success) return 'border-green-300 focus:border-green-500';
    return 'border-gray-300 focus:border-primary-500';
  };

  const getFocusShadow = () => {
    if (error) return 'focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]';
    if (success) return 'focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)]';
    return 'focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]';
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            error ? 'text-red-400' : success ? 'text-green-500' : isFocused ? 'text-primary-500' : 'text-gray-400'
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
            w-full bg-white border rounded-xl px-4 py-3
            text-sm text-gray-900 placeholder-gray-400
            transition-all duration-200
            focus:outline-none
            ${Icon ? 'pl-10' : ''}
            ${getBorderClass()}
            ${getFocusShadow()}
            ${disabled ? 'bg-gray-50 opacity-60 cursor-not-allowed' : ''}
          `}
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
