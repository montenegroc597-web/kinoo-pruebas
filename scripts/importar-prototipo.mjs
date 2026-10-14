// Importa un prototipo de lienzo (.dc.html) para usarlo dentro de la prueba, tal cual, en un iframe.
//   node scripts/importar-prototipo.mjs <id> <archivo.dc.html | carpeta> [--paginas <prefijo>] [--blobs <carpeta>] [--nombre "Nombre"]
// Ejemplos:
//   node scripts/importar-prototipo.mjs kino ../_artefacto_B/project/H_Prototipo.dc.html --nombre "Kino · mazos"
//   node scripts/importar-prototipo.mjs kinoo-flujo <carpeta project del lienzo> --paginas Flujo --blobs <carpeta con las imágenes>
// Hace:
//   1) copia cada página a packages/kinoo-ui/public/<id>/ SIN tocar su lógica, salvo 2 líneas: su runtime (support.js) →
//      ../_prototipos/dc-runtime.js y ../_prototipos/embed.js antes de </body>. Los enlaces entre páginas siguen funcionando;
//   2) las imágenes del lienzo (/_blob/<id>) pasan a public/<id>/_blob/<id>.<ext> (se toman de --blobs; las que falten se listan);
//   3) lista los atajos del panel del prototipo y crea prototipo.json si no existe.
// Después: añadir el prototipo en packages/kinoo-ui/src/Prototipo.tsx (PROTOTIPOS). Ver el skill kinoo-protocolo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcion = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const [id, origen] = args;
if (!id || !origen || !/^[a-z0-9-]+$/.test(id)) {
  console.error('Uso: node scripts/importar-prototipo.mjs <id-en-minúsculas> <archivo.dc.html | carpeta> [--paginas <prefijo>] [--blobs <carpeta>] [--nombre "Nombre"]');
  process.exit(1);
}
const esCarpeta = fs.statSync(origen).isDirectory();
const paginas = esCarpeta
  ? fs.readdirSync(origen).filter((f) => f.endsWith('.dc.html') && f.startsWith(opcion('paginas') ?? '')).map((f) => path.join(origen, f))
  : [origen];
if (!paginas.length) { console.error('No hay páginas .dc.html que importar.'); process.exit(1); }

const dir = path.join(root, 'packages/kinoo-ui/public', id);
fs.mkdirSync(dir, { recursive: true });
const RUNTIME = '<script src="../_prototipos/dc-runtime.js"></script>';
const EMBED = '<script src="../_prototipos/embed.js"></script>';
const fuenteBlobs = opcion('blobs');
const disponibles = fuenteBlobs ? fs.readdirSync(fuenteBlobs) : [];
// con extensión: un .svg sin extensión no se muestra en <img> (el servidor no sabe que es image/svg+xml)
const archivoBlob = (b) => disponibles.find((x) => x.startsWith(b + '.')) ?? b;
const blobs = new Set();
let todo = '';
for (const p of paginas) {
  const html = fs.readFileSync(p, 'utf8');
  todo += html;
  let out = html.replace(/<script\s+src="[^"]*(support|dc-runtime)\.js"\s*><\/script>/, RUNTIME);
  if (!out.includes(RUNTIME)) { console.error(`${path.basename(p)}: no encontré su <script src="…support.js">`); process.exit(1); }
  if (!out.includes(EMBED)) out = out.replace(/<\/body>(?![\s\S]*<\/body>)/, EMBED + '\n</body>');
  out = out.replace(/\/_blob\/([0-9a-f]{32})/g, (_, b) => { blobs.add(b); return `_blob/${archivoBlob(b)}`; });
  // un solo archivo se publica como index.html; varias páginas conservan su nombre (se enlazan entre sí)
  fs.writeFileSync(path.join(dir, esCarpeta ? path.basename(p) : 'index.html'), out);
}

if (blobs.size) {
  const destino = path.join(dir, '_blob');
  fs.mkdirSync(destino, { recursive: true });
  const faltan = [];
  for (const b of blobs) {
    const f = archivoBlob(b);
    if (f !== b) fs.copyFileSync(path.join(fuenteBlobs, f), path.join(destino, f)); else faltan.push(b);
  }
  console.log(`${blobs.size - faltan.length} de ${blobs.size} imágenes copiadas a public/${id}/_blob/`);
  if (faltan.length) console.warn('Faltan (bájalas del lienzo y vuelve a correr con --blobs):', faltan.join(' '));
}

// atajos del panel: pares ['clave', 'ETIQUETA EN MAYÚSCULAS'] en el código del lienzo
const atajos = [...new Set([...todo.matchAll(/\[\s*'[\w-]+'\s*,\s*'([^']{2,40})'\s*\]/g)].map((m) => m[1]))]
  .filter((t) => /^[A-ZÁÉÍÓÚÜÑ¿?¡! ·–\-0-9]+$/.test(t) && /[A-Z]{3}/.test(t));
if (atajos.length) console.log(`\nAtajos del panel del prototipo:\n  ${atajos.join(' · ')}`);

const manifiesto = path.join(dir, 'prototipo.json');
if (!fs.existsSync(manifiesto)) {
  const base = { id, nombre: opcion('nombre') ?? id, origen: esCarpeta ? path.basename(path.resolve(origen)) : path.basename(origen), pantallas: {} };
  fs.writeFileSync(manifiesto, JSON.stringify(base, null, 2) + '\n');
  console.log(`\nCreado ${path.relative(root, manifiesto)}: define cada pantalla de la prueba (página, atajo o acciones). Ver el skill kinoo-protocolo.`);
} else console.log(`\n${path.relative(root, manifiesto)} ya existía: no se tocó.`);
console.log(`\nListo: ${paginas.length} página(s) en packages/kinoo-ui/public/${id}/`);
