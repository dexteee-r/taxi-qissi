import { defineConfig } from 'vitest/config';

// Unit tests only. The Playwright specs under tests/e2e are run by
// `npm run test:e2e`; without this scope Vitest would also try to execute
// them and fail on @playwright/test's runner.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
  },
  // Astro injects this at build time (see astro.config.mjs); under the test
  // runner it is empty so the tests drive the key through import.meta.env.
  define: {
    __ORS_API_KEY__: '""',
  },
});
