import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F7F4EF',
        surface: '#FFFFFF',
        'surface-2': '#F0EDE7',
        'surface-3': '#E8E4DC',
        teal: {
          DEFAULT: '#1D9E75',
          light: '#E1F5EE',
          mid: '#9FE1CB',
          dark: '#085041',
        },
        coral: {
          DEFAULT: '#D85A30',
          light: '#FAECE7',
        },
        amber: {
          DEFAULT: '#BA7517',
          light: '#FAEEDA',
        },
        text: {
          primary: '#1C1A17',
          secondary: '#6B6660',
          tertiary: '#A09B96',
        },
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
      },
      width: {
        sidebar: '244px',
      },
      borderColor: {
        DEFAULT: 'rgba(0,0,0,0.09)',
        strong: 'rgba(0,0,0,0.17)',
      },
    },
  },
  plugins: [],
};

export default config;
