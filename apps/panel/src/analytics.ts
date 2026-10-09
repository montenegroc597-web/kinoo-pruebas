// Cálculos del Panel: todo sale de las hojas del Sheet con las fórmulas del protocolo v1.3 (packages/tracking/src/metrics.ts).
import {
  FLUJO_NOMBRE, MARCA_DESEADOS, MISIONES, TAREAS, UMBRALES, UEQ_ESCALAS, UEQ_PARES, UEQ_S_ITEMS, mapaCalor, mediana, promedio, semaforo, semaforoInverso, semaforoMiss, semaforoPrimerClic,
  semaforoSEQ, semaforoUEQ, ueqEscalas, ueqS, ueqTransformar, veredictoAB, type Semaforo,
} from '@kinoo/tracking';

export type Hoja = { headers: string[]; rows: any[][] };
export type Dump = Record<string, Hoja>;
export type Fila = Record<string, any>;

export const filas = (d: Dump, hoja: string): Fila[] => {
  const h = d[hoja];
  if (!h) return [];
  return h.rows.map((r) => Object.fromEntries(h.headers.map((k, i) => [k, r[i]])));
};
const num = (v: unknown): number | null => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const nums = (a: Fila[], k: string) => a.map((r) => num(r[k])).filter((x): x is number => x != null);
const pct = (n: number, d: number) => (d ? (n / d) * 100 : null);
const uniq = <T,>(a: T[]) => [...new Set(a)];

/** Participantes de la ronda (la ronda 0 es el piloto y se excluye por defecto). */
export function participantes(d: Dump, incluirPiloto = false): Fila[] {
  return filas(d, 'Participantes').filter((p) => incluirPiloto || Number(p['Ronda']) !== 0);
}
export function codigosValidos(d: Dump, incluirPiloto = false): Set<string> {
  return new Set(participantes(d, incluirPiloto).map((p) => String(p['Código'])));
}
const deValidos = (d: Dump, hoja: string, incluirPiloto: boolean, col = 'Participante'): Fila[] => {
  const ok = codigosValidos(d, incluirPiloto);
  return filas(d, hoja).filter((r) => ok.has(String(r[col])));
};

// ------------------------------------------------------------------ 5 segundos
export function cincoSeg(d: Dump, piloto = false) {
  const rs = deValidos(d, '5 segundos', piloto);
  const porPantalla = uniq(rs.map((r) => String(r['Pantalla ID']))).sort().map((id) => {
    const a = rs.filter((r) => r['Pantalla ID'] === id);
    const prop = nums(a, 'Propósito (1/0,5/0)'), acc = nums(a, 'Acción principal (1/0,5/0)'), cla = nums(a, 'Claridad 1–7');
    const sum = (v: number[]) => v.reduce((x, y) => x + y, 0);
    const proposito = prop.length ? (sum(prop) / prop.length) * 100 : null;
    const accion = acc.length ? (sum(acc) / acc.length) * 100 : null;
    const claridad = promedio(cla);
    return {
      id, n: a.length, proposito, accion, claridad, codificadas: Math.min(prop.length, acc.length),
      semProposito: semaforo(proposito, UMBRALES.proposito5s, 60), semAccion: semaforo(accion, UMBRALES.accion5s, 50), semClaridad: semaforo(claridad, UMBRALES.claridad5s, 4.5),
      distClaridad: [1, 2, 3, 4, 5, 6, 7].map((k) => cla.filter((x) => x === k).length),
      palabras: a.map((r) => String(r['Palabra / sensación'] ?? '')).filter(Boolean),
      motivos: a.map((r) => String(r['Motivo si no entendió propósito o acción (código)'] ?? '')).filter(Boolean),
    };
  });
  return { porPantalla, n: uniq(rs.map((r) => r['Participante'])).length };
}

