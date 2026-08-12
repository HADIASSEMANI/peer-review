import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * react-native-web + Vite.
 *
 *  - `react-native` is aliased to `react-native-web`, so screens are written
 *    with View/Text/Pressable and can move to a real Expo target later.
 *  - NativeWind's JSX runtime turns `className` into RN styles; the Tailwind
 *    CSS itself is produced by postcss (see postcss.config.js).
 *  - `.web.tsx` resolves first, matching React Native's platform extensions.
 */
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
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.web.js', '.jsx', '.js', '.json'],
  },
  define: {
    global: 'window',
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
  optimizeDeps: {
    include: ['react-native-web'],
    esbuildOptions: { resolveExtensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.ts', '.tsx'] },
  },
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: true },
});
