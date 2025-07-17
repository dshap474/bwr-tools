/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/charts/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // BWR brand colors
        bwr: {
          background: '#1A1A1A',
          primary: '#5637cd',
          text: '#ededed',
          subtitle: '#adb0b5',
          grid: 'rgb(38, 38, 38)',
        },
        // Extended color palette
        primary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          DEFAULT: '#5637cd',
        },
        // Dark theme surface colors
        surface: {
          1: '#1A1A1A',
          2: '#262626',
          3: '#333333',
        },
        // Text colors
        text: {
          primary: '#ededed',
          secondary: '#adb0b5',
          tertiary: '#808080',
          disabled: '#4d4d4d',
        },
        // Border colors
        border: {
          DEFAULT: 'rgb(38, 38, 38)',
          light: 'rgba(255, 255, 255, 0.1)',
          strong: 'rgba(255, 255, 255, 0.2)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Monaco', 'Consolas', 'monospace'],
      },
      // BWR font sizes moved to plot-specific CSS modules to prevent UI conflicts
      spacing: {
        // BWR plot margins
        'bwr-left': '120px',
        'bwr-right': '70px',
        'bwr-top': '150px',
        'bwr-bottom': '120px',
      },
      screens: {
        'bwr': '1920px', // BWR standard plot width
      },
      height: {
        'bwr': '1080px', // BWR standard plot height
      },
      width: {
        'bwr': '1920px', // BWR standard plot width
      },
      backgroundImage: {
        // Temporarily disabled all background images
        // 'grid-white': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.05)'%3e%3cpath d='m0 .5h32m-32 32v-32'/%3e%3c/svg%3e")`,
        // 'grid-black': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(0 0 0 / 0.05)'%3e%3cpath d='m0 .5h32m-32 32v-32'/%3e%3c/svg%3e")`,
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out', 
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-purple': 'pulsePurple 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulsePurple: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(139, 92, 246, 0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(139, 92, 246, 0)' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};