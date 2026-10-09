import React, { createContext, useContext, useEffect, useRef } from 'react';

/** Lo que la app de prueba le pide a las pantallas: avisar de pantallas visitadas y de acciones de producto. */
export interface Tracker {
  screen(id: string): void;
  action(name: string, extra?: Record<string, unknown>): void;
}
export const noopTracker: Tracker = { screen() {}, action() {} };
const Ctx = createContext<Tracker>(noopTracker);
export const TrackerProvider = ({ tracker, children }: { tracker: Tracker; children: React.ReactNode }) => <Ctx.Provider value={tracker}>{children}</Ctx.Provider>;
export const useTracker = () => useContext(Ctx);

/** Emite screen.view cuando cambia el id (pantalla o subestado, p. ej. "S02.flipped"). */
export function useScreen(id: string) {
  const t = useTracker();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current !== id) { last.current = id; t.screen(id); }
  }, [id, t]);
}
