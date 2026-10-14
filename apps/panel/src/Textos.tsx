import React, { useEffect, useMemo, useState } from 'react';
import { MAX_TEXTO, VERSION_PROTOCOLO, camposTexto, soloCambios, validarTextos, type CampoTexto, type VersionTextos } from '@kinoo/tracking';
import { guardarTextos, historialTextos, leerTextos, type Conexion } from './api';

const FASES = ['Bienvenida, cierre e introducción', 'M1 · Descubrir', 'M2 · Ver', 'M3 · Moods', 'M4 · Mazos', 'M5 · Percepción final'];
/** Vista previa: la app de prueba en modo equipo (no registra nada) con el borrador. En desarrollo, VITE_PRUEBA_URL. */
const urlVistaPrevia = () => new URL(import.meta.env.VITE_PRUEBA_URL ?? '../prueba/', location.href).href + '?equipo=1&textos=borrador';

type Historial = (VersionTextos & { id: number; creado: string })[];

/**
 * Editor de la redacción de las preguntas e instrucciones de cada fase.
 * Solo cambia el TEXTO: las claves, las opciones de respuesta, las columnas y las métricas siguen el protocolo (cambian en código).
 * Flujo: editar → guardar borrador → vista previa en modo equipo → publicar con un nombre de versión.
 */
