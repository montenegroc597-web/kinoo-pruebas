// Contraste WCAG 2.2 (nivel AA) de las combinaciones texto/fondo de las versiones A (Noche) y B (Kino).
// Protocolo §4.3: una versión que no cumple se corrige o se descarta aunque guste más. Sale con código 1 si algo falla.
//   npm run contrast            → tabla en consola + data/contraste.csv
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leerTokens = (archivo, selector) => {
  const css = fs.readFileSync(path.join(root, archivo), 'utf8');
  const i = css.indexOf(selector);
  const bloque = css.slice(i, css.indexOf('}', i));
  const t = {};
  for (const m of bloque.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) t[m[1]] = m[2];
  return t;
};
const A = leerTokens('packages/kinoo-ui/src/styles/tokens.css', ':root {');
const B = { ...A, ...leerTokens('packages/kinoo-ui/src/styles/kino.css', '[data-brand="kino"] {') };

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const razon = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [descripción, token texto, token fondo, mínimo]  (4,5 texto normal · 3 texto grande y elementos de interfaz)
const PARES = [
  ['Texto principal sobre fondo', 'ink', 'surface', 4.5],
  ['Texto principal sobre tarjeta', 'ink', 'surface-raised', 4.5],
  ['Texto secundario sobre fondo', 'ink-muted', 'surface', 4.5],
  ['Metadatos sobre fondo', 'ink-subtle', 'surface', 4.5],
  ['Texto sobre botón principal / marca', 'on-brand', 'brand', 4.5],
  ['Texto sobre acento (sol)', 'on-sun', 'sun', 4.5],
  ['Kicker / acento sobre fondo', 'sun-ink', 'surface', 3],
  ['Texto en hoja (tinta inversa)', 'ink-inverse', 'surface-inverse', 4.5],
  ['Texto atenuado en hoja', 'ink-inverse-muted', 'surface-inverse', 4.5],
  ['Anillo ○ sobre fondo (elemento de interfaz)', 'mark-ring', 'surface', 3],
  ['Borde de control sobre fondo (elemento de interfaz)', 'line-strong', 'surface', 3],
  ['Positivo sobre fondo', 'positive', 'surface', 4.5],
];
// Pares reales que usa B y que el artefacto documenta (guía J · paleta)
const PARES_B = [
  ['Crema sobre negro sala', 'sun-core', 'surface', 4.5],
  ['Crema sobre rojo butaca', 'sun-core', 'brand', 4.5],
  ['Negro sobre naranja proyector (botón principal)', 'on-sun', 'sun', 4.5],
  ['Niebla sobre negro (metadatos)', 'ink-subtle', 'surface', 4.5],
];

const filas = [];
for (const [version, T, pares] of [['A · Noche', A, PARES], ['B · Kino', B, [...PARES, ...PARES_B]]]) {
  for (const [desc, tx, fo, min] of pares) {
    const c1 = T[tx], c2 = T[fo];
    if (!c1 || !c2) continue;
    const r = razon(c1, c2);
    filas.push({ version, desc, tx: c1, fo: c2, r: Math.round(r * 100) / 100, min, ok: r >= min });
  }
}
console.log('Versión'.padEnd(10), 'Combinación'.padEnd(56), 'Razón'.padStart(7), 'Mín'.padStart(5), ' AA');
for (const f of filas) console.log(f.version.padEnd(10), f.desc.padEnd(56), String(f.r).padStart(7), String(f.min).padStart(5), f.ok ? ' ✓' : ' ✗');
const csv = ['Versión,Combinación,Color texto,Color fondo,Razón,Mínimo,Cumple AA', ...filas.map((f) => `${f.version},"${f.desc}",${f.tx},${f.fo},${f.r},${f.min},${f.ok ? 'Sí' : 'No'}`)].join('\n');
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/contraste.csv'), csv + '\n');
const fallan = filas.filter((f) => !f.ok);
console.log(fallan.length ? `\n${fallan.length} combinación(es) NO cumplen AA.` : '\nTodas las combinaciones cumplen AA.');
process.exit(fallan.length ? 1 : 0);
