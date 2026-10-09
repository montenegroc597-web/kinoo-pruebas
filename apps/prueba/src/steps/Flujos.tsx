import React, { useEffect, useRef, useState } from 'react';
import { FLUJO_NOMBRE, MISIONES, MISIONES_BASE, MISION_SEQ_PREGUNTA, MISION_SEQ_SEGUIMIENTO, clasificarMision, desvios, type MisionCat, type ResultadoMision } from '@kinoo/tracking';
import { Button, Frame, ProductApp, SEED_ROUTE, type SeedId } from '@kinoo/ui';
import { Escala7, Kicker, Next, P, Page, Texto, Title } from '../ui/kit';
import { useEscala } from '../ui/Estimulo';
import { useFrameCapture } from '../capture';
import { emit, fila, nuevoId, round1, setCtx, trackerProducto } from '../track';
import { useSession } from '../session';

type Item = { k: 'a' | 's'; name: string; extra?: Record<string, unknown> };
const has = (tr: Item[], name: string, pred?: (e: Record<string, unknown>) => boolean) => tr.some((t) => t.k === 'a' && t.name === name && (!pred || pred(t.extra ?? {})));
const vio = (tr: Item[], id: string, despuesDe?: (t: Item) => boolean) => {
  let ok = !despuesDe;
  for (const t of tr) { if (despuesDe && despuesDe(t)) ok = true; if (ok && t.k === 's' && (t.name === id || t.name.startsWith(id + '.'))) return true; }
  return false;
};
/** ¿Se cumplió el éxito de la misión? Predicados sobre lo que hizo el participante. */
export const EXITO: Record<string, (tr: Item[]) => boolean> = {
  D1: (tr) => has(tr, 'mood.continue') && vio(tr, 'S05'),
  M1: (tr) => has(tr, 'deck.dealt', (e) => e.deck === 'nolan') && vio(tr, 'S02', (t) => t.k === 'a' && t.name === 'deck.dealt'),
  D2: (tr) => has(tr, 'mark.ring') && has(tr, 'mark.x') && has(tr, 'mark.dot'),
  M2: (tr) => has(tr, 'deck.dealt', (e) => e.desde === 'recarga'),
  V1: (tr) => has(tr, 'platform.opened'),
  V2: (tr) => has(tr, 'reaction.saved', (e) => e.repeat === true),
  V3: (tr) => has(tr, 'space.removed:faro'),
};

/** ¿Qué pasos del embudo se alcanzaron? (para el embudo del Panel) */
export function pasosAlcanzados(m: MisionCat, tr: Item[]): boolean[] {
  return m.pasos.map((p) => {
    if (p.id.startsWith('screen:')) return vio(tr, p.id.slice(7));
    if (p.id.startsWith('nav:')) return has(tr, 'nav.mi-espacio') || vio(tr, 'S08');
    if (p.id === 'ver.watch') return has(tr, 'ver.watch') || has(tr, 'ver.swipe-verla');
    if (p.id.startsWith('deck.dealt:')) return has(tr, 'deck.dealt', (e) => e.deck === p.id.split(':')[1]);
    if (p.id === 'deck.dealt') return has(tr, 'deck.dealt');
    if (p.id === 'recarga.ask') return has(tr, 'recarga.ask');
    if (p.id === 'repeat.on') return has(tr, 'repeat.on') || has(tr, 'reaction.saved', (e) => e.repeat === true);
    return has(tr, p.id);
  });
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
    setTimeout(() => setEtapa('seq'), como === 'exito' ? 1100 : 0);
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
          {cerrada ? <div className="sh-task" role="status" aria-live="polite">{cerrada.resultado.startsWith('Éxito') ? '¡Listo!' : 'Seguimos'}</div>
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
