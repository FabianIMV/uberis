/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#020b18',
          900: '#040f1e',
          800: '#071628',
          700: '#0a2040',
          600: '#0e3060',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%':   { 'box-shadow': '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { 'box-shadow': '0 0 15px currentColor, 0 0 30px currentColor, 0 0 45px currentColor' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
