/** Encabezado «Parte n de total · nombre» que recibe cada módulo. */
export interface Parte { n: number; total: number; nombre: string }

/** Escala 1–7: los extremos salen del propio texto («… 1 = ninguna, 7 = muchas.»), así cambian si el equipo edita la redacción. */
export function extremosDe(texto: string): [string, string] | undefined {
  const m = /1 = ([^,]+),\s*7 = ([^.]+)/.exec(texto);
  return m ? [m[1].trim(), m[2].trim()] : undefined;
}
