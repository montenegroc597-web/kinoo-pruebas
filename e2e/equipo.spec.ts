import { test, expect } from '@playwright/test';
import { click, dump, reset, tr } from './helpers';

test.setTimeout(90_000);
test.beforeEach(async () => { await reset(); });
test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false });

const vacio = async () => {
  for (const h of ['Participantes', 'Eventos', 'Puntos', 'Primer clic + SEQ', 'Flujos', 'Notas', 'Errores']) expect((await dump(h)).rows.length, h).toBe(0);
};

test('«Continuar como equipo»: se puede recorrer, volver y saltar sin registrar NADA ni dar nada por terminado', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Esta prueba es para el celular')).toBeVisible();
  await click(page, 'gate.equipo');
  await expect(page.getByRole('heading', { name: 'Modo equipo' })).toBeVisible();
  await expect(page.getByText('sin registrar a nadie')).toBeVisible();

  // entra a la fase 2 y hace una tarea real de primer clic
  await click(page, 'equipo.fase-2');
  await expect(page.getByRole('region', { name: 'Modo equipo' })).toBeVisible();
  await click(page, 'pc.entendido');
  await click(page, 'pc.empezar-tarea');
  await page.waitForTimeout(700);
  await page.locator('[data-zone="T1.correcta"]').first().click();   // P01 empieza por T1
  await expect(tr(page, 'pc.seq-6')).toBeVisible({ timeout: 8000 });

  // saltar → siguiente fase; atrás → vuelve; menú → vuelve al menú
  await click(page, 'equipo.saltar');                                   // sale de «primer clic» → pausa de la fase 3
  await expect(page.getByRole('heading', { name: 'Fase 3 de 4' })).toBeVisible();
  await click(page, 'equipo.atras');                                    // vuelve a la fase 2
  await expect(tr(page, 'pc.entendido')).toBeVisible();
  await click(page, 'equipo.saltar'); await click(page, 'fase.empezar'); // fase 3
  await expect(tr(page, 'fl.entendido')).toBeVisible();
  await click(page, 'equipo.menu-btn');
  await expect(page.getByRole('heading', { name: 'Modo equipo' })).toBeVisible();

  // fin de la fase 4: NO es «gracias, terminaste»
  await click(page, 'equipo.fase-4');
  await click(page, 'equipo.saltar'); await click(page, 'equipo.saltar');           // marca y cierre
  await expect(page.getByRole('heading', { name: 'Recorrido terminado' })).toBeVisible();
  await expect(page.getByText('no se guardó nada')).toBeVisible();
  await expect(page.getByText('Terminaste,')).not.toBeVisible();
  await click(page, 'equipo.atras');                                                 // se puede volver desde el final
  await expect(tr(page, 'marca.brillo-ok').or(page.getByRole('heading', { name: /Cierre|casi terminamos/i })).first()).toBeVisible().catch(() => {});

  await page.waitForTimeout(4500);                                      // más que el ciclo de envío (3 s)
  await vacio();                                                        // ni una fila en ninguna hoja
  const guardado = await page.evaluate(() => ({ s: localStorage.getItem('kinoo.session'), q: localStorage.getItem('kinoo.queue') }));
  expect(guardado.s).toBeNull();                                        // tampoco en el navegador
  expect(guardado.q).toBeNull();
});

test('un participante normal sigue registrándose y guardándose (el modo equipo no lo afecta)', async ({ page }) => {
  await page.goto('/?forzar=1');
  await tr(page, 'registro.nombre').fill('Real');
  await click(page, 'registro.continuar'); await click(page, 'registro.graba-1'); await click(page, 'registro.acepto'); await click(page, 'registro.empezar');
  await expect(tr(page, 'q.edad')).toBeVisible();
  await page.waitForTimeout(4000);
  expect((await dump('Participantes')).rows.length).toBe(1);
  await expect(page.getByRole('region', { name: 'Modo equipo' })).not.toBeVisible();
});
