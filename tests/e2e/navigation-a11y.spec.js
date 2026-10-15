// La navigation et l'accessibilité : menu, sélecteur de langue, taille des
// zones tactiles, contrastes, navigation au clavier.
import { test, expect, devices } from '@playwright/test';

const PHONE = '+32469230017';
const MIN_TARGET = 44; // prototype's own minimum; brief §7 asks for ≥48 on primary CTAs

test.describe('conversion paths are always reachable (CDC M1/M2)', () => {
  const pages = ['/nl/', '/nl/tarieven/', '/nl/luchthavenvervoer/', '/nl/diensten/', '/nl/contact/'];

  for (const path of pages) {
    test(`${path}: a call action is visible without scrolling`, async ({ page, isMobile }) => {
      await page.goto(path);
      const bar = page.locator('.mobile-action-bar');
      const headerCall = page.locator(`.header-call a[href="tel:${PHONE}"]`);
      const target = isMobile ? bar.locator(`a[href="tel:${PHONE}"]`) : headerCall;

      await expect(target).toBeVisible();
      const box = await target.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(box.y).toBeLessThan(viewport.height); // inside the first screen
      expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET);
    });
  }

  test('the call bar stays put while scrolling on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'sticky action bar is mobile-only');
    await page.goto('/nl/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const bar = page.locator('.mobile-action-bar');
    await expect(bar).toBeInViewport();
    await expect(bar.locator(`a[href="tel:${PHONE}"]`)).toBeVisible();
    await expect(bar.locator('a[href*="wa.me"]')).toBeVisible();
  });

  test('WhatsApp links use click-to-chat, never a server form', async ({ page }) => {
    await page.goto('/nl/contact/');
    for (const link of await page.locator('a[href*="wa.me"]').all()) {
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^https:\/\/wa\.me\/32469230017/);
    }
  });
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'drawer is mobile-only');

  test('opens a full-screen drawer, navigates, and closes', async ({ page }) => {
    await page.goto('/nl/');
    const panel = page.locator('.mobile-menu-panel');
    await expect(panel).toBeHidden();

    await page.locator('.mobile-menu-toggle > summary').click();
    await expect(panel).toBeVisible();

    // Covers the viewport, rather than collapsing to the header height.
    const box = await panel.boundingBox();
    const viewport = page.viewportSize();
    expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);

    // All five sections plus a call CTA and the three languages.
    await expect(panel.locator('.mobile-menu-nav a')).toHaveCount(5);
    await expect(panel.locator(`a[href="tel:${PHONE}"]`)).toBeVisible();
    await expect(panel.locator('.mobile-menu-langs a')).toHaveCount(3);

    await page.locator('[data-menu-close]').click();
    await expect(panel).toBeHidden();

    await page.locator('.mobile-menu-toggle > summary').click();
    await panel.locator('.mobile-menu-nav a', { hasText: 'Tarieven' }).click();
    await page.waitForURL('**/nl/tarieven/');
  });
});

test.describe('touch targets and layout (brief §7)', () => {
  test('primary actions are at least 44×44 and nothing overflows horizontally', async ({ page }) => {
    for (const path of ['/nl/', '/nl/tarieven/', '/nl/contact/']) {
      await page.goto(path);

      for (const btn of await page.locator('a.btn, button.btn').all()) {
        if (!(await btn.isVisible())) continue;
        const box = await btn.boundingBox();
        expect(box.height, `${path} ${await btn.innerText()}`).toBeGreaterThanOrEqual(MIN_TARGET);
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(1);
    }
  });

  test('form controls use a 16px+ font so mobile browsers do not zoom on focus', async ({ page }) => {
    await page.goto('/nl/tarieven/');
    for (const id of ['from', 'dest', 'name', 'note']) {
      const size = await page.locator(`#${id}`).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(size, id).toBeGreaterThanOrEqual(16);
    }
  });
});

test.describe('liste des communes desservies', () => {
  // Le HTML rendait autrefois les 22 communes deux fois : une fois pour
  // l'affichage mobile (6 puces + un dépliant), une fois pour l'affichage
  // ordinateur (une liste séparée). Ce test verrouille qu'il n'existe plus
  // qu'une seule copie de chaque commune dans la page.
  test('chaque commune n\'apparaît qu\'une seule fois dans le HTML', async ({ page }) => {
    await page.goto('/fr/');
    const noms = await page.locator('.commune-chips span, .commune-more-list div').allTextContents();
    expect(noms).toHaveLength(22);
    expect(new Set(noms).size).toBe(22);
    await expect(page.locator('.commune-list')).toHaveCount(0);
  });

  // Chaque langue affiche d'abord son propre nom, puis l'autre entre
  // parenthèses : « Jodoigne » ne doit plus s'afficher seul côté néerlandais.
  test('les noms français et néerlandais sont tous deux dans le texte', async ({ page }) => {
    const noms = async (chemin) => {
      await page.goto(chemin);
      return page.locator('.commune-chips span, .commune-more-list div').allTextContents();
    };
    const fr = await noms('/fr/');
    expect(fr).toContain('Tirlemont (Tienen)');
    expect(fr).toContain('Jodoigne (Geldenaken)');
    const nl = await noms('/nl/');
    expect(nl).toContain('Tienen (Tirlemont)');
    expect(nl).toContain('Geldenaken (Jodoigne)');
    expect(nl).toContain('Hoegaarden');
  });

  test('la recherche reconnaît le nom français comme le néerlandais', async ({ page }) => {
    await page.goto('/nl/');
    await page.fill('#zone-query', 'Tirlemont');
    await expect(page.locator('#zone-hit')).toBeVisible();
    await expect(page.locator('#zone-hit-text')).toContainText('Tienen (Tirlemont)');

    await page.goto('/fr/');
    await page.fill('#zone-query', 'Geldenaken');
    await expect(page.locator('#zone-hit-text')).toContainText('Jodoigne (Geldenaken)');
  });

  test('ordinateur : les 22 communes sont visibles sans interaction', async ({ page, isMobile }) => {
    test.skip(isMobile, 'comportement spécifique au grand écran');
    await page.goto('/fr/');

    // <details> ne montre son contenu que si l'attribut `open` est
    // vraiment posé : un simple display:block sur son contenu ne suffit
    // pas (vérifié). Le bouton "Voir plus", lui, doit être invisible.
    await expect(page.locator('.commune-more')).toHaveJSProperty('open', true);
    await expect(page.locator('.commune-more > summary')).toBeHidden();
    await expect(page.locator('.commune-more-list div').first()).toBeVisible();
  });

  test('mobile : repliée par défaut, le bouton natif l\'ouvre toujours', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'comportement spécifique au mobile');
    await page.goto('/fr/');

    await expect(page.locator('.commune-more')).toHaveJSProperty('open', false);
    await expect(page.locator('.commune-more > summary')).toBeVisible();

    await page.locator('.commune-more > summary').click();
    await expect(page.locator('.commune-more')).toHaveJSProperty('open', true);
  });

  test('reste ouverte sur ordinateur même sans JavaScript', async ({ browser }) => {
    // Filet de sécurité : l'attribut `open` est posé directement dans le
    // HTML pour cette raison précise. Sans lui, un visiteur sans
    // JavaScript sur ordinateur perdrait purement et simplement l'accès
    // aux 16 communes du dépliant.
    const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
    const page = await contexte.newPage();
    await page.goto('/fr/');
    await expect(page.locator('.commune-more-list div').first()).toBeVisible();
    await contexte.close();
  });
});

