// Componentes Kinoo.* portados de ds/kinoo/components/bundle.js (props idénticas a index.d.ts).
// Añadidos para la prueba: `track` → data-track (todo elemento interactivo lo lleva), `zone` → data-zone.
import React from 'react';
import { cx } from './util';

type Common = { className?: string; track?: string; zone?: string };
const td = (p: Common) => ({ 'data-track': p.track, 'data-zone': p.zone });

export type IconName = 'arrow-left' | 'arrow-up' | 'arrow-right' | 'x' | 'play' | 'compass' | 'users' | 'user' | 'flip' | 'swap' | 'shuffle' | 'clock' | 'external' | 'deck' | 'sparkle';
export type MarkType = 'ring' | 'dot' | 'both';

const ICONS: Record<string, string[]> = {
  'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
  'arrow-up': ['M12 19V5', 'M5 12l7-7 7 7'],
  'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  play: ['C12 12 9.5', 'M10 8.5l5.5 3.5-5.5 3.5z'],
  compass: ['C12 12 9.5', 'M15.8 8.2l-2.1 5.5-5.5 2.1 2.1-5.5z'],
  users: ['C9 8 3.5', 'M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6', 'C17 9 2.8', 'M17 14c2.6 0 4.5 1.8 4.5 4.6'],
  user: ['C12 8 4', 'M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7'],
  flip: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
  swap: ['M17 3l4 4-4 4', 'M3 11V9a2 2 0 0 1 2-2h16', 'M7 21l-4-4 4-4', 'M21 13v2a2 2 0 0 1-2 2H3'],
  shuffle: ['M16 3h5v5', 'M4 20L21 3', 'M21 16v5h-5', 'M15 15l6 6', 'M4 4l5 5'],
  clock: ['C12 13 8', 'M12 9v4l2.5 2', 'M9 2h6'],
  external: ['M7 17L17 7', 'M9 7h8v8'],
  deck: ['R3 6 11 15', 'M8 3h11a2 2 0 0 1 2 2v13'],
};

export function Icon(p: { name: IconName; size?: number; strokeWidth?: number; title?: string; className?: string }) {
  const size = p.size || 24, sw = p.strokeWidth || 2;
  if (p.name === 'sparkle') {
    return (
      <svg className={cx('kn-icon', p.className)} width={size} height={size} viewBox="0 0 24 24" aria-hidden={p.title ? undefined : true} role={p.title ? 'img' : undefined} aria-label={p.title}>
        <path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill="currentColor" />
      </svg>
    );
  }
  const parts = (ICONS[p.name] || []).map((d, i) => {
    if (d[0] === 'C') { const a = d.slice(1).split(' '); return <circle key={i} cx={a[0]} cy={a[1]} r={a[2]} />; }
    if (d[0] === 'R') { const r = d.slice(1).split(' '); return <rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} rx={2} />; }
    return <path key={i} d={d} />;
  });
  return (
    <svg className={cx('kn-icon', p.className)} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden={p.title ? undefined : true} role={p.title ? 'img' : undefined} aria-label={p.title}>
      {parts}
    </svg>
  );
}

export function Sun(p: { size?: number; tone?: 'brand' | 'soft'; className?: string }) {
  const s = p.size || 96, soft = p.tone === 'soft';
  const cols = soft ? ['var(--sun-1)', 'var(--sun-2)', 'var(--sun-3)'] : ['var(--brand)', 'var(--sun)', 'var(--sun-core)'];
  const ring = (f: number, c: string) => { const d = Math.round(s * f); const o = (s - d) / 2; return <span style={{ width: d, height: d, left: o, top: o, background: c }} />; };
  return (
    <span className={cx('kn-sun', p.className)} style={{ width: s, height: s }} aria-hidden="true">
      {ring(1, cols[0])}{ring(0.68, cols[1])}{ring(0.36, cols[2])}
    </span>
  );
}

