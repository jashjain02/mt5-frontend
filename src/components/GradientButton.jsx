import { motion } from 'framer-motion';
import Loader from './Loader';

const GradientButton = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  variant = 'primary',
  fullWidth = true,
  className = '',
}) => {
  const isDisabled = disabled || loading;

  const baseStyles = 'font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl text-sm sm:text-base transition-all duration-200';

  const variantConfig = {
    primary: {
      className: `${baseStyles} font-semibold`,
      style: { backgroundColor: '#10b981', color: '#0a0f1a', boxShadow: '0 0 12px rgba(16,185,129,0.25)' },
      hoverStyle: { backgroundColor: '#059669', boxShadow: '0 0 24px rgba(16,185,129,0.40)' },
    },
    secondary: {
      className: `${baseStyles} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`,
      style: {},
      hoverStyle: {},
    },
    ghost: {
      className: 'font-medium py-2 px-3 sm:px-4 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200',
      style: {},
      hoverStyle: {},
    },
  };

  const config = variantConfig[variant] || variantConfig.primary;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${config.className}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      style={config.style}
      whileHover={isDisabled ? {} : { scale: 1.01, ...config.hoverStyle }}
      whileTap={isDisabled ? {} : { scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <span className="flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader size="sm" color="#0a0f1a" />
            {loadingText}
          </>
        ) : children}
      </span>
    </motion.button>
  );
};

export default GradientButton;
