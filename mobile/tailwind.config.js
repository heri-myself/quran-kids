/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#7C6FF1',
        'primary-dark': '#5B52D4',
        'primary-light': '#A89DF5',
        'primary-bg': '#EEF0FF',
        surface: '#F4F4FF',
        'card-bg': '#FFFFFF',
        'text-main': '#1A1A2E',
        'text-sub': '#6B6B8A',
        accent: '#FF6B6B',
        gold: '#FFB830',
      },
    },
  },
  plugins: [],
}
