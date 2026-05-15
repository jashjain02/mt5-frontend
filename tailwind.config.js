/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark navy base palette
        navy: {
          950: '#050912',
          900: '#0a0f1a',
          800: '#0d1421',
          700: '#111827',
          600: '#1a2235',
          500: '#243050',
        },
        // Emerald accent (primary)
        accent: {
          DEFAULT: '#10b981',
          50:  'rgba(16,185,129,0.05)',
          100: 'rgba(16,185,129,0.10)',
          200: 'rgba(16,185,129,0.20)',
          300: 'rgba(16,185,129,0.30)',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        positive: '#10b981',
        negative: '#ef4444',
        warning:  '#f59e0b',
        // Text system
        'text-base':  '#f9fafb',
        'text-muted': '#6b7280',
        'text-dim':   '#374151',
      },
      boxShadow: {
        'accent-sm': '0 0 10px rgba(16,185,129,0.20)',
        'accent-md': '0 0 20px rgba(16,185,129,0.25), 0 0 40px rgba(16,185,129,0.10)',
        'accent-lg': '0 0 30px rgba(16,185,129,0.35), 0 0 60px rgba(16,185,129,0.15)',
        'card':      '0 4px 24px rgba(0,0,0,0.30)',
        'card-hover':'0 8px 32px rgba(0,0,0,0.40)',
        'inner-glow':'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'spin-slow':  'spin 1s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(16,185,129,0.2)' },
          '50%':      { boxShadow: '0 0 20px rgba(16,185,129,0.4)' },
        },
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
