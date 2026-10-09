import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import { CLAVE_5S, FLUJO_NOMBRE, HOJAS, MISIONES, MOTIVOS_5S, MOTIVOS_CARDS, MOTIVOS_CLIC, TAREAS, nombreDePantalla, type Semaforo } from '@kinoo/tracking';
import { cards, cincoSeg, filas, flujos, marca, participantes, primerClic, puntos, resumen, salud, ueq, type Dump, type Fila } from './analytics';
import { Heat, VISTA, vistaDeTarea, zonaDe } from './Heat';
import { codificar, type Conexion } from './api';

export const Tag = ({ s, children }: { s: Semaforo; children?: React.ReactNode }) => <span className={'pn-tag ' + s}>{children ?? ({ verde: 'cumple', amarillo: 'revisar', rojo: 'rediseñar', 'sin-datos': 'sin datos' } as const)[s]}</span>;
const f1 = (n: number | null | undefined, suf = '') => (n == null || Number.isNaN(n) ? '—' : (Math.round(n * 10) / 10).toString().replace('.', ',') + suf);
const P = ({ n }: { n: number | null | undefined }) => <>{f1(n, ' %')}</>;
const Titulo = ({ t, q }: { t: string; q: string }) => <><h2>{t}</h2><div className="pn-q">{q}</div></>;
const Aviso = ({ n }: { n: number }) => (n < 8 ? <div className="pn-warn">Con {n} {n === 1 ? 'persona' : 'personas'} (menos de 8) léelo como pista, no como conclusión.</div> : null);
const COLORES = ['#6CC4A8', '#F2B544', '#FF7A5C', '#BFA98A', '#E8642C'];
const Barra = ({ pct, color = 'var(--pn-ok)' }: { pct: number | null; color?: string }) => <div className="pn-bar" aria-hidden="true"><i style={{ width: Math.max(0, Math.min(100, pct ?? 0)) + '%', background: color }} /></div>;

export function Resumen({ d, piloto }: { d: Dump; piloto: boolean }) {
  const r = useMemo(() => resumen(d, piloto), [d, piloto]);
  const s = useMemo(() => salud(d), [d]);
  return (
    <>
      <Titulo t="Resumen" q="¿Cuántas personas hicieron la prueba y cumplimos las metas?" />
      <div className="pn-grid">
        <div className="pn-card"><div className="pn-big">{r.n}</div><div className="pn-sub">personas registradas{r.porRonda.length ? ' · ' + r.porRonda.map((x) => `ronda ${x.ronda}: ${x.n}`).join(' · ') : ''}</div></div>
        <div className="pn-card"><div className="pn-big">{r.completos}</div><div className="pn-sub">terminaron las 4 fases · por fase: {r.fases.map((n, k) => `${k}→${n}`).join('  ')}</div></div>
        <div className="pn-card"><div className="pn-big">{s.activas.length}</div><div className="pn-sub">sesiones activas ahora{s.activas.length ? ': ' + s.activas.map((a) => a.nombre).join(', ') : ''}</div></div>
      </div>
      <Aviso n={r.n} />
      <div className="pn-card">
        <h3>Objetivos del protocolo</h3>
        <table><thead><tr><th>Prueba</th><th>Indicador</th><th>Meta</th><th>Resultado</th><th>Estado</th></tr></thead><tbody>
          {r.ind.map((i) => <tr key={i.prueba}><td>{i.prueba}</td><td>{i.indicador}</td><td>{i.meta}</td><td>{i.prueba === 'Marca A/B' ? (i.estado === 'sin-datos' ? '—' : i.valor ? 'hay ganador' : 'sin ganador aún') : i.formato === 'pct' ? <P n={i.valor} /> : f1(i.valor)}</td><td><Tag s={i.estado} /></td></tr>)}
        </tbody></table>
      </div>
    </>
  );
}

