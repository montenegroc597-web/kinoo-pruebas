import React, { useCallback, useEffect, useState } from 'react';
import { aplicarEstudio } from '@kinoo/tracking';
import './panel.css';
import { URL_POR_DEFECTO, cargarConexion, fetchDatos, guardarConexion, leerEstudio, type Conexion } from './api';
import type { Datos } from './analytics';
import { ComparacionAB, Codificacion, Descubrir, Exportar, Mazos, Moods, Participantes, Percepcion, Resumen, Salud, Ver } from './views';
import { Textos } from './Textos';
import { Estudio } from './Estudio';

const VISTAS = ['Resumen', 'Participantes', 'M1 · Descubrir', 'M2 · Ver', 'M3 · Moods', 'M4 · Mazos', 'M5 · Percepción', 'Card A vs B', 'Codificación', 'Estudio', 'Textos', 'Salud', 'Exportar'] as const;
type Vista = (typeof VISTAS)[number];
const REFRESCO_MS = 15_000;

export function App() {
  const [con, setCon] = useState<Conexion | null>(() => cargarConexion());
  const [url, setUrl] = useState(URL_POR_DEFECTO);
  const [key, setKey] = useState('');
  const [d, setD] = useState<Datos | null>(null);
  const [err, setErr] = useState('');
  const [vista, setVista] = useState<Vista>('Resumen');
  const [piloto, setPiloto] = useState(false);
  const [ultima, setUltima] = useState<Date | null>(null);
  const [, setVersionEstudio] = useState(0);

  const cargar = useCallback(async () => {
    if (!con) return;
    try { setD(await fetchDatos(con)); setErr(''); setUltima(new Date()); } catch (e) { setErr(String((e as Error).message)); }
  }, [con]);
  // los cálculos usan la «Config» publicada (moods, claves, umbrales)
  const cargarEstudio = useCallback(async () => {
    if (!con) return;
    try { aplicarEstudio((await leerEstudio(con, 'estudio'))?.estudio); setVersionEstudio((n) => n + 1); } catch { /* sin conexión: valores iniciales */ }
  }, [con]);
  // refresca solo con la pestaña visible: un Panel olvidado abierto no consume Supabase
  useEffect(() => {
    if (!con) return;
    void cargarEstudio().then(cargar);
    const id = setInterval(() => { if (document.visibilityState === 'visible') void cargar(); }, REFRESCO_MS);
    const alVolver = () => { if (document.visibilityState === 'visible') void cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', alVolver); };
  }, [con, cargar, cargarEstudio]);

  if (!con) {
    return (
      <div className="pn">
        <div className="pn-card pn-login">
          <h2>Panel Kinoo</h2>
          <div className="pn-sub">Pega la URL de la Edge Function de Supabase (…/functions/v1/kinoo) y la clave de lectura (READ_KEY). La clave solo se guarda en esta pestaña.</div>
          <input className="pn-in" placeholder="URL del backend" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="URL" />
          <input className="pn-in" placeholder="READ_KEY" type="password" value={key} onChange={(e) => setKey(e.target.value)} aria-label="Clave de lectura" />
          <button className="pn-btn pri" disabled={!url || !key} onClick={() => { const c = { url: url.trim(), key: key.trim() }; guardarConexion(c); setCon(c); }}>Entrar</button>
          {err && <div className="pn-warn">{err}</div>}
        </div>
      </div>
    );
  }
  const nPersonas = d?.hojas.Participantes?.rows.length ?? 0;
  return (
    <div className="pn">
      <nav className="pn-nav" aria-label="Vistas">
        <h1>Kinoo · Panel</h1>
        {VISTAS.map((v) => <button key={v} aria-current={vista === v ? 'page' : undefined} onClick={() => setVista(v)}>{v}</button>)}
        <div style={{ flex: 1 }} />
        <button onClick={() => { guardarConexion(null); setCon(null); setD(null); }}>Salir</button>
      </nav>
      <main className="pn-main">
        <div className="pn-top">
          <label><input type="checkbox" checked={piloto} onChange={(e) => setPiloto(e.target.checked)} /> incluir piloto (ronda 0)</label>
          <button className="pn-btn" onClick={() => void cargar()}>Actualizar</button>
          <span>{ultima ? `Actualizado ${ultima.toLocaleTimeString()} · cada ${REFRESCO_MS / 1000} s` : 'Cargando…'}</span>
          {err && <span style={{ color: 'var(--pn-bad)' }}>{err}</span>}
        </div>
        {vista === 'Textos' ? <Textos conexion={con} participantes={nPersonas} />
          : vista === 'Estudio' ? <Estudio conexion={con} participantes={nPersonas} onPublicado={() => setVersionEstudio((n) => n + 1)} />
          : !d ? <div className="pn-card">Cargando datos…</div>
          : vista === 'Resumen' ? <Resumen d={d} piloto={piloto} />
          : vista === 'Participantes' ? <Participantes d={d} piloto={piloto} conexion={con} onCambio={() => void cargar()} />
          : vista === 'M1 · Descubrir' ? <Descubrir d={d} piloto={piloto} />
          : vista === 'M2 · Ver' ? <Ver d={d} piloto={piloto} />
          : vista === 'M3 · Moods' ? <Moods d={d} piloto={piloto} />
          : vista === 'M4 · Mazos' ? <Mazos d={d} piloto={piloto} />
          : vista === 'M5 · Percepción' ? <Percepcion d={d} piloto={piloto} />
          : vista === 'Card A vs B' ? <ComparacionAB d={d} piloto={piloto} />
          : vista === 'Codificación' ? <Codificacion d={d} conexion={con} onCambio={() => void cargar()} />
          : vista === 'Salud' ? <Salud d={d} />
          : <Exportar d={d} conexion={con} />}
      </main>
    </div>
  );
}
