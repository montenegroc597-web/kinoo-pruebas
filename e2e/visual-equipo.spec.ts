import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { click } from './helpers';

// Capturas del modo equipo (menú y cinta). No afirman nada.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test('capturas del modo equipo', async ({ page }) => {
  const out = path.resolve('test-results/visual');
  fs.mkdirSync(out, { recursive: true });
  await page.goto('/?equipo=1');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'e1-menu-equipo.png') });
  await click(page, 'equipo.fase-3');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, 'e2-equipo-en-fase.png') });
});
