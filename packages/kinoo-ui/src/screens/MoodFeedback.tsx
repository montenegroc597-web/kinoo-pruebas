import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, Button, Chip, Icon, Sun, TabBar } from '../components';
import { MOODS, MOOD_PREV_DEFAULT } from '../films';
import { useProduct } from '../store';
import { useScreen, useTracker } from '../tracker';
import { s } from '../util';
import { Twinkle } from './moodArt';

/** S06 · Lectura de tu mood. */
export function MoodFeedback() {
  const nav = useNavigate();
  const t = useTracker();
  const mood = useProduct((x) => x.mood) ?? MOODS[0];
  const prev = useProduct((x) => x.mood)?.prev ?? MOOD_PREV_DEFAULT;
  useScreen('S06');

  return (
    <div style={s('width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); color: var(--ink); font-family: var(--font-sans)')}>
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 360px; width: 700px; height: 700px; margin: -350px 0 0 -350px; border-radius: 50%; background: var(--surface-sunk); pointer-events: none')} />
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 360px; width: 500px; height: 500px; margin: -250px 0 0 -250px; border-radius: 50%; background: var(--surface-raised); opacity: 0.65; pointer-events: none')} />
      <Twinkle size={16} style={{ left: 26, top: 128 }} />

      <div style={s('position: relative; z-index: 2')}><AppHeader chip="Leyendo tu mood" /></div>

      <main className="kn-pop" style={s('position: relative; z-index: 2; flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 18px; padding: 4px var(--space-5) 14px')}>
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <span style={s('font-family: var(--font-script); font-size: 24px; line-height: 1; color: var(--sun-ink)')}>esto es lo que notamos</span>
          <h1 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 40px; line-height: 0.9; text-transform: uppercase')} data-hierarchy="primary">Hoy buscas {mood.label}</h1>
          <p style={s('margin: 2px 0 0; font-size: 14px; line-height: 1.45; color: var(--ink-muted)')}>Normalmente eso significa películas con:</p>
        </div>

        <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
          {mood.tags.map((label, i) => (
            <span key={label} className="kn-chipin" style={{ animationDelay: i * 70 + 'ms' }}><Chip variant="sun" icon="sparkle">{label}</Chip></span>
          ))}
        </div>

        <div style={s('display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-md); background: var(--surface-raised); border: var(--border-hairline) solid var(--line); margin-top: 6px')}>
          <Sun size={18} />
          <span style={s('font-size: 12px; line-height: 1.4; color: var(--ink-subtle)')}>Ayer buscabas algo distinto: <strong style={s('color: var(--ink-muted)')}>{prev}</strong>. Tu gusto va cambiando y lo vamos notando.</span>
        </div>

        <div style={s('display: flex; flex-direction: column; gap: var(--space-2); margin-top: 8px')}>
          <Button variant="primary" size="lg" block onClick={() => { t.action('mood.lectura.continue'); nav('/mazos'); }} track="S06.ver-mazos">Ver tus mazos</Button>
          <Button variant="ghost" size="sm" block onClick={() => { t.action('mood.otro'); nav('/mood'); }} track="S06.otro-mood">Elegir otro mood</Button>
        </div>
      </main>

      <div style={s('position: relative; z-index: 2')}><TabBar active="descubrir" onNavigate={(x) => { t.action('nav.tab', { tab: x }); nav(x === 'ver' ? '/ver' : '/mood'); }} /></div>
    </div>
  );
}
void Icon;
