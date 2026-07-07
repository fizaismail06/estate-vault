/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Estate Vault palette: near-black slate base, muted gold accent (amanah/trust feel)
        vault: {
          bg: '#0f1115',
          surface: '#161a21',
          surfaceAlt: '#1d222b',
          border: '#262c37',
          text: '#e8eaed',
          muted: '#8a92a3',
          gold: '#c9a24b',
          goldDim: '#8a7135',
          danger: '#c1554a',
          safe: '#4a9b6e'
        }
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
};
