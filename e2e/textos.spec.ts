import { test, expect } from '@playwright/test';
import { BACK, click, empezar, filas, intro, reset, tr } from './helpers';

// De punta a punta: el equipo cambia la redacción (Textos) y la «Config» (Estudio) en el Panel → publica → la app de prueba
// las usa y la persona queda marcada con esas versiones. Lo inválido no se deja publicar.
const BIENVENIDA = 'Hola. Vas a ver unas pantallas de una app en diseño: evaluamos la app, no a ti. Responde con lo primero que pienses.';

async function entrarPanel(browser: import('@playwright/test').Browser) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  await page.goto('http://localhost:5174/');
  await page.getByLabel('URL').fill(BACK);
  await page.getByLabel('Clave de lectura').fill('R');
  await page.getByRole('button', { name: 'Entrar' }).click();
  return page;
}

test.describe.serial('textos y «Config» editables', () => {
  test('Panel: editar, validar y publicar textos y estudio', async ({ browser }) => {
    await reset();
    const page = await entrarPanel(browser);
    await page.getByRole('button', { name: 'Textos' }).click();
    // una escala sin «1 = … 7 = …» se marca y bloquea la publicación
    await page.getByLabel('descubrir.D1d', { exact: true }).fill('¿Te gustó la película?');
    await expect(page.getByText('Es una escala')).toBeVisible();
    await page.getByLabel('Nombre de la versión', { exact: true }).fill('e2e-v1');
    await expect(page.getByRole('button', { name: 'Publicar…' })).toBeDisabled();
    await page.locator('.pn-tx', { has: page.getByLabel('descubrir.D1d', { exact: true }) }).getByRole('button', { name: 'Restaurar' }).click();
    await page.getByLabel('link.bienvenida', { exact: true }).fill(BIENVENIDA);
    await page.getByRole('button', { name: 'Publicar…' }).click();
    await page.getByRole('button', { name: 'Sí, publicar' }).click();
    await expect(page.getByText('Publicada «e2e-v1»')).toBeVisible();

    await page.getByRole('button', { name: 'Estudio' }).click();
    await expect(page.getByText(/Pendiente antes de lanzar/)).toBeVisible();
    await page.getByLabel('Qué muestra la card B').fill('Card sin el número de match');
    await page.getByLabel('Nombre de la versión del estudio').fill('estudio-e2e');
    await page.getByRole('button', { name: 'Publicar…' }).click();
    await page.getByRole('button', { name: 'Sí, publicar' }).click();
    await expect(page.getByText('Publicada «estudio-e2e»')).toBeVisible();
    await page.close();
  });

  test('la app usa la redacción y la «Config» publicadas, y las registra en la persona', async ({ page }) => {
    await page.goto('/?forzar=1');
    await expect(page.getByText(BIENVENIDA)).toBeVisible();
    await empezar(page);
    await intro(page);
    await expect(tr(page, 'd1.listo')).toBeVisible();
    await expect.poll(async () => (await filas('Participantes'))[0]?.['Versión de textos'], { timeout: 10_000 }).toBe('e2e-v1');
    expect((await filas('Participantes'))[0]['Versión del estudio']).toBe('estudio-e2e');
    await click(page, 'd1.listo');
  });
});
