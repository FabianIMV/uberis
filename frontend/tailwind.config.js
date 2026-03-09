/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deep: {
          900: '#030712',
          800: '#0a0f1e',
          700: '#0f172a',
        },
        biolum: {
          blue: '#38bdf8',
          cyan: '#06b6d4',
          teal: '#0d9488',
          green: '#10b981',
          purple: '#a855f7',
          pink: '#ec4899',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          'from': { boxShadow: '0 0 5px #06b6d4, 0 0 10px #06b6d4' },
          'to': { boxShadow: '0 0 20px #06b6d4, 0 0 40px #0d9488' },
        }
      }
    },
  },
  plugins: [],
}