// ------------------------------------------------------------------ cards
export function cards(d: Dump, piloto = false) {
  const rs = deValidos(d, '5 s – Cards', piloto);
  const prior = rs.map((r) => num(r['¿Prioritario? (auto)'])).filter((x): x is number => x != null);
  const conoc = rs.filter((r) => r['¿Conocía la película? (Sí/No)'] === 'Sí'), noc = rs.filter((r) => r['¿Conocía la película? (Sí/No)'] === 'No');
  const iC = promedio(nums(conoc, 'Interés 1–7')), iN = promedio(nums(noc, 'Interés 1–7'));
  const primer: Record<string, number> = {};
  rs.forEach((r) => { const k = String(r['Primer elemento que llamó la atención'] ?? '').split(' — ')[0]; if (k) primer[k] = (primer[k] ?? 0) + 1; });
  const falto: Record<string, number> = {};
  rs.forEach((r) => { const k = String(r['Información que faltó'] ?? '').trim().toLowerCase(); if (k) falto[k] = (falto[k] ?? 0) + 1; });
  const atencion = pct(prior.filter((x) => x === 1).length, prior.length);
  const dif = iC != null && iN != null ? Math.abs(iC - iN) : null;
  return {
    n: rs.length, atencion, semAtencion: semaforo(atencion, UMBRALES.atencionCards, 50),
    recuerdo: promedio(nums(rs, '# elementos recordados')), interes: promedio(nums(rs, 'Interés 1–7')), interesConocidas: iC, interesNoConocidas: iN,
    alertaDependePelicula: dif != null && dif > 1.5, primerElemento: Object.entries(primer).sort((a, b) => b[1] - a[1]), faltante: Object.entries(falto).sort((a, b) => b[1] - a[1]),
    contenido: pct(nums(rs, 'Contenido (1/0,5/0)').reduce((a, b) => a + b, 0), nums(rs, 'Contenido (1/0,5/0)').length), codificadas: nums(rs, 'Contenido (1/0,5/0)').length,
  };
}

// ------------------------------------------------------------------ primer clic + SEQ
export function primerClic(d: Dump, piloto = false) {
  const rs = deValidos(d, 'Primer clic + SEQ', piloto);
  const ev = filas(d, 'Eventos').filter((e) => codigosValidos(d, piloto).has(String(e.codigo)));
  const porTarea = TAREAS.map((t) => {
    const a = rs.filter((r) => r['Tarea'] === t.id);
    const puntajes = a.map((r) => num(r['Puntaje final']) ?? num(r['Puntaje auto (1/0,5/0)'])).filter((x): x is number => x != null);
    const correcto = puntajes.length ? (puntajes.reduce((x, y) => x + y, 0) / puntajes.length) * 100 : null;
    const tiempos = nums(a, 'Tiempo al 1er clic (s)');
    const clics = nums(a, 'Clics totales').reduce((x, y) => x + y, 0), miss = nums(a, 'Miss clicks').reduce((x, y) => x + y, 0);
    const missPct = pct(miss, clics);
    const seq = nums(a, 'SEQ 1–7');
    const acert = a.filter((r) => r['Resultado 1er clic (auto)'] === 'Correcto'), fallo = a.filter((r) => r['Resultado 1er clic (auto)'] !== 'Correcto');
    // elemento incorrecto más tocado: toques en miss dentro de la tarea
    const mal: Record<string, number> = {};
    ev.filter((e) => e.bloque === 'primer-clic' && e.estimulo === t.id && (e.tipo === 'tap' || e.tipo === 'drag') && e.resultado === 'Miss click').forEach((e) => { const k = String(e.target || 'none'); mal[k] = (mal[k] ?? 0) + 1; });
    const malTop = Object.entries(mal).sort((x, y) => y[1] - x[1]);
    const totalMiss = malTop.reduce((x, y) => x + y[1], 0);
    const med = mediana(tiempos);
    return {
      tarea: t.id, escenario: t.escenario, pantalla: t.pantalla, n: a.length, correcto, semCorrecto: semaforoPrimerClic(correcto),
      medianaTiempo: med, semTiempo: semaforoInverso(med, UMBRALES.medianaTiempoBueno, UMBRALES.medianaTiempoDuda), missPct, semMiss: semaforoMiss(missPct),
      seq: promedio(seq), semSEQ: semaforoSEQ(promedio(seq)), seqBajo: pct(seq.filter((x) => x <= 4).length, seq.length),
      seqAcertaron: promedio(nums(acert, 'SEQ 1–7')), seqFallaron: promedio(nums(fallo, 'SEQ 1–7')),
      falsaSeguridad: fallo.length > 0 && (promedio(nums(fallo, 'SEQ 1–7')) ?? 0) >= 5.5,
      elementoRobado: malTop[0] && totalMiss ? { target: malTop[0][0], pct: (malTop[0][1] / totalMiss) * 100 } : null,
      motivos: a.map((r) => String(r['Si SEQ ≤ 4: ¿qué la hizo difícil?'] ?? '')).filter(Boolean),
    };
  });
  const global = promedio(porTarea.map((t) => t.correcto).filter((x): x is number => x != null));
  return { porTarea, global, semGlobal: semaforoPrimerClic(global), n: uniq(rs.map((r) => r['Participante'])).length };
}

