// Fórmulas del protocolo v2.0. Las usan el Panel y los tests; son las mismas del Registro_Pruebas_No_Moderadas_Kinoo_v2.0.xlsx.
import { UMBRALES as U } from './catalog';

export interface Rect { x1: number; y1: number; x2: number; y2: number }

export const mediana = (v: number[]): number | null => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const promedio = (v: number[]): number | null => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
export const pct = (n: number, d: number): number | null => (d ? (n / d) * 100 : null);

// ---------- Toques y gestos sobre el prototipo ----------
const dentro = (x: number, y: number, r?: Rect | null) => !!r && x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;

/** Agranda la zona hasta un mínimo (área de toque ≥ 44×44 pt). Medidas en % del marco. */
export function expandirZona(r: Rect, minAnchoPct: number, minAltoPct: number): Rect {
  const w = r.x2 - r.x1, h = r.y2 - r.y1;
  let { x1, y1, x2, y2 } = r;
  if (w < minAnchoPct) { const d = (minAnchoPct - w) / 2; x1 -= d; x2 += d; }
  if (h < minAltoPct) { const d = (minAltoPct - h) / 2; y1 -= d; y2 += d; }
  return { x1: Math.max(0, x1), y1: Math.max(0, y1), x2: Math.min(100, x2), y2: Math.min(100, y2) };
}

/** Primer clic (Z3): 1 dentro de la zona correcta, 0,5 en la aceptable, 0 fuera. */
export function puntajeClic(x: number, y: number, correcta: Rect | null, aceptable?: Rect | null): number | null {
  if (!correcta) return null;
  return dentro(x, y, correcta) ? 1 : dentro(x, y, aceptable) ? 0.5 : 0;
}

/**
 * Gesto de D2 / D3 («Config», sección B): 1 si es el gesto correcto (p. ej. deslizar a la derecha), 0,5 si es una alternativa
 * aceptada (p. ej. tocar «Quiero verla»), 0 si no. `gesto` = 'drag:derecha' | 'tap:<texto del botón>' | …
 */
