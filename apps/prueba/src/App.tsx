import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FLUJOS, PROTOTIPO_ESTUDIO, estudio, moduloCat, type Flujo, type Modulo, type Variante } from '@kinoo/tracking';
import { precargarPrototipo } from '@kinoo/ui';
import { Kicker, Next, P, Page, Title } from './ui/kit';
import { Bienvenida, Final } from './steps/Bienvenida';
import { Intro } from './steps/Intro';
import { Descubrir } from './steps/Descubrir';
import { Ver } from './steps/Ver';
import { Moods } from './steps/Moods';
import { Mazos } from './steps/Mazos';
import { Percepcion } from './steps/Percepcion';
import { Gate, esEscritorio } from './steps/Gate';
import type { Parte } from './steps/parte';
import { client, emit, modoLocal, resetReloj, setCtx } from './track';
import { modoEquipo, sesionEquipo, useSession } from './session';

const MODULOS: Record<Modulo, (p: { parte: Parte; onListo: () => void }) => React.JSX.Element> = {
  intro: Intro, descubrir: Descubrir, ver: Ver, moods: Moods, mazos: Mazos, percepcion: Percepcion,
};

type Vista = { t: 'gate' } | { t: 'equipo-menu' } | { t: 'bienvenida' } | { t: 'retoma' } | { t: 'parte'; i: number } | { t: 'lista'; i: number } | { t: 'final' };

/**
 * Prueba no moderada por link (protocolo v2.0): bienvenida → las partes del link (Completo, Link 1 o Link 2, el cuestionario de moods) → final.
 * Si la persona cierra y vuelve, retoma al principio de la parte que no terminó (con la misma card, textos y «Config»).
 */
