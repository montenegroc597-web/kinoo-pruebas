import { create } from 'zustand';
import { semillaDe, type Asignacion, type Flujo, type Variante, type VersionEstudio, type VersionTextos } from '@kinoo/tracking';

/** Sesión de una persona (anónima: solo el código P01, P02…). Se guarda en el celular para retomar si se cierra la pestaña. */
export interface Session {
  sesionId: string;
  codigo: string;
  ronda: number;
  variante: Variante;
  flujo: Flujo;
  provisional: boolean;
  /** partes terminadas (de las del flujo). Al reabrir se retoma al principio de la parte siguiente. */
  partes: number;
  /** última cantidad de partes que el servidor ya confirmó (se reintenta sin red) */
  partesEnviadas?: number;
  /** perfil o control de atención que aún no llegó al servidor; se reintenta solo */
  perfilPendiente?: Record<string, string | number> | null;
  /** semilla de las aleatorizaciones (moods de M3a, orden de M3c y M3d) */
  semilla: number;
  iniciada: string;
  /** redacción y «Config» con las que empezó: al retomar se usan las mismas */
  textos?: VersionTextos;
  estudio?: VersionEstudio;
}

/** Modo equipo (?equipo=1): el equipo prueba el link. No se registra, no se envía y no se guarda nada. */
export const modoEquipo: boolean = (() => { try { return new URLSearchParams(window.location.search).get('equipo') === '1'; } catch { return false; } })();

/** Qué link abrió la persona: ?link=1 | ?link=2 (sin parámetro, el completo). ?card=A|B fija la card (Link 1-A / Link 1-B). */
export function linkDeUrl(): { flujo: Flujo; variante?: Variante } {
  const q = new URLSearchParams(window.location.search);
  const link = q.get('link');
  const card = q.get('card')?.toUpperCase();
  return { flujo: link === '1' ? 'Link 1' : link === '2' ? 'Link 2' : 'Completo', variante: card === 'A' || card === 'B' ? card : undefined };
}

const KEY = 'kinoo.session.v2';
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

export function nuevaSesion(a: Asignacion & { provisional?: boolean }, ronda: number, textos?: VersionTextos, estudio?: VersionEstudio): Session {
  return {
    sesionId: a.sesionId, codigo: a.codigo, ronda, variante: a.variante, flujo: a.flujo, provisional: !!a.provisional,
    partes: 0, semilla: semillaDe(a.sesionId), iniciada: new Date().toISOString(), textos, estudio,
  };
}

/** Sesión de mentira para el equipo: en memoria, con la card y el link que elija. */
export function sesionEquipo(variante: Variante, flujo: Flujo): Session {
  return { sesionId: 'equipo', codigo: 'EQUIPO', ronda: -1, variante, flujo, provisional: false, partes: 0, semilla: Date.now() % 100000, iniciada: new Date().toISOString() };
}

interface Store {
  s: Session | null;
  set(s: Session): void;
  patch(p: Partial<Session>): void;
  clear(): void;
}
export const useSession = create<Store>((set, get) => ({
  s: safe.get(),
  set: (s) => { safe.set(s); set({ s }); },
  patch: (p) => { const cur = get().s; if (!cur) return; const n = { ...cur, ...p }; safe.set(n); set({ s: n }); },
  clear: () => { safe.set(null); set({ s: null }); },
}));
export const getSession = () => useSession.getState().s;
