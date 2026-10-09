import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  timeout: 240_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    { command: 'node e2e/mock-backend.mjs', url: 'http://localhost:8787/__dump?hoja=Config', reuseExistingServer: true, timeout: 60_000 },
    {
      command: 'npm run dev -w @kinoo/prueba -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 90_000,
      env: { VITE_APPS_SCRIPT_URL: 'http://localhost:8787', VITE_WRITE_KEY: 'W', VITE_RONDA: '1' },
    },
    {
      command: 'npm run dev -w @kinoo/panel -- --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: true,
      timeout: 90_000,
      env: { VITE_APPS_SCRIPT_URL: 'http://localhost:8787' },
    },
  ],
});