export function Logo(p: { size?: 'sm' | 'md' | 'lg'; wordmark?: boolean; className?: string }) {
  const size = p.size === 'lg' ? 48 : p.size === 'sm' ? 22 : 28;
  return (
    <span className={cx('kn-logo', p.className)} role="img" aria-label="Kinoo">
      <Sun size={size} />
      {p.wordmark === false ? null : <span className="kn-logo-word" style={{ fontSize: Math.round(size * 1.14) }} aria-hidden="true">Kinoo</span>}
    </span>
  );
}

const MARK_LABEL: Record<MarkType, string> = { ring: 'Quiero verla', dot: 'Ya la vi', both: 'La vi y quiero repetirla' };
export function Mark(p: { type?: MarkType; size?: number; label?: string; className?: string }) {
  const t = p.type || 'ring', s = p.size || 20, label = p.label === undefined ? MARK_LABEL[t] : p.label;
  return (
    <svg className={cx('kn-mark', p.className)} width={s} height={s} viewBox="0 0 24 24" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
      {t === 'dot' && <><circle className="halo" cx={12} cy={12} r={11} /><circle className="dot" cx={12} cy={12} r={8} /></>}
      {t === 'ring' && <circle className="ring" cx={12} cy={12} r={8.5} strokeWidth={3.4} />}
      {t === 'both' && <><circle className="halo" cx={12} cy={12} r={6} /><circle className="ring" cx={12} cy={12} r={9} strokeWidth={3} /><circle className="dot" cx={12} cy={12} r={4.4} /></>}
    </svg>
  );
}

export function Button(p: Common & { variant?: 'primary' | 'secondary' | 'inverse' | 'ghost'; size?: 'lg' | 'md' | 'sm'; icon?: IconName; iconEnd?: IconName; block?: boolean; type?: 'button' | 'submit'; disabled?: boolean; onClick?: () => void; children?: React.ReactNode; 'aria-label'?: string }) {
  const variant = p.variant || 'primary', size = p.size || 'lg';
  const cls = cx('kn-btn', 'kn-btn-' + variant, 'kn-btn-' + size, p.block && 'kn-btn-block', p.className);
  return (
    <button type={p.type || 'button'} className={cls} onClick={p.onClick} disabled={p.disabled} aria-label={p['aria-label']} {...td(p)}>
      {p.icon ? <Icon name={p.icon} size={size === 'sm' ? 18 : 22} /> : null}
      {p.children}
      {p.iconEnd ? <Icon name={p.iconEnd} size={18} /> : null}
    </button>
  );
}

const SWIPE = {
  left: { icon: 'arrow-left' as IconName, label: 'No me interesa', badge: null as MarkType | null },
  up: { icon: 'arrow-up' as IconName, label: 'Ya la vi', badge: 'dot' as MarkType | null },
  right: { icon: 'arrow-right' as IconName, label: 'Quiero verla', badge: 'ring' as MarkType | null },
};
export function SwipeAction(p: Common & { direction: 'left' | 'up' | 'right'; intensity?: number; label?: string; disabled?: boolean; onClick?: () => void }) {
  const d = p.direction || 'right', cfg = SWIPE[d], k = Math.max(0, Math.min(1, p.intensity || 0));
  const primary = d === 'right';
  const disc: React.CSSProperties = { transform: 'scale(' + (1 + 0.14 * k).toFixed(3) + ')' };
  if (primary) disc.boxShadow = '0 0 0 ' + Math.round(k * 10) + 'px rgba(232,100,44,0.35)';
  return (
    <button type="button" className={cx('kn-swipe', primary && 'kn-swipe-primary', k > 0.5 && 'is-armed', p.className)} onClick={p.onClick} disabled={p.disabled} {...td(p)}>
      <span className="kn-swipe-disc" style={disc}>
        <Icon name={cfg.icon} size={primary ? 28 : 26} strokeWidth={2.4} />
        {cfg.badge ? <span className="kn-swipe-badge"><Mark type={cfg.badge} size={primary ? 18 : 16} label="" /></span> : null}
      </span>
      <span className="kn-swipe-label">{p.label || cfg.label}</span>
    </button>
  );
}

