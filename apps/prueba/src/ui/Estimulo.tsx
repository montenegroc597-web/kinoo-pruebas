import React, { useEffect, useState } from 'react';
import { Frame, KinoPantalla, ProductApp, type Brand, type SeedId, type Tracker } from '@kinoo/ui';
import { CARDS_ESTIMULOS } from '@kinoo/tracking';

export const SEED_DE_PANTALLA: Record<string, { seed: SeedId; route: string }> = {
  S02: { seed: 'deck-nolan-start', route: '/descubrir' },
  S03: { seed: 'ver-react', route: '/ver' },
  S04: { seed: 'ver-pool', route: '/ver' },
  S05: { seed: 'fresh', route: '/mazos' },
};

/** Escala para que el marco quepa en el celular reservando `reservado` px de alto para botones/texto. */
export function useEscala(reservado: number, maxEscala = 1.1, anchoMargen = 24): number {
  const calc = () => Math.max(0.3, Math.min(maxEscala, (window.innerWidth - anchoMargen) / 390, (window.innerHeight - reservado) / 844));
  const [k, setK] = useState(calc);
  useEffect(() => {
    const on = () => setK(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservado]);
  return k;
}

/** Pantalla del producto, estática (sin toques): para los tests de 5 segundos y de marca. B = el prototipo real «Kino» (KinoPantalla). */
export function PantallaEstatica({ pantalla, brand = 'A', escala, id = 'kinoo-estimulo' }: { pantalla: string; brand?: Brand; escala: number; id?: string }) {
  if (brand === 'B') {
    return (
      <div style={{ pointerEvents: 'none', userSelect: 'none' }} aria-hidden="true">
        <KinoPantalla pantalla={pantalla} escala={escala} id={id} />
      </div>
    );
  }
  const m = SEED_DE_PANTALLA[pantalla];
  return (
    <div style={{ pointerEvents: 'none', userSelect: 'none' }} aria-hidden="true">
      <Frame brand={brand} scale={escala} id={id} radius={14}><ProductApp key={pantalla + brand} seed={m.seed} route={m.route} /></Frame>
    </div>
  );
}

/**
 * La tarjeta DENTRO de la pantalla completa de Descubrir (cabecera, botones de gesto y barra inferior), para que se vea el contexto
 * en el que se desliza. Con `interactiva` la persona puede tocarla y deslizarla de verdad; si no, es una imagen fija.
 */
export function PantallaCard({ card, brand = 'A', escala, interactiva = false, tracker, id = 'kinoo-estimulo' }: { card: (typeof CARDS_ESTIMULOS)[number]; brand?: Brand; escala: number; interactiva?: boolean; tracker?: Tracker; id?: string }) {
  const frame = (
    <Frame brand={brand} scale={escala} id={id} radius={14}>
      <ProductApp key={card.id + brand + (interactiva ? 'i' : 's')} seed="deck-nolan-start" route="/descubrir" ajuste={{ deckId: card.deck, i: card.i, flipped: card.face === 'reverso' }} tracker={tracker} />
    </Frame>
  );
  return interactiva ? frame : <div style={{ pointerEvents: 'none', userSelect: 'none' }} aria-hidden="true">{frame}</div>;
}
