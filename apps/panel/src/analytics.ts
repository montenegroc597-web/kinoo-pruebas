// Cálculos del Panel (protocolo v3.0: la prueba de flujos y el cuestionario de moods se analizan por separado): todo sale de las hojas del registro con las fórmulas del Excel
// Registro_Pruebas_No_Moderadas_Kinoo_v2.0.xlsx. La hoja «Eventos» no se descarga: el servidor manda su resumen (Salud).
import {
  CONTROL_CORRECTO, UEQ_PARES, esCuestionarioMoods, UEQ_S_ITEMS, UMBRALES as U, estudio, fisherExacta, mediana, promedio, semaforo, semaforoUEQ, ueqS, ueqTransformar, veredicto, welch,
  type Semaforo, type Variante, type Veredicto,
} from '@kinoo/tracking';

export type Hoja = { headers: string[]; rows: any[][] };
export type Dump = Record<string, Hoja>;
export type Fila = Record<string, any>;

/** Resumen de «Eventos» calculado en Supabase (acción resumen-eventos). */
export interface ResumenEventos {
  total: number; provisionales: number; ahora: string;
  sesiones: { sesionId: string; codigo: string; bloque: string; pantalla: string; ts: string }[];
  porMinuto: { min: string; n: number }[];
}
export const RESUMEN_VACIO: ResumenEventos = { total: 0, provisionales: 0, ahora: '', sesiones: [], porMinuto: [] };
export interface Datos { hojas: Dump; eventos: ResumenEventos }

export const filas = (d: Dump, hoja: string): Fila[] => {
  const h = d[hoja];
  return h ? h.rows.map((r) => Object.fromEntries(h.headers.map((k, i) => [k, r[i]]))) : [];
};
export const num = (v: unknown): number | null => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const nums = (a: Fila[], k: string) => a.map((r) => num(r[k])).filter((x): x is number => x != null);
const suma = (v: number[]) => v.reduce((x, y) => x + y, 0);
const pct = (n: number, d: number) => (d ? (n / d) * 100 : null);
export const contar = (claves: string[]): [string, number][] => {
  const o: Record<string, number> = {};
  claves.filter(Boolean).forEach((k) => { o[k] = (o[k] ?? 0) + 1; });
  return Object.entries(o).sort((a, b) => b[1] - a[1]);
};

// ------------------------------------------------------------------ participantes y validez (§0.3)
export interface Persona { codigo: string; variante: Variante; valido: boolean; motivos: string[]; fila: Fila; cuestionario: boolean }
/** Qué personas se cuentan: las de la prueba de flujos (Completo y Link 1), las del cuestionario de moods (Link 2) o todas. */
export type Ambito = 'flujos' | 'moods' | 'todos';
const FLUJO_COL = 'Flujo (Completo / Link 1 / Link 2)';
/** El cuestionario de moods dura menos: su duración mínima nunca pasa de 3 min. */
const duracionMinima = (cuestionario: boolean) => (cuestionario ? Math.min(U.duracionMinima, 3) : U.duracionMinima);
/**
 * Moods y Películas vienen del cuestionario (Link 2) y, en las rondas del v2.0, también del link completo: se leen de todas las personas
 * válidas. El resto de hojas son de la prueba de flujos y NO cuentan al cuestionario.
 */
const ambitoDe = (hoja: string): Ambito => (hoja === 'Moods' || hoja === 'Películas' ? 'todos' : 'flujos');
/**
 * «Válido (auto)» del Excel: completó, pasó el control de atención («marca la opción 5»), duró al menos la duración mínima y no
 * fue excluido a mano. El piloto (ronda 0) se excluye salvo que se pida.
 */
export function personas(d: Datos, incluirPiloto = false, ambito: Ambito = 'todos'): Persona[] {
  return filas(d.hojas, 'Participantes').filter((p) => incluirPiloto || Number(p['Ronda']) !== 0).filter((p) => ambito === 'todos' || esCuestionarioMoods(String(p[FLUJO_COL] ?? '')) === (ambito === 'moods')).map((p) => {
    const cuestionario = esCuestionarioMoods(String(p[FLUJO_COL] ?? ''));
    const motivos: string[] = [];
    if (p['Completó (Sí/No)'] !== 'Sí') motivos.push('no completó');
    if (num(p['Control de atención']) !== CONTROL_CORRECTO) motivos.push('falló el control de atención');
    if ((num(p['Duración (min)']) ?? 0) < duracionMinima(cuestionario)) motivos.push(`menos de ${duracionMinima(cuestionario)} min`);
    if (String(p['Excluir a mano (Sí)']).trim().toLowerCase() === 'sí') motivos.push('excluido a mano');
    return { codigo: String(p['Código']), variante: p['Variante de card (A/B)'] === 'B' ? 'B' : 'A', valido: motivos.length === 0, motivos, fila: p, cuestionario };
  });
}
/** Filas de una hoja de módulo solo de personas válidas (opcionalmente de una card). */
export function deValidos(d: Datos, hoja: string, piloto = false, variante?: Variante): Fila[] {
  const ok = new Map(personas(d, piloto, ambitoDe(hoja)).filter((p) => p.valido && (!variante || p.variante === variante)).map((p) => [p.codigo, p.variante]));
  return filas(d.hojas, hoja).filter((r) => ok.has(String(r['Participante']))).map((r) => ({ ...r, __variante: ok.get(String(r['Participante'])) }));
}

