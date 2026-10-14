import React, { useEffect, useRef, useState } from 'react';
import flujo from '../public/kinoo-flujo/prototipo.json';

/**
 * Prototipos de lienzo (.dc.html) mostrados TAL CUAL dentro de la prueba, en un iframe del mismo origen.
 * Cada uno vive en `packages/kinoo-ui/public/<id>/` (publicDir de las dos apps, servido en `<base>/<id>/`), importado con
 * scripts/importar-prototipo.mjs; `prototipo.json` dice su tamaño y su página de inicio. El runtime y `embed.js` son comunes
 * (`public/_prototipos/`). Qué pantalla se muestra en cada momento de la prueba lo decide la «Config» del estudio.
 */
export interface Prototipo { id: string; nombre: string; origen?: string; ancho: number; alto: number; inicio: string }
export const PROTOTIPOS: Record<string, Prototipo> = {
  'kinoo-flujo': flujo,
};

/** Una pantalla: página .dc.html, acciones para llegar al estado que se muestra y elemento a medir o resaltar. */
export interface PantallaProto {
  pagina: string;
  acciones?: { click: string; hasta?: string; max?: number }[];
  marca?: { selector?: string; texto?: string };
}
/** Rectángulo medido en px de la página del prototipo: [x1, y1, x2, y2]. */
export type RectPx = [number, number, number, number];

const baseUrl = (): string => {
  try { return (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './'; } catch { return './'; }
};
export function urlPantalla(prototipo: string, p: PantallaProto): string {
  const q = new URLSearchParams({ embed: '1' });
  if (p.acciones?.length) q.set('acciones', JSON.stringify(p.acciones));
  if (p.marca) q.set('marca', JSON.stringify(p.marca));
  return `${baseUrl()}${prototipo}/${p.pagina}?${q}`;
}

/** Descarga por adelantado la página, el runtime y el modo incrustado. Idempotente. */
export function precargarPrototipo(prototipo: string, paginas: string[]): void {
  if (typeof document === 'undefined') return;
  const b = baseUrl();
  [...paginas.map((p) => `${prototipo}/${p}`), '_prototipos/dc-runtime.js', '_prototipos/embed.js'].forEach((f) => {
    if (document.querySelector(`link[data-precarga="${f}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = b + f; l.dataset.precarga = f;
    document.head.appendChild(l);
  });
}

/**
 * Una pantalla del prototipo en su tamaño real (escalada). `onListo` avisa cuando ya se pintó y se ejecutaron las acciones
 * (las pruebas de 5 segundos cuentan desde ahí). Con `resaltar`, dibuja un círculo rojo alrededor de la marca (V1c).
 * Con `interactiva` la persona la usa de verdad; `onFrame` entrega el iframe para medir sus toques y gestos.
 */
export function PrototipoVista({ prototipo, pantalla, escala = 1, interactiva = false, resaltar = false, id, onListo, onFrame, children }: {
  prototipo: string; pantalla: PantallaProto; escala?: number; interactiva?: boolean; resaltar?: boolean; id?: string;
  onListo?: (marca: RectPx | null) => void; onFrame?: (f: HTMLIFrameElement | null) => void; children?: React.ReactNode;
}) {
  const meta = PROTOTIPOS[prototipo];
  const ref = useRef<HTMLIFrameElement>(null);
  const [marca, setMarca] = useState<RectPx | null>(null);
  const alListo = useRef(onListo); alListo.current = onListo;
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow || e.data?.type !== 'prototipo-listo') return;
      setMarca(e.data.marca ?? null);
      alListo.current?.(e.data.marca ?? null);
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  useEffect(() => { onFrame?.(ref.current); return () => onFrame?.(null); }, [onFrame]);
  const W = meta.ancho, H = meta.alto;
  return (
    <div style={{ width: W * escala, height: H * escala, position: 'relative', flex: 'none' }}>
      <div id={id} data-prototipo={prototipo} data-pagina={pantalla.pagina}
        style={{ width: W, height: H, transform: `scale(${escala})`, transformOrigin: 'top left', position: 'absolute', left: 0, top: 0, overflow: 'hidden', borderRadius: 14, background: '#17120f' }}>
        <iframe ref={ref} title={`${meta.nombre} · ${pantalla.pagina}`} src={urlPantalla(prototipo, pantalla)} tabIndex={interactiva ? 0 : -1}
          style={{ width: W, height: H, border: 0, display: 'block', pointerEvents: interactiva ? 'auto' : 'none' }} />
        {resaltar && marca && (
          <div data-resaltado aria-hidden="true" style={{ position: 'absolute', left: marca[0] - 10, top: marca[1] - 10, width: marca[2] - marca[0] + 20, height: marca[3] - marca[1] + 20, border: '5px solid #e5262b', borderRadius: '50%', pointerEvents: 'none', boxShadow: '0 0 0 3px rgba(255,255,255,.6)' }} />
        )}
        {children}
      </div>
    </div>
  );
}
