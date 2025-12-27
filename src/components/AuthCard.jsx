import { motion } from 'framer-motion';

const AuthCard = ({ children, className = '' }) => {
  return (
    <div className="min-h-screen w-full flex items-start sm:items-center justify-center py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`w-full max-w-md ${className}`}
      >
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 sm:p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthCard;
