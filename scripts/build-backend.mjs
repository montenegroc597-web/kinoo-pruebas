// Genera backend/Code.gs inyectando COLUMNAS y HOJAS_ESCRIBIBLES desde packages/tracking/src/schema.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function cargarSchema() {
  const ts = fs.readFileSync(path.join(root, 'packages/tracking/src/schema.ts'), 'utf8');
  const js = transformSync(ts, { loader: 'ts', format: 'esm' }).code;
  const tmp = path.join(root, 'node_modules', '.cache-schema.mjs');
  fs.writeFileSync(tmp, js);
  return import(pathToFileURL(tmp).href + '?t=' + Date.now());
}

export async function construirCodeGs() {
  const { COLUMNAS, HOJAS_ESCRIBIBLES } = await cargarSchema();
  const tpl = fs.readFileSync(path.join(root, 'backend/Code.template.gs'), 'utf8');
  return tpl
    .replace(/\/\*COLUMNAS_BEGIN\*\/[\s\S]*?\/\*COLUMNAS_END\*\//, '/*COLUMNAS_BEGIN*/' + JSON.stringify(COLUMNAS, null, 1) + '/*COLUMNAS_END*/')
    .replace(/\/\*ESCRIBIBLES_BEGIN\*\/[\s\S]*?\/\*ESCRIBIBLES_END\*\//, '/*ESCRIBIBLES_BEGIN*/' + JSON.stringify(HOJAS_ESCRIBIBLES) + '/*ESCRIBIBLES_END*/');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = await construirCodeGs();
  fs.writeFileSync(path.join(root, 'backend/Code.gs'), out);
  console.log('backend/Code.gs generado (' + out.length + ' bytes)');
}
