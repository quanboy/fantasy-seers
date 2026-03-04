/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:  '#1A3C5E',
          mid:   '#2E86C1',
          light: '#D6EAF8',
        }
      }
    }
  },
  plugins: []
}
