import React, { useEffect, useState } from 'react';
import './styles/tokens.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/kino.css';

export const FRAME_W = 390;
export const FRAME_H = 844;
export type Brand = 'A' | 'B';

/** Escala para que el marco de 390×844 llene el celular (hasta 1,15×) o quepa en pantallas bajas. */
export function useFrameScale(maxScale = 1.15): number {
  const calc = () => (typeof window === 'undefined' ? 1 : Math.min(maxScale, window.innerWidth / FRAME_W, window.innerHeight / FRAME_H));
  const [k, setK] = useState(calc);
  useEffect(() => {
    const on = () => setK(calc());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return k;
}

/**
 * Marco del producto. TODAS las coordenadas de clic se miden relativas a #kinoo-frame (en % de 390×844),
 * así los mapas de calor son comparables entre dispositivos.
 */
export function Frame({ brand = 'A', scale, id = 'kinoo-frame', children, radius = 0 }: { brand?: Brand; scale?: number; id?: string; children: React.ReactNode; radius?: number }) {
  const auto = useFrameScale();
  const k = scale ?? auto;
  return (
    <div style={{ width: FRAME_W * k, height: FRAME_H * k, position: 'relative', flex: 'none' }}>
      <div id={id} className="kn-frame-root" data-brand={brand === 'B' ? 'kino' : 'kinoo'} data-version={brand}
        style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${k})`, transformOrigin: 'top left', position: 'absolute', left: 0, top: 0, overflow: 'hidden', background: 'var(--surface)', color: 'var(--ink)', borderRadius: radius, fontFamily: 'var(--font-sans)' }}>
        {children}
      </div>
    </div>
  );
}