// ------------------------------------------------------------------ indicadores
/** `verde` = la meta (para dibujarla en la barra); `signo` = si se cumple por encima (≥) o por debajo (≤). */
export interface Indicador { id: string; nombre: string; meta: string; valor: number | null; formato: 'pct' | 'num' | 'ueq'; estado: Semaforo; n: number; verde: number; signo: string }
const ind = (id: string, nombre: string, valor: number | null, formato: Indicador['formato'], verde: number, amarillo: number, n: number, signo = '≥'): Indicador => ({
  id, nombre, valor, formato, n, verde, signo, meta: `${signo} ${String(verde).replace('.', ',')}${formato === 'pct' ? ' %' : ''}`, estado: formato === 'ueq' ? semaforoUEQ(valor) : semaforo(valor, verde, amarillo),
});
/** % de filas con código 1 (respuestas codificadas 1 / 0,5 / 0); solo cuenta las ya codificadas. */
const pctUno = (rs: Fila[], col: string) => { const v = nums(rs, col); return { valor: pct(v.filter((x) => x === 1).length, v.length), n: v.length }; };
/** % de personas que saltó la tarea (entre las que la registraron). */
const pctSalto = (rs: Fila[], col: string) => { const v = rs.map((r) => String(r[col] ?? '')).filter(Boolean); return pct(v.filter((x) => x === 'La saltó').length, v.length); };
const prom = (rs: Fila[], col: string) => { const v = nums(rs, col); return { valor: promedio(v), n: v.length }; };

