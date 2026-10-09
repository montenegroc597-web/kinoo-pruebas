// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
// @ts-expect-error módulo .mjs sin tipos
import { crearBackend } from '../../../e2e/fake-gas.mjs';
// @ts-expect-error módulo .mjs sin tipos
import { sembrar } from '../../../e2e/seed.mjs';
import { cards, cincoSeg, flujos, marca, participantes, primerClic, puntos, resumen, salud, ueq, type Dump } from './analytics';

let dump: Dump;
const N = 10;

beforeAll(async () => {
  const b = await crearBackend();
  await sembrar((x: any) => b.post(x));
  dump = b.get({ action: 'dump', key: 'R' }).data;
});

describe('analítica del Panel (contra el Sheet simulado)', () => {
  it('el piloto (ronda 0) se excluye por defecto', () => {
    expect(participantes(dump).length).toBe(N);
    expect(participantes(dump, true).length).toBe(N + 1);
  });
  it('resumen: personas, fases y semáforos', () => {
    const r = resumen(dump);
    expect(r.n).toBe(N);
    expect(r.completos).toBe(8);
    expect(r.ind.find((x) => x.prueba === 'Primer clic')!.valor).toBeCloseTo(70); // (90 + 50) / 2
    expect(r.ind.find((x) => x.prueba === 'Primer clic')!.estado).toBe('amarillo');
    expect(r.ind.find((x) => x.prueba === 'Marca A/B')!.estado).toBe('verde');
  });
  it('5 segundos: propósito y acción desde los puntajes codificados', () => {
    const c = cincoSeg(dump).porPantalla[0];
    expect(c.proposito).toBeCloseTo(90);
    expect(c.accion).toBeCloseTo(60);
    expect(c.claridad).toBe(6);
    expect(c.semProposito).toBe('verde');
    expect(c.semAccion).toBe('amarillo');
  });
  it('cards: atención 80 %, dependencia de la película detectada', () => {
    const c = cards(dump);
    expect(c.atencion).toBeCloseTo(80);
    expect(c.interesConocidas).toBe(6); expect(c.interesNoConocidas).toBe(3);
    expect(c.alertaDependePelicula).toBe(true); // 3 puntos de diferencia > 1,5
    expect(c.faltante[0]).toEqual(['la duración', 10]);
  });
  it('primer clic por tarea: %, mediana, miss, SEQ acertados vs fallados y elemento «robado»', () => {
    const p = primerClic(dump);
    const t1 = p.porTarea.find((t) => t.tarea === 'T1')!, t2 = p.porTarea.find((t) => t.tarea === 'T2')!;
    expect(t1.correcto).toBeCloseTo(90); expect(t1.semCorrecto).toBe('verde');
    expect(t2.correcto).toBeCloseTo(50); expect(t2.semCorrecto).toBe('rojo');
    expect(t2.seqAcertaron).toBe(6); expect(t2.seqFallaron).toBe(3);
    expect(t2.seqBajo).toBeCloseTo(50);
    expect(t2.missPct).toBeCloseTo(50); // 10 miss de 20 clics
    expect(t2.elementoRobado!.target).toBe('S02.card');
    expect(t2.elementoRobado!.pct).toBeCloseTo(66.7, 0);
    expect(t1.medianaTiempo).toBeCloseTo(2.55, 1);
  });
  it('flujos: éxito directo/indirecto/abandono, embudo y salidas', () => {
    const d1 = flujos(dump).porMision.find((m) => m.mision === 'D1')!;
    expect(d1.directos).toBe(8); expect(d1.indirectos).toBe(1); expect(d1.abandonos).toBe(1);
    expect(d1.exito).toBeCloseTo(90); expect(d1.directo).toBeCloseTo(80); expect(d1.abandono).toBeCloseTo(10);
    expect(d1.embudo.map((e) => e.n)).toEqual([10, 10, 9, 9]);
    expect(d1.salidas).toEqual([['S08', 1]]);
    expect(d1.desvios[0]).toEqual(['S08', 2]);
  });
  it('UEQ-S: pragmática y hedónica +3 → verde', () => {
    const u = ueq(dump);
    expect(u.pragmatica).toBeCloseTo(3); expect(u.hedonica).toBeCloseTo(3); expect(u.semGen).toBe('verde');
    expect(u.items.length).toBe(8);
    expect(u.comentarios).toEqual(['Más claridad']);
  });
  it('marca: 9 de 10 votos decisivos para B gana con binomial', () => {
    const m = marca(dump);
    expect(m.preferencia.a).toBe(1); expect(m.preferencia.b).toBe(9);
    expect(m.preferencia.ganador).toBe('B');
    expect(m.agradoB).toBe(6); expect(m.agradoA).toBe(4);
    expect(m.dosAtributosB).toBe(100); expect(m.dosAtributosA).toBe(0);
    expect(m.jerarquiaB).toBeCloseTo(80); expect(m.jerarquiaA).toBe(100);
    expect(m.palabrasA[0]).toEqual(['oscura', 10]);
  });
  it('puntos: excluye participantes que no existen', () => {
    expect(puntos(dump).length).toBe(1);
  });
  it('salud: sesiones activas, errores, incompletos y zonas sin definir', () => {
    const s = salud(dump);
    expect(s.activas.length).toBe(2);
    expect(s.errores.length).toBe(1);
    expect(s.incompletos.length).toBe(3); // 2 con 2 fases + el piloto con 0
    expect(s.sinZona.length).toBe(5);
  });
});
