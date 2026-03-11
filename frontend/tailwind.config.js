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
          950: '#07080F',
          900: '#0E1018',
          800: '#161825',
          700: '#1E2235',
          600: '#272B42',
        },
        oracle: {
          900: '#2E1065',
          800: '#3B0764',
          700: '#4C1D95',
          600: '#5B21B6',
          500: '#7C3AED',
          400: '#8B5CF6',
          300: '#A78BFA',
          200: '#C4B5FD',
          100: '#EDE9FE',
        },
        gold: {
          600: '#D97706',
          500: '#F59E0B',
          400: '#FBBF24',
          300: '#FCD34D',
          200: '#FDE68A',
        },
        win: {
          900: '#064E3B',
          700: '#065F46',
          500: '#10B981',
          400: '#34D399',
          300: '#6EE7B7',
        },
        loss: {
          900: '#450A0A',
          700: '#7F1D1D',
          500: '#EF4444',
          400: '#F87171',
        },
        live: '#F97316',
      },
      backgroundImage: {
        'oracle-gradient': 'linear-gradient(135deg, #07080F 0%, #0E0818 40%, #0A0B12 100%)',
        'card-gradient': 'linear-gradient(145deg, #161825 0%, #0E1018 100%)',
        'oracle-shimmer': 'linear-gradient(90deg, transparent, rgba(139,92,246,0.08), transparent)',
        'win-gradient': 'linear-gradient(135deg, #064E3B, #065F46)',
        'loss-gradient': 'linear-gradient(135deg, #450A0A, #7F1D1D)',
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
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(124, 58, 237, 0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(124, 58, 237, 0.35)' },
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
        'oracle': '0 0 30px rgba(124, 58, 237, 0.2)',
        'oracle-lg': '0 0 60px rgba(124, 58, 237, 0.3)',
        'gold': '0 0 20px rgba(245, 158, 11, 0.25)',
        'win': '0 0 20px rgba(16, 185, 129, 0.2)',
        'loss': '0 0 20px rgba(239, 68, 68, 0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'modal': '0 24px 80px rgba(0,0,0,0.7)',
      },
    },
  },
  plugins: [],
}