export function Participantes({ d, piloto }: { d: Dump; piloto: boolean }) {
  const ps = participantes(d, piloto);
  const [sel, setSel] = useState<string | null>(null);
  const ev = useMemo(() => (sel ? filas(d, 'Eventos').filter((e) => e.codigo === sel) : []), [d, sel]);
  return (
    <>
      <Titulo t="Participantes" q="¿Quién hizo qué? Toca una fila para ver su línea de tiempo." />
      <div className="pn-card" style={{ overflow: 'auto' }}>
        <table><thead><tr><th>Código</th><th>Nombre</th><th>Ronda</th><th>Edad</th><th>Frecuencia</th><th>Nivel</th><th>Órdenes</th><th>Fases</th><th>Dispositivo</th></tr></thead><tbody>
          {ps.map((p) => (
            <tr key={p['Código']} onClick={() => setSel(p['Código'])} style={{ cursor: 'pointer', background: sel === p['Código'] ? '#33261D' : undefined }}>
              <td>{p['Código']}</td><td>{p['Nombre mostrado']}</td><td>{p['Ronda']}</td><td>{p['Edad']}</td><td>{p['Frecuencia de consumo']}</td><td>{p['Nivel tecnológico']}</td>
              <td className="pn-sub">{p['Orden de tareas']} · {p['Orden marca (A→B / B→A)']} · {p['Orden flujos']}</td><td>{p['Fases completadas']}/4</td><td className="pn-sub">{String(p['Dispositivo'] ?? '').slice(0, 50)}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
      {sel && (
        <div className="pn-card" style={{ maxHeight: 420, overflow: 'auto' }}>
          <h3>Línea de tiempo · {sel} · {ev.length} eventos</h3>
          <table><thead><tr><th>t (s)</th><th>Fase</th><th>Bloque</th><th>Tipo</th><th>Pantalla</th><th>Detalle</th></tr></thead><tbody>
            {ev.filter((e) => e.tipo !== 'screen.view' || true).map((e) => (
              <tr key={e.eventId}><td>{(Number(e.tSesion) / 1000).toFixed(1)}</td><td>{e.fase}</td><td>{e.bloque}</td><td>{e.tipo}</td><td>{e.pantalla}</td>
                <td className="pn-sub">{[e.target, e.resultado, e.valor, e.x !== '' ? `(${e.x}, ${e.y})` : ''].filter((x) => x !== '' && x != null).join(' · ')}</td></tr>
            ))}
          </tbody></table>
        </div>
      )}
    </>
  );
}

export function CincoSeg({ d, piloto }: { d: Dump; piloto: boolean }) {
  const c = useMemo(() => cincoSeg(d, piloto), [d, piloto]);
  const pts = useMemo(() => puntos(d, piloto).filter((p) => p.prueba === '5 segundos'), [d, piloto]);
  return (
    <>
      <Titulo t="5 segundos" q="¿Qué pantallas comunican su propósito y por qué fallan las que no?" />
      <Aviso n={c.n} />
      <div className="pn-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {c.porPantalla.map((p) => (
          <div className="pn-card" key={p.id}>
            <h3>{p.id} · {nombreDePantalla(p.id)}</h3>
            <div className="pn-row" style={{ justifyContent: 'space-between' }}><span>Propósito</span><span><P n={p.proposito} /> <Tag s={p.semProposito} /></span></div><Barra pct={p.proposito} />
            <div className="pn-row" style={{ justifyContent: 'space-between', marginTop: 6 }}><span>Acción principal</span><span><P n={p.accion} /> <Tag s={p.semAccion} /></span></div><Barra pct={p.accion} />
            <div className="pn-row" style={{ justifyContent: 'space-between', marginTop: 6 }}><span>Claridad</span><span>{f1(p.claridad)} / 7 <Tag s={p.semClaridad} /></span></div>
            <div className="pn-sub">Codificadas: {p.codificadas} de {p.n} · distribución 1→7: {p.distClaridad.join(' · ')}</div>
            {p.codificadas < p.n && <div className="pn-warn" style={{ marginTop: 6 }}>Faltan respuestas por codificar (vista «Codificación»).</div>}
            <div className="pn-sub" style={{ marginTop: 6 }}>Clave: {CLAVE_5S[p.id]?.proposito}</div>
            <div className="pn-sub">Palabras: {p.palabras.join(', ') || '—'}</div>
            <div style={{ marginTop: 8 }}><Heat vista={VISTA[p.id]} puntos={pts.filter((x) => x.pantalla === p.id)} escala={0.5} id={'5s-' + p.id} /></div>
            <div className="pn-sub">Mapa: dónde estaba lo que más recuerdan (P6).</div>
          </div>
        ))}
      </div>
    </>
  );
}

export function Cards({ d, piloto }: { d: Dump; piloto: boolean }) {
  const c = useMemo(() => cards(d, piloto), [d, piloto]);
  const pts = useMemo(() => puntos(d, piloto).filter((p) => p.prueba === '5 s – Cards'), [d, piloto]);
  return (
    <>
      <Titulo t="Cards" q="¿Qué elementos del card captan la atención?" />
      <Aviso n={c.n} />
      <div className="pn-grid">
        <div className="pn-card"><h3>Atención en elemento prioritario</h3><div className="pn-big"><P n={c.atencion} /></div><Tag s={c.semAtencion} /> <span className="pn-sub">meta ≥ 70 %</span></div>
        <div className="pn-card"><h3>Elementos recordados por card</h3><div className="pn-big">{f1(c.recuerdo)}</div><span className="pn-sub">meta ≥ 2</span></div>
        <div className="pn-card"><h3>Interés (1–7)</h3><div className="pn-big">{f1(c.interes)}</div><div className="pn-sub">conocidas {f1(c.interesConocidas)} · no conocidas {f1(c.interesNoConocidas)}</div>{c.alertaDependePelicula && <div className="pn-warn" style={{ marginTop: 6 }}>La diferencia pasa de 1,5: el interés depende de la película y no del diseño.</div>}</div>
      </div>
      <div className="pn-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        <div className="pn-card"><h3>Primer elemento mirado</h3>{c.primerElemento.map(([k, n]) => <div key={k} className="pn-row" style={{ justifyContent: 'space-between' }}><span>{k}</span><b>{n}</b></div>)}</div>
        <div className="pn-card"><h3>Información que faltó</h3>{c.faltante.slice(0, 12).map(([k, n]) => <div key={k} className="pn-row" style={{ justifyContent: 'space-between' }}><span>{k}</span><b>{n}</b></div>)}{!c.faltante.length && <span className="pn-sub">—</span>}</div>
        <div className="pn-card"><h3>Primer toque al probar la tarjeta</h3><Heat vista={VISTA.S02} puntos={pts} escala={0.55} id="cards" /></div>
      </div>
    </>
  );
}

