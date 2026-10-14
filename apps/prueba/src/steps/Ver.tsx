import React, { useEffect, useRef, useState } from 'react';
import { ACUERDO, OPCIONES_V3A, OPCIONES_V3C, VER_TEXTOS as T, estudio, rellenar } from '@kinoo/tracking';
import { Kicker, Next, P, Page, Preguntas, Title, useEscala, type Pregunta, type Resp } from '../ui/kit';
import { CincoSegundos, META, VistaProto } from '../ui/Proto';
import { moodElegido, type Toque } from '../captura';
import { emit, fila, setCtx } from '../track';
import { TareaProto, guardarPunto } from './tarea';
import { extremosDe, type Parte } from './parte';

type Etapa = 'inicio' | 'ver5' | 'v1' | 'v1c' | 'v2' | 'v2a' | 'v3' | 'v4' | 'v4p';
const ORDEN: Etapa[] = ['inicio', 'ver5', 'v1', 'v1c', 'v2', 'v2a', 'v3', 'v4', 'v4p'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const escala = (id: string, t: string, ext?: [string, string]): Pregunta => ({ id, prompt: t, tipo: 'escala', extremos: ext ?? extremosDe(t) });
const abierta = (id: string, t: string): Pregunta => ({ id, prompt: t, tipo: 'texto-largo' });

/**
 * M2 · Ver (§2). Ver 5 s → V1a–V1b → el filtro marcado con un círculo rojo, SIN explicación (V1c–V1d) → tarea con el filtro (V2)
 * → SEQ → explicación breve y preguntas guía (V3a–V3d) → una recomendación con su «por qué» y la confianza (V4a–V4d).
 */
export function Ver({ parte, onListo }: { parte: Parte; onListo: () => void }) {
  const cfg = estudio();
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const r = useRef<Resp & { v2?: { mood: string; puntaje: number; segundos: number; movimientos: number; fuera: number } }>({});
  const frame = useRef<HTMLIFrameElement | null>(null);
  const sig = () => setEtapa(ORDEN[ORDEN.indexOf(etapa) + 1]);
  useEffect(() => { setCtx({ bloque: 'ver', estimulo: etapa.toUpperCase(), pantalla: cfg.pantallas.ver.pagina }); }, [etapa, cfg.pantallas.ver.pagina]);

  const nombresMood = cfg.moods.map((m) => norm(m.nombre));
  const finV2 = (fin: { toques: Toque[]; segundos: number }) => {
    const mood = moodElegido(frame.current);
    const puntaje = norm(mood) === norm(cfg.claves.V2objetivo) ? 1 : norm(mood) === norm(cfg.claves.V2cercano) ? 0.5 : 0;
    const enBarra = (t: Toque) => t.tipo === 'gesto' || nombresMood.includes(norm(t.control));
    fin.toques.forEach((t) => guardarPunto('Ver', 'V2', cfg.pantallas.ver.pagina, t, enBarra(t) ? 'barra de mood' : 'fuera de lugar'));
    r.current.v2 = { mood, puntaje, segundos: fin.segundos, movimientos: fin.toques.filter(enBarra).length, fuera: fin.toques.filter((t) => !enBarra(t)).length };
    sig();
  };

  const guardar = () => {
    const x = r.current, v2 = x.v2!;
    const conf = [x.V4a, x.V4b, x.V4c].filter((n): n is number => typeof n === 'number');
    fila('Ver', 'fila', {
      'V1b · Claridad 1–7': x.V1b ?? '',
      'V2 · Mood alcanzado (1 correcto · 0,5 cercano · 0 otro)': v2.puntaje, 'V2 · Mood en el que terminó': v2.mood, 'V2 · Tiempo hasta terminar (s)': v2.segundos,
      'V2 · Movimientos de la barra (n)': v2.movimientos, 'V2 · Toques fuera de lugar (n)': v2.fuera, 'V2a · SEQ 1–7': x.V2a ?? '',
      'V3a · ¿Era lo que esperabas?': x.V3a ?? '', 'V3b · Utilidad del filtro 1–7': x.V3b ?? '', 'V3c · Preferencia': x.V3c ?? '', 'V3d · Qué cambiaría del filtro': x.V3d ?? '',
      'V4a · Confío en la recomendación 1–7': x.V4a ?? '', 'V4b · Entiendo por qué me la propone 1–7': x.V4b ?? '', 'V4c · Parece conocer mis gustos 1–7': x.V4c ?? '',
      'Índice de confianza (auto, 1–7)': conf.length === 3 ? Math.round((conf.reduce((a, b) => a + b, 0) / 3) * 100) / 100 : '',
      'V4d · Ganas de ver la película 1–7': x.V4d ?? '',
      'V1a · Respuesta': x.V1a ?? '', 'V1c · Respuesta': x.V1c ?? '', 'V1d · Respuesta': x.V1d ?? '', 'V2 · Mood objetivo': cfg.claves.V2objetivo,
    });
    if (String(x.V3d ?? '').trim()) fila('Notas', 'V3d', { 'Módulo': 'Ver', Pregunta: 'V3d', Texto: String(x.V3d).trim() });
    onListo();
  };
  const responder = (qs: Pregunta[], luego: () => void, etiqueta = 'Continuar', antes?: React.ReactNode) => (
    <Preguntas qs={qs} etiquetaFinal={etiqueta} antes={antes} onAnswer={(q, v) => emit('answer', { estimulo: q.id, valor: String(v ?? '') })} onDone={(res) => { Object.assign(r.current, res); luego(); }} />
  );

  return (
    <Page parte={parte} progreso={ORDEN.indexOf(etapa) / ORDEN.length}>
      {etapa === 'inicio' && (
        <>
          <Kicker>otra parte de la app</Kicker>
          <Title>Una pantalla</Title>
          <P>{T.inicio}</P>
          <div className="sh-grow" />
          <Next onClick={sig} track="v1.listo">Estoy listo</Next>
        </>
      )}
      {etapa === 'ver5' && <CincoSegundos pantalla={cfg.pantallas.ver} estimulo="V1" onFin={(ms) => { emit('action', { valor: 'estimulo.5s', extra: { realMs: ms } }); sig(); }} />}
      {etapa === 'v1' && responder([abierta('V1a', T.V1a), escala('V1b', T.V1b)], sig)}
      {etapa === 'v1c' && responder([abierta('V1c', T.V1c), abierta('V1d', T.V1d)], sig, 'Continuar', <Captura pantalla="filtro" resaltar />)}
      {etapa === 'v2' && (
        <TareaProto modulo="Ver" tarea="V2" pantalla={cfg.pantallas.ver} consigna={rellenar(T.V2, { mood: `«${cfg.claves.V2objetivo}»` })} nota={T.V2listo} conListo
          onFrame={(f) => { frame.current = f; }} onFin={finV2} />
      )}
      {etapa === 'v2a' && responder([escala('V2a', T.V2a)], sig)}
      {etapa === 'v3' && responder([
        { id: 'V3a', prompt: T.V3a, tipo: 'opcion', opciones: OPCIONES_V3A }, escala('V3b', T.V3b),
        { id: 'V3c', prompt: T.V3c, tipo: 'opcion', opciones: OPCIONES_V3C }, abierta('V3d', T.V3d),
      ], sig, 'Continuar', <div className="sh-banner">{T.V3}</div>)}
      {etapa === 'v4' && (
        <div className="sh-stage">
          <div className="sh-banner">{T.V4}</div>
          <Captura pantalla="recomendacion" grande onListo={() => emit('screen.view', { valor: 'recomendacion' })} />
          <Next onClick={sig} track="v4.continuar">Continuar</Next>
        </div>
      )}
      {etapa === 'v4p' && responder([escala('V4a', T.V4a, ACUERDO), escala('V4b', T.V4b, ACUERDO), escala('V4c', T.V4c, ACUERDO), escala('V4d', T.V4d)], guardar, 'Terminar esta parte',
        <Captura pantalla="recomendacion" />)}
    </Page>
  );
}

/** Pantalla estática del prototipo (pequeña junto a las preguntas, o `grande`), con «Cargando…» hasta que está lista. */
function Captura({ pantalla, resaltar, grande, onListo }: { pantalla: 'filtro' | 'recomendacion'; resaltar?: boolean; grande?: boolean; onListo?: () => void }) {
  const esc = useEscala(META.ancho, META.alto, grande ? 190 : 430, grande ? 1 : 0.62);
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative', alignSelf: 'center' }}>
      <VistaProto pantalla={estudio().pantallas[pantalla]} escala={esc} resaltar={resaltar} onListo={() => { setVisible(true); onListo?.(); }} />
      {!visible && <div className="sh-cargando">Cargando…</div>}
    </div>
  );
}
