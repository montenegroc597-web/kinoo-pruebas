import React, { useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { StoreApi } from 'zustand';
import { Descubrir } from './screens/Descubrir';
import { MiEspacio } from './screens/MiEspacio';
import { Mood } from './screens/Mood';
import { MoodFeedback } from './screens/MoodFeedback';
import { Mazos } from './screens/Mazos';
import { Recarga } from './screens/Recarga';
import { Ver } from './screens/Ver';
import { ProductProvider, SEED_ROUTE, createProductStore, useProduct, type AjusteMazo, type ProductState, type SeedId } from './store';
import { TrackerProvider, noopTracker, type Tracker } from './tracker';

export interface ProductControls {
  store: StoreApi<ProductState>;
  /** Reinicia el producto en el estado de una semilla y navega a su pantalla. */
  seed(seed: SeedId): void;
  go(path: string): void;
  path(): string;
}

function DescubrirGuard() {
  const dealt = useProduct((x) => x.deck.dealt);
  return dealt ? <Descubrir /> : <Navigate to="/mood" replace />;
}

function Rutas({ controlsRef, onRoute, bump, store }: { controlsRef?: React.Ref<ProductControls>; onRoute?: (p: string) => void; bump: (s: SeedId) => void; store: StoreApi<ProductState> }) {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => { onRoute?.(loc.pathname); }, [loc.pathname, onRoute]);
  useImperativeHandle(controlsRef, () => ({
    store,
    seed: (sd) => { bump(sd); nav(SEED_ROUTE[sd], { replace: true }); },
    go: (p) => nav(p),
    path: () => loc.pathname,
  }), [nav, loc.pathname, bump, store]);
  return (
    <Routes>
      <Route path="/mood" element={<Mood />} />
      <Route path="/mood/lectura" element={<MoodFeedback />} />
      <Route path="/mazos" element={<Mazos />} />
      <Route path="/descubrir" element={<DescubrirGuard />} />
      <Route path="/recarga" element={<Recarga />} />
      <Route path="/ver" element={<Ver />} />
      <Route path="/mi-espacio" element={<MiEspacio />} />
      <Route path="*" element={<Navigate to="/mood" replace />} />
    </Routes>
  );
}

/** Todo el producto (7 pantallas) con estado propio, semillas y rastreador inyectable. Se dibuja dentro de <Frame>. */
export function ProductApp({ seed = 'fresh', route, tracker = noopTracker, controlsRef, onRoute, ajuste }: { seed?: SeedId; route?: string; tracker?: Tracker; controlsRef?: React.Ref<ProductControls>; onRoute?: (p: string) => void; ajuste?: AjusteMazo }) {
  const [store] = useState(() => createProductStore(seed, ajuste));
  const [nonce, setNonce] = useState(0);
  const bump = useCallback((sd: SeedId) => { store.getState().applySeed(sd); setNonce((n) => n + 1); }, [store]);
  return (
    <ProductProvider store={store}>
      <TrackerProvider tracker={tracker}>
        <MemoryRouter initialEntries={[route ?? SEED_ROUTE[seed]]}>
          <Rutas key={nonce} controlsRef={controlsRef} onRoute={onRoute} bump={bump} store={store} />
        </MemoryRouter>
      </TrackerProvider>
    </ProductProvider>
  );
}
