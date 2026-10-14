import { test, expect } from '@playwright/test';
// @ts-expect-error módulo .mjs sin tipos
import { sembrar } from './seed.mjs';
import { BACK, post, reset } from './helpers';

test.use({ viewport: { width: 1360, height: 900 }, hasTouch: false, isMobile: false });
test.setTimeout(120_000);

test('Panel v2.0: validez, módulos, card A vs B, moods, codificación a ciegas, exclusión y export', async ({ page }) => {
  await reset();
  await sembrar(post);

  await page.goto('http://localhost:5174/');
  await page.getByLabel('URL').fill(BACK);
  await page.getByLabel('Clave de lectura').fill('MALA');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('no autorizado')).toBeVisible();
  await page.getByRole('button', { name: 'Salir' }).click().catch(() => {});
  await page.reload();
  await page.getByLabel('URL').fill(BACK);
  await page.getByLabel('Clave de lectura').fill('R');
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Resumen: 10 válidas (5 y 5), dos descartadas y la lectura A vs B
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
  await expect(page.locator('.pn-big').first()).toHaveText('10');
  await expect(page.getByText('5 / 5').first()).toBeVisible();
  await expect(page.getByText(/falló el control de atención/).first()).toBeVisible();
  await expect(page.getByText(/Gana la card A/).first()).toBeVisible();

  await page.getByRole('button', { name: 'M1 · Descubrir' }).click();
  await expect(page.locator('tr', { hasText: 'Gesto correcto «me interesa»' })).toContainText('70');
  await expect(page.locator('[data-heat="D2-A"] iframe')).toBeVisible();      // mapa sobre el prototipo real

  await page.getByRole('button', { name: 'M2 · Ver' }).click();
  await expect(page.getByText(/El concepto sirve/)).toBeVisible();

  await page.getByRole('button', { name: 'M3 · Moods' }).click();
  await expect(page.locator('tr', { hasText: 'Algo raro' }).first()).toContainText('Renombrar');
  await expect(page.getByText(/«drama de amor» ×4 ★/)).toBeVisible();

  await page.getByRole('button', { name: 'Card A vs B' }).click();
  await expect(page.locator('tr', { hasText: 'Interés en la película' })).toContainText('Diferencia clara');
  await expect(page.locator('tr', { hasText: 'cuando la película le interesa' })).toContainText('Tendencia');

  // codificación a ciegas: no se ve la card
  await page.getByRole('button', { name: 'Codificación' }).click();
  await expect(page.getByText('para descubrir películas').first()).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Card A');
  // exclusión manual: P01 deja de contar
  await page.getByRole('button', { name: 'Participantes' }).click();
  await page.locator('tr', { hasText: 'P01' }).getByRole('checkbox').click(); // se marca cuando el servidor confirma
  await page.getByRole('button', { name: 'Resumen' }).click();
  await expect(page.locator('.pn-big').first()).toHaveText('9');

  await page.getByRole('button', { name: 'Salud' }).click();
  await expect(page.locator('.pn-card', { hasText: 'Errores de la app' }).locator('.pn-big')).toHaveText('1');

  await page.getByRole('button', { name: 'Exportar' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Formato Registro v2.0/ }).click()]);
  expect(dl.suggestedFilename()).toMatch(/\.xlsx$/);
});
