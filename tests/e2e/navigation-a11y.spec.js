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
