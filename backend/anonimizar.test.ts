// @vitest-environment node
import { describe, it, expect } from 'vitest';
// @ts-expect-error módulo .mjs sin tipos
import { anonimizar, tachar, palabrasPersonales } from '../scripts/anonimizar.mjs';

const dump = {
  Participantes: { headers: ['Código', 'Nombre ingresado', 'Nombre mostrado', 'Notas'], rows: [['P01', 'María José', 'María José 1', 'dice que Maria Jose ve poco'], ['P02', 'Juan', 'Juan 1', '']] },
  Notas: { headers: ['Participante', 'Nombre mostrado', 'Texto'], rows: [['P01', 'María José 1', 'Mi amigo Juan me la recomendó, juanes no cuenta'], ['P02', 'Juan 1', 'Me gustó MARÍA']] },
  'Primer clic + SEQ': { headers: ['Participante', 'SEQ 1–7'], rows: [['P01', 6]] },
};

describe('anonimización para el repositorio público', () => {
  it('quita las columnas con nombres en todas las hojas', () => {
    const a = anonimizar(dump);
    for (const h of Object.values(a) as any[]) { expect(h.headers).not.toContain('Nombre ingresado'); expect(h.headers).not.toContain('Nombre mostrado'); }
    expect(a['Primer clic + SEQ'].rows).toEqual([['P01', 6]]); // lo demás queda intacto
  });
  it('tacha los nombres de los participantes dentro de respuestas abiertas (sin tildes ni mayúsculas)', () => {
    const a = anonimizar(dump);
    const notas = a.Notas.rows.map((r: any[]) => r[1]);
    expect(notas[0]).toBe('Mi amigo [nombre] me la recomendó, juanes no cuenta'); // palabra completa solamente
    expect(notas[1]).toBe('Me gustó [nombre]');
    expect(a.Participantes.rows[0][1]).toBe('dice que [nombre] [nombre] ve poco');
  });
  it('conserva el código que enlaza las hojas', () => {
    const a = anonimizar(dump);
    expect(a.Participantes.rows.map((r: any[]) => r[0])).toEqual(['P01', 'P02']);
    expect(a.Notas.rows.map((r: any[]) => r[0])).toEqual(['P01', 'P02']);
  });
  it('palabras personales: ≥ 3 letras, sin tildes', () => {
    expect(palabrasPersonales(dump)).toEqual(expect.arrayContaining(['maria', 'jose', 'juan']));
  });
  it('tachar no rompe textos vacíos ni números', () => {
    expect(tachar('', ['juan'])).toBe('');
    expect(tachar(5 as any, ['juan'])).toBe(5);
  });
});
