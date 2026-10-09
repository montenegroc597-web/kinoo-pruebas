import { test, expect } from '@playwright/test';
import { caer, click, col, dump, registrar, reset, responder, siguiente, tr } from './helpers';

test.setTimeout(180_000);
test.beforeEach(async () => { await reset(); });

async function contexto(page: import('@playwright/test').Page) {
  await responder(page, 'edad', '40'); await siguiente(page, 'edad');
  await responder(page, 'genero', '#2'); await siguiente(page, 'genero');
  await responder(page, 'C1', '#0'); await siguiente(page, 'C1');
  await responder(page, 'C2', 'Casa'); await siguiente(page, 'C2');
  await responder(page, 'C3', 'Amigos'); await siguiente(page, 'C3');
  await responder(page, 'C4', '#1'); await siguiente(page, 'C4');
  await responder(page, 'C5', '#0'); await siguiente(page, 'C5');
}
async function abrirModerador(page: import('@playwright/test').Page) {
  await page.locator('.sh-modbtn').dispatchEvent('pointerdown');
  await page.waitForTimeout(2200);
  await page.locator('.sh-modbtn').dispatchEvent('pointerup');
  await expect(page.getByRole('dialog', { name: 'Moderador' })).toBeVisible();
}

test('sin red desde el registro: la prueba sigue, y al volver la red todo queda con el código definitivo y sin duplicados', async ({ page }) => {
  await caer(true);
  await registrar(page, 'Rosa');
  await contexto(page); // el contexto no puede enviarse todavía
  await click(page, '5s.listo');
  await expect(tr(page, 'q.P1')).toBeVisible({ timeout: 15000 });
  await responder(page, 'P1', 'algo'); await siguiente(page, 'P1');
  await responder(page, 'P2', 'algo'); await siguiente(page, 'P2');
  await responder(page, 'P3', 'algo'); await siguiente(page, 'P3');
  await responder(page, 'P4', '#4'); await siguiente(page, 'P4');
  await siguiente(page, 'P5');
  await tr(page, '5s.punto').first().click({ position: { x: 80, y: 160 } });
  await tr(page, '5s.punto-listo').click();
  expect((await dump('Participantes')).rows.length).toBe(0); // nada llegó: estaba caído
  await caer(false);
  await page.waitForTimeout(12_000); // reintento de registro (3 s) + reasignación + vaciado de la cola (3 s)
  const P = await dump('Participantes');
  expect(col(P, 'Nombre mostrado')).toEqual(['Rosa 1']);
  expect(col(P, 'Código')).toEqual(['P01']);
  expect(col(P, 'Edad')).toEqual([40]);                     // el contexto se reenvió
  const S5 = await dump('5 segundos');
  expect(col(S5, 'Participante')).toEqual(['P01']);        // nada con TMP-…
  const E = await dump('Eventos');
  expect(E.rows.length).toBeGreaterThan(10);
  expect(col(E, 'codigo').every((c) => c === 'P01')).toBe(true);
  const ids = col(E, 'eventId');
  expect(new Set(ids).size).toBe(ids.length);
});

test('cerrar y volver: retoma en la fase siguiente y el servidor sabe cuántas fases lleva', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await registrar(page, 'Luz');
  await abrirModerador(page);
  for (let i = 0; i < 3; i++) {                              // contexto, 5 s, cards
    if (i > 0) await abrirModerador(page);
    await click(page, 'mod.saltar');
  }
  await expect(page.getByText('terminaste la fase 1')).toBeVisible();
  await page.waitForTimeout(4000);
  expect(col(await dump('Participantes'), 'Fases completadas')).toEqual([1]);
  // nueva pestaña (mismo navegador): retoma
  const otra = await ctx.newPage();
  await otra.goto('/?forzar=1');
  await expect(otra.getByText('seguimos donde lo dejaste')).toBeVisible();
  await expect(otra.getByText('Fase 2 de 4')).toBeVisible();
  await ctx.close();
});

test('barra del moderador: nota con tipo y gravedad, pausa y reanudar; el toque largo no cuenta como clic', async ({ page }) => {
  await registrar(page, 'Mod');
  await abrirModerador(page);
  await tr(page, 'mod.nota').fill('Dudó antes de empezar');
  await click(page, 'mod.tipo-Problema');
  await page.locator('[data-track="mod.gravedad"]').selectOption('3');
  await click(page, 'mod.guardar-nota');
  await click(page, 'mod.pausa');
  await expect(page.getByRole('dialog', { name: 'Pausa' })).toBeVisible();
  await click(page, 'pausa.seguir');
  await expect(page.getByRole('dialog', { name: 'Pausa' })).not.toBeVisible();
  await page.waitForTimeout(4500);
  const N = await dump('Notas');
  expect(col(N, 'Texto')).toEqual(['Dudó antes de empezar']);
  expect(col(N, 'Tipo')).toEqual(['Problema']);
  expect(col(N, 'Gravedad')).toEqual([3]);
  expect(col(N, 'Participante')).toEqual(['P01']);
  const E = await dump('Eventos');
  const tipos = col(E, 'tipo');
  expect(tipos).toEqual(expect.arrayContaining(['pause', 'resume']));
});
