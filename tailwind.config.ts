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
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
export default config
