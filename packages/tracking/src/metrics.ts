// Fórmulas del protocolo v1.3. Las usan el Panel y los tests; son las mismas del Registro_Pruebas_Usabilidad_Kinoo_v1.3.xlsx.
import type { ResultadoClic } from './schema';

export interface Rect { x1: number; y1: number; x2: number; y2: number }
export interface Zonas { correcta?: Rect | null; aceptable?: Rect | null }

export const mediana = (v: number[]): number | null => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const promedio = (v: number[]): number | null => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
export const pct = (n: number, d: number): number | null => (d ? (n / d) * 100 : null);

const dentro = (x: number, y: number, r?: Rect | null) => !!r && x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;

/** Agranda la zona hasta un mínimo (protocolo: área de toque ≥ 44×44 pt). Medidas en % del marco. */
export function expandirZona(r: Rect, minAnchoPct: number, minAltoPct: number): Rect {
  const w = r.x2 - r.x1, h = r.y2 - r.y1;
  let { x1, y1, x2, y2 } = r;
  if (w < minAnchoPct) { const d = (minAnchoPct - w) / 2; x1 -= d; x2 += d; }
  if (h < minAltoPct) { const d = (minAltoPct - h) / 2; y1 -= d; y2 += d; }
  return { x1: Math.max(0, x1), y1: Math.max(0, y1), x2: Math.min(100, x2), y2: Math.min(100, y2) };
}

export function clasificarClic(x: number, y: number, z: Zonas): ResultadoClic {
  if (!z.correcta && !z.aceptable) return 'Sin zona definida';
  if (dentro(x, y, z.correcta)) return 'Correcto';
  if (dentro(x, y, z.aceptable)) return 'Aceptable';
  return 'Miss click';
}
export const puntaje = (r: ResultadoClic): number => (r === 'Correcto' ? 1 : r === 'Aceptable' ? 0.5 : 0);

/** Celda de cuadrícula 10×20 (A–J, 1–20) → centro de la celda en %. Anexo F. */
export function celdaAXY(celda: string): { x: number; y: number } | null {
  const m = /^([A-J])(\d{1,2})$/i.exec(celda.trim());
  if (!m) return null;
  const col = m[1].toUpperCase().charCodeAt(0) - 65;
  const fila = parseInt(m[2], 10);
  if (fila < 1 || fila > 20) return null;
  return { x: col * 10 + 5, y: (fila - 1) * 5 + 2.5 };
}

/** Mapa de calor 10×20: devuelve matriz [fila][col] con conteos. */
export function mapaCalor(puntos: { x: number; y: number }[]): number[][] {
  const g = Array.from({ length: 20 }, () => Array<number>(10).fill(0));
  for (const p of puntos) {
    const c = Math.min(9, Math.max(0, Math.floor(p.x / 10)));
    const f = Math.min(19, Math.max(0, Math.floor(p.y / 5)));
    g[f][c]++;
  }
  return g;
}

// ---------- UEQ ----------
/** +1: la palabra positiva está a la derecha; −1: a la izquierda. Orden de los 26 pares del Anexo G. */
export const UEQ_POLARIDAD: number[] = [1, 1, -1, -1, -1, 1, 1, 1, -1, -1, 1, -1, 1, 1, 1, 1, -1, -1, -1, 1, -1, 1, -1, -1, -1, 1];
export const UEQ_ESCALAS: Record<string, number[]> = {
  Atractivo: [1, 12, 14, 16, 24, 25],
  Claridad: [2, 4, 13, 21],
  Eficiencia: [9, 20, 22, 23],
  Confiabilidad: [8, 11, 17, 19],
  Estimulación: [5, 6, 7, 18],
  Novedad: [3, 10, 15, 26],
};
export const UEQ_S_PRAGMATICA = [11, 13, 20, 21];
export const UEQ_S_HEDONICA = [6, 7, 10, 15];
export const UEQ_S_ITEMS = [6, 7, 10, 11, 13, 15, 20, 21];

/** respuesta 1–7 (de izquierda a derecha) → −3…+3. */
export function ueqTransformar(item: number, respuesta: number): number {
  const p = UEQ_POLARIDAD[item - 1];
  return p === 1 ? respuesta - 4 : 4 - respuesta;
}
const promTrans = (resp: Record<number, number>, items: number[]): number | null => {
  const vals: number[] = [];
  for (const i of items) {
    if (resp[i] == null) return null; // una escala solo se calcula si respondió todos sus pares
    vals.push(ueqTransformar(i, resp[i]));
  }
  return promedio(vals);
};
export function ueqEscalas(resp: Record<number, number>): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const [k, items] of Object.entries(UEQ_ESCALAS)) out[k] = promTrans(resp, items);
  return out;
}
export function ueqS(resp: Record<number, number>): { pragmatica: number | null; hedonica: number | null; general: number | null } {
  const pragmatica = promTrans(resp, UEQ_S_PRAGMATICA);
  const hedonica = promTrans(resp, UEQ_S_HEDONICA);
  const general = pragmatica != null && hedonica != null ? (pragmatica + hedonica) / 2 : null;
  return { pragmatica, hedonica, general };
}