export function PrimerClic({ d, piloto }: { d: Dump; piloto: boolean }) {
  const c = useMemo(() => primerClic(d, piloto), [d, piloto]);
  const pts = useMemo(() => puntos(d, piloto).filter((p) => p.prueba === 'Primer clic'), [d, piloto]);
  const [modo, setModo] = useState<'calor' | 'puntos'>('puntos');
  const [filtro, setFiltro] = useState<'todos' | 'primero' | 'miss' | 'aciertos'>('todos');
  const filtrar = (a: typeof pts) => a.filter((p) => (filtro === 'todos' ? true : filtro === 'primero' ? p.nClic === 1 : filtro === 'miss' ? p.resultado === 'Miss click' : p.resultado === 'Correcto' || p.resultado === 'Aceptable'));
  return (
    <>
      <Titulo t="Primer clic + SEQ" q="¿Cuántas personas encuentran cada acción y por qué se pierden?" />
      <Aviso n={c.n} />
      <div className="pn-row"><b>Promedio de primer clic correcto: <P n={c.global} /></b> <Tag s={c.semGlobal} />
        <span style={{ flex: 1 }} />
        {(['puntos', 'calor'] as const).map((m) => <button key={m} className="pn-btn" aria-pressed={modo === m} onClick={() => setModo(m)}>{m === 'calor' ? 'Mapa de calor' : 'Mapa de clics'}</button>)}
        {(['todos', 'primero', 'miss', 'aciertos'] as const).map((m) => <button key={m} className="pn-btn" aria-pressed={filtro === m} onClick={() => setFiltro(m)}>{({ todos: 'Todos', primero: 'Solo primer clic', miss: 'Solo miss clicks', aciertos: 'Solo aciertos' } as const)[m]}</button>)}
      </div>
      <div className="pn-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
        {c.porTarea.map((t) => (
          <div className="pn-card" key={t.tarea}>
            <h3>{t.tarea} · {t.pantalla} <span className="pn-sub">(n = {t.n})</span></h3>
            <div className="pn-sub" style={{ marginBottom: 8 }}>{t.escenario}</div>
            <div className="pn-row" style={{ justifyContent: 'space-between' }}><span>Primer clic correcto</span><span><P n={t.correcto} /> <Tag s={t.semCorrecto} /></span></div><Barra pct={t.correcto} color={t.semCorrecto === 'verde' ? 'var(--pn-ok)' : t.semCorrecto === 'amarillo' ? 'var(--pn-mid)' : 'var(--pn-bad)'} />
            <div className="pn-row" style={{ justifyContent: 'space-between', marginTop: 6 }}><span>Mediana al 1er clic</span><span>{f1(t.medianaTiempo, ' s')} <Tag s={t.semTiempo} /></span></div>
            <div className="pn-row" style={{ justifyContent: 'space-between' }}><span>Miss clicks</span><span><P n={t.missPct} /> <Tag s={t.semMiss} /></span></div>
            <div className="pn-row" style={{ justifyContent: 'space-between' }}><span>SEQ</span><span>{f1(t.seq)} / 7 · {f1(t.seqBajo, ' %')} de 1–4 <Tag s={t.semSEQ} /></span></div>
            <div className="pn-sub">SEQ acertaron {f1(t.seqAcertaron)} · fallaron {f1(t.seqFallaron)}</div>
            {t.falsaSeguridad && <div className="pn-warn" style={{ marginTop: 6 }}>Quienes fallaron califican alto: no notaron su error (falsa seguridad).</div>}
            {t.elementoRobado && t.elementoRobado.pct > 25 && <div className="pn-warn" style={{ marginTop: 6 }}>«{t.elementoRobado.target}» concentra el {f1(t.elementoRobado.pct, ' %')} de los miss clicks: está robando la tarea.</div>}
            {t.motivos.slice(0, 4).map((m, i) => <div key={i} className="pn-quote">«{m}»</div>)}
            <div style={{ marginTop: 8 }}><Heat vista={vistaDeTarea(t.tarea)} puntos={filtrar(pts.filter((p) => p.estimulo === t.tarea))} zona={zonaDe(d, t.tarea)} escala={0.55} modo={modo} id={'pc-' + t.tarea} /></div>
            <div className="pn-sub">Recuadro verde = zona correcta. Rojo = miss click · amarillo = aceptable · verde = acierto.</div>
          </div>
        ))}
      </div>
      <div className="pn-card" style={{ height: 300 }}>
        <h3>SEQ promedio por tarea</h3>
        <ResponsiveContainer><BarChart data={c.porTarea.map((t) => ({ t: t.tarea, SEQ: t.seq ?? 0 }))}><CartesianGrid stroke="#3A2C22" /><XAxis dataKey="t" stroke="#BFA98A" /><YAxis domain={[0, 7]} stroke="#BFA98A" /><Tooltip /><Bar dataKey="SEQ">{c.porTarea.map((t, i) => <Cell key={i} fill={t.semSEQ === 'verde' ? '#6CC4A8' : t.semSEQ === 'amarillo' ? '#F2B544' : '#FF7A5C'} />)}</Bar></BarChart></ResponsiveContainer>
      </div>
    </>
  );
}

