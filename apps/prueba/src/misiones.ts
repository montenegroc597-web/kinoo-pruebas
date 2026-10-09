// Éxito de cada misión = la persona LLEGÓ a la pantalla objetivo (ella navega desde la pantalla inicial; la app no la guía).
import type { MisionCat } from '@kinoo/tracking';

export type Item = { k: 'a' | 's'; name: string; extra?: Record<string, unknown> };

const has = (tr: Item[], name: string, pred?: (e: Record<string, unknown>) => boolean) => tr.some((t) => t.k === 'a' && t.name === name && (!pred || pred(t.extra ?? {})));
/** ¿Pasó por la pantalla `id` (o por uno de sus subestados «id.xxx»)? Con `despuesDe`, solo cuenta lo que ocurrió después de ese evento. */
export const vio = (tr: Item[], id: string, despuesDe?: (t: Item) => boolean): boolean => {
  let ok = !despuesDe;
  for (const t of tr) { if (despuesDe && despuesDe(t)) ok = true; if (ok && t.k === 's' && (t.name === id || t.name.startsWith(id + '.'))) return true; }
  return false;
};
/** Igual pero exacto: «S03» no cuenta «S03.back». */
export const vioExacto = (tr: Item[], id: string): boolean => tr.some((t) => t.k === 's' && t.name === id);
const marcas = (tr: Item[]) => tr.filter((t) => t.k === 'a' && /^mark\.(ring|dot|both|x)$/.test(t.name)).length;

/** Pantalla objetivo de cada misión. */
export const EXITO: Record<string, (tr: Item[]) => boolean> = {
  D1: (tr) => has(tr, 'mood.continue') && vio(tr, 'S05'),                                                         // objetivo: S05 (tus mazos)
  M1: (tr) => has(tr, 'deck.dealt', (e) => e.deck === 'nolan') && vio(tr, 'S02', (t) => t.k === 'a' && t.name === 'deck.dealt'), // objetivo: S02 con el mazo Nolan
  D2: (tr) => vioExacto(tr, 'S02.fin'),                                                                           // objetivo: «Mazo terminado»
  M2: (tr) => has(tr, 'deck.dealt', (e) => e.desde === 'recarga'),                                                // objetivo: un mazo nuevo repartido
  V1: (tr) => has(tr, 'platform.opened'),                                                                         // objetivo: S04.away
  V2: (tr) => has(tr, 'platform.opened') && vioExacto(tr, 'S03'),                                                 // objetivo: S03 (calificar)
  V3: (tr) => has(tr, 'space.removed:faro'),                                                                      // objetivo: El Faro Mudo fuera de Mi espacio
};

/** ¿Qué pasos del embudo se alcanzaron? (para el embudo del Panel) */
export function pasosAlcanzados(m: MisionCat, tr: Item[]): boolean[] {
  return m.pasos.map((p) => {
    if (p.id.startsWith('screen=')) return vioExacto(tr, p.id.slice(7));
    if (p.id.startsWith('screen:')) return vio(tr, p.id.slice(7));
    if (p.id.startsWith('nav:')) return has(tr, 'nav.mi-espacio') || vio(tr, 'S08');
    if (p.id === 'ver.watch') return has(tr, 'ver.watch') || has(tr, 'ver.swipe-verla');
    if (p.id === 'mark') return marcas(tr) >= 1;
    if (p.id === 'marks3') return marcas(tr) >= 3;
    if (p.id.startsWith('deck.dealt:')) return has(tr, 'deck.dealt', (e) => e.deck === p.id.split(':')[1]);
    if (p.id === 'repeat.on') return has(tr, 'repeat.on') || has(tr, 'reaction.saved', (e) => e.repeat === true);
    return has(tr, p.id);
  });
}
