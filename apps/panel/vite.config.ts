import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [react()],
  // packages/kinoo-ui/public/kino = prototipo Kino (versión B de la prueba de marca), servido en <base>/kino/
  publicDir: path.resolve(root, 'packages/kinoo-ui/public'),
  resolve: {
    alias: {
      '@kinoo/ui': path.resolve(root, 'packages/kinoo-ui/src/index.ts'),
      '@kinoo/tracking': path.resolve(root, 'packages/tracking/src/index.ts'),
    },
  },
  server: { host: true, port: 5174 },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1500 },
});