export function Textos({ conexion, participantes }: { conexion: Conexion; participantes: number }) {
  const campos = useMemo(() => camposTexto(), []);
  const defecto = useMemo(() => Object.fromEntries(campos.map((c) => [c.clave, c.defecto])), [campos]);
  const [publicado, setPublicado] = useState<VersionTextos | null>(null);
  const [historial, setHistorial] = useState<Historial>([]);
  const [propuesta, setPropuesta] = useState<Record<string, string>>(defecto);
  const [cargado, setCargado] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [soloEditados, setSoloEditados] = useState(false);
  const [version, setVersion] = useState('');
  const [nota, setNota] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const recargar = async () => {
    const [pub, bor, his] = await Promise.all([leerTextos(conexion, 'textos'), leerTextos(conexion, 'textos-borrador'), historialTextos(conexion)]);
    setPublicado(pub);
    setHistorial(his);
    // se retoma el borrador si es más reciente que lo publicado
    const base = bor && (!pub?.publicado || (bor.publicado ?? '') > pub.publicado) ? bor : pub;
    setPropuesta({ ...defecto, ...(base?.textos ?? {}) });
  };
  useEffect(() => { recargar().catch((e) => setMsg({ ok: false, texto: String((e as Error).message) })).finally(() => setCargado(true)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cambios = soloCambios(propuesta);
  const errores = validarTextos(cambios);
  const errorDe = (clave: string) => errores.filter((e) => e.clave === clave).map((e) => e.error).join(' · ');
  const difiereDePublicado = JSON.stringify(cambios) !== JSON.stringify(publicado?.textos ?? {});
  const visibles = campos.filter((c) => (!soloEditados || c.clave in cambios) && (!filtro || (c.clave + ' ' + c.prueba + ' ' + propuesta[c.clave]).toLowerCase().includes(filtro.toLowerCase())));

  const guardar = async (clave: 'textos' | 'textos-borrador') => {
    setMsg(null);
    if (errores.length) { setMsg({ ok: false, texto: `Hay ${errores.length} texto(s) por corregir.` }); return; }
    try {
      const v = await guardarTextos(conexion, clave, { version: clave === 'textos' ? version.trim() : 'borrador', nota: nota.trim(), textos: cambios });
      if (clave === 'textos') { setMsg({ ok: true, texto: `Publicada «${v.version}». Los participantes que se registren desde ahora verán esta redacción.` }); setVersion(''); setNota(''); setConfirmar(false); await recargar(); }
      else setMsg({ ok: true, texto: 'Borrador guardado. Ábrelo con «Vista previa» (modo equipo: no se registra nada).' });
    } catch (e) { setMsg({ ok: false, texto: String((e as Error).message) }); }
  };

  if (!cargado) return <div className="pn-card">Cargando textos…</div>;
  return (
    <>
      <h2>Textos</h2>
      <div className="pn-q">Redacción de las preguntas e instrucciones de cada fase. Solo cambia el texto: las opciones de respuesta, las columnas y las métricas siguen el protocolo.</div>

      <div className="pn-grid">
        <div className="pn-card"><h3>Publicada</h3><div className="pn-big" style={{ fontSize: 30 }}>{publicado?.version ?? VERSION_PROTOCOLO}</div>
          <div className="pn-sub">{publicado ? `${Object.keys(publicado.textos).length} cambios respecto al protocolo · ${publicado.publicado ?? ''}` : 'Redacción original del protocolo'}</div></div>
        <div className="pn-card"><h3>En el editor</h3><div className="pn-big" style={{ fontSize: 30 }}>{Object.keys(cambios).length}</div>
          <div className="pn-sub">textos distintos al protocolo{difiereDePublicado ? ' · sin publicar' : ' · igual a lo publicado'}</div></div>
        <div className="pn-card"><h3>Participantes registrados</h3><div className="pn-big" style={{ fontSize: 30 }}>{participantes}</div>
          <div className="pn-sub">cada uno queda marcado con la versión que vio (vista Participantes)</div></div>
      </div>

      <div className="pn-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="pn-row">
          <input className="pn-in" placeholder="Buscar texto o pregunta…" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Buscar" />
          <label className="pn-sub"><input type="checkbox" checked={soloEditados} onChange={(e) => setSoloEditados(e.target.checked)} /> solo los editados</label>
          <span style={{ flex: 1 }} />
          <button className="pn-btn" onClick={() => setPropuesta(defecto)}>Todo como el protocolo</button>
          <button className="pn-btn" onClick={() => setPropuesta({ ...defecto, ...(publicado?.textos ?? {}) })}>Descartar cambios</button>
          <button className="pn-btn" onClick={() => void guardar('textos-borrador')}>Guardar borrador</button>
          <a className="pn-btn" href={urlVistaPrevia()} target="_blank" rel="noreferrer">Vista previa ↗</a>
        </div>
        {msg && <div className={msg.ok ? 'pn-ok' : 'pn-err'} role="status">{msg.texto}</div>}
      </div>

      {FASES.map((nombre, fase) => {
        const deFase = visibles.filter((c) => c.fase === fase);
        if (!deFase.length) return null;
        return (
          <div className="pn-card" key={fase}>
            <h3>{nombre}</h3>
            {deFase.map((c) => <CampoEditable key={c.clave} c={c} valor={propuesta[c.clave]} error={errorDe(c.clave)} onCambio={(v) => setPropuesta((p) => ({ ...p, [c.clave]: v }))} />)}
          </div>
        );
      })}

      <div className="pn-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3>Publicar</h3>
        <div className="pn-sub">El protocolo pide leer lo mismo a todas las personas de una ronda: publica entre rondas. Quien ya empezó su sesión sigue con la redacción con la que empezó.</div>
        <div className="pn-row">
          <input className="pn-in" placeholder="Nombre de la versión (p. ej. ronda2-v1)" value={version} maxLength={60} onChange={(e) => setVersion(e.target.value)} aria-label="Nombre de la versión" />
          <input className="pn-in" style={{ flex: 1 }} placeholder="Qué cambió y por qué (opcional)" value={nota} maxLength={500} onChange={(e) => setNota(e.target.value)} aria-label="Nota" />
        </div>
        {!confirmar
          ? <div><button className="pn-btn pri" disabled={!version.trim() || !!errores.length || !difiereDePublicado} onClick={() => setConfirmar(true)}>Publicar…</button></div>
          : <div className="pn-warn">Vas a publicar «{version.trim()}» con {Object.keys(cambios).length} cambios.{participantes > 0 ? ` Ya hay ${participantes} participantes registrados: sus respuestas y las nuevas no habrán escuchado la misma redacción.` : ''}
              <div className="pn-row" style={{ marginTop: 8 }}><button className="pn-btn pri" onClick={() => void guardar('textos')}>Sí, publicar</button><button className="pn-btn" onClick={() => setConfirmar(false)}>Cancelar</button></div></div>}
      </div>

      {historial.length > 0 && (
        <div className="pn-card"><h3>Versiones publicadas</h3>
          <table><thead><tr><th>Versión</th><th>Fecha</th><th>Cambios</th><th>Nota</th><th></th></tr></thead><tbody>
            {historial.map((h) => (
              <tr key={h.id}><td>{h.version}</td><td className="pn-sub">{new Date(h.creado).toLocaleString()}</td><td>{Object.keys(h.textos ?? {}).length}</td><td className="pn-sub">{h.nota}</td>
                <td><button className="pn-btn" onClick={() => setPropuesta({ ...defecto, ...(h.textos ?? {}) })}>Cargar en el editor</button></td></tr>
            ))}
          </tbody></table>
        </div>
      )}
    </>
  );
}

function CampoEditable({ c, valor, error, onCambio }: { c: CampoTexto; valor: string; error: string; onCambio: (v: string) => void }) {
  const cambiado = valor.trim() !== c.defecto;
  return (
    <div className="pn-tx" data-cambio={cambiado} data-error={!!error}>
      <div className="pn-row" style={{ justifyContent: 'space-between' }}>
        <span><b>{c.prueba}</b> <code>{c.clave}</code></span>
        {cambiado && <button className="pn-btn" style={{ padding: '3px 10px' }} onClick={() => onCambio(c.defecto)}>Restaurar</button>}
      </div>
      <textarea value={valor} maxLength={MAX_TEXTO} onChange={(e) => onCambio(e.target.value)} aria-label={c.clave} />
      {cambiado && <div className="pn-sub">Protocolo: «{c.defecto}»</div>}
      {error && <div className="pn-err">{error}</div>}
    </div>
  );
}
