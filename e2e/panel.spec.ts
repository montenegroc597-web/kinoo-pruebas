import { test, expect } from '@playwright/test';
// @ts-expect-error módulo .mjs sin tipos
import { sembrar } from './seed.mjs';
import { BACK, reset } from './helpers';

test.use({ viewport: { width: 1360, height: 900 }, hasTouch: false, isMobile: false });
test.setTimeout(120_000);

async function post(body: unknown) {
  const r = await fetch(BACK, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
  return r.json();
}

test('Panel: login, métricas con semáforo, mapas sobre la pantalla real, codificación y exportar', async ({ page }) => {
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

  // Resumen: 10 personas (el piloto no cuenta), 8 completos
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
  await expect(page.locator('.pn-big').first()).toHaveText('10');
  await expect(page.getByText('terminaron las 4 fases')).toBeVisible();
  await expect(page.locator('tr', { hasText: 'Primer clic' }).first()).toContainText('70');
  await page.screenshot({ path: 'test-results/panel-resumen.png', fullPage: true });

  // Primer clic: T1 90 % verde, T2 50 % rojo, zona y mapas
  await page.getByRole('button', { name: 'Primer clic + SEQ' }).click();
  const t1 = page.locator('.pn-card', { hasText: 'T1 · S03' });
  await expect(t1).toContainText('90');
  await expect(t1.locator('.pn-tag.verde').first()).toBeVisible();
  const t2 = page.locator('.pn-card', { hasText: 'T2 · S02' });
  await expect(t2).toContainText('50');
  await expect(t2.locator('.pn-tag.rojo').first()).toBeVisible();
  await expect(t2).toContainText('S02.card'); // elemento que roba la tarea
  await expect(t1.locator('canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/panel-primer-clic.png', fullPage: true });

  // Flujos
  await page.getByRole('button', { name: 'Flujos' }).click();
  await expect(page.locator('.pn-card', { hasText: 'D1 ·' })).toContainText('90');
  // UEQ
  await page.getByRole('button', { name: 'UEQ' }).click();
  await expect(page.getByRole('heading', { name: 'UEQ' })).toBeVisible();
  await expect(page.locator('.pn-big').first()).toContainText('3');
  // Marca: gana B
  await page.getByRole('button', { name: 'Marca A/B' }).click();
  await expect(page.getByText('gana B').first()).toBeVisible();

  // Codificación: codificar un 5 segundos y que cambie el resumen
  await page.getByRole('button', { name: 'Codificación' }).click();
  await expect(page.getByText('Sin respuestas todavía.').first()).not.toBeVisible();
  await page.getByRole('button', { name: 'Salud' }).click();
  await expect(page.getByText('Errores de la app')).toBeVisible();
  await expect(page.locator('.pn-card', { hasText: 'Errores de la app' }).locator('.pn-big')).toHaveText('1');

  // Modo presentación oculta nombres
  await page.getByRole('button', { name: 'Participantes' }).click();
  await expect(page.locator('table').first()).toContainText('•••');
  await page.getByLabel('modo presentación').uncheck();
  await expect(page.locator('table').first()).toContainText('Persona1 1');

  // Exportar descarga un .xlsx
  await page.getByRole('button', { name: 'Exportar' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Formato Registro v1.3/ }).click()]);
  expect(dl.suggestedFilename()).toMatch(/\.xlsx$/);
});
