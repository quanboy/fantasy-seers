/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        void: {
          950: '#F8FAFC',
          900: '#FFFFFF',
          800: '#F1F5F9',
          700: '#E2E8F0',
          600: '#CBD5E1',
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
        'gradient-shift': 'gradientShift 8s ease infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 1.8s linear infinite',
        'live-pulse': 'livePulse 1.4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(79, 70, 229, 0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(79, 70, 229, 0.15)' },
        },
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
        'oracle': '0 0 30px rgba(79, 70, 229, 0.1)',
        'oracle-lg': '0 0 60px rgba(79, 70, 229, 0.15)',
        'gold': '0 0 20px rgba(249, 115, 22, 0.12)',
        'win': '0 0 20px rgba(34, 197, 94, 0.1)',
        'loss': '0 0 20px rgba(239, 68, 68, 0.1)',
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'modal': '0 24px 80px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
}
