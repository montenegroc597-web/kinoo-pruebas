// @vitest-environment node
// La analítica del Panel v2.0 sobre datos sembrados en el backend REAL (migraciones de Supabase sobre PGlite).
import { describe, it, expect, beforeAll } from 'vitest';
import { aplicarEstudio } from '@kinoo/tracking';
// @ts-expect-error módulo .mjs sin tipos
import { crearBackend } from '../../../e2e/pg-backend.mjs';
// @ts-expect-error módulo .mjs sin tipos
import { ESTUDIO_SEED, VALIDAS, sembrar } from '../../../e2e/seed.mjs';
import { comparacionAB, descubrir, mazos, moods, percepcion, personas, puntos, resumen, salud, ver, type Datos } from './analytics';

let datos: Datos;

beforeAll(async () => {
  const b = await crearBackend();
  await sembrar((x: any) => b.post(x));
  // igual que el Panel: la «Config» publicada, las hojas sin «Eventos» y el resumen de eventos que calcula el servidor
  aplicarEstudio((await b.post({ action: 'config', key: 'R', clave: 'estudio' })).data.estudio);
  const hojas = (await b.post({ action: 'dump', key: 'R', excluir: ['Eventos'] })).data;
  const eventos = (await b.post({ action: 'resumen-eventos', key: 'R' })).data;
  datos = { hojas, eventos };
});

const ind = (lista: { id: string; valor: number | null; estado: string }[], id: string) => lista.find((i) => i.id === id)!;

describe('analítica del Panel v2.0 (contra el backend real)', () => {
  it('validez: completó, control de atención, duración y exclusión; el piloto no cuenta', () => {
    expect(ESTUDIO_SEED.umbrales.duracionMinima).toBe(0);
    const ps = personas(datos);
    expect(ps.length).toBe(12);
    expect(ps.filter((p) => p.valido).length).toBe(VALIDAS);
    expect(ps.find((p) => p.codigo === 'P11')!.motivos).toContain('no completó');
    expect(ps.find((p) => p.codigo === 'P12')!.motivos).toContain('falló el control de atención');
    expect(personas(datos, true).length).toBe(13);
    expect(ps.filter((p) => p.variante === 'A').map((p) => p.codigo).slice(0, 3)).toEqual(['P01', 'P03', 'P05']); // A, B, A, B…
  });
  it('resumen: personas válidas por card y descartes', () => {
    const r = resumen(datos);
    expect(r.validas).toBe(10);
    expect(r.porCard).toEqual({ A: 5, B: 5 });
    expect(r.descartes.map(([m]) => m)).toEqual(expect.arrayContaining(['no completó', 'falló el control de atención']));
  });
  it('M1 · Descubrir: gestos, comprensión y sorpresa, también por card', () => {
    const t = descubrir(datos);
    expect(ind(t.indicadores, 'D2').valor).toBeCloseTo(70); // 5 + 2 de 10
    expect(ind(t.indicadores, 'D2').estado).toBe('amarillo');
    expect(ind(t.indicadores, 'D1b').valor).toBeCloseTo(90);
    expect(ind(t.indicadores, 'D1a').valor).toBeCloseTo(80);
    expect(ind(t.indicadores, 'D4c').valor).toBeCloseTo(50);
    expect(ind(t.indicadores, 'D4').valor).toBeCloseTo(90);
    expect(ind(t.indicadores, 'D4e').valor).toBeCloseTo(6);
    expect(ind(descubrir(datos, false, 'A').indicadores, 'D2').valor).toBeCloseTo(100);
    expect(ind(descubrir(datos, false, 'B').indicadores, 'D2').valor).toBeCloseTo(40);
    expect(t.gestos.d2[0]).toEqual(['drag:derecha', 7]);
  });
  it('M2 · Ver: lectura combinada del filtro (no se entiende solo, pero sirve)', () => {
    const t = ver(datos);
    expect(ind(t.indicadores, 'V1c').valor).toBeCloseTo(20);
    expect(ind(t.indicadores, 'V1c').estado).toBe('rojo');
    expect(t.lectura).toMatch(/concepto sirve/);
    expect(ind(t.indicadores, 'V2').valor).toBeCloseTo(80);
    expect(ind(t.indicadores, 'V4').valor).toBe(6);
  });
  it('M3 · Moods: acierto, confusión, acción sugerida y nombres propios', () => {
    const t = moods(datos);
    const sufrir = t.porMood.find((m) => m.mood === 'Sufrir bonito')!, raro = t.porMood.find((m) => m.mood === 'Algo raro')!;
    expect(sufrir.acierto).toBeCloseTo(80);
    expect(sufrir.confusiones[0]).toEqual(['Sentir algo', 2]);
    expect(raro.acierto).toBeCloseTo(30);
    expect(raro.accion).toMatch(/Renombrar/);
    expect(t.total).toBeCloseTo(55);
    const titanic = t.porPelicula.find((p) => p.titulo === 'Titanic')!;
    expect(titanic.coincide).toBeCloseTo(70);
    expect(titanic.nombres).toContainEqual(['drama de amor', 4]); // repetido por ≥ 3 personas: candidato a nombre del mood
  });
  it('M4 · Mazos y M5 · Percepción', () => {
    const z = mazos(datos);
    expect(ind(z.indicadores, 'Z1').valor).toBeCloseTo(50);
    expect(ind(z.indicadores, 'Z2').valor).toBeCloseTo(75);
    expect(ind(z.indicadores, 'Z3').valor).toBeCloseTo(80);
    expect(ind(z.indicadores, 'Z4').valor).toBeCloseTo(50);
    const f = percepcion(datos);
    expect(ind(f.indicadores, 'UEQG').valor).toBeCloseTo(3);
    expect(ind(f.indicadores, 'UEQG').estado).toBe('verde');
    expect(ind(f.indicadores, 'F1').valor).toBe(6);
  });
  it('card A vs B: Fisher y Welch, veredictos y regla de decisión con las primarias', () => {
    const c = comparacionAB(datos);
    expect(c.metricas.length).toBe(22);
    const d2 = c.metricas.find((m) => m.id === 'D2')!;
    expect(d2.p).toBeCloseTo(0.1667, 3);                 // Fisher 5/5 vs 2/5
    expect(d2.veredicto).toBe('Tendencia');              // 60 puntos ≥ 20, pero no significativa
    const d1d = c.metricas.find((m) => m.id === 'D1d')!;
    expect(d1d.veredicto).toBe('Diferencia clara');      // 6 frente a 3, sin varianza
    expect(d1d.favorece).toBe('A');
    expect(c.gana).toBe('A');
    expect(c.pequeno).toBe(true);                        // 5 por card < 12
  });
  it('puntos: solo de personas válidas; salud: eventos, errores y sin terminar', () => {
    expect(puntos(datos).length).toBe(1);
    const s = salud(datos);
    expect(s.eventos).toBe(3);
    expect(s.errores.length).toBe(1);
    expect(s.incompletos.map((p) => p['Código'])).toEqual(expect.arrayContaining(['P11']));
  });
});
