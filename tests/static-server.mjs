// Minimal foreground static server for the E2E suite.
//
// `astro preview` daemonizes itself in some environments, which Playwright's
// webServer reads as a crash — so tests serve dist/ themselves. This also
// doubles as an executable spec of what the reverse proxy must do in
// production: directory indexes, and dist/404.html for anything unmatched
// (see README.md "Hébergement").
//
//   node tests/static-server.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../dist/', import.meta.url));
const PORT = Number(process.argv[2] ?? 4322);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

async function resolve(pathname) {
  // Block traversal outside dist/.
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(ROOT, safe);
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
    await stat(filePath);
    return filePath;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  const filePath = await resolve(pathname);

  if (filePath) {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
    return;
  }

  // Unmatched route → the translated 404 page, whatever the language prefix.
  try {
    const notFound = await readFile(join(ROOT, '404.html'));
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    res.end(notFound);
  } catch {
    res.writeHead(404, { 'Content-Type': TYPES['.txt'] });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Serving dist/ on http://localhost:${PORT}`);
});
