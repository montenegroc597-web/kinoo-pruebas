import { describe, it, expect } from 'vitest';
import { normalizarNombre, formatoTitulo, nombreMostradoPara, asignar, siguienteCodigo } from './names';
import { ordenTareasPara, ordenMarcaPara, rotar, barajar } from './rotation';
import { clasificarClic, expandirZona, ueqTransformar, ueqEscalas, ueqS, binomialBilateral, votosMinimosGanador, veredictoAB, mediana, mapaCalor, celdaAXY, clasificarMision, wilson, semaforoPrimerClic, semaforoMiss } from './metrics';
import { UEQ_PARES, MISIONES, TAREAS, PANTALLAS } from './catalog';

describe('nombres repetidos', () => {
  it('normaliza tildes, mayúsculas y espacios', () => {
    expect(normalizarNombre('  JUÁN  ')).toBe('juan');
    expect(normalizarNombre('María   José')).toBe('maria jose');
  });
  it('formato título', () => {
    expect(formatoTitulo('maría  josé')).toBe('María José');
  });
  it('Juan 1, Juan 2, Juan 3 (todos llevan número)', () => {
    const ex: { codigo: string; nombreNorm: string; nombreBase?: string }[] = [];
    const out: string[] = [];
    for (const n of ['Juan', ' juan ', 'JUÁN']) {
      const a = asignar(n, ex, 's');
      out.push(a.nombreMostrado);
      ex.push({ codigo: a.codigo, nombreNorm: normalizarNombre(n), nombreBase: a.nombreMostrado.replace(/ \d+$/, '') });
    }
    expect(out).toEqual(['Juan 1', 'Juan 2', 'Juan 3']);
    expect(nombreMostradoPara('María José', [])).toBe('María José 1');
  });
  it('otro nombre no incrementa', () => {
    expect(nombreMostradoPara('Ana', [{ codigo: 'P01', nombreNorm: 'juan' }])).toBe('Ana 1');
  });
  it('códigos secuenciales sin reiniciar', () => {
    expect(siguienteCodigo([]).codigo).toBe('P01');
    expect(siguienteCodigo([{ codigo: 'P01', nombreNorm: 'a' }, { codigo: 'P09', nombreNorm: 'b' }]).codigo).toBe('P10');
    expect(siguienteCodigo([{ codigo: 'TMP-xx', nombreNorm: 'a' }]).codigo).toBe('P01');
  });
});

