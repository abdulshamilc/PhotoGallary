/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: '#FFF9F0',
          base: '#FFF9F0',
          light: '#FFFFFF',
          dark: '#F7EFE2',
        },
        champagne: {
          DEFAULT: '#F5E6CC',
          base: '#F5E6CC',
          light: '#FBF3E6',
          dark: '#E7D2B0',
        },
        gold: {
          DEFAULT: '#D4AF37',
          soft: '#D4AF37',
          light: '#E8C878',
          pale: '#F4E5BD',
          dark: '#B08D22',
        },
        burgundy: {
          DEFAULT: '#800020',
          deep: '#800020',
          wine: '#A52A2A',
          dark: '#5C0017',
          light: '#9E2A2B',
        },
        charcoal: {
          DEFAULT: '#2B2118',
          base: '#2B2118',
          deep: '#1A140E',
          light: '#423427',
        },
        warmGray: {
          DEFAULT: '#75675A',
          base: '#75675A',
          light: '#9C8E80',
          muted: '#C4B7A9',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'wedding': '0 10px 30px -10px rgba(128, 0, 32, 0.08), 0 4px 15px -5px rgba(212, 175, 55, 0.15)',
        'wedding-lg': '0 20px 45px -15px rgba(43, 33, 24, 0.1), 0 10px 25px -10px rgba(212, 175, 55, 0.2)',
        'gold-glow': '0 0 30px -5px rgba(212, 175, 55, 0.35)',
        'burgundy-glow': '0 0 30px -5px rgba(128, 0, 32, 0.3)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #E8C878 50%, #D4AF37 100%)',
        'burgundy-gradient': 'linear-gradient(135deg, #800020 0%, #A52A2A 100%)',
        'champagne-radial': 'radial-gradient(circle at center, #FFF9F0 0%, #F5E6CC 100%)',
      },
    },
  },
  plugins: [],
}