// ------------------------------------------------------------------ flujos (misiones tipo Maze)
export function flujos(d: Dump, piloto = false) {
  const rs = deValidos(d, 'Flujos', piloto);
  const ev = filas(d, 'Eventos').filter((e) => codigosValidos(d, piloto).has(String(e.codigo)) && e.bloque === 'flujos');
  const porMision = MISIONES.map((m) => {
    const a = rs.filter((r) => r['Misión'] === m.id);
    const cuenta = (res: string) => a.filter((r) => r['Resultado'] === res).length;
    const directos = cuenta('Éxito directo'), indirectos = cuenta('Éxito indirecto'), abandonos = cuenta('Abandono'), tiempo = cuenta('Fallo por tiempo'), errores = cuenta('Error de flujo');
    const toques = nums(a, 'Toques').reduce((x, y) => x + y, 0), miss = nums(a, 'Misclicks').reduce((x, y) => x + y, 0);
    const exito = pct(directos + indirectos, a.length);
    // embudo: Notas = "Pasos alcanzados: 3/4 [1110]"
    const embudo = m.pasos.map((p, i) => ({ paso: p.etiqueta, n: a.filter((r) => /\[([01]+)\]/.exec(String(r['Notas']))?.[1]?.[i] === '1').length }));
    const rutas: Record<string, number> = {};
    a.forEach((r) => { const k = String(r['Pantallas visitadas (ruta)'] ?? ''); if (k) rutas[k] = (rutas[k] ?? 0) + 1; });
    const desv: Record<string, number> = {};
    a.forEach((r) => String(r['Desvíos'] ?? '').split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => { desv[x] = (desv[x] ?? 0) + 1; }));
    const salida: Record<string, number> = {};
    a.filter((r) => ['Abandono', 'Fallo por tiempo'].includes(String(r['Resultado']))).forEach((r) => { const ruta = String(r['Pantallas visitadas (ruta)'] ?? '').split(' > '); const k = ruta[ruta.length - 1] || m.pantallaInicio; salida[k] = (salida[k] ?? 0) + 1; });
    const evm = ev.filter((e) => e.estimulo === m.id);
    return {
      mision: m.id, flujo: m.flujo, titulo: m.titulo, escenario: m.escenario, n: a.length, directos, indirectos, abandonos, tiempo, errores, exito, directo: pct(directos, a.length), abandono: pct(abandonos, a.length),
      mediana: mediana(nums(a, 'Tiempo (s)')), missPct: pct(miss, toques), toquesProm: promedio(nums(a, 'Toques')), seq: promedio(nums(a, 'SEQ')), ayuda: nums(a, 'Ayuda abierta').reduce((x, y) => x + y, 0),
      embudo, rutas: Object.entries(rutas).sort((x, y) => y[1] - x[1]).slice(0, 5), desvios: Object.entries(desv).sort((x, y) => y[1] - x[1]), salidas: Object.entries(salida).sort((x, y) => y[1] - x[1]),
      gestos: {
        izquierda: evm.filter((e) => e.tipo === 'drag' && e.valor === 'izquierda').length, derecha: evm.filter((e) => e.tipo === 'drag' && e.valor === 'derecha').length, arriba: evm.filter((e) => e.tipo === 'drag' && e.valor === 'arriba').length,
        arribaBloqueado: evm.filter((e) => e.tipo === 'action' && e.valor === 'gesture.blocked').length, mantener: evm.filter((e) => e.tipo === 'longpress').length, deshacer: evm.filter((e) => e.tipo === 'action' && e.valor === 'undo').length,
      },
    };
  });
  const porFlujo = (['F-D', 'F-M', 'F-V'] as const).map((f) => ({ flujo: f, nombre: FLUJO_NOMBRE[f], misiones: porMision.filter((m) => m.flujo === f) }));
  return { porMision, porFlujo, n: uniq(rs.map((r) => r['Participante'])).length };
}

