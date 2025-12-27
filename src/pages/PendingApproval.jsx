import { motion } from 'framer-motion';
import { Clock, ArrowLeft, Mail } from 'lucide-react';
import { AuthCard, GradientButton } from '../components';

const PendingApproval = ({ email = 'user@example.com', onNavigate }) => {
  return (
    <AuthCard>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <motion.div
          className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-5 relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-yellow-300"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Clock className="w-10 h-10 text-yellow-600" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
            Your account has been created and is pending admin approval.
            We'll notify you once your account is activated.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200"
        >
          <div className="flex items-center justify-center gap-2">
            <Mail className="w-5 h-5 text-primary-500" />
            <span className="text-gray-600 text-sm">Confirmation will be sent to</span>
          </div>
          <p className="text-primary-600 font-medium mt-1">{email}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-left"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-3">What happens next?</h3>
          <ul className="space-y-3">
            {[
              'Our team will review your application',
              "You'll receive an email once approved",
              'Then you can login and access your dashboard',
            ].map((item, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center text-xs font-semibold text-primary-600">
                  {index + 1}
                </span>
                <span className="text-gray-600 text-sm">{item}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6"
        >
          <GradientButton variant="secondary" onClick={() => onNavigate?.('login')}>
            <ArrowLeft size={16} />
            Back to Login
          </GradientButton>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-gray-400 text-xs mt-5"
        >
          Have questions?{' '}
          <button className="text-primary-600 hover:text-primary-700 transition-colors">
            Contact Support
          </button>
        </motion.p>
      </motion.div>
    </AuthCard>
  );
};

export default PendingApproval;
