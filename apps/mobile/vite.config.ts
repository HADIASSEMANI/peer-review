import { fileURLToPath } from 'node:url';
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
  // The monorepo keeps one .env at the root; without this Vite would only look
  // in apps/mobile and VITE_API_URL would silently be undefined.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [
    react({
      babel: {
        plugins: [
          [
            '@babel/plugin-transform-react-jsx',
            { runtime: 'automatic', importSource: 'nativewind' },
          ],
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      // Workspace packages resolve to their SOURCE, not their build output.
      // Going through node_modules/@repo/* made Vite treat them as ordinary
      // dependencies: it cached the transform behind a ?v= hash and stopped
      // watching them, so every change to a shared schema needed a rebuild AND
      // a cache wipe, and a missed one surfaced as "does not provide an export
      // named X" on a blank page. Pointing at src makes them first-class
      // source files that hot-reload like anything under app/src.
      '@repo/types': fileURLToPath(new URL('../../packages/types/src/index.ts', import.meta.url)),
      '@repo/api-client': fileURLToPath(
        new URL('../../packages/api-client/src/index.ts', import.meta.url),
      ),
    },
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.tsx',
      '.ts',
      '.web.jsx',
      '.web.js',
      '.jsx',
      '.js',
      '.json',
    ],
    preserveSymlinks: true,
  },
  define: {
    global: 'window',
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
  optimizeDeps: {
    include: ['react-native-web'],
    esbuildOptions: { resolveExtensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.ts', '.tsx'] },
    // Redundant now that the aliases above keep @repo/* out of node_modules
    // entirely, but harmless — and it still applies if an import form ever
    // slips past the alias.
    exclude: ['@repo/types', '@repo/api-client'],
  },
  server: {
    port: 5173,
    // The aliases point outside apps/mobile. Vite normally infers the
    // workspace root, but stating it means a serving-not-allowed error can
    // never masquerade as a resolution failure.
    fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] },
  },
  build: { outDir: 'dist', sourcemap: true },
});