// ------------------------------------------------------------------ UEQ
export function ueq(d: Dump, piloto = false) {
  const rs = deValidos(d, 'UEQ', piloto);
  const resp = (r: Fila): Record<number, number> => { const o: Record<number, number> = {}; for (let i = 1; i <= 26; i++) { const v = num(r[String(i)]); if (v != null) o[i] = v; } return o; };
  const filasS = rs.map((r) => ({ cod: String(r['Participante']), s: ueqS(resp(r)), esc: ueqEscalas(resp(r)), formato: String(r['Formato']), comentario: String(r['Comentario libre'] ?? '') }));
  const prag = promedio(filasS.map((x) => x.s.pragmatica).filter((x): x is number => x != null));
  const hed = promedio(filasS.map((x) => x.s.hedonica).filter((x): x is number => x != null));
  const gen = prag != null && hed != null ? (prag + hed) / 2 : null;
  const items = (rs.some((r) => r['Formato'] === 'UEQ') ? Array.from({ length: 26 }, (_, i) => i + 1) : UEQ_S_ITEMS).map((i) => {
    const v = rs.map((r) => num(r[String(i)])).filter((x): x is number => x != null).map((x) => ueqTransformar(i, x));
    return { item: i, izq: UEQ_PARES[i - 1][0], der: UEQ_PARES[i - 1][1], media: promedio(v), n: v.length };
  }).sort((a, b) => (a.media ?? 9) - (b.media ?? 9));
  const escalas = Object.keys(UEQ_ESCALAS).map((k) => ({ escala: k, media: promedio(filasS.map((x) => x.esc[k]).filter((x): x is number => x != null)) }));
  return { n: rs.length, pragmatica: prag, hedonica: hed, general: gen, semPrag: semaforoUEQ(prag), semHed: semaforoUEQ(hed), semGen: semaforoUEQ(gen), items, escalas, comentarios: filasS.map((x) => x.comentario).filter(Boolean),
    lectura: prag != null && hed != null ? (prag > 0.8 && hed < 0.8 ? 'Sirve pero no engancha' : hed > 0.8 && prag < 0.8 ? 'Atrae pero cuesta usarla' : '') : '' };
}

