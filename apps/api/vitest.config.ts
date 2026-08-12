import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Matches both `*.spec.ts` unit files and `*.e2e-spec.ts` integration files.
    include: ['test/**/*.spec.ts', 'test/**/*.e2e-spec.ts', 'src/**/*.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',
  },
  // SWC handles the decorator metadata Nest relies on.
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
