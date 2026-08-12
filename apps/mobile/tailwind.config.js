/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ink is the crisp slate dark blue used for body copy and headings.
        ink: '#0f172a',
        primary: {
          DEFAULT: '#2563eb',
          soft: '#eff6ff',
          deep: '#042a7d',
        },
        cyan: { DEFAULT: '#15aabf' },
        grass: { DEFAULT: '#40c057' },
        surface: '#e6eef6',
        divider: '#d3d3d3',
        hair: '#e3e3e3',
        muted: '#6c757d',
        quiet: '#555555',
        slate900: '#1f2937',
      },
      boxShadow: {
        bar: '0px 4px 6px rgba(0, 0, 0, 0.1)',
        card: '0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