// ------------------------------------------------------------------ marca A/B
export function marca(d: Dump, piloto = false) {
  const rs = deValidos(d, 'Marca A-B', piloto);
  const m = (k: string) => promedio(nums(rs, k));
  const votos = (k: string) => rs.filter((r) => r[k] === 'A').length;
  const votosB = (k: string) => rs.filter((r) => r[k] === 'B').length;
  const dec = (col: string) => { const a = votos(col), b = votosB(col); return { a, b, igual: rs.filter((r) => r[col] === 'Igual').length, ...veredictoAB(a, b) }; };
  const dosAtributos = (v: 'A' | 'B') => pct(rs.filter((r) => (num(r[`${v} · # atributos deseados (0–3)`]) ?? 0) >= 2).length, rs.length);
  const jer = (v: 'A' | 'B') => pct(rs.filter((r) => num(r[`${v} · Primer elemento = jerarquía prevista (1/0)`]) === 1).length, rs.filter((r) => num(r[`${v} · Primer elemento = jerarquía prevista (1/0)`]) != null).length);
  const palabras = (v: 'A' | 'B') => { const o: Record<string, number> = {}; rs.forEach((r) => String(r[`${v} · Palabras`] ?? '').split(';').map((x) => x.trim()).filter(Boolean).forEach((w) => { o[w] = (o[w] ?? 0) + 1; })); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  const porPantalla = uniq(rs.map((r) => String(r['Pantalla ID']))).sort().map((id) => {
    const a = rs.filter((r) => r['Pantalla ID'] === id);
    return { id, n: a.length, agradoA: promedio(nums(a, 'A · Agrado 1–7')), agradoB: promedio(nums(a, 'B · Agrado 1–7')), leerA: promedio(nums(a, 'A · Legibilidad 1–7')), leerB: promedio(nums(a, 'B · Legibilidad 1–7')) };
  });
  const pref = dec('Preferencia directa (A/B/Igual)');
  const agA = m('A · Agrado 1–7'), agB = m('B · Agrado 1–7'), leA = m('A · Legibilidad 1–7'), leB = m('B · Legibilidad 1–7');
  return {
    n: rs.length, personas: uniq(rs.map((r) => r['Participante'])).length, preferencia: pref, colores: dec('¿Qué colores prefiere? (A/B/Igual)'), lectura: dec('¿Cuál se lee mejor? (A/B/Igual)'), cinematografica: dec('¿Cuál es más [atributo]? (A/B/Igual)'),
    agradoA: agA, agradoB: agB, leerA: leA, leerB: leB, semLeerA: semaforo(leA, UMBRALES.legibilidadMarca, 4.5), semLeerB: semaforo(leB, UMBRALES.legibilidadMarca, 4.5),
    dosAtributosA: dosAtributos('A'), dosAtributosB: dosAtributos('B'), jerarquiaA: jer('A'), jerarquiaB: jer('B'), palabrasA: palabras('A'), palabrasB: palabras('B'),
    emocionanteA: m('A · Aburrido–Emocionante 1–7'), emocionanteB: m('B · Aburrido–Emocionante 1–7'), distintivoA: m('A · Genérico–Distintivo 1–7'), distintivoB: m('B · Genérico–Distintivo 1–7'),
    calidoA: m('A · Frío–Cálido'), calidoB: m('B · Frío–Cálido'), claroA: m('A · Confuso–Claro'), claroB: m('B · Confuso–Claro'),
    porPantalla, motivos: rs.map((r) => ({ cod: String(r['Participante']), pantalla: String(r['Pantalla ID']), texto: String(r['Motivo (textual)'] ?? ''), pref: String(r['Preferencia directa (A/B/Igual)']) })).filter((x) => x.texto),
    /** orden de la decisión (protocolo §4.5): contraste → legibilidad y jerarquía → preferencia */
    deseadosEstanDeseados: MARCA_DESEADOS,
  };
}

// ------------------------------------------------------------------ mapas de calor
export interface PuntoMapa { x: number; y: number; resultado: string; prueba: string; estimulo: string; pantalla: string; version: string; nClic: number; participante: string }
export function puntos(d: Dump, piloto = false): PuntoMapa[] {
  return deValidos(d, 'Puntos', piloto).map((r) => ({
    x: Number(r['X (% ancho)']), y: Number(r['Y (% alto)']), resultado: String(r['Resultado'] ?? ''), prueba: String(r['Prueba']), estimulo: String(r['Estímulo (tarea T1…T5 / card C1…C6 / par)']),
    pantalla: String(r['Pantalla ID']), version: String(r['Versión']), nClic: Number(r['N.º de clic (1 = primero)']), participante: String(r['Participante']),
  })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}
export const calor = (pts: PuntoMapa[]) => mapaCalor(pts);

// ------------------------------------------------------------------ resumen
export interface Indicador { prueba: string; indicador: string; meta: string; valor: number | null; formato: 'pct' | 'num' | 'ueq'; estado: Semaforo }
export function resumen(d: Dump, piloto = false) {
  const ps = participantes(d, piloto);
  const fases = [0, 1, 2, 3, 4].map((k) => ps.filter((p) => Number(p['Fases completadas']) === k).length);
  const completos = fases[4];
  const c5 = cincoSeg(d, piloto), cd = cards(d, piloto), pc = primerClic(d, piloto), fl = flujos(d, piloto), uq = ueq(d, piloto), mr = marca(d, piloto);
  const prop = promedio(c5.porPantalla.map((p) => p.proposito).filter((x): x is number => x != null));
  const seqAll = promedio(pc.porTarea.map((t) => t.seq).filter((x): x is number => x != null));
  const exitoFl = promedio(fl.porMision.map((m) => m.exito).filter((x): x is number => x != null));
  const ind: Indicador[] = [
    { prueba: '5 segundos', indicador: '% que identifica el propósito', meta: '≥ 80 %', valor: prop, formato: 'pct', estado: semaforo(prop, 80, 60) },
    { prueba: '5 s · Cards', indicador: '% con atención en elemento prioritario', meta: '≥ 70 %', valor: cd.atencion, formato: 'pct', estado: cd.semAtencion },
    { prueba: 'Primer clic', indicador: '% de primer clic correcto (promedio T1–T5)', meta: '≥ 80 %', valor: pc.global, formato: 'pct', estado: pc.semGlobal },
    { prueba: 'SEQ', indicador: 'SEQ promedio', meta: '≥ 5,5 de 7', valor: seqAll, formato: 'num', estado: semaforoSEQ(seqAll) },
    { prueba: 'Flujos', indicador: '% de éxito en misiones (directo + indirecto)', meta: '≥ 80 %', valor: exitoFl, formato: 'pct', estado: semaforo(exitoFl, 80, 60) },
    { prueba: 'UEQ-S', indicador: 'Experiencia general (−3…+3)', meta: '> 0,8', valor: uq.general, formato: 'ueq', estado: uq.semGen },
    { prueba: 'Marca A/B', indicador: 'Veredicto de preferencia', meta: 'binomial α = 0,05', valor: mr.preferencia.ganador ? 1 : 0, formato: 'num', estado: mr.preferencia.n === 0 ? 'sin-datos' : mr.preferencia.ganador ? 'verde' : 'amarillo' },
  ];
  return { n: ps.length, completos, fases, ind, porRonda: uniq(ps.map((p) => Number(p['Ronda']))).sort().map((r) => ({ ronda: r, n: ps.filter((p) => Number(p['Ronda']) === r).length })) };
}

// ------------------------------------------------------------------ salud
export function salud(d: Dump, ahora = Date.now()) {
  const ev = filas(d, 'Eventos');
  const ult: Record<string, { ts: number; cod: string; nombre: string; pantalla: string }> = {};
  ev.forEach((e) => { const t = Date.parse(String(e.ts)); if (!Number.isNaN(t) && (!ult[e.sesionId] || t > ult[e.sesionId].ts)) ult[e.sesionId] = { ts: t, cod: String(e.codigo), nombre: String(e.nombreMostrado), pantalla: String(e.pantalla) }; });
  const activas = Object.values(ult).filter((u) => ahora - u.ts < 5 * 60_000);
  const porMin: Record<string, number> = {};
  ev.forEach((e) => { const t = Date.parse(String(e.ts)); if (!Number.isNaN(t) && ahora - t < 15 * 60_000) { const k = new Date(Math.floor(t / 60_000) * 60_000).toISOString().slice(11, 16); porMin[k] = (porMin[k] ?? 0) + 1; } });
  const errores = filas(d, 'Errores');
  const ps = filas(d, 'Participantes');
  const incompletos = ps.filter((p) => Number(p['Fases completadas']) < 4);
  const zonas = filas(d, 'Zonas');
  const sinZona = TAREAS.filter((t) => !zonas.some((z) => z['Tarea'] === t.id && num(z['X1 (%)']) != null));
  const provisionales = ev.filter((e) => String(e.codigo).startsWith('TMP-')).length;
  return { eventos: ev.length, activas, porMin: Object.entries(porMin).sort(), errores, incompletos, sinZona, provisionales, dispositivos: uniq(ps.map((p) => String(p['Dispositivo'] ?? '').split('|')[0].slice(0, 60))).filter(Boolean) };
}
void MISIONES;
