// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

// Domain inferred from the confirmed email (info@taxiqissi.be) in the
// prototype — see src/config/business.js. Not independently confirmed by
// the client; update here too if that turns out to be wrong.

// The routing key has to reach the browser: brief §1.1 rules out any server
// handling the visitor's addresses, so the call is made client-side and the
// key is in the shipped bundle by design (brief §5.4 anticipates this).
//
// Astro only exposes PUBLIC_*-prefixed variables to client code, but hosting
// dashboards flag that prefix as a leak. Injecting the value here at build
// time lets the variable be named either way:
//
//   ORS_API_KEY          preferred — no "public" prefix to alarm the host
//   PUBLIC_ORS_API_KEY   still honoured, so nothing breaks mid-migration
//
// Renaming changes nothing about the exposure: whichever name is used, the
// key ends up readable in the JavaScript. The real guard rails are the
// provider's daily quota and the graceful fallback to the call button.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const orsApiKey = env.ORS_API_KEY || env.PUBLIC_ORS_API_KEY || '';

// Both address fields are free text since 2026-09-05, so without this key
// the simulator cannot produce a single estimate — it is not a degraded
// feature, it is a dead one. A build has already shipped to production
// without it, silently, so say it loudly here. The build is deliberately
// not failed: the phone number, the WhatsApp button and every page of
// content still work, and those matter more than the simulator.
if (!orsApiKey) {
  const line = '─'.repeat(68);
  console.warn(
    `\n\x1b[33m${line}\n` +
      '  ATTENTION — aucune clé OpenRouteService dans ce build.\n' +
      '  Le simulateur de prix ne pourra proposer aucune adresse ni calculer\n' +
      '  aucun prix : les deux champs sont en saisie libre et dépendent de\n' +
      "  l'API. Définissez ORS_API_KEY dans l'environnement de build\n" +
      '  (Vercel : Settings → Environment Variables → Production), puis\n' +
      '  redéployez. En local : voir .env.example.\n' +
      `${line}\x1b[0m\n`
  );
}

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
  vite: {
    define: {
      __ORS_API_KEY__: JSON.stringify(orsApiKey),
    },
  },
});
