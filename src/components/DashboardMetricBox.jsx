import { motion } from 'framer-motion';

const colorVariants = {
  blue:   'bg-accent/10 border-accent/20 text-text-base',
  green:  'bg-accent/10 border-accent/20 text-text-base',
  purple: 'bg-purple-500/10 border-purple-500/20 text-text-base',
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-text-base',
  yellow: 'bg-warning/10 border-warning/20 text-text-base',
  orange: 'bg-orange-500/10 border-orange-500/20 text-text-base',
  red:    'bg-negative/10 border-negative/20 text-text-base',
  gray:   'bg-white/[0.05] border-white/[0.08] text-text-base',
};

const DashboardMetricBox = ({ label, value, subtext, icon, color = 'blue' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${colorVariants[color]} border rounded-xl p-5 transition-all hover:shadow-card`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className="text-xl font-bold text-text-base">{value}</p>
      {subtext && <p className="text-xs text-text-muted mt-1">{subtext}</p>}
    </motion.div>
  );
};

export default DashboardMetricBox;
