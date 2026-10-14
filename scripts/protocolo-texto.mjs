// Protocolo .docx → texto plano versionado, y comparación entre versiones (para actualizar el sistema leyendo SOLO lo que cambió).
//   node scripts/protocolo-texto.mjs <Protocolo.docx> [docs/protocolo/v1.4.txt]      → extrae (títulos con «#», tablas con «|»)
//   node scripts/protocolo-texto.mjs --comparar docs/protocolo/v1.3.txt docs/protocolo/v1.4.txt
//        → imprime solo los párrafos quitados (−) y añadidos (+), con el título de sección donde están
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const XLSX = createRequire(import.meta.url)('xlsx'); // la API CFB (zip) solo está en la versión CommonJS

const des = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const texto = (xml) => des([...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g)].map((m) => m[1] ?? '\t').join('')).trim();

export function extraer(docx) {
  const zip = XLSX.CFB.read(fs.readFileSync(docx), { type: 'buffer' });
  const xml = Buffer.from((XLSX.CFB.find(zip, 'word/document.xml') ?? XLSX.CFB.find(zip, '/word/document.xml')).content).toString('utf8');
  const body = xml.slice(xml.indexOf('<w:body>'));
  const lineas = [];
  // tablas → una línea por fila con celdas separadas por « | »; párrafos sueltos → una línea (títulos con #)
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const b = m[0];
    if (b.startsWith('<w:tbl>')) {
      for (const fila of b.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)) {
        const celdas = [...fila[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((c) => [...c[0].matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((p) => texto(p[0])).filter(Boolean).join(' / '));
        if (celdas.some(Boolean)) lineas.push('| ' + celdas.join(' | '));
      }
    } else {
      const t = texto(b);
      if (!t) continue;
      const nivel = /<w:pStyle w:val="(?:Heading|Ttulo|Titulo|Título)(\d)"/i.exec(b)?.[1];
      lineas.push(nivel ? '#'.repeat(Number(nivel)) + ' ' + t : t);
    }
  }
  return lineas.join('\n') + '\n';
}

/** Diferencia por párrafos (LCS): lo que se quitó y lo que se añadió, con su sección. */
export function comparar(a, b) {
  const A = a.split('\n').filter(Boolean), B = b.split('\n').filter(Boolean);
  const L = Array.from({ length: A.length + 1 }, () => new Uint16Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0, seccion = '', mostrada = '';
  const marcar = (s, linea) => { if (seccion !== mostrada) { out.push('\n' + seccion); mostrada = seccion; } out.push(s + ' ' + linea); };
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) { if (A[i].startsWith('#')) seccion = A[i]; i++; j++; }
    else if (j < B.length && (i === A.length || L[i][j + 1] >= L[i + 1][j])) { if (B[j].startsWith('#')) seccion = B[j]; marcar('+', B[j++]); }
    else marcar('−', A[i++]);
  }
  return out.join('\n');
}

const args = process.argv.slice(2);
if (args[0] === '--comparar') {
  const r = comparar(fs.readFileSync(args[1], 'utf8'), fs.readFileSync(args[2], 'utf8'));
  console.log(r.trim() ? r : 'Sin cambios de texto.');
} else if (args[0]) {
  const t = extraer(args[0]);
  if (args[1]) { fs.mkdirSync(path.dirname(args[1]), { recursive: true }); fs.writeFileSync(args[1], t); console.log(`${args[1]}: ${t.split('\n').length} líneas`); }
  else process.stdout.write(t);
} else {
  console.error('Uso: node scripts/protocolo-texto.mjs <Protocolo.docx> [salida.txt]  |  --comparar viejo.txt nuevo.txt');
  process.exit(1);
}
