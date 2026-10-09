/** Cuadrado latino del Anexo E del protocolo v1.3 (5 tareas). P01, P06, P11… comparten fila. */
export const CUADRADO_LATINO: string[][] = [
  ['T1', 'T2', 'T5', 'T3', 'T4'],
  ['T2', 'T3', 'T1', 'T4', 'T5'],
  ['T3', 'T4', 'T2', 'T5', 'T1'],
  ['T4', 'T5', 'T3', 'T1', 'T2'],
  ['T5', 'T1', 'T4', 'T2', 'T3'],
];

/** indice = 1 para P01. */
export function ordenTareasPara(indice: number): string {
  return CUADRADO_LATINO[(indice - 1) % 5].join('-');
}
export function ordenMarcaPara(indice: number): 'A→B' | 'B→A' {
  return (indice - 1) % 2 === 0 ? 'A→B' : 'B→A';
}
export function ordenFlujosPara(indice: number): 'Descubrir→Ver' | 'Ver→Descubrir' {
  return (indice - 1) % 2 === 0 ? 'Descubrir→Ver' : 'Ver→Descubrir';
}

/** Rotación circular determinista: usada para pantallas de 5 s y cards. */
export function rotar<T>(lista: T[], indice: number): T[] {
  if (!lista.length) return [];
  const k = (indice - 1) % lista.length;
  return [...lista.slice(k), ...lista.slice(0, k)];
}

/** Barajado determinista (mulberry32) por semilla: ordena la lista de palabras de M2 por participante. */
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
