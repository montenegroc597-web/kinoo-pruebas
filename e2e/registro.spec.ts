import { test, expect } from '@playwright/test';
import { click, col, dump, esperarEnvio, registrar, reset, responder, siguiente, tr } from './helpers';

test.beforeEach(async () => { await reset(); });

test('registro: dos «Juan» a la vez salen Juan 1 y Juan 2, con sus órdenes y todo ligado', async ({ browser }) => {
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const a = await ctxA.newPage(), b = await ctxB.newPage();
  await Promise.all([registrar(a, 'Juan'), registrar(b, ' JUÁN ')]);
  await expect(tr(a, 'q.edad')).toBeVisible();
  await expect(tr(b, 'q.edad')).toBeVisible();
  const p = await dump('Participantes');
  // el primero en registrarse fija la forma mostrada (Juan o Juán); lo que importa es la numeración
  const nombres = col(p, 'Nombre mostrado').map((n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '')).sort();
  expect(nombres).toEqual(['Juan 1', 'Juan 2']);
  expect(col(p, 'Código').sort()).toEqual(['P01', 'P02']);
  const ordenes = col(p, 'Orden de tareas');
  expect(new Set(ordenes).size).toBe(2);
  expect(col(p, 'Consentimiento (fecha)').every(Boolean)).toBe(true);
  await ctxA.close(); await ctxB.close();
});

test('contexto: edad, género y hábitos van a la fila del participante', async ({ page }) => {
  await registrar(page, 'Camila', 'Sí');
  await responder(page, 'edad', '27'); await siguiente(page, 'edad');
  await responder(page, 'genero', '#0'); await siguiente(page, 'genero');
  await responder(page, 'C1', '#2'); await siguiente(page, 'C1');
  await responder(page, 'C2', 'En mi casa, en el celular'); await siguiente(page, 'C2');
  await responder(page, 'C3', 'Por TikTok'); await siguiente(page, 'C3');
  await responder(page, 'C4', '#0'); await siguiente(page, 'C4');
  await responder(page, 'C4b', 'TikTok e Instagram'); await siguiente(page, 'C4b');
  await responder(page, 'C5', '#1'); await siguiente(page, 'C5');
  await expect(tr(page, '5s.listo')).toBeVisible();
  await esperarEnvio(page);
  const p = await dump('Participantes');
  const h = p.headers, r = p.rows[0];
  expect(r[h.indexOf('Nombre mostrado')]).toBe('Camila 1');
  expect(r[h.indexOf('Edad')]).toBe(27);
  expect(r[h.indexOf('Género')]).toBe('Mujer');
  expect(r[h.indexOf('Frecuencia de consumo')]).toBe('Una vez por semana');
  expect(r[h.indexOf('Descubre en redes (Sí/No)')]).toBe('Sí');
  expect(r[h.indexOf('Nivel tecnológico')]).toBe('Medio');
  expect(r[h.indexOf('Graba (Sí/No)')]).toBe('Sí');
  expect(String(r[h.indexOf('Notas')])).toContain('TikTok');
  const ev = await dump('Eventos');
  expect(col(ev, 'tipo')).toEqual(expect.arrayContaining(['session.start', 'consent']));
});

test('sin consentimiento no se registra nada', async ({ page }) => {
  await page.goto('/?forzar=1');
  await tr(page, 'registro.nombre').fill('Pedro');
  await click(page, 'registro.continuar');
  await click(page, 'registro.no-acepto');
  await expect(page.getByText('No guardamos nada')).toBeVisible();
  const p = await dump('Participantes');
  expect(p.rows.length).toBe(0);
});

test('escritorio: muestra QR y no deja empezar', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByText('Esta prueba es para el celular')).toBeVisible();
  await expect(page.locator('img[alt^="Código QR"]')).toBeVisible();
  await ctx.close();
});
