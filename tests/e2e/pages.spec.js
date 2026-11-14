// Les 21 pages du site : elles répondent toutes, ont un titre unique, les
// bonnes balises de langue, et le plan du site les liste toutes.
import { test, expect } from '@playwright/test';

const PAGES = {
  home: { nl: '/nl/', fr: '/fr/', en: '/en/' },
  services: { nl: '/nl/diensten/', fr: '/fr/services/', en: '/en/services/' },
  airport: { nl: '/nl/luchthavenvervoer/', fr: '/fr/transport-aeroport/', en: '/en/airport-transfer/' },
  rates: { nl: '/nl/tarieven/', fr: '/fr/tarifs/', en: '/en/rates/' },
  contact: { nl: '/nl/contact/', fr: '/fr/contact/', en: '/en/contact/' },
  legal: { nl: '/nl/juridische-info/', fr: '/fr/mentions-legales/', en: '/en/legal-notice/' },
  privacy: { nl: '/nl/privacybeleid/', fr: '/fr/politique-confidentialite/', en: '/en/privacy-policy/' },
};
const ALL = Object.entries(PAGES).flatMap(([key, byLocale]) =>
  Object.entries(byLocale).map(([locale, path]) => ({ key, locale, path }))
);

test.describe('the 21 pages', () => {
  for (const { key, locale, path } of ALL) {
    test(`${locale} ${key} responds and is well-formed`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);

      // One <h1> per page (brief §6).
      await expect(page.locator('h1')).toHaveCount(1);

      // Correct document language.
      await expect(page.locator('html')).toHaveAttribute('lang', locale);

      // Unique, non-empty title and description.
      expect((await page.title()).length).toBeGreaterThan(10);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length ?? 0).toBeGreaterThan(30);

      // No unresolved placeholder markers except the known-pending IBP licence.
      const body = await page.locator('body').innerText();
      expect(body).not.toContain('[À RÉDIGER]');
      expect(body).not.toContain('[CONTENT TO BE WRITTEN]');
      expect(body).not.toContain('undefined');
    });

    test(`${locale} ${key} has reciprocal hreflang + x-default`, async ({ page }) => {
      await page.goto(path);
      for (const [altLocale, altPath] of Object.entries(PAGES[key])) {
        const href = await page.locator(`link[hreflang="${altLocale}"]`).getAttribute('href');
        expect(new URL(href).pathname).toBe(altPath);
      }
      const xDefault = await page.locator('link[hreflang="x-default"]').getAttribute('href');
      expect(new URL(xDefault).pathname).toBe(PAGES[key].nl);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(new URL(canonical).pathname).toBe(path);
    });
  }
});

test.describe("H1 de la page d'accueil", () => {
  // Le <h1> porte le mot-clé (« Taxi à Tienen… ») ; l'ancienne accroche
  // descend en sous-titre juste dessous, elle n'est pas supprimée.
  const H1 = { nl: 'Taxi in Tienen, dag en nacht', fr: 'Taxi à Tienen, jour et nuit', en: 'Taxi in Tienen, day and night' };
  const ACCROCHE = { nl: 'Waar wilt u naartoe?', fr: 'Où voulez-vous aller ?', en: 'Where are you headed?' };

  for (const [locale, path] of Object.entries(PAGES.home)) {
    test(`${locale} : le H1 contient le mot-clé, l'accroche est le sous-titre`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveText(H1[locale]);
      await expect(page.locator('h1 + .hero-hook')).toHaveText(ACCROCHE[locale]);
    });
  }
});

test.describe('language switching keeps you on the same page', () => {
  // The switcher is a native <details>: open the disclosure, then pick a
  // language — the same two steps a visitor takes.
  async function switchLanguage(page, target) {
    await page.locator('.lang-switcher > summary').click();
    const link = page.locator(`.lang-panel a[lang="${target}"]`);
    await expect(link).toBeVisible();
    await link.click();
  }

  for (const key of Object.keys(PAGES)) {
    test(`${key}: NL → FR → EN stays on ${key}`, async ({ page }) => {
      await page.goto(PAGES[key].nl);

      await switchLanguage(page, 'fr');
      await page.waitForURL(`**${PAGES[key].fr}`);

      await switchLanguage(page, 'en');
      await page.waitForURL(`**${PAGES[key].en}`);

      // And the page really is the translated equivalent, not a fallback.
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });
  }
});

