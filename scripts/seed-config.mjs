// Llena las hojas Config, Pantallas y Contraste del Sheet con el catálogo del protocolo (tareas, umbrales, pantallas S01–S08, contraste A/B).
//   APPS_SCRIPT_URL=… READ_KEY=… node scripts/seed-config.mjs      (correr una vez, o cada vez que cambie el catálogo)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = fs.readFileSync(path.join(root, 'packages/tracking/src/catalog.ts'), 'utf8');
const tmp = path.join(root, 'node_modules', '.cache-catalog.mjs');
fs.writeFileSync(tmp, transformSync(ts, { loader: 'ts', format: 'esm' }).code);
const { TAREAS, PANTALLAS, UMBRALES, MOTIVOS_5S, MOTIVOS_CLIC, MOTIVOS_CARDS } = await import(pathToFileURL(tmp).href);

export function construirConfig() {
  const config = [
    ['Tarea', 'Escenario (texto que se lee)', 'Pantalla', 'Zona correcta', 'Zona aceptable alternativa'],
    ...TAREAS.map((t) => [t.id, t.escenario, t.pantalla, t.descripcionZona, t.id === 'T2' ? 'Cuerpo de la carta (voltear)' : t.id === 'T4' ? '' : t.id === 'T5' ? 'Arrastre a la izquierda sobre la carta' : '']),
    [],
    ['Umbrales (criterios de éxito)'],
    ['Primer clic correcto · verde ≥', UMBRALES.primerClicVerde / 100], ['Primer clic correcto · amarillo ≥', UMBRALES.primerClicAmarillo / 100],
    ['SEQ · verde ≥', UMBRALES.seqVerde], ['SEQ · amarillo ≥', UMBRALES.seqAmarillo],
    ['Miss clicks · verde ≤', UMBRALES.missVerde / 100], ['Miss clicks · amarillo ≤', UMBRALES.missAmarillo / 100],
    ['UEQ · verde >', UMBRALES.ueqVerde], ['UEQ · rojo <', UMBRALES.ueqAmarillo],
    [],
    ['Motivos · 5 segundos', ...MOTIVOS_5S], ['Motivos · Primer clic / SEQ', ...MOTIVOS_CLIC], ['Motivos · Cards', ...MOTIVOS_CARDS],
  ];
  const pantallas = [
    ['Catálogo de pantallas. Cada punto registrado en «Puntos» se refiere a una de estas pantallas.'],
    ['ID', 'Pantalla', 'Flujo', 'Pruebas donde se usa', 'Imagen / enlace (versión única o A)', 'Imagen / enlace (versión B)', 'Ancho (px)', 'Alto (px)', 'Notas'],
    ...PANTALLAS.map((p) => [p.id, p.nombre, p.flujo, p.pruebas, '', '', 390, 844, 'Marco 390×844; coordenadas en % del marco']),
  ];
  let contraste = [];
  const csv = path.join(root, 'data/contraste.csv');
  if (fs.existsSync(csv)) contraste = fs.readFileSync(csv, 'utf8').trim().split('\n').map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
  return { config, pantallas, contraste };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const url = process.env.APPS_SCRIPT_URL, key = process.env.READ_KEY;
  if (!url || !key) { console.error('Faltan APPS_SCRIPT_URL y READ_KEY.'); process.exit(1); }
  const { config, pantallas, contraste } = construirConfig();
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'seed-config', key, config, pantallas, contraste }) });
  console.log(await r.text());
}
