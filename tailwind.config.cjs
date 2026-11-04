/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(.94)', opacity: '.4' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        floatIn: 'floatIn .5s ease-out both',
        pop: 'pop .25s ease-out both',
      },
    },
  },
  plugins: [],
};
