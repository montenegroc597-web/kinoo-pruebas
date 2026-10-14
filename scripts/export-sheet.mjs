// Baja todas las hojas del registro (Supabase) y las guarda ANONIMIZADAS en data/ (CSV por hoja + un .xlsx).
//   APPS_SCRIPT_URL=… READ_KEY=… node scripts/export-sheet.mjs [--dir data]
// APPS_SCRIPT_URL es el nombre histórico del secreto: hoy guarda la URL de la Edge Function (…/functions/v1/kinoo).
// Lo ejecuta el workflow export-data.yml cada noche (y a mano). Sin secretos no hace nada y avisa.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { anonimizar } from './anonimizar.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.APPS_SCRIPT_URL, key = process.env.READ_KEY;
const dirArg = process.argv.indexOf('--dir');
const dir = path.resolve(root, dirArg > 0 ? process.argv[dirArg + 1] : 'data');

if (!url || !key) { console.error('Faltan APPS_SCRIPT_URL y READ_KEY (secretos del repositorio). No se exportó nada.'); process.exit(0); }

const llamar = async (action, cuerpo = {}) => {
  const j = await (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, key, ...cuerpo }) })).json();
  if (!j.ok) { console.error('El backend respondió:', j.error); process.exit(1); }
  return j.data;
};
// «Eventos» se baja por páginas: con 100 participantes son decenas de miles de filas y no caben en una sola respuesta
const datos = await llamar('dump', { excluir: ['Eventos'] });
const eventos = { headers: [], rows: [] };
for (let desde = 0; ;) {
  const p = await llamar('eventos', { desde, limite: 5000 });
  eventos.headers = p.headers;
  eventos.rows.push(...p.rows);
  if (!p.ultimoId || p.rows.length < 5000) break;
  desde = p.ultimoId;
}
datos.Eventos = eventos;

const dump = anonimizar(datos);
fs.mkdirSync(dir, { recursive: true });
const csvCelda = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const wb = XLSX.utils.book_new();
const resumen = {};
for (const [hoja, h] of Object.entries(dump)) {
  const nombre = hoja.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  fs.writeFileSync(path.join(dir, nombre + '.csv'), [h.headers, ...h.rows].map((r) => r.map(csvCelda).join(',')).join('\n') + '\n');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h.headers, ...h.rows]), hoja.slice(0, 31));
  resumen[hoja] = h.rows.length;
}
const fecha = new Date().toISOString().slice(0, 10);
XLSX.writeFile(wb, path.join(dir, `Registro_en_vivo_${fecha}.xlsx`));
fs.writeFileSync(path.join(dir, 'resumen.json'), JSON.stringify({ exportado: new Date().toISOString(), filas: resumen }, null, 2) + '\n');
console.log('Exportado a', dir, resumen);
