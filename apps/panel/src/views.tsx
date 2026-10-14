import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import { HOJAS, MOTIVOS, ORDEN_EXCEL, TIPOS_NOTA, UMBRALES, estudio, type Semaforo } from '@kinoo/tracking';
import {
  comparacionAB, contar, descubrir, filas, mazos, moods, num, percepcion, personas, puntos, resumen, salud, ver,
  type Datos, type Fila, type Hoja, type Indicador,
} from './analytics';
import { Heat } from './Heat';
import { codificar, fetchEventos, type Conexion } from './api';

export const Tag = ({ s, children }: { s: Semaforo; children?: React.ReactNode }) => <span className={'pn-tag ' + s}>{children ?? ({ verde: 'cumple', amarillo: 'revisar', rojo: 'rediseñar', 'sin-datos': 'sin datos' } as const)[s]}</span>;
export const f1 = (n: number | null | undefined, suf = '') => (n == null || Number.isNaN(n) ? '—' : (Math.round(n * 10) / 10).toString().replace('.', ',') + suf);
const fp = (p: number | null) => (p == null ? '—' : p < 0.001 ? '< 0,001' : String(Math.round(p * 1000) / 1000).replace('.', ','));
const Titulo = ({ t, q }: { t: string; q: string }) => <><h2>{t}</h2><div className="pn-q">{q}</div></>;
const Aviso = ({ n }: { n: number }) => (n < UMBRALES.minimoTendencia
  ? <div className="pn-warn">Con {n} {n === 1 ? 'persona válida' : 'personas válidas'} (menos de {UMBRALES.minimoTendencia}) léelo como pista, no como conclusión. Con 15 personas un 70 % puede ser en realidad entre 45 % y 88 %.</div> : null);
const valor = (i: Indicador) => (i.formato === 'pct' ? f1(i.valor, ' %') : f1(i.valor));
const Lista = ({ titulo, items, vacio = '—' }: { titulo: string; items: [string, number][]; vacio?: string }) => (
  <div className="pn-card"><h3>{titulo}</h3>{items.length ? items.map(([k, n]) => <div key={k} className="pn-row" style={{ justifyContent: 'space-between' }}><span>{k}</span><b>{n}</b></div>) : <span className="pn-sub">{vacio}</span>}</div>
);
const Citas = ({ titulo, textos }: { titulo: string; textos: string[] }) => (textos.length ? <div className="pn-card"><h3>{titulo}</h3>{textos.slice(0, 30).map((t, i) => <div key={i} className="pn-quote">{t}</div>)}</div> : null);

/** Tabla de indicadores con semáforo; con `porCard` añade las columnas de la card A y la B. */
function Indicadores({ items, porCard }: { items: (Indicador & { modulo?: string })[]; porCard?: { A: Indicador[]; B: Indicador[] } }) {
  return (
    <div className="pn-card" style={{ overflow: 'auto' }}>
      <table><thead><tr>{items[0]?.modulo && <th>Módulo</th>}<th>Indicador</th><th>Meta</th><th>Resultado</th><th>n</th><th>Estado</th>{porCard && <><th>Card A</th><th>Card B</th></>}</tr></thead><tbody>
        {items.map((i, k) => (
          <tr key={i.id + k}>
            {i.modulo && <td className="pn-sub">{i.modulo}</td>}
            <td>{i.nombre} <span className="pn-sub">({i.id})</span></td><td className="pn-sub">{i.meta}</td><td><b>{valor(i)}</b></td><td className="pn-sub">{i.n}</td><td><Tag s={i.estado} /></td>
            {porCard && <><td>{valor(porCard.A[k])}</td><td>{valor(porCard.B[k])}</td></>}
          </tr>
        ))}
      </tbody></table>
    </div>
  );
}

// ---------------------------------------------------------------- resumen
export function Resumen({ d, piloto }: { d: Datos; piloto: boolean }) {
  const r = useMemo(() => resumen(d, piloto), [d, piloto]);
  const s = useMemo(() => salud(d), [d]);
  const ab = useMemo(() => comparacionAB(d, piloto), [d, piloto]);
  return (
    <>
      <Titulo t="Resumen" q="¿Cuántas personas válidas hay por card y cumplimos las metas?" />
      <div className="pn-grid">
        <div className="pn-card"><div className="pn-big">{r.validas}</div><div className="pn-sub">personas válidas de {r.abrieron} que abrieron el link · {r.completaron} completaron</div></div>
        <div className="pn-card"><div className="pn-big">{r.porCard.A} / {r.porCard.B}</div><div className="pn-sub">válidas en la card A / B · meta {UMBRALES.validosPorVariante} por card (mínimo {UMBRALES.minimoTendencia} para leer una tendencia)</div></div>
        <div className="pn-card"><div className="pn-big">{s.activas.length}</div><div className="pn-sub">respondiendo ahora</div></div>
      </div>
      {r.descartes.length > 0 && <div className="pn-warn">Descartadas por: {r.descartes.map(([k, n]) => `${k} (${n})`).join(' · ')}. Revisa la vista Participantes.</div>}
      {r.porVersionTextos.length > 1 && <div className="pn-warn">Hay personas con distintas versiones de los textos ({r.porVersionTextos.map(([v, n]) => `${v}: ${n}`).join(' · ')}): no todas leyeron la misma redacción.</div>}
      {r.porVersionEstudio.length > 1 && <div className="pn-warn">Hay personas con distintas versiones de la «Config» del estudio ({r.porVersionEstudio.map(([v, n]) => `${v}: ${n}`).join(' · ')}).</div>}
      <div className="pn-card"><h3>Card A vs B</h3><p style={{ margin: 0 }}>{ab.lectura}</p>{ab.pequeno && <div className="pn-sub">(n pequeño: menos de {UMBRALES.minimoTendencia} por card)</div>}</div>
      <Indicadores items={r.indicadores} />
      <div className="pn-grid"><Lista titulo="Por link" items={r.porFlujo} /><Lista titulo="Por sistema" items={r.porSistema} /></div>
    </>
  );
}

