/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        cinzel: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        void: {
          950: '#0C0F1A',
          900: '#121626',
          800: '#1A1F33',
          700: '#252B3F',
          600: '#3A4259',
        },
        oracle: {
          900: '#1E1B4B',
          800: '#272388',
          700: '#3730A3',
          600: '#4338CA',
          500: '#4F46E5',
          400: '#6366F1',
          300: '#818CF8',
          200: '#A5B4FC',
          100: '#E0E7FF',
        },
        gold: {
          600: '#EA580C',
          500: '#F97316',
          400: '#FB923C',
          300: '#FDBA74',
          200: '#FED7AA',
        },
        win: {
          900: '#052E16',
          700: '#15803D',
          500: '#22C55E',
          400: '#4ADE80',
          300: '#86EFAC',
        },
        loss: {
          900: '#450A0A',
          700: '#B91C1C',
          500: '#EF4444',
          400: '#FF6B6B',
        },
        live: '#F97316',
      },
      backgroundImage: {
        'oracle-gradient': 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 40%, #F8FAFC 100%)',
        'card-gradient': 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
        'oracle-shimmer': 'linear-gradient(90deg, transparent, rgba(99,102,241,0.06), transparent)',
        'win-gradient': 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
        'loss-gradient': 'linear-gradient(135deg, #FEF2F2, #FECACA)',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 1.8s linear infinite',
        'live-pulse': 'livePulse 1.4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-400px 0' },
          to: { backgroundPosition: '400px 0' },
        },
        livePulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.85)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.2)',
        'modal': '0 16px 48px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
