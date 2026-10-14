import React, { useEffect, useState } from 'react';
import { ESTUDIO_DEFECTO, VERSION_ESTUDIO_INICIAL, aplicarEstudio, completarEstudio, pendientesEstudio, validarEstudio, type Estudio as Cfg, type VersionEstudio } from '@kinoo/tracking';
import { guardarEstudio, historialEstudio, leerEstudio, type Conexion } from './api';

const urlVistaPrevia = () => new URL(import.meta.env.VITE_PRUEBA_URL ?? '../prueba/', location.href).href + '?equipo=1&textos=borrador';
type Historial = (VersionEstudio & { id: number; creado: string })[];
const clonar = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/**
 * «Config» del estudio (hoja Config del Excel v2.0, secciones A–G): lo que el equipo define antes de lanzar el link.
 * Flujo igual que Textos: editar → guardar borrador → vista previa (modo equipo) → publicar con un nombre de versión.
 * Las personas que ya empezaron siguen con la versión con la que empezaron.
 */
export function Estudio({ conexion, participantes, onPublicado }: { conexion: Conexion; participantes: number; onPublicado: () => void }) {
  const [publicado, setPublicado] = useState<VersionEstudio | null>(null);
  const [historial, setHistorial] = useState<Historial>([]);
  const [e, setE] = useState<Cfg>(clonar(ESTUDIO_DEFECTO));
  const [cargado, setCargado] = useState(false);
  const [version, setVersion] = useState('');
  const [nota, setNota] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const recargar = async () => {
    const [pub, bor, his] = await Promise.all([leerEstudio(conexion, 'estudio'), leerEstudio(conexion, 'estudio-borrador'), historialEstudio(conexion)]);
    setPublicado(pub); setHistorial(his);
    const base = bor && (!pub?.publicado || (bor.publicado ?? '') > pub.publicado) ? bor : pub;
    setE(completarEstudio(base?.estudio));
  };
  useEffect(() => { recargar().catch((x) => setMsg({ ok: false, texto: String((x as Error).message) })).finally(() => setCargado(true)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const errores = validarEstudio(e);
  const pendientes = pendientesEstudio(e);
  const titulos = e.peliculas.map((p) => p.titulo);
  const moods = e.moods.map((m) => m.nombre);
  const cambiar = (f: (x: Cfg) => void) => setE((prev) => { const n = clonar(prev); f(n); return n; });

  const guardar = async (clave: 'estudio' | 'estudio-borrador') => {
    setMsg(null);
    if (errores.length) { setMsg({ ok: false, texto: `Hay ${errores.length} problema(s) por corregir.` }); return; }
    try {
      const v = await guardarEstudio(conexion, clave, { version: clave === 'estudio' ? version.trim() : 'borrador', nota: nota.trim(), estudio: e });
      if (clave === 'estudio') {
        aplicarEstudio(v.estudio); onPublicado();
        setMsg({ ok: true, texto: `Publicada «${v.version}». Las personas que abran el link desde ahora usan esta configuración.` }); setVersion(''); setNota(''); setConfirmar(false); await recargar();
      } else setMsg({ ok: true, texto: 'Borrador guardado. Ábrelo con «Vista previa» (modo equipo: no se registra nada).' });
    } catch (x) { setMsg({ ok: false, texto: String((x as Error).message) }); }
  };

  if (!cargado) return <div className="pn-card">Cargando configuración…</div>;
  const inp = (valor: string, on: (v: string) => void, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => <input className="pn-in" value={valor} onChange={(x) => on(x.target.value)} {...extra} />;
  const sel = (valor: string, opciones: string[], on: (v: string) => void, vacio = '—') => (
    <select className="pn-in" style={{ minWidth: 140 }} value={valor} onChange={(x) => on(x.target.value)}>{!opciones.includes(valor) && <option value={valor}>{valor || vacio}</option>}{opciones.map((o) => <option key={o}>{o}</option>)}</select>
  );
  return (
    <>
      <h2>Estudio</h2>
      <div className="pn-q">La hoja «Config» del Excel: lo que el equipo define antes de lanzar el link. Publicada: <b>{publicado?.version ?? VERSION_ESTUDIO_INICIAL}</b>{publicado?.publicado ? ` · ${publicado.publicado}` : ''}.</div>
      {pendientes.length > 0 && <div className="pn-warn">Pendiente antes de lanzar: {pendientes.join(' · ')}.</div>}
      {errores.length > 0 && <div className="pn-card">{errores.map((x, i) => <div key={i} className="pn-err">{x.error}</div>)}</div>}

      <div className="pn-card"><h3>A. Variantes de la card</h3>
        {(['A', 'B'] as const).map((v) => (
          <div key={v} className="pn-row" style={{ marginBottom: 8 }}>
            <b style={{ width: 20 }}>{v}</b>
            {inp(e.variantes[v].descripcion, (x) => cambiar((n) => { n.variantes[v].descripcion = x; }), { style: { flex: 1 }, 'aria-label': `Qué muestra la card ${v}` })}
            {inp(e.variantes[v].pantalla.pagina, (x) => cambiar((n) => { n.variantes[v].pantalla.pagina = x; }), { 'aria-label': `Página del prototipo de la card ${v}` })}
          </div>
        ))}
        <div className="pn-sub">Debe cambiar una sola cosa conceptual entre A y B. La página es la del prototipo (packages/kinoo-ui/public/kinoo-flujo/).</div>
      </div>

      <div className="pn-card"><h3>B. Respuestas esperadas (clave de codificación)</h3>
        <div className="pn-row"><span style={{ width: 210 }}>D2 · gesto «me interesa»</span>{sel(e.claves.gestoMeInteresa.correcto, ['derecha', 'izquierda', 'arriba', 'abajo'], (x) => cambiar((n) => { n.claves.gestoMeInteresa.correcto = x; }))}<span className="pn-sub">0,5 si toca:</span>{inp(e.claves.gestoMeInteresa.aceptables.join(', '), (x) => cambiar((n) => { n.claves.gestoMeInteresa.aceptables = x.split(',').map((s) => s.trim()).filter(Boolean); }))}</div>
        <div className="pn-row"><span style={{ width: 210 }}>D3 · gesto «no me interesa»</span>{sel(e.claves.gestoNoMeInteresa.correcto, ['derecha', 'izquierda', 'arriba', 'abajo'], (x) => cambiar((n) => { n.claves.gestoNoMeInteresa.correcto = x; }))}<span className="pn-sub">0,5 si toca:</span>{inp(e.claves.gestoNoMeInteresa.aceptables.join(', '), (x) => cambiar((n) => { n.claves.gestoNoMeInteresa.aceptables = x.split(',').map((s) => s.trim()).filter(Boolean); }))}</div>
        {(['D1b', 'D2bD3b', 'D4a', 'V1a', 'V1cV1d'] as const).map((k) => <div key={k} className="pn-row"><span style={{ width: 210 }}>{k}</span>{inp(e.claves[k], (x) => cambiar((n) => { n.claves[k] = x; }), { style: { flex: 1 } })}</div>)}
        <div className="pn-row"><span style={{ width: 210 }}>V2 · mood objetivo / cercano (0,5)</span>{sel(e.claves.V2objetivo, moods, (x) => cambiar((n) => { n.claves.V2objetivo = x; }))}{sel(e.claves.V2cercano, moods, (x) => cambiar((n) => { n.claves.V2cercano = x; }))}</div>
        <div className="pn-sub">El mood objetivo de V2 no puede ser el que el prototipo trae seleccionado al abrir («Sufrir bonito»).</div>
      </div>

      <div className="pn-card" style={{ overflow: 'auto' }}><h3>C. Moods del filtro (M3)</h3>
        <table><thead><tr><th>Mood</th><th>Definición del equipo</th><th>Película objetivo</th><th>Distractor: mood cercano</th><th>Distractor: mood opuesto</th><th>Distractor: neutra</th><th></th></tr></thead><tbody>
          {e.moods.map((m, i) => (
            <tr key={i}>
              <td>{inp(m.nombre, (x) => cambiar((n) => { n.moods[i].nombre = x; }), { style: { minWidth: 140 } })}</td>
              <td>{inp(m.definicion, (x) => cambiar((n) => { n.moods[i].definicion = x; }), { style: { minWidth: 220 } })}</td>
              {(['objetivo', 'cercano', 'opuesto', 'neutra'] as const).map((k) => <td key={k}>{sel(m[k], titulos, (x) => cambiar((n) => { n.moods[i][k] = x; }))}</td>)}
              <td><button className="pn-btn" onClick={() => cambiar((n) => { n.moods.splice(i, 1); })} aria-label={`Quitar ${m.nombre}`}>✕</button></td>
            </tr>
          ))}
        </tbody></table>
        {e.moods.length < 10 && <button className="pn-btn" onClick={() => cambiar((n) => { n.moods.push({ nombre: 'Nuevo mood', definicion: '(definir)', objetivo: titulos[0], cercano: titulos[1], opuesto: titulos[2], neutra: titulos[3] }); })}>+ Mood</button>}
        <div className="pn-sub">Distractor 1 de un mood cercano (la confusión más probable), 2 de un mood opuesto, 3 neutra. Películas conocidas y sin ambigüedad.</div>
      </div>

      <div className="pn-card" style={{ overflow: 'auto' }}><h3>Películas (las que se muestran en M3c y M3d)</h3>
        <table><thead><tr><th>Título</th><th>Director</th><th>Sinopsis breve</th><th></th></tr></thead><tbody>
          {e.peliculas.map((p, i) => (
            <tr key={i}>
              <td>{inp(p.titulo, (x) => cambiar((n) => { n.peliculas[i].titulo = x; }))}</td>
              <td>{inp(p.director, (x) => cambiar((n) => { n.peliculas[i].director = x; }))}</td>
              <td>{inp(p.sinopsis, (x) => cambiar((n) => { n.peliculas[i].sinopsis = x; }), { style: { minWidth: 320 } })}</td>
              <td><button className="pn-btn" onClick={() => cambiar((n) => { n.peliculas.splice(i, 1); })} aria-label={`Quitar ${p.titulo}`}>✕</button></td>
            </tr>
          ))}
        </tbody></table>
        <button className="pn-btn" onClick={() => cambiar((n) => { n.peliculas.push({ titulo: 'Nueva película', director: '', sinopsis: '' }); })}>+ Película</button>
      </div>

      <div className="pn-card"><h3>D. Películas para asociar a una categoría (M3d, 4 a 6, distintas de las de M3c)</h3>
        {e.peliculasM3d.map((p, i) => (
          <div key={i} className="pn-row" style={{ marginBottom: 6 }}>
            {sel(p.titulo, titulos, (x) => cambiar((n) => { n.peliculasM3d[i].titulo = x; }))}<span className="pn-sub">mood previsto</span>{sel(p.moodPrevisto, moods, (x) => cambiar((n) => { n.peliculasM3d[i].moodPrevisto = x; }))}
            <button className="pn-btn" onClick={() => cambiar((n) => { n.peliculasM3d.splice(i, 1); })} aria-label="Quitar">✕</button>
          </div>
        ))}
        {e.peliculasM3d.length < 6 && <button className="pn-btn" onClick={() => cambiar((n) => { n.peliculasM3d.push({ titulo: titulos[0], moodPrevisto: moods[0] }); })}>+ Película</button>}
      </div>

      <div className="pn-card"><h3>E. Mazos</h3>
        {e.mazos.ideas.map((t, i) => <div key={i} className="pn-row"><span style={{ width: 40 }}>K{i + 1}</span>{inp(t, (x) => cambiar((n) => { n.mazos.ideas[i] = x; }), { style: { flex: 1 } })}</div>)}
        {e.mazos.frases.map((f, i) => <div key={i} className="pn-row"><span style={{ width: 40 }}>S{i + 1}</span>{inp(f.texto, (x) => cambiar((n) => { n.mazos.frases[i].texto = x; }), { style: { flex: 1 } })}{sel(f.correcta, ['Verdadero', 'Falso'], (x) => cambiar((n) => { n.mazos.frases[i].correcta = x as 'Verdadero' | 'Falso'; }))}</div>)}
        {e.mazos.z4.map((o, i) => <div key={i} className="pn-row"><span style={{ width: 40 }}>Z4·{i + 1}</span>{inp(o.texto, (x) => cambiar((n) => { n.mazos.z4[i].texto = x; }), { style: { flex: 1 } })}<label className="pn-sub"><input type="radio" name="z4" checked={o.correcta} onChange={() => cambiar((n) => { n.mazos.z4.forEach((z, k) => { z.correcta = k === i; }); })} /> correcta</label></div>)}
      </div>

      <div className="pn-card"><h3>F. Elementos de la card (D1a)</h3>
        {e.elementosCard.map((x, i) => <label key={i} className="pn-row"><input type="checkbox" checked={x.prioritario} onChange={(ev) => cambiar((n) => { n.elementosCard[i].prioritario = ev.target.checked; })} /> {x.elemento}</label>)}
        <div className="pn-sub">Marcados = prioritarios (por defecto, póster y título).</div>
      </div>

      <div className="pn-card"><h3>G. Umbrales</h3>
        <div className="pn-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {(Object.keys(e.umbrales) as (keyof Cfg['umbrales'])[]).map((k) => (
            <label key={k} className="pn-row pn-sub" style={{ justifyContent: 'space-between' }}>{k}<input className="pn-in" style={{ minWidth: 0, width: 80 }} type="number" step="any" value={e.umbrales[k]} onChange={(x) => cambiar((n) => { n.umbrales[k] = Number(x.target.value); })} /></label>
          ))}
        </div>
        <div className="pn-sub">Porcentajes de 0 a 100. Son criterios de trabajo del equipo; se calibran con el piloto.</div>
      </div>

      <div className="pn-card"><h3>Pantallas del prototipo (avanzado)</h3>
        <div className="pn-sub">Página, acciones para llegar al estado («click» hasta que aparezca un texto) y elemento que se marca o mide. JSON.</div>
        <textarea className="pn-in" style={{ width: '100%', minHeight: 160, fontFamily: 'monospace', fontSize: 12 }} defaultValue={JSON.stringify(e.pantallas, null, 2)}
          onBlur={(x) => { try { const v = JSON.parse(x.target.value); cambiar((n) => { n.pantallas = v; }); } catch { setMsg({ ok: false, texto: 'El JSON de pantallas no es válido.' }); } }} aria-label="Pantallas del prototipo" />
      </div>

      <div className="pn-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="pn-row">
          <button className="pn-btn" onClick={() => setE(clonar(ESTUDIO_DEFECTO))}>Valores iniciales</button>
          <button className="pn-btn" onClick={() => setE(completarEstudio(publicado?.estudio))}>Descartar cambios</button>
          <button className="pn-btn" onClick={() => void guardar('estudio-borrador')}>Guardar borrador</button>
          <a className="pn-btn" href={urlVistaPrevia()} target="_blank" rel="noreferrer">Vista previa ↗</a>
        </div>
        <div className="pn-row">
          <input className="pn-in" placeholder="Nombre de la versión (p. ej. ronda1-v1)" value={version} maxLength={60} onChange={(x) => setVersion(x.target.value)} aria-label="Nombre de la versión del estudio" />
          <input className="pn-in" style={{ flex: 1 }} placeholder="Qué cambió y por qué (opcional)" value={nota} maxLength={500} onChange={(x) => setNota(x.target.value)} aria-label="Nota del estudio" />
        </div>
        {!confirmar
          ? <div><button className="pn-btn pri" disabled={!version.trim() || !!errores.length} onClick={() => setConfirmar(true)}>Publicar…</button></div>
          : <div className="pn-warn">Vas a publicar «{version.trim()}».{participantes > 0 ? ` Ya hay ${participantes} personas registradas: las nuevas usarán otra configuración.` : ''}{pendientes.length ? ` Quedan pendientes: ${pendientes.length}.` : ''}
              <div className="pn-row" style={{ marginTop: 8 }}><button className="pn-btn pri" onClick={() => void guardar('estudio')}>Sí, publicar</button><button className="pn-btn" onClick={() => setConfirmar(false)}>Cancelar</button></div></div>}
        {msg && <div className={msg.ok ? 'pn-ok' : 'pn-err'} role="status">{msg.texto}</div>}
      </div>

      {historial.length > 0 && (
        <div className="pn-card"><h3>Versiones publicadas</h3>
          <table><thead><tr><th>Versión</th><th>Fecha</th><th>Nota</th><th></th></tr></thead><tbody>
            {historial.map((h) => <tr key={h.id}><td>{h.version}</td><td className="pn-sub">{new Date(h.creado).toLocaleString()}</td><td className="pn-sub">{h.nota}</td><td><button className="pn-btn" onClick={() => setE(completarEstudio(h.estudio))}>Cargar en el editor</button></td></tr>)}
          </tbody></table>
        </div>
      )}
    </>
  );
}
