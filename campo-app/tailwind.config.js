/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        campo: {
          bg1: '#0c4a44',
          bg2: '#0a3a3f',
          bg3: '#08272e',
          accent: '#27e2b0',
          green: '#1f9d57',
          red: '#d23b3b',
        },
        // Paleta do painel (print): azul-petróleo bem escuro + ciano
        night: {
          bg: '#080b12',
          panel: '#0b1019',
          card: '#0d131d',
          cyan: '#2fe3da',
        },
      },
    },
  },
  plugins: [],
}