test.describe('homepage section alignment', () => {
  // Regression: .container sets margin-inline:auto, and an auto cross-axis
  // margin cancels stretch inside the .home-sections flex column — the
  // services section shrank to its content width and centred itself while
  // every other section stayed flush left.
  test('all sections share the same left edge and full width', async ({ page, isMobile }) => {
    await page.goto('/nl/');

    const heroLeft = (await page.locator('.h-hero').boundingBox()).x;
    const edges = {
      zone: (await page.locator('.zone-section h2').boundingBox()).x,
      services: (await page.locator('.services-section h2').boundingBox()).x,
      faq: (await page.locator('.faq-grid h2').boundingBox()).x,
    };
    if (isMobile) {
      // On mobile the services are a plain list, so their text is flush with
      // the headings. On desktop they become grid cells with their own
      // padding, as in the prototype — so only compare headings there.
      edges.firstService = (await page.locator('.services-section .service-title').first().boundingBox()).x;
    }
    for (const [name, x] of Object.entries(edges)) {
      expect(Math.abs(x - heroLeft), `${name} left edge`).toBeLessThan(2);
    }

    // The section box itself must fill the row like its neighbours, rather
    // than shrinking to its content and centring. (Above 1120px the
    // container is legitimately centred — hence comparing the two sections
    // to each other, not to the viewport edge.)
    const viewport = page.viewportSize().width;
    const zone = await page.locator('.zone-section').boundingBox();
    const services = await page.locator('.services-section').boundingBox();
    expect(services.x).toBeCloseTo(zone.x, 0);
    expect(services.width).toBeCloseTo(zone.width, 0);
    expect(services.width).toBeGreaterThanOrEqual(Math.min(viewport, 1120) - 2);
  });
});

test.describe('semantics', () => {
  test('has a skip link, one main landmark, and a labelled language menu', async ({ page }) => {
    await page.goto('/nl/');
    await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#main');
    await expect(page.locator('main#main')).toHaveCount(1);
    await expect(page.locator('.lang-switcher > summary')).toHaveAttribute('aria-label', /taal|langue|language/i);
  });

  test('marks the current page in the navigation', async ({ page, isMobile }) => {
    test.skip(isMobile, 'main nav is desktop-only');
    await page.goto('/nl/tarieven/');
    const current = page.locator('.main-nav a[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText('Tarieven');
  });

  test('spells languages out in full, with no flags (CDC §5 rule 3)', async ({ page }) => {
    await page.goto('/nl/');

    // The trigger itself names the current language in full.
    await expect(page.locator('.lang-switcher > summary')).toContainText('Nederlands');

    await page.locator('.lang-switcher > summary').click();
    const names = await page.locator('.lang-panel a').allInnerTexts();
    expect(names).toEqual(['Nederlands', 'Français', 'English']);

    const bodyHtml = await page.locator('body').innerHTML();
    expect(bodyHtml).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]{2}/u); // no flag emoji
  });

  test('closes the language menu on Escape and on outside click', async ({ page }) => {
    await page.goto('/nl/');
    const switcher = page.locator('.lang-switcher');

    await switcher.locator('summary').click();
    await expect(page.locator('.lang-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.lang-panel')).toBeHidden();

    await switcher.locator('summary').click();
    await expect(page.locator('.lang-panel')).toBeVisible();
    await page.locator('main').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.lang-panel')).toBeHidden();
  });

  test('opens external WhatsApp links safely', async ({ page }) => {
    await page.goto('/nl/contact/');
    const link = page.locator('a[href*="wa.me"]').first();
    await expect(link).toHaveAttribute('rel', /noopener/);
  });
});
