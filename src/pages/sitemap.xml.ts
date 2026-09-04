import type { APIRoute } from 'astro';
import { LOCALES, ROUTES, localePath } from '../i18n/routes.js';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://example.invalid');
  const pageKeys = Object.keys(ROUTES);

  const urls = pageKeys.flatMap((key) =>
    LOCALES.map((locale) => new URL(localePath(locale, key), base).toString())
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join('\n')}\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
