import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e7f3ff',
          100: '#b3d7ff',
          200: '#80bbff',
          300: '#4d9fff',
          400: '#1a83ff',
          500: '#0969da',
          600: '#0854b3',
          700: '#063f8c',
          800: '#042b66',
          900: '#02163f',
        },
        nav: {
          bg: '#161b22',
          border: '#30363d',
          link: '#c9d1d9',
          'link-hover': '#58a6ff',
          'link-active': '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        md: '6px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
