import { test, expect, type Page } from '@playwright/test';
import { click, col, dump, fila, val, registrar, reset, responder, siguiente, tr } from './helpers';

test.setTimeout(300_000);
test.beforeEach(async () => { await reset(); });

async function contexto(page: Page) {
  await responder(page, 'edad', '31'); await siguiente(page, 'edad');
  await responder(page, 'genero', '#1'); await siguiente(page, 'genero');
  await responder(page, 'C1', '#1'); await siguiente(page, 'C1');
  await responder(page, 'C2', 'Celular'); await siguiente(page, 'C2');
  await responder(page, 'C3', 'Redes'); await siguiente(page, 'C3');
  await responder(page, 'C4', '#1'); await siguiente(page, 'C4');
  await responder(page, 'C5', '#2'); await siguiente(page, 'C5');
}
async function punto(page: Page, track: string) {
  const box = tr(page, track).first();
  await box.click({ position: { x: 90, y: 200 } });
  await tr(page, track + '-listo').click();
}
async function cincoSeg(page: Page) {
  for (let i = 0; i < 4; i++) {
    await click(page, '5s.listo');
    await expect(tr(page, 'q.P1')).toBeVisible({ timeout: 15000 });
    await responder(page, 'P1', 'Una carta y botones'); await siguiente(page, 'P1');
    await responder(page, 'P2', 'Para descubrir'); await siguiente(page, 'P2');
    await responder(page, 'P3', 'Deslizar'); await siguiente(page, 'P3');
    await responder(page, 'P4', '#5'); await siguiente(page, 'P4');
    await siguiente(page, 'P5');
    await punto(page, '5s.punto');
  }
}
async function cards(page: Page) {
  for (let i = 0; i < 3; i++) {
    await click(page, 'cards.listo');
    await expect(tr(page, 'q.C0-0')).toBeVisible({ timeout: 15000 });
    await responder(page, 'C0', '#0'); await siguiente(page, 'C0');
    await responder(page, 'C1', '#0'); await siguiente(page, 'C1');
    await responder(page, 'C3', 'Una de ciencia ficción'); await siguiente(page, 'C3');
    await responder(page, 'C4', '#6'); await siguiente(page, 'C4');
    await responder(page, 'C5', 'Deslizarla'); await siguiente(page, 'C5');
    await responder(page, 'C6', 'La duración'); await siguiente(page, 'C6');
    // la tarjeta viene dentro de la pantalla completa y se puede usar de verdad
    await expect(page.getByText('Ahora pruébala como lo harías')).toBeVisible();
    await expect(tr(page, 'S02.btn-quiero')).toBeVisible();   // se ven los botones del gesto
    await expect(tr(page, 'tabbar.ver')).toBeVisible();        // y la barra inferior
    if (i === 0) {
      const caja = (await tr(page, 'S02.card').boundingBox())!;
      await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await page.mouse.down();
      await page.mouse.move(caja.x + caja.width / 2 - 170, caja.y + caja.height / 2 + 6, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(700);
    } else {
      await click(page, 'S02.card');
    }
    await click(page, 'cards.prueba-listo');
  }
}
async function primerClic(page: Page, orden: string[]) {
  await click(page, 'pc.entendido');
  for (const id of orden) {
    await click(page, 'pc.empezar-tarea');
    await page.waitForTimeout(900);
    if (id === 'T2') {
      // un miss click deliberado en el encabezado, luego el acierto
      await tr(page, 'header.perfil').first().click();
      await page.locator('[data-zone="T2.correcta"]').first().click();
      await expect(tr(page, 'pc.seq-3')).toBeVisible({ timeout: 8000 });
      await click(page, 'pc.seq-3'); await click(page, 'pc.seq-siguiente');
      await tr(page, 'pc.porque').fill('No sabía dónde tocar'); await click(page, 'pc.porque-siguiente');
    } else {
      await page.locator(`[data-zone="${id}.correcta"]`).first().click();
      await expect(tr(page, 'pc.seq-6')).toBeVisible({ timeout: 8000 });
      await click(page, 'pc.seq-6'); await click(page, 'pc.seq-siguiente');
    }
    await click(page, 'pc.esperabas-siguiente');
  }
}
async function seq(page: Page) {
  await expect(page.getByRole('dialog', { name: 'Tarea completada' })).toBeVisible({ timeout: 10000 }); // «¡Felicidades! Completaste la tarea»
  await expect(page.getByText('Completaste la tarea')).toBeVisible();
  await click(page, 'fl.continuar');
  await expect(tr(page, 'fl.seq-6')).toBeVisible({ timeout: 10000 });
  await click(page, 'fl.seq-6'); await click(page, 'fl.seq-siguiente');
}
async function flujos(page: Page) {
  await click(page, 'fl.entendido');
  // D1 · S01 → S05
  await click(page, 'fl.empezar');
  await click(page, 'S01.mood-apagar'); await click(page, 'S01.continuar'); await click(page, 'S06.ver-mazos'); await seq(page);
  // M1 · S05 → cartas del mazo Nolan
  await click(page, 'fl.empezar');
  await click(page, 'S05.deck-nolan'); await click(page, 'S05.otro-barajar'); await click(page, 'S05.abrir-otro');
  await expect(tr(page, 'S05.empezar')).toBeVisible({ timeout: 8000 }); await click(page, 'S05.empezar'); await seq(page);
  // D2 · primera carta → «Mazo terminado» (recorre las 3 cartas)
  await click(page, 'fl.empezar');
  for (let i = 0; i < 3; i++) { await click(page, 'S02.btn-no'); await page.waitForTimeout(600); }
  await seq(page);
  // V2 · propuesta → plataforma → volver → «Sí» → calificar
  await click(page, 'fl.empezar');
  await click(page, 'S04.btn-verla'); await click(page, 'S04.abrir-plataforma');
  await click(page, 'S04.volver-kinoo'); await click(page, 'S03.si-la-vi'); await seq(page);
  // V3 · Ver → Mi espacio → quitar El Faro Mudo
  await click(page, 'fl.empezar');
  await click(page, 'S04.mi-espacio'); await click(page, 'S08.accion-faro'); await seq(page);
}
async function ueq(page: Page) {
  for (const i of [6, 7, 10, 11, 13, 15, 20, 21]) await click(page, `ueq.${i}-5`);
  await tr(page, 'ueq.comentario').fill('Más claridad en los botones');
  await click(page, 'ueq.enviar');
}
async function marca(page: Page) {
  await click(page, 'marca.brillo-ok');
  for (let par = 0; par < 3; par++) {
    await click(page, 'marca.ver-primera');
    for (let v = 0; v < 2; v++) {
      await expect(tr(page, 'q.M1-5')).toBeVisible({ timeout: 20000 });
      await click(page, 'q.M1-5'); await siguiente(page, 'M1');
      for (const k of [0, 1, 2]) await click(page, `q.M2-${k}`); await siguiente(page, 'M2');
      await click(page, 'q.M3-6'); await siguiente(page, 'M3');
      for (let d = 0; d < 4; d++) { await click(page, `q.M4${d}-${4 + (d % 2)}`); await siguiente(page, `M4${d}`); }
      await punto(page, 'marca.punto');
    }
    await click(page, 'marca.comparar');
    await click(page, 'q.M6-1'); await siguiente(page, 'M6');
    await tr(page, 'q.M7').fill('Se lee mejor'); await siguiente(page, 'M7');
    await click(page, 'q.M8-0'); await siguiente(page, 'M8');
    await click(page, 'q.M9-1'); await siguiente(page, 'M9');
    await click(page, 'q.M10-2'); await siguiente(page, 'M10');
  }
}

test('SESIÓN COMPLETA: las 4 fases, todo registrado y ligado a «Ana 1»', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await registrar(page, 'Ana');
  await page.goto(page.url().replace('forzar=1', 'forzar=1&rapido=1'));
  // la página recargó: debe retomar la fase 1 desde el principio con la misma sesión
  await expect(page.getByText('seguimos donde lo dejaste')).toBeVisible();
  await click(page, 'fase.empezar');
  await contexto(page);
  await cincoSeg(page);
  await cards(page);
  await click(page, 'fase.empezar'); // pausa → fase 2
  const orden = String(val(await dump('Participantes'), (await dump('Participantes')).rows[0], 'Orden de tareas')).split('-');
  expect(orden).toEqual(['T1', 'T2', 'T5', 'T3', 'T4']);
  await primerClic(page, orden);
  await click(page, 'fase.empezar'); // fase 3
  await flujos(page);
  await ueq(page);
  await click(page, 'fase.empezar'); // fase 4
  await marca(page);
  // cierre
  await siguiente(page, 'K1'); await siguiente(page, 'K2');
  await tr(page, 'q.K3').fill('Me gustó la carta, no encontré «Otra» enseguida');
  await siguiente(page, 'K3');
  await expect(page.getByText('Terminaste, Ana')).toBeVisible();
  await expect(page.getByText('Todo enviado')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(4500); // última pasada del cliente (cada 3 s)
  expect(errores).toEqual([]);

  // ---------- lo que quedó en el «Excel» ----------
  const P = await dump('Participantes');
  expect(col(P, 'Nombre mostrado')).toEqual(['Ana 1']);
  expect(col(P, 'Fases completadas')).toEqual([4]);

  const S5 = await dump('5 segundos');
  expect(S5.rows.length).toBe(4);
  expect(new Set(col(S5, 'Pantalla ID'))).toEqual(new Set(['S02', 'S03', 'S04', 'S05']));
  expect(col(S5, 'Participante')).toEqual(['P01', 'P01', 'P01', 'P01']);
  expect(col(S5, 'Nombre mostrado').every((x) => x === 'Ana 1')).toBe(true);
  expect(col(S5, 'Claridad 1–7').every((x) => x === 5)).toBe(true);

  const C = await dump('5 s – Cards');
  expect(C.rows.length).toBe(3);
  expect(new Set(col(C, 'Card')).size).toBe(3);                       // 3 tarjetas distintas, ninguna repetida
  expect(col(C, 'Notas').every((n) => /Probó la tarjeta/.test(String(n)))).toBe(true);
  expect(col(C, 'Notas').some((n) => /mark\./.test(String(n)) || /derecha|izquierda/.test(String(n)) || /toques/.test(String(n)))).toBe(true);

  const PC = await dump('Primer clic + SEQ');
  expect(PC.rows.length).toBe(5);
  for (const id of ['T1', 'T3', 'T4', 'T5']) {
    const r = fila(PC, 'Tarea', id);
    expect(val(PC, r, 'Resultado 1er clic (auto)'), `${id} primer clic`).toBe('Correcto');
    expect(val(PC, r, 'SEQ 1–7')).toBe(6);
  }
  const t2 = fila(PC, 'Tarea', 'T2');
  expect(val(PC, t2, 'Resultado 1er clic (auto)')).toBe('Miss click');
  expect(val(PC, t2, 'Clics totales')).toBe(2);
  expect(val(PC, t2, 'Miss clicks')).toBe(1);
  expect(val(PC, t2, 'SEQ 1–7')).toBe(3);
  expect(String(val(PC, t2, 'Si SEQ ≤ 4: ¿qué la hizo difícil?'))).toContain('No sabía');
  expect(col(PC, 'Orden en sesión').sort()).toEqual([1, 2, 3, 4, 5]);

  const Z = await dump('Zonas');
  expect(Z.rows.length).toBeGreaterThanOrEqual(5);

  const PT = await dump('Puntos');
  const pruebas = new Set(col(PT, 'Prueba'));
  for (const p of ['5 segundos', '5 s – Cards', 'Primer clic', 'Marca A-B']) expect(pruebas.has(p), p).toBe(true);
  expect(col(PT, 'Participante').every((x) => x === 'P01')).toBe(true);

  const F = await dump('Flujos');
  expect(F.rows.length).toBe(5);
  expect(col(F, 'Misión')).toEqual(['D1', 'M1', 'D2', 'V2', 'V3']);
  for (const r of F.rows) expect(String(r[F.headers.indexOf('Resultado')]), String(r[F.headers.indexOf('Misión')])).toBe('Éxito directo');
  expect(col(F, 'Flujo')).toEqual(['Descubrir', 'Mazos (micro-flujo)', 'Descubrir', 'Ver', 'Ver']);
  const v2 = fila(F, 'Misión', 'V2');
  expect(String(val(F, v2, 'Pantallas visitadas (ruta)'))).toContain('S03');   // llegó a la pantalla objetivo

  const U = await dump('UEQ');
  expect(U.rows.length).toBe(1);
  expect(val(U, U.rows[0], 'Formato')).toBe('UEQ-S');
  expect(val(U, U.rows[0], '6')).toBe(5);
  expect(val(U, U.rows[0], '1')).toBe('');

  const M = await dump('Marca A-B');
  expect(M.rows.length).toBe(3);
  expect(new Set(col(M, 'Pantalla ID'))).toEqual(new Set(['S02', 'S04', 'S05']));  // la marca también se evalúa sobre los mazos
  expect(col(M, 'Orden visto (auto)').every((x) => x === 'A→B')).toBe(true);
  expect(col(M, 'A · Agrado 1–7').every((x) => x === 5)).toBe(true);
  expect(col(M, 'B · Agrado 1–7').every((x) => x === 5)).toBe(true);
  expect(col(M, 'Preferencia directa (A/B/Igual)').every((x) => x === 'B')).toBe(true); // «Opción 2» con A→B

  const N = await dump('Notas');
  expect(N.rows.length).toBeGreaterThanOrEqual(1);

  const E = await dump('Eventos');
  expect(E.rows.length).toBeGreaterThan(200);
  const tipos = new Set(col(E, 'tipo'));
  for (const t of ['session.start', 'consent', 'phase.start', 'phase.end', 'screen.view', 'tap', 'task.start', 'task.end', 'answer', 'action', 'session.end']) expect(tipos.has(t), t).toBe(true);
  const ids = col(E, 'eventId');
  expect(new Set(ids).size).toBe(ids.length); // sin duplicados
  expect((await dump('Errores')).rows.length).toBe(0);
});
