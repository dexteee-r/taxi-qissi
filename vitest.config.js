import { defineConfig } from 'vitest/config';

// Unit tests only. The Playwright specs under tests/e2e are run by
// `npm run test:e2e`; without this scope Vitest would also try to execute
// them and fail on @playwright/test's runner.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
  },
});