// ---------------------------------------------------------------- participantes
export function Participantes({ d, piloto, conexion, onCambio }: { d: Datos; piloto: boolean; conexion: Conexion; onCambio: () => void }) {
  const ps = personas(d, piloto);
  const [sel, setSel] = useState<string | null>(null);
  const [ev, setEv] = useState<Fila[]>([]);
  useEffect(() => {
    if (!sel) return;
    let vigente = true;
    fetchEventos(conexion, sel).then((h) => { if (vigente) setEv(filas({ Eventos: h }, 'Eventos')); }).catch(() => { if (vigente) setEv([]); });
    return () => { vigente = false; };
  }, [sel, conexion]);
  const excluir = async (sesion: string, si: boolean) => { if (await codificar(conexion, 'Participantes', sesion, { 'Excluir a mano (Sí)': si ? 'Sí' : '', 'Motivo de exclusión': si ? 'Responde siempre lo mismo' : '' })) onCambio(); };
  return (
    <>
      <Titulo t="Participantes" q="¿Quién cuenta? Solo las personas válidas entran en los cálculos (§0.3). Toca una fila para ver su recorrido." />
      <div className="pn-card" style={{ overflow: 'auto' }}>
        <table><thead><tr><th>Código</th><th>Card</th><th>Link</th><th>Sistema</th><th>Edad</th><th>Duración</th><th>Completó</th><th>Control</th><th>Válido</th><th>Textos</th><th></th></tr></thead><tbody>
          {ps.map((p) => (
            <tr key={p.codigo} onClick={() => setSel(p.codigo)} style={{ cursor: 'pointer', background: sel === p.codigo ? '#33261D' : undefined }}>
              <td>{p.codigo}</td><td>{p.variante}</td><td className="pn-sub">{p.fila['Flujo (Completo / Link 1 / Link 2)']}</td><td className="pn-sub">{p.fila['Dispositivo']}</td><td>{p.fila['Edad']}</td>
              <td>{f1(num(p.fila['Duración (min)']), ' min')}</td><td>{p.fila['Completó (Sí/No)']}</td><td>{p.fila['Control de atención']}</td>
              <td>{p.valido ? <Tag s="verde">sí</Tag> : <span title={p.motivos.join(', ')}><Tag s="rojo">no</Tag> <span className="pn-sub">{p.motivos.join(', ')}</span></span>}</td>
              <td className="pn-sub">{p.fila['Versión de textos']}</td>
              <td onClick={(e) => e.stopPropagation()}><label className="pn-sub"><input type="checkbox" checked={String(p.fila['Excluir a mano (Sí)']).toLowerCase() === 'sí'} onChange={(e) => void excluir(String(p.fila['Sesión ID']), e.target.checked)} /> excluir</label></td>
            </tr>
          ))}
        </tbody></table>
      </div>
      {sel && (
        <div className="pn-card" style={{ maxHeight: 420, overflow: 'auto' }}>
          <h3>Recorrido · {sel} · {ev.length} eventos</h3>
          <table><thead><tr><th>t (s)</th><th>Parte</th><th>Paso</th><th>Tipo</th><th>Detalle</th></tr></thead><tbody>
            {ev.map((e) => <tr key={e.eventId}><td>{(Number(e.tSesion) / 1000).toFixed(1)}</td><td>{e.bloque}</td><td>{e.estimulo}</td><td>{e.tipo}</td><td className="pn-sub">{[e.target, e.valor, e.x !== '' ? `(${e.x}, ${e.y})` : ''].filter((x) => x !== '' && x != null).join(' · ')}</td></tr>)}
          </tbody></table>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- módulos
export function Descubrir({ d, piloto }: { d: Datos; piloto: boolean }) {
  const t = useMemo(() => descubrir(d, piloto), [d, piloto]);
  const a = useMemo(() => descubrir(d, piloto, 'A'), [d, piloto]), b = useMemo(() => descubrir(d, piloto, 'B'), [d, piloto]);
  const pts = useMemo(() => puntos(d, piloto), [d, piloto]);
  const cfg = estudio();
  return (
    <>
      <Titulo t="M1 · Descubrir" q="¿Se entiende la card? ¿Saben qué gesto hacer? ¿Completan el mazo y entienden lo que dice de ellos?" />
      <Aviso n={t.n} />
      <Indicadores items={t.indicadores} porCard={{ A: a.indicadores, B: b.indicadores }} />
      <div className="pn-grid">
        <div className="pn-card"><h3>Vacilación</h3><div className="pn-sub">Mediana hasta el gesto: D2 {f1(t.tiempos.d2, ' s')} · D3 {f1(t.tiempos.d3, ' s')}</div><div className="pn-sub">Toques fuera de lugar (promedio): D2 {f1(t.tiempos.fueraD2)} · D3 {f1(t.tiempos.fueraD3)}</div><div className="pn-sub">Mediana hasta el resumen del mazo (D4): {f1(t.tiempos.d4, ' s')}</div><div className="pn-sub">Sorpresa con el resumen: {f1(t.sorpresa)} / 7</div></div>
        <Lista titulo="Gesto hecho en D2 (me interesa)" items={t.gestos.d2} /><Lista titulo="Gesto hecho en D3 (no me interesa)" items={t.gestos.d3} />
        <Lista titulo="Primer elemento mirado (D1a, codificado)" items={t.primerElemento} vacio="Codifícalo en la vista Codificación" />
        <Lista titulo="Tipo de sorpresa (D4c)" items={t.tipoSorpresa} /><Lista titulo="Qué les confundió al completar el mazo (D4f)" items={t.confusiones} vacio="Nadie reportó confusiones" /><Lista titulo="Motivos de fallo" items={t.motivos} />
      </div>
      <div className="pn-card"><h3>Gestos sobre la card</h3><div className="pn-sub">Verde = gesto que terminó la tarea · rojo = toques fuera de lugar. Las flechas salen de donde empezó el gesto.</div>
        <div className="pn-row" style={{ alignItems: 'flex-start', marginTop: 8 }}>
          {(['A', 'B'] as const).flatMap((v) => (['D2', 'D3'] as const).map((tarea) => (
            <div key={v + tarea}><div className="pn-sub">Card {v} · {tarea}</div><Heat pantalla={cfg.variantes[v].pantalla} puntos={pts.filter((p) => p.tarea === tarea && p.variante === v)} escala={0.42} id={`${tarea}-${v}`} /></div>
          )))}
        </div>
      </div>
    </>
  );
}

export function Ver({ d, piloto }: { d: Datos; piloto: boolean }) {
  const t = useMemo(() => ver(d, piloto), [d, piloto]);
  const pts = useMemo(() => puntos(d, piloto).filter((p) => p.tarea === 'V2'), [d, piloto]);
  return (
    <>
      <Titulo t="M2 · Ver" q="¿Se entiende el filtro de mood sin explicación? ¿Lo usan bien? ¿Confían en la recomendación?" />
      <Aviso n={t.n} />
      {t.lectura && <div className="pn-card"><h3>Lectura combinada (V1c + V3b)</h3><p style={{ margin: 0 }}>{t.lectura}</p></div>}
      {t.confianzaBaja && <div className="pn-warn">Confianza &lt; 4,5: la recomendación necesita explicar mejor por qué se propone.</div>}
      <Indicadores items={t.indicadores} />
      <div className="pn-grid">
        <Lista titulo={`Mood en el que terminó (objetivo: ${estudio().claves.V2objetivo})`} items={t.moodFinal} />
        <div className="pn-card"><h3>Tarea V2</h3><div className="pn-sub">Mediana {f1(t.v2.tiempo, ' s')} · movimientos de la barra {f1(t.v2.movimientos)} · toques fuera de lugar {f1(t.v2.fuera)}</div></div>
        <Lista titulo="¿Era lo que esperabas? (V3a)" items={t.expectativa} /><Lista titulo="Preferencia (V3c)" items={t.preferencia} />
      </div>
      <div className="pn-card"><h3>Toques en la tarea V2</h3><Heat pantalla={estudio().pantallas.ver} puntos={pts} escala={0.5} id="V2" /></div>
      <Citas titulo="Qué cambiaría del filtro (V3d)" textos={t.cambios} />
    </>
  );
}

export function Moods({ d, piloto }: { d: Datos; piloto: boolean }) {
  const t = useMemo(() => moods(d, piloto), [d, piloto]);
  return (
    <>
      <Titulo t="M3 · Moods" q="¿Se entiende cada mood? ¿Con qué se confunde? ¿Cómo lo llamaría la gente? (el azar en M3c es 25 %)" />
      <Aviso n={t.personas} />
      <div className="pn-row"><b>Acierto total (M3c): {f1(t.total, ' %')}</b> <Tag s={t.estadoTotal} /></div>
      <div className="pn-card" style={{ overflow: 'auto' }}><h3>Por mood</h3>
        <table><thead><tr><th>Mood</th><th>n</th><th>Acierto M3c</th><th></th><th>Película → mood</th><th>Explica (M3a)</th><th>Claridad (M3b)</th><th>Tiempo</th><th>Qué hacer</th></tr></thead><tbody>
          {t.porMood.map((m) => <tr key={m.mood}><td><b>{m.mood}</b></td><td>{m.n}</td><td>{f1(m.acierto, ' %')}</td><td><Tag s={m.estado} /></td><td>{f1(m.peliculaAMood, ' %')}</td><td>{f1(m.significado, ' %')} <span className="pn-sub">({m.nSignificado})</span></td><td>{f1(m.claridad)}</td><td>{f1(m.tiempo, ' s')}</td><td className="pn-sub">{m.accion}</td></tr>)}
        </tbody></table>
      </div>
      <div className="pn-card" style={{ overflow: 'auto' }}><h3>Matriz de confusión (fila = mood preguntado, columna = categoría de la película elegida)</h3>
        <table><thead><tr><th></th>{t.categorias.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>
          {t.porMood.map((m) => <tr key={m.mood}><td><b>{m.mood}</b></td>{m.fila.map((n, i) => <td key={i} style={{ background: n ? (t.categorias[i] === m.mood ? '#1f3a30' : '#4a1d14') : undefined }}>{n || ''}</td>)}</tr>)}
        </tbody></table>
      </div>
      <div className="pn-card" style={{ overflow: 'auto' }}><h3>Películas → mood (M3d) y nombres propios (M3e)</h3>
        <table><thead><tr><th>Película</th><th>Mood previsto</th><th>Coincide</th><th></th><th>Asociada con</th><th>Nombres que le pondrían</th></tr></thead><tbody>
          {t.porPelicula.map((p) => <tr key={p.titulo}><td>{p.titulo}</td><td>{p.previsto}</td><td>{f1(p.coincide, ' %')}</td><td><Tag s={p.estado} /></td><td className="pn-sub">{p.asociado.map(([k, n]) => `${k} (${n})`).join(', ')}</td><td className="pn-sub">{p.nombres.map(([k, n]) => (n >= 3 ? `«${k}» ×${n} ★` : `«${k}»${n > 1 ? ' ×' + n : ''}`)).join(', ')}</td></tr>)}
        </tbody></table>
        <div className="pn-sub" style={{ marginTop: 6 }}>★ = el mismo nombre propio repetido por 3 o más personas: candidato a nombre del mood (§3).</div>
      </div>
    </>
  );
}

export function Mazos({ d, piloto }: { d: Datos; piloto: boolean }) {
  const t = useMemo(() => mazos(d, piloto), [d, piloto]);
  const pts = useMemo(() => puntos(d, piloto).filter((p) => p.tarea === 'Z3'), [d, piloto]);
  return (
    <>
      <Titulo t="M4 · Mazos" q="¿Entienden qué es un mazo y cómo funciona (filtrar mis gustos y controlar cuánto contenido veo)?" />
      <Aviso n={t.n} />
      <Indicadores items={t.indicadores} />
      <div className="pn-grid">
        <div className="pn-card"><h3>Frases (Z2)</h3>{t.porFrase.map((f, i) => <div key={i} style={{ marginBottom: 6 }}><div>{f.texto} <span className="pn-sub">({f.correcta})</span></div><div className="pn-sub">aciertan {f1(f.acierto, ' %')} · «No sé» {f1(f.noSe, ' %')}</div></div>)}</div>
        <div className="pn-card"><h3>Ideas clave (Z1, codificadas)</h3>{t.porIdea.map((x, i) => <div key={i} className="pn-row" style={{ justifyContent: 'space-between' }}><span>K{i + 1} · {x.texto}</span><b>{f1(x.pct, ' %')}</b></div>)}</div>
        <Lista titulo="Consecuencia que espera (Z4)" items={t.z4} />
      </div>
      <div className="pn-card"><h3>Primer clic de Z3 · mediana {f1(t.z3Tiempo, ' s')}</h3><div className="pn-sub">Recuadro verde = zona correcta.</div><Heat pantalla={estudio().pantallas.zonaZ3} puntos={pts} zonaDeMarca escala={0.5} id="Z3" /></div>
    </>
  );
}

export function Percepcion({ d, piloto }: { d: Datos; piloto: boolean }) {
  const t = useMemo(() => percepcion(d, piloto), [d, piloto]);
  return (
    <>
      <Titulo t="M5 · Percepción" q="¿Qué tan chévere resulta? ¿La usarían? ¿Qué experiencia perciben? (UEQ-S de −3 a +3; verde > 0,8)" />
      <Aviso n={t.n} />
      <Indicadores items={t.indicadores} />
      <div className="pn-card" style={{ height: 300 }}>
        <h3>Pares del UEQ-S (media transformada, de peor a mejor)</h3>
        <ResponsiveContainer><BarChart layout="vertical" data={t.items.map((i) => ({ n: `${i.izq} – ${i.der}`, v: Number((i.media ?? 0).toFixed(2)) }))} margin={{ left: 120 }}>
          <CartesianGrid stroke="#3A2C22" /><XAxis type="number" domain={[-3, 3]} stroke="#BFA98A" /><YAxis type="category" dataKey="n" stroke="#BFA98A" width={200} /><Tooltip />
          <Bar dataKey="v">{t.items.map((i, k) => <Cell key={k} fill={(i.media ?? 0) > UMBRALES.ueq ? '#6CC4A8' : (i.media ?? 0) < UMBRALES.ueqAmarillo ? '#FF7A5C' : '#F2B544'} />)}</Bar>
        </BarChart></ResponsiveContainer>
      </div>
      <Citas titulo="Si pudieras cambiar una sola cosa… (F4)" textos={t.comentarios} />
    </>
  );
}

// ---------------------------------------------------------------- comparación A/B
export function ComparacionAB({ d, piloto }: { d: Datos; piloto: boolean }) {
  const c = useMemo(() => comparacionAB(d, piloto), [d, piloto]);
  const fmt = (v: number | null, tipo: string) => (tipo === 'Porcentaje' ? f1(v, ' %') : tipo === 'Tiempo (s)' ? f1(v, ' s') : f1(v));
  const tag = (v: string) => (v === 'Diferencia clara' ? 'verde' : v === 'Tendencia' ? 'amarillo' : 'sin-datos') as Semaforo;
  return (
    <>
      <Titulo t="Card A vs B" q={`Cada persona vio una sola card. Porcentajes: Fisher exacta; escalas, tiempos y UEQ-S: t de Welch (bilaterales, α = ${String(UMBRALES.alfa).replace('.', ',')}).`} />
      <div className="pn-grid">
        <div className="pn-card"><div className="pn-big">{c.nPorCard.A} / {c.nPorCard.B}</div><div className="pn-sub">personas válidas con la card A / B</div></div>
        <div className="pn-card" style={{ gridColumn: 'span 2' }}><h3>Lectura sugerida</h3><p style={{ margin: 0 }}>{c.lectura}</p></div>
      </div>
      <div className="pn-warn">Decide con las 5 métricas primarias (★). Con 22 métricas es esperable que una salga «clara» por azar; las demás explican por qué, no deciden. Con 15–20 por card solo se detectan diferencias grandes.</div>
      <div className="pn-card" style={{ overflow: 'auto' }}>
        <table><thead><tr><th>Métrica</th><th>Tipo</th><th>Card A</th><th>n</th><th>Card B</th><th>n</th><th>Diferencia</th><th>p</th><th>Veredicto</th><th>Favorece</th></tr></thead><tbody>
          {c.metricas.map((m) => (
            <tr key={m.id} style={{ fontWeight: m.primaria ? 700 : undefined }}>
              <td>{m.primaria ? '★ ' : ''}{m.nombre}</td><td className="pn-sub">{m.tipo}{m.mejor === 'menor' ? ' (menor es mejor)' : ''}</td>
              <td>{fmt(m.a, m.tipo)}</td><td className="pn-sub">{m.nA}</td><td>{fmt(m.b, m.tipo)}</td><td className="pn-sub">{m.nB}</td>
              <td>{m.dif == null ? '—' : (m.dif > 0 ? '+' : '') + fmt(m.dif, m.tipo)}</td><td>{fp(m.p)}</td>
              <td><Tag s={tag(m.veredicto)}>{m.veredicto}{m.pequeno ? ' (n pequeño)' : ''}</Tag></td><td>{m.favorece ?? '—'}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- codificación (a ciegas de la card)
const OPCIONES = [1, 0.5, 0];
/**
 * Codificación de las respuestas abiertas con la clave de «Config» (§0.3: dos personas por separado, sin ver la card; si difieren,
 * discuten y se guarda el código acordado). Las filas se muestran SIN la card y en orden de código.
 */
export function Codificacion({ d, conexion, onCambio }: { d: Datos; conexion: Conexion; onCambio: () => void }) {
  const [msg, setMsg] = useState('');
  const [modulo, setModulo] = useState<'Descubrir' | 'Ver' | 'Moods' | 'Películas' | 'Mazos' | 'Notas'>('Descubrir');
  const cfg = estudio();
  const guardar = async (hoja: string, rowId: string, cambios: Record<string, string | number>) => { const ok = await codificar(conexion, hoja, rowId, cambios); setMsg(ok ? 'Guardado ✓' : 'No se pudo guardar'); if (ok) onCambio(); };
  const Botones = ({ hoja, r, col }: { hoja: string; r: Fila; col: string }) => (
    <span className="pn-row">{OPCIONES.map((v) => <button key={v} className="pn-btn" aria-pressed={r[col] !== '' && r[col] != null && Number(r[col]) === v} onClick={() => void guardar(hoja, r['Row ID'], { [col]: v })}>{String(v).replace('.', ',')}</button>)}</span>
  );
  const Motivo = ({ hoja, r, col, lista }: { hoja: string; r: Fila; col: string; lista: string[] }) => (
    <select className="pn-in" style={{ minWidth: 120 }} value={String(r[col] ?? '')} onChange={(e) => void guardar(hoja, r['Row ID'], { [col]: e.target.value })}><option value="">Motivo…</option>{lista.map((x) => <option key={x}>{x}</option>)}</select>
  );
  const Pregunta = ({ hoja, r, resp, col, clave, motivo }: { hoja: string; r: Fila; resp: string; col: string; clave: string; motivo?: { col: string; lista: string[] } }) => (
    <div style={{ padding: '6px 0' }}>
      <div className="pn-sub">{col.split(' (')[0]} · clave: {clave}</div>
      <div className="pn-quote">«{String(r[resp] ?? '') || '—'}»</div>
      <div className="pn-row"><Botones hoja={hoja} r={r} col={col} />{motivo && <Motivo hoja={hoja} r={r} col={motivo.col} lista={motivo.lista} />}</div>
    </div>
  );
  const ordenar = (rs: Fila[]) => [...rs].sort((a, b) => String(a['Participante']).localeCompare(String(b['Participante'])));
  const rows = (h: string) => ordenar(filas(d.hojas, h));
  const C = cfg.claves;
  return (
    <>
      <Titulo t="Codificación" q="Convierte las respuestas abiertas en 1 / 0,5 / 0 con la clave de «Config». Sin ver la card: así el código no se inclina hacia una." />
      <div className="pn-row">{(['Descubrir', 'Ver', 'Moods', 'Películas', 'Mazos', 'Notas'] as const).map((m) => <button key={m} className="pn-btn" aria-pressed={modulo === m} onClick={() => setModulo(m)}>{m}</button>)}</div>
      {msg && <div className="pn-warn">{msg}</div>}
      {modulo === 'Descubrir' && rows(HOJAS.descubrir).map((r) => (
        <div key={r['Row ID']} className="pn-card">
          <h3>{r['Participante']}</h3>
          <div className="pn-sub">D1a · Primer elemento — «{r['D1a · Respuesta']}»</div>
          <select className="pn-in" value={String(r['D1a · Primer elemento que llamó la atención'] ?? '')} onChange={(e) => { const el = cfg.elementosCard.find((x) => x.elemento === e.target.value); void guardar(HOJAS.descubrir, r['Row ID'], { 'D1a · Primer elemento que llamó la atención': e.target.value, '¿Prioritario? (auto)': el ? (el.prioritario ? 1 : 0) : '' }); }}>
            <option value="">Elemento…</option>{cfg.elementosCard.map((x) => <option key={x.elemento}>{x.elemento}</option>)}
          </select>
          <Pregunta hoja={HOJAS.descubrir} r={r} resp="D1b · Respuesta" col="D1b · Propósito de la pantalla (1/0,5/0)" clave={C.D1b} motivo={{ col: 'Motivo si no entendió la pantalla o el match (código)', lista: MOTIVOS.pantalla }} />
          <Pregunta hoja={HOJAS.descubrir} r={r} resp="D1c · Respuesta" col="D1c · Qué haría con la card (1/0,5/0)" clave="Deslizar la card o tocarla para ver más" />
          <div className="pn-sub">Gestos: D2 {r['D2 · Gesto hecho']} → {r['D2 · Gesto «me interesa» (1 correcto · 0,5 alternativo · 0 incorrecto)']} · D3 {r['D3 · Gesto hecho']} → {r['D3 · Gesto «no me interesa» (1 · 0,5 · 0)']}</div>
          <Motivo hoja={HOJAS.descubrir} r={r} col="Motivo si falló el gesto (código)" lista={MOTIVOS.gesto} />
          <Pregunta hoja={HOJAS.descubrir} r={r} resp="D2b · Respuesta" col="D2b · Consecuencia esperada (1/0,5/0)" clave={C.D2bD3b} />
          <Pregunta hoja={HOJAS.descubrir} r={r} resp="D3b · Respuesta" col="D3b · Consecuencia esperada (1/0,5/0)" clave={C.D2bD3b} />
          <Pregunta hoja={HOJAS.descubrir} r={r} resp="D4a · Respuesta" col="D4a · Interpretación del match (1/0,5/0)" clave={C.D4a} />
        </div>
      ))}
      {modulo === 'Ver' && rows(HOJAS.ver).map((r) => (
        <div key={r['Row ID']} className="pn-card">
          <h3>{r['Participante']}</h3>
          <Pregunta hoja={HOJAS.ver} r={r} resp="V1a · Respuesta" col="V1a · Propósito de la pantalla (1/0,5/0)" clave={C.V1a} />
          <Pregunta hoja={HOJAS.ver} r={r} resp="V1c · Respuesta" col="V1c · Entiende para qué sirve el filtro (1/0,5/0)" clave={C.V1cV1d} motivo={{ col: 'Motivo si no entendió el filtro o falló la tarea (código)', lista: MOTIVOS.concepto }} />
          <Pregunta hoja={HOJAS.ver} r={r} resp="V1d · Respuesta" col="V1d · Qué espera al moverlo (1/0,5/0)" clave={C.V1cV1d} />
        </div>
      ))}
      {modulo === 'Moods' && rows(HOJAS.moods).filter((r) => String(r['M3a · Respuesta'] ?? '') !== '').map((r) => {
        const m = cfg.moods.find((x) => x.nombre === r['Mood']);
        return <div key={r['Row ID']} className="pn-card"><h3>{r['Participante']} · {r['Mood']}</h3><Pregunta hoja={HOJAS.moods} r={r} resp="M3a · Respuesta" col="M3a · Significado abierto (1/0,5/0) (solo 3 moods por persona)" clave={m?.definicion ?? ''} motivo={{ col: 'Motivo si no lo entendió (código)', lista: MOTIVOS.concepto }} /></div>;
      })}
      {modulo === 'Películas' && rows(HOJAS.peliculas).map((r) => (
        <div key={r['Row ID']} className="pn-card pn-row" style={{ justifyContent: 'space-between' }}>
          <span><b>{r['Participante']}</b> · {r['Película']} (previsto: {r['Mood previsto']}) · nombre: «{r['M3e · Nombre que le pondría']}»</span>
          <select className="pn-in" value={String(r['El nombre equivale a… (lo codifica el equipo)'] ?? '')} onChange={(e) => void guardar(HOJAS.peliculas, r['Row ID'], { 'El nombre equivale a… (lo codifica el equipo)': e.target.value })}>
            <option value="">Equivale a…</option>{[...cfg.moods.map((m) => m.nombre), 'Nombre nuevo', 'No equivale a ninguna'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
      ))}
      {modulo === 'Mazos' && rows(HOJAS.mazos).map((r) => {
        const cols = ['Z1 · Idea clave 1 mencionada (1/0)', 'Z1 · Idea clave 2 (1/0)', 'Z1 · Idea clave 3 (1/0)', 'Z1 · Idea clave 4 (1/0)'];
        const marcar = (i: number, si: boolean) => {
          const nuevos = cols.map((c, k) => (k === i ? (si ? 1 : 0) : num(r[c]) ?? 0));
          void guardar(HOJAS.mazos, r['Row ID'], { [cols[i]]: si ? 1 : 0, 'Ideas clave captadas (auto, 0–4)': nuevos.reduce((a, b) => a + b, 0) });
        };
        return (
          <div key={r['Row ID']} className="pn-card">
            <h3>{r['Participante']}</h3><div className="pn-quote">«{r['Z1 · Respuesta']}»</div>
            {cfg.mazos.ideas.map((idea, i) => <label key={i} className="pn-row"><input type="checkbox" checked={num(r[cols[i]]) === 1} onChange={(e) => marcar(i, e.target.checked)} /> K{i + 1} · {idea}</label>)}
            <Motivo hoja={HOJAS.mazos} r={r} col="Motivo si no entendió (código)" lista={MOTIVOS.concepto} />
          </div>
        );
      })}
      {modulo === 'Notas' && <Afinidad d={d} guardar={guardar} />}
    </>
  );
}

/** Diagrama de afinidad (§7): cada cita con tipo, tema y gravedad; el tablero se arma solo. */
function Afinidad({ d, guardar }: { d: Datos; guardar: (h: string, r: string, c: Record<string, string | number>) => Promise<void> }) {
  const notas = filas(d.hojas, HOJAS.notas);
  const [tema, setTema] = useState<Record<string, string>>({});
  const temas = contar(notas.map((n) => String(n['Tema'] ?? '')));
  return (
    <>
      <div className="pn-card"><h3>Notas (comentarios de V3d y F4)</h3>
        {notas.map((n) => (
          <div key={n['Row ID']} className="pn-row" style={{ padding: '6px 0', borderBottom: '1px solid var(--pn-line)' }}>
            <span className="pn-sub" style={{ width: 110 }}>{n['Participante']} · {n['Pregunta']}</span><span style={{ flex: 1, minWidth: 200 }}>«{n['Texto']}»</span>
            <select className="pn-in" style={{ minWidth: 110 }} value={String(n['Tipo'] ?? '')} onChange={(e) => void guardar(HOJAS.notas, n['Row ID'], { Tipo: e.target.value })}><option value="">Tipo…</option>{TIPOS_NOTA.map((t) => <option key={t}>{t}</option>)}</select>
            <input className="pn-in" list="temas" style={{ minWidth: 150 }} defaultValue={String(n['Tema'] ?? '')} onChange={(e) => setTema((t) => ({ ...t, [n['Row ID']]: e.target.value }))} onBlur={() => tema[n['Row ID']] != null && void guardar(HOJAS.notas, n['Row ID'], { Tema: tema[n['Row ID']] })} aria-label="Tema" />
            <select className="pn-in" style={{ minWidth: 90 }} value={String(n['Gravedad'] ?? '')} onChange={(e) => void guardar(HOJAS.notas, n['Row ID'], { Gravedad: e.target.value })}><option value="">Gravedad</option>{[1, 2, 3, 4].map((g) => <option key={g}>{g}</option>)}</select>
          </div>
        ))}
        <datalist id="temas">{temas.map(([t]) => <option key={t} value={t} />)}</datalist>
        {!notas.length && <span className="pn-sub">Sin notas todavía.</span>}
      </div>
      <div className="pn-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {temas.slice(0, 8).map(([t, n]) => <div key={t} className="pn-card"><b>{t}</b><div className="pn-sub">{n} notas</div>{notas.filter((x) => x['Tema'] === t).map((x, i) => <div key={i} className="pn-quote">{String(x['Texto'])}</div>)}</div>)}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- salud y exportar
export function Salud({ d }: { d: Datos }) {
  const s = useMemo(() => salud(d), [d]);
  return (
    <>
      <Titulo t="Salud" q="¿Está funcionando la recolección?" />
      <div className="pn-grid">
        <div className="pn-card"><h3>Eventos recibidos</h3><div className="pn-big">{s.eventos}</div></div>
        <div className="pn-card"><h3>Respondiendo ahora (últimos 5 min)</h3><div className="pn-big">{s.activas.length}</div>{s.activas.map((a) => <div key={a.sesionId} className="pn-sub">{a.codigo} · {a.bloque} · {a.pantalla}</div>)}</div>
        <div className="pn-card"><h3>Errores de la app</h3><div className="pn-big" style={{ color: s.errores.length ? 'var(--pn-bad)' : undefined }}>{s.errores.length}</div>{s.errores.slice(-4).map((e, i) => <div key={i} className="pn-sub">{String(e['pantalla'])} · {String(e['mensaje'])}</div>)}</div>
        <div className="pn-card"><h3>Con código provisional</h3><div className="pn-big">{s.provisionales}</div><div className="pn-sub">eventos con TMP-… (se corrigen al reconectar)</div></div>
      </div>
      <div className="pn-card" style={{ height: 240 }}><h3>Eventos por minuto (últimos 15 min)</h3>
        <ResponsiveContainer><BarChart data={s.porMin.map(({ min, n }) => ({ k: min, n }))}><CartesianGrid stroke="#3A2C22" /><XAxis dataKey="k" stroke="#BFA98A" /><YAxis allowDecimals={false} stroke="#BFA98A" /><Tooltip /><Bar dataKey="n" fill="#E8642C" /></BarChart></ResponsiveContainer>
      </div>
      {s.incompletos.length > 0 && <div className="pn-card"><h3>Sin terminar</h3>{s.incompletos.map((p) => <div key={p['Código']} className="pn-sub">{p['Código']} · {p['Flujo (Completo / Link 1 / Link 2)']} · {p['Partes completadas']} partes</div>)}</div>}
    </>
  );
}

const COLUMNAS_ENLACE = ['Sesión ID', 'Row ID', 'sesionId'];
function libro(hojas: Record<string, Hoja>, nombres: string[], quitarEnlace: boolean): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const h of nombres) {
    const x = hojas[h];
    if (!x) continue;
    const idx = x.headers.flatMap((k, i) => (quitarEnlace && COLUMNAS_ENLACE.includes(k) ? [] : [i]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([idx.map((i) => x.headers[i]), ...x.rows.map((r) => idx.map((i) => r[i]))]), h.slice(0, 31));
  }
  return wb;
}
/** «Válido (auto)» calculado por el Panel, para que el export lo traiga lleno. */
function conValidez(d: Datos): Record<string, Hoja> {
  const v = new Map(personas(d, true).map((p) => [p.codigo, p.valido ? 'Sí' : 'No']));
  const out: Record<string, Hoja> = {};
  for (const [nombre, h] of Object.entries(d.hojas)) {
    const iv = h.headers.indexOf('Válido (auto)'), ip = h.headers.indexOf(nombre === 'Participantes' ? 'Código' : 'Participante');
    out[nombre] = iv < 0 || ip < 0 ? h : { headers: h.headers, rows: h.rows.map((r) => r.map((c, i) => (i === iv ? v.get(String(r[ip])) ?? '' : c))) };
  }
  return out;
}

export function Exportar({ d, conexion }: { d: Datos; conexion: Conexion }) {
  const [progreso, setProgreso] = useState('');
  const hojas = useMemo(() => conValidez(d), [d]);
  const conEventos = async (): Promise<Record<string, Hoja>> => {
    setProgreso('Descargando eventos…');
    try { return { ...hojas, Eventos: await fetchEventos(conexion, '', (n) => setProgreso(`Descargando eventos… ${n}`)) }; } finally { setProgreso(''); }
  };
  const csv = async (h: string) => {
    const src = h === 'Eventos' ? await conEventos() : hojas;
    const blob = new Blob([XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet([src[h].headers, ...src[h].rows]))], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = h.replace(/\W+/g, '_') + '.csv'; a.click();
  };
  return (
    <>
      <Titulo t="Exportar" q="Llevar los datos al Excel de registro v2.0 y al informe." />
      {progreso && <div className="pn-warn" aria-live="polite">{progreso}</div>}
      <div className="pn-card">
        <h3>Excel</h3>
        <div className="pn-row">
          <button className="pn-btn pri" onClick={() => XLSX.writeFile(libro(hojas, ORDEN_EXCEL, true), 'Registro_No_Moderadas_formato_v2.0.xlsx')}>Formato Registro v2.0 (para pegar en la plantilla)</button>
          <button className="pn-btn" disabled={!!progreso} onClick={async () => { const h = await conEventos(); XLSX.writeFile(libro(h, Object.keys(h), false), 'Registro_No_Moderadas_completo.xlsx'); }}>Completo (con Puntos, Notas y Eventos)</button>
        </div>
        <div className="pn-sub" style={{ marginTop: 8 }}>El formato v2.0 respeta los nombres de hoja y el orden de columnas de <i>Registro_Pruebas_No_Moderadas_Kinoo_v2.0.xlsx</i>; las columnas extra (respuestas textuales, versión, tiempos) van al final. «Válido (auto)» llega calculado por el Panel.</div>
      </div>
      <div className="pn-card"><h3>CSV por hoja</h3><div className="pn-row">{[...Object.keys(hojas), 'Eventos'].map((h) => <button key={h} className="pn-btn" disabled={!!progreso} onClick={() => void csv(h)}>{h}</button>)}</div></div>
      <div className="pn-sub">Los mapas se descargan en PNG con el botón «PNG» de cada mapa (vistas Descubrir, Ver y Mazos).</div>
    </>
  );
}
