import { TrackingClient, flujoDePantalla, type Bloque, type EventTipo, type KinooEvent, type Version } from '@kinoo/tracking';
import type { Tracker } from '@kinoo/ui';
import { getSession } from './session';

const URL_BACKEND = import.meta.env.VITE_APPS_SCRIPT_URL ?? '';
const KEY_BACKEND = import.meta.env.VITE_WRITE_KEY ?? '';

export const client = new TrackingClient({
  url: URL_BACKEND,
  key: KEY_BACKEND,
  storage: (() => { try { return window.localStorage; } catch { return null; } })(),
  beacon: (u, d) => { try { return navigator.sendBeacon(u, new Blob([d], { type: 'text/plain;charset=UTF-8' })); } catch { return false; } },
});
client.start();
if (typeof window !== 'undefined') {
  const flush = () => client.enviarConBeacon();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}

/** Contexto "actual": lo que va en cada evento sin que cada llamador lo repita. */
export const ctx: { bloque: Bloque; estimulo: string | null; pantalla: string; version: Version; fase: number } = { bloque: 'registro', estimulo: null, pantalla: '', version: 'U', fase: 0 };
export const setCtx = (p: Partial<typeof ctx>) => { Object.assign(ctx, p); };

let t0 = performance.now();
export const resetReloj = () => { t0 = performance.now(); };
export const ahoraSesion = () => performance.now() - t0;

const uuid = (): string => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
export const nuevoId = uuid;

export function emit(tipo: EventTipo, extra: Partial<KinooEvent> = {}): void {
  const s = getSession();
  const e: KinooEvent = {
    eventId: uuid(), sesionId: s?.sesionId ?? 'sin-sesion', codigo: s?.codigo ?? '', nombreMostrado: s?.nombreMostrado ?? '', ronda: s?.ronda ?? 0,
    fase: ctx.fase, ts: new Date().toISOString(), tSesion: Math.round(ahoraSesion()), bloque: ctx.bloque, estimulo: ctx.estimulo, pantalla: ctx.pantalla,
    version: ctx.version, tipo, ua: navigator.userAgent, viewport: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}`,
    ...extra,
  };
  client.enqueueEvent(e);
}

/** Fila de una hoja del Registro v1.3, ya ligada al participante. */
export function fila(hoja: string, rowKey: string, datos: Record<string, unknown>): void {
  const s = getSession();
  if (!s) return;
  client.enqueueRows(hoja, {
    Participante: s.codigo, 'Nombre mostrado': s.nombreMostrado, 'Sesión ID': s.sesionId,
    ...datos, 'Row ID': `${s.sesionId}|${hoja}|${rowKey}`,
  });
}

/** Punto en pantalla (clic, recuerdo o primera mirada): hoja «Puntos». */
export function punto(opts: { prueba: string; estimulo: string; pantallaId: string; version: Version; nClic: number; x: number; y: number; t: number; resultado?: string; key: string }): void {
  fila('Puntos', opts.key, {
    Prueba: opts.prueba, 'Estímulo (tarea T1…T5 / card C1…C6 / par)': opts.estimulo, 'Pantalla ID': opts.pantallaId, 'Versión': opts.version,
    'N.º de clic (1 = primero)': opts.nClic, 'X (% ancho)': round1(opts.x), 'Y (% alto)': round1(opts.y), 'Tiempo desde que se mostró (s)': round1(opts.t), Resultado: opts.resultado ?? '',
  });
}
export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Rastreador que se le inyecta al producto: sus pantallas avisan y aquí se vuelve evento. */
export function trackerProducto(listeners?: { onScreen?: (id: string) => void; onAction?: (name: string, extra?: Record<string, unknown>) => void }): Tracker {
  return {
    screen: (id) => { setCtx({ pantalla: id }); emit('screen.view', { pantalla: id, extra: { flujo: flujoDePantalla(id) } }); listeners?.onScreen?.(id); },
    action: (name, extra) => { emit('action', { valor: name, extra }); listeners?.onAction?.(name, extra); },
  };
}

export const estadoRed = () => client.red();
export const modoLocal = !URL_BACKEND;

/** Fila compartida por todos los participantes (p. ej. Zonas): el Row ID no lleva sesión. */
export function filaGlobal(hoja: string, rowId: string, datos: Record<string, unknown>): void {
  client.enqueueRows(hoja, { ...datos, 'Row ID': rowId });
}
