// Aleatorización del protocolo v2.0 (§0 «Módulos y orden»): solo se aleatoriza el orden de los moods en M3c, el de las películas
// en M3d, las opciones de cada pantalla de M3c y cuáles 3 moods se preguntan en M3a y M3b. Es determinista por participante
// (misma semilla → mismo orden), así una sesión retomada ve lo mismo y los tests son reproducibles.

/** Barajado determinista (mulberry32) por semilla. */
export function barajar<T>(lista: T[], semilla: number): T[] {
  const a = [...lista];
  let s = semilla >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** `n` elementos al azar (sin repetir) de la lista. */
export const elegir = <T,>(lista: T[], n: number, semilla: number): T[] => barajar(lista, semilla).slice(0, n);

/** Semilla numérica estable a partir del id de sesión. */
export function semillaDe(texto: string): number {
  let h = 2166136261;
  for (const ch of texto) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
