import React, { useEffect, useRef, useState } from 'react';
import { PRIMER_CLIC_CONTINUAR, PRIMER_CLIC_ESPERABAS, PRIMER_CLIC_INTRO, SEQ_PREGUNTA, TAREAS, flujoDePantalla, puntaje, type TareaCat } from '@kinoo/tracking';
import { Frame, ProductApp, SEED_ROUTE, type ProductControls } from '@kinoo/ui';
import { Button } from '@kinoo/ui';
import { Escala7, Kicker, Next, P, Page, Texto, Title } from '../ui/kit';
import { useEscala } from '../ui/Estimulo';
import { medirZona, useFrameCapture, type ClickInfo } from '../capture';
import { emit, filaGlobal, fila, punto, round1, setCtx, trackerProducto } from '../track';
import { useSession } from '../session';
import type { SeedId } from '@kinoo/ui';

type Etapa = 'intro' | 'escenario' | 'activa' | 'seq' | 'seq-porque' | 'esperabas';

/** Pruebas 2 + 3: test de primer clic sobre pantallas REALES e interactivas + pregunta SEQ después de cada tarea. */
export function PrimerClic({ onListo }: { onListo: () => void }) {
  const s = useSession((x) => x.s)!;
  const orden = s.ordenTareas.split('-').map((id) => TAREAS.find((t) => t.id === id)!) as TareaCat[];
  const [k, setK] = useState(0);
  const [etapa, setEtapa] = useState<Etapa>('intro');
  const [verTarea, setVerTarea] = useState(false);
  const [clics, setClics] = useState<ClickInfo[]>([]);
  const [fin, setFin] = useState<'correcto' | 'max' | 'rindio' | null>(null);
  const [seq, setSeq] = useState<number | null>(null);
  const [porque, setPorque] = useState('');
  const [esperabas, setEsperabas] = useState('');
  const t0 = useRef(0);
  const ctrl = useRef<ProductControls>(null);
  const tarea = orden[k];
  const escala = useEscala(170);
  const activa = etapa === 'activa';
  const clicsRef = useRef<ClickInfo[]>([]);
  const pantallaClic = useRef<string[]>([]);

  useFrameCapture('kinoo-frame', {
    tarea: activa ? tarea.id : null, t0: t0.current, enabled: activa && fin == null, rev: `${tarea.id}-${etapa}`,
    onClick: (c) => {
      if (!activa || fin) return;
      clicsRef.current = [...clicsRef.current, c];
      pantallaClic.current.push(c.n === 1 ? tarea.pantalla : (document.querySelector('#kinoo-frame') ? (window as any).__pantalla ?? tarea.pantalla : tarea.pantalla));
      setClics(clicsRef.current);
      if (c.resultado === 'Correcto') terminar('correcto');
      else if (c.n >= 3) terminar('max');
    },
  });

  const terminar = (motivo: 'correcto' | 'max' | 'rindio') => {
    setFin(motivo);
    setTimeout(() => setEtapa('seq'), motivo === 'rindio' ? 0 : 700); // deja ver la reacción de la app
  };

  const empezarTarea = () => {
    setCtx({ bloque: 'primer-clic', estimulo: tarea.id, pantalla: tarea.pantalla, version: 'A' });
    clicsRef.current = []; pantallaClic.current = []; setClics([]); setFin(null); setSeq(null); setPorque(''); setEsperabas(''); setVerTarea(false);
    t0.current = performance.now();
    emit('task.start', { estimulo: tarea.id, extra: { prueba: 'Primer clic', orden: k + 1, seed: tarea.seed } });
    setEtapa('activa');
    // mide y guarda la zona correcta de esta tarea (idéntica para todos, se actualiza por Row ID)
    setTimeout(() => {
      const fr = document.getElementById('kinoo-frame');
      if (!fr) return;
      const zc = medirZona(fr, tarea.id, 'correcta'), za = medirZona(fr, tarea.id, 'aceptable');
      if (zc) filaGlobal('Zonas', `zona-${tarea.id}-A`, { Tarea: tarea.id, 'Pantalla ID': tarea.pantalla, 'Descripción de la zona correcta': tarea.descripcionZona, 'X1 (%)': round1(zc.x1), 'Y1 (%)': round1(zc.y1), 'X2 (%)': round1(zc.x2), 'Y2 (%)': round1(zc.y2), ...(za ? { 'Alt. X1': round1(za.x1), 'Alt. Y1': round1(za.y1), 'Alt. X2': round1(za.x2), 'Alt. Y2': round1(za.y2) } : {}) });
    }, 600);
  };

  const guardar = () => {
    const cl = clicsRef.current;
    const primero = cl[0];
    const resultado = primero?.resultado ?? 'Miss click';
    const misses = cl.filter((c) => c.resultado === 'Miss click').length;
    cl.forEach((c) => punto({ prueba: 'Primer clic', estimulo: tarea.id, pantallaId: c.n === 1 ? tarea.pantalla : pantallaClic.current[c.n - 1] ?? tarea.pantalla, version: 'A', nClic: c.n, x: c.x, y: c.y, t: c.t, resultado: c.resultado, key: `pc-${tarea.id}-${c.n}` }));
    fila('Primer clic + SEQ', tarea.id, {
      Tarea: tarea.id, 'Orden en sesión': k + 1, 'Pantalla ID (auto)': tarea.pantalla, 'Flujo (auto)': flujoDePantalla(tarea.pantalla),
      'Tiempo al 1er clic (s)': primero ? round1(primero.t) : '', 'Resultado 1er clic (auto)': resultado, 'Puntaje auto (1/0,5/0)': puntaje(resultado), 'Puntaje final': puntaje(resultado),
      'Clics totales': cl.length, 'Miss clicks': misses, 'SEQ 1–7': seq ?? '', 'Si SEQ ≤ 4: ¿qué la hizo difícil?': porque, '¿Qué esperabas que pasara?': esperabas,
      Notas: fin === 'rindio' ? 'Se rindió' : fin === 'max' ? 'Llegó a 3 toques sin acertar' : '',
    });
    emit('task.end', { estimulo: tarea.id, valor: fin ?? '', extra: { clics: cl.length, misses, resultado, seq } });
    if (k + 1 < orden.length) { setK(k + 1); setEtapa('escenario'); } else onListo();
  };

  const progreso = (k + (etapa === 'escenario' ? 0 : activa ? 0.4 : 0.8)) / orden.length;

  if (etapa === 'intro') {
    return (
      <Page fase={{ n: 2, nombre: 'Encontrar acciones' }}>
        <Kicker>cinco situaciones</Kicker>
        <Title>¿Dónde tocarías?</Title>
        <P>{PRIMER_CLIC_INTRO}</P>
        <div className="sh-grow" />
        <Next onClick={() => setEtapa('escenario')} track="pc.entendido">Entendido</Next>
      </Page>
    );
  }
  if (etapa === 'escenario') {
    return (
      <Page fase={{ n: 2, nombre: 'Encontrar acciones' }} progreso={progreso}>
        <Kicker>situación {k + 1} de {orden.length}</Kicker>
        <div className="sh-card"><p className="sh-q" data-hierarchy="primary">{tarea.escenario}</p></div>
        <div className="sh-grow" />
        <Next onClick={empezarTarea} track="pc.empezar-tarea">Ver la pantalla</Next>
      </Page>
    );
  }
  if (activa) {
    return (
      <Page fase={{ n: 2, nombre: 'Encontrar acciones' }} progreso={progreso}>
        <div className="sh-stage" style={{ gap: 8 }}>
          {verTarea ? <div className="sh-task" role="status">{tarea.escenario}</div> : <button type="button" className="sh-pill" data-track="pc.ver-tarea" onClick={() => { setVerTarea(true); emit('help.open', { estimulo: tarea.id }); }}>Ver tarea</button>}
          <Frame brand="A" scale={escala} radius={14}>
            <ProductApp key={tarea.id + ':' + k} seed={tarea.seed as SeedId} route={SEED_ROUTE[tarea.seed as SeedId]} controlsRef={ctrl} tracker={trackerProducto({ onScreen: (id) => { (window as any).__pantalla = id; } })} />
          </Frame>
          <span className="sh-hint" aria-live="polite">{clics.length ? `Toque ${clics.length} de 3. ${PRIMER_CLIC_CONTINUAR}` : 'Toca el primer lugar donde lo harías.'}</span>
          <Button variant="ghost" size="sm" onClick={() => { emit('giveup', { estimulo: tarea.id }); terminar('rindio'); }} track="pc.me-rindo">No sé / me rindo</Button>
        </div>
      </Page>
    );
  }
  if (etapa === 'seq') {
    return (
      <Page fase={{ n: 2, nombre: 'Encontrar acciones' }} progreso={progreso}>
        <Kicker>una pregunta</Kicker>
        <p className="sh-q">{SEQ_PREGUNTA}</p>
        <Escala7 value={seq} onChange={setSeq} extremos={['muy difícil', 'muy fácil']} track="pc.seq" />
        <div className="sh-grow" />
        <Next disabled={seq == null} onClick={() => { emit('answer', { estimulo: tarea.id, valor: seq ?? '', extra: { q: 'SEQ' } }); setEtapa((seq ?? 7) <= 4 ? 'seq-porque' : 'esperabas'); }} track="pc.seq-siguiente">Siguiente</Next>
      </Page>
    );
  }
  if (etapa === 'seq-porque') {
    return (
      <Page fase={{ n: 2, nombre: 'Encontrar acciones' }} progreso={progreso}>
        <p className="sh-q">{tarea.seqSeguimiento}</p>
        <Texto grande value={porque} onChange={setPorque} track="pc.porque" autoFocus />
        <div className="sh-grow" />
        <Next disabled={!porque.trim()} onClick={() => { emit('answer', { estimulo: tarea.id, valor: porque, extra: { q: 'SEQ-porque' } }); setEtapa('esperabas'); }} track="pc.porque-siguiente">Siguiente</Next>
      </Page>
    );
  }
  return (
    <Page fase={{ n: 2, nombre: 'Encontrar acciones' }} progreso={progreso}>
      <p className="sh-q">{PRIMER_CLIC_ESPERABAS}</p>
      <span className="sh-hint">Opcional</span>
      <Texto grande value={esperabas} onChange={setEsperabas} track="pc.esperabas" />
      <div className="sh-grow" />
      <Next onClick={() => { if (esperabas) emit('answer', { estimulo: tarea.id, valor: esperabas, extra: { q: 'esperabas' } }); guardar(); }} track="pc.esperabas-siguiente">{k + 1 < orden.length ? 'Siguiente situación' : 'Terminar esta parte'}</Next>
    </Page>
  );
}
void useEffect;
