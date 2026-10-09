// Backend simulado para los E2E y para probar a mano sin Google: ejecuta el Code.gs REAL sobre un Sheet en memoria.
//   node e2e/mock-backend.mjs            → http://localhost:8787
//   GET /__dump?hoja=Eventos             → filas de una hoja (con READ_KEY interna)
//   POST /__reset                        → vacía todo
import http from 'node:http';
import { crearBackend } from './fake-gas.mjs';

const PORT = Number(process.env.MOCK_PORT ?? 8787);
let gas = await crearBackend({ writeKey: 'W', readKey: 'R' });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
let latencia = 0;
let caido = false;

const leer = (req) => new Promise((res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => res(b)); });

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (u.pathname === '/__reset') { gas = await crearBackend({ writeKey: 'W', readKey: 'R' }); caido = false; latencia = 0; res.writeHead(200, cors); return res.end('ok'); }
  if (u.pathname === '/__caer') { caido = u.searchParams.get('v') === '1'; res.writeHead(200, cors); return res.end('ok'); }
  if (u.pathname === '/__latencia') { latencia = Number(u.searchParams.get('ms') ?? 0); res.writeHead(200, cors); return res.end('ok'); }
  if (u.pathname === '/__dump') {
    const hoja = u.searchParams.get('hoja');
    const r = gas.get({ action: 'dump', key: 'R', hojas: hoja ?? undefined });
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(r));
  }
  if (caido) { res.writeHead(503, cors); return res.end('caido'); }
  if (latencia) await new Promise((r) => setTimeout(r, latencia));
  let out;
  if (req.method === 'POST') {
    const body = await leer(req);
    try { out = gas.post(JSON.parse(body)); } catch (e) { out = { ok: false, error: String(e) }; }
  } else {
    out = gas.get(Object.fromEntries(u.searchParams));
  }
  res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
  res.end(typeof out === 'string' ? out : JSON.stringify(out));
}).listen(PORT, () => console.log('Backend simulado en http://localhost:' + PORT));
