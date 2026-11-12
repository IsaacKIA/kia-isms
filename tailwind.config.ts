import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kia: {
          navy: '#0B1F3A',
          blue: '#1E40AF',
          gold: '#D97706',
          amber: '#F59E0B',
          slate: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
};

export default config;
