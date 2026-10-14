// Backend local para los E2E y para probar a mano sin Supabase: las MISMAS migraciones, sobre PGlite.
//   node e2e/mock-backend.mjs            → http://localhost:8787 (WRITE_KEY = W, READ_KEY = R)
//   GET /__dump?hoja=Eventos             → filas de una hoja
//   POST /__reset                        → base vacía
//   /__caer?v=1 · /__latencia?ms=…       → simular red caída o lenta
import http from 'node:http';
import { crearBackend } from './pg-backend.mjs';

const PORT = Number(process.env.MOCK_PORT ?? 8787);
let be = await crearBackend({ writeKey: 'W', readKey: 'R' });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
let latencia = 0;
let caido = false;

const leer = (req) => new Promise((res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => res(b)); });
const responder = (res, out) => { res.writeHead(200, { ...cors, 'Content-Type': typeof out === 'string' ? 'text/csv; charset=utf-8' : 'application/json' }); res.end(typeof out === 'string' ? out : JSON.stringify(out)); };

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (u.pathname === '/__reset') { await be.cerrar(); be = await crearBackend({ writeKey: 'W', readKey: 'R' }); caido = false; latencia = 0; res.writeHead(200, cors); return res.end('ok'); }
  if (u.pathname === '/__caer') { caido = u.searchParams.get('v') === '1'; res.writeHead(200, cors); return res.end('ok'); }
  if (u.pathname === '/__latencia') { latencia = Number(u.searchParams.get('ms') ?? 0); res.writeHead(200, cors); return res.end('ok'); }
  if (u.pathname === '/__dump') return responder(res, await be.get({ action: 'dump', key: 'R', hojas: u.searchParams.get('hoja') ?? undefined }));
  if (caido) { res.writeHead(503, cors); return res.end('caido'); }
  if (latencia) await new Promise((r) => setTimeout(r, latencia));
  try {
    responder(res, req.method === 'POST' ? await be.post(JSON.parse(await leer(req))) : await be.get(Object.fromEntries(u.searchParams)));
  } catch (e) { responder(res, { ok: false, error: String(e) }); }
}).listen(PORT, () => console.log('Backend local (PGlite + migraciones de Supabase) en http://localhost:' + PORT));
