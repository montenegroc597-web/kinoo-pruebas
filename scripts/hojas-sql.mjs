// Genera supabase/hojas.sql (hojas y columnas del registro) desde packages/tracking/src/schema.ts, la fuente única.
//   node scripts/hojas-sql.mjs           → escribe el archivo
//   node scripts/hojas-sql.mjs --check   → falla si el archivo no está al día (lo usa la CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HOJAS_SQL = path.join(root, 'supabase/hojas.sql');

export async function cargarSchema() {
  const ts = fs.readFileSync(path.join(root, 'packages/tracking/src/schema.ts'), 'utf8');
  const tmp = path.join(root, 'node_modules', '.cache-schema.mjs');
  fs.writeFileSync(tmp, transformSync(ts, { loader: 'ts', format: 'esm' }).code);
  return import(pathToFileURL(tmp).href + '?t=' + Date.now());
}

const lit = (s) => "'" + String(s).replace(/'/g, "''") + "'";

export async function construirHojasSql() {
  const { COLUMNAS } = await cargarSchema();
  const filas = Object.entries(COLUMNAS).map(([hoja, cols]) => `  (${lit(hoja)}, ${lit(JSON.stringify(cols))}::jsonb)`);
  return [
    '-- GENERADO por scripts/hojas-sql.mjs desde packages/tracking/src/schema.ts. No editar a mano.',
    '-- Idempotente: crea o actualiza las hojas y sus columnas (las filas ya guardadas no cambian).',
    'insert into public.hojas (nombre, columnas) values',
    filas.join(',\n'),
    'on conflict (nombre) do update set columnas = excluded.columnas;',
    '',
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sql = await construirHojasSql();
  if (process.argv.includes('--check')) {
    const actual = fs.existsSync(HOJAS_SQL) ? fs.readFileSync(HOJAS_SQL, 'utf8').replace(/\r\n/g, '\n') : '';
    if (actual !== sql) { console.error('supabase/hojas.sql no está al día con schema.ts: ejecuta npm run hojas-sql'); process.exit(1); }
    console.log('supabase/hojas.sql al día');
  } else {
    fs.writeFileSync(HOJAS_SQL, sql);
    console.log('supabase/hojas.sql generado');
  }
}
