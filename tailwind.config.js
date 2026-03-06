/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060d1f',
          900: '#0f1b35',
          800: '#1a2847',
          700: '#243560',
          600: '#2e4278',
        },
        gold: {
          300: '#e8cc7a',
          400: '#d4aa4a',
          500: '#c9a84c',
          600: '#a8872e',
        },
        parchment: {
          50: '#faf8f3',
          100: '#f5f0e6',
          200: '#ece4d0',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Crimson Pro', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(201,168,76,0.7)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 16px rgba(201,168,76,0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(201,168,76,0)' },
        },
        'wave': {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
