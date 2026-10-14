import type { Estudio, VersionEstudio, VersionTextos } from '@kinoo/tracking';
import type { Datos, Dump, Hoja, ResumenEventos } from './analytics';

export interface Conexion { url: string; key: string }
const K = 'kinoo.panel.conexion';

export const cargarConexion = (): Conexion | null => { try { const r = sessionStorage.getItem(K); return r ? (JSON.parse(r) as Conexion) : null; } catch { return null; } };
export const guardarConexion = (c: Conexion | null) => { try { if (c) sessionStorage.setItem(K, JSON.stringify(c)); else sessionStorage.removeItem(K); } catch { /* ignorar */ } };
export const URL_POR_DEFECTO = import.meta.env.VITE_APPS_SCRIPT_URL ?? '';

/** Todas las llamadas del Panel van por POST a la Edge Function (requieren la READ_KEY). */
async function llamar<T>(c: Conexion, action: string, cuerpo: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, key: c.key, ...cuerpo }) });
  const j = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (!j.ok) throw new Error(j.error ?? 'respuesta inválida');
  return j.data as T;
}

/** Hojas (sin «Eventos», que puede pesar decenas de MB) + el resumen de eventos calculado en el servidor. */
export async function fetchDatos(c: Conexion): Promise<Datos> {
  const [hojas, eventos] = await Promise.all([
    llamar<Dump>(c, 'dump', { excluir: ['Eventos'] }),
    llamar<ResumenEventos>(c, 'resumen-eventos'),
  ]);
  return { hojas, eventos };
}

/** Eventos paginados (de un participante, o todos para exportar). */
export async function fetchEventos(c: Conexion, codigo = '', alAvanzar?: (n: number) => void): Promise<Hoja> {
  const out: Hoja = { headers: [], rows: [] };
  let desde = 0;
  for (;;) {
    const p = await llamar<Hoja & { ultimoId: number | null }>(c, 'eventos', { codigo, desde, limite: 5000 });
    out.headers = p.headers;
    out.rows.push(...p.rows);
    alAvanzar?.(out.rows.length);
    if (!p.ultimoId || p.rows.length < 5000) return out;
    desde = p.ultimoId;
  }
}

/** Codificación del equipo: cambia columnas de una fila por Row ID. */
export async function codificar(c: Conexion, hoja: string, rowId: string, cambios: Record<string, string | number>): Promise<boolean> {
  try { return !!(await llamar<{ ok: boolean }>(c, 'code', { hoja, rowId, cambios }))?.ok; } catch { return false; }
}

// ---------- Configuración versionada: redacción de textos y «Config» del estudio ----------
export type ClaveTextos = 'textos' | 'textos-borrador';
export type ClaveEstudio = 'estudio' | 'estudio-borrador';
export const leerTextos = (c: Conexion, clave: ClaveTextos) => llamar<VersionTextos | null>(c, 'config', { clave });
export const guardarTextos = (c: Conexion, clave: ClaveTextos, datos: { version: string; nota: string; textos: Record<string, string> }) => llamar<VersionTextos>(c, 'config-save', { clave, datos });
export const historialTextos = (c: Conexion) => llamar<(VersionTextos & { id: number; creado: string })[]>(c, 'config-historial', { clave: 'textos' });
export const leerEstudio = (c: Conexion, clave: ClaveEstudio) => llamar<VersionEstudio | null>(c, 'config', { clave });
export const guardarEstudio = (c: Conexion, clave: ClaveEstudio, datos: { version: string; nota: string; estudio: Estudio }) => llamar<VersionEstudio>(c, 'config-save', { clave, datos });
export const historialEstudio = (c: Conexion) => llamar<(VersionEstudio & { id: number; creado: string })[]>(c, 'config-historial', { clave: 'estudio' });
