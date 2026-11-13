const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: c('ink'), paper: c('paper'), surface: c('surface'), line: c('line'), muted: c('muted'),
        brand: { DEFAULT: c('brand'), dark: c('brand-dark'), soft: c('brand-soft') },
        accent: { DEFAULT: c('accent'), soft: c('accent-soft') },
        amber: { DEFAULT: c('amber'), soft: c('amber-soft') },
        danger: { DEFAULT: c('danger'), soft: c('danger-soft') },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        display: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 10px 30px -10px rgb(var(--brand) / 0.65)',
        lift: '0 14px 36px -16px rgb(var(--brand) / 0.55)',
      },
    },
  },
  plugins: [],
};
