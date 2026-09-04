// @ts-check
import { defineConfig } from 'astro/config';

// Domain inferred from the confirmed email (info@taxiqissi.be) in the
// prototype — see src/config/business.js. Not independently confirmed by
// the client; update here too if that turns out to be wrong.
export default defineConfig({
  site: 'https://taxiqissi.be',
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
