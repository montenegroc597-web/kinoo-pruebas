import React from 'react';
import { Frame } from './Frame';

/**
 * Versión B de la prueba de marca = el prototipo REAL «Kino · mazos» (página H del lienzo
 * https://claude.ai/artifact/9MgLeWVWxCr9RXWFpCXwZW), no un tema de las pantallas A.
 *
 * Los archivos viven en `packages/kinoo-ui/public/kino/` (publicDir de las dos apps):
 * - `index.html`   = `_artefacto_B/project/H_Prototipo.dc.html` sin cambios, salvo `support.js` → `dc-runtime.js` y la línea de `embed.js`.
 * - `dc-runtime.js`= el runtime oficial de los lienzos de diseño (React incluido).
 * - `embed.js`     = con `?pantalla=S0x` abre esa pantalla con los atajos del propio prototipo y deja SOLO el teléfono (390×844) arriba a la izquierda.
 * Sin `?pantalla` (`<base>/kino/index.html`) se ve el prototipo completo, con su panel de pantallas.
 */
export function kinoUrl(pantalla?: string): string {
  let base = './';
  try { base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './'; } catch { /* sin Vite */ }
  return base + 'kino/index.html' + (pantalla ? '?pantalla=' + encodeURIComponent(pantalla) : '');
}

/** Descarga por adelantado el prototipo (≈ 690 KB) para que la versión B aparezca enseguida en la prueba de marca. Idempotente. */
export function precargarKino(): void {
  if (typeof document === 'undefined' || document.getElementById('kino-precarga')) return;
  const base = kinoUrl().replace(/index\.html$/, '');
  [['index.html', 'document'], ['dc-runtime.js', 'script']].forEach(([f, as], i) => {
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = base + f; l.setAttribute('as', as);
    if (i === 0) l.id = 'kino-precarga';
    document.head.appendChild(l);
  });
}

/**
 * Elemento de jerarquía prevista de cada pantalla B, en px del marco 390×844 (medido en el prototipo):
 * S02 la frase gancho de la carta, S04 la carta de la propuesta, S05 el título «Elige tu mazo».
 * Equivale al `data-hierarchy="primary"` de A; Marca.tsx lo mide igual en las dos versiones.
 */
export const KINO_PRIMARIO: Record<string, [number, number, number, number]> = {
  S02: [42, 167, 298, 276],
  S04: [24, 291, 366, 708],
  S05: [24, 231, 366, 260],
};

/** Una pantalla del prototipo Kino dentro del mismo marco que A (#kinoo-frame, 390×844), así las coordenadas de toque son comparables. */
export function KinoPantalla({ pantalla, escala, id = 'kinoo-frame', radius = 14, interactiva = false }: { pantalla: string; escala?: number; id?: string; radius?: number; interactiva?: boolean }) {
  const r = KINO_PRIMARIO[pantalla];
  return (
    <Frame brand="B" scale={escala} id={id} radius={radius}>
      <iframe
        title={'Kino · ' + pantalla}
        src={kinoUrl(pantalla)}
        tabIndex={interactiva ? 0 : -1}
        style={{ position: 'absolute', left: 0, top: 0, width: 1180, height: 1060, border: 0, background: '#111010', pointerEvents: interactiva ? 'auto' : 'none' }}
      />
      {r ? <div data-hierarchy="primary" aria-hidden="true" style={{ position: 'absolute', left: r[0], top: r[1], width: r[2] - r[0], height: r[3] - r[1], pointerEvents: 'none' }} /> : null}
    </Frame>
  );
}
