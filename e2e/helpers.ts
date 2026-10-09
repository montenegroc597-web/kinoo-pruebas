import type { Page } from '@playwright/test';

export const BACK = 'http://localhost:8787';
export const tr = (page: Page, track: string) => page.locator(`[data-track="${track}"]`);
export const click = async (page: Page, track: string) => { await tr(page, track).first().click(); };

export async function reset() { await fetch(BACK + '/__reset', { method: 'POST' }); }
export async function caer(v: boolean) { await fetch(BACK + '/__caer?v=' + (v ? 1 : 0)); }
export async function dump(hoja: string): Promise<{ headers: string[]; rows: any[][] }> {
  const r = (await (await fetch(`${BACK}/__dump?hoja=${encodeURIComponent(hoja)}`)).json()) as any;
  return r.data[hoja];
}
export const col = (d: { headers: string[]; rows: any[][] }, name: string) => d.rows.map((r) => r[d.headers.indexOf(name)]);
export const fila = (d: { headers: string[]; rows: any[][] }, name: string, val: unknown) => d.rows.find((r) => r[d.headers.indexOf(name)] === val);
export const val = (d: { headers: string[]; rows: any[][] }, row: any[] | undefined, name: string) => (row ? row[d.headers.indexOf(name)] : undefined);

/** Espera a que el cliente de seguimiento haya enviado todo (la app envía cada 3 s). */
export async function esperarEnvio(page: Page, ms = 4000) { await page.waitForTimeout(ms); }

/** Registro + consentimiento. */
export async function registrar(page: Page, nombre: string, graba: 'Sí' | 'No' = 'No') {
  await page.goto('/?forzar=1');
  await tr(page, 'registro.nombre').fill(nombre);
  await click(page, 'registro.continuar');
  await click(page, graba === 'Sí' ? 'registro.graba-0' : 'registro.graba-1');
  await click(page, 'registro.acepto');
  await click(page, 'registro.empezar');
}

/** Responde una Pregunta (flujo de una pregunta por pantalla) según su tipo. */
export async function responder(page: Page, id: string, v: string | number | string[]) {
  const q = (s: string) => `[data-track="q.${id}${s}"]`;
  if (typeof v === 'number') await page.locator(q(`-${v}`)).first().click();
  else if (Array.isArray(v)) for (const x of v) await page.locator(q(`-${x}`)).first().click();
  else if (/^#\d+$/.test(v)) await page.locator(q(`-${v.slice(1)}`)).first().click();
  else await page.locator(q('')).first().fill(v);
}
export async function siguiente(page: Page, id: string) { await page.locator(`[data-track="q.${id}-siguiente"]`).click(); }