export function Flujos({ d, piloto }: { d: Dump; piloto: boolean }) {
  const f = useMemo(() => flujos(d, piloto), [d, piloto]);
  return (
    <>
      <Titulo t="Flujos" q="¿Dónde se rompe el flujo? Descubrir, micro-flujo Mazos y Ver." />
      <Aviso n={f.n} />
      {f.porFlujo.map((fl) => (
        <div key={fl.flujo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ marginTop: 10 }}>{fl.nombre}</h3>
          <div className="pn-card" style={{ height: 240 }}>
            <ResponsiveContainer><BarChart data={fl.misiones.map((m) => ({ m: m.mision, Directo: m.directos, Indirecto: m.indirectos, Abandono: m.abandonos, 'Por tiempo': m.tiempo, Error: m.errores }))}>
              <CartesianGrid stroke="#3A2C22" /><XAxis dataKey="m" stroke="#BFA98A" /><YAxis allowDecimals={false} stroke="#BFA98A" /><Tooltip /><Legend />
              <Bar dataKey="Directo" stackId="a" fill="#6CC4A8" /><Bar dataKey="Indirecto" stackId="a" fill="#F2B544" /><Bar dataKey="Abandono" stackId="a" fill="#FF7A5C" /><Bar dataKey="Por tiempo" stackId="a" fill="#BFA98A" /><Bar dataKey="Error" stackId="a" fill="#E8642C" />
            </BarChart></ResponsiveContainer>
          </div>
          <div className="pn-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {fl.misiones.map((m) => (
              <div className="pn-card" key={m.mision}>
                <h3>{m.mision} · {m.titulo} <span className="pn-sub">(n = {m.n})</span></h3>
                <div className="pn-sub" style={{ marginBottom: 6 }}>{m.escenario}</div>
                <div className="pn-row" style={{ justifyContent: 'space-between' }}><span>Éxito (directo + indirecto)</span><b><P n={m.exito} /></b></div>
                <div className="pn-row" style={{ justifyContent: 'space-between' }}><span>Éxito directo · abandono</span><span><P n={m.directo} /> · <P n={m.abandono} /></span></div>
                <div className="pn-row" style={{ justifyContent: 'space-between' }}><span>Mediana · misclicks · toques</span><span>{f1(m.mediana, ' s')} · <P n={m.missPct} /> · {f1(m.toquesProm)}</span></div>
                <div className="pn-row" style={{ justifyContent: 'space-between' }}><span>SEQ · ayuda abierta</span><span>{f1(m.seq)} · {m.ayuda}</span></div>
                <h3 style={{ marginTop: 10 }}>Embudo de la ruta esperada</h3>
                {m.embudo.map((e) => <div key={e.paso}><div className="pn-row" style={{ justifyContent: 'space-between', fontSize: 12.5 }}><span>{e.paso}</span><span>{e.n} de {m.n}</span></div><Barra pct={m.n ? (e.n / m.n) * 100 : 0} color="var(--pn-acc)" /></div>)}
                {!!m.rutas.length && <><h3 style={{ marginTop: 10 }}>Rutas más frecuentes</h3>{m.rutas.map(([r, n]) => <div key={r} className="pn-sub">{n}× {r}</div>)}</>}
                {!!m.desvios.length && <div className="pn-sub" style={{ marginTop: 6 }}>Desvíos: {m.desvios.map(([k, n]) => `${k} (${n})`).join(', ')}</div>}
                {!!m.salidas.length && <div className="pn-sub">Puntos de salida: {m.salidas.map(([k, n]) => `${k} (${n})`).join(', ')}</div>}
                {(m.mision === 'D2' || m.mision === 'V1' || m.mision === 'V2') && <div className="pn-sub" style={{ marginTop: 6 }}>Gestos: ← {m.gestos.izquierda} · → {m.gestos.derecha} · ↑ {m.gestos.arriba} · ↑ bloqueado {m.gestos.arribaBloqueado} · mantener {m.gestos.mantener} · deshacer {m.gestos.deshacer}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function Ueq({ d, piloto }: { d: Dump; piloto: boolean }) {
  const u = useMemo(() => ueq(d, piloto), [d, piloto]);
  return (
    <>
      <Titulo t="UEQ" q="¿Qué experiencia deja la app? (−3 a +3; verde > 0,8)" />
      <Aviso n={u.n} />
      <div className="pn-grid">
        <div className="pn-card"><h3>Pragmática</h3><div className="pn-big">{f1(u.pragmatica)}</div><Tag s={u.semPrag} /></div>
        <div className="pn-card"><h3>Hedónica</h3><div className="pn-big">{f1(u.hedonica)}</div><Tag s={u.semHed} /></div>
        <div className="pn-card"><h3>General</h3><div className="pn-big">{f1(u.general)}</div><Tag s={u.semGen} />{u.lectura && <div className="pn-sub" style={{ marginTop: 6 }}>{u.lectura}</div>}</div>
      </div>
      <div className="pn-card" style={{ height: 340 }}>
        <h3>Pares que más bajan (media transformada)</h3>
        <ResponsiveContainer><BarChart layout="vertical" data={u.items.map((i) => ({ n: `${i.izq} – ${i.der}`, v: Number((i.media ?? 0).toFixed(2)) }))} margin={{ left: 120 }}>
          <CartesianGrid stroke="#3A2C22" /><XAxis type="number" domain={[-3, 3]} stroke="#BFA98A" /><YAxis type="category" dataKey="n" stroke="#BFA98A" width={200} /><Tooltip /><Bar dataKey="v">{u.items.map((i, k) => <Cell key={k} fill={(i.media ?? 0) > 0.8 ? '#6CC4A8' : (i.media ?? 0) < -0.8 ? '#FF7A5C' : '#F2B544'} />)}</Bar>
        </BarChart></ResponsiveContainer>
      </div>
      {u.comentarios.length > 0 && <div className="pn-card"><h3>«Si pudieras cambiar una sola cosa…»</h3>{u.comentarios.map((c, i) => <div key={i} className="pn-quote">{c}</div>)}</div>}
    </>
  );
}

export function Marca({ d, piloto }: { d: Dump; piloto: boolean }) {
  const m = useMemo(() => marca(d, piloto), [d, piloto]);
  const pts = useMemo(() => puntos(d, piloto).filter((p) => p.prueba === 'Marca A-B'), [d, piloto]);
  const voto = (t: { a: number; b: number; igual: number; ganador: 'A' | 'B' | null; p: number; n: number; minimo: number }, etiqueta: string) => (
    <div className="pn-card"><h3>{etiqueta}</h3>
      <div className="pn-row" style={{ justifyContent: 'space-between' }}><span>A (Noche)</span><b>{t.a}</b></div><div className="pn-row" style={{ justifyContent: 'space-between' }}><span>B (Kino)</span><b>{t.b}</b></div><div className="pn-row" style={{ justifyContent: 'space-between' }}><span>Igual</span><b>{t.igual}</b></div>
      <div className="pn-sub" style={{ marginTop: 6 }}>Votos decisivos {t.n} · p = {f1(t.p)} · mínimo para ganar: {t.minimo}</div>
      {t.n === 0 ? <Tag s="sin-datos" /> : t.ganador ? <Tag s="verde">gana {t.ganador}</Tag> : <Tag s="amarillo">tendencia, sin ganador</Tag>}
    </div>
  );
  return (
    <>
      <Titulo t="Marca A/B" q="¿Qué versión resulta más agradable y por qué? (Binomial bilateral, α = 0,05)" />
      <Aviso n={m.personas} />
      <div className="pn-warn">Orden de decisión (§4.5): 1) contraste AA en todas las combinaciones (script <code>npm run contrast</code>) · 2) legibilidad ≥ 5,5 y ≥ 70 % con el primer elemento previsto · 3) preferencia · 4) agrado y atributos si hay empate.</div>
      <div className="pn-grid">
        {voto(m.preferencia, 'Preferencia directa')}{voto(m.colores, 'Colores que prefiere')}{voto(m.lectura, 'Cuál se lee mejor')}{voto(m.cinematografica, '¿Cuál es más cinematográfica?')}
      </div>
      <div className="pn-card" style={{ overflow: 'auto' }}>
        <table><thead><tr><th></th><th>A · Noche</th><th>B · Kino</th></tr></thead><tbody>
          <tr><td>Agrado (1–7)</td><td>{f1(m.agradoA)}</td><td>{f1(m.agradoB)}</td></tr>
          <tr><td>Legibilidad (meta ≥ 5,5)</td><td>{f1(m.leerA)} <Tag s={m.semLeerA} /></td><td>{f1(m.leerB)} <Tag s={m.semLeerB} /></td></tr>
          <tr><td>≥ 2 atributos deseados</td><td><P n={m.dosAtributosA} /></td><td><P n={m.dosAtributosB} /></td></tr>
          <tr><td>Primera mirada en el elemento previsto (meta ≥ 70 %)</td><td><P n={m.jerarquiaA} /></td><td><P n={m.jerarquiaB} /></td></tr>
          <tr><td>Aburrido → Emocionante</td><td>{f1(m.emocionanteA)}</td><td>{f1(m.emocionanteB)}</td></tr>
          <tr><td>Genérico → Distintivo</td><td>{f1(m.distintivoA)}</td><td>{f1(m.distintivoB)}</td></tr>
          <tr><td>Frío → Cálido</td><td>{f1(m.calidoA)}</td><td>{f1(m.calidoB)}</td></tr>
          <tr><td>Confuso → Claro</td><td>{f1(m.claroA)}</td><td>{f1(m.claroB)}</td></tr>
          <tr><td>Palabras más elegidas</td><td className="pn-sub">{m.palabrasA.slice(0, 6).map(([w, n]) => `${w} (${n})`).join(', ')}</td><td className="pn-sub">{m.palabrasB.slice(0, 6).map(([w, n]) => `${w} (${n})`).join(', ')}</td></tr>
        </tbody></table>
      </div>
      <div className="pn-card"><h3>Primera mirada: A vs B (misma pantalla)</h3>
        {m.porPantalla.map((p) => (
          <div key={p.id} style={{ marginBottom: 14 }}><div className="pn-sub">{p.id} · agrado A {f1(p.agradoA)} / B {f1(p.agradoB)} · legibilidad A {f1(p.leerA)} / B {f1(p.leerB)}</div>
            <div className="pn-row" style={{ alignItems: 'flex-start' }}>{(['A', 'B'] as const).map((v) => <Heat key={v} vista={VISTA[p.id]} brand={v} kino={p.id} puntos={pts.filter((x) => x.pantalla === p.id && x.version === v)} escala={0.42} id={`marca-${p.id}-${v}`} />)}</div>
          </div>
        ))}
      </div>
      {m.motivos.length > 0 && <div className="pn-card"><h3>Por qué (M7)</h3>{m.motivos.map((x, i) => <div key={i} className="pn-quote">{x.cod} · {x.pantalla} · prefirió {x.pref || '—'}: «{x.texto}»</div>)}</div>}
    </>
  );
}

// ---------------------------------------------------------------- codificación + afinidad
const OPCIONES = [1, 0.5, 0];
export function Codificacion({ d, conexion, onCambio }: { d: Dump; conexion: Conexion; onCambio: () => void }) {
  const [msg, setMsg] = useState('');
  const guardar = async (hoja: string, rowId: string, cambios: Record<string, string | number>) => { const ok = await codificar(conexion, hoja, rowId, cambios); setMsg(ok ? 'Guardado ✓' : 'No se pudo guardar'); if (ok) onCambio(); };
  const rows5 = filas(d, HOJAS.cincoSeg);
  const rowsC = filas(d, HOJAS.cards);
  const rowsPC = filas(d, HOJAS.primerClic).filter((r) => String(r['Si SEQ ≤ 4: ¿qué la hizo difícil?'] ?? '') !== '' || r['Resultado 1er clic (auto)'] !== 'Correcto');
  const notas = filas(d, HOJAS.notas);
  const [tema, setTema] = useState<Record<string, string>>({});
  const temas = [...new Set(notas.map((n) => String(n['Tema'] ?? '')).filter(Boolean))];
  const Botones = ({ valor, onPick }: { valor: unknown; onPick: (v: number) => void }) => <span className="pn-row">{OPCIONES.map((v) => <button key={v} className="pn-btn" aria-pressed={valor !== '' && valor != null && Number(valor) === v} onClick={() => onPick(v)}>{String(v).replace('.', ',')}</button>)}</span>;
  const Motivo = ({ valor, lista, onPick }: { valor: unknown; lista: string[]; onPick: (v: string) => void }) => <select className="pn-in" style={{ minWidth: 120 }} value={String(valor ?? '')} onChange={(e) => onPick(e.target.value)}><option value="">Motivo…</option>{lista.map((x) => <option key={x}>{x}</option>)}</select>;
  return (
    <>
      <Titulo t="Codificación" q="Convierte las respuestas escritas en 1 / 0,5 / 0 con la clave de corrección, y agrupa las notas en temas." />
      {msg && <div className="pn-warn">{msg}</div>}
      <div className="pn-card"><h3>5 segundos · propósito y acción</h3>
        {rows5.length === 0 && <span className="pn-sub">Sin respuestas todavía.</span>}
        {rows5.map((r) => (
          <div key={r['Row ID']} style={{ padding: '8px 0', borderBottom: '1px solid var(--pn-line)' }}>
            <div><b>{r['Participante']}</b> · {r['Pantalla ID']} <span className="pn-sub">clave → propósito: {CLAVE_5S[r['Pantalla ID']]?.proposito} · acción: {CLAVE_5S[r['Pantalla ID']]?.accion}</span></div>
            <div className="pn-quote">{String(r['Notas'] ?? '')} · recuerdo: «{String(r['Recuerdo libre (textual, en orden)'] ?? '')}»</div>
            <div className="pn-row"><span>Propósito</span><Botones valor={r['Propósito (1/0,5/0)']} onPick={(v) => guardar(HOJAS.cincoSeg, r['Row ID'], { 'Propósito (1/0,5/0)': v })} /><span>Acción</span><Botones valor={r['Acción principal (1/0,5/0)']} onPick={(v) => guardar(HOJAS.cincoSeg, r['Row ID'], { 'Acción principal (1/0,5/0)': v })} /><Motivo valor={r['Motivo si no entendió propósito o acción (código)']} lista={MOTIVOS_5S} onPick={(v) => guardar(HOJAS.cincoSeg, r['Row ID'], { 'Motivo si no entendió propósito o acción (código)': v })} /></div>
          </div>
        ))}
      </div>
      <div className="pn-card"><h3>Cards · contenido y acción</h3>
        {rowsC.map((r) => (
          <div key={r['Row ID']} style={{ padding: '8px 0', borderBottom: '1px solid var(--pn-line)' }}>
            <div><b>{r['Participante']}</b> · {r['Card']}</div><div className="pn-quote">{String(r['Notas'] ?? '')}</div>
            <div className="pn-row"><span>Contenido</span><Botones valor={r['Contenido (1/0,5/0)']} onPick={(v) => guardar(HOJAS.cards, r['Row ID'], { 'Contenido (1/0,5/0)': v })} /><span>Acción</span><Botones valor={r['Acción principal (1/0,5/0)']} onPick={(v) => guardar(HOJAS.cards, r['Row ID'], { 'Acción principal (1/0,5/0)': v })} /><Motivo valor={r['Motivo si no captó contenido o acción (código)']} lista={MOTIVOS_CARDS} onPick={(v) => guardar(HOJAS.cards, r['Row ID'], { 'Motivo si no captó contenido o acción (código)': v })} /></div>
          </div>
        ))}
        {rowsC.length === 0 && <span className="pn-sub">Sin respuestas todavía.</span>}
      </div>
      <div className="pn-card"><h3>Primer clic · motivo del fallo o de SEQ ≤ 4</h3>
        {rowsPC.map((r) => (
          <div key={r['Row ID']} style={{ padding: '8px 0', borderBottom: '1px solid var(--pn-line)' }}>
            <div><b>{r['Participante']}</b> · {r['Tarea']} · {r['Resultado 1er clic (auto)']} · SEQ {r['SEQ 1–7']}</div><div className="pn-quote">{String(r['Si SEQ ≤ 4: ¿qué la hizo difícil?'] ?? '')} {String(r['¿Qué esperabas que pasara?'] ?? '')}</div>
            <Motivo valor={r['Motivo del fallo o de SEQ ≤ 4 (código)']} lista={MOTIVOS_CLIC} onPick={(v) => guardar(HOJAS.primerClic, r['Row ID'], { 'Motivo del fallo o de SEQ ≤ 4 (código)': v })} />
          </div>
        ))}
        {rowsPC.length === 0 && <span className="pn-sub">Nada por codificar.</span>}
      </div>
      <div className="pn-card"><h3>Diagrama de afinidad · notas</h3>
        <div className="pn-sub">Escribe el tema de cada nota (hasta 8 temas). El tablero de abajo se arma solo.</div>
        {notas.map((n) => (
          <div key={n['Row ID']} className="pn-row" style={{ padding: '6px 0', borderBottom: '1px solid var(--pn-line)' }}>
            <span className="pn-sub" style={{ width: 90 }}>{n['Participante']} · {n['Tipo']}{n['Gravedad'] ? ' ' + n['Gravedad'] : ''}</span><span style={{ flex: 1, minWidth: 200 }}>«{n['Texto']}»</span>
            <input className="pn-in" list="temas" style={{ minWidth: 150 }} defaultValue={String(n['Tema'] ?? '')} onChange={(e) => setTema((t) => ({ ...t, [n['Row ID']]: e.target.value }))} onBlur={() => tema[n['Row ID']] != null && guardar(HOJAS.notas, n['Row ID'], { Tema: tema[n['Row ID']] })} aria-label="Tema" />
          </div>
        ))}
        <datalist id="temas">{temas.map((t) => <option key={t} value={t} />)}</datalist>
        {notas.length === 0 && <span className="pn-sub">Sin notas todavía (las del cierre y las del moderador llegan aquí).</span>}
      </div>
      <Afinidad notas={notas} />
    </>
  );
}
function Afinidad({ notas }: { notas: Fila[] }) {
  const por: Record<string, Fila[]> = {};
  notas.filter((n) => n['Tema']).forEach((n) => { (por[n['Tema']] ??= []).push(n); });
  const cols = Object.entries(por).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  if (!cols.length) return null;
  return (
    <div className="pn-card"><h3>Tablero de afinidad</h3>
      <div className="pn-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {cols.map(([t, ns]) => {
          const prob = ns.filter((n) => n['Tipo'] === 'Problema'), pos = ns.filter((n) => n['Tipo'] === 'Positivo');
          const grav = prob.map((n) => Number(n['Gravedad'])).filter((x) => !Number.isNaN(x) && x > 0);
          return <div key={t} className="pn-card" style={{ background: '#1B140F' }}><b>{t}</b><div className="pn-sub">{ns.length} notas · {prob.length} problemas · {pos.length} positivas · gravedad prom. {grav.length ? f1(grav.reduce((a, b) => a + b, 0) / grav.length) : '—'}</div>{ns.map((n, i) => <div key={i} className="pn-quote">{String(n['Texto'])}</div>)}</div>;
        })}
      </div>
    </div>
  );
}

