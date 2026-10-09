import React, { useEffect, useRef, useState } from 'react';
import { Frame, KinoPantalla, ProductApp, SEED_ROUTE, type Brand, type SeedId } from '@kinoo/ui';
import { TAREAS } from '@kinoo/tracking';
import { calor, type Dump, filas, type PuntoMapa } from './analytics';

/** Semilla que dibuja cada pantalla del catálogo (la misma vista que vio el participante). */
export const VISTA: Record<string, { seed: SeedId; route: string }> = {
  S01: { seed: 'fresh', route: '/mood' },
  S02: { seed: 'deck-nolan-start', route: '/descubrir' },
  S03: { seed: 'ver-react', route: '/ver' },
  'S03.back': { seed: 'ver-back', route: '/ver' },
  S04: { seed: 'ver-pool', route: '/ver' },
  S05: { seed: 'mazos-en-curso', route: '/mazos' },
  S06: { seed: 'fresh', route: '/mood/lectura' },
  S07: { seed: 'deck-finished', route: '/recarga' },
  S08: { seed: 'ver-pool', route: '/mi-espacio' },
};
export const vistaDeTarea = (tarea: string) => { const t = TAREAS.find((x) => x.id === tarea); return t ? { seed: t.seed as SeedId, route: SEED_ROUTE[t.seed as SeedId] } : VISTA.S01; };

export interface ZonaPct { x1: number; y1: number; x2: number; y2: number }

/** Mapa de calor 10×20 + puntos, dibujado sobre la pantalla REAL (estática). Con `zona` dibuja la zona correcta. */
export function Heat({ vista, brand = 'A', puntos, zona, escala = 0.8, modo = 'calor', id, kino }: { vista: { seed: SeedId; route: string }; brand?: Brand; puntos: PuntoMapa[]; zona?: ZonaPct | null; escala?: number; modo?: 'calor' | 'puntos'; id?: string; /** pantalla (S02…) para dibujar la versión B como el prototipo Kino real */ kino?: string }) {
  const W = 390 * escala, H = 844 * escala;
  const ref = useRef<HTMLCanvasElement>(null);
  const [fid] = useState(() => 'heat-' + (id ?? '') + '-' + Math.random().toString(36).slice(2, 8));
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d'); if (!g) return;
    g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
    if (modo === 'calor') {
      const grid = calor(puntos); const max = Math.max(1, ...grid.flat());
      grid.forEach((fila, f) => fila.forEach((n, col) => {
        if (!n) return;
        g.fillStyle = `rgba(255,70,40,${0.18 + 0.6 * (n / max)})`;
        g.fillRect((col * W) / 10, (f * H) / 20, W / 10, H / 20);
        g.fillStyle = '#fff'; g.font = '11px sans-serif'; g.textAlign = 'center'; g.fillText(String(n), (col * W) / 10 + W / 20, (f * H) / 20 + H / 40 + 4);
      }));
    } else {
      puntos.forEach((p) => {
        g.beginPath(); g.arc((p.x / 100) * W, (p.y / 100) * H, 6, 0, Math.PI * 2);
        g.fillStyle = p.resultado === 'Miss click' ? 'rgba(255,60,60,.85)' : p.resultado === 'Aceptable' ? 'rgba(255,200,40,.85)' : 'rgba(80,220,140,.85)';
        g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#000'; g.stroke();
      });
    }
    if (zona) { g.strokeStyle = '#6CC4A8'; g.lineWidth = 2.5; g.setLineDash([6, 4]); g.strokeRect((zona.x1 / 100) * W, (zona.y1 / 100) * H, ((zona.x2 - zona.x1) / 100) * W, ((zona.y2 - zona.y1) / 100) * H); g.setLineDash([]); }
  }, [W, H, puntos, zona, modo]);
  return (
    <div className="pn-heat" style={{ width: W, height: H }} data-heat={id}>
      <div style={{ pointerEvents: 'none' }} aria-hidden="true">{brand === 'B' && kino
        ? <KinoPantalla pantalla={kino} escala={escala} id={fid} radius={10} />
        : <Frame brand={brand} scale={escala} id={fid} radius={10}><ProductApp seed={vista.seed} route={vista.route} /></Frame>}</div>
      <canvas ref={ref} style={{ width: W, height: H }} aria-label="Mapa de clics" />
    </div>
  );
}

export function zonaDe(d: Dump, tarea: string): ZonaPct | null {
  const z = filas(d, 'Zonas').find((r) => r['Tarea'] === tarea);
  if (!z) return null;
  const n = (k: string) => Number(z[k]);
  const v = { x1: n('X1 (%)'), y1: n('Y1 (%)'), x2: n('X2 (%)'), y2: n('Y2 (%)') };
  return Object.values(v).every(Number.isFinite) ? v : null;
}
