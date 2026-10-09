import React, { useEffect, useRef, useState } from 'react';
import { CINCO_SEG_INICIO, CINCO_SEG_PANTALLAS, CINCO_SEG_PREGUNTAS, CARDS_ESTIMULOS, CARDS_INICIO, CARDS_PREGUNTAS, CARDS_PRUEBA_GESTO, ELEMENTOS_FRENTE, ELEMENTOS_REVERSO, PELICULAS_CONOCIDAS, esPrioritario, flujoDePantalla, nombreDePantalla, rotar } from '@kinoo/tracking';
import { filmById } from '@kinoo/ui';
import { Kicker, Next, P, Page, PointPicker, Preguntas, Title, type Pregunta } from '../ui/kit';
import { PantallaCard, PantallaEstatica, useEscala } from '../ui/Estimulo';
import { useFrameCapture } from '../capture';
import { emit, fila, punto, round1, setCtx, trackerProducto } from '../track';
import { useSession } from '../session';

/** Muestra un estímulo exactamente `ms` y lo retira (gris). Mide el tiempo real con performance.now. */
export function Cronometrado({ ms, children, onFin, etiqueta }: { ms: number; children: (escala: number) => React.ReactNode; onFin: (realMs: number) => void; etiqueta: string }) {
  const escala = useEscala(90);
  const [visible, setVisible] = useState(true);
  const fin = useRef(onFin); fin.current = onFin;
  useEffect(() => {
    const t0 = performance.now();
    const a = setTimeout(() => setVisible(false), ms);
    const b = setTimeout(() => fin.current(Math.round(performance.now() - t0)), ms + 450);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [ms]);
  return (
    <div className="sh-stage" aria-label={etiqueta}>
      <div style={{ width: 390 * escala, height: 844 * escala, background: visible ? 'transparent' : '#3a3a3a', borderRadius: 14, overflow: 'hidden' }}>{visible ? children(escala) : null}</div>
    </div>
  );
}

type Fase = 'intro' | 'ver' | 'preg' | 'punto';

const P5S: Pregunta[] = [
  { id: 'P1', prompt: CINCO_SEG_PREGUNTAS.P1, tipo: 'texto-largo' },
  { id: 'P2', prompt: CINCO_SEG_PREGUNTAS.P2, tipo: 'texto-largo' },
  { id: 'P3', prompt: CINCO_SEG_PREGUNTAS.P3, tipo: 'texto-largo' },
  { id: 'P4', prompt: CINCO_SEG_PREGUNTAS.P4, tipo: 'escala', extremos: ['nada claro', 'totalmente claro'] },
  { id: 'P5', prompt: CINCO_SEG_PREGUNTAS.P5, tipo: 'texto', opcional: true },
];

/** Prueba 1: test de 5 segundos sobre pantallas completas (S02, S04, S03 en orden rotado). */
export function CincoSeg({ onListo }: { onListo: () => void }) {
  const s = useSession((x) => x.s)!;
  const orden = rotar(CINCO_SEG_PANTALLAS, s.indice);
  const [k, setK] = useState(0);
  const [fase, setFase] = useState<Fase>('intro');
  const [resp, setResp] = useState<Record<string, any>>({});
  const t0Punto = useRef(0);
  const escala = useEscala(190);
  const pantalla = orden[k];

  useEffect(() => {
    setCtx({ bloque: 'cinco-seg', estimulo: pantalla, pantalla, version: 'A' });
  }, [pantalla]);

  const terminarPantalla = (p: { x: number; y: number }) => {
    const t = (performance.now() - t0Punto.current) / 1000;
    punto({ prueba: '5 segundos', estimulo: pantalla, pantallaId: pantalla, version: 'A', nClic: 1, x: p.x, y: p.y, t, key: `5s-${pantalla}` });
    fila('5 segundos', pantalla, {
      'Pantalla ID': pantalla, Pantalla: nombreDePantalla(pantalla), Flujo: flujoDePantalla(pantalla), 'Versión': 'A',
      'Recuerdo libre (textual, en orden)': resp.P1 ?? '', 'Claridad 1–7': resp.P4 ?? '', 'Palabra / sensación': resp.P5 ?? '', 'Puntos registrados': 1,
      Notas: `P2 propósito: ${resp.P2 ?? ''} | P3 acción: ${resp.P3 ?? ''}`,
    });
    emit('task.end', { estimulo: pantalla, valor: 'ok' });
    if (k + 1 < orden.length) { setK(k + 1); setFase('intro'); setResp({}); } else onListo();
  };

  return (
    <Page fase={{ n: 1, nombre: 'Primera impresión' }} progreso={(k + (fase === 'intro' ? 0 : fase === 'ver' ? 0.3 : fase === 'preg' ? 0.6 : 0.9)) / orden.length}>
      {fase === 'intro' && (
        <>
          <Kicker>test de 5 segundos · {k + 1} de {orden.length}</Kicker>
          <Title>Primera impresión</Title>
          <P>{CINCO_SEG_INICIO}</P>
          <div className="sh-grow" />
          <Next onClick={() => { emit('task.start', { estimulo: pantalla, extra: { prueba: '5 segundos' } }); setFase('ver'); }} track="5s.listo">Estoy listo</Next>
        </>
      )}
      {fase === 'ver' && (
        <Cronometrado ms={5000} etiqueta="Pantalla durante 5 segundos" onFin={(real) => { emit('action', { valor: 'estimulo.5s', extra: { realMs: real, pantalla } }); setFase('preg'); }}>
          {(esc) => <PantallaEstatica pantalla={pantalla} escala={esc} />}
        </Cronometrado>
      )}
      {fase === 'preg' && (
        <Preguntas qs={P5S} onAnswer={(q, v) => emit('answer', { estimulo: pantalla, valor: String(v ?? ''), extra: { q: q.id } })}
          onDone={(r) => { setResp(r); t0Punto.current = performance.now(); setFase('punto'); }} etiquetaFinal="Continuar" />
      )}
      {fase === 'punto' && (
        <PointPicker etiqueta={`${CINCO_SEG_PREGUNTAS.P6}`} track="5s.punto" onPoint={terminarPantalla}>
          <PantallaEstatica pantalla={pantalla} escala={escala} id="kinoo-punto" />
        </PointPicker>
      )}
    </Page>
  );
}

type FaseCard = 'intro' | 'ver' | 'preg' | 'prueba';

/**
 * Prueba 1B: cards. Cada una de las 3 tarjetas es DISTINTA y se muestra dentro de la pantalla completa de Descubrir
 * (así se ve el contexto del gesto de deslizar). Tras las preguntas la persona la prueba de verdad (toca / desliza).
 * Se quitaron «¿Qué más recuerdas?» y «Señala lo primero que viste» porque repetían la pregunta de primer elemento y obligaban a mostrar la misma tarjeta otra vez.
 */
export function Cards({ onListo }: { onListo: () => void }) {
  const s = useSession((x) => x.s)!;
  const orden = rotar(CARDS_ESTIMULOS, s.indice);
  const [k, setK] = useState(0);
  const [fase, setFase] = useState<FaseCard>('intro');
  const [resp, setResp] = useState<Record<string, any>>({});
  const [toques, setToques] = useState(0);
  const acciones = useRef<string[]>([]);
  const primer = useRef<{ x: number; y: number; t: number; target: string } | null>(null);
  const t0 = useRef(0);
  const escalaPrueba = useEscala(250);
  const card = orden[k];
  const film = filmById(card.film)!;
  const elems = card.face === 'reverso' ? ELEMENTOS_REVERSO : ELEMENTOS_FRENTE;
  const conocida = PELICULAS_CONOCIDAS.includes(card.film);

  useEffect(() => { setCtx({ bloque: 'cards', estimulo: card.id, pantalla: 'S02', version: 'A' }); }, [card.id]);

  useFrameCapture('kinoo-frame', {
    t0: t0.current, enabled: fase === 'prueba', rev: card.id + fase,
    onClick: (c) => { setToques((n) => n + 1); if (!primer.current) primer.current = { x: c.x, y: c.y, t: c.t, target: c.target }; },
  });

  const qs: Pregunta[] = [
    { id: 'C0', prompt: CARDS_PREGUNTAS.C0, tipo: 'opcion', opciones: ['Sí', 'No'] },
    { id: 'C1', prompt: CARDS_PREGUNTAS.C1, tipo: 'opcion-texto', opciones: elems.map((e) => e.etiqueta), hint: 'Elige lo más cercano y cuéntalo con tus palabras.' },
    { id: 'C3', prompt: CARDS_PREGUNTAS.C3, tipo: 'texto-largo' },
    { id: 'C4', prompt: CARDS_PREGUNTAS.C4, tipo: 'escala', extremos: ['ninguna', 'muchas'] },
    { id: 'C5', prompt: CARDS_PREGUNTAS.C5, tipo: 'texto-largo' },
    { id: 'C6', prompt: CARDS_PREGUNTAS.C6, tipo: 'texto-largo' },
  ];

  const empezarPrueba = (r: Record<string, any>) => {
    setResp(r); setToques(0); acciones.current = []; primer.current = null; t0.current = performance.now(); setFase('prueba');
  };

  const terminar = () => {
    const c1 = resp.C1 as { op?: string; txt?: string };
    const primero = elems.find((e) => e.etiqueta === c1?.op);
    const pr = primer.current;
    if (pr) punto({ prueba: '5 s – Cards', estimulo: card.id, pantallaId: 'S02', version: 'A', nClic: 1, x: pr.x, y: pr.y, t: pr.t, key: `cards-${card.id}` });
    fila('5 s – Cards', card.id, {
      Card: card.id, 'Pantalla ID': 'S02', Flujo: flujoDePantalla('S02'), '¿Conocía la película? (Sí/No)': resp.C0 ?? '',
      'Primer elemento que llamó la atención': `${c1?.op ?? ''}${c1?.txt ? ' — ' + c1.txt : ''}`, '¿Prioritario? (auto)': esPrioritario(primero) ? 1 : 0,
      'Otros elementos recordados': '', '# elementos recordados': c1?.op ? 1 : 0,
      'Interés 1–7': resp.C4 ?? '', 'Información que faltó': resp.C6 ?? '', 'Puntos registrados': pr ? 1 : 0,
      Notas: `Cara: ${card.face} | Película: ${film.title} (conocida real: ${conocida ? 'sí' : 'no'}) | C3 contenido: ${resp.C3 ?? ''} | C5 acción: ${resp.C5 ?? ''} | Probó la tarjeta: ${toques} toques, acciones: ${acciones.current.join(', ') || 'ninguna'}${pr ? `, primer toque en ${pr.target} (${round1(pr.x)}, ${round1(pr.y)})` : ''}`,
    });
    emit('task.end', { estimulo: card.id, valor: 'ok', extra: { toques, acciones: acciones.current } });
    if (k + 1 < orden.length) { setK(k + 1); setFase('intro'); setResp({}); } else onListo();
  };

  const progreso = (k + (fase === 'intro' ? 0 : fase === 'ver' ? 0.25 : fase === 'preg' ? 0.5 : 0.85)) / orden.length;
  return (
    <Page fase={{ n: 1, nombre: 'Primera impresión' }} progreso={progreso}>
      {fase === 'intro' && (
        <>
          <Kicker>tarjetas · {k + 1} de {orden.length}</Kicker>
          <Title>Una tarjeta</Title>
          <P>{CARDS_INICIO}</P>
          <div className="sh-grow" />
          <Next onClick={() => { emit('task.start', { estimulo: card.id, extra: { prueba: '5 s – Cards', film: card.film, face: card.face } }); setFase('ver'); }} track="cards.listo">Estoy listo</Next>
        </>
      )}
      {fase === 'ver' && (
        <Cronometrado ms={5000} etiqueta="Tarjeta durante 5 segundos" onFin={(real) => { emit('action', { valor: 'estimulo.5s', extra: { realMs: real, card: card.id } }); setFase('preg'); }}>
          {(esc) => <PantallaCard card={card} escala={esc} />}
        </Cronometrado>
      )}
      {fase === 'preg' && (
        <Preguntas qs={qs} onAnswer={(q, v) => emit('answer', { estimulo: card.id, valor: typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''), extra: { q: q.id } })}
          onDone={empezarPrueba} etiquetaFinal="Continuar" />
      )}
      {fase === 'prueba' && (
        <div className="sh-stage" style={{ gap: 8 }}>
          <p className="sh-hint" data-hierarchy="primary" style={{ textAlign: 'center', fontSize: 14.5, color: 'var(--ink)' }}>{CARDS_PRUEBA_GESTO}</p>
          <PantallaCard card={card} escala={escalaPrueba} interactiva id="kinoo-frame"
            tracker={trackerProducto({ onAction: (name) => { acciones.current.push(name); } })} />
          <Next onClick={terminar} track="cards.prueba-listo">Listo</Next>
        </div>
      )}
    </Page>
  );
}
