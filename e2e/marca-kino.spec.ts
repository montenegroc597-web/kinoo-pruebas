import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { click, tr } from './helpers';

// Versión B de la prueba de marca = el prototipo real «Kino» (packages/kinoo-ui/public/kino), no un tema de A.
const out = path.resolve('test-results/visual');
const listo = (page: Page, sel: string) => expect.poll(() => page.locator(sel).evaluate((f: HTMLIFrameElement) => !!(f.contentWindow as any)?.__kinoListo), { timeout: 20_000 }).toBe(true);

test('el prototipo Kino se sirve completo y abre cada pantalla de la prueba de marca', async ({ page }) => {
  await page.goto('/kino/index.html');
  await expect(page.getByText('PROTOTIPO FUNCIONAL').first()).toBeVisible({ timeout: 20_000 });   // sin ?pantalla = prototipo completo con su panel
  for (const [p, texto] of [['S02', 'CARTA 1 /'], ['S04', 'VER · ESTA NOCHE'], ['S05', 'ELIGE TU']] as const) {
    await page.goto('/kino/index.html?pantalla=' + p);
    await expect.poll(() => page.evaluate(() => (window as any).__kinoListo === true), { timeout: 20_000 }).toBe(true);
    await expect(page.getByText(texto).first()).toBeVisible();
  }
});

test('en la fase 4 (orden B→A) la Opción 1 es el prototipo Kino, en el marco de siempre y con su jerarquía prevista', async ({ page }) => {
  fs.mkdirSync(out, { recursive: true });
  await page.goto('/?equipo=1');
  await tr(page, 'equipo.indice').selectOption('2');            // P02 → orden de marca B→A
  await click(page, 'equipo.fase-4');
  await click(page, 'marca.brillo-ok');
  await click(page, 'marca.ver-primera');
  const fr = page.locator('#kinoo-estimulo');
  await expect(fr).toHaveAttribute('data-brand', 'kino');
  await expect(fr.locator('iframe')).toHaveAttribute('src', /kino\/index\.html\?pantalla=S02$/);
  await expect(fr.locator('[data-hierarchy="primary"]')).toHaveCount(1);
  await listo(page, '#kinoo-estimulo iframe');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, 'marca-B-kino-S02.png') });
});

test('catálogo: la versión B de cada pantalla es el prototipo Kino y se puede usar', async ({ page }) => {
  fs.mkdirSync(out, { recursive: true });
  await page.goto('/?catalogo=1');
  const f = page.locator('[data-catalogo="S02-B"] iframe');
  await expect(f).toHaveCSS('pointer-events', 'auto');
  await listo(page, '[data-catalogo="S02-B"] iframe');
  await page.locator('[data-catalogo="S02-B"]').screenshot({ path: path.join(out, 'catalogo-S02-B-kino.png') });
});