export function puntajeGesto(gesto: string, clave: { correcto: string; aceptables: string[] }): number {
  const [tipo, valor = ''] = gesto.split(':');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (tipo === 'drag' && norm(valor) === norm(clave.correcto)) return 1;
  if (clave.aceptables.some((a) => norm(a) === norm(valor) || norm(a) === norm(gesto))) return 0.5;
  return 0;
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

// ---------- UEQ-S (Anexo C) ----------
/** +1: la palabra positiva está a la derecha; −1: a la izquierda. Orden de los 26 pares del UEQ. */
export const UEQ_POLARIDAD: number[] = [1, 1, -1, -1, -1, 1, 1, 1, -1, -1, 1, -1, 1, 1, 1, 1, -1, -1, -1, 1, -1, 1, -1, -1, -1, 1];
export const UEQ_S_PRAGMATICA = [11, 13, 20, 21];
export const UEQ_S_HEDONICA = [6, 7, 10, 15];
export const UEQ_S_ITEMS = [6, 7, 10, 11, 13, 15, 20, 21];

/** respuesta 1–7 (de izquierda a derecha) → −3…+3, invirtiendo los ítems con el polo positivo a la izquierda. */
export function ueqTransformar(item: number, respuesta: number): number {
  return UEQ_POLARIDAD[item - 1] === 1 ? respuesta - 4 : 4 - respuesta;
}
const promTrans = (resp: Record<number, number>, items: number[]): number | null => {
  const vals: number[] = [];
  for (const i of items) {
    if (resp[i] == null) return null; // una escala solo se calcula si respondió todos sus pares
    vals.push(ueqTransformar(i, resp[i]));
  }
  return promedio(vals);
};
export function ueqS(resp: Record<number, number>): { pragmatica: number | null; hedonica: number | null; general: number | null } {
  const pragmatica = promTrans(resp, UEQ_S_PRAGMATICA);
  const hedonica = promTrans(resp, UEQ_S_HEDONICA);
  return { pragmatica, hedonica, general: pragmatica != null && hedonica != null ? (pragmatica + hedonica) / 2 : null };
}

// ---------- Semáforo ----------
export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'sin-datos';
/** Mayor es mejor: ≥ verde → verde; ≥ amarillo → amarillo; si no rojo. */
export function semaforo(valor: number | null, verde: number, amarillo: number): Semaforo {
  if (valor == null) return 'sin-datos';
  return valor >= verde ? 'verde' : valor >= amarillo ? 'amarillo' : 'rojo';
}
export const semaforoUEQ = (m: number | null): Semaforo => (m == null ? 'sin-datos' : m > U.ueq ? 'verde' : m > U.ueqAmarillo ? 'amarillo' : 'rojo');

// ---------- Comparación A/B (§6) ----------
function logFact(n: number): number { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; }
/** Prueba exacta de Fisher bilateral para una tabla 2×2: a de nA en A frente a b de nB en B. */
export function fisherExacta(a: number, nA: number, b: number, nB: number): number {
  const n = nA + nB, k = a + b;
  if (!nA || !nB) return 1;
  const lc = (x: number, y: number) => logFact(x) - logFact(y) - logFact(x - y);
  const p = (x: number) => Math.exp(lc(nA, x) + lc(nB, k - x) - lc(n, k));
  const obs = p(a);
  let total = 0;
  for (let x = Math.max(0, k - nB); x <= Math.min(k, nA); x++) { const px = p(x); if (px <= obs * (1 + 1e-7)) total += px; }
  return Math.min(1, total);
}

/** Función beta incompleta regularizada (fracción continua de Lentz), para la distribución t. */
function betaInc(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a + b) - lgamma(a) - lgamma(b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b + lbeta);
  if (x > (a + 1) / (a + b + 2)) return 1 - betaInc(1 - x, b, a);
  let f = 1, c = 1, d = 0;
  for (let i = 0; i <= 300; i++) {
    const m = Math.floor(i / 2); // división ENTERA: en los términos impares m = (i − 1) / 2
    let num: number;
    if (i === 0) num = 1;
    else if (i % 2 === 0) num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    else num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d; d = Math.abs(d) < 1e-30 ? 1e-30 : d; d = 1 / d;
    c = 1 + num / c; c = Math.abs(c) < 1e-30 ? 1e-30 : c;
    const cd = c * d; f *= cd;
    if (Math.abs(1 - cd) < 1e-10) break;
  }
  return (front * (f - 1)) / a;
}
function lgamma(z: number): number {
  const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < 8; i++) x += g[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Prueba t de Welch bilateral (escalas 1–7, tiempos, UEQ-S). Devuelve el p-valor; null con menos de 2 datos por grupo. */
export function welch(x: number[], y: number[]): number | null {
  if (x.length < 2 || y.length < 2) return null;
  const m = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const s2 = (v: number[], mv: number) => v.reduce((a, b) => a + (b - mv) ** 2, 0) / (v.length - 1);
  const mx = m(x), my = m(y), vx = s2(x, mx) / x.length, vy = s2(y, my) / y.length;
  if (vx + vy === 0) return mx === my ? 1 : 0;
  const t = (mx - my) / Math.sqrt(vx + vy);
  const df = (vx + vy) ** 2 / (vx ** 2 / (x.length - 1) + vy ** 2 / (y.length - 1));
  return Math.min(1, betaInc(df / (df + t * t), df / 2, 0.5));
}

export type Veredicto = 'Diferencia clara' | 'Tendencia' | 'Sin diferencia' | 'Sin datos';
/**
 * Veredicto de tres niveles (§6): «Diferencia clara» si p < α; «Tendencia» si la diferencia supera el mínimo relevante sin ser
 * significativa; si no, «Sin diferencia». `pequeno` marca n < mínimo por card.
 */
export function veredicto(p: number | null, diferencia: number | null, minimoRelevante: number, nA: number, nB: number): { veredicto: Veredicto; pequeno: boolean } {
  const pequeno = nA < U.minimoTendencia || nB < U.minimoTendencia;
  if (p == null || diferencia == null) return { veredicto: 'Sin datos', pequeno };
  if (p < U.alfa) return { veredicto: 'Diferencia clara', pequeno };
  return { veredicto: Math.abs(diferencia) >= minimoRelevante ? 'Tendencia' : 'Sin diferencia', pequeno };
}

// ---------- Intervalo de confianza (Wilson 95 %) ----------
export function wilson(aciertos: number, n: number): [number, number] | null {
  if (!n) return null;
  const z = 1.96, p = aciertos / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const m = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - m) * 100, Math.min(1, c + m) * 100];
}