// ------------------------------------------------------------------ M1 · Descubrir
export function descubrir(d: Datos, piloto = false, variante?: Variante) {
  const rs = deValidos(d, 'Descubrir', piloto, variante);
  const prior = pctUno(rs, '¿Prioritario? (auto)');
  const d1b = pctUno(rs, 'D1b · Propósito de la pantalla (1/0,5/0)'), d1c = pctUno(rs, 'D1c · Qué haría con la card (1/0,5/0)');
  const d2 = pctUno(rs, 'D2 · Gesto «me interesa» (1 correcto · 0,5 alternativo · 0 incorrecto)'), d3 = pctUno(rs, 'D3 · Gesto «no me interesa» (1 · 0,5 · 0)');
  const ant = pctUno(rs.flatMap((r) => [{ v: r['D2b · Consecuencia esperada (1/0,5/0)'] }, { v: r['D3b · Consecuencia esperada (1/0,5/0)'] }]), 'v');
  const d4a = pctUno(rs, 'D4a · Interpretación del match (1/0,5/0)');
  const tipo = rs.map((r) => String(r['D4c · Tipo de sorpresa'] ?? '')).filter(Boolean);
  const seq = { valor: promedio([...nums(rs, 'D2a · SEQ 1–7'), ...nums(rs, 'D3a · SEQ 1–7')]), n: rs.length };
  const llego = pctUno(rs, 'D4 · Llegó al resumen (1/0)');
  const indicadores: Indicador[] = [
    ind('D1a', 'Primer elemento mirado es prioritario', prior.valor, 'pct', U.primerElemento, U.comprensionAmarillo, prior.n),
    ind('D1b', 'Entiende para qué sirve la pantalla', d1b.valor, 'pct', U.comprension, U.comprensionAmarillo, d1b.n),
    ind('D1c', 'Sabe qué hacer con la card', d1c.valor, 'pct', U.comprension, U.comprensionAmarillo, d1c.n),
    ind('D1d', 'Interés en la película (1–7)', prom(rs, 'D1d · Interés en la película 1–7').valor, 'num', U.opinion, U.opinionAmarillo, rs.length),
    ind('D2', 'Gesto correcto «me interesa»', d2.valor, 'pct', U.gesto, U.gestoAmarillo, d2.n),
    ind('D3', 'Gesto correcto «no me interesa»', d3.valor, 'pct', U.gesto, U.gestoAmarillo, d3.n),
    ind('SEQ', 'Facilidad del gesto (SEQ)', seq.valor, 'num', U.seq, U.seqAmarillo, seq.n),
    ind('D2b', 'Anticipa la consecuencia del gesto', ant.valor, 'pct', U.comprension, U.comprensionAmarillo, ant.n),
    ind('D4', 'Completa el mazo y llega a su resumen', llego.valor, 'pct', U.gesto, U.gestoAmarillo, llego.n),
    ind('D4e', 'Facilidad de completar el mazo (SEQ)', prom(rs, 'D4e · SEQ 1–7').valor, 'num', U.seq, U.seqAmarillo, rs.length),
    ind('D4a', 'Entiende qué dice el mazo de él/ella', d4a.valor, 'pct', U.comprension, U.comprensionAmarillo, d4a.n),
    ind('D4c', 'Lo que dice el mazo sorprende para bien', pct(tipo.filter((t) => t === 'Agradable').length, tipo.length), 'pct', U.sorpresaAgradable, U.sorpresaAgradableAmarillo, tipo.length),
    ind('D4d', 'Ganas de ver lo que eligió (1–7)', prom(rs, 'D4d · Ganas de ver lo sugerido 1–7').valor, 'num', U.opinion, U.opinionAmarillo, rs.length),
  ];
  return {
    n: rs.length, indicadores,
    tiempos: { d2: mediana(nums(rs, 'D2 · Tiempo hasta el gesto (s)')), d3: mediana(nums(rs, 'D3 · Tiempo hasta el gesto (s)')), fueraD2: promedio(nums(rs, 'D2 · Toques fuera de lugar (n)')), fueraD3: promedio(nums(rs, 'D3 · Toques fuera de lugar (n)')), d4: mediana(nums(rs, 'D4 · Tiempo hasta el resumen (s)')) },
    saltos: { d2: pctSalto(rs, 'D2 · Resultado de la tarea'), d3: pctSalto(rs, 'D3 · Resultado de la tarea'), d4: pctSalto(rs, 'D4 · Resultado de la tarea') },
    confusiones: contar(rs.map((r) => String(r['D4f · Qué le confundió'] ?? '').trim())),
    gestos: { d2: contar(rs.map((r) => String(r['D2 · Gesto hecho'] ?? ''))), d3: contar(rs.map((r) => String(r['D3 · Gesto hecho'] ?? ''))) },
    sorpresa: promedio(nums(rs, 'D4b · Sorpresa 1–7')), tipoSorpresa: contar(tipo),
    primerElemento: contar(rs.map((r) => String(r['D1a · Primer elemento que llamó la atención'] ?? ''))),
    motivos: contar([...rs.map((r) => String(r['Motivo si falló el gesto (código)'] ?? '')), ...rs.map((r) => String(r['Motivo si no entendió la pantalla o el match (código)'] ?? ''))]),
  };
}

