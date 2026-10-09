import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FASES } from '@kinoo/tracking';
import { Kicker, Next, P, Page, Texto, Title } from './ui/kit';
import { Registro, Contexto } from './steps/Registro';
import { CincoSeg, Cards } from './steps/CincoSeg';
import { PrimerClic } from './steps/PrimerClic';
import { Flujos } from './steps/Flujos';
import { Ueq } from './steps/Ueq';
import { Marca } from './steps/Marca';
import { Cierre } from './steps/Cierre';
import { Gate, esEscritorio } from './steps/Gate';
import { client, emit, fila, modoLocal, resetReloj, setCtx } from './track';
import { indiceDeCodigo, useSession } from './session';

type Paso = 'contexto' | 'cinco' | 'cards' | 'primer' | 'flujos' | 'ueq' | 'marca' | 'cierre';
const PASOS: Record<number, Paso[]> = { 1: ['contexto', 'cinco', 'cards'], 2: ['primer'], 3: ['flujos', 'ueq'], 4: ['marca', 'cierre'] };

type Vista = { t: 'gate' } | { t: 'registro' } | { t: 'rechazo' } | { t: 'pausa-fase'; fase: number; retoma: boolean } | { t: 'paso'; fase: number; i: number } | { t: 'gracias' };

export function App() {
  const s = useSession((x) => x.s);
  const completar = useSession((x) => x.completarFase);
  const clear = useSession((x) => x.clear);
  const patch = useSession((x) => x.patch);
  const [forzado] = useState(() => { try { return new URLSearchParams(location.search).get('forzar') === '1'; } catch { return false; } });
  const [vista, setVista] = useState<Vista>(() => {
    if (esEscritorio() && !forzado) return { t: 'gate' };
    const cur = useSession.getState().s;
    if (!cur) return { t: 'registro' };
    const sig = cur.fasesCompletadas + 1;
    return sig > 4 ? { t: 'gracias' } : { t: 'pausa-fase', fase: sig, retoma: true };
  });
  const [pausado, setPausado] = useState(false);
  const [mod, setMod] = useState(false);
  const vistaRef = useRef(vista); vistaRef.current = vista;

  // retoma: confirma con el servidor cuántas fases lleva
  useEffect(() => {
    if (!s || vista.t !== 'pausa-fase' || !vista.retoma) return;
    emit('action', { valor: 'session.resume', extra: { faseSiguiente: vista.fase } });
    void client.reanudar(s.codigo, s.sesionId).then((r) => { if (r && (r.fasesCompletadas ?? 0) > s.fasesCompletadas) { patch({ fasesCompletadas: r.fasesCompletadas }); setVista({ t: 'pausa-fase', fase: Math.min(4, (r.fasesCompletadas ?? 0) + 1), retoma: true }); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // si quedó con código provisional (sin red al registrar), reintenta hasta lograr el definitivo
  useEffect(() => {
    if (!s?.provisional) return;
    const id = setInterval(async () => {
      const cur = useSession.getState().s;
      if (!cur?.provisional) return;
      const a = await client.registrar({ nombre: cur.nombreIngresado, ronda: cur.ronda, graba: cur.graba }, cur.sesionId);
      if (!(a as { provisional?: boolean }).provisional) {
        client.reetiquetarCola(cur.codigo, a);
        await client.reasignar(cur.codigo, a);
        patch({ codigo: a.codigo, nombreMostrado: a.nombreMostrado, ordenTareas: a.ordenTareas, ordenMarca: a.ordenMarca, ordenFlujos: a.ordenFlujos, provisional: false, indice: indiceDeCodigo(a.codigo, a.sesionId) });
      }
    }, 3000);
    return () => clearInterval(id);
  }, [s?.provisional, patch]);

  // pendientes que no llegaron (sin red): contexto y fases completadas se reintentan solos
  useEffect(() => {
    const id = setInterval(async () => {
      const cur = useSession.getState().s;
      if (!cur || cur.provisional) return;
      if (cur.perfilPendiente && (await client.perfil(cur.sesionId, cur.perfilPendiente))) useSession.getState().patch({ perfilPendiente: null });
      if (cur.fasesCompletadas > (cur.fasesEnviadas ?? 0) && (await client.faseCompletada(cur.sesionId, cur.fasesCompletadas))) useSession.getState().patch({ fasesEnviadas: cur.fasesCompletadas });
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

  const entrarFase = useCallback((fase: number) => {
    setCtx({ fase });
    emit('phase.start', { valor: fase });
    setVista({ t: 'paso', fase, i: 0 });
  }, []);

  const avanzar = useCallback(() => {
    const v = vistaRef.current;
    if (v.t !== 'paso') return;
    const lista = PASOS[v.fase];
    if (v.i + 1 < lista.length) { setVista({ t: 'paso', fase: v.fase, i: v.i + 1 }); return; }
    // fin de fase
    completar(v.fase);
    emit('phase.end', { valor: v.fase });
    const cur = useSession.getState().s;
    if (cur) void client.faseCompletada(cur.sesionId, v.fase);
    void client.vaciar(3);
    if (v.fase >= 4) { emit('session.end'); setVista({ t: 'gracias' }); }
    else setVista({ t: 'pausa-fase', fase: v.fase + 1, retoma: false });
  }, [completar]);

  if (vista.t === 'gate') return <Gate onForzar={() => { window.location.search = '?forzar=1'; }} />;
  if (vista.t === 'rechazo') return <Page><Kicker>gracias</Kicker><Title>Sin problema</Title><P>No guardamos nada. Gracias por tu tiempo.</P></Page>;
  if (vista.t === 'registro') {
    return <Registro onRechazo={() => setVista({ t: 'rechazo' })} onListo={() => entrarFase(1)} />;
  }
  if (!s) return <Registro onRechazo={() => setVista({ t: 'rechazo' })} onListo={() => entrarFase(1)} />;

  let cuerpo: React.ReactNode;
  if (vista.t === 'gracias') {
    cuerpo = (
      <Page>
        <Kicker>¡gracias!</Kicker>
        <Title>Terminaste, {s.nombreMostrado.replace(/ \d+$/, '').replace(' (provisional)', '')}</Title>
        <P>Tus respuestas ya están con el equipo. Si ves un aviso de «pendientes», déjanos esta pantalla abierta unos segundos.</P>
        <div className="sh-card"><span className="sh-hint">Tu código: <strong>{s.codigo}</strong></span></div>
        <Pendientes />
      </Page>
    );
  } else if (vista.t === 'pausa-fase') {
    const f = FASES[vista.fase - 1];
    cuerpo = (
      <Page total={4}>
        <Kicker>{vista.retoma ? 'seguimos donde lo dejaste' : `terminaste la fase ${vista.fase - 1}`}</Kicker>
        <Title>Fase {vista.fase} de 4</Title>
        <div className="sh-card"><p className="sh-q">{f.nombre}</p><span className="sh-hint">Unos {f.aprox}. Puedes tomarte un respiro antes de empezar.</span></div>
        {vista.retoma && vista.fase > 1 && <P>Lo que ya respondiste está guardado. Esta fase empieza desde su principio.</P>}
        <div className="sh-grow" />
        <Next onClick={() => entrarFase(vista.fase)} track="fase.empezar">{vista.retoma ? 'Retomar' : 'Seguir'}</Next>
      </Page>
    );
  } else {
    const paso = PASOS[vista.fase][vista.i];
    cuerpo = paso === 'contexto' ? <Contexto onListo={avanzar} />
      : paso === 'cinco' ? <CincoSeg onListo={avanzar} />
      : paso === 'cards' ? <Cards onListo={avanzar} />
      : paso === 'primer' ? <PrimerClic onListo={avanzar} />
      : paso === 'flujos' ? <Flujos onListo={avanzar} />
      : paso === 'ueq' ? <Ueq onListo={avanzar} />
      : paso === 'marca' ? <Marca onListo={avanzar} />
      : <Cierre onListo={avanzar} />;
  }

  return (
    <>
      <div key={vista.t === 'paso' ? `${vista.fase}-${vista.i}` : vista.t + ((vista as { fase?: number }).fase ?? '')}>{cuerpo}</div>
      <ModBar abierto={mod} onAbrir={() => setMod(true)} onCerrar={() => setMod(false)} pausado={pausado} setPausado={setPausado} saltar={avanzar} puedeSaltar={vista.t === 'paso'} onNueva={() => { clear(); resetReloj(); setVista({ t: 'registro' }); setMod(false); }} />
      {pausado && (
        <div role="dialog" aria-label="Pausa" style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#17120F', color: '#F4E7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, flexDirection: 'column', gap: 16 }}>
          <Title>En pausa</Title><P>Cuando estés listo/a, seguimos.</P>
          <Next onClick={() => { setPausado(false); emit('resume'); }} track="pausa.seguir">Seguir</Next>
        </div>
      )}
    </>
  );
}

function Pendientes() {
  const [n, setN] = useState(client.pendientes());
  useEffect(() => client.suscribir(() => setN(client.pendientes())), []);
  useEffect(() => { void client.vaciar(10); }, []);
  return <span className="sh-hint" aria-live="polite">{modoLocal ? 'Modo local (sin servidor): los datos quedan en este dispositivo.' : n ? `Enviando… (${n} pendientes)` : 'Todo enviado ✓'}</span>;
}

/** Barra del moderador: se abre con un toque largo (2 s) en la esquina superior derecha. Ese toque no se registra. */
function ModBar({ abierto, onAbrir, onCerrar, pausado, setPausado, saltar, puedeSaltar, onNueva }: { abierto: boolean; onAbrir: () => void; onCerrar: () => void; pausado: boolean; setPausado: (b: boolean) => void; saltar: () => void; puedeSaltar: boolean; onNueva: () => void }) {
  const s = useSession((x) => x.s);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<'Problema' | 'Positivo' | 'Idea'>('Problema');
  const [grav, setGrav] = useState(2);
  const [red, setRed] = useState(client.red());
  const [pend, setPend] = useState(client.pendientes());
  useEffect(() => client.suscribir(() => { setRed(client.red()); setPend(client.pendientes()); }), []);
  const iniciar = () => { timer.current = setTimeout(onAbrir, 2000); };
  const cancelar = () => { if (timer.current) clearTimeout(timer.current); };
  return (
    <>
      <button type="button" className="sh-modbtn" aria-label="Moderador" onPointerDown={iniciar} onPointerUp={cancelar} onPointerLeave={cancelar} onPointerCancel={cancelar} tabIndex={-1} />
      {abierto && (
        <div className="sh-mod" role="dialog" aria-label="Moderador">
          <div>
            <strong>Moderador · {s?.codigo} · {s?.nombreMostrado}</strong>
            <span className="sh-hint" style={{ color: '#4a3a2e' }}>Red: {red} · {pend} pendientes · Ronda {s?.ronda} · Graba: {s?.graba}</span>
            <div className="sh-row">
              <button type="button" className="kn-btn kn-btn-secondary kn-btn-sm" data-track="mod.pausa" onClick={() => { setPausado(!pausado); emit(pausado ? 'resume' : 'pause'); onCerrar(); }}>{pausado ? 'Reanudar' : 'Pausar'}</button>
              <button type="button" className="kn-btn kn-btn-secondary kn-btn-sm" data-track="mod.saltar" disabled={!puedeSaltar} onClick={() => { emit('skip', { valor: 'moderador' }); saltar(); onCerrar(); }}>Saltar paso</button>
              <button type="button" className="kn-btn kn-btn-secondary kn-btn-sm" data-track="mod.opinion" onClick={() => { emit('action', { valor: 'cambio-de-opinion' }); onCerrar(); }}>Cambió de opinión</button>
            </div>
            <label className="sh-hint" style={{ color: '#4a3a2e' }}>Nota u observación</label>
            <textarea className="sh-input" style={{ color: '#111', background: '#fff' }} value={texto} onChange={(e) => setTexto(e.target.value)} data-track="mod.nota" />
            <div className="sh-row">
              {(['Problema', 'Positivo', 'Idea'] as const).map((t) => <button key={t} type="button" className="kn-btn kn-btn-sm" style={{ background: tipo === t ? '#F2B544' : 'transparent', border: '2px solid #111', color: '#111' }} data-track={'mod.tipo-' + t} onClick={() => setTipo(t)}>{t}</button>)}
              <select value={grav} onChange={(e) => setGrav(Number(e.target.value))} data-track="mod.gravedad" aria-label="Gravedad" style={{ minHeight: 44 }}>{[1, 2, 3, 4].map((g) => <option key={g} value={g}>Gravedad {g}</option>)}</select>
            </div>
            <button type="button" className="kn-btn kn-btn-primary kn-btn-md" data-track="mod.guardar-nota" disabled={!texto.trim()} onClick={() => { fila('Notas', 'mod-' + Date.now(), { Prueba: 'Moderador', 'Pantalla / Tarea / Card': '', Texto: texto.trim(), Tipo: tipo, Gravedad: tipo === 'Problema' ? grav : '', Tema: '' }); emit('action', { valor: 'nota', extra: { tipo, grav } }); setTexto(''); }}>Guardar nota</button>
            <button type="button" className="kn-btn kn-btn-ghost kn-btn-sm" style={{ color: '#a3261a' }} data-track="mod.nueva" onClick={() => { if (confirm('¿Cerrar esta sesión y empezar con otra persona?')) onNueva(); }}>Cerrar esta sesión y registrar a otra persona</button>
            <button type="button" className="kn-btn kn-btn-ghost kn-btn-sm" style={{ color: '#111' }} data-track="mod.cerrar" onClick={onCerrar}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
void Texto;
