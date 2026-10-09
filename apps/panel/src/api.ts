import type { Dump } from './analytics';

export interface Conexion { url: string; key: string }
const K = 'kinoo.panel.conexion';

export const cargarConexion = (): Conexion | null => { try { const r = sessionStorage.getItem(K); return r ? (JSON.parse(r) as Conexion) : null; } catch { return null; } };
export const guardarConexion = (c: Conexion | null) => { try { if (c) sessionStorage.setItem(K, JSON.stringify(c)); else sessionStorage.removeItem(K); } catch { /* ignorar */ } };
export const URL_POR_DEFECTO = import.meta.env.VITE_APPS_SCRIPT_URL ?? '';

export async function fetchDump(c: Conexion): Promise<Dump> {
  const u = new URL(c.url);
  u.searchParams.set('action', 'dump'); u.searchParams.set('key', c.key);
  const res = await fetch(u.toString());
  const j = (await res.json()) as { ok: boolean; data?: Dump; error?: string };
  if (!j.ok || !j.data) throw new Error(j.error ?? 'respuesta inválida');
  return j.data;
}

/** Codificación del equipo: cambia columnas de una fila por Row ID (requiere READ_KEY). */
export async function codificar(c: Conexion, hoja: string, rowId: string, cambios: Record<string, string | number>): Promise<boolean> {
  const res = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'code', key: c.key, hoja, rowId, cambios }) });
  const j = (await res.json()) as { ok: boolean; data?: { ok: boolean } };
  return !!(j.ok && j.data?.ok);
}
