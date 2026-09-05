// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

// Configuration du site. Voir le GUIDE.md pour les modifications courantes.

// La clé OpenRouteService doit arriver jusqu'au navigateur : le site n'a pas
// de serveur pour l'utiliser à sa place. On l'insère donc dans le code au
// moment du build, ce qui permet de nommer la variable ORS_API_KEY sans le
// préfixe PUBLIC_ que les hébergeurs signalent comme une fuite.
//
// Le nom n'y change rien : la clé est lisible dans le JavaScript quoi qu'il
// arrive. La vraie protection est le quota journalier.
//
// process.env d'abord, fichier .env ensuite : sur un hébergeur la variable
// est dans l'environnement, et la lire directement évite toute ambiguïté.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const keySources = ['ORS_API_KEY', 'PUBLIC_ORS_API_KEY'];
const keyFrom = keySources.find((name) => (process.env[name] ?? env[name] ?? '').trim());
const orsApiKey = keyFrom ? (process.env[keyFrom] ?? env[keyFrom]).trim() : '';

// Sans cette clé, le simulateur ne peut produire aucune estimation. Un
// build est déjà parti en production sans elle, en silence : d'où ce
// message. On ne fait volontairement PAS échouer le build — le téléphone,
// WhatsApp et tout le contenu comptent plus que le simulateur.
//
// Le journal de build doit répondre tout seul à "la clé est-elle là ?" :
// sur un hébergeur, c'est la seule fenêtre sur ce que le build a vraiment
// vu. On n'affiche que des noms de variables, jamais leur valeur.
const line = '─'.repeat(68);
if (orsApiKey) {
  console.log(
    `\x1b[32m✓ Clé OpenRouteService trouvée via ${keyFrom} (${orsApiKey.length} caractères).\x1b[0m`
  );
} else {
  const seen = Object.keys(process.env)
    .filter((name) => /ors|route|api.?key/i.test(name))
    .sort();
  console.warn(
    `\n\x1b[33m${line}\n` +
      '  ATTENTION — aucune clé OpenRouteService dans ce build.\n' +
      '  Le simulateur de prix ne pourra proposer aucune adresse ni calculer\n' +
      '  aucun prix : les deux champs sont en saisie libre et dépendent de\n' +
      "  l'API. Définissez ORS_API_KEY dans l'environnement de build\n" +
      '  (Vercel : Settings → Environment Variables, en cochant Production),\n' +
      '  puis redéployez. En local : voir .env.example.\n' +
      '\n' +
      '  Variables ressemblantes vues par ce build :\n' +
      (seen.length ? seen.map((name) => `    - ${name}\n`).join('') : '    (aucune)\n') +
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
    // La racine du site renvoie vers le néerlandais, langue par défaut.
    '/': '/nl/',
  },
  vite: {
    define: {
      __ORS_API_KEY__: JSON.stringify(orsApiKey),
    },
  },
});
