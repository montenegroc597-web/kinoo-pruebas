import React, { createContext, useContext, useRef } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import { DECK_NOLAN, DECK_OTHER, MARCAS_VER_POOL, MOODS, type MarcaFilm, type MoodItem } from './films';

export type SeedId = 'fresh' | 'deck-nolan-start' | 'deck-nolan-flipped' | 'deck-finished' | 'ver-pool' | 'ver-back' | 'ver-react' | 'mazos-en-curso';
export type RecargaScreen = 'cierre' | 'recibo' | 'mood' | 'hilo' | 'noir' | 'feedback' | 'elegir' | 'barajar' | 'listo';

export interface ProductState {
  mood: MoodItem | null;
  marks: Record<string, MarcaFilm>;
  deck: { id: string; dealt: boolean; i: number };
  /** estado inicial que fija una semilla y que las pantallas leen una vez al montarse */
  boot: { verSheet: null | 'back' | 'react'; verCur: string | null; deckFlipped: boolean; recarga: RecargaScreen; seed: SeedId | null };
  /** respuestas de la recarga */
  recarga: { mood: string | null; nolan: string | null; noir: string | null };

  setMood(m: MoodItem | null): void;
  mark(filmId: string, m: MarcaFilm | null): void;
  dealDeck(id: string): void;
  advance(): void;
  setI(i: number): void;
  setRecarga(patch: Partial<ProductState['recarga']>): void;
  applySeed(seed: SeedId): void;
  clearBoot(): void;
}

export const deckFilmIds = (id: string): string[] => (id === 'nolan' ? DECK_NOLAN : DECK_OTHER);
export const SEED_ROUTE: Record<SeedId, string> = {
  fresh: '/mood', 'deck-nolan-start': '/descubrir', 'deck-nolan-flipped': '/descubrir', 'deck-finished': '/recarga',
  'ver-pool': '/ver', 'ver-back': '/ver', 'ver-react': '/ver', 'mazos-en-curso': '/mazos',
};

const bootVacio = { verSheet: null, verCur: null, deckFlipped: false, recarga: 'cierre' as RecargaScreen, seed: null };

function seedState(seed: SeedId): Pick<ProductState, 'mood' | 'marks' | 'deck' | 'boot' | 'recarga'> {
  const base = { mood: null as MoodItem | null, marks: {} as Record<string, MarcaFilm>, deck: { id: 'nolan', dealt: false, i: 0 }, boot: { ...bootVacio, seed }, recarga: { mood: null, nolan: null, noir: null } };
  switch (seed) {
    case 'fresh': return base;
    case 'deck-nolan-start': return { ...base, deck: { id: 'nolan', dealt: true, i: 0 } };
    case 'deck-nolan-flipped': return { ...base, deck: { id: 'nolan', dealt: true, i: 0 }, boot: { ...base.boot, deckFlipped: true } };
    case 'deck-finished': return { ...base, deck: { id: 'nolan', dealt: true, i: 3 }, marks: { interstellar: 'ring', oppenheimer: 'ring', darkknight: 'x' }, boot: { ...base.boot, recarga: 'cierre' } };
    case 'ver-pool': return { ...base, marks: { ...MARCAS_VER_POOL } };
    case 'ver-back': return { ...base, marks: { ...MARCAS_VER_POOL }, boot: { ...base.boot, verSheet: 'back', verCur: 'interstellar' } };
    case 'ver-react': return { ...base, marks: { ...MARCAS_VER_POOL }, boot: { ...base.boot, verSheet: 'react', verCur: 'interstellar' } };
    case 'mazos-en-curso': return { ...base, mood: MOODS[0], deck: { id: 'mood', dealt: true, i: 1 } };
  }
}

export function createProductStore(seed: SeedId = 'fresh'): StoreApi<ProductState> {
  return createStore<ProductState>((set, get) => ({
    ...seedState(seed),
    setMood: (m) => set({ mood: m }),
    mark: (filmId, m) => set((st) => {
      const marks = { ...st.marks };
      if (m == null) delete marks[filmId]; else marks[filmId] = m;
      return { marks };
    }),
    dealDeck: (id) => set({ deck: { id, dealt: true, i: 0 } }),
    advance: () => set((st) => ({ deck: { ...st.deck, i: st.deck.i + 1 } })),
    setI: (i) => set((st) => ({ deck: { ...st.deck, i } })),
    setRecarga: (patch) => set((st) => ({ recarga: { ...st.recarga, ...patch } })),
    applySeed: (sd) => set({ ...seedState(sd) }),
    clearBoot: () => { if (get().boot !== null) set({ boot: { ...bootVacio, seed: get().boot.seed } }); },
  }));
}

const Ctx = createContext<StoreApi<ProductState> | null>(null);
export function ProductProvider({ store, seed, children }: { store?: StoreApi<ProductState>; seed?: SeedId; children: React.ReactNode }) {
  const ref = useRef<StoreApi<ProductState>>();
  if (!ref.current) ref.current = store ?? createProductStore(seed ?? 'fresh');
  return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>;
}
export function useProduct<T>(sel: (s: ProductState) => T): T {
  const st = useContext(Ctx);
  if (!st) throw new Error('useProduct fuera de ProductProvider');
  return useStore(st, sel);
}
export function useProductApi(): StoreApi<ProductState> {
  const st = useContext(Ctx);
  if (!st) throw new Error('useProductApi fuera de ProductProvider');
  return st;
}
