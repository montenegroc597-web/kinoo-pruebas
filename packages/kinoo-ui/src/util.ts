import type { CSSProperties } from 'react';

const cache = new Map<string, CSSProperties>();

/** "position: absolute; margin-left: -10px" → { position:'absolute', marginLeft:'-10px' }. Permite portar los estilos inline del artefacto casi literales. */
export function s(css: string): CSSProperties {
  const hit = cache.get(css);
  if (hit) return hit;
  const out: Record<string, string> = {};
  for (const decl of css.split(/;(?![^(]*\))/)) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const k = decl.slice(0, i).trim();
    const v = decl.slice(i + 1).trim();
    if (!k) continue;
    let key = k;
    if (!k.startsWith('--')) {
      key = k.replace(/^-(webkit|moz)-/, '$1-').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      if (/^(webkit|moz)[A-Z]/.test(key)) key = key.charAt(0).toUpperCase() + key.slice(1);
    }
    out[key] = v;
  }
  cache.set(css, out as CSSProperties);
  return out as CSSProperties;
}

export function cx(...a: (string | false | null | undefined)[]): string {
  return a.filter(Boolean).join(' ');
}

export const pad2 = (n: number) => (n < 10 ? '0' + n : String(n));
export const durHM = (m: number) => `${Math.floor(m / 60)} h ${pad2(m % 60)}`;