export function Chip(p: Common & { variant?: 'meta' | 'filter' | 'brand' | 'sun' | 'tag' | 'placeholder'; selected?: boolean; icon?: IconName; mark?: MarkType; onClick?: () => void; children?: React.ReactNode }) {
  const v = p.variant || 'meta';
  const kids = <>{p.icon ? <Icon name={p.icon} size={14} strokeWidth={2.4} /> : null}{p.mark ? <Mark type={p.mark} size={13} label="" /> : null}{p.children}</>;
  if (v === 'filter') return <button type="button" className={cx('kn-chip', 'kn-chip-filter', p.className)} aria-pressed={p.selected ? 'true' : 'false'} onClick={p.onClick} {...td(p)}>{kids}</button>;
  return <span className={cx('kn-chip', 'kn-chip-' + v, p.className)}>{kids}</span>;
}

export function MatchGauge(p: { value: number; size?: number; label?: string; className?: string }) {
  const s = p.size || 104, v = Math.max(0, Math.min(100, p.value || 0));
  const c = s / 2, r = s * 0.404, C = 2 * Math.PI * r;
  return (
    <span className={cx('kn-gauge', p.className)} style={{ width: s, height: s }} role="img" aria-label={v + '% de match'}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
        <circle className="ticks" cx={c} cy={c} r={s * 0.48} strokeWidth={3} />
        <circle className="track" cx={c} cy={c} r={r} strokeWidth={s * 0.087} />
        <circle className="arc" cx={c} cy={c} r={r} strokeWidth={s * 0.087} transform={`rotate(-90 ${c} ${c})`} style={{ strokeDasharray: C, strokeDashoffset: C * (1 - v / 100) }} />
        <circle className="s2" cx={c} cy={c} r={s * 0.308} />
        <circle className="s3" cx={c} cy={c} r={s * 0.23} />
      </svg>
      <span className="kn-gauge-read" aria-hidden="true">
        <span className="kn-gauge-num" style={{ fontSize: Math.round(s * 0.31) }}>{Math.round(v)}<small>%</small></span>
        <span className="kn-gauge-label">{p.label || 'Match'}</span>
      </span>
    </span>
  );
}

export function MatchMeter(p: { label: string; word?: string; value: number; highlight?: boolean; className?: string }) {
  const v = Math.max(0, Math.min(100, p.value || 0)), lit = Math.round(v / 10);
  return (
    <div className={cx('kn-meter', p.highlight && 'is-top', p.className)} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={p.label + (p.word ? ', ' + p.word : '')}>
      <span className="kn-meter-label">{p.label}{p.word ? <span className="kn-meter-word"> {p.word}</span> : null}</span>
      <span className="kn-meter-segs" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <span key={i} className={cx('kn-meter-seg', i < lit && 'on')} />)}</span>
      <span className="kn-meter-val">{v}</span>
    </div>
  );
}

export interface Person { initial: string; tone?: string }
export function AvatarStack(p: { people: Person[]; className?: string }) {
  return <span className={cx('kn-avatars', p.className)} aria-hidden="true">{(p.people || []).map((x, i) => <span key={i} className="kn-avatar" style={{ background: x.tone || 'var(--sun)' }}>{x.initial}</span>)}</span>;
}

