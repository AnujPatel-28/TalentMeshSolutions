import type { Config } from 'tailwindcss';

const config: Config = {
  // The site is light-only (see the token set in app/globals.css). Tailwind v3
  // defaults to `media`, which would fire MotionAccordion's `dark:` variants
  // from the visitor's OS setting and render a dark accordion inside an
  // otherwise white page. Nothing in the app ever sets a `.dark` class, so
  // `class` makes those variants inert.
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007BFF',
        'deep-navy': '#000000',
        'light-ice': '#F0F7FF',
      },
      fontFamily: {
        inter: ['var(--font-inter)', 'sans-serif'],
        jakarta: ['var(--font-jakarta)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;
