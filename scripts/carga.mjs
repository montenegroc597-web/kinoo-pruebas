// Simulación de carga: N participantes completos contra el backend local (las MISMAS migraciones de Supabase sobre PGlite).
//   node scripts/carga.mjs [10 20 100]            → por defecto 10, 20 y 100
// Cada participante hace lo mismo que la app: registrarse, mandar eventos en lotes de 25 (como TrackingClient) y sus filas.
// Mide el tiempo del servidor por lote y lo que pesa lo que pide el Panel en cada refresco, comparado con el dump completo de antes.
// PGlite es Postgres en WebAssembly y atiende de a una consulta: los tiempos son una cota PESIMISTA del Postgres de Supabase.
import { crearBackend } from '../e2e/pg-backend.mjs';

const EVENTOS_POR_SESION = 900;   // un link completo ronda 300–600 eventos (toques, gestos, respuestas): 900 es holgado
const FILAS_POR_SESION = { Descubrir: 1, Ver: 1, Moods: 8, 'Películas': 5, Mazos: 1, 'Percepción': 1, Puntos: 25, Notas: 2 };
const LOTE = 25;
const BLOQUES = ['intro', 'descubrir', 'ver', 'moods', 'mazos', 'percepcion'];

const kb = (o) => (Buffer.byteLength(JSON.stringify(o)) / 1024).toFixed(0) + ' KB';
const pct = (v, p) => { const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const ms = async (f) => { const t = performance.now(); const r = await f(); return [performance.now() - t, r]; };

function evento(p, k) {
  const bloque = BLOQUES[k % BLOQUES.length];
  return {
    eventId: `${p}-e${k}`, sesionId: `s${p}`, codigo: 'P' + String(p).padStart(2, '0'), ronda: 1, variante: p % 2 ? 'A' : 'B',
    ts: new Date().toISOString(), tSesion: k * 2000, bloque, estimulo: bloque === 'descubrir' ? 'D2' : bloque === 'ver' ? 'V2' : 'Z3', pantalla: 'Flujo1_Descubrir.dc.html',
    tipo: k % 3 ? 'tap' : 'drag', x: k % 100, y: (k * 7) % 100, target: 'Quiero verla', nToque: k % 5, valor: k % 3 ? '' : 'izquierda',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', viewport: '390x844@3',
  };
}

async function simular(n) {
  const b = await crearBackend();
  const lat = { register: [], events: [], rows: [] };
  const t0 = performance.now();
  for (let p = 1; p <= n; p++) {
    lat.register.push((await ms(() => b.post({ action: 'register', key: 'W', sesionId: `s${p}`, perfil: { ronda: 1, flujo: 'Completo' } })))[0]);
  }
  // los participantes avanzan a la vez: se intercalan sus lotes, como llegarían al servidor
  const lotes = Math.ceil(EVENTOS_POR_SESION / LOTE);
  for (let l = 0; l < lotes; l++) {
    for (let p = 1; p <= n; p++) {
      const events = Array.from({ length: LOTE }, (_, i) => evento(p, l * LOTE + i));
      const [t, r] = await ms(() => b.post({ action: 'events', key: 'W', events }));
      if (!r.ok) throw new Error(r.error);
      lat.events.push(t);
    }
  }
  for (let p = 1; p <= n; p++) {
    for (const [hoja, k] of Object.entries(FILAS_POR_SESION)) {
      const filas = Array.from({ length: k }, (_, i) => ({ Participante: 'P' + String(p).padStart(2, '0'), 'Row ID': `s${p}|${hoja}|${i}`, Notas: 'x'.repeat(80) }));
      lat.rows.push((await ms(() => b.post({ action: 'rows', key: 'W', hoja, filas })))[0]);
    }
    await b.post({ action: 'progress', key: 'W', sesionId: `s${p}`, partes: 6, completo: true });
  }
  const total = (performance.now() - t0) / 1000;
  // lo que pide el Panel en cada refresco (ahora) frente al dump completo (antes)
  const [tHojas, hojas] = await ms(() => b.post({ action: 'dump', key: 'R', excluir: ['Eventos'] }));
  const [tRes, res] = await ms(() => b.post({ action: 'resumen-eventos', key: 'R' }));
  const [tCompleto, completo] = await ms(() => b.post({ action: 'dump', key: 'R' }));
  const [tLinea, linea] = await ms(() => b.post({ action: 'eventos', key: 'R', codigo: 'P01' }));
  const codigos = new Set((await b.filas('Participantes')).map((x) => x['Código']));
  await b.cerrar();
  return {
    n, eventos: res.data.total, segundos: total.toFixed(1), codigosUnicos: codigos.size === n,
    lote: `p50 ${pct(lat.events, 0.5).toFixed(0)} ms · p95 ${pct(lat.events, 0.95).toFixed(0)} ms`,
    registro: `p95 ${pct(lat.register, 0.95).toFixed(0)} ms`,
    panelAhora: `${kb(hojas.data)} + ${kb(res.data)} (${(tHojas + tRes).toFixed(0)} ms)`,
    panelAntes: `${kb(completo.data)} (${tCompleto.toFixed(0)} ms)`,
    lineaDeTiempo: `${linea.data.rows.length} eventos, ${kb(linea.data)} (${tLinea.toFixed(0)} ms)`,
  };
}

const tamaños = process.argv.slice(2).map(Number).filter((x) => x > 0);
for (const n of tamaños.length ? tamaños : [10, 20, 100]) {
  const r = await simular(n);
  console.log(`\n== ${r.n} participantes · ${r.eventos} eventos · ${r.segundos} s de servidor en total`);
  console.log(`   códigos únicos P01…: ${r.codigosUnicos ? 'sí' : 'NO'}`);
  console.log(`   lote de ${LOTE} eventos: ${r.lote} · registro: ${r.registro}`);
  console.log(`   Panel por refresco, ahora: ${r.panelAhora}`);
  console.log(`   Panel por refresco, antes (dump con Eventos): ${r.panelAntes}`);
  console.log(`   línea de tiempo de 1 participante: ${r.lineaDeTiempo}`);
}