const TASTE_TONE: Record<string, [string, string, string]> = {
  Ritmo: ['var(--brand)', '#F4E7D0', 'var(--sun)'],
  Tono: ['var(--cine-red)', '#F4E7D0', 'var(--sun)'],
  Historia: ['var(--sun)', '#1A1411', 'var(--brand)'],
  Visual: ['var(--brand-deep)', '#F4E7D0', 'var(--sun)'],
};
function tasteArt(label: string, word: string | undefined, ink: string, acc: string, size: number) {
  const w = (word || '').toLowerCase();
  const sw = { fill: 'none', stroke: ink, strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let c: React.ReactNode[] = [];
  let k = 0;
  const K = () => k++;
  if (label === 'Ritmo') {
    if (/fren|ágil|agil|denso|rápid/.test(w)) c = [<path key={K()} d="M4 26 L11 12 L17 28 L23 10 L29 26 L36 14" {...sw} />, <circle key={K()} cx={36} cy={14} r={3.2} fill={acc} />];
    else c = [<path key={K()} d="M3 22 C9 12 14 12 20 22 S31 32 37 22" {...sw} />, <circle key={K()} cx={9} cy={30} r={2.4} fill={acc} />, <circle key={K()} cx={31} cy={12} r={2.4} fill={acc} />];
  } else if (label === 'Tono') {
    if (/nost|cálid|calid|lumin|alegr/.test(w)) c = [<path key={K()} d="M8 26 A12 12 0 0 1 32 26 Z" fill={acc} />, <path key={K()} d="M4 30 H36 M10 34 H30" {...sw} />];
    else c = [<path key={K()} d="M24 8 A12 12 0 1 0 30 30 A10 10 0 1 1 24 8 Z" fill={acc} />, <circle key={K()} cx={32} cy={10} r={1.8} fill={ink} />, <circle key={K()} cx={9} cy={12} r={1.4} fill={ink} />];
  } else if (label === 'Historia') {
    if (/policial|crimen/.test(w)) c = [<circle key={K()} cx={17} cy={17} r={9} {...sw} />, <path key={K()} d="M24 24 L34 34" {...sw} strokeWidth={4} />];
    else if (/enigma|misterio/.test(w)) c = [<circle key={K()} cx={20} cy={15} r={7} fill={ink} />, <path key={K()} d="M16 20 L13 34 H27 L24 20 Z" fill={ink} />, <circle key={K()} cx={20} cy={15} r={2.4} fill={acc} />];
    else if (/biogr|retrato/.test(w)) c = [<circle key={K()} cx={20} cy={14} r={7} fill={ink} />, <path key={K()} d="M7 35 C9 24 31 24 33 35 Z" fill={ink} />, <rect key={K()} x={3} y={3} width={34} height={34} rx={4} {...sw} strokeWidth={2} stroke={acc} />];
    else if (/íntim|intim|amor/.test(w)) c = [<circle key={K()} cx={15} cy={20} r={9} fill={acc} opacity={0.9} />, <circle key={K()} cx={25} cy={20} r={9} fill={ink} opacity={0.85} />];
    else c = [<path key={K()} d="M2 35 L15 13 L22 24 L27 17 L38 35 Z" fill={ink} />, <path key={K()} d="M15 13 V3" {...sw} strokeWidth={2.4} />, <path key={K()} d="M15 3 L24 6 L15 9 Z" fill={acc} />];
  } else {
    if (/ardient|fuego/.test(w)) c = [<path key={K()} d="M20 4 C27 12 31 18 30 25 C29 32 24 36 20 36 C15 36 10 32 10 25 C10 19 15 16 16 10 C18 14 19 16 21 17 C22 13 21 8 20 4 Z" fill={acc} />, <path key={K()} d="M20 22 C23 26 24 29 22 32 C20 34 17 33 17 30 C17 27 19 26 20 22 Z" fill={ink} />];
    else if (/neón|neon/.test(w)) c = [<path key={K()} d="M6 28 L14 12 L20 24 L26 10 L34 28" {...sw} stroke={acc} strokeWidth={5} opacity={0.35} />, <path key={K()} d="M6 28 L14 12 L20 24 L26 10 L34 28" {...sw} stroke={acc} strokeWidth={2.4} />];
    else if (/sombr|oscur/.test(w)) c = [<path key={K()} d="M3 20 C10 9 30 9 37 20 C30 31 10 31 3 20 Z" {...sw} />, <path key={K()} d="M20 13 A7 7 0 0 1 20 27 Z" fill={acc} />, <path key={K()} d="M20 13 A7 7 0 0 0 20 27 Z" fill={ink} />];
    else c = [<circle key={K()} cx={20} cy={22} r={10} fill={acc} />, <path key={K()} d="M1 32 H39" {...sw} />, <path key={K()} d="M20 4 V7 M6 10 L8 12 M34 10 L32 12" {...sw} strokeWidth={2.4} />];
  }
  return <svg width={size || 38} height={size || 38} viewBox="0 0 40 40" aria-hidden="true" style={{ flex: 'none' }}>{c}</svg>;
}
export function TasteArt(p: { label: string; word?: string; ink?: string; accent?: string; size?: number }) {
  const t = TASTE_TONE[p.label] || TASTE_TONE.Ritmo;
  return tasteArt(p.label, p.word, p.ink || t[1], p.accent || t[2], p.size || 38);
}
export function TasteBanner(p: { label: string; word?: string; value?: number; highlight?: boolean; onPick?: (() => void) | null; track?: string }) {
  const t = TASTE_TONE[p.label] || TASTE_TONE.Ritmo;
  const pick = p.onPick ? (e: React.SyntheticEvent) => { e.stopPropagation(); e.preventDefault(); p.onPick!(); } : undefined;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <span className={cx('kn-taste', p.highlight && 'is-top', pick && 'is-tappable')} style={{ background: t[0], color: t[1] }}
      role={pick ? 'button' : 'img'} tabIndex={pick ? 0 : undefined}
      aria-label={p.label + (p.word ? ': ' + p.word : '') + (p.highlight ? ' (tu punto fuerte)' : '') + (pick ? '. Toca para saber qué significa' : '')}
      onClick={pick} onPointerDown={pick ? stop : undefined} onPointerUp={pick ? stop : undefined}
      onKeyDown={pick ? (e) => { if (e.key === 'Enter' || e.key === ' ') pick(e); } : undefined}
      data-track={pick ? p.track : undefined} data-zone={pick ? 'T2.correcta' : undefined}>
      {tasteArt(p.label, p.word, t[1], t[2], 38)}
      <span className="kn-taste-txt"><span className="kn-taste-label">{p.label}</span><span className="kn-taste-word">{p.word || ''}</span></span>
      {pick ? <span className="kn-taste-info" aria-hidden="true">i</span> : null}
      {p.highlight ? <svg className="kn-taste-star" width={14} height={14} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill={p.label === 'Historia' ? 'var(--brand)' : 'var(--sun)'} /></svg> : null}
    </span>
  );
}

