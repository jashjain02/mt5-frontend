import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const OTPInput = ({ length = 6, value, onChange, error, disabled = false }) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (value !== undefined) {
      const otpArray = value.split('').slice(0, length);
      while (otpArray.length < length) otpArray.push('');
      setOtp(otpArray);
    }
  }, [value, length]);

  const handleChange = (e, index) => {
    const inputValue = e.target.value;

    if (inputValue.length > 1) {
      const pastedValue = inputValue.slice(0, length - index);
      const newOtp = [...otp];
      for (let i = 0; i < pastedValue.length; i++) {
        if (/^\d$/.test(pastedValue[i])) {
          newOtp[index + i] = pastedValue[i];
        }
      }
      setOtp(newOtp);
      onChange?.(newOtp.join(''));
      const nextIndex = Math.min(index + pastedValue.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (inputValue && !/^\d$/.test(inputValue)) return;

    const newOtp = [...otp];
    newOtp[index] = inputValue;
    setOtp(newOtp);
    onChange?.(newOtp.join(''));

    if (inputValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
    inputRefs.current[index]?.select();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 sm:gap-3 justify-center">
        {otp.map((digit, index) => (
          <motion.input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={length}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={() => handleFocus(index)}
            onBlur={() => setFocusedIndex(-1)}
            disabled={disabled}
            className={`
              w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-semibold
              bg-white border rounded-xl
              text-gray-900
              transition-all duration-200
              focus:outline-none
              ${disabled ? 'bg-gray-50 opacity-60 cursor-not-allowed' : ''}
              ${error
                ? 'border-red-300 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                : focusedIndex === index
                  ? 'border-primary-500 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
                  : digit
                    ? 'border-primary-400'
                    : 'border-gray-300'
              }
            `}
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
          />
        ))}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-500 text-center"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default OTPInput;
