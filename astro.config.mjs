// @ts-check
import { defineConfig } from 'astro/config';

// Site URL is a placeholder until the domain is reserved (CDC §9 / brief §1.2).
// Update once BUSINESS.domain in src/config/business.js is confirmed.
export default defineConfig({
  site: 'https://example.invalid',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  redirects: {
    // Static-build fallback (meta refresh). For a real HTTP 301, also
    // configure the reverse proxy — see README.md "Hosting notes".
    '/': '/nl/',
  },
});
