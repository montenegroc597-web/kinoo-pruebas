import { afterEach, describe, it, expect } from 'vitest';
import { FLUJOS, MODULO_CONTROL, UMBRALES } from './catalog';
import { ESTUDIO_DEFECTO, aplicarEstudio, completarEstudio, pendientesEstudio, validarEstudio } from './estudio';
import { fisherExacta, puntajeClic, puntajeGesto, ueqS, veredicto, welch, wilson } from './metrics';
import { barajar, elegir, semillaDe } from './rotation';
import { COLUMNAS, HOJAS, ORDEN_EXCEL } from './schema';

afterEach(() => { aplicarEstudio(null); });

describe('protocolo v3.0: estructura', () => {
  it('links y orden fijo de las partes (§0)', () => {
    expect(FLUJOS.Completo).toEqual(['intro', 'descubrir', 'ver', 'mazos', 'percepcion']);
    expect(FLUJOS['Link 1']).toEqual(['intro', 'descubrir', 'ver', 'percepcion']);
    expect(FLUJOS['Link 2']).toEqual(['intro', 'moods']);
    // los moods ya no van en la prueba de flujos: solo en el cuestionario (Link 2)
    expect(FLUJOS.Completo).not.toContain('moods');
    expect(FLUJOS['Link 1']).not.toContain('moods');
    // el control de atención va en M5, o al final del cuestionario de moods en el Link 2
    expect(MODULO_CONTROL['Link 2']).toBe('moods');
    for (const f of Object.keys(FLUJOS) as (keyof typeof FLUJOS)[]) expect(FLUJOS[f]).toContain(MODULO_CONTROL[f]);
  });
  it('las hojas del Excel v2.0 existen con sus columnas exactas al principio', () => {
    expect(ORDEN_EXCEL).toEqual(['Participantes', 'Descubrir', 'Ver', 'Moods', 'Películas', 'Mazos', 'Percepción']);
    expect(COLUMNAS[HOJAS.participantes].slice(0, 3)).toEqual(['Código', 'Variante de card (A/B)', 'Fecha']);
    expect(COLUMNAS[HOJAS.descubrir].slice(0, 4)).toEqual(['Participante', 'Variante (auto)', 'Válido (auto)', 'D1a · Primer elemento que llamó la atención']);
    expect(COLUMNAS[HOJAS.percepcion]).toContain('F3 · UEQ-S ítem 21: claro (1) – confuso (7)');
    for (const h of ORDEN_EXCEL.slice(1)) expect(COLUMNAS[h].at(-1)).toBe('Row ID');
  });
});

describe('fórmulas del Excel v2.0', () => {
  it('Fisher exacta bilateral', () => {
    expect(fisherExacta(5, 5, 2, 5)).toBeCloseTo(0.1667, 3);
    expect(fisherExacta(10, 10, 0, 10)).toBeLessThan(0.001);
    expect(fisherExacta(3, 6, 3, 6)).toBeCloseTo(1, 5);
  });
  it('t de Welch bilateral (gl de Welch sin truncar; verificado integrando la densidad t)', () => {
    // t = 1,8974 y gl = 5,882 → p = 0,10753. El Excel trunca los gl a 5 (Anexo F) y da un p algo distinto.
    expect(welch([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(0.10753, 4);
    expect(welch([5, 6, 7], [5, 6, 7])).toBeCloseTo(1, 5);
    expect(welch([1], [2, 3])).toBeNull();
  });
  it('veredicto de tres niveles con el mínimo relevante y n pequeño', () => {
    expect(veredicto(0.01, 30, UMBRALES.difPorcentaje, 15, 15).veredicto).toBe('Diferencia clara');
    expect(veredicto(0.2, 25, UMBRALES.difPorcentaje, 15, 15).veredicto).toBe('Tendencia');
    expect(veredicto(0.6, 5, UMBRALES.difPorcentaje, 15, 15).veredicto).toBe('Sin diferencia');
    expect(veredicto(0.6, 5, UMBRALES.difPorcentaje, 8, 15).pequeno).toBe(true);
  });
  it('gesto de D2/D3 y primer clic de Z3', () => {
    const clave = { correcto: 'derecha', aceptables: ['Quiero verla'] };
    expect(puntajeGesto('drag:derecha', clave)).toBe(1);
    expect(puntajeGesto('tap:Quiero verla', clave)).toBe(0.5);
    expect(puntajeGesto('drag:izquierda', clave)).toBe(0);
    expect(puntajeClic(50, 50, { x1: 40, y1: 40, x2: 60, y2: 60 })).toBe(1);
    expect(puntajeClic(10, 10, { x1: 40, y1: 40, x2: 60, y2: 60 })).toBe(0);
    expect(puntajeClic(10, 10, null)).toBeNull();
  });
  it('UEQ-S: invierte los ítems con el polo positivo a la izquierda (Anexo C)', () => {
    const todoPositivo = { 6: 7, 7: 7, 10: 1, 15: 7, 11: 7, 13: 7, 20: 7, 21: 1 };
    expect(ueqS(todoPositivo)).toEqual({ pragmatica: 3, hedonica: 3, general: 3 });
    expect(ueqS({ 6: 4 }).general).toBeNull(); // una escala solo se calcula si respondió todos sus pares
  });
  it('intervalo de Wilson: con 15 personas, 70 % puede ser entre ~45 % y ~88 % (§0.2)', () => {
    const [lo, hi] = wilson(10.5, 15)!;
    expect(lo).toBeGreaterThan(40); expect(hi).toBeLessThan(90);
  });
});

describe('aleatorización determinista (§0)', () => {
  it('misma semilla → mismo orden; distinta semilla → otro orden', () => {
    const l = Array.from({ length: 8 }, (_, i) => i);
    expect(barajar(l, 7)).toEqual(barajar(l, 7));
    expect(barajar(l, 7)).not.toEqual(barajar(l, 8));
    expect(new Set(elegir(l, 3, semillaDe('abc'))).size).toBe(3);
  });
});

describe('«Config» del estudio', () => {
  it('los valores iniciales se pueden usar (sin errores), con pendientes del equipo', () => {
    expect(validarEstudio(ESTUDIO_DEFECTO)).toEqual([]);
    expect(pendientesEstudio(ESTUDIO_DEFECTO)).toEqual(expect.arrayContaining(['Qué cambia en la card B', 'Clave de corrección D4a']));
  });
  it('detecta distractores repetidos, películas fuera del catálogo y M3d repetida en M3c', () => {
    const e = completarEstudio({ ...ESTUDIO_DEFECTO, moods: [{ ...ESTUDIO_DEFECTO.moods[0], cercano: ESTUDIO_DEFECTO.moods[0].objetivo }, { ...ESTUDIO_DEFECTO.moods[1], neutra: 'No existe' }] });
    e.peliculasM3d = [{ titulo: e.moods[0].objetivo, moodPrevisto: e.moods[0].nombre }, ...e.peliculasM3d.slice(1)];
    const errores = validarEstudio(e).map((x) => x.error).join(' | ');
    expect(errores).toMatch(/deben ser distintos/);
    expect(errores).toMatch(/no está en el catálogo/);
    expect(errores).toMatch(/ya sale en M3c/);
  });
  it('una versión publicada parcial se completa y sus umbrales se aplican a las fórmulas', () => {
    aplicarEstudio({ umbrales: { ...ESTUDIO_DEFECTO.umbrales, duracionMinima: 9 } });
    expect(UMBRALES.duracionMinima).toBe(9);
    aplicarEstudio(null);
    expect(UMBRALES.duracionMinima).toBe(6);
  });
});
