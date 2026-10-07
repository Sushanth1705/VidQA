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
        brand: {
          dark: '#0b0f19',
          card: '#111827',
          cardBorder: '#1f2937',
          accent: '#2563eb',
          cyan: '#38bdf8',
          textMuted: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 25px -5px rgba(56, 189, 248, 0.25)',
        'card': '0 10px 30px rgba(0, 0, 0, 0.35)',
      }
    },
  },
  plugins: [],
}