describe('rotación (Anexo E)', () => {
  it('P01..P12', () => {
    expect(ordenTareasPara(1)).toBe('T1-T2-T5-T3-T4');
    expect(ordenTareasPara(2)).toBe('T2-T3-T1-T4-T5');
    expect(ordenTareasPara(3)).toBe('T3-T4-T2-T5-T1');
    expect(ordenTareasPara(4)).toBe('T4-T5-T3-T1-T2');
    expect(ordenTareasPara(5)).toBe('T5-T1-T4-T2-T3');
    expect(ordenTareasPara(6)).toBe('T1-T2-T5-T3-T4');
    expect(ordenTareasPara(12)).toBe('T2-T3-T1-T4-T5');
  });
  it('marca alterna', () => {
    expect(ordenMarcaPara(1)).toBe('A→B');
    expect(ordenMarcaPara(2)).toBe('B→A');
  });
  it('rotar y barajar son deterministas', () => {
    expect(rotar([1, 2, 3], 2)).toEqual([2, 3, 1]);
    expect(barajar([1, 2, 3, 4, 5], 7)).toEqual(barajar([1, 2, 3, 4, 5], 7));
    expect(barajar([1, 2, 3, 4, 5], 7).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('clasificación de clics', () => {
  const z = { correcta: { x1: 10, y1: 10, x2: 30, y2: 20 }, aceptable: { x1: 50, y1: 50, x2: 60, y2: 60 } };
  it('correcto / aceptable / miss / sin zona', () => {
    expect(clasificarClic(15, 15, z)).toBe('Correcto');
    expect(clasificarClic(55, 55, z)).toBe('Aceptable');
    expect(clasificarClic(90, 90, z)).toBe('Miss click');
    expect(clasificarClic(1, 1, {})).toBe('Sin zona definida');
  });
  it('expande zonas pequeñas al mínimo', () => {
    const r = expandirZona({ x1: 40, y1: 40, x2: 42, y2: 42 }, 11.3, 5.2);
    expect(r.x2 - r.x1).toBeGreaterThanOrEqual(11.3 - 1e-9);
    expect(r.y2 - r.y1).toBeGreaterThanOrEqual(5.2 - 1e-9);
  });
});

describe('UEQ', () => {
  it('hay 26 pares', () => { expect(UEQ_PARES.length).toBe(26); });
  it('transforma según polaridad', () => {
    expect(ueqTransformar(1, 7)).toBe(3);
    expect(ueqTransformar(3, 1)).toBe(3);
    expect(ueqTransformar(1, 4)).toBe(0);
  });
  it('escalas solo con todos sus pares', () => {
    const all: Record<number, number> = {};
    for (let i = 1; i <= 26; i++) all[i] = 7;
    expect(ueqEscalas(all).Atractivo).not.toBeNull();
    const parcial = { ...all }; delete parcial[12];
    expect(ueqEscalas(parcial).Atractivo).toBeNull();
  });
  it('UEQ-S', () => {
    // hedónica 6,7,10,15 ; pragmática 11,13,20,21. 6,7 (+)=7→+3; 10 (−)=1→+3; 15 (+)=7→+3; 11(+)=7; 13(+)=7; 20(+)=7; 21(−)=1
    const r: Record<number, number> = { 6: 7, 7: 7, 10: 1, 15: 7, 11: 7, 13: 7, 20: 7, 21: 1 };
    const s = ueqS(r);
    expect(s.hedonica).toBeCloseTo(3);
    expect(s.pragmatica).toBeCloseTo(3);
    expect(s.general).toBeCloseTo(3);
    expect(ueqS({}).general).toBeNull();
  });
});

describe('binomial A/B (tabla del protocolo §4.5)', () => {
  it.each([[8, 8], [10, 9], [12, 10], [16, 13], [20, 15], [30, 21]])('n=%i necesita %i votos', (n, min) => {
    expect(votosMinimosGanador(n)).toBe(min);
  });
  it('10 de 12 gana, 8 de 12 no', () => {
    expect(veredictoAB(10, 2).ganador).toBe('A');
    expect(veredictoAB(8, 4).ganador).toBeNull();
    expect(veredictoAB(1, 11).ganador).toBe('B');
  });
  it('p = 1 con empate', () => {
    expect(binomialBilateral(5, 10)).toBeCloseTo(1);
  });
});

describe('utilidades', () => {
  it('mediana', () => { expect(mediana([3, 1, 2])).toBe(2); expect(mediana([1, 2, 3, 4])).toBe(2.5); expect(mediana([])).toBeNull(); });
  it('mapa de calor 10×20', () => {
    const g = mapaCalor([{ x: 0, y: 0 }, { x: 99.9, y: 99.9 }, { x: 15, y: 7 }]);
    expect(g[0][0]).toBe(1); expect(g[19][9]).toBe(1); expect(g[1][1]).toBe(1);
  });
  it('celda → xy', () => { expect(celdaAXY('C7')).toEqual({ x: 25, y: 32.5 }); expect(celdaAXY('Z9')).toBeNull(); });
  it('Wilson 8/10 ≈ 49–94', () => { const [a, b] = wilson(8, 10)!; expect(a).toBeGreaterThan(48); expect(a).toBeLessThan(50); expect(b).toBeGreaterThan(93); expect(b).toBeLessThan(95); });
  it('semáforos', () => { expect(semaforoPrimerClic(85)).toBe('verde'); expect(semaforoPrimerClic(70)).toBe('amarillo'); expect(semaforoPrimerClic(40)).toBe('rojo'); expect(semaforoMiss(10)).toBe('verde'); expect(semaforoMiss(50)).toBe('rojo'); });
});

describe('misiones', () => {
  const esp = ['S01', 'S06', 'S05'];
  it('directo con repeticiones', () => {
    expect(clasificarMision({ exito: true, abandono: false, tiempoAgotado: false, error: false, ruta: ['S01', 'S01', 'S06', 'S05'], rutaEsperada: esp })).toBe('Éxito directo');
  });
  it('indirecto con desvío', () => {
    expect(clasificarMision({ exito: true, abandono: false, tiempoAgotado: false, error: false, ruta: ['S01', 'S08', 'S06', 'S05'], rutaEsperada: esp })).toBe('Éxito indirecto');
  });
  it('abandono, tiempo, error', () => {
    const b = { exito: false, abandono: false, tiempoAgotado: false, error: false, ruta: [], rutaEsperada: esp };
    expect(clasificarMision({ ...b, abandono: true })).toBe('Abandono');
    expect(clasificarMision({ ...b, tiempoAgotado: true })).toBe('Fallo por tiempo');
    expect(clasificarMision({ ...b, error: true })).toBe('Error de flujo');
  });
});

describe('catálogo', () => {
  it('5 tareas y 7 misiones consistentes', () => {
    expect(TAREAS.map((t) => t.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5']);
    expect(MISIONES.map((m) => m.id)).toEqual(['D1', 'M1', 'D2', 'M2', 'V1', 'V2', 'V3']);
    const ids = new Set(PANTALLAS.map((p) => p.id));
    for (const t of TAREAS) expect(ids.has(t.pantalla)).toBe(true);
    for (const m of MISIONES) expect(ids.has(m.pantallaInicio)).toBe(true);
  });
});