// ------------------------------------------------------------------ M2 · Ver
export function ver(d: Datos, piloto = false, variante?: Variante) {
  const rs = deValidos(d, 'Ver', piloto, variante);
  const v1c = pctUno(rs, 'V1c · Entiende para qué sirve el filtro (1/0,5/0)');
  const util = prom(rs, 'V3b · Utilidad del filtro 1–7');
  const conf = prom(rs, 'Índice de confianza (auto, 1–7)');
  const indicadores: Indicador[] = [
    ind('V1a', 'Entiende para qué sirve la pantalla', pctUno(rs, 'V1a · Propósito de la pantalla (1/0,5/0)').valor, 'pct', U.comprension, U.comprensionAmarillo, pctUno(rs, 'V1a · Propósito de la pantalla (1/0,5/0)').n),
    ind('V1b', 'Claridad de la pantalla (1–7)', prom(rs, 'V1b · Claridad 1–7').valor, 'num', U.opinion, U.opinionAmarillo, rs.length),
    ind('V1c', 'Entiende el filtro SIN explicación', v1c.valor, 'pct', U.filtroSinExplicacion, U.filtroSinExplicacionAmarillo, v1c.n),
    ind('V1d', 'Anticipa qué pasa al moverlo', pctUno(rs, 'V1d · Qué espera al moverlo (1/0,5/0)').valor, 'pct', U.filtroSinExplicacion, U.filtroSinExplicacionAmarillo, pctUno(rs, 'V1d · Qué espera al moverlo (1/0,5/0)').n),
    ind('V2', 'Llega al mood correcto', pctUno(rs, 'V2 · Mood alcanzado (1 correcto · 0,5 cercano · 0 otro)').valor, 'pct', U.gesto, U.gestoAmarillo, rs.length),
    ind('V2a', 'Facilidad de la tarea (SEQ)', prom(rs, 'V2a · SEQ 1–7').valor, 'num', U.seq, U.seqAmarillo, rs.length),
    ind('V3b', 'Utilidad del filtro (1–7)', util.valor, 'num', U.opinion, U.opinionAmarillo, util.n),
    ind('V4', 'Índice de confianza (1–7)', conf.valor, 'num', U.confianza, U.confianzaAmarillo, conf.n),
    ind('V4d', 'Ganas de ver la recomendada (1–7)', prom(rs, 'V4d · Ganas de ver la película 1–7').valor, 'num', U.opinion, U.opinionAmarillo, rs.length),
  ];
  // lectura combinada de V1c y V3b (§2, criterios de éxito)
  const lectura = v1c.valor == null || util.valor == null ? '' : v1c.valor >= U.filtroSinExplicacion ? 'La interfaz del filtro se explica sola.'
    : v1c.valor < U.filtroSinExplicacionAmarillo && util.valor >= U.opinion ? 'El concepto sirve, pero falta una pista visual o un texto breve.'
    : v1c.valor < U.filtroSinExplicacionAmarillo && util.valor < U.opinionAmarillo ? 'Hay que replantear el filtro.' : 'Zona intermedia: revisar la barra antes de construir.';
  return {
    n: rs.length, indicadores, lectura, confianzaBaja: conf.valor != null && conf.valor < 4.5,
    moodFinal: contar(rs.map((r) => String(r['V2 · Mood en el que terminó'] ?? ''))),
    v2: { tiempo: mediana(nums(rs, 'V2 · Tiempo hasta terminar (s)')), movimientos: promedio(nums(rs, 'V2 · Movimientos de la barra (n)')), fuera: promedio(nums(rs, 'V2 · Toques fuera de lugar (n)')), salto: pctSalto(rs, 'V2 · Resultado de la tarea') },
    expectativa: contar(rs.map((r) => String(r['V3a · ¿Era lo que esperabas?'] ?? ''))), preferencia: contar(rs.map((r) => String(r['V3c · Preferencia'] ?? ''))),
    cambios: rs.map((r) => String(r['V3d · Qué cambiaría del filtro'] ?? '')).filter(Boolean),
  };
}

// ------------------------------------------------------------------ M3 · Moods
export function moods(d: Datos, piloto = false) {
  const cfg = estudio();
  const rs = deValidos(d, 'Moods', piloto), ps = deValidos(d, 'Películas', piloto);
  const categorias = [...cfg.moods.map((m) => m.nombre), 'Otra película', 'Ninguna / no sé'];
  const porMood = cfg.moods.map((m) => {
    const a = rs.filter((r) => r['Mood'] === m.nombre);
    const ac = nums(a, '¿Acierta? (auto)');
    const acierto = pct(ac.filter((x) => x === 1).length, ac.length);
    const conf = contar(a.map((r) => String(r['Mood con el que lo confundió (auto)'] ?? '')));
    const pelis = ps.filter((p) => p['Mood previsto'] === m.nombre);
    const coincide = pct(nums(pelis, '¿Coincide con el previsto? (auto)').filter((x) => x === 1).length, nums(pelis, '¿Coincide con el previsto? (auto)').length);
    const sig = pctUno(a, 'M3a · Significado abierto (1/0,5/0) (solo 3 moods por persona)');
    // §3 «Cómo decidir qué hacer con cada mood»
    const dominante = conf[0] && conf[0][0] !== 'Otra película' && conf[0][0] !== 'Ninguna / no sé' ? conf[0][0] : '';
    const accion = acierto == null ? '' : acierto >= U.moodAcierto && (coincide == null || coincide >= U.peliculaMood) ? 'Mantener'
      : acierto >= U.moodAcierto ? 'Cambiar la película o la definición'
      : acierto < U.moodAciertoAmarillo && !dominante ? 'Renombrar (ver nombres propios)' : dominante ? `Diferenciar de «${dominante}» o fusionar` : 'Revisar';
    return {
      mood: m.nombre, n: a.length, acierto, estado: semaforo(acierto, U.moodAcierto, U.moodAciertoAmarillo), confusiones: conf,
      fila: categorias.map((c) => c === m.nombre ? ac.filter((x) => x === 1).length : a.filter((r) => r['Mood con el que lo confundió (auto)'] === c).length),
      significado: sig.valor, nSignificado: sig.n, claridad: promedio(nums(a, 'M3b · Claridad 1–7 (solo esos 3)')), tiempo: promedio(nums(a, 'M3c · Tiempo (s)')),
      peliculaAMood: coincide, accion,
    };
  });
  const porPelicula = cfg.peliculasM3d.map((p) => {
    const a = ps.filter((r) => r['Película'] === p.titulo);
    const c = nums(a, '¿Coincide con el previsto? (auto)');
    return {
      titulo: p.titulo, previsto: p.moodPrevisto, n: a.length, coincide: pct(c.filter((x) => x === 1).length, c.length),
      estado: semaforo(pct(c.filter((x) => x === 1).length, c.length), U.peliculaMood, U.peliculaMoodAmarillo),
      asociado: contar(a.map((r) => String(r['M3d · Mood con el que la asocia'] ?? ''))), nombres: contar(a.map((r) => String(r['M3e · Nombre que le pondría'] ?? '').trim().toLowerCase())),
    };
  });
  const todos = nums(rs, '¿Acierta? (auto)');
  const total = pct(todos.filter((x) => x === 1).length, todos.length);
  return { porMood, porPelicula, categorias, total, estadoTotal: semaforo(total, U.moodAcierto, U.moodAciertoAmarillo), personas: new Set(rs.map((r) => r['Participante'])).size };
}

