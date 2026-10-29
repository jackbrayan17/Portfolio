/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './academy/index.html', './cv/index.html', './script.js', './chatbot.js'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#080d16',
          800: '#0b1220',
          700: '#121a2b',
          600: '#1a2338',
          500: '#232c44',
        },
        gold: {
          50: '#f0fbff',
          100: '#dff6ff',
          200: '#baeaff',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
        },
        cream: {
          50: '#fbfaf5',
          100: '#f5f1e6',
          200: '#e9e2ce',
          300: '#ccc4a9',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
