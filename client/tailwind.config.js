/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  corePlugins: {
    // Keep existing global CSS (landing, dashboards, heatmap) unchanged.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        mcgill: {
          red: '#E31429',
          redDark: '#b01020',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        nav: '0 1px 0 #e4e4e4',
      },
    },
  },
  plugins: [],
};
