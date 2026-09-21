/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cadastral: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        navy: {
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16'
        },
        brand: {
          blue: '#2563eb',
          cyan: '#06b6d4',
          teal: '#0d9488',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