export interface DimView { label: string; word?: string; value: number }
export interface DeckCardProps {
  hook?: string; match?: number; verdict?: string; dims?: DimView[]; reason?: string; people?: Person[]; genres?: string[];
  title?: string; director?: string; description?: string; image?: string; platforms?: string[]; meta?: string[];
  face?: 'premise' | 'poster'; flipped?: boolean; onFlip?: () => void; onDim?: (d: { label: string; word?: string; top: boolean }) => void; height?: number; className?: string;
}
function PremiseFace(p: DeckCardProps) {
  const dims = p.dims || [];
  const top = dims.reduce<DimView | null>((a, d) => (!a || d.value > a.value ? d : a), null);
  return (
    <div className="kn-card-face kn-premise">
      <span className="kn-premise-sun" style={{ right: -110, top: -60, width: 260, height: 260, background: 'var(--sun-1)' }} />
      <span className="kn-premise-sun" style={{ right: -60, top: -10, width: 160, height: 160, background: 'var(--sun-2)' }} />
      <span className="kn-premise-sun" style={{ right: -20, top: 30, width: 80, height: 80, background: 'var(--sun-3)' }} />
      <div className="kn-premise-body">
        <div className="kn-premise-top"><Chip variant="tag">Premisa</Chip><span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="flip" size={15} strokeWidth={2.4} />Toca para revelar</span></div>
        <p className="kn-premise-hook" data-hierarchy="primary">{p.hook}</p>
        <div className="kn-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <MatchGauge value={p.match ?? 0} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-script)', fontSize: 23, lineHeight: 1, color: 'var(--sun)' }}>{p.verdict || 'muy tú'}</span>
              <span style={{ fontSize: 12, color: '#D9C7A8' }}>Tu punto fuerte con esta:</span>
              {top ? <Chip variant="sun" icon="sparkle">{top.label + ' · ' + top.value}</Chip> : null}
            </div>
          </div>
          <div className="kn-taste-grid">
            {dims.map((d, i) => <TasteBanner key={i} label={d.label} word={d.word} value={d.value} highlight={d === top} track={'S02.dim-' + d.label.toLowerCase()} onPick={p.onDim ? () => p.onDim!({ label: d.label, word: d.word, top: d === top }) : null} />)}
          </div>
          {p.reason ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 10, borderTop: '1px dashed #4A3A2E' }}>
              {p.people ? <AvatarStack people={p.people} /> : null}
              <span style={{ fontSize: 12, lineHeight: 1.3, color: '#D9C7A8' }}>{p.reason}</span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="kn-genres">{(p.genres || []).map((g, i) => <span key={i}>{g}</span>)}</div>
    </div>
  );
}
function PosterFace(p: DeckCardProps) {
  return (
    <div className="kn-card-face kn-card-back">
      <div className="kn-poster-art" data-hierarchy="primary">
        {p.image ? <img src={p.image} alt={'Póster de ' + p.title} draggable={false} /> : <Sun size={220} tone="brand" />}
        <div className="kn-poster-plats">{(p.platforms || []).map((x, i) => <Chip key={i} variant="placeholder">{x}</Chip>)}</div>
      </div>
      <div className="kn-poster-info">
        {p.director ? <span className="kn-poster-credit">{'Una película de ' + p.director}</span> : null}
        <h3 className="kn-poster-title">{p.title}</h3>
        {p.description ? <p className="kn-poster-desc">{p.description}</p> : null}
        <div className="kn-row" style={{ marginTop: 6 }}>
          {p.match != null ? <Chip variant="brand">{p.match + '% match'}</Chip> : null}
          {(p.meta || []).map((m, i) => <Chip key={i} variant="meta">{m}</Chip>)}
        </div>
      </div>
    </div>
  );
}
export function DeckCard(p: DeckCardProps) {
  const face = p.face || 'premise';
  const flipped = p.flipped != null ? p.flipped : face === 'poster';
  return (
    <div className={cx('kn-card', flipped && 'is-flipped', p.className)} style={{ height: p.height || 540 }}>
      <button type="button" className="kn-card-btn" onClick={p.onFlip} data-track="S02.card" data-zone="T2.aceptable" aria-label={flipped ? 'Voltear carta: ver premisa' : 'Voltear carta: revelar película'} style={{ all: 'unset', display: 'block', width: '100%', height: '100%', cursor: 'pointer', borderRadius: 'var(--radius-card)' }}>
        <div className="kn-card-flip"><PremiseFace {...p} /><PosterFace {...p} /></div>
      </button>
    </div>
  );
}

