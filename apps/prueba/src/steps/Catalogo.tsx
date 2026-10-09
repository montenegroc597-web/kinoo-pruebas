import React from 'react';
import { Frame, ProductApp, type Brand, type SeedId } from '@kinoo/ui';

export const CATALOGO: { id: string; seed: SeedId; route: string }[] = [
  { id: 'S01', seed: 'fresh', route: '/mood' },
  { id: 'S06', seed: 'fresh', route: '/mood/lectura' },
  { id: 'S05', seed: 'mazos-en-curso', route: '/mazos' },
  { id: 'S02', seed: 'deck-nolan-start', route: '/descubrir' },
  { id: 'S02-volteada', seed: 'deck-nolan-flipped', route: '/descubrir' },
  { id: 'S07', seed: 'deck-finished', route: '/recarga' },
  { id: 'S04', seed: 'ver-pool', route: '/ver' },
  { id: 'S03-back', seed: 'ver-back', route: '/ver' },
  { id: 'S03', seed: 'ver-react', route: '/ver' },
  { id: 'S08', seed: 'ver-pool', route: '/mi-espacio' },
];

/** Catálogo de pantallas A y B lado a lado (?catalogo=1). Sirve para revisar estilos y como referencia del Panel. Nunca con participantes. */
export function Catalogo() {
  return (
    <div style={{ padding: 16, display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', background: '#222', minHeight: '100vh' }}>
      {CATALOGO.map((c) => (['A', 'B'] as Brand[]).map((b) => (
        <div key={c.id + b} data-catalogo={`${c.id}-${b}`} style={{ color: '#fff', font: '12px monospace' }}>
          <div>{c.id} · versión {b}</div>
          <Frame brand={b} scale={1} id={`cat-${c.id}-${b}`} radius={14}><ProductApp seed={c.seed} route={c.route} /></Frame>
        </div>
      )))}
    </div>
  );
}
