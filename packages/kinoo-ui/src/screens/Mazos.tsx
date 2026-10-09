import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, Button, DeckBack, Sun, TabBar } from '../components';
import { HERO_BY_MOOD, HERO_DEFAULT, OTHER_DECKS } from '../films';
import { deckFilmIds, useProduct, useProductApi } from '../store';
import { useScreen, useTracker } from '../tracker';
import { s } from '../util';
import { Twinkle } from './moodArt';

interface Target { id: string; name: string }

function knSlots() {
  const slots: { bg: string; border: string; star: boolean }[] = [];
  for (let k = 0; k < 10; k++) {
    if (k < 6) slots.push({ bg: 'var(--brand)', border: 'var(--brand)', star: false });
    else if (k < 8) slots.push({ bg: 'var(--sun-core)', border: 'var(--sun-core)', star: false });
    else if (k < 9) slots.push({ bg: 'transparent', border: 'var(--sun)', star: false });
    else slots.push({ bg: 'var(--mark-dot)', border: 'var(--sun)', star: true });
  }
  return slots;
}
const Star = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill="var(--sun)" /></svg>;

/** S05 · Gestión de mazo (menú, barajando, listo). Subestados: S05, S05.confirm, S05.barajando, S05.listo. */
export function Mazos() {
  const nav = useNavigate();
  const t = useTracker();
  const api = useProductApi();
  const mood = useProduct((x) => x.mood);
  const deck = useProduct((x) => x.deck);
  const [screen, setScreen] = useState<'menu' | 'barajando' | 'listo'>('menu');
  const [activeOther, setActiveOther] = useState(0);
  const [sheet, setSheet] = useState<'swap' | null>(null);
  const [pending, setPending] = useState<Target | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const sub = sheet === 'swap' ? 'S05.confirm' : screen === 'barajando' ? 'S05.barajando' : screen === 'listo' ? 'S05.listo' : 'S05';
  useScreen(sub);

  const hero = { id: 'hero-' + (mood?.id ?? 'default'), kicker: 'Mood', ...(mood ? HERO_BY_MOOD[mood.id] : HERO_DEFAULT) };
  const active = OTHER_DECKS[activeOther] ?? OTHER_DECKS[0];
  const total = deckFilmIds(deck.id).length;
  const hasCurso = deck.dealt && deck.i > 0 && deck.i < total;
  const nombreCurso = deck.id === 'nolan' ? OTHER_DECKS[0].name : deck.id === 'creadores' ? OTHER_DECKS[1].name : hero.name;
  const slots = knSlots();

  const shuffle = (tg: Target) => {
    api.getState().dealDeck(tg.id.startsWith('hero-') ? 'mood' : tg.id);
    t.action('deck.dealt', { deck: tg.id.startsWith('hero-') ? 'mood' : tg.id });
    setTarget(tg); setSheet(null); setScreen('barajando');
    timers.current.push(setTimeout(() => setScreen('listo'), 1900));
  };
  const ask = (tg: Target, via: string) => {
    t.action('deck.pick:' + (tg.id.startsWith('hero-') ? 'mood' : tg.id), { via });
    if (hasCurso) { setPending(tg); setSheet('swap'); } else shuffle(tg);
  };

  const Tt = target ?? { id: hero.id, name: hero.name };

  return (
    <div style={s('width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); color: var(--ink); font-family: var(--font-sans)')}>
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: -100px; width: 620px; height: 620px; margin-left: -310px; border-radius: 50%; background: var(--surface-sunk); pointer-events: none')} />
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: -40px; width: 440px; height: 440px; margin-left: -220px; border-radius: 50%; background: var(--surface-raised); opacity: 0.55; pointer-events: none')} />
      <Twinkle size={16} style={{ right: 24, top: 120 }} />

      <div style={s('position: relative; z-index: 2')}><AppHeader chip="Tus mazos" /></div>

      <main className="kn-scroll" style={s('position: relative; z-index: 2; flex: 1; min-height: 0; overflow-y: auto; padding: 6px var(--space-5) 16px')}>
        {screen === 'menu' && (
          <div className="kn-pop" style={s('display: flex; flex-direction: column; gap: 22px')}>
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span style={s('font-family: var(--font-script); font-size: 24px; line-height: 1; color: var(--sun-ink)')}>para esta noche</span>
              <h1 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 42px; line-height: 0.9; text-transform: uppercase')} data-hierarchy="primary">Tus mazos</h1>
            </div>

            {hasCurso && (
              <div style={s('display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--radius-lg); background: var(--surface-inverse); color: var(--ink-inverse)')}>
                <Sun size={40} />
                <div style={s('flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px')}>
                  <span style={s('font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--ink-inverse-muted)')}>Mazo en curso</span>
                  <span style={s('font-size: 14px; font-weight: 700; line-height: 1.25')}>{nombreCurso} · {deck.i + 1} de {total}</span>
                </div>
                <Button variant="primary" size="sm" onClick={() => { t.action('deck.resume'); nav('/descubrir'); }} track="S05.retomar">Retomar</Button>
              </div>
            )}

            <div style={s('display: flex; flex-direction: column; gap: 10px')}>
              <span style={s('font-size: 11px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: var(--ink-subtle)')}>Mazo del día · Mood</span>
              <div style={s('display: flex; flex-direction: column; border-radius: var(--radius-lg); overflow: hidden; background: var(--surface-raised); border: var(--border-hairline) solid var(--line)')}>
                <div aria-hidden="true" style={{ ...s('position: relative; height: 128px; overflow: hidden'), background: hero.tone }}>
                  <div style={{ ...s('position: absolute; left: 50%; top: 50%; width: 230px; height: 230px; margin: -115px 0 0 -115px; border-radius: 50%; opacity: 0.9'), background: hero.ring }} />
                  <div style={s('position: absolute; left: 50%; top: 50%; width: 118px; height: 118px; margin: -59px 0 0 -59px; border-radius: 50%; background: var(--sun-core)')} />
                  <span style={s('position: absolute; left: 12px; top: 12px; padding: 4px 10px; border-radius: var(--radius-pill); background: var(--surface-inverse); color: var(--ink-inverse); font-size: 10px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase')}>Del día</span>
                </div>
                <div style={s('display: flex; flex-direction: column; gap: 6px; padding: 12px 14px 14px')}>
                  <span style={s('font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--ink-subtle)')}>{hero.kicker}</span>
                  <span style={s('font-family: var(--font-display); font-weight: 900; font-size: 24px; line-height: 1; text-transform: uppercase')}>{hero.name}</span>
                  <span style={s('font-size: 12.5px; line-height: 1.4; color: var(--ink-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden')}>{hero.desc}</span>
                  <div aria-label="Composición: 6 afines, 2 de creadores, 1 comodín y 1 sorpresa" style={s('display: flex; gap: 3px; margin-top: 2px')}>
                    {slots.map((sl, i) => <span key={i} aria-hidden="true" style={{ ...s('flex: 1; height: 8px; border-radius: 3px; border-width: 1.5px; border-style: solid'), background: sl.bg, borderColor: sl.border }} />)}
                  </div>
                  <span style={s('font-size: 11px; color: var(--ink-subtle)')}>6 afines · 2 de creadores · 1 comodín · 1 sorpresa</span>
                  <Button variant="primary" size="md" icon="shuffle" block onClick={() => ask({ id: hero.id, name: hero.name }, 'hero')} track="S05.hero-barajar">Barajar y repartir</Button>
                </div>
              </div>
            </div>

            <div style={s('display: flex; flex-direction: column; gap: 10px')}>
              <span style={s('font-size: 11px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: var(--ink-subtle)')}>Tus otros dos mazos</span>
              <div className="kn-scroll" style={s('display: flex; gap: 14px; overflow-x: auto; padding: 4px 2px 12px; scroll-snap-type: x proximity')}>
                {OTHER_DECKS.map((o, i) => (
                  <div key={o.id} className="kn-genre" style={s('flex: 0 0 92px; scroll-snap-align: start; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 2px; border-radius: var(--radius-md)')}>
                    <DeckBack kind={o.back} name={o.short} selected={i === activeOther} onClick={() => { setActiveOther(i); t.action('deck.pick:' + o.id, { via: 'carrusel' }); }} track={'S05.deck-' + o.id} />
                  </div>
                ))}
              </div>

              <div style={s('display: flex; flex-direction: column; gap: 10px; padding: var(--space-4) 14px; border-radius: var(--radius-lg); background: var(--surface-raised); border: var(--border-hairline) solid var(--line)')}>
                <div style={s('display: flex; flex-direction: column; gap: 4px')}>
                  <span style={s('font-family: var(--font-display); font-weight: 900; font-size: 24px; line-height: 1; text-transform: uppercase')}>{active.name}</span>
                  <span style={s('font-size: 13px; line-height: 1.4; color: var(--ink-muted)')}>{active.desc}</span>
                </div>
                {active.note && (
                  <div style={s('display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--radius-md); background: var(--surface-sunk)')}>
                    <span aria-hidden="true" style={s('flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--sun); color: var(--on-sun); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800')}>{(active.signed ?? '').charAt(0)}</span>
                    <span style={s('font-family: var(--font-script); font-size: 21px; line-height: 1.05; color: var(--sun-ink)')}>“{active.note}” <span style={s('font-family: var(--font-sans); font-size: 12px; font-weight: 600; color: var(--ink-subtle)')}>· {active.signed}</span></span>
                  </div>
                )}
                <div aria-label="Composición: 6 afines, 2 de creadores, 1 comodín y 1 sorpresa" style={s('display: flex; gap: var(--space-1)')}>
                  {slots.map((sl, i) => (
                    <span key={i} aria-hidden="true" style={{ ...s('flex: 1; height: 24px; border-radius: 5px; border-width: 2px; border-style: solid; display: flex; align-items: center; justify-content: center'), background: sl.bg, borderColor: sl.border }}>
                      {sl.star && <Star size={11} />}
                    </span>
                  ))}
                </div>
                <div style={s('display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11.5px; font-weight: 600; color: var(--ink-subtle)')}>
                  <span style={s('display: flex; align-items: center; gap: 5px')}><span style={s('width: 9px; height: 9px; border-radius: 2px; background: var(--brand)')} />6 afines</span>
                  <span style={s('display: flex; align-items: center; gap: 5px')}><span style={s('width: 9px; height: 9px; border-radius: 2px; background: var(--sun-core)')} />2 de creadores</span>
                  <span style={s('display: flex; align-items: center; gap: 5px')}><span style={s('width: 9px; height: 9px; border-radius: 2px; border: 2px solid var(--sun); box-sizing: border-box')} />1 comodín</span>
                  <span style={s('display: flex; align-items: center; gap: 5px')}><Star size={10} />1 sorpresa</span>
                </div>
                <Button variant="secondary" size="md" icon="shuffle" block onClick={() => ask({ id: active.id, name: active.name }, 'otro')} track="S05.otro-barajar">Barajar y repartir</Button>
              </div>

              <Button variant="ghost" size="sm" block onClick={() => { t.action('mood.otro'); nav('/mood'); }} track="S05.volver-mood">¿Nada te llama? Volver a elegir tu mood</Button>
            </div>
          </div>
        )}

        {screen === 'barajando' && (
          <div style={s('min-height: 680px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px')}>
            <div aria-hidden="true" style={s('position: relative; width: 150px; height: 210px')}>
              <div className="kn-spin" style={s('position: absolute; left: 50%; top: 50%; width: 420px; height: 420px; margin: -210px 0 0 -210px; border-radius: 50%; background: repeating-conic-gradient(var(--surface-raised) 0deg 6deg, transparent 6deg 12deg)')} />
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={i % 2 ? 'kn-rr' : 'kn-rl'} style={{ ...s('position: absolute; inset: 0'), animationDelay: i * 40 + 'ms' }}>
                  <div style={{ ...s('position: absolute; inset: 0; border-radius: 16px; overflow: hidden; border: var(--border-card) solid var(--sun-core); background: var(--brand); box-shadow: var(--shadow-card)'), transform: `translateY(${-i * 3}px)` }}>
                    <div style={s('position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; background: var(--sun)')} />
                    <div style={s('position: absolute; left: 50%; top: 50%; width: 70px; height: 70px; margin: -35px 0 0 -35px; border-radius: 50%; background: var(--sun-core)')} />
                  </div>
                </div>
              ))}
            </div>
            <div style={s('position: relative; text-align: center; display: flex; flex-direction: column; gap: 4px')}>
              <span style={s('font-family: var(--font-script); font-size: 26px; color: var(--sun-ink); line-height: 1')}>barajando</span>
              <span style={s('font-family: var(--font-display); font-weight: 900; font-size: 32px; text-transform: uppercase; line-height: 1')}>{Tt.name}</span>
            </div>
          </div>
        )}

        {screen === 'listo' && (
          <div style={s('min-height: 680px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; text-align: center')}>
            <div aria-hidden="true" style={s('position: relative; width: 210px; height: 230px')}>
              {[-12, -6, 0, 6, 12].map((rot, i) => (
                <div key={i} className="kn-deal" style={{ ...s('position: absolute; left: 30px; top: 10px; width: 150px; height: 210px'), animationDelay: i * 90 + 'ms' }}>
                  <div style={{ ...s('position: absolute; inset: 0; border-radius: 16px; overflow: hidden; border: var(--border-card) solid var(--sun-core); background: var(--brand); box-shadow: var(--shadow-card)'), transform: `rotate(${rot}deg) translate(${(i - 2) * 6}px, ${Math.abs(i - 2) * 6}px)` }}>
                    <div style={s('position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; background: var(--sun)')} />
                    <div style={s('position: absolute; left: 50%; top: 50%; width: 70px; height: 70px; margin: -35px 0 0 -35px; border-radius: 50%; background: var(--sun-core)')} />
                  </div>
                </div>
              ))}
            </div>
            <div className="kn-pop" style={{ ...s('display: flex; flex-direction: column; gap: 6px'), animationDelay: '500ms' }}>
              <span style={s('font-family: var(--font-script); font-size: 26px; color: var(--sun-ink); line-height: 1')}>tu mazo está listo</span>
              <h1 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 40px; line-height: 0.92; text-transform: uppercase')} data-hierarchy="primary">{Tt.name}</h1>
              <span style={s('font-size: 14px; color: var(--ink-muted)')}>10 cartas · y una de ellas es especial</span>
            </div>
            <div className="kn-pop" style={{ ...s('width: 100%; display: flex; flex-direction: column; gap: var(--space-1)'), animationDelay: '650ms' }}>
              <Button variant="primary" size="lg" block onClick={() => { t.action('deck.start'); nav('/descubrir'); }} track="S05.empezar">Empezar a descubrir</Button>
              <Button variant="ghost" size="sm" block onClick={() => setScreen('menu')} track="S05.volver-mazos">Volver a tus mazos</Button>
            </div>
          </div>
        )}
      </main>

      <div style={s('position: relative; z-index: 2')}><TabBar active="descubrir" onNavigate={(x) => { t.action('nav.tab', { tab: x }); nav(x === 'ver' ? '/ver' : '/mazos'); }} /></div>

      {sheet === 'swap' && (
        <div style={s('position: absolute; inset: 0; z-index: 25; display: flex; flex-direction: column; justify-content: flex-end')}>
          <button type="button" aria-label="Cerrar" className="kn-fade" data-track="S05.confirm-cerrar" onClick={() => setSheet(null)} style={s('position: absolute; inset: 0; border: 0; padding: 0; background: var(--scrim)')} />
          <section className="kn-sheet" aria-label="Tienes un mazo a medias" style={s('position: relative')}>
            <span className="kn-sheet-handle" aria-hidden="true" />
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span className="kn-sheet-kicker">mazo a medias</span>
              <h2 className="kn-sheet-title">¿Abrir otro mazo?</h2>
            </div>
            <p style={s('margin: -6px 0 0; font-size: 13px; line-height: 1.4; color: var(--ink-inverse-muted)')}>{nombreCurso} se queda guardado donde lo dejaste: {deck.i + 1} de {total}. Puedes retomarlo cuando quieras.</p>
            <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px')}>
              <Button variant="secondary" size="md" block onClick={() => { t.action('swap.keep'); setSheet(null); nav('/descubrir'); }} track="S05.retomar-mio">Retomar el mío</Button>
              <Button variant="primary" size="md" block onClick={() => { t.action('swap.confirm'); if (pending) shuffle(pending); setPending(null); }} track="S05.abrir-otro">Abrir otro</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
