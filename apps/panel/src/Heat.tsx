import React, { useEffect, useRef, useState } from 'react';
import { PROTOTIPO_ESTUDIO, expandirZona, mapaCalor, type PantallaProto } from '@kinoo/tracking';
import { PROTOTIPOS, PrototipoVista } from '@kinoo/ui';
import type { PuntoMapa } from './analytics';

export interface ZonaPct { x1: number; y1: number; x2: number; y2: number }
const META = PROTOTIPOS[PROTOTIPO_ESTUDIO];
const FLECHA: Record<string, [number, number]> = { derecha: [1, 0], izquierda: [-1, 0], arriba: [0, -1], abajo: [0, 1] };

/**
 * Mapa sobre la pantalla REAL del prototipo (estática): toques como puntos (o mapa de calor 10×20) y gestos como flechas
 * desde donde empezaron, en su dirección. Con `zonaDeMarca` dibuja la zona correcta (la marca de la pantalla, medida en el
 * prototipo y ampliada a 44 px, igual que al puntuar Z3).
 */
export function Heat({ pantalla, puntos, zonaDeMarca, escala = 0.6, modo = 'puntos', id }: { pantalla: PantallaProto; puntos: PuntoMapa[]; zonaDeMarca?: boolean; escala?: number; modo?: 'calor' | 'puntos'; id?: string }) {
  const W = META.ancho * escala, H = META.alto * escala;
  const [zona, setZona] = useState<ZonaPct | null>(null);
  const alListo = (m: [number, number, number, number] | null) => {
    if (zonaDeMarca && m) setZona(expandirZona({ x1: (m[0] / META.ancho) * 100, y1: (m[1] / META.alto) * 100, x2: (m[2] / META.ancho) * 100, y2: (m[3] / META.alto) * 100 }, (44 / META.ancho) * 100, (44 / META.alto) * 100));
  };
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d'); if (!g) return;
    g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
    if (modo === 'calor') {
      const grid = mapaCalor(puntos); const max = Math.max(1, ...grid.flat());
      grid.forEach((fila, f) => fila.forEach((n, col) => {
        if (!n) return;
        g.fillStyle = `rgba(255,70,40,${0.18 + 0.6 * (n / max)})`;
        g.fillRect((col * W) / 10, (f * H) / 20, W / 10, H / 20);
        g.fillStyle = '#fff'; g.font = '11px sans-serif'; g.textAlign = 'center'; g.fillText(String(n), (col * W) / 10 + W / 20, (f * H) / 20 + H / 40 + 4);
      }));
    } else {
      for (const p of puntos) {
        const x = (p.x / 100) * W, y = (p.y / 100) * H;
        const color = /decisivo|correcto|barra/i.test(p.resultado) ? 'rgba(80,220,140,.9)' : 'rgba(255,60,60,.9)';
        const d = FLECHA[p.dir];
        if (p.tipo === 'gesto' && d) {
          const L = 34;
          g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 3;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + d[0] * L, y + d[1] * L); g.stroke();
          g.beginPath(); g.moveTo(x + d[0] * (L + 8), y + d[1] * (L + 8)); g.lineTo(x + d[0] * L - d[1] * 6, y + d[1] * L + d[0] * 6); g.lineTo(x + d[0] * L + d[1] * 6, y + d[1] * L - d[0] * 6); g.fill();
        }
        g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fillStyle = color; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#000'; g.stroke();
      }
    }
    if (zona) { g.strokeStyle = '#6CC4A8'; g.lineWidth = 2.5; g.setLineDash([6, 4]); g.strokeRect((zona.x1 / 100) * W, (zona.y1 / 100) * H, ((zona.x2 - zona.x1) / 100) * W, ((zona.y2 - zona.y1) / 100) * H); g.setLineDash([]); }
  }, [W, H, puntos, zona, modo]);
  return (
    <div className="pn-heat" style={{ width: W, height: H }} data-heat={id}>
      <div style={{ pointerEvents: 'none' }} aria-hidden="true"><PrototipoVista prototipo={PROTOTIPO_ESTUDIO} pantalla={pantalla} escala={escala} onListo={alListo} /></div>
      <canvas ref={ref} style={{ width: W, height: H }} aria-label="Mapa de toques y gestos" />
      <button className="pn-png" onClick={() => { const c = ref.current; if (!c) return; const l = document.createElement('a'); l.href = c.toDataURL('image/png'); l.download = 'mapa-' + (id ?? 'kinoo') + '.png'; l.click(); }} title="Descargar los puntos como PNG">PNG</button>
    </div>
  );
}