export function App() {
  const s = useSession((x) => x.s);
  const patch = useSession((x) => x.patch);
  const [vista, setVista] = useState<Vista>(() => {
    if (modoEquipo) return { t: 'equipo-menu' };
    if (esEscritorio() && new URLSearchParams(location.search).get('forzar') !== '1') return { t: 'gate' };
    const cur = useSession.getState().s;
    if (!cur) return { t: 'bienvenida' };
    return cur.partes >= FLUJOS[cur.flujo].length ? { t: 'final' } : { t: 'retoma' };
  });
  const vistaRef = useRef(vista); vistaRef.current = vista;
  const partes = s ? FLUJOS[s.flujo] : [];

  // el prototipo se descarga mientras la persona lee la bienvenida
  useEffect(() => {
    const e = estudio();
    precargarPrototipo(PROTOTIPO_ESTUDIO, [...new Set([e.variantes.A.pantalla.pagina, e.variantes.B.pantalla.pagina, e.pantallas.ver.pagina, e.pantallas.resumen.pagina, e.pantallas.mazos.pagina])]);
  }, []);

  // sin red al registrar: código TMP-… hasta lograr el definitivo
  useEffect(() => {
    if (!s?.provisional) return;
    const id = setInterval(async () => {
      const cur = useSession.getState().s;
      if (!cur?.provisional) return;
      const a = await client.registrar({ ronda: cur.ronda, flujo: cur.flujo, variante: cur.variante, versionTextos: cur.textos?.version, versionEstudio: cur.estudio?.version, nombre: cur.nombre }, cur.sesionId);
      if (!(a as { provisional?: boolean }).provisional) {
        client.reetiquetarCola(cur.codigo, a);
        await client.reasignar(cur.codigo, a);
        patch({ codigo: a.codigo, variante: a.variante, provisional: false });
      }
    }, 3000);
    return () => clearInterval(id);
  }, [s?.provisional, patch]);

  // lo que no llegó sin red (perfil, control de atención, partes terminadas) se reintenta solo
  useEffect(() => {
    const id = setInterval(async () => {
      const cur = useSession.getState().s;
      if (!cur || cur.provisional) return;
      if (cur.perfilPendiente && (await client.perfil(cur.sesionId, cur.perfilPendiente))) useSession.getState().patch({ perfilPendiente: null });
      const total = FLUJOS[cur.flujo].length;
      if (cur.partes > (cur.partesEnviadas ?? 0) && (await client.progreso(cur.sesionId, cur.partes, cur.partes >= total))) useSession.getState().patch({ partesEnviadas: cur.partes });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // errores de JavaScript → hoja Errores
  useEffect(() => {
    const on = (e: ErrorEvent) => emit('error', { extra: { mensaje: e.message, stack: e.error?.stack ?? '', estado: JSON.stringify(vistaRef.current) } });
    const rej = (e: PromiseRejectionEvent) => emit('error', { extra: { mensaje: String(e.reason), estado: JSON.stringify(vistaRef.current) } });
    window.addEventListener('error', on); window.addEventListener('unhandledrejection', rej);
    return () => { window.removeEventListener('error', on); window.removeEventListener('unhandledrejection', rej); };
  }, []);

  const entrar = useCallback((i: number) => {
    const cur = useSession.getState().s!;
    const m = FLUJOS[cur.flujo][i];
    setCtx({ bloque: m, estimulo: null });
    emit('module.start', { valor: m });
    setVista({ t: 'parte', i });
  }, []);

  const terminarParte = useCallback((i: number) => {
    const cur = useSession.getState().s!;
    const lista = FLUJOS[cur.flujo];
    emit('module.end', { valor: lista[i] });
    if (!modoEquipo) {
      const partesHechas = Math.max(cur.partes, i + 1);
      useSession.getState().patch({ partes: partesHechas });
      void client.progreso(cur.sesionId, partesHechas, partesHechas >= lista.length).then((ok) => { if (ok) useSession.getState().patch({ partesEnviadas: partesHechas }); });
      void client.vaciar(3);
    }
    // entre una parte y la siguiente, un aviso de que la parte quedó guardada (en el modo equipo se pasa directo)
    if (i + 1 < lista.length) { if (modoEquipo) entrar(i + 1); else setVista({ t: 'lista', i }); }
    else { emit('session.end'); setVista(modoEquipo ? { t: 'equipo-menu' } : { t: 'final' }); }
  }, [entrar]);

  if (vista.t === 'gate') return <Gate onEquipo={() => { window.location.search = '?equipo=1'; }} />;
  if (vista.t === 'equipo-menu') return <MenuEquipo onEmpezar={(v, f, i) => { useSession.getState().set(sesionEquipo(v, f)); resetReloj(); entrar(i); }} />;
  if (vista.t === 'bienvenida' || !s) return <Bienvenida onListo={() => entrar(0)} />;
  if (vista.t === 'lista') return <ParteLista i={vista.i} total={partes.length} siguiente={moduloCat(partes[vista.i + 1])} onSeguir={() => entrar(vista.i + 1)} />;
  if (vista.t === 'final') return <><Final /><Pendientes /></>;
  if (vista.t === 'retoma') {
    const m = moduloCat(partes[s.partes]);
    return (
      <Page>
        <Kicker>seguimos donde lo dejaste</Kicker>
        <Title>Parte {s.partes + 1} de {partes.length}</Title>
        <P>Lo que ya respondiste está guardado. Esta parte ({m.nombre}, unos {m.aprox}) empieza desde su principio.</P>
        <div className="sh-grow" />
        <Next onClick={() => entrar(s.partes)} track="retomar">Seguir</Next>
      </Page>
    );
  }
  const modulo = partes[vista.i];
  const Componente = MODULOS[modulo];
  return (
    <>
      {modoEquipo && <BannerEquipo onMenu={() => setVista({ t: 'equipo-menu' })} onSaltar={() => terminarParte(vista.i)} />}
      <div key={`${vista.i}-${modulo}`}>
        <Componente parte={{ n: vista.i + 1, total: partes.length, nombre: moduloCat(modulo).nombre }} onListo={() => terminarParte(vista.i)} />
      </div>
    </>
  );
}

/** Entre dos partes: confirma que la anterior quedó guardada, cuánto falta y qué viene. */
function ParteLista({ i, total, siguiente, onSeguir }: { i: number; total: number; siguiente: { nombre: string; aprox: string }; onSeguir: () => void }) {
  return (
    <Page>
      <div className="sh-parte-lista" role="status">
        <span className="sh-tarea-icono" aria-hidden="true">✓</span>
        <Title>Parte {i + 1} lista</Title>
        <div className="sh-pasos" aria-label={`Llevas ${i + 1} de ${total} partes`}>{Array.from({ length: total }, (_, k) => <i key={k} data-hecho={k <= i} />)}</div>
        <P>Tus respuestas quedaron guardadas. Llevas {i + 1} de {total} partes.</P>
        <P>Sigue: <strong>{siguiente.nombre}</strong> (unos {siguiente.aprox}). Puedes hacer una pausa antes de seguir; si cierras, retomas aquí.</P>
      </div>
      <div className="sh-grow" />
      <Next onClick={onSeguir} track="parte.seguir">Seguir</Next>
    </Page>
  );
}

function Pendientes() {
  const [n, setN] = useState(client.pendientes());
  useEffect(() => client.suscribir(() => setN(client.pendientes())), []);
  useEffect(() => { void client.vaciar(10); }, []);
  if (modoLocal) return null;
  return <p className="sh-hint" style={{ textAlign: 'center', padding: 12 }} aria-live="polite">{n ? `Enviando tus respuestas… (${n} pendientes). Deja esta pantalla abierta unos segundos.` : 'Todo enviado ✓'}</p>;
}

/** Cinta fija del modo equipo: recuerda que no se guarda nada y deja saltar la parte o volver al menú. */
function BannerEquipo({ onMenu, onSaltar }: { onMenu: () => void; onSaltar: () => void }) {
  const b: React.CSSProperties = { minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1.5px solid #1A1411', background: 'transparent', color: '#1A1411', font: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer' };
  return (
    <>
      <div role="region" aria-label="Modo equipo" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90, minHeight: 42, padding: '3px 8px', background: '#F2B544', color: '#1A1411', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800 }}>
        <span style={{ flex: 1 }}>EQUIPO · no se guarda nada</span>
        <button type="button" style={b} data-track="equipo.saltar" onClick={onSaltar}>Saltar parte ▶</button>
        <button type="button" style={b} data-track="equipo.menu" onClick={onMenu}>Menú</button>
      </div>
      <div style={{ height: 46 }} aria-hidden="true" />
    </>
  );
}

/** Menú del modo equipo: probar el link como lo vería una persona, eligiendo la card, el link y desde qué parte. */
function MenuEquipo({ onEmpezar }: { onEmpezar: (v: Variante, f: Flujo, parte: number) => void }) {
  const [v, setV] = useState<Variante>('A');
  const [f, setF] = useState<Flujo>('Completo');
  const sel: React.CSSProperties = { flex: 1 };
  return (
    <Page>
      <Kicker>solo para el equipo</Kicker>
      <Title>Modo equipo</Title>
      <div className="sh-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <P>Aquí pruebas el link <strong>sin registrar a nadie</strong>: no se envía ni se guarda nada y no cuenta como participante. Con <code>?textos=borrador</code> en el enlace ves el borrador de Panel → Textos y Panel → Estudio.</P>
        <div className="sh-row">
          <label style={sel} className="sh-hint">Card<select className="sh-input" value={v} onChange={(e) => setV(e.target.value as Variante)} data-track="equipo.card"><option>A</option><option>B</option></select></label>
          <label style={sel} className="sh-hint">Link<select className="sh-input" value={f} onChange={(e) => setF(e.target.value as Flujo)} data-track="equipo.link">{Object.keys(FLUJOS).map((x) => <option key={x}>{x}</option>)}</select></label>
        </div>
      </div>
      {FLUJOS[f].map((m, i) => <Next key={m} variant={i === 0 ? 'primary' : 'secondary'} onClick={() => onEmpezar(v, f, i)} track={'equipo.parte-' + m}>{i + 1} · {moduloCat(m).nombre}</Next>)}
      <Next variant="ghost" onClick={() => { window.location.search = ''; }} track="equipo.salir">Salir del modo equipo</Next>
    </Page>
  );
}
