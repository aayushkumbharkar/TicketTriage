/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        tt: {
          bg: '#0F1117',         // app background
          surface: '#1A1D27',    // cards, panels
          sidebar: '#13151f',    // sidebar
          input: '#0F1117',      // inputs, textareas
          border: '#1e2235',     // all borders
          accent: '#6C63FF',     // primary CTA, active nav, left-border accents
          accentFaint: 'rgba(108,99,255,0.12)',
          primary: '#E8E9F0',    // text primary
          secondary: '#c8cad8',  // text secondary
          muted: '#7B7F96',      // text muted
          ghost: '#3d4060',      // text ghost
          
          // Priority Colors
          pHighBg: 'rgba(226,75,74,0.12)',
          pHighText: '#f09595',
          pHighBorder: '#E24B4A',
          
          pMedBg: 'rgba(186,117,23,0.12)',
          pMedText: '#FAC775',
          pMedBorder: '#BA7517',
          
          pLowBg: 'rgba(29,158,117,0.12)',
          pLowText: '#5DCAA5',
          pLowBorder: '#1D9E75',
          
          // Category Colors
          cBugBg: 'rgba(108,99,255,0.12)',
          cBugText: '#a09df7',
          cBugBorder: '#6C63FF',
          
          cBillBg: 'rgba(212,83,126,0.12)',
          cBillText: '#ED93B1',
          cBillBorder: '#D4537E',
          
          cFeatBg: 'rgba(55,138,221,0.12)',
          cFeatText: '#85B7EB',
          cFeatBorder: '#378ADD',
          
          cGenBg: 'rgba(136,135,128,0.12)',
          cGenText: '#B4B2A9',
          cGenBorder: '#888780',
        }
      },
    },
  },
  plugins: [],
}