export function DeckBack(p: { kind: 'mood' | 'hilo' | 'creadores'; name: string; selected?: boolean; daily?: boolean; onClick?: () => void; className?: string; track?: string }) {
  const kind = p.kind || 'mood';
  const I = (st: React.CSSProperties, key: number) => <i key={key} style={st} />;
  let face: React.ReactNode[];
  if (kind === 'mood') face = [I({ left: '50%', top: '50%', width: 120, height: 120, margin: '-60px 0 0 -60px', background: 'var(--sun-1)' }, 1), I({ left: '50%', top: '50%', width: 82, height: 82, margin: '-41px 0 0 -41px', background: 'var(--sun)' }, 2), I({ left: '50%', top: '50%', width: 44, height: 44, margin: '-22px 0 0 -22px', background: 'var(--sun-core)' }, 3)];
  else if (kind === 'hilo') face = [I({ inset: 0, borderRadius: 0, background: 'repeating-conic-gradient(from -90deg at 50% 100%, #F2B544 0deg 9deg, #E8A030 9deg 18deg)' }, 1), I({ left: '50%', bottom: -26, width: 60, height: 60, marginLeft: -30, background: 'var(--mark-dot)' }, 2), I({ left: '50%', bottom: -12, width: 32, height: 32, marginLeft: -16, background: 'var(--sun-core)' }, 3)];
  else face = [I({ left: 14, top: '50%', width: 38, height: 38, marginTop: -19, background: 'var(--sun)', border: '3px solid var(--cine-red)' }, 1), I({ left: '50%', top: '50%', width: 38, height: 38, margin: '-19px 0 0 -19px', background: 'var(--sun-core)', border: '3px solid var(--cine-red)' }, 2), I({ right: 14, top: '50%', width: 38, height: 38, marginTop: -19, background: 'var(--mark-dot)', border: '3px solid var(--cine-red)' }, 3)];
  const bg = kind === 'mood' ? 'var(--brand)' : kind === 'hilo' ? 'var(--sun)' : 'var(--cine-red)';
  const kindLabel = kind === 'mood' ? 'Mood' : kind === 'hilo' ? 'Hilo' : 'Creadores';
  return (
    <button type="button" role="radio" aria-checked={p.selected ? 'true' : 'false'} className={cx('kn-deckback', p.className)} onClick={p.onClick} data-track={p.track}>
      <span className="kn-deckback-stack">
        <span className="kn-deckback-under" style={{ transform: 'rotate(-7deg) translate(-4px, 4px)' }} />
        <span className="kn-deckback-under" style={{ transform: 'rotate(5deg) translate(3px, 2px)' }} />
        <span className="kn-deckback-face" style={{ background: bg }} aria-hidden="true">{face}</span>
        {p.daily ? <span className="kn-deckback-daily">Del día</span> : null}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="kn-deckback-kind">{kindLabel}</span>
        <span className="kn-deckback-name">{p.name}</span>
      </span>
    </button>
  );
}