// ------------------------------------------------------------------ M4 · Mazos
export function mazos(d: Datos, piloto = false, variante?: Variante) {
  const cfg = estudio();
  const rs = deValidos(d, 'Mazos', piloto, variante);
  const ideas = nums(rs, 'Ideas clave captadas (auto, 0–4)'), frases = nums(rs, 'Frases acertadas (auto, 0–4)');
  const z4 = nums(rs, '¿Acierta? (auto)');
  const indicadores: Indicador[] = [
    ind('Z1', 'Ideas clave captadas', ideas.length ? (promedio(ideas)! / 4) * 100 : null, 'pct', U.mazoIdeas, U.mazoIdeasAmarillo, ideas.length),
    ind('Z2', 'Frases acertadas', frases.length ? (promedio(frases)! / 4) * 100 : null, 'pct', U.mazoFrases, U.mazoFrasesAmarillo, frases.length),
    ind('Z3', 'Primer clic correcto', pctUno(rs, 'Z3 · Primer clic para controlar el contenido (1 · 0,5 · 0)').valor, 'pct', U.gesto, U.gestoAmarillo, rs.length),
    ind('Z3a', 'Facilidad de Z3 (SEQ)', prom(rs, 'Z3a · SEQ 1–7').valor, 'num', U.seq, U.seqAmarillo, rs.length),
    ind('Z4', 'Anticipa la consecuencia', pct(z4.filter((x) => x === 1).length, z4.length), 'pct', U.comprension, U.comprensionAmarillo, z4.length),
    ind('Z5a', 'Claridad de cómo funciona (1–7)', prom(rs, 'Z5a · Claridad de cómo funciona 1–7').valor, 'num', U.opinion, U.opinionAmarillo, rs.length),
    ind('Z5b', 'Utilidad de tener mazos (1–7)', prom(rs, 'Z5b · Utilidad de tener mazos 1–7').valor, 'num', U.opinion, U.opinionAmarillo, rs.length),
  ];
  const porFrase = cfg.mazos.frases.map((f, i) => {
    const r = rs.map((x) => x[`Z2 · Frase ${i + 1}`]).filter(Boolean);
    return { texto: f.texto, correcta: f.correcta, acierto: pct(r.filter((x) => x === f.correcta).length, r.length), noSe: pct(r.filter((x) => x === 'No sé').length, r.length) };
  });
  const porIdea = cfg.mazos.ideas.map((t, i) => ({ texto: t, pct: pctUno(rs, i === 0 ? 'Z1 · Idea clave 1 mencionada (1/0)' : `Z1 · Idea clave ${i + 1} (1/0)`).valor }));
  return { n: rs.length, indicadores, porFrase, porIdea, z3Tiempo: mediana(nums(rs, 'Z3 · Tiempo al primer clic (s)')), z4: contar(rs.map((r) => String(r['Z4 · Consecuencia que espera'] ?? ''))) };
}

