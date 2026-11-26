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
        primary: {
          DEFAULT: '#0b1220',
          secondary: '#121b2b',
          tertiary: '#1d2a3f',
        },
        text: {
          primary: '#eef3fa',
          secondary: '#a8b6ca',
          muted: '#7b8ca6',
        },
        border: {
          DEFAULT: '#24334a',
          hover: '#365074',
        },
        success: {
          DEFAULT: '#35c98a',
          light: '#6ee7b7',
        },
        danger: {
          DEFAULT: '#f2636f',
          light: '#ff8f99',
        },
        warning: {
          DEFAULT: '#e8b45c',
          light: '#ffd27a',
        },
        info: {
          DEFAULT: '#5b9cff',
          light: '#8db8ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgb(0 0 0 / 0.4)',
        'soft-lg': '0 10px 15px -3px rgb(0 0 0 / 0.4)',
      },
    },
  },
  plugins: [],
}