export function DeckProgress(p: { total?: number; current: number; className?: string }) {
  const total = p.total || 10, cur = p.current || 0;
  return (
    <div className={cx('kn-progress', p.className)} role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={Math.min(cur + 1, total)} aria-label={'Carta ' + Math.min(cur + 1, total) + ' de ' + total}>
      <span className="kn-progress-segs" aria-hidden="true">{Array.from({ length: total }, (_, i) => <span key={i} className={cx('kn-progress-seg', i < cur && 'done', i === cur && 'now')} />)}</span>
      <span className="kn-progress-count" aria-hidden="true">{Math.min(cur + 1, total) + ' de ' + total}</span>
    </div>
  );
}

export function StatTile(p: { value: React.ReactNode; label: string; mark?: MarkType; icon?: IconName; tone?: 'brand' | 'inverse' | 'outline'; className?: string }) {
  const tone = p.tone || 'brand';
  const icon = p.mark ? <Mark type={p.mark} size={22} label="" /> : p.icon ? <Icon name={p.icon} size={22} strokeWidth={2.6} /> : null;
  return <div className={cx('kn-stat', 'kn-stat-' + tone, p.className)}>{icon}<span className="kn-stat-num">{p.value}</span><span className="kn-stat-label">{p.label}</span></div>;
}

