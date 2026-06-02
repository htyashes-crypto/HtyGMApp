/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0E1013',
        sidebar: '#13161C',
        titlebar: '#15181E',
        card: '#1A1E25',
        card2: '#20252E',
        field: '#0E1013',
        borderc: '#262B34',
        borderSoft: '#20252E',
        brand: '#2DD4A7',
        brandInk: '#06231B',
        ink1: '#ECEEF2',
        ink2: '#9BA4B3',
        ink3: '#626B7A',
        err: '#FF5C72'
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
