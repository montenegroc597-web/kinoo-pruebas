import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, Button, Mark, OptionRow, Sun, TabBar, Toast, type MarkType } from '../components';
import { FILMS, MOODS_VER, MOODS_VER_ARIA, PLATAFORMAS, REACCIONES, REACCION_TAGS, filmById, type Film } from '../films';
import { useProduct, useProductApi } from '../store';
import { useScreen, useTracker } from '../tracker';
import { durHM, s } from '../util';
import { MoodArt, Twinkle } from './moodArt';

type Sheet = null | 'plat' | 'back' | 'react';

/**
 * S04 · Ver (una propuesta). Subestados: S04, S04.sheet-plat, S04.away, S03.back (¿la viste?), S03 (calificación), S04.stuck.
 * Añadido respecto al artefacto: botones «Otra» y «Verla» bajo la tarjeta (Sistema de mazos v3 §7.1), porque el swipe solo no es descubrible con un toque.
 */
export function Ver() {
  const nav = useNavigate();
  const t = useTracker();
  const api = useProductApi();
  const marks = useProduct((x) => x.marks);
  const boot = api.getState().boot;

  const [cur, setCur] = useState<string | null>(boot.verCur ?? 'interstellar');
  const [rejects, setRejects] = useState(0);
  const [m, setM] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [snap, setSnap] = useState(false);
  const [enter, setEnter] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(boot.verSheet);
  const [away, setAway] = useState(false);
  const [plat, setPlat] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [toast, setToast] = useState<{ text: string; mark: MarkType } | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [voice, setVoice] = useState<'idle' | 'rec' | 'done'>('idle');
  const [secs, setSecs] = useState(0);
  const [stripDrag, setStripDrag] = useState(false);

  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const strip = useRef<{ x: number; left: number; el: HTMLElement; id: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => { api.getState().clearBoot(); return () => { timers.current.forEach(clearTimeout); if (tick.current) clearInterval(tick.current); }; }, [api]);

  const available = (mi: number, mk: typeof marks) => {
    const mood = MOODS_VER[mi][0];
    return FILMS.filter((f) => (mk[f.id] === 'ring' || mk[f.id] === 'both') && (mood === 'todo' || f.tags.includes(mood)));
  };
  const av = available(m, marks);
  let raw: Film | undefined = filmById(cur ?? '');
  if (!raw || !av.some((f) => f.id === raw!.id)) raw = av[0];
  const stuckRejects = rejects >= 3;
  const empty = !raw;
  const showStuck = empty || stuckRejects;

  const sub = away ? 'S04.away' : sheet === 'back' ? 'S03.back' : sheet === 'react' ? 'S03' : sheet === 'plat' ? 'S04.sheet-plat' : showStuck ? 'S04.stuck' : 'S04';
  useScreen(sub);

  const swap = (patch: { m?: number; rejects?: number; cur?: string | null; marks?: typeof marks }) => {
    setLeaving(true);
    later(() => {
      const nm = patch.m ?? m;
      const mk = patch.marks ?? api.getState().marks;
      const a = available(nm, mk);
      let c = patch.cur ?? null;
      if (!c || !a.some((f) => f.id === c)) c = a.length ? a[0].id : null;
      if (patch.m !== undefined) setM(patch.m);
      if (patch.rejects !== undefined) setRejects(patch.rejects);
      setCur(c); setLeaving(false);
    }, 200);
  };
  const nextId = () => {
    if (!av.length) return null;
    let i = -1;
    av.forEach((f, k) => { if (f.id === raw?.id) i = k; });
    return av[(i + 1) % av.length].id;
  };
  const exitLeft = () => {
    if (exiting) return;
    t.action('ver.otra', { film: raw?.id, n: rejects + 1 });
    setDx(-480); setDragging(false); setExiting(true);
    later(() => {
      setCur(nextId()); setRejects((r) => r + 1); setDx(0); setExiting(false); setSnap(true); setEnter(true);
      later(() => { setSnap(false); setEnter(false); }, 40);
    }, 240);
  };
  const showToast = (tt: { text: string; mark: MarkType }) => { setToast(tt); later(() => setToast(null), 2200); };
  const finishReaction = (save: boolean) => {
    if (!raw) { setSheet(null); return; }
    const mk = { ...api.getState().marks, [raw.id]: (repeat ? 'both' : 'dot') as 'both' | 'dot' };
    api.getState().mark(raw.id, repeat ? 'both' : 'dot');
    t.action(save ? 'reaction.saved' : 'reaction.skipped', { film: raw.id, reaction, repeat, tags: tags.length });
    setSheet(null);
    swap({ marks: mk, rejects: 0, cur: null });
    showToast(repeat ? { text: 'Vista y lista para repetir', mark: 'both' } : { text: 'Guardada en tu historial', mark: 'dot' });
  };

  const filmMark = raw ? marks[raw.id] : undefined;
  const meta = raw ? [durHM(raw.min), raw.genre, raw.director].join('  ·  ') : '';
  const kicker = m === 0 ? 'tu película para esta noche' : 'para ' + MOODS_VER[m][2];
  const rejectHint = rejects === 0 ? '← otra  ·  desliza  ·  verla →' : rejects === 1 ? 'Otra más de tu lista, sin prisa' : 'Si esta tampoco, te sugerimos pasar por Descubrir';
  const cardTransform = enter ? 'translateY(26px) scale(0.95)' : dx !== 0 ? `translateX(${dx}px) rotate(${(dx / 22).toFixed(2)}deg)` : leaving ? 'translateY(18px) scale(0.96)' : 'none';
  const stampVer = Math.max(0, Math.min(1, dx / 90)), stampOtra = Math.max(0, Math.min(1, -dx / 90));
  const platName = PLATAFORMAS[plat].name;

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (exiting || sheet) return;
    drag.current = { x: e.clientX, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignorar */ }
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const d = e.clientX - drag.current.x;
    if (Math.abs(d) > 6) drag.current.moved = true;
    if (drag.current.moved) setDx(d);
  };
  const onUp = () => {
    if (!drag.current) { setDragging(false); return; }
    const d = drag.current; drag.current = null;
    if (d.moved && dx > 90) { t.action('ver.swipe-verla', { film: raw?.id }); setDragging(false); setDx(0); setSheet('plat'); setPlat(0); return; }
    if (d.moved && dx < -90) { exitLeft(); return; }
    setDragging(false); setDx(0);
  };
  const stripDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    strip.current = { x: e.clientX, left: e.currentTarget.scrollLeft, el: e.currentTarget, id: e.pointerId, moved: false };
  };
  const stripMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = strip.current; if (!st) return;
    const d = e.clientX - st.x;
    if (!st.moved && Math.abs(d) > 6) { st.moved = true; try { st.el.setPointerCapture(st.id); } catch { /* ignorar */ } setStripDrag(true); }
    if (st.moved) st.el.scrollLeft = st.left - d;
  };
  const stripUp = () => {
    const st = strip.current; strip.current = null;
    if (st && st.moved) { justDragged.current = true; setTimeout(() => { justDragged.current = false; }, 80); setStripDrag(false); }
  };

  const reactionTags = reaction ? REACCION_TAGS[reaction] ?? [] : [];
  const voiceTime = '0:' + (secs < 10 ? '0' : '') + secs;

  return (
    <div style={s('width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); color: var(--ink); font-family: var(--font-sans)')}>
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 330px; width: 760px; height: 760px; margin: -380px 0 0 -380px; border-radius: 50%; background: var(--surface-sunk); pointer-events: none')} />
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 330px; width: 540px; height: 540px; margin: -270px 0 0 -270px; border-radius: 50%; background: var(--surface-raised); opacity: 0.7; pointer-events: none')} />
      <Twinkle size={16} style={{ right: 30, top: 150 }} />

      <div style={s('position: relative; z-index: 2')}><AppHeader /></div>

      <div style={s('position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 2px var(--space-5) 0')}>
        <span style={s('font-family: var(--font-script); font-size: 24px; line-height: 1; color: var(--sun-ink)')}>¿qué mood traes?</span>
        <Button variant="ghost" size="sm" onClick={() => { t.action('nav.mi-espacio'); nav('/mi-espacio'); }} track="S04.mi-espacio" aria-label="Mi espacio: tus guardadas">Mi espacio</Button>
      </div>
      <div style={s('position: relative; z-index: 2; margin: 8px -12px 16px; transform: rotate(-1.6deg); background: var(--mark-dot); border-top: 2px solid var(--brand-deep); border-bottom: 2px solid var(--brand-deep); box-shadow: var(--shadow-float)')}>
        <div role="radiogroup" aria-label="Mood de esta noche" className="kn-scroll" onPointerDown={stripDown} onPointerMove={stripMove} onPointerUp={stripUp} onPointerCancel={stripUp}
          style={{ ...s('overflow-x: auto; scroll-padding: 0 28px; user-select: none; -webkit-user-select: none'), scrollSnapType: stripDrag ? 'none' : 'x proximity', cursor: stripDrag ? 'grabbing' : 'grab' }}>
          <div style={s('display: inline-flex; flex-direction: column; min-width: 100%; padding: 0 28px; box-sizing: border-box')}>
            <div aria-hidden="true" className="kn-holes" style={s('margin: 6px 0 5px')} />
            <div style={s('display: flex; gap: 12px')}>
              {MOODS_VER.map((mv, i) => {
                const on = m === i;
                return (
                  <button key={mv[0]} type="button" role="radio" className="kn-frame" aria-checked={on ? 'true' : 'false'} aria-label={'Mood: ' + MOODS_VER_ARIA[mv[0]]} data-track={'S04.mood-' + mv[0]}
                    onClick={() => { if (justDragged.current) return; if (m !== i) { t.action('ver.mood', { mood: mv[0] }); swap({ m: i, rejects: 0, cur: null }); } }}
                    style={{ ...s('flex: none; scroll-snap-align: center; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 0; border: 0; background: transparent; cursor: pointer'), transform: on ? 'translateY(-2px)' : 'none' }}>
                    <span className="kn-cel" style={{ ...s('display: block; width: 92px; height: 70px; box-sizing: border-box; border-radius: 6px; overflow: hidden; background: var(--surface-raised); border-width: 3px; border-style: solid'), borderColor: on ? 'var(--sun)' : 'transparent', filter: on ? 'none' : 'sepia(0.55) saturate(0.55) brightness(0.72)', boxShadow: on ? '0 0 0 3px var(--mark-dot), 0 0 18px color-mix(in srgb, var(--sun) 55%, transparent)' : 'none' }}>
                      <MoodArt id={mv[0]} slice />
                    </span>
                    <span style={{ ...s('display: flex; align-items: flex-start; justify-content: center; width: 96px; min-height: 26px; text-align: center; font-family: var(--font-display); font-weight: 900; font-size: 13px; letter-spacing: 0.6px; text-transform: uppercase; line-height: 1'), color: on ? 'var(--sun)' : 'color-mix(in srgb, var(--sun-core) 62%, transparent)' }}>{mv[0] === 'todo' ? 'Todas' : MOODS_VER_ARIA[mv[0]].replace('Cine del bueno', 'Cine del bueno')}</span>
                  </button>
                );
              })}
            </div>
            <div aria-hidden="true" className="kn-holes" style={s('margin: 7px 0 6px')} />
          </div>
        </div>
      </div>

      <main style={s('position: relative; z-index: 2; flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 4px var(--space-5) 12px; gap: 10px')}>
        {!showStuck && raw && (
          <>
            <div data-track="S04.card" data-zone="T5.aceptable" data-hierarchy="primary" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              aria-label={raw.title + '. Desliza a la derecha para verla, a la izquierda para otra.'}
              style={{ ...s('position: relative; flex: 1; min-height: 0; border-radius: var(--radius-card); overflow: hidden; border: var(--border-card) solid var(--sun-core); background: var(--brand); box-shadow: var(--shadow-lift); touch-action: none; user-select: none; cursor: grab'), transform: cardTransform, transition: dragging || snap ? 'none' : 'transform 340ms var(--ease-out), opacity 240ms var(--ease-out)', opacity: leaving || exiting || enter ? 0 : 1 }}>
              {raw.image
                ? <img src={raw.image} alt={'Póster de ' + raw.title} draggable={false} style={s('position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 18%; pointer-events: none')} />
                : (
                  <div aria-hidden="true" style={s('position: absolute; inset: 0; overflow: hidden')}>
                    <div className="kn-spin" style={s('position: absolute; left: 50%; top: 38%; width: 720px; height: 720px; margin: -360px 0 0 -360px; border-radius: 50%; background: repeating-conic-gradient(color-mix(in srgb, var(--sun) 30%, transparent) 0deg 7deg, transparent 7deg 14deg)')} />
                    <div style={s('position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%)')}><Sun size={170} /></div>
                  </div>
                )}
              <div aria-hidden="true" style={s('position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to bottom, color-mix(in srgb, var(--mark-dot) 55%, transparent) 0%, transparent 20%, transparent 40%, color-mix(in srgb, var(--mark-dot) 82%, transparent) 70%, var(--mark-dot) 100%)')} />
              <div style={s('position: absolute; left: 14px; right: 14px; top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; pointer-events: none')}>
                <span style={s('display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px 0 6px; border-radius: var(--radius-pill); background: var(--sun); color: var(--on-sun); font-size: 12.5px; font-weight: 800; box-shadow: var(--shadow-card)')}>
                  <span aria-hidden="true" style={s('width: 20px; height: 20px; border-radius: 50%; background: var(--mark-dot); color: var(--sun); display: flex; align-items: center; justify-content: center; font-size: 9px')}>●</span>
                  {raw.match}% contigo
                </span>
                <span style={s('display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px 0 8px; border-radius: var(--radius-pill); background: color-mix(in srgb, var(--mark-dot) 70%, transparent); color: var(--sun-core); font-size: 12px; font-weight: 700')}>
                  <Mark type={filmMark === 'both' ? 'both' : 'ring'} size={16} label="" />
                  {filmMark === 'both' ? 'Para repetir' : 'En tu lista'}
                </span>
              </div>
              <span aria-hidden="true" style={{ ...s('position: absolute; left: 18px; top: 62px; padding: 4px 12px; border: 4px solid var(--sun); border-radius: 10px; color: var(--sun); font-family: var(--font-display); font-weight: 900; font-size: 34px; letter-spacing: 2px; line-height: 1; transform: rotate(-12deg); pointer-events: none'), opacity: stampVer }}>VERLA</span>
              <span aria-hidden="true" style={{ ...s('position: absolute; right: 18px; top: 62px; padding: 4px 12px; border: 4px solid var(--sun-core); border-radius: 10px; color: var(--sun-core); font-family: var(--font-display); font-weight: 900; font-size: 34px; letter-spacing: 2px; line-height: 1; transform: rotate(12deg); pointer-events: none'), opacity: stampOtra }}>OTRA</span>
              <div style={s('position: absolute; left: 18px; right: 18px; bottom: 16px; display: flex; flex-direction: column; gap: 6px; color: var(--sun-core); pointer-events: none')}>
                <span style={s('font-family: var(--font-script); font-size: 24px; line-height: 1; color: var(--sun)')}>{kicker}</span>
                <h2 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 46px; line-height: 0.88; text-transform: uppercase; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden')}>{raw.title}</h2>
                <span style={s('font-size: 12.5px; font-weight: 700; letter-spacing: 0.4px; color: color-mix(in srgb, var(--sun-core) 82%, transparent)')}>{meta}</span>
                <span style={s('font-size: 13.5px; line-height: 1.35; color: color-mix(in srgb, var(--sun-core) 88%, transparent); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden')}><strong style={s('color: var(--sun)')}>Por qué hoy:</strong> {raw.why}</span>
                <div style={s('display: flex; gap: 6px; margin-top: 2px')}>
                  {['Netflix', 'Prime Video'].map((p) => <span key={p} style={s('height: 24px; padding: 0 10px; display: inline-flex; align-items: center; border-radius: var(--radius-pill); border: 1.5px solid color-mix(in srgb, var(--sun-core) 55%, transparent); font-size: 11px; font-weight: 700')}>{p}</span>)}
                </div>
              </div>
            </div>

            <div style={s('display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 10px')}>
              <Button variant="secondary" size="md" block onClick={exitLeft} track="S04.btn-otra" zone="T5.correcta">Otra</Button>
              <Button variant="primary" size="md" block onClick={() => { t.action('ver.watch', { film: raw?.id }); setSheet('plat'); setPlat(0); }} track="S04.btn-verla">Verla</Button>
            </div>
            <span style={s('text-align: center; font-size: 12.5px; font-weight: 700; letter-spacing: 0.4px; color: var(--ink-subtle); padding-bottom: 2px')}>{rejectHint}</span>
          </>
        )}

        {showStuck && (
          <div className="kn-pop" style={s('flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; padding: 10px 8px')}>
            <div aria-hidden="true" style={s('position: relative; width: 170px; height: 170px')}>
              <div className="kn-spin" style={s('position: absolute; inset: -30px; border-radius: 50%; background: repeating-conic-gradient(var(--surface-raised) 0deg 7deg, transparent 7deg 14deg)')} />
              <div style={s('position: absolute; inset: 0; display: flex; align-items: center; justify-content: center')}><Sun size={170} /></div>
            </div>
            <span style={s('font-family: var(--font-script); font-size: 26px; color: var(--sun-ink); line-height: 1')}>{stuckRejects ? 'hoy nada te convence' : 'nada encaja con eso'}</span>
            <h2 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 46px; line-height: 0.92; text-transform: uppercase')}>{stuckRejects ? 'Tu lista necesita aire nuevo' : 'Tu lista no alcanza'}</h2>
            <p style={s('margin: 0; font-size: 15px; line-height: 1.45; color: var(--ink-muted); max-width: 300px')}>{stuckRejects ? 'Pasaste 3 propuestas seguidas. Descubre unas cuantas películas en un par de minutos y vuelve.' : 'Ninguna película con ○ encaja con ese mood. Cambia de mood o descubre algo que sí.'}</p>
            <div style={s('display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 6px')}>
              <Button variant="primary" size="lg" icon="compass" block onClick={() => { t.action('ver.ir-descubrir'); nav('/mood'); }} track="S04.ir-descubrir">Ir a Descubrir</Button>
              <Button variant="ghost" size="md" block onClick={() => { t.action('ver.unstick'); if (rejects >= 3) setRejects(0); else swap({ m: 0 }); }} track="S04.unstick">{stuckRejects ? 'Darle otra vuelta a mi lista' : 'Ver todos los moods'}</Button>
            </div>
          </div>
        )}
      </main>

      <div style={s('position: relative; z-index: 2')}><TabBar active="ver" onNavigate={(x) => { t.action('nav.tab', { tab: x }); nav(x === 'descubrir' ? '/mood' : '/ver'); }} /></div>

      {toast && <div style={s('position: absolute; left: 0; right: 0; bottom: 104px; z-index: 30; display: flex; justify-content: center')}><Toast mark={toast.mark}>{toast.text}</Toast></div>}

      {sheet === 'plat' && (
        <div style={s('position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column; justify-content: flex-end')}>
          <button type="button" aria-label="Cerrar" className="kn-fade" data-track="S04.plat-cerrar" onClick={() => setSheet(null)} style={s('position: absolute; inset: 0; border: 0; padding: 0; background: var(--scrim)')} />
          <section className="kn-sheet" aria-label="Elegir plataforma" style={s('position: relative')}>
            <span className="kn-sheet-handle" aria-hidden="true" />
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span className="kn-sheet-kicker">{raw?.title}</span>
              <h2 className="kn-sheet-title">¿Dónde la ves?</h2>
            </div>
            <div role="radiogroup" aria-label="Plataformas" style={s('display: flex; flex-direction: column; gap: var(--space-2)')}>
              {PLATAFORMAS.map((p, i) => <OptionRow key={p.name} title={p.name} subtitle={p.tag} positive={p.sub} selected={i === plat} onClick={() => { setPlat(i); t.action('platform.picked', { platform: p.name }); }} track={'S04.plat-' + i} />)}
            </div>
            <Button variant="primary" size="lg" iconEnd="external" block onClick={() => { t.action('platform.opened', { platform: platName, film: raw?.id }); setSheet(null); setAway(true); }} track="S04.abrir-plataforma">Abrir en {platName}</Button>
            <span style={s('text-align: center; font-size: 12px; color: var(--ink-inverse-muted)')}>Kinoo no reproduce: te lleva a la app donde ya tienes la película.</span>
          </section>
        </div>
      )}

      {away && (
        <div className="kn-fade" style={s('position: absolute; inset: 0; z-index: 25; background: var(--surface); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 32px; text-align: center; box-sizing: border-box')}>
          <span style={s('font-family: var(--font-script); font-size: 26px; color: var(--sun-ink); line-height: 1')}>Que la disfrutes</span>
          <h2 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 40px; line-height: 0.95; text-transform: uppercase')}>Abriendo {platName}…</h2>
          <span className="kn-load" role="status" aria-label="Abriendo la plataforma" />
          <p style={s('margin: 0; font-size: 14px; color: var(--ink-subtle); max-width: 280px; line-height: 1.45')}>Simulación del prototipo: aquí el usuario sale de Kinoo, ve la película y vuelve más tarde.</p>
          <Button variant="secondary" size="md" onClick={() => { t.action('ver.volver'); setAway(false); setSheet('back'); }} track="S04.volver-kinoo">Volver a Kinoo más tarde</Button>
        </div>
      )}

      {sheet === 'back' && raw && (
        <div style={s('position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column; justify-content: flex-end')}>
          <div className="kn-fade" style={s('position: absolute; inset: 0; background: var(--scrim)')} />
          <section className="kn-sheet" aria-label="¿La viste?" style={s('position: relative; align-items: center; text-align: center; gap: 14px')}>
            <div style={s('position: relative; width: 92px; height: 120px; border-radius: 12px; overflow: hidden; border: 3px solid var(--ink-inverse); background: var(--brand)')}>
              {raw.image ? <img src={raw.image} alt="" style={s('width: 100%; height: 100%; object-fit: cover')} /> : <div style={s('position: absolute; inset: 0; display: flex; align-items: center; justify-content: center')}><Sun size={64} /></div>}
            </div>
            <span className="kn-sheet-kicker">¡Volviste!</span>
            <h2 className="kn-sheet-title" style={s('margin-top: -8px')}>¿Viste {raw.title}?</h2>
            <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; width: 100%; margin-top: 4px')}>
              <Button variant="secondary" size="md" block onClick={() => { t.action('ver.notyet'); setSheet(null); showToast({ text: 'Sigue en tu lista', mark: 'ring' }); }} track="S03.despues">Después</Button>
              <Button variant="primary" size="md" block onClick={() => { t.action('ver.sawit', { film: raw?.id }); setSheet('react'); setReaction(null); setRepeat(false); setTags([]); setVoice('idle'); setSecs(0); }} track="S03.si-la-vi" zone="T1.correcta">Sí</Button>
            </div>
          </section>
        </div>
      )}

      {sheet === 'react' && (
        <div style={s('position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column; justify-content: flex-end')}>
          <div style={s('position: absolute; inset: 0; background: var(--scrim)')} />
          <section className="kn-sheet kn-pop" aria-label="¿Qué tal estuvo?" style={s('position: relative; align-items: center; text-align: center; gap: 14px')}>
            <svg aria-hidden="true" width="48" height="48" viewBox="0 0 64 64">
              <circle className="kn-ringout" cx={32} cy={32} r={24} fill="none" stroke="var(--mark-ring)" strokeWidth={6} />
              <circle className="kn-dotin" cx={32} cy={32} r={20} fill="var(--mark-dot)" />
            </svg>
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span style={s('font-size: 12px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--ink-inverse-muted)')}>○ pasó a ● · está en tu historial</span>
              <h2 className="kn-sheet-title" data-hierarchy="primary">¿Qué tal estuvo?</h2>
            </div>
            <div role="radiogroup" aria-label="Tu reacción" style={s('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); width: 100%')}>
              {REACCIONES.map((r) => {
                const on = reaction === r[0];
                return (
                  <button key={r[0]} type="button" className="kn-react" role="radio" aria-checked={on ? 'true' : 'false'} data-track={'S03.reaccion-' + r[0]}
                    onClick={() => { setReaction(r[0]); setTags([]); if (r[0] === 'love') setRepeat(true); t.action('reaction.picked', { reaction: r[0] }); }}
                    style={{ ...s('display: flex; flex-direction: column; align-items: center; gap: 8px; min-height: 92px; padding: 12px 6px; border-radius: var(--radius-lg); border: var(--border-control) solid var(--ink-inverse); color: var(--ink-inverse); font-size: 13px; font-weight: 700; line-height: 1.2; cursor: pointer'), background: on ? 'var(--sun)' : 'transparent' }}>
                    <svg aria-hidden="true" width="34" height="34" viewBox="0 0 34 34"><circle cx={17} cy={17} r={16} fill={r[2]} /><circle cx={17} cy={17} r={r[3]} fill="var(--sun-core)" /></svg>
                    {r[1]}
                  </button>
                );
              })}
            </div>
            <div style={s('display: flex; flex-direction: column; gap: 8px; width: 100%')}>
              <span style={s('font-size: 12px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--ink-inverse-muted); text-align: left')}>Cuéntanos en una frase</span>
              {!reaction && <span style={s('font-size: 13px; color: var(--ink-inverse-muted); text-align: left; min-height: 36px; display: flex; align-items: center')}>Elige cómo te dejó y aparecerán frases rápidas.</span>}
              {reaction && (
                <div style={s('display: flex; flex-wrap: wrap; gap: 6px; min-height: 36px')}>
                  {reactionTags.map((tg) => {
                    const on = tags.includes(tg);
                    return <button key={tg} type="button" className="kn-chip2" aria-pressed={on ? 'true' : 'false'} data-track="S03.tag" onClick={() => setTags((c) => (c.includes(tg) ? c.filter((x) => x !== tg) : [...c, tg]))} style={{ ...s('height: 36px; padding: 0 14px; border-radius: var(--radius-pill); border: 2px solid var(--ink-inverse); color: var(--ink-inverse); font-size: 13px; font-weight: 700; cursor: pointer'), background: on ? 'var(--sun)' : 'transparent' }}>{tg}</button>;
                  })}
                </div>
              )}
              {voice === 'idle' && (
                <button type="button" className="kn-voice" data-track="S03.voz" onClick={() => { if (tick.current) clearInterval(tick.current); setVoice('rec'); setSecs(0); tick.current = setInterval(() => setSecs((x) => Math.min(59, x + 1)), 1000); }} style={s('display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border-radius: var(--radius-pill); border: 2px dashed var(--ink-inverse); background: transparent; color: var(--ink-inverse); font-size: 14px; font-weight: 700; cursor: pointer')}>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><rect x={9} y={3} width={6} height={12} rx={3} /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                  Dejar una nota de voz
                </button>
              )}
              {voice === 'rec' && (
                <button type="button" className="kn-voice" aria-label="Detener grabación" data-track="S03.voz-parar" onClick={() => { if (tick.current) clearInterval(tick.current); tick.current = null; setVoice('done'); }} style={s('display: flex; align-items: center; justify-content: center; gap: 12px; height: 44px; border-radius: var(--radius-pill); border: 2px solid var(--ink-inverse); background: color-mix(in srgb, var(--ink-inverse) 12%, transparent); color: var(--ink-inverse); font-size: 14px; font-weight: 700; cursor: pointer')}>
                  <span aria-hidden="true" style={s('display: flex; align-items: center; gap: 3px; height: 20px')}>
                    {[16, 10, 20, 12, 18].map((h, k) => <span key={k} className="kn-bar" style={{ height: h, animationDelay: k * 0.15 + 's' }} />)}
                  </span>
                  Grabando {voiceTime} · toca para parar
                </button>
              )}
              {voice === 'done' && (
                <div style={s('display: flex; align-items: center; justify-content: space-between; gap: 10px; height: 44px; padding: 0 6px 0 16px; border-radius: var(--radius-pill); border: 2px solid var(--ink-inverse); font-size: 14px; font-weight: 700')}>
                  <span>Nota de voz · {voiceTime}</span>
                  <Button variant="ghost" size="sm" onClick={() => { if (tick.current) clearInterval(tick.current); tick.current = null; setVoice('idle'); setSecs(0); }} track="S03.voz-regrabar">Regrabar</Button>
                </div>
              )}
            </div>
            <label className="kn-check" style={s('display: flex; align-items: center; gap: 12px; width: 100%; box-sizing: border-box; min-height: 56px; padding: 0 14px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--ink-inverse) 8%, transparent); text-align: left; cursor: pointer')}>
              <input type="checkbox" checked={repeat} data-track="S03.repetir" onChange={() => { setRepeat((r) => { t.action(r ? 'repeat.off' : 'repeat.on'); return !r; }); }} style={s('width: 22px; height: 22px; accent-color: var(--mark-ring); margin: 0')} />
              <span style={s('flex: 1; font-size: 14px; font-weight: 600; line-height: 1.3')}>La vería otra vez <span style={s('color: var(--ink-inverse-muted); font-weight: 500')}>· se queda en Ver como ◉</span></span>
              <Mark type="both" size={22} label="" />
            </label>
            <div style={s('display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; width: 100%')}>
              <Button variant="ghost" size="md" onClick={() => finishReaction(false)} track="S03.saltar">Saltar</Button>
              <Button variant="primary" size="md" block onClick={() => finishReaction(true)} track="S03.guardar">Guardar</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
