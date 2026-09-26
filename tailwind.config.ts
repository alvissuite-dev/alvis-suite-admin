import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Enhanced Alvis Suite dark luxury palette with signature brand tones
        charcoal: {
          950: '#0a0908',
          900: '#12100e',
          800: '#1a1714',
          700: '#24201c',
          600: '#2e2924',
          500: '#3d3630',
          400: '#5a5048',
          300: '#7a6f65',
          200: '#a09589',
          100: '#c8bfb5',
          50:  '#f0ece7',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light:   '#e2c87a',
          dark:    '#9a7a2e',
          muted:   '#8a6d35',
          pale:    '#f5e9c8',
        },
        crimson: {
          DEFAULT: '#841A35', // Exact brand wine/crimson tone
          dark:    '#621227',
          light:   '#A82245',
        },
        ivory: {
          DEFAULT: '#FFF8EF', // Brand's warm cream accent
          muted:   '#E6DCD3',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'luxury-gradient': 'linear-gradient(135deg, #12100e 0%, #1a1714 50%, #24201c 100%)',
        'brand-gradient': 'linear-gradient(135deg, #841A35 0%, #12100e 100%)',
      },
      boxShadow: {
        'gold':    '0 0 30px rgba(201,168,76,0.15)',
        'gold-sm': '0 0 12px rgba(201,168,76,0.1)',
        'dark':    '0 8px 32px rgba(0,0,0,0.4)',
        'dark-lg': '0 20px 60px rgba(0,0,0,0.6)',
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'shimmer':    'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}

export default config