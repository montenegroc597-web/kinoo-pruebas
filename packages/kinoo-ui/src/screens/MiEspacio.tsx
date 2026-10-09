import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, Button, Chip, Mark, Sun, TabBar, Toast, type MarkType } from '../components';
import { FILMS, type Film } from '../films';
import { useProduct, useProductApi } from '../store';
import { useScreen, useTracker } from '../tracker';
import { durHM, s } from '../util';

const MOODS: [string, string][] = [['todo', 'Todas'], ['apagar', 'Apagar'], ['sufrir', 'Sufrir'], ['sentir', 'Sentir'], ['reir', 'Reír']];
const DUR: [string, number][] = [['Cualquier duración', 999], ['Hasta 100 min', 100], ['Hasta 2 h', 120]];
const TABS: [string, string][] = [['quiero', 'Quiero verla'], ['repetir', 'Para repetir'], ['vistas', 'Vistas']];
const STATUS: Record<string, string> = { quiero: 'En tu lista', repetir: 'Para repetir', vistas: 'En tu historial' };
const ACT: Record<string, string> = { quiero: 'Quitar', repetir: 'Quitar', vistas: 'Repetir' };
const MK: Record<string, MarkType> = { quiero: 'ring', repetir: 'both', vistas: 'dot' };

/** S08 · Mi espacio (guardadas por estado, con filtros de mood y duración). */
export function MiEspacio() {
  const nav = useNavigate();
  const t = useTracker();
  const api = useProductApi();
  const marks = useProduct((x) => x.marks);
  const [tab, setTab] = useState('quiero');
  const [mood, setMood] = useState(0);
  const [dur, setDur] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useScreen('S08');

  const stOf = (f: Film): string | null => (marks[f.id] === 'ring' ? 'quiero' : marks[f.id] === 'both' ? 'repetir' : marks[f.id] === 'dot' ? 'vistas' : null);
  const inTab = FILMS.filter((f) => stOf(f) === tab);
  const rows = inTab.filter((f) => f.min <= DUR[dur][1] && (MOODS[mood][0] === 'todo' || f.tags.includes(MOODS[mood][0])));
  const filtered = mood !== 0 || dur !== 0;
  const showToast = (x: string) => { setToast(x); timers.current.push(setTimeout(() => setToast(null), 2200)); };

  const act = (f: Film) => {
    const st = stOf(f);
    if (st === 'vistas') { api.getState().mark(f.id, 'both'); t.action('space.repeat', { film: f.id }); showToast('Ahora está para repetir'); }
    else { api.getState().mark(f.id, null); t.action('space.removed:' + f.id, { film: f.id }); showToast('Quitada de tu espacio'); }
  };

  return (
    <div style={s('width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); color: var(--ink); font-family: var(--font-sans)')}>
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 260px; width: 760px; height: 760px; margin: -380px 0 0 -380px; border-radius: 50%; background: var(--surface-sunk); pointer-events: none')} />
      <div style={s('position: relative; z-index: 2')}><AppHeader chip="Mi espacio" /></div>

      <div style={s('position: relative; z-index: 2; display: flex; flex-direction: column; gap: 10px; padding: 2px var(--space-5) 6px')}>
        <div style={s('display: flex; align-items: flex-end; justify-content: space-between; gap: 10px')}>
          <div style={s('display: flex; flex-direction: column; gap: 2px')}>
            <span style={s('font-family: var(--font-script); font-size: 24px; line-height: 1; color: var(--sun-ink)')}>lo que guardaste</span>
            <h1 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 42px; line-height: 0.9; text-transform: uppercase')} data-hierarchy="primary">Mi espacio</h1>
          </div>
          <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => { t.action('nav.tab', { tab: 'ver' }); nav('/ver'); }} track="S08.volver-ver">Ver</Button>
        </div>
        <div role="group" aria-label="Estado" className="kn-scroll" style={s('display: flex; gap: var(--space-2); overflow-x: auto; padding: 2px 0')}>
          {TABS.map((tb) => <Chip key={tb[0]} variant="filter" selected={tab === tb[0]} onClick={() => { setTab(tb[0]); t.action('space.tab', { tab: tb[0] }); }} track={'S08.tab-' + tb[0]}>{tb[1]} · {FILMS.filter((f) => stOf(f) === tb[0]).length}</Chip>)}
        </div>
        <div role="group" aria-label="Filtrar guardados" className="kn-scroll" style={s('display: flex; gap: 6px; overflow-x: auto; padding: 0 0 2px')}>
          {MOODS.map((mv, i) => {
            const on = mood === i;
            return (
              <button key={mv[0]} type="button" aria-pressed={on ? 'true' : 'false'} data-track={'S08.mood-' + mv[0]} onClick={() => setMood(i)}
                style={{ ...s('flex: none; height: 32px; padding: 0 12px; border-radius: var(--radius-pill); border-width: 2px; border-style: solid; font-size: 12px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer'), background: on ? 'var(--sun)' : 'transparent', color: on ? 'var(--on-sun)' : 'var(--ink)', borderColor: on ? 'var(--sun-core)' : 'var(--line-strong)' }}>{mv[1]}</button>
            );
          })}
          <button type="button" data-track="S08.duracion" onClick={() => setDur((dur + 1) % DUR.length)} style={s('flex: none; height: 32px; padding: 0 12px; border-radius: var(--radius-pill); border: 2px dashed var(--line-strong); background: transparent; color: var(--ink); font-size: 12px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer')}>{DUR[dur][0]}</button>
        </div>
      </div>

      <main className="kn-scroll" style={s('position: relative; z-index: 2; flex: 1; min-height: 0; overflow-y: auto; padding: 6px var(--space-5) 16px; display: flex; flex-direction: column; gap: var(--space-2)')}>
        <span style={s('font-size: 12px; font-weight: 700; color: var(--ink-subtle)')}>{rows.length} {rows.length === 1 ? 'película' : 'películas'}{filtered ? ' con tus filtros' : ''}</span>
        {rows.map((r) => (
          <div key={r.id} className="kn-pop" style={s('display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: var(--radius-lg); background: var(--surface-raised); border: var(--border-hairline) solid var(--line)')}>
            <span aria-hidden="true" style={s('position: relative; flex: none; width: 48px; height: 66px; border-radius: 8px; overflow: hidden; background: var(--brand); border: var(--border-control) solid var(--sun-core); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 900; font-size: 22px; color: var(--ink-inverse)')}>
              {r.image ? <img src={r.image} alt="" style={s('position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover')} /> : <span>{r.title.charAt(0)}</span>}
            </span>
            <span style={s('flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px')}>
              <span style={s('font-family: var(--font-display); font-weight: 900; font-size: 20px; line-height: 1; text-transform: uppercase')}>{r.title}</span>
              <span style={s('font-size: 12px; line-height: 1.3; color: var(--ink-muted)')}>{durHM(r.min)} · {r.genre} · {r.match}%</span>
              <span style={s('display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--ink-subtle)')}><Mark type={MK[tab]} size={14} label="" />{STATUS[tab]}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => act(r)} track={'S08.accion-' + r.id} zone={r.id === 'faro' ? 'V3.correcta' : undefined}>{ACT[tab]}</Button>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="kn-pop" style={s('display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 36px 16px; text-align: center')}>
            <Sun size={72} />
            <span style={s('font-family: var(--font-script); font-size: 24px; line-height: 1; color: var(--sun-ink)')}>{filtered ? 'nada con ese filtro' : 'por ahora, vacío'}</span>
            <span style={s('font-size: 14px; line-height: 1.4; color: var(--ink-muted); max-width: 260px')}>{filtered ? 'Ninguna de tus guardadas cumple eso. Prueba con otro mood o duración.' : 'Cuando guardes películas en Descubrir o las veas, aparecerán aquí.'}</span>
            <Button variant="secondary" size="md" onClick={() => { setMood(0); setDur(0); }} track="S08.quitar-filtros">Quitar filtros</Button>
          </div>
        )}
      </main>

      <div style={s('position: relative; z-index: 2')}><TabBar active="ver" onNavigate={(x) => { t.action('nav.tab', { tab: x }); nav(x === 'descubrir' ? '/mood' : '/ver'); }} /></div>
      {toast && <div style={s('position: absolute; left: 0; right: 0; bottom: 104px; z-index: 30; display: flex; justify-content: center')}><Toast icon="sparkle">{toast}</Toast></div>}
    </div>
  );
}
