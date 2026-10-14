import { expect, type Page } from '@playwright/test';

export const BACK = 'http://localhost:8787';
export const tr = (page: Page, track: string) => page.locator(`[data-track="${track}"]`).first();
export const click = async (page: Page, track: string) => { await tr(page, track).click(); };

export async function reset() { await fetch(BACK + '/__reset', { method: 'POST' }); }
export async function caer(v: boolean) { await fetch(BACK + '/__caer?v=' + (v ? 1 : 0)); }
export async function post(body: unknown) { return (await fetch(BACK, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })).json(); }
/** Filas de una hoja como objetos. */
export async function filas(hoja: string): Promise<Record<string, any>[]> {
  const d = ((await (await fetch(`${BACK}/__dump?hoja=${encodeURIComponent(hoja)}`)).json()) as any).data[hoja];
  return d.rows.map((r: any[]) => Object.fromEntries(d.headers.map((h: string, i: number) => [h, r[i]])));
}
/** Espera a que una hoja tenga `n` filas (la app envía cada 3 s). */
export const esperarFilas = (hoja: string, n: number) => expect.poll(async () => (await filas(hoja)).length, { timeout: 20_000 }).toBe(n);

// ---------------------------------------------------------------- respuestas
export const abierta = async (page: Page, id: string, texto = 'respuesta ' + id) => { await tr(page, `q.${id}`).fill(texto); await click(page, `q.${id}-siguiente`); };
export const escala = async (page: Page, id: string, n = 5) => { await click(page, `q.${id}-${n}`); await click(page, `q.${id}-siguiente`); };
export const opcion = async (page: Page, id: string, i = 0) => { await click(page, `q.${id}-${i}`); await click(page, `q.${id}-siguiente`); };

/** Desliza sobre el prototipo (iframe): de su centro hacia `dir`. */
export async function deslizar(page: Page, dir: 'derecha' | 'izquierda') {
  const f = page.locator('iframe').first();
  await expect.poll(() => f.evaluate((el: HTMLIFrameElement) => !!(el.contentWindow as any)?.__prototipoListo), { timeout: 20_000 }).toBe(true);
  const b = (await f.boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height * 0.4, s = dir === 'derecha' ? 1 : -1;
  await page.mouse.move(x, y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + s * i * 15, y);
  await page.mouse.up();
}

/** Bienvenida → empezar (registra a la persona). */
export async function empezar(page: Page, query = '') {
  await page.goto('/?forzar=1' + query);
  await click(page, 'bienvenida.empezar');
}
export async function intro(page: Page) { for (const id of ['I1', 'I2', 'I3', 'I4']) await opcion(page, id, 1); }

export async function descubrir(page: Page) {
  await click(page, 'd1.listo');
  await tr(page, 'q.D1a').waitFor({ timeout: 20_000 });
  for (const id of ['D1a', 'D1b', 'D1c']) await abierta(page, id);
  await escala(page, 'D1d', 6);
  await deslizar(page, 'derecha');
  await escala(page, 'D2a', 6); await abierta(page, 'D2b', 'se fue a mi lista');
  await deslizar(page, 'izquierda');
  await escala(page, 'D3a', 6); await abierta(page, 'D3b', 'se descartó');
  await completarMazo(page);
  await escala(page, 'D4e', 6); await abierta(page, 'D4a', 'que me gustan los amores melancólicos'); await escala(page, 'D4b'); await opcion(page, 'D4c', 0); await escala(page, 'D4d');
  await click(page, 'q.D4f-siguiente');  // D4f es opcional: se deja en blanco
}

/** D4: revela y elige las 10 cartas del mazo dentro del prototipo, abre «Ver cómo te fue» y toca «Listo». */
async function completarMazo(page: Page) {
  const f = page.frameLocator('iframe').first();
  await expect(tr(page, 'D4.listo')).toBeDisabled({ timeout: 20_000 });
  for (let i = 0; i < 10; i++) {
    await f.getByText(/toca para revelar/i).first().click();
    await f.getByText(/^quiero verla$/i).last().click();
    await page.waitForTimeout(400);
  }
  await f.getByText(/ver cómo te fue/i).first().click();
  await expect(tr(page, 'D4.listo')).toBeEnabled({ timeout: 20_000 });
  await click(page, 'D4.listo');
}

export async function ver(page: Page, mood = 'Solo reírme') {
  await click(page, 'v1.listo');
  await tr(page, 'q.V1a').waitFor({ timeout: 20_000 });
  await abierta(page, 'V1a'); await escala(page, 'V1b');
  await abierta(page, 'V1c'); await abierta(page, 'V1d');
  const fr = page.frameLocator('iframe').first();
  await fr.getByText(mood, { exact: false }).first().click();
  await page.waitForTimeout(400);
  await click(page, 'V2.listo');
  await escala(page, 'V2a'); await opcion(page, 'V3a'); await escala(page, 'V3b'); await opcion(page, 'V3c'); await abierta(page, 'V3d', 'que se note que se mueve');
  await expect(tr(page, 'v4.continuar')).toBeVisible(); await click(page, 'v4.continuar');
  await escala(page, 'V4a', 6); await escala(page, 'V4b', 6); await escala(page, 'V4c', 6); await escala(page, 'V4d');
}

export async function moods(page: Page) {
  await click(page, 'm3.listo');
  for (let i = 0; i < 3; i++) { await abierta(page, 'M3a'); await escala(page, 'M3b'); }
  for (let i = 0; i < 8; i++) { await click(page, 'm3c.op-0'); await click(page, 'm3c.siguiente'); }
  for (let i = 0; i < 5; i++) { await click(page, 'm3d-0'); await click(page, 'm3d.siguiente'); await tr(page, 'm3e').fill('nombre propio'); await click(page, 'm3e.siguiente'); }
}

export async function mazos(page: Page, control?: number) {
  await expect(tr(page, 'm4.continuar')).toBeVisible({ timeout: 20_000 });
  await click(page, 'm4.continuar');
  await abierta(page, 'Z1', 'filtra lo que veo');
  for (let i = 0; i < 4; i++) await opcion(page, 'Z2_' + i, 0);
  const z = (await tr(page, 'z3.punto').boundingBox())!;
  await page.waitForTimeout(1500);
  await page.mouse.click(z.x + z.width * 0.25, z.y + z.height * 0.23);
  await click(page, 'z3.punto-listo');
  await escala(page, 'Z3a'); await opcion(page, 'Z4', 0); await escala(page, 'Z5a'); await escala(page, 'Z5b');
  if (control != null) await escala(page, 'control', control);
}

export async function percepcion(page: Page, control = 5) {
  await escala(page, 'F1', 6); await escala(page, 'F2'); await escala(page, 'control', control);
  for (const i of [6, 7, 10, 11, 13, 15, 20, 21]) await click(page, `ueq.${i}-6`);
  await click(page, 'ueq.enviar');
  await tr(page, 'f4').fill('nada que cambiar');
  await click(page, 'f4.terminar');
}
