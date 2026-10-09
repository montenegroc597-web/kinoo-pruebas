import { clasificarClic, expandirZona, type Rect, type ResultadoClic } from '@kinoo/tracking';
import { useEffect, useRef } from 'react';
import { emit, round1 } from './track';

export interface ClickInfo {
  n: number;
  x: number;
  y: number;
  target: string;
  interactivo: boolean;
  resultado: ResultadoClic;
  zona: 'correcta' | 'aceptable' | null;
  /** segundos desde que empezó la tarea */
  t: number;
}

const MIN_W = (44 / 390) * 100; // 44 px de ancho mínimo, en % del marco
const MIN_H = (44 / 844) * 100;

/** Une los elementos con data-zone="Tn.<tipo>" y devuelve su rectángulo en % del marco, ampliado al mínimo táctil. */
export function medirZona(frame: HTMLElement, tarea: string, tipo: 'correcta' | 'aceptable'): Rect | null {
  const els = frame.querySelectorAll<HTMLElement>(`[data-zone="${tarea}.${tipo}"]`);
  if (!els.length) return null;
  const fr = frame.getBoundingClientRect();
  if (!fr.width || !fr.height) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
  });
  if (x1 === Infinity) return null;
  const pct: Rect = { x1: ((x1 - fr.left) / fr.width) * 100, y1: ((y1 - fr.top) / fr.height) * 100, x2: ((x2 - fr.left) / fr.width) * 100, y2: ((y2 - fr.top) / fr.height) * 100 };
  return expandirZona(pct, MIN_W, MIN_H);
}

export interface CaptureOpts {
  /** si hay tarea activa se mide la zona y se clasifica cada toque */
  tarea?: string | null;
  /** reloj de la tarea: ms (performance.now) en que empezó */
  t0?: number;
  onClick?: (c: ClickInfo) => void;
  enabled?: boolean;
  /** cambia cuando el marco se vuelve a montar, para re-enganchar el listener */
  rev?: string | number;
}

/** Un solo listener en #kinoo-frame: toda interacción queda registrada con coordenadas relativas al marco. */
export function useFrameCapture(frameId: string, opts: CaptureOpts) {
  const ref = useRef(opts);
  ref.current = opts;
  const nRef = useRef(0);
  useEffect(() => { nRef.current = 0; }, [opts.tarea, opts.t0]);

  useEffect(() => {
    const frame = document.getElementById(frameId);
    if (!frame) return;
    let g: { x: number; y: number; px: number; py: number; t: number; target: string; interactivo: boolean; info: Partial<ClickInfo>; moved: boolean; lp: boolean; timer: ReturnType<typeof setTimeout> | null } | null = null;

    const down = (e: PointerEvent) => {
      const o = ref.current;
      if (o.enabled === false) return;
      const r = frame.getBoundingClientRect();
      if (!r.width) return;
      const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
      const tr = (e.target as Element | null)?.closest?.('[data-track]') as HTMLElement | null;
      const target = tr?.dataset.track ?? 'none';
      const interactivo = !!tr;
      let resultado: ResultadoClic = 'Sin zona definida';
      let zona: 'correcta' | 'aceptable' | null = null;
      if (o.tarea) {
        const zc = medirZona(frame, o.tarea, 'correcta'), za = medirZona(frame, o.tarea, 'aceptable');
        resultado = clasificarClic(x, y, { correcta: zc, aceptable: za });
        zona = resultado === 'Correcto' ? 'correcta' : resultado === 'Aceptable' ? 'aceptable' : null;
      }
      nRef.current += 1;
      const t = o.t0 != null ? (performance.now() - o.t0) / 1000 : 0;
      const info: ClickInfo = { n: nRef.current, x, y, target, interactivo, resultado, zona, t };
      g = { x, y, px: e.clientX, py: e.clientY, t: performance.now(), target, interactivo, info, moved: false, lp: false, timer: null };
      g.timer = setTimeout(() => { if (g && !g.moved) { g.lp = true; emit('longpress', { x: round1(x), y: round1(y), target, interactivo }); } }, 520);
      o.onClick?.(info);
    };
    const move = (e: PointerEvent) => {
      if (!g) return;
      if (Math.abs(e.clientX - g.px) > 6 || Math.abs(e.clientY - g.py) > 6) g.moved = true;
    };
    const up = (e: PointerEvent) => {
      if (!g) return;
      const cur = g; g = null;
      if (cur.timer) clearTimeout(cur.timer);
      const i = cur.info as ClickInfo;
      const base = { x: round1(cur.x), y: round1(cur.y), target: cur.target, interactivo: cur.interactivo, zona: i.zona, resultado: i.resultado, nClic: i.n, tTarea: round1(i.t) };
      if (cur.lp) return;
      if (cur.moved) {
        const dx = e.clientX - cur.px, dy = e.clientY - cur.py;
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : dy < 0 ? 'arriba' : 'abajo';
        emit('drag', { ...base, valor: dir, extra: { dx: Math.round(dx), dy: Math.round(dy), ms: Math.round(performance.now() - cur.t) } });
      } else emit('tap', base);
    };
    frame.addEventListener('pointerdown', down, true);
    frame.addEventListener('pointermove', move, true);
    frame.addEventListener('pointerup', up, true);
    frame.addEventListener('pointercancel', up, true);
    return () => {
      frame.removeEventListener('pointerdown', down, true);
      frame.removeEventListener('pointermove', move, true);
      frame.removeEventListener('pointerup', up, true);
      frame.removeEventListener('pointercancel', up, true);
    };
  }, [frameId, opts.rev]);
}

/** Rectángulo (en % del marco) del primer elemento que cumple `selector` dentro del marco. */
export function medirSelector(frame: HTMLElement, selector: string): Rect | null {
  const el = frame.querySelector<HTMLElement>(selector);
  const fr = frame.getBoundingClientRect();
  if (!el || !fr.width) return null;
  const r = el.getBoundingClientRect();
  return { x1: ((r.left - fr.left) / fr.width) * 100, y1: ((r.top - fr.top) / fr.height) * 100, x2: ((r.right - fr.left) / fr.width) * 100, y2: ((r.bottom - fr.top) / fr.height) * 100 };
}