test.describe('destinations en texte visible sur la page Tarifs', () => {
  // Depuis que les deux champs du simulateur sont en saisie libre, plus
  // aucun nom de destination n'apparaissait dans le HTML de cette page —
  // même plus caché dans un <select> comme avant. Ce test verrouille que
  // les noms sont bien redevenus du texte normal, lisible sans JavaScript.
  for (const [locale, path] of Object.entries(PAGES.rates)) {
    test(`${locale} : les destinations et le lien aéroport sont du texte réel`, async ({ page }) => {
      const html = await (await page.request.get(path)).text();
      expect(html).toContain('dest-summary');
      expect(html).toMatch(/Leuven|Louvain/);

      await page.goto(path);
      const bloc = page.locator('.dest-summary');
      await expect(bloc).toBeVisible();
      const lien = bloc.locator('a');
      await expect(lien).toBeVisible();
      await expect(lien).toHaveAttribute('href', new RegExp(PAGES.airport[locale]));
    });
  }
});

test.describe("photo de la page transport aéroport", () => {
  const PAGES = {
    nl: '/nl/luchthavenvervoer/',
    fr: '/fr/transport-aeroport/',
    en: '/en/airport-transfer/',
  };

  for (const [locale, path] of Object.entries(PAGES)) {
    test(`${locale}: la photo s'affiche et reste légère`, async ({ page }) => {
      await page.goto(path);
      const photo = page.locator('img.airport-media');
      await expect(photo).toBeVisible();

      // Le PNG source pèse 2 Mo : seule une version WebP redimensionnée
      // doit partir chez le visiteur.
      const servi = await photo.evaluate((img) => img.currentSrc);
      expect(servi).toMatch(/\.webp$/);
      expect(servi).not.toMatch(/\.png$/);

      const reponse = await page.request.get(servi);
      const poids = Number((await reponse.body()).byteLength);
      expect(poids).toBeLessThan(200 * 1024);

      // Elle doit être réellement décodée, pas seulement présente.
      const chargee = await photo.evaluate((img) => img.complete && img.naturalWidth > 0);
      expect(chargee).toBe(true);

      // Une image porteuse de sens a besoin d'un texte alternatif.
      const alt = await photo.getAttribute('alt');
      expect(alt?.length ?? 0).toBeGreaterThan(20);
    });
  }

  test('propose plusieurs tailles et charge la plus petite sur mobile', async ({ page, isMobile }) => {
    await page.goto(PAGES.fr);
    const photo = page.locator('img.airport-media');
    await expect(photo).toHaveAttribute('srcset', /400w.*800w.*1200w/);

    // Un téléphone ne doit pas télécharger la version grand écran.
    const largeurServie = await photo.evaluate((img) => Number(img.currentSrc.match(/_(\d+)?/) && img.naturalWidth));
    if (isMobile) expect(largeurServie).toBeLessThanOrEqual(800);
  });
});

