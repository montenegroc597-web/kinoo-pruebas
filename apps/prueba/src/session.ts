import { create } from 'zustand';
import type { Asignacion } from '@kinoo/tracking';

export interface Session {
  sesionId: string;
  codigo: string;
  nombreMostrado: string;
  nombreIngresado: string;
  ronda: number;
  ordenTareas: string;
  ordenMarca: 'A→B' | 'B→A';
  ordenFlujos: 'Descubrir→Ver' | 'Ver→Descubrir';
  provisional: boolean;
  /** 1..4: cuántas fases terminó. Al reabrir, se retoma en fasesCompletadas + 1 desde el principio de esa fase. */
  fasesCompletadas: number;
  /** índice numérico del participante (P07 → 7): gobierna las rotaciones de pantallas y cards */
  indice: number;
  graba: 'Sí' | 'No';
  iniciada: string;
  /** contexto (edad, hábitos) que aún no llegó al servidor; se reintenta solo */
  perfilPendiente?: Record<string, string | number> | null;
  /** última fase que el servidor ya confirmó */
  fasesEnviadas?: number;
}

/** Modo equipo (?equipo=1): los host prueban la app. No se registra, no se envía y no se guarda nada. */
export const modoEquipo: boolean = (() => { try { return new URLSearchParams(window.location.search).get('equipo') === '1'; } catch { return false; } })();

const KEY = 'kinoo.session';
const safe = {
  get(): Session | null {
    if (modoEquipo) return null;
    try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Session) : null; } catch { return null; }
  },
  set(s: Session | null) {
    if (modoEquipo) return;
    try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* storage bloqueado */ }
  },
};

export const indiceDeCodigo = (codigo: string, sesionId: string): number => {
  const m = /^P(\d+)$/.exec(codigo);
  if (m) return parseInt(m[1], 10);
  let h = 0;
  for (const ch of sesionId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 5) + 1;
};

export function nuevaSesion(a: Asignacion & { provisional?: boolean }, nombre: string, ronda: number, graba: 'Sí' | 'No'): Session {
  return {
    sesionId: a.sesionId, codigo: a.codigo, nombreMostrado: a.nombreMostrado, nombreIngresado: nombre, ronda,
    ordenTareas: a.ordenTareas, ordenMarca: a.ordenMarca, ordenFlujos: a.ordenFlujos, provisional: !!a.provisional,
    fasesCompletadas: 0, indice: indiceDeCodigo(a.codigo, a.sesionId), graba, iniciada: new Date().toISOString(),
  };
}

interface Store {
  s: Session | null;
  set(s: Session): void;
  patch(p: Partial<Session>): void;
  completarFase(n: number): void;
  clear(): void;
}
export const useSession = create<Store>((set, get) => ({
  s: safe.get(),
  set: (s) => { safe.set(s); set({ s }); },
  patch: (p) => { const cur = get().s; if (!cur) return; const n = { ...cur, ...p }; safe.set(n); set({ s: n }); },
  completarFase: (n) => { const cur = get().s; if (!cur) return; const nn = { ...cur, fasesCompletadas: Math.max(cur.fasesCompletadas, n) }; safe.set(nn); set({ s: nn }); },
  clear: () => { safe.set(null); set({ s: null }); },
}));
export const getSession = () => useSession.getState().s;

/** Sesión de mentira para el equipo: en memoria, con los órdenes de rotación del participante número `indice`. */
import { ordenFlujosPara, ordenMarcaPara, ordenTareasPara } from '@kinoo/tracking';
export function sesionEquipo(indice: number): Session {
  return {
    sesionId: 'equipo-' + indice, codigo: 'EQUIPO', nombreMostrado: 'Equipo', nombreIngresado: 'Equipo', ronda: -1,
    ordenTareas: ordenTareasPara(indice), ordenMarca: ordenMarcaPara(indice), ordenFlujos: ordenFlujosPara(indice),
    provisional: false, fasesCompletadas: 0, indice, graba: 'No', iniciada: new Date().toISOString(),
  };
}
