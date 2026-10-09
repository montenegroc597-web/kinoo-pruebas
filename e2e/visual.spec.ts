import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Capturas de cada pantalla en A y B → test-results/visual/. No afirman nada: son para revisarlas a ojo tras tocar estilos.
test.use({ viewport: { width: 1000, height: 1000 }, hasTouch: false, isMobile: false });
test('capturas A y B del catálogo', async ({ page }) => {
  const out = path.resolve('test-results/visual');
  fs.mkdirSync(out, { recursive: true });
  await page.goto('/?catalogo=1');
  await page.waitForTimeout(2500);
  const items = page.locator('[data-catalogo]');
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    const it = items.nth(i);
    const id = await it.getAttribute('data-catalogo');
    await it.locator('.kn-frame-root').screenshot({ path: path.join(out, `${id}.png`) });
  }
});