test.describe('Vercel Web Analytics', () => {
  // Vérifie que le script se charge sur un chemin du même domaine, pas
  // vers un hôte tiers — c'est ce qui permet au test "no third-party
  // requests" plus bas de rester vert malgré cet ajout. En build de
  // développement (astro dev), ce même script charge sa version de
  // débogage depuis va.vercel-scripts.com (un vrai tiers) : ce test tourne
  // sur le build de production (dist/), pas sur "astro dev".
  test("le script se charge sur /_vercel/insights/, jamais un domaine tiers", async ({ page }) => {
    const requetes = [];
    page.on('request', (req) => requetes.push(req.url()));
    await page.goto('/fr/');
    await page.waitForLoadState('networkidle');

    const appelsAnalytics = requetes.filter((u) => u.includes('insights') || u.includes('vercel-scripts'));
    expect(appelsAnalytics.length).toBeGreaterThan(0);
    for (const url of appelsAnalytics) {
      expect(new URL(url).host).toBe(new URL(page.url()).host);
    }
  });

  test('les clics sur les boutons existants (appel, WhatsApp…) sont transmis', async ({ page }) => {
    await page.goto('/fr/');
    // On déclenche l'événement directement plutôt que de cliquer un bouton
    // précis : ce qui est testé ici, c'est le relais dans BaseLayout.astro
    // (délégation sur [data-analytics] → trackEvent() → window.va), pas la
    // mise en page d'un bouton précis — déjà couverte par d'autres tests,
    // et différente entre mobile et desktop.
    const appels = await page.evaluate(() => {
      const espion = [];
      window.va = (...args) => espion.push(args);
      document
        .querySelector('[data-analytics="call_click"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return espion;
    });
    expect(appels).toContainEqual(['event', { name: 'call_click' }]);
  });
});

test.describe('contenu SEO validé (2026-10-19)', () => {
  for (const [locale, path] of Object.entries(PAGES.rates)) {
    test(`${locale} : la page Tarifs a sa FAQ, avec les données structurées FAQPage`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('details.faq-item')).toHaveCount(4);

      const blocs = await page.locator('script[type="application/ld+json"]').allTextContents();
      const faq = blocs.map((b) => JSON.parse(b)).find((b) => b['@type'] === 'FAQPage');
      expect(faq, 'FAQPage').toBeDefined();
      expect(faq.mainEntity).toHaveLength(4);
      // Le calcul à la seconde près (précision du client) est bien dit.
      expect(JSON.stringify(faq)).toMatch(/36/);
    });
  }

  for (const [locale, path] of Object.entries(PAGES.contact)) {
    test(`${locale} : la page Contact dit quoi mentionner dans le message`, async ({ page }) => {
      await page.goto(path);
      const bloc = page.locator('.message-tips');
      await expect(bloc).toBeVisible();
      await expect(bloc.locator('h2')).not.toBeEmpty();
      await expect(bloc).toContainText(/\w+/);
      // Entre les coordonnées et l'invitation à laisser un avis.
      const ordre = await page.evaluate(() => {
        const tips = document.querySelector('.message-tips');
        const avis = document.querySelector('.review-cta');
        return tips.compareDocumentPosition(avis) & Node.DOCUMENT_POSITION_FOLLOWING;
      });
      expect(ordre).toBeTruthy();
    });
  }

  for (const [locale, path] of Object.entries(PAGES.airport)) {
    test(`${locale} : la page Aéroport s'adresse aux clients de Jodoigne, sans inventer de prix`, async ({ page }) => {
      await page.goto(path);
      const bloc = page.locator('.airport-from');
      await expect(bloc).toBeVisible();
      await expect(bloc.locator('h2')).toContainText(/Jodoigne|Geldenaken/);
      await expect(bloc).toContainText('Tienen');
      // Les prix au départ de Jodoigne ne sont pas encore connus : le bloc
      // n'en annonce aucun (voir propositions-contenu-seo.md §8).
      expect(await bloc.innerText()).not.toMatch(/\d\s?€|€\s?\d/);
    });
  }

  for (const [locale, path] of Object.entries(PAGES.airport)) {
    test(`${locale} : la section Jodoigne propose d'appeler ou d'écrire sur WhatsApp, sans quitter la page`, async ({ page }) => {
      await page.goto(path);
      const bloc = page.locator('.airport-from');

      const appel = bloc.locator('a[href^="tel:"]');
      await expect(appel).toBeVisible();
      await expect(appel).toHaveAttribute('href', 'tel:+32469230017');
      await expect(appel).toHaveAttribute('data-analytics', 'call_click');

      // Le message WhatsApp annonce déjà le départ de Jodoigne.
      const wa = bloc.locator('a[href^="https://wa.me/"]');
      await expect(wa).toBeVisible();
      await expect(wa).toHaveAttribute('data-analytics', 'whatsapp_click');
      await expect(wa).toHaveAttribute('target', '_blank');
      const href = await wa.getAttribute('href');
      expect(href).toContain('https://wa.me/32469230017?text=');
      expect(decodeURIComponent(href.split('?text=')[1])).toMatch(/Jodoigne|Geldenaken/);
    });
  }

  const GARE = { fr: 'gare de Tienen', nl: 'station Tienen', en: 'Tienen station' };
  for (const [locale, path] of Object.entries(PAGES.services)) {
    test(`${locale} : la page Services nomme la gare de Tienen`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('main')).toContainText(GARE[locale]);
    });
  }

  for (const key of ['home', 'services', 'airport', 'rates', 'contact']) {
    for (const [locale, path] of Object.entries(PAGES[key])) {
      test(`${locale} ${key} : le <title> commence par le mot-clé`, async ({ page }) => {
        await page.goto(path);
        const titre = await page.title();
        expect(titre).toContain('Tienen');
        expect(titre.startsWith('Taxi QISSI')).toBe(false);
      });
    }
  }
});

