import { defineConfig, devices } from '@playwright/test';

// E2E runs against the real static build (`npm run build` + `astro preview`),
// not the dev server — that is what actually ships to the homelab.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list']],
  use: {
    baseURL: 'http://localhost:4322',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // Not `astro preview`: it daemonizes itself in some environments, which
    // Playwright reads as the server crashing. tests/static-server.mjs runs
    // in the foreground and mirrors the reverse-proxy behaviour we document
    // for production (directory indexes + 404.html fallback).
    command: 'npm run build && node tests/static-server.mjs 4322',
    url: 'http://localhost:4322/nl/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
