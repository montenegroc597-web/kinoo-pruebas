import {
  VERSION_ESTUDIO_INICIAL, VERSION_PROTOCOLO, aplicarEstudio, aplicarTextos, type ClaveConfig, type VersionEstudio, type VersionTextos,
} from '@kinoo/tracking';
import { client } from './track';
import { getSession, modoEquipo } from './session';

// Redacción de los textos (Panel → Textos) y «Config» del estudio (Panel → Estudio) con las que corre la app.
// Se deciden UNA vez, antes de pintar la app, y no cambian durante la sesión.

const ESPERA_MS = 2500;
let textos: VersionTextos = { version: VERSION_PROTOCOLO, textos: {} };
let estudio: VersionEstudio = { version: VERSION_ESTUDIO_INICIAL, estudio: {} };
/** Versiones con las que se está mostrando la app (se guardan en la sesión y en la hoja Participantes). */
export const configActual = () => ({ textos, estudio });

const conTiempo = <T,>(p: Promise<T>, ms: number): Promise<T | null> => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
const leerCache = <T,>(k: string): T | null => { try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : null; } catch { return null; } };
const guardarCache = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage bloqueado */ } };

/**
 * Publicada en Supabase (en modo equipo con ?textos=borrador, el borrador del Panel); sin red, la última descargada en este
 * celular; si no, la del protocolo. Si no responde en 2,5 s se sigue con lo que haya: nunca se bloquea el inicio.
 */
async function cargar<T>(clave: ClaveConfig): Promise<T | null> {
  const borrador = modoEquipo && new URLSearchParams(location.search).get('textos') === 'borrador';
  const k = borrador ? (`${clave}-borrador` as ClaveConfig) : clave;
  const v = await conTiempo(client.leerConfig<T>(k), ESPERA_MS);
  if (v) { if (!borrador) guardarCache('kinoo.' + clave, v); return v; }
  return borrador ? null : leerCache<T>('kinoo.' + clave);
}

/** Una sesión retomada usa la redacción y la «Config» con las que empezó (no se mezclan versiones dentro de una persona). */
export async function prepararConfig(): Promise<void> {
  const s = getSession();
  const [t, e] = s?.textos && s.estudio ? [s.textos, s.estudio] : await Promise.all([cargar<VersionTextos>('textos'), cargar<VersionEstudio>('estudio')]);
  if (t) { aplicarTextos(t.textos); textos = t; }
  if (e) { aplicarEstudio(e.estudio); estudio = e; }
}
