import { TrackingClient, type Bloque, type EventTipo, type KinooEvent } from '@kinoo/tracking';
import { getSession, modoEquipo } from './session';

const URL_BACKEND = import.meta.env.VITE_APPS_SCRIPT_URL ?? '';
const KEY_BACKEND = import.meta.env.VITE_WRITE_KEY ?? '';

export const client = new TrackingClient({
  url: URL_BACKEND,
  key: KEY_BACKEND,
  storage: (() => { try { return window.localStorage; } catch { return null; } })(),
  beacon: (u, d) => { try { return navigator.sendBeacon(u, new Blob([d], { type: 'text/plain;charset=UTF-8' })); } catch { return false; } },
});
if (modoEquipo) client.setInerte(true);
client.start();
if (typeof window !== 'undefined') {
  const flush = () => client.enviarConBeacon();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}

/** Contexto «actual»: lo que va en cada evento sin que cada llamador lo repita. */
export const ctx: { bloque: Bloque; estimulo: string | null; pantalla: string } = { bloque: 'registro', estimulo: null, pantalla: '' };
export const setCtx = (p: Partial<typeof ctx>) => { Object.assign(ctx, p); };

let t0 = performance.now();
export const resetReloj = () => { t0 = performance.now(); };

const uuid = (): string => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
export const nuevoId = uuid;
export const round1 = (n: number) => Math.round(n * 10) / 10;

export function emit(tipo: EventTipo, extra: Partial<KinooEvent> = {}): void {
  const s = getSession();
  client.enqueueEvent({
    eventId: uuid(), sesionId: s?.sesionId ?? 'sin-sesion', codigo: s?.codigo ?? '', ronda: s?.ronda ?? 0, variante: s?.variante ?? '',
    ts: new Date().toISOString(), tSesion: Math.round(performance.now() - t0), bloque: ctx.bloque, estimulo: ctx.estimulo, pantalla: ctx.pantalla,
    tipo, ua: navigator.userAgent, viewport: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}`,
    ...extra,
  });
}

/** Fila de una hoja del registro, ya ligada a la persona. `clave` hace la fila única (una por persona, por mood, por película…). */
export function fila(hoja: string, clave: string, datos: Record<string, unknown>): void {
  const s = getSession();
  if (!s) return;
  client.enqueueRows(hoja, { Participante: s.codigo, 'Variante (auto)': s.variante, Variante: s.variante, 'Sesión ID': s.sesionId, ...datos, 'Row ID': `${s.sesionId}|${hoja}|${clave}` });
}

export const estadoRed = () => client.red();
export const modoLocal = !URL_BACKEND;
