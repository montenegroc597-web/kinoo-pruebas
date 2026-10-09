import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, Button, DeckCard, DeckProgress, Mark, OptionRow, Sun, SwipeAction, TabBar, TasteArt, Toast, type DimView, type MarkType } from '../components';
import { DIM_INFO, WORD_INFO, filmById, type Film } from '../films';
import { deckFilmIds, useProduct, useProductApi } from '../store';
import { useScreen, useTracker } from '../tracker';
import { s } from '../util';
import { Twinkle } from './moodArt';

const clamp = (v: number) => Math.max(0, Math.min(1, v));
type Dir = 'left' | 'up' | 'right';
interface Toast_ { mark?: MarkType; icon?: 'x'; text: string }
interface DimSel { label: string; word?: string; top: boolean }

/** S02 · Descubrir (carta con volteo y swipe). Subestados: S02, S02.flipped, S02.sheet, S02.dim, S02.match, S02.fin. */
export function Descubrir() {
  const nav = useNavigate();
  const t = useTracker();
  const api = useProductApi();
  const deck = useProduct((x) => x.deck);
  const marks = useProduct((x) => x.marks);
  const films = deckFilmIds(deck.id).map((id) => filmById(id)!).filter(Boolean) as Film[];
  const total = films.length;
  const i = deck.i;

  const bootFlip = api.getState().boot.deckFlipped;
  const [flipped, setFlipped] = useState(bootFlip);
  const [d, setD] = useState({ dx: 0, dy: 0, dragging: false });
  const [exit, setExit] = useState<Dir | null>(null);
  const [toast, setToast] = useState<Toast_ | null>(null);
  const [match, setMatch] = useState<Film | null>(null);
  const [sheet, setSheet] = useState(false);
  const [dim, setDim] = useState<DimSel | null>(null);
  const [g, setG] = useState(0);
  const [last, setLast] = useState<{ i: number; id: string; prev: string | undefined } | null>(null);

  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlip = useRef(0);
  const toastSeq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const raf = useRef<number | null>(null);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const raw = films[i];
  useEffect(() => { api.getState().clearBoot(); }, [api]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); if (hold.current) clearTimeout(hold.current); if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const animateGauge = (delay: number, idx: number) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    setG(0);
    const f = films[idx];
    if (!f) return;
    later(() => {
      const start = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / 1000);
        setG(f.match * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);
  };
  useEffect(() => { animateGauge(250, i); /* eslint-disable-next-line */ }, [deck.id]);

  const sub = match ? 'S02.match' : dim ? 'S02.dim' : sheet ? 'S02.sheet' : !raw ? 'S02.fin' : flipped ? 'S02.flipped' : 'S02';
  useScreen(sub);

  const doFlip = () => {
    if (exit || !raw) return;
    lastFlip.current = Date.now();
    setFlipped((f) => { t.action('card.flip', { film: raw.id, to: !f }); return !f; });
  };

  const act = (dir: Dir, kind?: 'ring' | 'dot' | 'both') => {
    if (!raw || exit) return;
    if (dir === 'up' && !flipped) { t.action('gesture.blocked', { dir: 'up', motivo: 'carta-de-frente' }); return; }
    const mark = kind ?? (dir === 'right' ? 'ring' : dir === 'up' ? 'dot' : 'x');
    const prev = api.getState().marks[raw.id];
    api.getState().mark(raw.id, mark);
    t.action('mark.' + mark, { film: raw.id, dir });
    const toasts: Record<string, Toast_> = {
      ring: { mark: 'ring', text: 'Añadida a Ver' }, dot: { mark: 'dot', text: 'Guardada en tu historial' },
      both: { mark: 'both', text: 'Vista y lista para repetir' }, x: { icon: 'x', text: 'Anotado, afinamos tu perfil' },
    };
    const seq = ++toastSeq.current;
    setExit(dir); setD({ dx: 0, dy: 0, dragging: false }); setToast(toasts[mark]); setLast({ i, id: raw.id, prev });
    const film = raw;
    later(() => {
      const showMatch = (mark === 'ring' || mark === 'both') && film.match >= 90;
      api.getState().advance();
      setExit(null); setFlipped(false); setD({ dx: 0, dy: 0, dragging: false }); setMatch(showMatch ? film : null);
      if (showMatch) t.action('match.special', { film: film.id });
      animateGauge(showMatch ? 0 : 120, i + 1);
    }, 340);
    later(() => { if (seq === toastSeq.current) { setToast(null); setLast(null); } }, 4200);
  };

  const undo = () => {
    if (!last || exit) return;
    const l = last;
    t.action('undo', { film: l.id });
    api.getState().mark(l.id, (l.prev as never) ?? null);
    api.getState().setI(l.i);
    toastSeq.current++;
    setFlipped(false); setD({ dx: 0, dy: 0, dragging: false }); setMatch(null); setToast(null); setLast(null);
    animateGauge(120, l.i);
  };

  const prep = (f: Film | undefined) => {
    if (!f) return null;
    const p = f === raw ? Math.min(1, g / f.match) : 1;
    return {
      ...f,
      matchShown: f === raw ? Math.round(g) : f.match,
      people: (f.creators ?? []).map((c) => ({ initial: c[0], tone: c[1] })),
      dimsView: (f.dims ?? []).map<DimView>((x) => ({ label: x[0], word: x[2], value: Math.round(x[1] * p) })),
    };
  };
  const film = prep(raw);

  let right = 0, left = 0, up = 0;
  if (exit === 'right') right = 1; else if (exit === 'left') left = 1; else if (exit === 'up') up = 1;
  else if (-d.dy > Math.abs(d.dx)) up = flipped ? clamp(-d.dy / 110) : 0;
  else { right = clamp(d.dx / 110); left = clamp(-d.dx / 110); }

  let transform: string;
  if (exit === 'right') transform = `translate(560px, ${d.dy}px) rotate(22deg)`;
  else if (exit === 'left') transform = `translate(-560px, ${d.dy}px) rotate(-22deg)`;
  else if (exit === 'up') transform = `translate(${d.dx}px, -900px)`;
  else transform = `translate(${d.dx}px, ${d.dy}px) rotate(${(d.dx / 16).toFixed(2)}deg)`;

  const rings = films.filter((f) => marks[f.id] === 'ring' || marks[f.id] === 'both').length;
  const listas = rings === 1 ? '1 película lista' : rings + ' películas listas';
  const busy = !!exit || !raw;

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (exit || sheet || dim) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignorar */ }
    setD((x) => ({ ...x, dragging: true }));
    if (hold.current) clearTimeout(hold.current);
    hold.current = setTimeout(() => {
      if (drag.current && !drag.current.moved && flipped && !exit) {
        drag.current = null; t.action('longpress', { film: raw?.id });
        setD({ dx: 0, dy: 0, dragging: false }); setSheet(true);
      }
    }, 520);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) { drag.current.moved = true; if (hold.current) clearTimeout(hold.current); }
    if (drag.current.moved) setD({ dx, dy: Math.min(dy, 40), dragging: true });
  };
  const onUp = () => {
    if (hold.current) clearTimeout(hold.current);
    if (!drag.current) { setD((x) => ({ ...x, dragging: false })); return; }
    const dr = drag.current; drag.current = null;
    if (!dr.moved) { setD((x) => ({ ...x, dragging: false })); doFlip(); return; } // con setPointerCapture el click no llega al botón: el toque voltea aquí (como en el artefacto)
    const { dx, dy } = d;
    if (-dy > 90 && -dy > Math.abs(dx) && flipped) act('up');
    else if (dx > 100) act('right');
    else if (dx < -100) act('left');
    else setD({ dx: 0, dy: 0, dragging: false });
  };
  const onFlip = () => { if (Date.now() - lastFlip.current < 400) return; doFlip(); };
  const openDim = (x: DimSel) => { if (!exit) { drag.current = null; setD({ dx: 0, dy: 0, dragging: false }); setDim(x); t.action('dim.open', { dim: x.label }); } };

  const dimInfo = dim ? DIM_INFO[dim.label] : null;
  const dimRaw = dim && raw?.dims ? raw.dims.find((x) => x[0] === dim.label) : null;
  const dimWord = dim?.word ?? '';
  const dimScale = dimInfo ? (dimInfo.scale.indexOf(dimWord) < 0 ? [dimWord, ...dimInfo.scale.slice(0, 3)] : dimInfo.scale) : [];

  return (
    <div style={s('width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); color: var(--ink); font-family: var(--font-sans)')}>
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 380px; width: 760px; height: 760px; margin-left: -380px; margin-top: -380px; border-radius: 50%; background: var(--surface-sunk); pointer-events: none')} />
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 380px; width: 560px; height: 560px; margin-left: -280px; margin-top: -280px; border-radius: 50%; background: var(--surface-raised); opacity: 0.7; pointer-events: none')} />
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 380px; width: 380px; height: 380px; margin-left: -190px; margin-top: -190px; border-radius: 50%; background: var(--line); opacity: 0.35; pointer-events: none')} />
      <Twinkle size={18} style={{ left: 22, top: 92 }} />
      <Twinkle size={12} style={{ right: 26, top: 640, animationDelay: '1.1s' }} />

      <div style={s('position: relative; z-index: 2')}><AppHeader chip="Premisa" /></div>
      <div style={s('position: relative; z-index: 2; padding: 6px var(--space-5) 4px')}><DeckProgress total={total} current={Math.min(i, total - 1)} /></div>

      <main style={s('position: relative; z-index: 2; flex: 1; min-height: 0; padding: 4px var(--space-5) 8px; display: flex; align-items: center')}>
        <div style={s('position: relative; width: 100%; height: 560px')}>
          {i + 1 < total && <div aria-hidden="true" style={s('position: absolute; left: 14px; right: 14px; top: 12px; bottom: 0; border-radius: var(--radius-card); background: var(--brand-deep); border: var(--border-control) solid var(--sun-core); opacity: 0.55')} />}

          {raw && film && (
            <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              style={{ ...s('position: absolute; inset: 0; touch-action: none; user-select: none'), transform, transition: d.dragging ? 'none' : 'transform var(--duration-card) var(--ease-out)' }}>
              <DeckCard hook={raw.hook} match={film.matchShown} verdict={raw.verdict} dims={film.dimsView} reason={raw.reason} people={film.people} genres={raw.genres}
                title={raw.title} director={raw.director} description={raw.desc} image={raw.image} platforms={raw.platforms} meta={raw.meta}
                flipped={flipped} onFlip={onFlip} onDim={openDim} height={560} />

              {flipped && (
                <button type="button" className="kn-btn kn-btn-inverse kn-btn-sm" onClick={() => { if (flipped && !exit) { t.action('similares.open'); setSheet(true); } }} onPointerDown={(e) => e.stopPropagation()} aria-label="Ver su ADN y películas similares" data-track="S02.similares"
                  style={s('position: absolute; top: 12px; left: 12px; z-index: 3; gap: 8px')}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill="var(--sun)" /></svg>
                  Similares
                </button>
              )}

              <div aria-hidden="true" style={{ ...s('position: absolute; top: 28px; left: 22px; transform: rotate(-12deg); pointer-events: none; display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 12px; background: var(--sun-core); border: 3px solid var(--mark-ring); color: var(--mark-ring); font-family: var(--font-display); font-weight: 900; font-size: 26px; text-transform: uppercase'), opacity: right }}>
                <Mark type="ring" size={22} label="" />Quiero verla
              </div>
              <div aria-hidden="true" style={{ ...s('position: absolute; top: 28px; right: 22px; transform: rotate(12deg); pointer-events: none; padding: 8px 14px; border-radius: 12px; background: var(--sun-core); border: 3px solid var(--mark-dot); color: var(--mark-dot); font-family: var(--font-display); font-weight: 900; font-size: 26px; text-transform: uppercase'), opacity: left }}>No me interesa</div>
              <div aria-hidden="true" style={{ ...s('position: absolute; bottom: 70px; left: 50%; transform: translateX(-50%); pointer-events: none; display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 12px; background: var(--mark-dot); border: 3px solid var(--sun-core); color: var(--sun-core); font-family: var(--font-display); font-weight: 900; font-size: 26px; text-transform: uppercase; white-space: nowrap'), opacity: up }}>
                <Mark type="dot" size={20} label="" />Ya la vi
              </div>
            </div>
          )}

          {!raw && (
            <div className="kn-pop" style={s('height: 100%; box-sizing: border-box; border-radius: var(--radius-card); border: 3px dashed var(--line-strong); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 32px; text-align: center')}>
              <h2 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 36px; text-transform: uppercase; line-height: 1')} data-hierarchy="primary">Mazo terminado</h2>
              <p style={s('margin: 0; font-size: 15px; color: var(--ink-muted); line-height: 1.45')}>Tienes {listas} en Ver. Mira lo que aprendimos de ti cuando quieras.</p>
              <Button variant="primary" size="md" onClick={() => { t.action('deck.cierre'); nav('/recarga'); }} track="S02.ver-cierre">Ver el cierre del mazo</Button>
              <Button variant="ghost" size="sm" onClick={() => { t.action('deck.redeal'); api.getState().dealDeck(deck.id); setFlipped(false); setMatch(null); animateGauge(250, 0); }} track="S02.repartir-de-nuevo">Repartir de nuevo</Button>
            </div>
          )}
        </div>
      </main>

      <section aria-label="Acciones de la carta" style={s('position: relative; z-index: 2; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); justify-items: center; align-items: end; padding: 4px var(--space-5) 6px')}>
        <SwipeAction direction="left" intensity={left} disabled={busy} onClick={() => act('left')} track="S02.btn-no" />
        <SwipeAction direction="up" intensity={up} label={flipped ? 'Ya la vi' : 'Revela primero'} disabled={busy || !flipped} onClick={() => act('up')} track="S02.btn-vista" />
        <SwipeAction direction="right" intensity={right} disabled={busy} onClick={() => act('right')} track="S02.btn-quiero" />
      </section>

      <div style={s('position: relative; z-index: 2')}><TabBar active="descubrir" onNavigate={(x) => { t.action('nav.tab', { tab: x }); nav(x === 'ver' ? '/ver' : '/descubrir'); }} /></div>

      {toast && (
        <div style={s('position: absolute; left: 0; right: 0; bottom: 214px; z-index: 15; display: flex; align-items: center; justify-content: center; gap: 8px')}>
          <Toast mark={toast.mark ?? ''} icon={toast.icon ?? ''}>{toast.text}</Toast>
          <Button variant="inverse" size="sm" onClick={undo} track="S02.deshacer">Deshacer</Button>
        </div>
      )}

      {sheet && raw && (
        <div style={s('position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column; justify-content: flex-end')}>
          <button type="button" aria-label="Cerrar" data-track="S02.sheet-cerrar-fondo" onClick={() => setSheet(false)} style={s('position: absolute; inset: 0; border: 0; padding: 0; background: var(--scrim)')} />
          <section className="kn-sheet" aria-label="ADN y películas similares" style={s('position: relative')}>
            <span className="kn-sheet-handle" aria-hidden="true" />
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span className="kn-sheet-kicker">{raw.title}</span>
              <h2 className="kn-sheet-title">Su ADN</h2>
            </div>
            <div style={s('display: flex; flex-direction: column; gap: 10px')}>
              {(raw.dims ?? []).map((x) => (
                <div key={x[0]} style={s('display: grid; grid-template-columns: 112px minmax(0, 1fr); align-items: center; gap: 10px; font-size: 13px')}>
                  <span style={s('font-weight: 700')}>{x[0]} <span style={s('font-weight: 500; color: var(--ink-inverse-muted)')}>· {x[2]}</span></span>
                  <span aria-hidden="true" style={s('display: block; height: 10px; border-radius: 5px; background: color-mix(in srgb, var(--ink-inverse) 16%, transparent); overflow: hidden')}><span style={{ ...s('display: block; height: 100%; border-radius: 5px; background: var(--sun)'), width: x[1] + '%' }} /></span>
                </div>
              ))}
            </div>
            <span style={s('font-size: 12px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--ink-inverse-muted); margin-top: 4px')}>Películas con un ADN parecido</span>
            <div style={s('display: flex; flex-direction: column; gap: var(--space-2)')}>
              {(raw.similar ?? [['Película similar', 'Tono y ritmo parecidos'], ['Película similar', 'Mismo universo visual'], ['Película similar', 'Historia del mismo estilo']]).map((m, k) => (
                <OptionRow key={k} title={m[0]} subtitle={m[1]} thumbLabel={m[0].charAt(0)} onClick={() => setSheet(false)} track={'S02.similar-' + k} />
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSheet(false)} track="S02.sheet-cerrar">Cerrar</Button>
          </section>
        </div>
      )}

      {dim && dimInfo && (
        <div style={s('position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column; justify-content: flex-end')}>
          <button type="button" aria-label="Cerrar" data-track="S02.dim-cerrar-fondo" onClick={() => setDim(null)} style={s('position: absolute; inset: 0; border: 0; padding: 0; background: var(--scrim)')} />
          <section className="kn-sheet" aria-label={'Qué significa ' + dim.label} style={s('position: relative; gap: 14px')}>
            <span className="kn-sheet-handle" aria-hidden="true" />
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span className="kn-sheet-kicker">{dimInfo.kicker}</span>
              <h2 className="kn-sheet-title">{dim.label}</h2>
            </div>
            <div style={{ ...s('position: relative; overflow: hidden; display: flex; align-items: center; gap: 16px; padding: 14px 18px 14px 14px; border-radius: var(--radius-lg)'), background: dimInfo.bg, color: dimInfo.ink }}>
              <span aria-hidden="true" style={s('position: absolute; right: -40px; bottom: -50px; width: 150px; height: 150px; border-radius: 50%; background: currentColor; opacity: 0.08')} />
              <TasteArt label={dim.label} word={dimWord} size={84} />
              <div style={s('position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0')}>
                <span style={s('font-size: 10.5px; font-weight: 800; letter-spacing: 1.3px; text-transform: uppercase; opacity: 0.75')}>En esta película</span>
                <span style={s('font-family: var(--font-display); font-weight: 900; font-size: 34px; line-height: 0.92; text-transform: uppercase')}>{dimWord}</span>
                {dim.top && <span style={s('align-self: flex-start; margin-top: 2px; padding: 3px 9px; border-radius: var(--radius-pill); background: #1A1411; color: var(--sun); font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase')}>★ Tu punto fuerte</span>}
              </div>
            </div>
            <p style={s('margin: 0; font-size: 15px; line-height: 1.45')}>{dimInfo.meaning}</p>
            <p style={s('margin: -4px 0 0; font-size: 14px; line-height: 1.45; color: var(--ink-inverse-muted)')}><strong style={s('color: var(--ink-inverse)')}>{dimWord.charAt(0).toUpperCase() + dimWord.slice(1)}:</strong> {WORD_INFO[dimWord] ?? 'así se siente esta película en ' + (dimInfo.area ?? dimInfo.short) + '.'}</p>
            <div style={s('display: flex; flex-direction: column; gap: 8px')}>
              <span style={s('font-size: 11px; font-weight: 800; letter-spacing: 1.3px; text-transform: uppercase; color: var(--ink-inverse-muted)')}>Otras formas de {dimInfo.short}</span>
              <div style={s('display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px')}>
                {dimScale.map((w) => (
                  <div key={w} style={{ ...s('display: flex; flex-direction: column; align-items: center; gap: 6px'), opacity: w === dimWord ? 1 : 0.55 }}>
                    <span style={{ ...s('display: flex; align-items: center; justify-content: center; width: 58px; height: 58px; border-radius: 14px'), background: dimInfo.bg, boxShadow: w === dimWord ? '0 0 0 3px var(--surface-inverse), 0 0 0 5px var(--sun)' : 'none' }}><TasteArt label={dim.label} word={w} size={40} /></span>
                    <span style={s('font-size: 11.5px; font-weight: 700; text-align: center; line-height: 1.15')}>{w}</span>
                  </div>
                ))}
              </div>
            </div>
            <span style={s('font-size: 12.5px; color: var(--ink-inverse-muted)')}>{dimRaw ? `Encaja en un ${dimRaw[1]}% con lo que sueles guardar en ${dimInfo.area ?? dimInfo.short}.` : ''}</span>
            <Button variant="secondary" size="md" block onClick={() => setDim(null)} track="S02.dim-entendido">Entendido</Button>
          </section>
        </div>
      )}

      {match && (
        <div className="kn-pop" role="dialog" aria-label="Esta es muy tú" style={s('position: absolute; inset: 0; z-index: 30; background: var(--surface); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 32px 28px; box-sizing: border-box; text-align: center; overflow: hidden')}>
          <div aria-hidden="true" className="kn-spin" style={s('position: absolute; left: 50%; top: 300px; width: 640px; height: 640px; margin: -320px 0 0 -320px; border-radius: 50%; background: repeating-conic-gradient(var(--surface-raised) 0deg 6deg, var(--surface) 6deg 12deg)')} />
          <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 300px; width: 380px; height: 380px; margin: -190px 0 0 -190px; border-radius: 50%; background: var(--brand)')} />
          <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 300px; width: 300px; height: 300px; margin: -150px 0 0 -150px; border-radius: 50%; background: var(--sun)')} />
          <div style={s('position: relative; width: 196px; height: 264px; border-radius: var(--radius-lg); overflow: hidden; border: 4px solid var(--sun-core); box-shadow: var(--shadow-lift); background: var(--mark-dot); margin-top: 30px')}>
            {match.image ? <img src={match.image} alt={'Póster de ' + match.title} style={s('width: 100%; height: 100%; object-fit: cover')} /> : <div style={s('position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--brand)')}><Sun size={150} /></div>}
          </div>
          <div style={s('position: relative; display: flex; flex-direction: column; gap: 4px; margin-top: 40px')}>
            <span style={s('font-family: var(--font-script); font-size: 30px; color: var(--sun); line-height: 1')}>{match.match}% de match</span>
            <h2 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 54px; line-height: 0.95; text-transform: uppercase; color: var(--ink)')}>Esta es muy tú</h2>
            <p style={s('margin: 6px 0 0; font-size: 15px; color: var(--ink-muted)')}>Ya tienes {listas} para esta noche</p>
          </div>
          <div style={s('position: relative; display: flex; flex-direction: column; gap: 10px; width: 100%')}>
            <Button variant="primary" size="lg" block onClick={() => { t.action('match.ir-ver'); nav('/ver'); }} track="S02.match-ir-ver">Ir a Ver</Button>
            <Button variant="ghost" size="md" block onClick={() => setMatch(null)} track="S02.match-seguir">Seguir descubriendo</Button>
          </div>
        </div>
      )}
    </div>
  );
}
