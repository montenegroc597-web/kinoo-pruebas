import { describe, it, expect } from 'vitest';
import { MISIONES, MISIONES_BASE, clasificarMision } from '@kinoo/tracking';
import { EXITO, pasosAlcanzados, type Item } from './misiones';

const s = (name: string): Item => ({ k: 's', name });
const a = (name: string, extra?: Record<string, unknown>): Item => ({ k: 'a', name, extra });
const mision = (id: string) => MISIONES.find((m) => m.id === id)!;

describe('misiones: éxito = llegar a la pantalla objetivo', () => {
  it('las 5 misiones de la ronda: D1, M1, D2, V2, V3 (cada una arranca en su pantalla inicial)', () => {
    expect(MISIONES_BASE).toEqual(['D1', 'M1', 'D2', 'V2', 'V3']);
    expect(mision('D1').pantallaInicio).toBe('S01');
    expect(mision('M1').pantallaInicio).toBe('S05');
    expect(mision('D2').pantallaInicio).toBe('S02');
    expect(mision('V2').pantallaInicio).toBe('S04');
  });

  it('D1: solo cuenta al llegar a «Tus mazos» después de elegir mood', () => {
    expect(EXITO.D1([s('S01'), a('mood.picked'), s('S01.sheet')])).toBe(false);
    expect(EXITO.D1([s('S01'), a('mood.picked'), a('mood.continue'), s('S06')])).toBe(false);
    expect(EXITO.D1([s('S01'), a('mood.picked'), a('mood.continue'), s('S06'), s('S05')])).toBe(true);
  });

  it('M1: reparte el mazo Nolan Y llega a las cartas (no basta con elegirlo)', () => {
    expect(EXITO.M1([s('S05'), a('deck.dealt', { deck: 'nolan' }), s('S05.barajando')])).toBe(false);
    expect(EXITO.M1([s('S05'), a('deck.dealt', { deck: 'other' }), s('S02')])).toBe(false);
    expect(EXITO.M1([s('S05'), a('deck.dealt', { deck: 'nolan' }), s('S05.listo'), s('S02')])).toBe(true);
  });

  it('D2: llega a «Mazo terminado» recorriendo las cartas, decida lo que decida', () => {
    expect(EXITO.D2([s('S02'), a('mark.ring'), a('mark.x')])).toBe(false);
    expect(EXITO.D2([s('S02'), a('mark.x'), a('mark.x'), a('mark.x'), s('S02.fin')])).toBe(true);
  });

  it('V2: sale a la plataforma y llega a la hoja de calificación (S03 exacto, no «¿la viste?»)', () => {
    expect(EXITO.V2([s('S04'), a('platform.opened'), s('S04.away'), s('S03.back')])).toBe(false);
    expect(EXITO.V2([s('S04'), s('S03')])).toBe(false);
    expect(EXITO.V2([s('S04'), a('platform.opened'), s('S04.away'), s('S03.back'), s('S03')])).toBe(true);
  });

  it('V3: quitar El Faro Mudo', () => {
    expect(EXITO.V3([s('S08'), a('space.removed:marea')])).toBe(false);
    expect(EXITO.V3([s('S08'), a('space.removed:faro')])).toBe(true);
  });

  it('embudo: marca los pasos alcanzados en orden', () => {
    const tr = [s('S04'), a('ver.watch'), a('platform.opened'), s('S04.away')];
    expect(pasosAlcanzados(mision('V2'), tr)).toEqual([true, true, false, false, false]);
    expect(pasosAlcanzados(mision('D2'), [s('S02'), a('card.flip'), a('mark.x'), a('mark.ring'), a('mark.dot'), s('S02.fin')])).toEqual([true, true, true, true]);
  });

  it('la ruta esperada de cada misión empieza en su pantalla inicial', () => {
    for (const m of MISIONES) expect(m.rutaEsperada[0]).toBe(m.pantallaInicio);
  });

  it('recorrer la ruta esperada es éxito directo; pasar por otra pantalla, indirecto', () => {
    const m = mision('V2');
    const base = { exito: true, abandono: false, tiempoAgotado: false, error: false, rutaEsperada: m.rutaEsperada };
    expect(clasificarMision({ ...base, ruta: ['S04', 'S04.sheet-plat', 'S04.away', 'S03.back', 'S03'] })).toBe('Éxito directo');
    expect(clasificarMision({ ...base, ruta: ['S04', 'S08', 'S04', 'S04.sheet-plat', 'S04.away', 'S03.back', 'S03'] })).toBe('Éxito indirecto');
  });
});
