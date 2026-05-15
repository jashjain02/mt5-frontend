import { motion } from 'framer-motion';

const SIZES = {
  sm: { box: 'w-4 h-4', border: 2 },
  md: { box: 'w-6 h-6', border: 2 },
  lg: { box: 'w-8 h-8', border: 3 },
};

const Loader = ({ size = 'md', color = 'currentColor', className = '' }) => {
  const { box, border } = SIZES[size] || SIZES.md;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        className={`${box} rounded-full`}
        style={{
          border: `${border}px solid rgba(255,255,255,0.25)`,
          borderTopColor: color === 'currentColor' ? 'currentColor' : color,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
};

export default Loader;
