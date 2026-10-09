import React, { useEffect, useRef, useState } from 'react';
import { FLUJO_NOMBRE, MISIONES, MISIONES_BASE, MISION_SEQ_PREGUNTA, MISION_SEQ_SEGUIMIENTO, clasificarMision, desvios, type MisionCat, type ResultadoMision } from '@kinoo/tracking';
import { Button, Frame, ProductApp, SEED_ROUTE, type SeedId } from '@kinoo/ui';
import { Escala7, Kicker, Next, P, Page, Texto, Title } from '../ui/kit';
import { useEscala } from '../ui/Estimulo';
import { useFrameCapture } from '../capture';
import { emit, fila, nuevoId, round1, setCtx, trackerProducto } from '../track';
import { useSession } from '../session';

import { EXITO, pasosAlcanzados, type Item } from '../misiones';

/** Pantalla de logro al llegar a la pantalla objetivo: refuerza la tarea hecha y da paso a la siguiente. */
function Felicidades({ ultima, onContinuar }: { ultima: boolean; onContinuar: () => void }) {
  return (
    <div role="dialog" aria-label="Tarea completada" style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(23,18,15,.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="kn-pop" style={{ width: '100%', maxWidth: 380, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r="44" fill="var(--sun)" />
          <circle cx="48" cy="48" r="44" fill="none" stroke="var(--sun-core)" strokeWidth="4" />
          <path d="M28 50 L43 65 L70 33" fill="none" stroke="#1A1411" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 80, animation: 'knCheck .6s .15s ease-out both' }} />
        </svg>
        <span className="sh-kicker">¡muy bien!</span>
        <h2 className="sh-title" style={{ fontSize: 32, lineHeight: 1.05, margin: '4px 0' }}>¡Felicidades! Completaste la tarea</h2>
        <p className="sh-p">{ultima ? 'Esa era la última situación de esta parte.' : 'Vamos con la siguiente situación.'}</p>
        <Next onClick={onContinuar} track="fl.continuar">{ultima ? 'Seguir' : 'Siguiente situación'}</Next>
      </div>
      <style>{'@keyframes knCheck{from{stroke-dashoffset:80}to{stroke-dashoffset:0}}@media (prefers-reduced-motion: reduce){svg path{animation:none!important}}'}</style>
    </div>
  );
}

type Etapa = 'intro' | 'escenario' | 'activa' | 'seq' | 'seq-porque';

class Limite extends React.Component<{ onError: (m: string, st?: string) => void; children: React.ReactNode }, { roto: boolean }> {
  state = { roto: false };
  static getDerivedStateFromError() { return { roto: true }; }
  componentDidCatch(e: Error) { this.props.onError(e.message, e.stack); }
  render() { return this.state.roto ? <div style={{ padding: 24, color: '#fff' }}>Algo falló en la app. Puedes pasar a la siguiente.</div> : this.props.children; }
}

/** Prueba 5: flujos completos (Descubrir, micro-flujo Mazos y Ver) con misiones tipo Maze. */
export function Flujos({ onListo, misiones = MISIONES_BASE }: { onListo: () => void; misiones?: string[] }) {
  const s = useSession((x) => x.s)!;
  const desc = s.ordenFlujos === 'Descubrir→Ver';
  const base = misiones.filter((id) => (desc ? true : true));
  const orden = (desc ? base : [...base.filter((i) => i[0] === 'V'), ...base.filter((i) => i[0] !== 'V')]).map((id) => MISIONES.find((m) => m.id === id)!) as MisionCat[];
  const [k, setK] = useState(0);
  const [etapa, setEtapa] = useState<Etapa>('intro');
  const [verTarea, setVerTarea] = useState(false);
  const [aviso, setAviso] = useState<'tiempo' | null>(null);
  const [cerrada, setCerrada] = useState<null | { resultado: ResultadoMision }>(null);
  const [seq, setSeq] = useState<number | null>(null);
  const [porque, setPorque] = useState('');
  const m = orden[k];
  const escala = useEscala(190);
  const trace = useRef<Item[]>([]);
  const ruta = useRef<string[]>([]);
  const toques = useRef(0), miss = useRef(0), ayuda = useRef(0), errorFlag = useRef(false);
  const t0 = useRef(0), tFin = useRef(0);
  const cerradaRef = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const activa = etapa === 'activa';

  useFrameCapture('kinoo-frame', {
    t0: t0.current, enabled: activa && !cerrada, rev: `${m.id}-${etapa}`,
    onClick: (c) => { if (!activa || cerradaRef.current) return; toques.current++; if (!c.interactivo) miss.current++; },
  });

  const cerrar = (como: 'exito' | 'rindio' | 'tiempo' | 'error') => {
    if (cerradaRef.current) return;
    cerradaRef.current = true;
    tFin.current = performance.now();
    if (timer.current) clearInterval(timer.current);
    const resultado = clasificarMision({ exito: como === 'exito', abandono: como === 'rindio', tiempoAgotado: como === 'tiempo', error: como === 'error' || errorFlag.current && como !== 'exito', ruta: ruta.current, rutaEsperada: m.rutaEsperada });
    setCerrada({ resultado });
    if (como !== 'exito') setTimeout(() => setEtapa('seq'), 0); // en éxito se espera a que la persona toque «Siguiente situación»
  };

  const revisar = () => { if (!cerradaRef.current && EXITO[m.id](trace.current)) cerrar('exito'); };

  const empezar = () => {
    setCtx({ bloque: 'flujos', estimulo: m.id, pantalla: m.pantallaInicio, version: 'A' });
    trace.current = []; ruta.current = []; toques.current = 0; miss.current = 0; ayuda.current = 0; errorFlag.current = false; cerradaRef.current = false;
    setCerrada(null); setSeq(null); setPorque(''); setVerTarea(false); setAviso(null);
    t0.current = performance.now();
    emit('task.start', { estimulo: m.id, extra: { prueba: 'Flujos', flujo: m.flujo, seed: m.seed, orden: k + 1 } });
    setEtapa('activa');
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => { if (!cerradaRef.current && (performance.now() - t0.current) / 1000 > m.maxTiempo) { setAviso('tiempo'); if (timer.current) clearInterval(timer.current); } }, 1000);
  };
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const guardar = () => {
    const resultado = cerrada?.resultado ?? 'Abandono';
    const seg = round1(((tFin.current || performance.now()) - t0.current) / 1000);
    const pasos = pasosAlcanzados(m, trace.current);
    const rutaTxt = ruta.current.filter((p, i) => i === 0 || p !== ruta.current[i - 1]).join(' > ');
    fila('Flujos', m.id, {
      'Misión': m.id, Flujo: FLUJO_NOMBRE[m.flujo], Orden: k + 1, Resultado: resultado, 'Tiempo (s)': seg, Toques: toques.current, Misclicks: miss.current,
      'Pantallas visitadas (ruta)': rutaTxt, 'Desvíos': desvios(ruta.current, m.rutaEsperada).join(', '), 'Ayuda abierta': ayuda.current, SEQ: seq ?? '', 'SEQ motivo': porque,
      Notas: `Pasos alcanzados: ${pasos.filter(Boolean).length}/${pasos.length} [${pasos.map((b) => (b ? '1' : '0')).join('')}]`,
    });
    emit('task.end', { estimulo: m.id, valor: resultado, extra: { seg, toques: toques.current, misclicks: miss.current, pasos, ruta: rutaTxt, seq } });
    setEtapa('escenario');
    if (k + 1 < orden.length) setK(k + 1); else onListo();
  };

  const progreso = (k + (etapa === 'escenario' ? 0 : activa ? 0.4 : 0.8)) / orden.length;
  const fase = { n: 3, nombre: 'Usar la app' };

  if (etapa === 'intro') {
    return (
      <Page fase={fase}>
        <Kicker>ahora sí, a usarla</Kicker>
        <Title>Cinco situaciones</Title>
        <P>Te voy a contar una situación y tú la resuelves usando la app, como lo harías en tu casa. No hay respuestas correctas ni incorrectas: queremos ver dónde se complica. Si algo no te sale, puedes decir que te rindes.</P>
        <div className="sh-grow" />
        <Next onClick={() => setEtapa('escenario')} track="fl.entendido">Entendido</Next>
      </Page>
    );
  }
  if (etapa === 'escenario') {
    return (
      <Page fase={fase} progreso={progreso}>
        <Kicker>situación {k + 1} de {orden.length}</Kicker>
        <div className="sh-card"><p className="sh-q" data-hierarchy="primary">{m.escenario}</p></div>
        <div className="sh-grow" />
        <Next onClick={empezar} track="fl.empezar">Empezar</Next>
      </Page>
    );
  }
  if (activa) {
    return (
      <Page fase={fase} progreso={progreso}>
        <div className="sh-stage" style={{ gap: 8 }}>
          {verTarea ? <div className="sh-task" role="status">{m.escenario}</div> : <button type="button" className="sh-pill" data-track="fl.ver-tarea" onClick={() => { setVerTarea(true); ayuda.current++; emit('help.open', { estimulo: m.id }); }}>Ver tarea</button>}
          <Limite onError={(msg, st) => { errorFlag.current = true; emit('error', { extra: { mensaje: msg, stack: st, mision: m.id } }); cerrar('error'); }}>
            <Frame brand="A" scale={escala} radius={14}>
              <ProductApp key={m.id + ':' + k} seed={m.seed as SeedId} route={SEED_ROUTE[m.seed as SeedId]}
                tracker={trackerProducto({
                  onScreen: (id) => { ruta.current.push(id); trace.current.push({ k: 's', name: id }); revisar(); },
                  onAction: (name, extra) => { trace.current.push({ k: 'a', name, extra }); revisar(); },
                })} />
            </Frame>
          </Limite>
          {cerrada ? <div className="sh-task" role="status" aria-live="polite">{cerrada.resultado.startsWith('Éxito') ? '¡Listo!' : 'Seguimos con la siguiente'}</div>
            : aviso === 'tiempo' ? (
              <div className="sh-task" role="status" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span>Llevas un buen rato. ¿Quieres pasar a la siguiente?</span>
                <div className="sh-row">
                  <Button variant="secondary" size="sm" onClick={() => setAviso(null)} track="fl.seguir">Seguir intentando</Button>
                  <Button variant="primary" size="sm" onClick={() => { emit('skip', { estimulo: m.id, valor: 'tiempo' }); cerrar('tiempo'); }} track="fl.pasar">Pasar a la siguiente</Button>
                </div>
              </div>
            ) : <Button variant="ghost" size="sm" onClick={() => { emit('giveup', { estimulo: m.id }); cerrar('rindio'); }} track="fl.me-rindo">No sé / me rindo</Button>}
        </div>
        {cerrada?.resultado.startsWith('Éxito') && <Felicidades ultima={k + 1 >= orden.length} onContinuar={() => setEtapa('seq')} />}
      </Page>
    );
  }
  if (etapa === 'seq') {
    return (
      <Page fase={fase} progreso={progreso}>
        <Kicker>una pregunta</Kicker>
        <p className="sh-q">{MISION_SEQ_PREGUNTA}</p>
        <Escala7 value={seq} onChange={setSeq} extremos={['muy difícil', 'muy fácil']} track="fl.seq" />
        <div className="sh-grow" />
        <Next disabled={seq == null} onClick={() => { emit('answer', { estimulo: m.id, valor: seq ?? '', extra: { q: 'SEQ' } }); if ((seq ?? 7) <= 4) setEtapa('seq-porque'); else guardar(); }} track="fl.seq-siguiente">Siguiente</Next>
      </Page>
    );
  }
  return (
    <Page fase={fase} progreso={progreso}>
      <p className="sh-q">{MISION_SEQ_SEGUIMIENTO}</p>
      <Texto grande value={porque} onChange={setPorque} track="fl.porque" autoFocus />
      <div className="sh-grow" />
      <Next disabled={!porque.trim()} onClick={() => { emit('answer', { estimulo: m.id, valor: porque, extra: { q: 'SEQ-porque' } }); guardar(); }} track="fl.porque-siguiente">Siguiente</Next>
    </Page>
  );
}
void nuevoId;