// ---------- Semáforo ----------
export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'sin-datos';
/** Mayor es mejor: ≥ verde → verde; ≥ amarillo → amarillo; si no rojo. */
export function semaforo(valor: number | null, verde: number, amarillo: number): Semaforo {
  if (valor == null) return 'sin-datos';
  return valor >= verde ? 'verde' : valor >= amarillo ? 'amarillo' : 'rojo';
}
/** Menor es mejor (miss clicks, tiempo). */
export function semaforoInverso(valor: number | null, verde: number, amarillo: number): Semaforo {
  if (valor == null) return 'sin-datos';
  return valor <= verde ? 'verde' : valor <= amarillo ? 'amarillo' : 'rojo';
}
export const semaforoPrimerClic = (p: number | null) => semaforo(p, 80, 60);
export const semaforoMiss = (p: number | null) => semaforoInverso(p, 20, 35);
export const semaforoSEQ = (m: number | null) => semaforo(m, 5.5, 4.5);
export const semaforoUEQ = (m: number | null) => semaforo(m, 0.8, -0.8);

// ---------- Binomial bilateral (prueba A/B, α = 0,05) ----------
function logChoose(n: number, k: number): number {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}
/** p-valor bilateral de observar `a` votos para A entre `n` decisivos con H0: p = 0,5. */
export function binomialBilateral(a: number, n: number): number {
  if (n === 0) return 1;
  const pmf = (k: number) => Math.exp(logChoose(n, k) - n * Math.LN2);
  const obs = pmf(a);
  let p = 0;
  for (let k = 0; k <= n; k++) if (pmf(k) <= obs + 1e-12) p += pmf(k);
  return Math.min(1, p);
}
/** Votos mínimos que debe tener una misma versión para ganar con n decisivos (tabla del §4.5). */
export function votosMinimosGanador(n: number): number {
  for (let k = Math.ceil(n / 2); k <= n; k++) if (binomialBilateral(k, n) < 0.05) return k;
  return n + 1; // imposible
}
export function veredictoAB(votosA: number, votosB: number): { ganador: 'A' | 'B' | null; p: number; n: number; minimo: number } {
  const n = votosA + votosB;
  const p = binomialBilateral(votosA, n);
  const minimo = votosMinimosGanador(n);
  const ganador = p < 0.05 ? (votosA > votosB ? 'A' : 'B') : null;
  return { ganador, p, n, minimo };
}

// ---------- Flujos (misiones) ----------
export type ResultadoMision = 'Éxito directo' | 'Éxito indirecto' | 'Abandono' | 'Fallo por tiempo' | 'Error de flujo';

/** Ruta realizada vs esperada: directo si la esperada aparece como subsecuencia contigua sin pantallas ajenas (se permiten repeticiones). */
export function clasificarMision(opts: { exito: boolean; abandono: boolean; tiempoAgotado: boolean; error: boolean; ruta: string[]; rutaEsperada: string[] }): ResultadoMision {
  if (opts.error) return 'Error de flujo';
  if (opts.abandono) return 'Abandono';
  if (!opts.exito) return opts.tiempoAgotado ? 'Fallo por tiempo' : 'Abandono';
  const dedup = opts.ruta.filter((p, i) => i === 0 || p !== opts.ruta[i - 1]);
  const permitidas = new Set(opts.rutaEsperada);
  const sinDesvios = dedup.every((p) => permitidas.has(p));
  let k = 0;
  for (const p of dedup) if (p === opts.rutaEsperada[k]) k++;
  return sinDesvios && k >= opts.rutaEsperada.length ? 'Éxito directo' : 'Éxito indirecto';
}

/** Pantallas visitadas fuera de la ruta esperada. */
export const desvios = (ruta: string[], esperada: string[]): string[] => {
  const ok = new Set(esperada);
  return [...new Set(ruta.filter((p) => !ok.has(p)))];
};

// ---------- Intervalo de confianza (Wilson 95 %) ----------
export function wilson(aciertos: number, n: number): [number, number] | null {
  if (!n) return null;
  const z = 1.96, p = aciertos / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const m = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - m) * 100, Math.min(1, c + m) * 100];
}
