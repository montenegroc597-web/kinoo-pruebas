import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, Button, Chip, Mark, StatTile, TabBar, Toast } from '../components';
import { RC_ASKS, RC_MOODS, RC_ORDER, filmById } from '../films';
import { deckFilmIds, useProduct, useProductApi, type RecargaScreen } from '../store';
import { useScreen, useTracker } from '../tracker';
import { s } from '../util';
import { Twinkle } from './moodArt';

const nextAsk = (cur: string): RecargaScreen => {
  const k = (RC_ORDER as readonly string[]).indexOf(cur);
  return k >= 0 && k < RC_ORDER.length - 1 ? (RC_ORDER[k + 1] as RecargaScreen) : 'feedback';
};

/** S07 · Fin del mazo / recarga. Subestados: S07 (cierre), S07.recibo, S07.ask, S07.feedback, S07.elegir, S07.barajar, S07.listo. */
export function Recarga() {
  const nav = useNavigate();
  const t = useTracker();
  const api = useProductApi();
  const marks = useProduct((x) => x.marks);
  const deck = useProduct((x) => x.deck);
  const ans = useProduct((x) => x.recarga);
  const [screen, setScreen] = useState<RecargaScreen>(api.getState().boot.recarga);
  const [sel, setSel] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => { api.getState().clearBoot(); return () => timers.current.forEach(clearTimeout); }, [api]);

  const isAsk = (RC_ORDER as readonly string[]).includes(screen);
  useScreen(screen === 'cierre' ? 'S07' : isAsk ? 'S07.ask' : 'S07.' + screen);

  const films = deckFilmIds(deck.id).map((id) => filmById(id)!).filter(Boolean);
  const cnt = (m: string) => films.filter((f) => (m === 'ring' ? marks[f.id] === 'ring' || marks[f.id] === 'both' : marks[f.id] === m)).length;
  const nRing = cnt('ring'), nDot = cnt('dot'), nX = cnt('x');
  const listas = Object.values(marks).filter((m) => m === 'ring' || m === 'both').length;
  const verLabel = `Ir a Ver · ${listas} ${listas === 1 ? 'lista' : 'listas'} para hoy`;

  const m = RC_MOODS.find((x) => x.id === (ans.mood || 'melancolica'))!;
  const hiloNolan = ans.nolan !== 'menos';
  const decks = [
    { kind: 'Mood', bg: 'var(--brand)', ring: 'var(--sun)', name: m.deck, desc: m.desc, id: 'mood' },
    hiloNolan
      ? { kind: 'Hilo', id: 'nolan', bg: 'var(--sun)', ring: 'var(--brand)', name: ans.nolan === 'parecido' ? 'Cerca de Nolan' : 'Sigue a Christopher Nolan', desc: ans.nolan === 'parecido' ? 'Directores con su misma ambición, otras miradas.' : 'Porque marcaste Interstellar con ○: su obra y las películas que lo inspiraron.' }
      : { kind: 'Hilo', id: 'hilo-foto', bg: 'var(--sun)', ring: 'var(--brand)', name: 'Sigue la fotografía de Marta Ibáñez', desc: 'Tu punto fuerte es lo visual: películas con la misma mano detrás de la cámara.' },
    { kind: 'Creadores', id: 'creadores', bg: 'var(--cine-red)', ring: 'var(--sun)', name: 'Lo que guardaron Ana y Leo', desc: 'Las ○ más recientes de creadores que sigues y que tú aún no has visto.' },
  ];
  const cur = decks[sel];
  const flap = (bg: string) => `color-mix(in srgb, ${bg} 72%, #000)`;

  const tags = [{ label: 'Tono épico' }];
  const insights = [{ text: 'Hoy te movieron las historias grandes y serias. Lo ligero no te llamó esta vez.' }];
  const mObj = RC_MOODS.find((x) => x.id === ans.mood);
  if (mObj) { tags.push({ label: 'Vibra ' + mObj.label.toLowerCase() }); insights.push({ text: 'Llegaste con una vibra ' + mObj.label.toLowerCase() + ': el mazo de hoy parte de ahí.' }); }
  if (ans.nolan === 'mas') { tags.push({ label: 'Más Nolan' }); insights.push({ text: 'Quieres más de Nolan: te armamos un hilo con su obra.' }); }
  else if (ans.nolan === 'parecido') { tags.push({ label: 'Cerca de Nolan' }); insights.push({ text: 'Te gusta su pulso, pero de otras manos: buscamos directores parecidos.' }); }
  else if (ans.nolan === 'menos') insights.push({ text: 'Nolan descansa por ahora; lo guardamos para otro día.' });
  if (ans.noir === 'si') { tags.push({ label: 'Cine negro' }); insights.push({ text: 'El cine negro es lo tuyo: aparecerá más seguido en tus mazos.' }); }
  else if (ans.noir === 'depende') insights.push({ text: 'El cine negro, solo algunos días: lo dejamos para cuando el mood lo pida.' });
  else if (ans.noir === 'no') insights.push({ text: 'Bajamos el cine negro en tus mazos.' });

  const def = RC_ASKS[isAsk ? screen : 'mood'];
  const goTab = (x: 'ver' | 'descubrir') => { t.action('nav.tab', { tab: x }); nav(x === 'ver' ? '/ver' : '/recarga'); };
  const empezar = () => {
    const dk = cur.id === 'nolan' ? 'nolan' : 'other';
    api.getState().dealDeck(dk);
    t.action('deck.dealt', { deck: dk, desde: 'recarga' });
    setScreen('barajar');
    later(() => setScreen('listo'), 1900);
  };
  const chip: Record<string, string> = { cierre: 'Fin del mazo', recibo: 'Recibo', mood: 'Tu día', hilo: 'Tu día', noir: 'Tu día', feedback: 'Tu día', elegir: 'Siguiente mazo' };

  const Root = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  void Root;
  const deckCard = (bg: string, ring: string, rot = 0, tr = '') => (
    <div style={{ ...s('position: absolute; inset: 0; border-radius: 16px; overflow: hidden; border: var(--border-card) solid var(--sun-core); box-shadow: var(--shadow-card)'), background: bg, transform: tr || `rotate(${rot}deg)` }}>
      <div style={{ ...s('position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%'), background: ring }} />
      <div style={s('position: absolute; left: 50%; top: 50%; width: 70px; height: 70px; margin: -35px 0 0 -35px; border-radius: 50%; background: var(--sun-core)')} />
    </div>
  );

  return (
    <div style={s('width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); color: var(--ink); font-family: var(--font-sans)')}>
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 360px; width: 760px; height: 760px; margin: -380px 0 0 -380px; border-radius: 50%; background: var(--surface-sunk); pointer-events: none')} />
      <div aria-hidden="true" style={s('position: absolute; left: 50%; top: 360px; width: 540px; height: 540px; margin: -270px 0 0 -270px; border-radius: 50%; background: var(--surface-raised); opacity: 0.7; pointer-events: none')} />
      <Twinkle size={16} style={{ left: 24, top: 120 }} />

      <div style={s('position: relative; z-index: 2')}><AppHeader chip={chip[screen] ?? 'Nuevo mazo'} /></div>

      <main style={s('position: relative; z-index: 2; flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 10px var(--space-5) 14px')}>

        {screen === 'cierre' && (
          <div className="kn-pop" style={s('flex: 1; display: flex; flex-direction: column; gap: 14px')}>
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span style={s('font-family: var(--font-script); font-size: 26px; color: var(--sun-ink); line-height: 1')}>buen mazo</span>
              <h1 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 52px; line-height: 0.9; text-transform: uppercase')} data-hierarchy="primary">Mazo terminado</h1>
            </div>
            <div style={s('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2)')}>
              <StatTile value={nRing} label="quieres verlas" mark="ring" tone="brand" />
              <StatTile value={nDot} label="ya la viste" mark="dot" tone="inverse" />
              <StatTile value={nX} label="no eran para ti" icon="x" tone="outline" />
            </div>
            <div style={s('display: flex; flex-direction: column; gap: 10px; padding: var(--space-4) 14px; border-radius: var(--radius-lg); background: var(--surface-raised); border: var(--border-hairline) solid var(--line)')}>
              <div style={s('display: flex; align-items: center; justify-content: space-between; gap: 10px')}>
                <span style={s('font-size: 12px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--ink-subtle)')}>Tu recibo del mazo</span>
                <Button variant="ghost" size="sm" icon="external" onClick={() => setScreen('recibo')} track="S07.compartir">Compartir</Button>
              </div>
              <div style={s('display: flex; gap: 10px')}>
                {films.slice(0, 3).map((f) => (
                  <div key={f.id} style={s('position: relative; width: 70px; height: 100px; border-radius: var(--radius-sm); overflow: hidden; border: var(--border-control) solid var(--sun-core); background: var(--brand)')}>
                    {f.image ? <img src={f.image} alt={'Póster de ' + f.title} style={s('width: 100%; height: 100%; object-fit: cover')} /> : null}
                  </div>
                ))}
              </div>
            </div>
            <div style={s('margin-top: auto; display: flex; flex-direction: column; gap: var(--space-2)')}>
              <Button variant="primary" size="lg" icon="sparkle" block onClick={() => { t.action('recarga.ask'); setScreen('mood'); }} track="S07.cuentanos" zone="T4.correcta">Cuéntanos cómo vas</Button>
              <Button variant="ghost" size="md" icon="play" block onClick={() => { t.action('recarga.ir-ver'); nav('/ver'); }} track="S07.ir-ver">{verLabel}</Button>
            </div>
          </div>
        )}

        {screen === 'recibo' && (
          <div className="kn-pop" style={s('flex: 1; display: flex; flex-direction: column; align-items: center; gap: 14px')}>
            <div style={s('width: 100%; max-width: 304px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 20px 16px; border-radius: 18px; background: var(--sun-core); color: var(--on-sun); box-shadow: var(--shadow-lift); text-align: center')}>
              <div style={s('display: flex; align-items: center; justify-content: space-between; width: 100%; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase')}>
                <span style={s('font-family: var(--font-display); font-weight: 900; font-size: 18px; letter-spacing: 1px')}>Kinoo</span>
                <span>Recibo del mazo</span>
              </div>
              <div style={s('width: 100%; border-top: 2px dashed var(--on-sun); opacity: 0.35')} />
              <h2 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 32px; line-height: 0.92; text-transform: uppercase')}>Lentas y melancólicas</h2>
              <div aria-hidden="true" style={s('position: relative; width: 100%; height: 188px')}>
                <div style={s('position: absolute; left: 8px; top: 18px; width: 100px; height: 146px; transform: rotate(-7deg); border-radius: var(--radius-sm); overflow: hidden; border: 3px solid var(--on-sun); box-shadow: var(--shadow-card)')}><img src={filmById('oppenheimer')!.image} alt="" style={s('width: 100%; height: 100%; object-fit: cover')} /></div>
                <div style={s('position: absolute; right: 8px; top: 18px; width: 100px; height: 146px; transform: rotate(7deg); border-radius: var(--radius-sm); overflow: hidden; border: 3px solid var(--on-sun); box-shadow: var(--shadow-card)')}><img src={filmById('darkknight')!.image} alt="" style={s('width: 100%; height: 100%; object-fit: cover')} /></div>
                <div style={s('position: absolute; left: 50%; top: 4px; width: 108px; height: 158px; margin-left: -54px; border-radius: var(--radius-sm); overflow: hidden; border: 3px solid var(--on-sun); box-shadow: var(--shadow-lift)')}><img src={filmById('interstellar')!.image} alt="" style={s('width: 100%; height: 100%; object-fit: cover')} /></div>
              </div>
              <span style={s('font-family: var(--font-script); font-size: 24px; line-height: 1.1')}>Hoy te movieron las historias grandes y serias.</span>
              <div style={s('width: 100%; border-top: 2px dashed var(--on-sun); opacity: 0.35')} />
              <div style={s('display: flex; align-items: center; justify-content: center; gap: 18px; font-size: 13px; font-weight: 700')}>
                <span style={s('display: flex; align-items: center; gap: 6px')}><Mark type="ring" size={18} label="" />{nRing}</span>
                <span style={s('display: flex; align-items: center; gap: 6px')}><Mark type="dot" size={18} label="" />{nDot}</span>
                <span style={s('display: flex; align-items: center; gap: 6px')}><span aria-hidden="true" style={s('font-size: 15px')}>✕</span>{nX}</span>
              </div>
            </div>
            <div style={s('margin-top: auto; width: 100%; display: flex; flex-direction: column; gap: var(--space-1)')}>
              <Button variant="primary" size="lg" iconEnd="external" block onClick={() => { t.action('recibo.share'); setToast('Recibo listo para compartir'); later(() => setToast(null), 2200); }} track="S07.compartir-recibo">Compartir recibo</Button>
              <Button variant="ghost" size="sm" block onClick={() => setScreen('cierre')} track="S07.volver-cierre">Volver al cierre</Button>
            </div>
          </div>
        )}

        {isAsk && (
          <div className="kn-pop" style={s('flex: 1; display: flex; flex-direction: column; gap: 14px')} key={screen}>
            <div style={s('display: flex; align-items: flex-end; justify-content: space-between; gap: 10px')}>
              <span style={s('font-family: var(--font-script); font-size: 24px; color: var(--sun-ink); line-height: 1')}>{def.kicker}</span>
              <div aria-label={`Pregunta ${def.step + 1} de 3`} style={s('display: flex; gap: 6px; padding-bottom: 6px')}>
                {RC_ORDER.map((_, k) => <span key={k} aria-hidden="true" style={{ ...s('width: 26px; height: 6px; border-radius: 3px'), background: k < def.step ? 'var(--sun)' : k === def.step ? 'var(--brand)' : 'var(--line)' }} />)}
              </div>
            </div>
            <h1 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 44px; line-height: 0.92; text-transform: uppercase')}>{def.title}</h1>
            <span style={s('font-size: 14px; line-height: 1.4; color: var(--ink-muted); margin-top: -4px')}>{def.hint}</span>
            <div role="radiogroup" aria-label={def.title} style={{ ...s('display: grid; gap: 10px; margin-top: 4px'), gridTemplateColumns: def.cols }}>
              {def.opts.map((o) => {
                const on = ans[def.key] === o.id;
                return (
                  <button key={o.id} type="button" role="radio" className="kn-tap kn-opt" aria-checked={on ? 'true' : 'false'} data-track={`S07.ask-${def.key}-${o.id}`}
                    onClick={() => { api.getState().setRecarga({ [def.key]: o.id }); t.action('recarga.answer', { q: def.key, a: o.id }); const from = screen; later(() => setScreen(nextAsk(from)), 380); }}
                    style={{ ...s('display: flex; flex-direction: column; justify-content: center; gap: 3px; padding: 12px 16px; border-radius: var(--radius-lg); border-width: var(--border-control); border-style: solid; text-align: left; cursor: pointer'), minHeight: def.h, borderColor: on ? 'var(--sun-core)' : 'var(--line-strong)', background: on ? 'var(--sun)' : 'var(--surface-raised)', color: on ? 'var(--on-sun)' : 'var(--ink)', transform: on ? 'scale(1.02)' : 'none' }}>
                    <span style={s('font-family: var(--font-display); font-weight: 900; font-size: 22px; line-height: 1; text-transform: uppercase')}>{o.label}</span>
                    {o.sub ? <span style={s('font-size: 13px; line-height: 1.3; opacity: 0.8')}>{o.sub}</span> : null}
                  </button>
                );
              })}
            </div>
            <div style={s('margin-top: auto; display: flex; align-items: center; justify-content: space-between')}>
              <span style={s('font-size: 12.5px; color: var(--ink-subtle)')}>Alimenta tus próximos mazos.</span>
              <Button variant="ghost" size="sm" onClick={() => { t.action('recarga.skip', { q: def.key }); setScreen(nextAsk(screen)); }} track="S07.omitir">Omitir</Button>
            </div>
          </div>
        )}

        {screen === 'feedback' && (
          <div className="kn-pop" style={s('flex: 1; display: flex; flex-direction: column; gap: 14px')}>
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span style={s('font-family: var(--font-script); font-size: 26px; color: var(--sun-ink); line-height: 1')}>lo que vimos en ti</span>
              <h1 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 46px; line-height: 0.9; text-transform: uppercase')}>Tus elecciones de hoy</h1>
            </div>
            <div style={s('display: flex; flex-direction: column; gap: 12px; padding: var(--space-4) 14px; border-radius: var(--radius-lg); background: var(--surface-raised); border: var(--border-hairline) solid var(--line)')}>
              <div style={s('display: flex; flex-wrap: wrap; gap: 6px')}>{tags.map((x) => <Chip key={x.label} variant="sun" icon="sparkle">{x.label}</Chip>)}</div>
              <div style={s('display: flex; flex-direction: column; gap: 10px; padding-top: 10px; border-top: var(--border-hairline) solid var(--line)')}>
                {insights.map((x, k) => (
                  <div key={k} style={s('display: flex; align-items: flex-start; gap: 10px')}>
                    <span aria-hidden="true" style={s('flex: none; width: 10px; height: 10px; margin-top: 5px; border-radius: 50%; background: var(--sun-core)')} />
                    <span style={s('font-size: 14.5px; line-height: 1.4; color: var(--ink)')}>{x.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <span style={s('font-family: var(--font-script); font-size: 22px; line-height: 1.1; color: var(--sun-ink)')}>Tu próximo mazo ya lo tiene en cuenta.</span>
            <div style={s('margin-top: auto; display: flex; flex-direction: column; gap: var(--space-2)')}>
              <Button variant="primary" size="lg" icon="deck" block onClick={() => { t.action('recarga.elegir'); setSel(0); setScreen('elegir'); }} track="S07.elegir-proximo">Elegir mi próximo mazo</Button>
              <Button variant="ghost" size="md" icon="play" block onClick={() => { t.action('recarga.ir-ver'); nav('/ver'); }} track="S07.ir-ver-2">{verLabel}</Button>
            </div>
          </div>
        )}

        {screen === 'elegir' && (
          <div className="kn-pop" style={s('flex: 1; display: flex; flex-direction: column; gap: 12px')}>
            <div style={s('display: flex; flex-direction: column; gap: 2px')}>
              <span style={s('font-family: var(--font-script); font-size: 24px; color: var(--sun-ink); line-height: 1')}>tres caminos para hoy</span>
              <h1 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 44px; line-height: 0.9; text-transform: uppercase')}>Tu próximo mazo</h1>
            </div>
            <div role="radiogroup" aria-label="Mazos" style={s('display: flex; flex-direction: column; gap: 10px; padding-top: 4px')}>
              {decks.map((d, k) => {
                const on = k === sel;
                return (
                  <button key={d.id} type="button" role="radio" className="kn-tap kn-deckrow" aria-checked={on ? 'true' : 'false'} data-track={'S07.deck-' + d.id} onClick={() => { setSel(k); t.action('deck.pick:' + d.id, { via: 'recarga' }); }}
                    style={{ ...s('display: flex; align-items: center; gap: 14px; padding: 12px 14px 12px 12px; border-radius: var(--radius-lg); border-width: 2px; border-style: solid; background: var(--surface-raised); color: var(--ink); text-align: left; cursor: pointer'), borderColor: on ? 'var(--mark-ring)' : 'var(--line)', transform: on ? 'translateY(-2px)' : 'none', boxShadow: on ? 'var(--shadow-lift)' : 'none' }}>
                    <span aria-hidden="true" style={{ ...s('position: relative; flex: none; display: block; width: 64px; height: 86px; border-radius: 10px; overflow: hidden; border: var(--border-card) solid var(--sun-core)'), background: d.bg }}>
                      <span style={{ ...s('position: absolute; left: 50%; top: 50%; width: 34px; height: 34px; margin: -12px 0 0 -17px; border-radius: 50%'), background: d.ring }} />
                      <span style={s('position: absolute; left: 50%; top: 50%; width: 14px; height: 14px; margin: -2px 0 0 -7px; border-radius: 50%; background: var(--sun-core)')} />
                      <span style={{ ...s('position: absolute; left: 0; right: 0; top: 0; height: 48%; clip-path: polygon(0 0, 100% 0, 50% 100%)'), background: flap(d.bg) }} />
                    </span>
                    <span style={s('flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px')}>
                      <span style={{ ...s('font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase'), color: on ? 'var(--ink)' : 'var(--ink-subtle)' }}>{d.kind}</span>
                      <span style={s('font-family: var(--font-display); font-weight: 900; font-size: 21px; line-height: 0.98; text-transform: uppercase')}>{d.name}</span>
                      <span style={s('font-size: 12.5px; line-height: 1.35; color: var(--ink-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden')}>{d.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={s('margin-top: auto; display: flex; flex-direction: column; gap: var(--space-1)')}>
              <Button variant="primary" size="lg" icon="shuffle" block onClick={empezar} track="S07.empezar-mazo">Empezar este mazo</Button>
              <Button variant="ghost" size="sm" block onClick={() => { t.action('recarga.mejor-ver'); nav('/ver'); }} track="S07.mejor-ver">Mejor ver algo ahora</Button>
            </div>
          </div>
        )}

        {screen === 'barajar' && (
          <div style={s('flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px')}>
            <div aria-hidden="true" style={s('position: relative; width: 150px; height: 210px')}>
              <div className="kn-spin" style={s('position: absolute; left: 50%; top: 50%; width: 420px; height: 420px; margin: -210px 0 0 -210px; border-radius: 50%; background: repeating-conic-gradient(var(--surface-raised) 0deg 6deg, transparent 6deg 12deg)')} />
              {Array.from({ length: 6 }, (_, k) => (
                <div key={k} className={k % 2 ? 'kn-rr' : 'kn-rl'} style={{ ...s('position: absolute; inset: 0'), animationDelay: k * 40 + 'ms' }}>{deckCard(cur.bg, cur.ring, 0, `translateY(${-k * 3}px)`)}</div>
              ))}
            </div>
            <div style={s('position: relative; text-align: center; display: flex; flex-direction: column; gap: 4px')}>
              <span style={s('font-family: var(--font-script); font-size: 26px; color: var(--sun-ink); line-height: 1')}>barajando</span>
              <span style={s('font-family: var(--font-display); font-weight: 900; font-size: 34px; text-transform: uppercase; line-height: 1')}>{cur.name}</span>
            </div>
          </div>
        )}

        {screen === 'listo' && (
          <div style={s('flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; text-align: center')}>
            <div aria-hidden="true" style={s('position: relative; width: 210px; height: 230px')}>
              {[-12, -6, 0, 6, 12].map((rot, k) => (
                <div key={k} className="kn-deal" style={{ ...s('position: absolute; left: 30px; top: 10px; width: 150px; height: 210px'), animationDelay: k * 90 + 'ms' }}>{deckCard(cur.bg, cur.ring, 0, `rotate(${rot}deg) translate(${(k - 2) * 6}px, ${Math.abs(k - 2) * 6}px)`)}</div>
              ))}
            </div>
            <div className="kn-pop" style={{ ...s('display: flex; flex-direction: column; gap: 6px'), animationDelay: '500ms' }}>
              <span style={s('font-family: var(--font-script); font-size: 26px; color: var(--sun-ink); line-height: 1')}>tu mazo está listo</span>
              <h1 style={s('margin: 0; font-family: var(--font-display); font-weight: 900; font-size: 44px; line-height: 0.92; text-transform: uppercase')}>{cur.name}</h1>
              <span style={s('font-size: 14px; color: var(--ink-muted)')}>10 cartas · y una de ellas es especial</span>
            </div>
            <div className="kn-pop" style={{ ...s('width: 100%; display: flex; flex-direction: column; gap: var(--space-1)'), animationDelay: '650ms' }}>
              <Button variant="primary" size="lg" block onClick={() => { t.action('deck.start', { desde: 'recarga' }); nav('/descubrir'); }} track="S07.empezar-descubrir">Empezar a descubrir</Button>
              <Button variant="ghost" size="sm" block onClick={() => { t.action('recarga.mejor-ver'); nav('/ver'); }} track="S07.mejor-ver-2">Mejor ver algo ahora</Button>
            </div>
          </div>
        )}
      </main>

      <div style={s('position: relative; z-index: 2')}><TabBar active="descubrir" onNavigate={goTab} /></div>

      {toast && (
        <div style={s('position: absolute; left: 0; right: 0; bottom: 104px; z-index: 30; display: flex; justify-content: center')}><Toast icon="sparkle">{toast}</Toast></div>
      )}
    </div>
  );
}
