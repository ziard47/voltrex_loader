/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#140f0f',
          900: '#1D1616', // Base background
          850: '#261e1e',
          800: '#322525',
          700: '#423232',
          600: '#5c4646'
        },
        brand: {
          crimson: '#8E1616', // Dark red
          red: '#D84040',     // Vivid red
          light: '#EEEEEE',   // Off-white text
          muted: '#b8a5a5'
        }
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true
  }
}
