import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic', importSource: 'nativewind' }],
        ],
      },
    }),
  ],
  resolve: {
    alias: { 'react-native': 'react-native-web' },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  define: { global: 'window', __DEV__: 'true' },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
