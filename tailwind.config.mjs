/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#FAF7EB',
          100: '#F3ECCC',
          200: '#E4D08A',
          300: '#D4BC6B',
          DEFAULT: '#B39D4D',
          500: '#9A8740',
          600: '#8C7A38',
          700: '#6B5D2A',
          800: '#4A4120',
          900: '#2D2714',
        },
        forest: {
          50:  '#EEF3F1',
          100: '#D4E3DD',
          200: '#A8C5B9',
          300: '#7CA896',
          DEFAULT: '#2D4A3E',
          500: '#264030',
          600: '#1E3328',
          700: '#172620',
          800: '#0F1A16',
          900: '#0A130F',
          950: '#050A08',
        },
        cream: '#FAF7F0',
        stone: {
          light: '#EDE5D0',
          DEFAULT: '#D4C9A8',
          dark:  '#B5A882',
        },
        ink: {
          light: '#8C8C7A',
          muted: '#5C5C50',
          DEFAULT: '#2A2A22',
          dark:  '#1A1A17',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.5' }],   // 13px — smallest body/UI text
        sm: ['0.9375rem', { lineHeight: '1.75' }],  // 15px — normal body text
        base: ['0.9375rem', { lineHeight: '1.75' }], // 15px — same as sm
      },
      letterSpacing: {
        caption: '0.18em',
        wide:    '0.08em',
        wider:   '0.14em',
      },
      animation: {
        'fade-up':   'fadeUp 0.9s ease-out forwards',
        'fade-in':   'fadeIn 0.7s ease-out forwards',
        'line-grow': 'lineGrow 1s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        lineGrow: {
          '0%':   { width: '0' },
          '100%': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
};