// ------------------------------------------------------------------ M5 · Percepción
const UEQ_COL = (i: number) => `F3 · UEQ-S ítem ${i}: ${UEQ_PARES[i - 1][0]} (1) – ${UEQ_PARES[i - 1][1]} (7)`;
export function percepcion(d: Datos, piloto = false, variante?: Variante) {
  const rs = deValidos(d, 'Percepción', piloto, variante);
  const porPersona = rs.map((r) => ueqS(Object.fromEntries(UEQ_S_ITEMS.map((i) => [i, num(r[UEQ_COL(i)])]).filter(([, v]) => v != null)) as Record<number, number>));
  const media = (k: 'pragmatica' | 'hedonica' | 'general') => promedio(porPersona.map((x) => x[k]).filter((x): x is number => x != null));
  const indicadores: Indicador[] = [
    ind('F1', 'Qué tan chévere (1–7)', prom(rs, 'F1 · Qué tan chévere 1–7').valor, 'num', U.confianza, U.confianzaAmarillo, rs.length),
    ind('F2', 'Probabilidad de usar una app así (1–7)', prom(rs, 'F2 · Probabilidad de usar una app así 1–7').valor, 'num', U.opinion, U.opinionAmarillo, rs.length),
    ind('UEQP', 'UEQ-S pragmática (−3…+3)', media('pragmatica'), 'ueq', U.ueq, U.ueqAmarillo, porPersona.length, '>'),
    ind('UEQH', 'UEQ-S hedónica (−3…+3)', media('hedonica'), 'ueq', U.ueq, U.ueqAmarillo, porPersona.length, '>'),
    ind('UEQG', 'UEQ-S general (−3…+3)', media('general'), 'ueq', U.ueq, U.ueqAmarillo, porPersona.length, '>'),
  ];
  const items = UEQ_S_ITEMS.map((i) => ({ item: i, izq: UEQ_PARES[i - 1][0], der: UEQ_PARES[i - 1][1], media: promedio(nums(rs, UEQ_COL(i)).map((x) => ueqTransformar(i, x))) }))
    .sort((a, b) => (a.media ?? 9) - (b.media ?? 9));
  return { n: rs.length, indicadores, items, comentarios: rs.map((r) => String(r['F4 · Qué cambiaría (texto)'] ?? '')).filter(Boolean), porPersona };
}

// ------------------------------------------------------------------ comparación A/B (§6)
export interface MetricaAB {
  id: string; nombre: string; tipo: 'Porcentaje' | 'Escala 1–7' | 'Tiempo (s)' | 'UEQ-S'; mejor: 'mayor' | 'menor'; primaria: boolean;
  a: number | null; b: number | null; nA: number; nB: number; dif: number | null; p: number | null; veredicto: Veredicto; pequeno: boolean; favorece: Variante | null;
}
type DefAB = { id: string; nombre: string; hoja: string; tipo: MetricaAB['tipo']; col?: string; valor?: (r: Fila) => number | null; uno?: boolean; mejor?: 'mayor' | 'menor'; primaria?: boolean };
const UEQ_DE = (k: 'pragmatica' | 'hedonica' | 'general') => (r: Fila) => ueqS(Object.fromEntries(UEQ_S_ITEMS.map((i) => [i, num(r[UEQ_COL(i)])]).filter(([, v]) => v != null)) as Record<number, number>)[k];
/** Las 22 métricas de la hoja «Comparación A-B»; las 5 primarias deciden (§6 «Regla de decisión»). */
export const METRICAS_AB: DefAB[] = [
  { id: 'D1a', nombre: 'Primer elemento mencionado es un elemento prioritario', hoja: 'Descubrir', tipo: 'Porcentaje', col: '¿Prioritario? (auto)', uno: true },
  { id: 'D1b', nombre: 'Entiende para qué sirve la pantalla', hoja: 'Descubrir', tipo: 'Porcentaje', col: 'D1b · Propósito de la pantalla (1/0,5/0)', uno: true, primaria: true },
  { id: 'D1c', nombre: 'Entiende qué hacer con la card', hoja: 'Descubrir', tipo: 'Porcentaje', col: 'D1c · Qué haría con la card (1/0,5/0)', uno: true, primaria: true },
  { id: 'D2', nombre: 'Hace el gesto correcto cuando la película le interesa', hoja: 'Descubrir', tipo: 'Porcentaje', col: 'D2 · Gesto «me interesa» (1 correcto · 0,5 alternativo · 0 incorrecto)', uno: true, primaria: true },
  { id: 'D3', nombre: 'Hace el gesto correcto cuando la película no le interesa', hoja: 'Descubrir', tipo: 'Porcentaje', col: 'D3 · Gesto «no me interesa» (1 · 0,5 · 0)', uno: true, primaria: true },
  { id: 'D2b', nombre: 'Anticipa la consecuencia del gesto «me interesa»', hoja: 'Descubrir', tipo: 'Porcentaje', col: 'D2b · Consecuencia esperada (1/0,5/0)', uno: true },
  { id: 'D4a', nombre: 'Entiende qué dice el mazo (resumen)', hoja: 'Descubrir', tipo: 'Porcentaje', col: 'D4a · Interpretación del match (1/0,5/0)', uno: true },
  { id: 'D4c', nombre: 'Lo que dice el mazo sorprende para bien', hoja: 'Descubrir', tipo: 'Porcentaje', valor: (r) => (r['D4c · Tipo de sorpresa'] ? (r['D4c · Tipo de sorpresa'] === 'Agradable' ? 1 : 0) : null), uno: true },
  { id: 'D1d', nombre: 'Interés en la película (1–7)', hoja: 'Descubrir', tipo: 'Escala 1–7', col: 'D1d · Interés en la película 1–7', primaria: true },
  { id: 'D2a', nombre: 'Facilidad del gesto «me interesa» (SEQ, 1–7)', hoja: 'Descubrir', tipo: 'Escala 1–7', col: 'D2a · SEQ 1–7' },
  { id: 'D3a', nombre: 'Facilidad del gesto «no me interesa» (SEQ, 1–7)', hoja: 'Descubrir', tipo: 'Escala 1–7', col: 'D3a · SEQ 1–7' },
  { id: 'D4b', nombre: 'Sorpresa con el resumen del mazo (1–7)', hoja: 'Descubrir', tipo: 'Escala 1–7', col: 'D4b · Sorpresa 1–7' },
  { id: 'D4d', nombre: 'Ganas de ver las películas elegidas en el mazo (1–7)', hoja: 'Descubrir', tipo: 'Escala 1–7', col: 'D4d · Ganas de ver lo sugerido 1–7' },
  { id: 'V4', nombre: 'Índice de confianza en la recomendación (1–7)', hoja: 'Ver', tipo: 'Escala 1–7', col: 'Índice de confianza (auto, 1–7)' },
  { id: 'V4d', nombre: 'Ganas de ver la película recomendada en Ver (1–7)', hoja: 'Ver', tipo: 'Escala 1–7', col: 'V4d · Ganas de ver la película 1–7' },
  { id: 'F1', nombre: 'Qué tan chévere le parece (1–7)', hoja: 'Percepción', tipo: 'Escala 1–7', col: 'F1 · Qué tan chévere 1–7' },
  { id: 'F2', nombre: 'Probabilidad de usar una app así (1–7)', hoja: 'Percepción', tipo: 'Escala 1–7', col: 'F2 · Probabilidad de usar una app así 1–7' },
  { id: 'D2t', nombre: 'Tiempo hasta el gesto «me interesa» (s)', hoja: 'Descubrir', tipo: 'Tiempo (s)', col: 'D2 · Tiempo hasta el gesto (s)', mejor: 'menor' },
  { id: 'D3t', nombre: 'Tiempo hasta el gesto «no me interesa» (s)', hoja: 'Descubrir', tipo: 'Tiempo (s)', col: 'D3 · Tiempo hasta el gesto (s)', mejor: 'menor' },
  { id: 'UEQG', nombre: 'UEQ-S general (−3 a +3)', hoja: 'Percepción', tipo: 'UEQ-S', valor: UEQ_DE('general') },
  { id: 'UEQP', nombre: 'UEQ-S pragmática (−3 a +3)', hoja: 'Percepción', tipo: 'UEQ-S', valor: UEQ_DE('pragmatica') },
  { id: 'UEQH', nombre: 'UEQ-S hedónica (−3 a +3)', hoja: 'Percepción', tipo: 'UEQ-S', valor: UEQ_DE('hedonica') },
];

