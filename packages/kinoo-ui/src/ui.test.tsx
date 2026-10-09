import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { Frame, ProductApp, SEED_ROUTE, type SeedId, type Tracker } from './index';

// jsdom no trae algunas APIs
beforeEach(() => {
  (HTMLElement.prototype as any).setPointerCapture = () => {};
  (HTMLElement.prototype as any).releasePointerCapture = () => {};
  vi.useFakeTimers();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

function montar(seed: SeedId, brand: 'A' | 'B' = 'A') {
  const log: string[] = [];
  const tracker: Tracker = { screen: (id) => log.push('screen:' + id), action: (n, e) => log.push('action:' + n + (e?.deck ? ':' + e.deck : '')) };
  const r = render(<Frame brand={brand} scale={1}><ProductApp seed={seed} tracker={tracker} /></Frame>);
  const q = (sel: string) => r.container.querySelector(sel) as HTMLElement | null;
  const click = (track: string) => { const el = q(`[data-track="${track}"]`); if (!el) throw new Error('no existe data-track=' + track + ' en ' + log.filter((l) => l.startsWith('screen:')).slice(-1)); act(() => { fireEvent.click(el); }); };
  const avanzar = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
  return { ...r, q, click, log, avanzar };
}
const SEEDS = Object.keys(SEED_ROUTE) as SeedId[];

describe('toda la interfaz interactiva es rastreable', () => {
  it.each(SEEDS)('seed %s: cada button/input tiene data-track', (seed) => {
    const { container } = montar(seed);
    const sin = [...container.querySelectorAll('button, a, input, [role="button"]')].filter((e) => !(e as HTMLElement).dataset.track);
    expect(sin.map((e) => e.outerHTML.slice(0, 90))).toEqual([]);
  });
  it.each(SEEDS)('seed %s en versión B también', (seed) => {
    const { container } = montar(seed, 'B');
    expect(container.querySelector('[data-brand="kino"]')).not.toBeNull();
    const sin = [...container.querySelectorAll('button, a, input')].filter((e) => !(e as HTMLElement).dataset.track);
    expect(sin.length).toBe(0);
  });
  it('Comunidad no existe en ninguna pantalla', () => {
    for (const seed of SEEDS) {
      const { container, unmount } = montar(seed);
      expect(container.textContent).not.toMatch(/Comunidad/);
      unmount();
    }
  });
});

describe('las zonas de cada tarea existen en su semilla (primer clic)', () => {
  it('T1 · ver-back → botón «Sí»', () => { const { q } = montar('ver-back'); expect(q('[data-zone="T1.correcta"]')?.textContent).toBe('Sí'); });
  it('T2 · deck-nolan-start → indicadores del card (+ cuerpo como aceptable)', () => { const { container } = montar('deck-nolan-start'); expect(container.querySelectorAll('[data-zone="T2.correcta"]').length).toBe(4); expect(container.querySelector('[data-zone="T2.aceptable"]')).not.toBeNull(); });
  it('T3 · fresh → pestaña Ver', () => { const { q } = montar('fresh'); expect(q('[data-zone="T3.correcta"]')?.textContent).toBe('Ver'); });
  it('T4 · deck-finished → «Cuéntanos cómo vas»', () => { const { q } = montar('deck-finished'); expect(q('[data-zone="T4.correcta"]')?.textContent).toContain('Cuéntanos cómo vas'); });
  it('T5 · ver-pool → botón «Otra» (+ tarjeta como aceptable)', () => { const { q } = montar('ver-pool'); expect(q('[data-zone="T5.correcta"]')?.textContent).toBe('Otra'); expect(q('[data-zone="T5.aceptable"]')).not.toBeNull(); });
});

describe('flujos de las misiones', () => {
  it('D1 · mood → frase → continuar → lectura → mazos', () => {
    const m = montar('fresh');
    m.click('S01.mood-apagar');
    expect(m.container.textContent).toContain('una frase para hoy');
    m.click('S01.continuar');
    expect(m.container.textContent).toContain('Hoy buscas Apagar el cerebro');
    m.click('S06.ver-mazos');
    expect(m.container.textContent).toContain('Tus mazos');
    expect(m.log).toEqual(expect.arrayContaining(['screen:S01', 'screen:S01.sheet', 'screen:S06', 'screen:S05', 'action:mood.picked', 'action:mood.continue']));
  });

  it('M1 · con un mazo en curso, pedir Nolan → confirma → baraja → listo → empezar', () => {
    const m = montar('mazos-en-curso');
    expect(m.container.textContent).toContain('Mazo en curso');
    m.click('S05.deck-nolan');
    m.click('S05.otro-barajar');
    expect(m.container.textContent).toContain('¿Abrir otro mazo?');
    expect(m.log).toContain('screen:S05.confirm');
    m.click('S05.abrir-otro');
    expect(m.log).toContain('action:deck.dealt:nolan');
    expect(m.container.textContent).toContain('barajando');
    m.avanzar(2000);
    expect(m.container.textContent).toContain('tu mazo está listo');
    m.click('S05.empezar');
    expect(m.log).toContain('screen:S02');
  });

  it('M1 · sin mazo en curso baraja directo (sin confirmación)', () => {
    const m = montar('fresh');
    m.click('S01.mood-sufrir'); m.click('S01.continuar'); m.click('S06.ver-mazos');
    m.click('S05.hero-barajar');
    expect(m.container.textContent).not.toContain('¿Abrir otro mazo?');
    expect(m.container.textContent).toContain('barajando');
  });

  it('D2 · ↑ bloqueado con la carta de frente; voltear lo habilita; ○ ✕ ● y deshacer', () => {
    const m = montar('deck-nolan-start');
    expect((m.q('[data-track="S02.btn-vista"]') as HTMLButtonElement).disabled).toBe(true);
    m.click('S02.card');
    expect(m.log).toContain('screen:S02.flipped');
    expect((m.q('[data-track="S02.btn-vista"]') as HTMLButtonElement).disabled).toBe(false);
    m.click('S02.btn-vista'); m.avanzar(400);
    expect(m.log).toContain('action:mark.dot');
    m.click('S02.btn-no'); m.avanzar(400);
    expect(m.log).toContain('action:mark.x');
    m.click('S02.btn-quiero'); m.avanzar(400);
    expect(m.log).toContain('action:mark.ring');
    expect(m.container.textContent).toContain('Mazo terminado');
    // deshacer devuelve la última
    m.click('S02.deshacer');
    expect(m.log).toContain('action:undo');
    expect(m.container.textContent).not.toContain('Mazo terminado');
  });

  it('match especial: ○ a una película con match ≥ 90 (Interstellar 93)', () => {
    const m = montar('deck-nolan-start');
    m.click('S02.btn-quiero'); m.avanzar(400);
    expect(m.container.textContent).toContain('Esta es muy tú');
    expect(m.log).toContain('action:match.special');
  });

  it('M2 · cierre → preguntas → feedback → elegir → empezar', () => {
    const m = montar('deck-finished');
    expect(m.container.textContent).toContain('Mazo terminado');
    m.click('S07.cuentanos');
    m.click('S07.ask-mood-ligera'); m.avanzar(400);
    m.click('S07.ask-nolan-mas'); m.avanzar(400);
    m.click('S07.ask-noir-si'); m.avanzar(400);
    expect(m.container.textContent).toContain('Tus elecciones de hoy');
    expect(m.container.textContent).toContain('Más Nolan');
    m.click('S07.elegir-proximo');
    expect(m.container.textContent).toContain('Tu próximo mazo');
    m.click('S07.empezar-mazo');
    expect(m.log).toContain('action:deck.dealt:other');
    m.avanzar(2000);
    expect(m.container.textContent).toContain('tu mazo está listo');
  });

  it('V1 · Ver → Verla → plataforma → abrir', () => {
    const m = montar('ver-pool');
    m.click('S04.btn-verla');
    expect(m.log).toContain('screen:S04.sheet-plat');
    m.click('S04.plat-1');
    m.click('S04.abrir-plataforma');
    expect(m.log).toContain('action:platform.opened');
    expect(m.log).toContain('screen:S04.away');
  });

  it('V2 · volver → Sí → reacción → repetir → guardar deja ◉', () => {
    const m = montar('ver-back');
    m.click('S03.si-la-vi');
    expect(m.log).toContain('screen:S03');
    m.click('S03.reaccion-love');
    expect((m.q('[data-track="S03.repetir"]') as HTMLInputElement).checked).toBe(true);
    m.click('S03.guardar');
    expect(m.log).toContain('action:reaction.saved');
  });

  it('T5 · tres «Otra» seguidas llevan a «Tu lista necesita aire nuevo»', () => {
    const m = montar('ver-pool');
    for (let i = 0; i < 3; i++) { m.click('S04.btn-otra'); m.avanzar(400); }
    expect(m.container.textContent).toContain('Tu lista necesita aire nuevo');
    expect(m.log).toContain('screen:S04.stuck');
  });

  it('V3 · Mi espacio → quitar El Faro Mudo', () => {
    const m = montar('ver-pool');
    m.click('S04.mi-espacio');
    expect(m.container.textContent).toContain('El Faro Mudo');
    m.click('S08.accion-faro');
    expect(m.log).toContain('action:space.removed:faro');
    expect(m.container.textContent).not.toContain('El Faro Mudo');
  });

  it('el mood filtra la propuesta de Ver', () => {
    const m = montar('ver-pool');
    m.click('S04.mood-reir'); m.avanzar(400);
    expect(m.container.textContent).toMatch(/Marea Lenta|Noche de Feria|Vecinos/);
  });
});
