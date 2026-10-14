import { test, expect } from '@playwright/test';
import { caer, click, descubrir, empezar, esperarFilas, filas, intro, mazos, moods, percepcion, reset, tr, ver } from './helpers';

// Una persona hace el link completo en un celular virtual, con el prototipo REAL (iframe) y el backend con las migraciones de
// Supabase. Se verifica cada hoja del Excel v2.0: gestos medidos, mood alcanzado, primer clic, aciertos automáticos, validez.
test.setTimeout(240_000);

test('link completo: las 6 partes y cada hoja del registro', async ({ page }) => {
  await reset();
  await empezar(page);
  await intro(page);
  await descubrir(page);
  await ver(page, 'Solo reírme');
  await moods(page);
  await mazos(page);
  await percepcion(page, 5);
  await expect(page.getByText('Listo, terminaste')).toBeVisible();

  await esperarFilas('Percepción', 1);
  const [p] = await filas('Participantes');
  expect(p).toMatchObject({ 'Código': 'P01', 'Variante de card (A/B)': 'A', 'Flujo (Completo / Link 1 / Link 2)': 'Completo', 'Completó (Sí/No)': 'Sí', 'Control de atención': 5, 'Partes completadas': 6 });
  expect(p['Edad']).toBe('25–31');

  const [d] = await filas('Descubrir');
  expect(d['D2 · Gesto hecho']).toBe('drag:derecha');
  expect(d['D2 · Gesto «me interesa» (1 correcto · 0,5 alternativo · 0 incorrecto)']).toBe(1);
  expect(d['D3 · Gesto hecho']).toBe('drag:izquierda');
  expect(d['D3 · Gesto «no me interesa» (1 · 0,5 · 0)']).toBe(1);
  expect(Number(d['D2 · Tiempo hasta el gesto (s)'])).toBeGreaterThan(0);
  expect(d['D1b · Respuesta']).toBe('respuesta D1b');
  expect(d['D4c · Tipo de sorpresa']).toBe('Agradable');
  expect(d['D4 · Llegó al resumen (1/0)']).toBe(1);
  expect(d['D4a · Respuesta']).toBe('que me gustan los amores melancólicos');

  const [v] = await filas('Ver');
  expect(v['V2 · Mood en el que terminó'].toLowerCase()).toBe('solo reírme');
  expect(v['V2 · Mood alcanzado (1 correcto · 0,5 cercano · 0 otro)']).toBe(1);
  expect(v['Índice de confianza (auto, 1–7)']).toBe(6);

  await esperarFilas('Moods', 8);
  const ms = await filas('Moods');
  expect(ms.filter((m) => m['M3a · Respuesta'] !== '').length).toBe(3);     // M3a solo para 3 moods al azar
  expect(ms.every((m) => m['¿Acierta? (auto)'] === 0 || m['¿Acierta? (auto)'] === 1)).toBe(true);
  await esperarFilas('Películas', 5);

  const [z] = await filas('Mazos');
  expect(z['Frases acertadas (auto, 0–4)']).toBe(2);                          // marcó «Verdadero» en las 4: acierta S1 y S2
  expect(z['Z3 · Primer clic para controlar el contenido (1 · 0,5 · 0)']).not.toBe('');
  expect(z['¿Acierta? (auto)']).toBe(1);

  const [f] = await filas('Percepción');
  expect(f['UEQ-S General (auto)']).not.toBe('');
  expect((await filas('Puntos')).some((x) => x.Tarea === 'D2' && x.Resultado === 'decisivo')).toBe(true);
  expect((await filas('Notas')).map((n) => n.Pregunta)).toEqual(expect.arrayContaining(['V3d', 'F4']));
  expect(await filas('Errores')).toEqual([]);
});

test('Link 2 con la card fijada: introducción, moods y mazos, con el control de atención al final de M4', async ({ page }) => {
  await reset();
  await empezar(page, '&link=2&card=B');
  await intro(page);
  await moods(page);
  await mazos(page, 3); // falla el control: la persona queda «no válida» en el Panel
  await expect(page.getByText('Listo, terminaste')).toBeVisible();
  await expect.poll(async () => (await filas('Participantes'))[0]?.['Completó (Sí/No)'], { timeout: 20_000 }).toBe('Sí');
  const [p] = await filas('Participantes');
  expect(p).toMatchObject({ 'Variante de card (A/B)': 'B', 'Flujo (Completo / Link 1 / Link 2)': 'Link 2', 'Control de atención': 3, 'Partes completadas': 3 });
});

test('sin red al empezar: sigue con un código provisional y lo corrige al volver la red', async ({ page }) => {
  await reset();
  await caer(true);
  await empezar(page);
  await intro(page);
  await expect(tr(page, 'd1.listo')).toBeVisible();
  await caer(false);
  await expect.poll(async () => (await filas('Participantes')).length, { timeout: 30_000 }).toBe(1);
  await expect.poll(async () => (await filas('Participantes'))[0]['Edad'], { timeout: 30_000 }).toBe('25–31');
  await click(page, 'd1.listo');
});

test('modo equipo: recorre una parte y no guarda nada', async ({ page }) => {
  await reset();
  await page.goto('/?equipo=1');
  await click(page, 'equipo.parte-intro');
  for (const id of ['I1', 'I2', 'I3', 'I4']) { await click(page, `q.${id}-0`); await click(page, `q.${id}-siguiente`); }
  await expect(tr(page, 'd1.listo')).toBeVisible();
  await page.waitForTimeout(4000);
  expect(await filas('Participantes')).toEqual([]);
  expect(await filas('Eventos')).toEqual([]);
});
