import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, Button, TabBar } from '../components';
import { MOODS, type MoodItem } from '../films';
import { useProduct } from '../store';
import { useScreen, useTracker } from '../tracker';
import { s } from '../util';
import { MoodArt, Twinkle } from './moodArt';

/** S01 · Inicio (Mood). Sheet «una frase para hoy» = S01.sheet. */
export function Mood() {
  const nav = useNavigate();
  const t = useTracker();
  const setMood = useProduct((x) => x.setMood);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked: MoodItem = MOODS.find((m) => m.id === pickedId) ?? MOODS[0];
  const open = pickedId != null;
  useScreen(open ? 'S01.sheet' : 'S01');

  const pick = (id: string) => { setPickedId(id); t.action('mood.picked', { mood: id }); };
  const goContinue = () => { setMood(picked); t.action('mood.continue', { mood: picked.id }); nav('/mood/lectura'); };

  return (
    <div style={s('width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); color: var(--ink); font-family: var(--font-sans)')}>
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: -120px; width: 620px; height: 620px; margin-left: -310px; border-radius: 50%; background: var(--surface-sunk); pointer-events: none')} />
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: -60px; width: 440px; height: 440px; margin-left: -220px; border-radius: 50%; background: var(--surface-raised); opacity: 0.6; pointer-events: none')} />
      <Twinkle size={16} style={{ right: 26, top: 112 }} />

      <div style={s('position: relative; z-index: 2')}><AppHeader chip="Tu mood" /></div>

      <div style={s('position: relative; z-index: 2; display: flex; flex-direction: column; gap: 4px; padding: 6px var(--space-5) 10px')}>
        <span style={s('font-family: var(--font-script); font-size: 24px; line-height: 1; color: var(--sun-ink)')}>antes de armar tu mazo</span>
        <h1 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 36px; line-height: 0.92; text-transform: uppercase')} data-hierarchy="primary">¿Qué versión de ti llegó hoy?</h1>
        <p style={s('margin: 2px 0 0; font-size: 13.5px; line-height: 1.4; color: var(--ink-muted)')}>Elige la escena que más se parece a tu noche. Así armamos un mazo que de verdad te sirva.</p>
      </div>

      <main className="kn-scroll" style={s('position: relative; z-index: 2; flex: 1; min-height: 0; overflow-y: auto; padding: 4px var(--space-5) 14px')}>
        <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px')}>
          {MOODS.map((m) => (
            <button key={m.id} type="button" className="kn-mood-card" onClick={() => pick(m.id)} data-track={'S01.mood-' + m.id}
              style={s('display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--radius-lg); border: var(--border-control) solid var(--line); background: var(--surface-raised); text-align: left; cursor: pointer; color: var(--ink)')}>
              <MoodArt id={m.id} />
              <span style={s('font-size: 13.5px; font-weight: 700; line-height: 1.2')}>{m.label}</span>
              <span style={s('font-size: 11.5px; line-height: 1.3; color: var(--ink-subtle)')}>{m.blurb}</span>
            </button>
          ))}
        </div>
      </main>

      <div style={s('position: relative; z-index: 2')}><TabBar active="descubrir" zoneVer onNavigate={(x) => { t.action('nav.tab', { tab: x }); nav(x === 'ver' ? '/ver' : '/mood'); }} /></div>

      {open && (
        <div style={s('position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column; justify-content: flex-end')}>
          <button type="button" aria-label="Cerrar" className="kn-fade" data-track="S01.sheet-cerrar" onClick={() => setPickedId(null)} style={s('position: absolute; inset: 0; border: 0; padding: 0; background: var(--scrim)')} />
          <section className="kn-sheet kn-pop" aria-label="Frase para tu mood" style={s('position: relative; align-items: center; text-align: center; gap: 16px')}>
            <span className="kn-sheet-handle" aria-hidden="true" />
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span className="kn-sheet-kicker">{picked.label}</span>
              <h2 className="kn-sheet-title">una frase para hoy</h2>
            </div>
            <p style={s('margin: 0; font-family: var(--font-script); font-size: 26px; line-height: 1.25; color: var(--sun)')}>"{picked.quote}"</p>
            <span style={s('font-size: 13px; color: var(--ink-inverse-muted)')}>— {picked.source}</span>
            <div style={s('display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 4px')}>
              <Button variant="primary" size="lg" block onClick={goContinue} track="S01.continuar">Continuar</Button>
              <Button variant="ghost" size="sm" block onClick={() => setPickedId(null)} track="S01.elegir-otra">Elegir otra</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
