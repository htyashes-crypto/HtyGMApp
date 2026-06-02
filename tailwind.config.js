/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        sidebar: 'rgb(var(--c-sidebar) / <alpha-value>)',
        titlebar: 'rgb(var(--c-titlebar) / <alpha-value>)',
        card: 'rgb(var(--c-card) / <alpha-value>)',
        card2: 'rgb(var(--c-card2) / <alpha-value>)',
        field: 'rgb(var(--c-field) / <alpha-value>)',
        borderc: 'rgb(var(--c-borderc) / <alpha-value>)',
        borderSoft: 'rgb(var(--c-borderSoft) / <alpha-value>)',
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        brandInk: 'rgb(var(--c-brandInk) / <alpha-value>)',
        ink1: 'rgb(var(--c-ink1) / <alpha-value>)',
        ink2: 'rgb(var(--c-ink2) / <alpha-value>)',
        ink3: 'rgb(var(--c-ink3) / <alpha-value>)',
        err: 'rgb(var(--c-err) / <alpha-value>)'
      },
      fontFamily: {
        ui: ['"Segoe UI"', '"Microsoft YaHei"', '"PingFang SC"', 'sans-serif'],
        mono: ['Consolas', 'Menlo', 'monospace']
      },
      fontSize: {
        '2xs': '11px',
        '3xs': '10px'
      }
    }
  },
  plugins: []
}