export function comparacionAB(d: Datos, piloto = false) {
  const ps = personas(d, piloto, 'flujos').filter((p) => p.valido);
  const nPorCard = { A: ps.filter((p) => p.variante === 'A').length, B: ps.filter((p) => p.variante === 'B').length };
  const metricas: MetricaAB[] = METRICAS_AB.map((m) => {
    const vals = (v: Variante) => deValidos(d, m.hoja, piloto, v).map((r) => (m.valor ? m.valor(r) : num(r[m.col!]))).filter((x): x is number => x != null);
    const xa = vals('A'), xb = vals('B'), mejor = m.mejor ?? 'mayor';
    let a: number | null, b: number | null, p: number | null, minimo: number;
    if (m.uno) {
      const ka = xa.filter((x) => x === 1).length, kb = xb.filter((x) => x === 1).length;
      a = pct(ka, xa.length); b = pct(kb, xb.length); p = xa.length && xb.length ? fisherExacta(ka, xa.length, kb, xb.length) : null; minimo = U.difPorcentaje;
    } else {
      a = promedio(xa); b = promedio(xb); p = welch(xa, xb);
      minimo = m.tipo === 'UEQ-S' ? U.difUeq : m.tipo === 'Tiempo (s)' ? (U.difTiempo / 100) * Math.max(a ?? 0, b ?? 0) : U.difEscala;
    }
    const dif = a != null && b != null ? a - b : null;
    const v = veredicto(p, dif, minimo, xa.length, xb.length);
    const favorece: Variante | null = dif == null || dif === 0 || v.veredicto === 'Sin diferencia' || v.veredicto === 'Sin datos' ? null : (dif > 0) === (mejor === 'mayor') ? 'A' : 'B';
    return { id: m.id, nombre: m.nombre, tipo: m.tipo, mejor, primaria: !!m.primaria, a, b, nA: xa.length, nB: xb.length, dif, p, ...v, favorece };
  });
  // gana la card con diferencia clara a su favor en ≥ 1 primaria y ninguna clara en contra entre las primarias
  const prim = metricas.filter((m) => m.primaria && m.veredicto === 'Diferencia clara');
  const gana = (['A', 'B'] as const).find((c) => prim.some((m) => m.favorece === c) && !prim.some((m) => m.favorece && m.favorece !== c)) ?? null;
  const soloTendencias = !prim.length && metricas.some((m) => m.primaria && m.veredicto === 'Tendencia');
  const lectura = gana ? `Gana la card ${gana}: tiene diferencia clara a su favor en ${prim.filter((m) => m.favorece === gana).map((m) => m.id).join(', ')} y ninguna en contra entre las primarias.`
    : soloTendencias ? `Solo hay tendencias: ampliar la muestra a ${U.validosPorVariante + 5} por card antes de decidir.`
    : 'Sin diferencias claras en las métricas primarias: decidir por criterios de equipo (costo de construcción, coherencia con la marca).';
  return { metricas, nPorCard, gana, lectura, pequeno: nPorCard.A < U.minimoTendencia || nPorCard.B < U.minimoTendencia };
}