export function Salud({ d }: { d: Dump }) {
  const s = useMemo(() => salud(d), [d]);
  return (
    <>
      <Titulo t="Salud" q="¿Está funcionando la recolección?" />
      <div className="pn-grid">
        <div className="pn-card"><h3>Eventos recibidos</h3><div className="pn-big">{s.eventos}</div></div>
        <div className="pn-card"><h3>Sesiones activas (últimos 5 min)</h3><div className="pn-big">{s.activas.length}</div>{s.activas.map((a) => <div key={a.cod} className="pn-sub">{a.nombre} · {a.pantalla}</div>)}</div>
        <div className="pn-card"><h3>Errores de la app</h3><div className="pn-big" style={{ color: s.errores.length ? 'var(--pn-bad)' : undefined }}>{s.errores.length}</div>{s.errores.slice(-4).map((e, i) => <div key={i} className="pn-sub">{String(e['pantalla'])} · {String(e['mensaje'])}</div>)}</div>
        <div className="pn-card"><h3>Con código provisional</h3><div className="pn-big">{s.provisionales}</div><div className="pn-sub">eventos con TMP-… (se corrigen al reconectar)</div></div>
      </div>
      <div className="pn-card" style={{ height: 240 }}><h3>Eventos por minuto (últimos 15 min)</h3>
        <ResponsiveContainer><BarChart data={s.porMin.map(([k, n]) => ({ k, n }))}><CartesianGrid stroke="#3A2C22" /><XAxis dataKey="k" stroke="#BFA98A" /><YAxis allowDecimals={false} stroke="#BFA98A" /><Tooltip /><Bar dataKey="n" fill="#E8642C" /></BarChart></ResponsiveContainer>
      </div>
      {s.sinZona.length > 0 && <div className="pn-warn">Tareas sin zona medida todavía: {s.sinZona.map((t) => t.id).join(', ')}. Se miden solas la primera vez que alguien hace la tarea.</div>}
      {s.incompletos.length > 0 && <div className="pn-card"><h3>Sesiones incompletas</h3>{s.incompletos.map((p) => <div key={p['Código']} className="pn-sub">{p['Código']} · {p['Nombre mostrado']} · {p['Fases completadas']}/4 fases</div>)}</div>}
      <div className="pn-card"><h3>Dispositivos</h3>{s.dispositivos.map((x) => <div key={x} className="pn-sub">{x}</div>)}</div>
    </>
  );
}

