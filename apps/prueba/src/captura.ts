import { useEffect, useRef } from 'react';

/** Un toque o gesto de la persona sobre el prototipo, en % de la pantalla (ancho × alto) para que los mapas sean comparables. */
export interface Toque {
  n: number;
  tipo: 'toque' | 'gesto';
  dir?: 'izquierda' | 'derecha' | 'arriba' | 'abajo';
  x: number;
  y: number;
  /** segundos desde que empezó la tarea */
  t: number;
  /** texto (o aria-label) del botón o enlace tocado; vacío si tocó algo que no es un control */
  control: string;
}
/** Distancia mínima (px) para que un arrastre cuente como gesto de deslizar. */
const UMBRAL_GESTO = 40;
const limpio = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);

/**
 * Escucha toques y gestos DENTRO del iframe del prototipo (mismo origen). Se vuelve a enganchar si la página del prototipo
 * navega (los enlaces entre pantallas cargan otro documento). `inicio.current` = performance.now() del inicio de la tarea;
 * la numeración de toques vuelve a 1 cada vez que la captura se activa.
 */
export function useCapturaProto(frame: HTMLIFrameElement | null, opts: { activo: boolean; inicio: { current: number }; ancho: number; alto: number; onToque: (t: Toque) => void }) {
  const ref = useRef(opts);
  ref.current = opts;
  const n = useRef(0);
  useEffect(() => { if (opts.activo) n.current = 0; }, [opts.activo]);

  useEffect(() => {
    if (!frame) return;
    let quitar: (() => void) | null = null;
    const enganchar = () => {
      quitar?.();
      const doc = frame.contentDocument;
      if (!doc) return;
      let ini: { x: number; y: number; control: string } | null = null;
      const down = (e: PointerEvent) => {
        if (!ref.current.activo) return;
        const el = (e.target as Element | null)?.closest?.('button, a, [role="button"]') as HTMLElement | null;
        ini = { x: e.clientX, y: e.clientY, control: el ? limpio(el.getAttribute('aria-label') || el.textContent) : '' };
      };
      const up = (e: PointerEvent) => {
        if (!ini || !ref.current.activo) { ini = null; return; }
        const o = ref.current, dx = e.clientX - ini.x, dy = e.clientY - ini.y;
        const gesto = Math.hypot(dx, dy) >= UMBRAL_GESTO;
        n.current += 1;
        o.onToque({
          n: n.current, tipo: gesto ? 'gesto' : 'toque',
          dir: gesto ? (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : dy < 0 ? 'arriba' : 'abajo') : undefined,
          x: Math.round((ini.x / o.ancho) * 1000) / 10, y: Math.round((ini.y / o.alto) * 1000) / 10,
          t: Math.round((performance.now() - o.inicio.current) / 100) / 10, control: gesto ? '' : ini.control,
        });
        ini = null;
      };
      doc.addEventListener('pointerdown', down, true);
      doc.addEventListener('pointerup', up, true);
      doc.addEventListener('pointercancel', up, true);
      quitar = () => { doc.removeEventListener('pointerdown', down, true); doc.removeEventListener('pointerup', up, true); doc.removeEventListener('pointercancel', up, true); };
    };
    enganchar();
    frame.addEventListener('load', enganchar);
    return () => { frame.removeEventListener('load', enganchar); quitar?.(); };
  }, [frame]);
}

/** Texto del mood elegido en la tira de moods del prototipo (botón con aria-pressed="true"). */
export function moodElegido(frame: HTMLIFrameElement | null): string {
  const el = frame?.contentDocument?.querySelector('button[aria-pressed="true"]');
  return limpio(el?.textContent);
}
