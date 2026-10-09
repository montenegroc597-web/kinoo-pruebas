import React, { useEffect, useState } from 'react';
import { DeckCard, Frame, ProductApp, filmById, type Brand, type SeedId } from '@kinoo/ui';
import { CARDS_ESTIMULOS } from '@kinoo/tracking';

export const SEED_DE_PANTALLA: Record<string, { seed: SeedId; route: string }> = {
  S02: { seed: 'deck-nolan-start', route: '/descubrir' },
  S03: { seed: 'ver-react', route: '/ver' },
  S04: { seed: 'ver-pool', route: '/ver' },
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

/** Pantalla del producto, estática (sin toques): para los tests de 5 segundos y de marca. */
export function PantallaEstatica({ pantalla, brand = 'A', escala, id = 'kinoo-estimulo' }: { pantalla: string; brand?: Brand; escala: number; id?: string }) {
  const m = SEED_DE_PANTALLA[pantalla];
  return (
    <div style={{ pointerEvents: 'none', userSelect: 'none' }} aria-hidden="true">
      <Frame brand={brand} scale={escala} id={id} radius={14}><ProductApp key={pantalla + brand} seed={m.seed} route={m.route} /></Frame>
    </div>
  );
}

/** Card sola (frente o reverso) a tamaño real, para el test de 5 s de cards. */
export function CardEstatica({ card, brand = 'A', escala, id = 'kinoo-estimulo' }: { card: (typeof CARDS_ESTIMULOS)[number]; brand?: Brand; escala: number; id?: string }) {
  const f = filmById(card.film)!;
  return (
    <div style={{ pointerEvents: 'none', userSelect: 'none' }} aria-hidden="true">
      <Frame brand={brand} scale={escala} id={id} radius={14}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 20px', background: 'var(--surface)' }}>
          <div style={{ width: '100%' }}>
            <DeckCard hook={f.hook} match={f.match} verdict={f.verdict} dims={(f.dims ?? []).map((d) => ({ label: d[0], word: d[2], value: d[1] }))} reason={f.reason}
              people={(f.creators ?? []).map((c) => ({ initial: c[0], tone: c[1] }))} genres={f.genres} title={f.title} director={f.director} description={f.desc} image={f.image}
              platforms={f.platforms} meta={f.meta} flipped={card.face === 'reverso'} height={560} />
          </div>
        </div>
      </Frame>
    </div>
  );
}
