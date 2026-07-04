import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mavic: {
          pink: '#F8B4C8',
          'pink-light': '#FDE8EF',
          beige: '#F5EDD6',
          'beige-dark': '#E8D5B0',
          gold: '#C9A84C',
          black: '#1A1A1A',
        },
      },
      fontFamily: {
        poppins: ['var(--font-poppins)'],
      },
      keyframes: {
        'bell-shake': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '15%': { transform: 'rotate(14deg)' },
          '30%': { transform: 'rotate(-11deg)' },
          '45%': { transform: 'rotate(8deg)' },
          '60%': { transform: 'rotate(-5deg)' },
          '75%': { transform: 'rotate(3deg)' },
          '90%': { transform: 'rotate(-1deg)' },
        },
      },
      animation: {
        'bell-shake': 'bell-shake 0.6s ease-in-out 1',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
export default config
