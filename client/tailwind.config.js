/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        elderly: {
          green: '#15803d',
          amber: '#b45309',
          red: '#b91c1c',
          blue: '#1d4ed8',
          bg: '#f8fafc',
          card: '#ffffff',
        }
      },
      fontSize: {
        'elderly-base': '1.25rem', // 20px
        'elderly-lg': '1.5rem',   // 24px
        'elderly-xl': '1.875rem', // 30px
        'elderly-2xl': '2.25rem', // 36px
        'elderly-3xl': '3rem',    // 48px
      },
      minHeight: {
        'btn': '64px',
      }
    },
  },
  plugins: [],
}