export function Exportar({ d }: { d: Dump }) {
  const ORDEN_V13 = ['Participantes', 'Config', 'Pantallas', 'Zonas', '5 segundos', '5 s – Cards', 'Primer clic + SEQ', 'UEQ', 'Puntos', 'Marca A-B', 'Contraste'];
  const libro = (hojas: string[], quitarEnlace: boolean) => {
    const wb = XLSX.utils.book_new();
    hojas.forEach((h) => {
      const x = d[h]; if (!x) return;
      const quitar = quitarEnlace ? ['Nombre mostrado', 'Sesión ID', 'Row ID', 'Nombre ingresado'] : [];
      const idx = x.headers.map((k, i) => (quitar.includes(k) ? -1 : i)).filter((i) => i >= 0);
      const aoa = [idx.map((i) => x.headers[i]), ...x.rows.map((r) => idx.map((i) => r[i]))];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), h.slice(0, 31));
    });
    return wb;
  };
  const bajar = (wb: XLSX.WorkBook, nombre: string) => XLSX.writeFile(wb, nombre);
  const csv = (h: string) => { const blob = new Blob([XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet([d[h].headers, ...d[h].rows]))], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = h.replace(/\W+/g, '_') + '.csv'; a.click(); };
  const png = () => { document.querySelectorAll<HTMLElement>('[data-heat]').forEach((el) => { const c = el.querySelector('canvas'); if (!c) return; const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'mapa-' + el.dataset.heat + '.png'; a.click(); }); };
  return (
    <>
      <Titulo t="Exportar" q="Llevar los datos al informe." />
      <div className="pn-card">
        <h3>Excel</h3>
        <div className="pn-row">
          <button className="pn-btn pri" onClick={() => bajar(libro(ORDEN_V13, false), 'Registro_en_vivo_formato_v1.3.xlsx')}>Formato Registro v1.3 (para pegar en la plantilla)</button>
          <button className="pn-btn" onClick={() => bajar(libro(Object.keys(d), false), 'Registro_en_vivo_completo.xlsx')}>Completo (con Eventos, Flujos y Notas)</button>
          <button className="pn-btn" onClick={() => bajar(libro(Object.keys(d), true), 'Registro_en_vivo_anonimo.xlsx')}>Completo anónimo (sin nombres)</button>
        </div>
        <div className="pn-sub" style={{ marginTop: 8 }}>El formato v1.3 respeta nombres de hoja y orden de columnas de <i>Registro_Pruebas_Usabilidad_Kinoo_v1.3.xlsx</i>; las columnas extra (nombre, sesión, Row ID) van al final y se pueden borrar al pegar.</div>
      </div>
      <div className="pn-card"><h3>CSV por hoja</h3><div className="pn-row">{Object.keys(d).map((h) => <button key={h} className="pn-btn" onClick={() => csv(h)}>{h}</button>)}</div></div>
      <div className="pn-card"><h3>Mapas de calor (PNG)</h3><div className="pn-sub">Abre primero la vista con los mapas (5 segundos, Cards, Primer clic o Marca) y vuelve aquí; descarga los visibles.</div><button className="pn-btn" onClick={png}>Descargar mapas visibles</button></div>
    </>
  );
}
void MISIONES; void FLUJO_NOMBRE; void TAREAS;