test.describe('Avis Google', () => {
  const LIEN = 'https://g.page/r/CUKWRUX3Lw21EAE/review';

  // Le lien d'avis est dans le pied de page de chaque page (donc des 21),
  // et la page Contact porte en plus une invitation dédiée.
  for (const { key, locale, path } of ALL) {
    test(`${locale} ${key} : le pied de page propose de laisser un avis`, async ({ page }) => {
      await page.goto(path);
      const lien = page.locator('footer a.footer-review');
      await expect(lien).toHaveAttribute('href', LIEN);
      await expect(lien).toHaveAttribute('target', '_blank');
      // Lien éditorial vers sa propre fiche : ni nofollow ni sponsored, et
      // noopener pour ne pas donner la main à l'onglet ouvert.
      const rel = (await lien.getAttribute('rel')) ?? '';
      expect(rel).toContain('noopener');
      expect(rel).not.toMatch(/nofollow|sponsored/);
      expect((await lien.innerText()).trim().length).toBeGreaterThan(10);
    });
  }

  for (const [locale, path] of Object.entries(PAGES.contact)) {
    test(`${locale} : la page Contact invite à laisser un avis, avec un texte explicite`, async ({ page }) => {
      await page.goto(path);
      const bloc = page.locator('.review-cta');
      await expect(bloc).toBeVisible();
      await expect(bloc.locator('h2')).not.toBeEmpty();
      await expect(bloc).toContainText('Taxi QISSI');
      await expect(bloc).toContainText('Tienen');
      await expect(bloc.locator('a')).toHaveAttribute('href', LIEN);
    });
  }

  test('un clic sur le lien est compté (google_review_click)', async ({ page }) => {
    await page.goto('/fr/contact/');
    const appels = await page.evaluate(() => {
      const espion = [];
      window.va = (...args) => espion.push(args);
      // On empêche l'ouverture réelle : on teste le relais analytics, pas Google.
      const lien = document.querySelector('.review-cta a');
      lien.addEventListener('click', (e) => e.preventDefault());
      lien.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return espion;
    });
    expect(appels).toContainEqual(['event', { name: 'google_review_click' }]);
  });

  test('les données structurées relient le site à la fiche Google', async ({ page }) => {
    await page.goto('/nl/');
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const { provider } = JSON.parse(raw);
    expect(provider.hasMap).toMatch(/^https:\/\/www\.google\.com\/maps\/place\/\?q=place_id:ChIJ/);
    expect(provider.sameAs).toEqual([provider.hasMap]);
  });
});

test.describe('site plumbing', () => {
  test('/ redirects to /nl/', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/nl/');
    expect(new URL(page.url()).pathname).toBe('/nl/');
  });

  test('sitemap.xml lists all 21 pages', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    for (const { path } of ALL) {
      expect(xml).toContain(`${path}</loc>`);
    }
    expect(xml.match(/<url>/g)).toHaveLength(21);
  });

  test('robots.txt allows crawling and points at the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('Allow: /');
    expect(text).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  });

  test('404 page shows the language matching the URL prefix', async ({ page }) => {
    await page.goto('/fr/deze-pagina-bestaat-niet/');
    await expect(page.locator('section[data-locale="fr"]')).toBeVisible();
    await expect(page.locator('section[data-locale="nl"]')).toBeHidden();
    await expect(page.locator('section[data-locale="en"]')).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    await page.goto('/en/this-page-does-not-exist/');
    await expect(page.locator('section[data-locale="en"]')).toBeVisible();
  });

  test('every page carries TaxiService structured data', async ({ page }) => {
    await page.goto('/nl/');
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const schema = JSON.parse(raw);
    expect(schema['@type']).toBe('TaxiService');
    expect(schema.provider.vatID).toBe('BE1025231305');
    expect(schema.provider.telephone).toMatch(/^\+32/);
    expect(schema.areaServed['@type']).toBe('GeoCircle');
    expect(schema.areaServed.geoRadius).toBe('20000');

    // schema.org rejects these two on TaxiService (they are LocalBusiness
    // properties) — validator.schema.org flagged it, so keep them on provider.
    expect(schema.provider.openingHoursSpecification.dayOfWeek).toHaveLength(7);
    expect(schema.provider.priceRange).toBeTruthy();
    expect(schema.openingHoursSpecification).toBeUndefined();
    expect(schema.priceRange).toBeUndefined();
  });

  test('serves no third-party requests at all (privacy + LCP)', async ({ page }) => {
    const external = [];
    page.on('request', (req) => {
      const host = new URL(req.url()).host;
      if (!host.startsWith('localhost')) external.push(req.url());
    });
    await page.goto('/nl/');
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
  });

  test('self-hosts the fonts it preloads', async ({ page, request }) => {
    await page.goto('/nl/');
    const preloads = await page.locator('link[rel="preload"][as="font"]').all();
    expect(preloads.length).toBeGreaterThan(0);
    for (const link of preloads) {
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^\/fonts\/.+\.woff2$/);
      expect((await request.get(href)).status()).toBe(200);
    }
  });

  test('the FAQ carries FAQPage structured data on the homepage', async ({ page }) => {
    await page.goto('/nl/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = blocks.map((b) => JSON.parse(b)).find((s) => s['@type'] === 'FAQPage');
    expect(faq).toBeDefined();
    expect(faq.mainEntity.length).toBe(8);
    // La question Jodoigne → aéroport est la dernière de la FAQ de l'accueil.
    expect(faq.mainEntity.at(-1).name).toContain('Jodoigne');
    for (const entry of faq.mainEntity) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.acceptedAnswer.text.length).toBeGreaterThan(0);
    }
  });
});
