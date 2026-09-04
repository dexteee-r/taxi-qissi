import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://example.invalid');
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', base).toString()}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
