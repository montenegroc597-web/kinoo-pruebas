import React from 'react';

/** Ilustraciones de cada mood (viewBox 96×76). Las usan Mood y la cinta de Ver. */
export function MoodArt({ id, slice }: { id: string; slice?: boolean }) {
  const bg = <circle cx={48} cy={38} r={36} fill="var(--surface-sunk)" />;
  let body: React.ReactNode;
  switch (id) {
    case 'apagar':
      body = <><rect x={56} y={18} width={30} height={20} rx={4} fill="var(--sun)" /><rect x={61} y={23} width={20} height={2.5} rx={1.25} fill="var(--sun-core)" opacity={0.65} /><rect x={61} y={28} width={14} height={2.5} rx={1.25} fill="var(--sun-core)" opacity={0.65} /><ellipse cx={22} cy={46} rx={22} ry={7} fill="var(--surface)" /><circle cx={10} cy={40} r={7.5} fill="var(--ink)" /><rect x={14} y={37} width={26} height={10} rx={5} fill="var(--ink)" /></>;
      break;
    case 'sufrir':
      body = <><path d="M48 16c9 10 9 18 0 22c-9-4-9-12 0-22Z" fill="var(--cine-red)" /><path d="M30 54c6-5 12-5 18 0" stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" fill="none" /></>;
      break;
    case 'escapar':
      body = <><rect x={36} y={16} width={24} height={34} rx={3} fill="none" stroke="var(--sun)" strokeWidth={3} /><path d="M48 50v16M40 60l8 6l8-6" stroke="var(--sun)" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx={70} cy={20} r={2.4} fill="var(--sun)" /><circle cx={76} cy={30} r={1.8} fill="var(--sun)" /></>;
      break;
    case 'sentir':
      body = <><circle cx={40} cy={38} r={17} fill="var(--brand)" opacity={0.85} /><circle cx={58} cy={38} r={17} fill="var(--sun)" opacity={0.85} /></>;
      break;
    case 'pensar':
      body = <><circle cx={44} cy={46} r={12} fill="var(--ink)" /><path d="M50 30c6-6 14-4 14 3c0 5-5 6-8 9" stroke="var(--sun-ink)" strokeWidth={3} fill="none" strokeLinecap="round" /><circle cx={58} cy={44} r={2.2} fill="var(--sun-ink)" /></>;
      break;
    case 'reir':
      body = <><path d="M26 36c6 14 38 14 44 0" stroke="var(--brand)" strokeWidth={5} fill="none" strokeLinecap="round" /><circle cx={30} cy={22} r={2.2} fill="var(--sun)" /><circle cx={48} cy={16} r={2.2} fill="var(--sun)" /><circle cx={66} cy={22} r={2.2} fill="var(--sun)" /></>;
      break;
    case 'raro':
      body = <><path d="M24 38c8-14 40-14 48 0c-8 14-40 14-48 0Z" fill="none" stroke="var(--cine-red)" strokeWidth={3} /><circle cx={48} cy={38} r={8} fill="var(--cine-red)" /><polygon points="70,20 76,24 70,28" fill="var(--sun)" /></>;
      break;
    case 'cine':
      body = <><rect x={28} y={30} width={40} height={26} rx={3} fill="var(--ink)" /><polygon points="28,30 40,20 48,30" fill="var(--sun)" /><polygon points="48,30 58,20 68,30" fill="var(--sun-core)" /></>;
      break;
    default:
      body = <><circle cx={48} cy={38} r={20} fill="var(--sun)" /><circle cx={48} cy={38} r={9} fill="var(--brand)" /><path d="M74 14C74.6 18 76 19.4 80 20C76 20.6 74.6 22 74 26C73.4 22 72 20.6 68 20C72 19.4 73.4 18 74 14Z" fill="var(--sun)" /><circle cx={22} cy={58} r={2.2} fill="var(--sun)" /></>;
  }
  return slice
    ? <svg width="100%" height="100%" viewBox="0 0 96 76" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{bg}{body}</svg>
    : <svg width="100%" height={76} viewBox="0 0 96 76" aria-hidden="true">{bg}{body}</svg>;
}

export const Twinkle = ({ size, style }: { size: number; style: React.CSSProperties }) => (
  <svg aria-hidden="true" className="kn-twinkle" width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
    <path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill="var(--sun)" />
  </svg>
);
