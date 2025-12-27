import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const StatusMessage = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  animate = true,
  className = '',
}) => {
  const types = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-500',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-500',
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-500',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-500',
    },
  };

  const config = types[type];
  const Icon = config.icon;

  const content = (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${config.bgColor} ${config.borderColor} ${className}`}>
      {showIcon && (
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          <Icon size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`font-semibold ${config.textColor} mb-1`}>
            {title}
          </p>
        )}
        <p className={`text-sm ${config.textColor}`}>
          {message}
        </p>
      </div>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

export default StatusMessage;
