import { motion } from 'framer-motion';

const colorVariants = {
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  green: 'bg-green-50 border-green-200 text-green-900',
  purple: 'bg-purple-50 border-purple-200 text-purple-900',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  orange: 'bg-orange-50 border-orange-200 text-orange-900',
  red: 'bg-red-50 border-red-200 text-red-900',
  gray: 'bg-gray-50 border-gray-200 text-gray-900',
};

const DashboardMetricBox = ({ label, value, subtext, icon, color = 'blue' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${colorVariants[color]} border-2 rounded-xl p-6 transition-all hover:shadow-lg`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
    </motion.div>
  );
};

export default DashboardMetricBox;
