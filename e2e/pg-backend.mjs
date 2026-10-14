// Backend local con las MISMAS migraciones de Supabase, sobre PGlite (Postgres en proceso, sin instalar nada).
// Lo usan los tests (SQL real de kinoo_api), el backend simulado de los E2E y la simulación de carga.
// `post`/`get` imitan a la Edge Function supabase/functions/kinoo/index.ts (mismo contrato HTTP).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { construirHojasSql } from '../scripts/hojas-sql.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migraciones = () => fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();

const celdaCsv = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

export async function crearBackend({ writeKey = 'W', readKey = 'R' } = {}) {
  const db = await PGlite.create();
  await db.exec('create role anon; create role authenticated; create role service_role;'); // los roles que Supabase ya trae
  // todas las migraciones en orden y al final hojas.sql (el estado actual de las hojas), igual que en Supabase
  for (const m of migraciones()) await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations', m), 'utf8'));
  await db.exec(await construirHojasSql());
  await db.query("insert into claves (nivel, hash) values ('write', encode(sha256(convert_to($1, 'UTF8')), 'hex')), ('read', encode(sha256(convert_to($2, 'UTF8')), 'hex'))", [writeKey, readKey]);

  const api = async (accion, cuerpo) => (await db.query('select public.kinoo_api($1, $2::jsonb) as r', [accion, JSON.stringify(cuerpo ?? {})])).rows[0].r;
  return {
    db,
    api,
    post: (b) => api(String(b?.action ?? ''), b),
    /** GET como la Edge Function: health, dump (hojas separadas por |) y csv. */
    async get(p) {
      if (p.action === 'health') return api('health', { key: p.key });
      if (p.action === 'dump') return api('dump', { key: p.key, hojas: p.hojas ? String(p.hojas).split('|') : [] });
      if (p.action === 'csv') {
        const r = await api('dump', { key: p.key, hojas: [p.hoja ?? ''] });
        const d = r?.ok ? r.data?.[p.hoja] : null;
        if (!d) return { ok: false, error: r?.error ?? 'hoja no permitida' };
        return [d.headers, ...d.rows].map((f) => f.map(celdaCsv).join(',')).join('\n');
      }
      return { ok: false, error: 'acción desconocida' };
    },
    /** Filas de una hoja como objetos (para los tests). */
    async filas(hoja) {
      const d = (await api('dump', { key: readKey, hojas: [hoja] })).data[hoja];
      return d.rows.map((r) => Object.fromEntries(d.headers.map((h, i) => [h, r[i]])));
    },
    cerrar: () => db.close(),
  };
}