// ------------------------------------------------------------------ resumen («Insights»)
export function resumen(d: Datos, piloto = false) {
  const ps = personas(d, piloto, 'flujos');
  const validas = ps.filter((p) => p.valido);
  const qs = personas(d, piloto, 'moods');
  const indicadores = [
    ...descubrir(d, piloto).indicadores.map((i) => ({ ...i, modulo: 'M1 · Descubrir' })),
    ...ver(d, piloto).indicadores.map((i) => ({ ...i, modulo: 'M2 · Ver' })),
    ...mazos(d, piloto).indicadores.map((i) => ({ ...i, modulo: 'M4 · Mazos' })),
    ...percepcion(d, piloto).indicadores.map((i) => ({ ...i, modulo: 'M5 · Percepción' })),
  ];
  return {
    cuestionario: { abrieron: qs.length, validas: qs.filter((p) => p.valido).length, completaron: qs.filter((p) => p.fila['Completó (Sí/No)'] === 'Sí').length },
    abrieron: ps.length, validas: validas.length, completaron: ps.filter((p) => p.fila['Completó (Sí/No)'] === 'Sí').length,
    porCard: { A: validas.filter((p) => p.variante === 'A').length, B: validas.filter((p) => p.variante === 'B').length },
    porFlujo: contar(ps.map((p) => String(p.fila['Flujo (Completo / Link 1 / Link 2)'] ?? ''))),
    porSistema: contar(ps.map((p) => String(p.fila['Dispositivo'] ?? ''))),
    porVersionTextos: contar(ps.map((p) => String(p.fila['Versión de textos'] || 'protocolo'))),
    porVersionEstudio: contar(ps.map((p) => String(p.fila['Versión del estudio'] || 'inicial'))),
    descartes: contar(ps.flatMap((p) => p.motivos)),
    indicadores,
  };
}

// ------------------------------------------------------------------ mapas y salud
export interface PuntoMapa { x: number; y: number; tarea: string; tipo: string; dir: string; resultado: string; n: number; variante: string; pantalla: string }
export function puntos(d: Datos, piloto = false): PuntoMapa[] {
  return deValidos(d, 'Puntos', piloto).map((r) => ({
    x: Number(r['X (% ancho)']), y: Number(r['Y (% alto)']), tarea: String(r['Tarea']), tipo: String(r['Tipo (toque / gesto)']), dir: String(r['Dirección'] ?? ''),
    resultado: String(r['Resultado'] ?? ''), n: Number(r['N.º de toque (1 = primero)']), variante: String(r['__variante']), pantalla: String(r['Pantalla']),
  })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

export function salud(d: Datos) {
  const ev = d.eventos;
  const ahora = Date.parse(ev.ahora) || Date.now(); // reloj del servidor
  const ps = filas(d.hojas, 'Participantes');
  return {
    eventos: ev.total, activas: ev.sesiones.filter((s) => ahora - Date.parse(s.ts) < 5 * 60_000), porMin: ev.porMinuto, provisionales: ev.provisionales,
    errores: filas(d.hojas, 'Errores'), incompletos: ps.filter((p) => p['Completó (Sí/No)'] !== 'Sí'),
  };
}
