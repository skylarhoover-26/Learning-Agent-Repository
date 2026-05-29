/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EBF1FF',
          100: '#D6E3FF',
          200: '#ABD5FF',
          300: '#7DBFFF',
          400: '#3580FF',
          500: '#0055FF',
          600: '#0044CC',
          700: '#0033AA',
          800: '#002288',
          900: '#0A2443',
          DEFAULT: '#0055FF',
        },
        cta: {
          50:  '#FFFAEB',
          100: '#FFF3CC',
          200: '#FFE499',
          300: '#FFD666',
          400: '#FFC633',
          500: '#FFB706',
          600: '#E6A300',
          700: '#B37F00',
          DEFAULT: '#FFB706',
        },
        ink: {
          DEFAULT: '#0A2443',
          light: '#1F3D6B',
        },
        bg: {
          DEFAULT: '#FFFFFF',
          subtle: '#ECEFF1',
          warm: '#FAFBFC',
        },
        classic: {
          DEFAULT: '#2196F3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(10 36 67 / 0.06), 0 1px 2px -1px rgb(10 36 67 / 0.04)',
        'card-hover': '0 4px 12px -2px rgb(10 36 67 / 0.08), 0 2px 4px -2px rgb(10 36 67 / 0.04)',
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
