import type { Asignacion } from './schema';
import { ordenTareasPara, ordenMarcaPara, ordenFlujosPara } from './rotation';

/** Minúsculas, sin tildes, espacios colapsados. "Juán", " juan " y "JUAN" → "juan". */
export function normalizarNombre(n: string): string {
  return n
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** "maría  josé" → "María José" (conserva tildes tecleadas). */
export function formatoTitulo(n: string): string {
  return n
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w ? w.charAt(0).toLocaleUpperCase('es') + w.slice(1).toLocaleLowerCase('es') : w))
    .join(' ');
}

export interface ParticipanteExistente {
  codigo: string;
  nombreNorm: string;
  /** Forma mostrada del primero que se registró con ese nombre ("Juan"), para que "JUÁN" también salga "Juan 3". */
  nombreBase?: string;
}

/** Número que sigue en el código P01, P02… (no se reinicia entre rondas). */
export function siguienteCodigo(existentes: ParticipanteExistente[]): { codigo: string; indice: number } {
  let max = 0;
  for (const e of existentes) {
    const m = /^P(\d+)$/.exec(e.codigo);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const indice = max + 1;
  return { codigo: 'P' + String(indice).padStart(2, '0'), indice };
}

/**
 * Todos llevan número, incluido el primero: "Juan 1", "Juan 2"…
 * El conteo es sobre el nombre normalizado en TODAS las rondas.
 */
export function nombreMostradoPara(nombre: string, existentes: ParticipanteExistente[]): string {
  const norm = normalizarNombre(nombre);
  const previos = existentes.filter((e) => e.nombreNorm === norm);
  const base = previos.find((e) => e.nombreBase)?.nombreBase ?? formatoTitulo(nombre);
  return `${base} ${previos.length + 1}`;
}

export function asignar(nombre: string, existentes: ParticipanteExistente[], sesionId: string): Asignacion {
  const { codigo, indice } = siguienteCodigo(existentes);
  return {
    codigo,
    nombreMostrado: nombreMostradoPara(nombre, existentes),
    sesionId,
    ordenTareas: ordenTareasPara(indice),
    ordenMarca: ordenMarcaPara(indice),
    ordenFlujos: ordenFlujosPara(indice),
  };
}
