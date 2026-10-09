// El repositorio es PÚBLICO: antes de subir datos se quitan los nombres (columnas) y se tachan dentro de las respuestas abiertas.
// El código (P01, P02…) sigue enlazando todas las hojas, así el análisis no pierde nada.
export const COLUMNAS_PERSONALES = ['Nombre ingresado', 'Nombre mostrado', 'nombreMostrado'];

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Palabras del nombre (≥ 3 letras) de cada participante: se buscan, sin tildes ni mayúsculas, dentro de los textos. */
export function palabrasPersonales(dump) {
  const p = dump['Participantes'];
  if (!p) return [];
  const i = p.headers.indexOf('Nombre ingresado');
  if (i < 0) return [];
  const set = new Set();
  for (const r of p.rows) for (const w of norm(r[i] ?? '').split(/\s+/)) if (w.length >= 3) set.add(w);
  return [...set].sort((a, b) => b.length - a.length);
}

export function tachar(texto, palabras) {
  if (typeof texto !== 'string' || !texto || !palabras.length) return texto;
  const t = texto.normalize('NFC');
  const b = norm(t); // sin tildes ni mayúsculas, con el mismo largo que t (NFC)
  const esc = palabras.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('(?<![a-z0-9])(?:' + esc.join('|') + ')(?![a-z0-9])', 'g');
  let out = '', last = 0, m;
  while ((m = re.exec(b)) !== null) { out += t.slice(last, m.index) + '[nombre]'; last = m.index + m[0].length; }
  return out + t.slice(last);
}

/** dump = { hoja: { headers, rows } } → misma forma, sin columnas personales y con nombres tachados en los textos. */
export function anonimizar(dump) {
  const palabras = palabrasPersonales(dump);
  const out = {};
  for (const [hoja, h] of Object.entries(dump)) {
    const keep = h.headers.map((k, i) => (COLUMNAS_PERSONALES.includes(k) ? -1 : i)).filter((i) => i >= 0);
    out[hoja] = {
      headers: keep.map((i) => h.headers[i]),
      rows: h.rows.map((r) => keep.map((i) => (typeof r[i] === 'string' ? tachar(r[i], palabras) : r[i]))),
    };
  }
  return out;
}
