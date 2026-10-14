import { afterEach, describe, it, expect } from 'vitest';
import { DESCUBRIR_TEXTOS, INTRO_PREGUNTAS, MOODS_TEXTOS, VER_TEXTOS } from './catalog';
import { aplicarTextos, camposTexto, rellenar, soloCambios, textosActivos, validarTextos } from './textos';

afterEach(() => { aplicarTextos({}); });

describe('textos editables del protocolo v2.0', () => {
  it('registra cada texto que ve la persona, con clave única y parte', () => {
    const c = camposTexto();
    expect(new Set(c.map((x) => x.clave)).size).toBe(c.length);
    expect(c.length).toBeGreaterThan(55);
    for (const clave of ['link.bienvenida', 'link.final', 'intro.I1', 'descubrir.D1a', 'descubrir.D4c', 'ver.V2', 'ver.V3', 'moods.M3c', 'mazos.Z3', 'percepcion.control', 'percepcion.F3']) {
      expect(c.some((x) => x.clave === clave), clave).toBe(true);
    }
    expect(c.every((x) => x.fase >= 0 && x.fase <= 5)).toBe(true);
  });
  it('sin cambios publicados se lee el texto exacto del protocolo', () => {
    expect(DESCUBRIR_TEXTOS.D2).toBe('Ahora puedes usar la pantalla. Imagina que esta película te llama la atención. Haz lo que harías.');
    expect(INTRO_PREGUNTAS.I1).toBe('¿Cuántos años tienes?');
  });
  it('una redacción publicada cambia lo que leen las pantallas', () => {
    aplicarTextos({ 'descubrir.D1a': '¿Qué viste primero?', 'ver.V3': 'Con este filtro eliges según tu ánimo.' });
    expect(DESCUBRIR_TEXTOS.D1a).toBe('¿Qué viste primero?');
    expect(VER_TEXTOS.V3).toBe('Con este filtro eliges según tu ánimo.');
  });
  it('los objetos editables no se pueden modificar desde el código', () => {
    expect(() => { (DESCUBRIR_TEXTOS as Record<string, string>).D1a = 'x'; }).toThrow();
  });
  it('validación: clave desconocida, vacío, largo, marcadores y anclas de la escala', () => {
    const e = validarTextos({
      'no.existe': 'x', 'descubrir.D1b': '   ', 'descubrir.D1c': 'x'.repeat(701),
      'moods.M3a': '¿Qué esperarías en esta categoría?', 'descubrir.D1d': '¿Cuántas ganas te dio?', 'ver.V1a': '¿Para qué sirve?',
    });
    const de = (k: string) => e.filter((x) => x.clave === k).map((x) => x.error).join(' ');
    expect(de('no.existe')).toMatch(/no existe/);
    expect(de('descubrir.D1b')).toMatch(/vacío/);
    expect(de('descubrir.D1c')).toMatch(/700/);
    expect(de('moods.M3a')).toMatch(/\{mood\}/);
    expect(de('descubrir.D1d')).toMatch(/escala/);
    expect(de('ver.V1a')).toBe('');
  });
  it('un texto inválido no se aplica: se queda el del protocolo', () => {
    const r = aplicarTextos({ 'descubrir.D1d': 'sin anclas', 'descubrir.D1a': '¿Qué notaste primero?' });
    expect(r.ignorados).toEqual(['descubrir.D1d']);
    expect(DESCUBRIR_TEXTOS.D1d).toMatch(/^Del 1 al 7/);
    expect(DESCUBRIR_TEXTOS.D1a).toBe('¿Qué notaste primero?');
  });
  it('solo se guardan los textos que difieren del protocolo', () => {
    expect(soloCambios({ 'descubrir.D1a': DESCUBRIR_TEXTOS.D1a, 'descubrir.D1b': 'Cambiado' })).toEqual({ 'descubrir.D1b': 'Cambiado' });
    aplicarTextos({ 'descubrir.D1a': DESCUBRIR_TEXTOS.D1a });
    expect(textosActivos()).toEqual({});
  });
  it('rellenar reemplaza los marcadores', () => {
    expect(rellenar(MOODS_TEXTOS.M3c, { mood: 'Épica' })).toBe('¿Cuál de estas 4 películas encaja mejor con «Épica»?');
  });
});