export function Toast(p: { mark?: MarkType | ''; icon?: IconName | ''; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('kn-toast', p.className)} role="status">
      {p.mark ? <Mark type={p.mark} size={20} label="" /> : p.icon ? <Icon name={p.icon} size={16} /> : null}{p.children}
    </div>
  );
}

export function Sheet(p: { kicker?: string; title: string; align?: 'left' | 'center'; handle?: boolean; children?: React.ReactNode; className?: string }) {
  return (
    <section className={cx('kn-sheet', p.className)} aria-label={p.title}>
      {p.handle === false ? null : <span className="kn-sheet-handle" aria-hidden="true" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: p.align || 'left' }}>
        {p.kicker ? <span className="kn-sheet-kicker">{p.kicker}</span> : null}
        <h2 className="kn-sheet-title">{p.title}</h2>
      </div>
      {p.children}
    </section>
  );
}

export function OptionRow(p: Common & { title: string; subtitle?: string; positive?: boolean; thumb?: string; thumbLabel?: string; selected?: boolean; trailing?: 'radio' | 'mark'; mark?: MarkType; onClick?: () => void }) {
  const trailing = p.trailing || 'radio';
  return (
    <button type="button" role={trailing === 'radio' ? 'radio' : undefined} aria-checked={trailing === 'radio' ? (p.selected ? 'true' : 'false') : undefined} className={cx('kn-option', p.className)} onClick={p.onClick} {...td(p)}>
      <span className="kn-option-thumb" aria-hidden="true">{p.thumb ? <img src={p.thumb} alt="" /> : (p.thumbLabel || 'LOGO')}</span>
      <span className="kn-option-text"><span className="kn-option-title">{p.title}</span>{p.subtitle ? <span className={cx('kn-option-sub', p.positive && 'is-positive')}>{p.subtitle}</span> : null}</span>
      {trailing === 'radio'
        ? <svg className="kn-radio" width={22} height={22} viewBox="0 0 24 24" aria-hidden="true"><circle className="o" cx={12} cy={12} r={9.5} strokeWidth={2} />{p.selected ? <circle className="i" cx={12} cy={12} r={5.5} /> : null}</svg>
        : <Mark type={p.mark || 'ring'} size={24} />}
    </button>
  );
}

export type TabId = 'ver' | 'descubrir';
const TABS: [TabId, string, IconName][] = [['ver', 'Ver', 'play'], ['descubrir', 'Descubrir', 'compass']];
/** Solo Ver y Descubrir: Comunidad queda fuera del alcance de esta versión. */
export function TabBar(p: { active?: TabId; onNavigate?: (t: TabId) => void; className?: string; zoneVer?: boolean }) {
  const active = p.active || 'descubrir';
  return (
    <nav className={cx('kn-tabbar', p.className)} aria-label="Principal">
      {TABS.map((t) => {
        const on = t[0] === active;
        return (
          <button key={t[0]} type="button" className="kn-tab" aria-current={on ? 'page' : undefined} onClick={() => p.onNavigate?.(t[0])} data-track={'tabbar.' + t[0]} data-zone={t[0] === 'ver' && p.zoneVer ? 'T3.correcta' : undefined}>
            <Icon name={t[2]} size={on ? 20 : 24} strokeWidth={on ? 2.2 : 2} />{t[1]}
          </button>
        );
      })}
    </nav>
  );
}

export function AppHeader(p: { chip?: string; action?: React.ReactNode; onProfile?: () => void; className?: string }) {
  return (
    <header className={cx('kn-header', p.className)}>
      <Logo />
      <div className="kn-header-right">
        {p.chip ? <span className="kn-header-chip">{p.chip}</span> : null}
        {p.action || null}
        <button type="button" className="kn-avatar-btn" aria-label="Perfil" onClick={p.onProfile} data-track="header.perfil"><Icon name="user" size={22} /></button>
      </div>
    </header>
  );
}
