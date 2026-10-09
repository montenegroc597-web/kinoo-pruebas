import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { click, registrar, reset, responder, siguiente, tr } from './helpers';

// Capturas de los pasos nuevos (tarjeta en pantalla completa, prueba del gesto, felicitación, mazos en 5 s). No afirman nada.
test.setTimeout(120_000);
const OUT = path.resolve('test-results/visual');

async function saltar(page: import('@playwright/test').Page, veces: number) {
  for (let i = 0; i < veces; i++) {
    await page.locator('.sh-modbtn').dispatchEvent('pointerdown');
    await page.waitForTimeout(2200);
    await page.locator('.sh-modbtn').dispatchEvent('pointerup');
    await click(page, 'mod.saltar');
    await page.waitForTimeout(250);
  }
}

test('capturas de cards, felicitación y mazos', async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true });
  await reset();
  await registrar(page, 'Visual');
  await saltar(page, 2);                                   // contexto y 5 s → cards
  await click(page, 'cards.listo');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'n1-card-5s.png') });
  await tr(page, 'q.C0-0').waitFor({ timeout: 12000 });
  await responder(page, 'C0', '#0'); await siguiente(page, 'C0');
  await responder(page, 'C1', '#0'); await siguiente(page, 'C1');
  await responder(page, 'C3', 'x'); await siguiente(page, 'C3');
  await responder(page, 'C4', '#5'); await siguiente(page, 'C4');
  await responder(page, 'C5', 'x'); await siguiente(page, 'C5');
  await responder(page, 'C6', 'x'); await siguiente(page, 'C6');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'n2-card-prueba-gesto.png') });
  await saltar(page, 1);                                   // sale de cards → pausa
  await click(page, 'fase.empezar');
  await saltar(page, 1);                                   // primer clic → pausa
  await click(page, 'fase.empezar');                       // fase 3
  await click(page, 'fl.entendido');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'n3-flujo-escenario.png') });
  await click(page, 'fl.empezar');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'n4-flujo-inicio.png') });
  await click(page, 'S01.mood-apagar'); await click(page, 'S01.continuar'); await click(page, 'S06.ver-mazos');
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, 'n5-felicidades.png') });
});
