import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: {
    '@kinoo/ui': path.resolve(__dirname, 'packages/kinoo-ui/src/index.ts'),
    '@kinoo/tracking': path.resolve(__dirname, 'packages/tracking/src/index.ts'),
  } },
  test: { include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx', 'apps/**/*.test.ts', 'apps/**/*.test.tsx', 'backend/**/*.test.ts'], environment: 'jsdom', globals: false },
});
