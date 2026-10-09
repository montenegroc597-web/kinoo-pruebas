import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [react()],
  resolve: {
    alias: {
      '@kinoo/ui': path.resolve(root, 'packages/kinoo-ui/src/index.ts'),
      '@kinoo/tracking': path.resolve(root, 'packages/tracking/src/index.ts'),
    },
  },
  server: { host: true, port: 5173 },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 900 },
});
