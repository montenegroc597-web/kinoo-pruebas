import React, { useCallback, useEffect, useState } from 'react';
import './panel.css';
import { URL_POR_DEFECTO, cargarConexion, fetchDump, guardarConexion, type Conexion } from './api';
import type { Dump } from './analytics';
import { Cards, CincoSeg, Codificacion, Exportar, Flujos, Marca, Participantes, PrimerClic, Resumen, Salud, Ueq } from './views';

const VISTAS = ['Resumen', 'Participantes', '5 segundos', 'Cards', 'Primer clic + SEQ', 'Flujos', 'UEQ', 'Marca A/B', 'Codificación', 'Salud', 'Exportar'] as const;
type Vista = (typeof VISTAS)[number];

export function App() {
  const [con, setCon] = useState<Conexion | null>(() => cargarConexion());
  const [url, setUrl] = useState(URL_POR_DEFECTO);
  const [key, setKey] = useState('');
  const [d, setD] = useState<Dump | null>(null);
  const [err, setErr] = useState('');
  const [vista, setVista] = useState<Vista>('Resumen');
  const [piloto, setPiloto] = useState(false);
  const [ultima, setUltima] = useState<Date | null>(null);
  const [presentacion, setPresentacion] = useState(true);

  const cargar = useCallback(async () => {
    if (!con) return;
    try { setD(await fetchDump(con)); setErr(''); setUltima(new Date()); } catch (e) { setErr(String((e as Error).message)); }
  }, [con]);
  useEffect(() => { void cargar(); if (!con) return; const id = setInterval(() => void cargar(), 10_000); return () => clearInterval(id); }, [con, cargar]);

  if (!con) {
    return (
      <div className="pn">
        <div className="pn-card pn-login">
          <h2>Panel Kinoo</h2>
          <div className="pn-sub">Pega la URL del Apps Script y la clave de lectura (READ_KEY). La clave solo se guarda en esta pestaña.</div>
          <input className="pn-in" placeholder="URL del Web App (…/exec)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="URL" />
          <input className="pn-in" placeholder="READ_KEY" type="password" value={key} onChange={(e) => setKey(e.target.value)} aria-label="Clave de lectura" />
          <button className="pn-btn pri" disabled={!url || !key} onClick={() => { const c = { url: url.trim(), key: key.trim() }; guardarConexion(c); setCon(c); }}>Entrar</button>
          {err && <div className="pn-warn">{err}</div>}
        </div>
      </div>
    );
  }
  const quitarNombres = (x: Dump): Dump => {
    if (!presentacion) return x;
    const o: Dump = {};
    for (const [h, v] of Object.entries(x)) {
      const idx = v.headers.map((k, i) => (['Nombre mostrado', 'Nombre ingresado', 'nombreMostrado'].includes(k) ? i : -1)).filter((i) => i >= 0);
      o[h] = { headers: v.headers, rows: v.rows.map((r) => r.map((c, i) => (idx.includes(i) ? '•••' : c))) };
    }
    return o;
  };
  const dd = d ? quitarNombres(d) : null;
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
          <label><input type="checkbox" checked={presentacion} onChange={(e) => setPresentacion(e.target.checked)} /> modo presentación (oculta nombres)</label>
          <button className="pn-btn" onClick={() => void cargar()}>Actualizar</button>
          <span>{ultima ? 'Actualizado ' + ultima.toLocaleTimeString() + ' · cada 10 s' : 'Cargando…'}</span>
          {err && <span style={{ color: 'var(--pn-bad)' }}>{err}</span>}
        </div>
        {!dd ? <div className="pn-card">Cargando datos…</div> : (
          vista === 'Resumen' ? <Resumen d={dd} piloto={piloto} />
          : vista === 'Participantes' ? <Participantes d={dd} piloto={piloto} />
          : vista === '5 segundos' ? <CincoSeg d={dd} piloto={piloto} />
          : vista === 'Cards' ? <Cards d={dd} piloto={piloto} />
          : vista === 'Primer clic + SEQ' ? <PrimerClic d={dd} piloto={piloto} />
          : vista === 'Flujos' ? <Flujos d={dd} piloto={piloto} />
          : vista === 'UEQ' ? <Ueq d={dd} piloto={piloto} />
          : vista === 'Marca A/B' ? <Marca d={dd} piloto={piloto} />
          : vista === 'Codificación' ? <Codificacion d={d!} conexion={con} onCambio={() => void cargar()} />
          : vista === 'Salud' ? <Salud d={dd} />
          : <Exportar d={presentacion ? dd : d!} />
        )}
      </main>
    </div>
  );
}
