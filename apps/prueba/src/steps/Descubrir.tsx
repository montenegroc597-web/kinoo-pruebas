import React, { useEffect, useRef, useState } from 'react';
import { DESCUBRIR_TEXTOS as T, OPCIONES_D4C, estudio, puntajeGesto } from '@kinoo/tracking';
import { Kicker, Next, P, Page, Preguntas, Title, type Pregunta, type Resp } from '../ui/kit';
import { CincoSegundos } from '../ui/Proto';
import type { Toque } from '../captura';
import { emit, fila, setCtx } from '../track';
import { useSession } from '../session';
import { TareaProto, guardarPunto } from './tarea';
import { extremosDe, type Parte } from './parte';

type Etapa = 'inicio' | 'ver5' | 'd1' | 'd2' | 'd2p' | 'd3' | 'd3p' | 'd4' | 'd4p';
const ORDEN: Etapa[] = ['inicio', 'ver5', 'd1', 'd2', 'd2p', 'd3', 'd3p', 'd4', 'd4p'];
type ResGesto = { gesto: string; puntaje: number; segundos: number; fuera: number };
type ResMazo = { llegada: number | null; toques: number };

const escala = (id: string, t: string): Pregunta => ({ id, prompt: t, tipo: 'escala', extremos: extremosDe(t) });
const abierta = (id: string, t: string): Pregunta => ({ id, prompt: t, tipo: 'texto-largo' });

/**
 * M1 · Descubrir (§1). La card (A o B según la persona) 5 segundos → D1a–D1d → D2 «me interesa» y D3 «no me interesa» en el
 * prototipo vivo (se registra el gesto, el tiempo y los toques fuera de lugar) → SEQ y consecuencia → D4: explorar con libertad,
 * completar el mazo de 10 cartas y llegar a su resumen («qué dice este mazo de ti») → D4e, D4a–D4d, D4f.
 */
export function Descubrir({ parte, onListo }: { parte: Parte; onListo: () => void }) {
  const s = useSession((x) => x.s)!;
  const cfg = estudio();
  const card = cfg.variantes[s.variante].pantalla;
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const r = useRef<Resp & { d2?: ResGesto; d3?: ResGesto; d4?: ResMazo }>({});
  const sig = () => setEtapa(ORDEN[ORDEN.indexOf(etapa) + 1]);
  useEffect(() => { setCtx({ bloque: 'descubrir', estimulo: etapa.toUpperCase(), pantalla: card.pagina }); }, [etapa, card.pagina]);

  /** El primer gesto de deslizar, o el primer toque en un botón de decisión, termina la tarea. */
  const decisivos = [...cfg.claves.gestoMeInteresa.aceptables, ...cfg.claves.gestoNoMeInteresa.aceptables].map((x) => x.toLowerCase());
  const esDecisivo = (t: Toque) => t.tipo === 'gesto' || decisivos.includes(t.control.toLowerCase());
  const resultado = (tarea: 'D2' | 'D3', fin: { toques: Toque[]; final: Toque | null; segundos: number }): ResGesto => {
    const clave = tarea === 'D2' ? cfg.claves.gestoMeInteresa : cfg.claves.gestoNoMeInteresa;
    const gesto = fin.final ? (fin.final.tipo === 'gesto' ? `drag:${fin.final.dir}` : `tap:${fin.final.control}`) : 'ninguno';
    fin.toques.forEach((t) => guardarPunto('Descubrir', tarea, card.pagina, t, t === fin.final ? 'decisivo' : 'fuera de lugar'));
    return { gesto, puntaje: fin.final ? puntajeGesto(gesto, clave) : 0, segundos: fin.final ? fin.final.t : fin.segundos, fuera: fin.toques.filter((t) => t !== fin.final).length };
  };

  const guardar = () => {
    const x = r.current, d2 = x.d2!, d3 = x.d3!, d4 = x.d4!;
    fila('Descubrir', 'fila', {
      'D1d · Interés en la película 1–7': x.D1d ?? '',
      'D2 · Gesto «me interesa» (1 correcto · 0,5 alternativo · 0 incorrecto)': d2.puntaje, 'D2 · Tiempo hasta el gesto (s)': d2.segundos, 'D2 · Toques fuera de lugar (n)': d2.fuera,
      'D2a · SEQ 1–7': x.D2a ?? '',
      'D3 · Gesto «no me interesa» (1 · 0,5 · 0)': d3.puntaje, 'D3 · Tiempo hasta el gesto (s)': d3.segundos, 'D3 · Toques fuera de lugar (n)': d3.fuera,
      'D3a · SEQ 1–7': x.D3a ?? '',
      'D4b · Sorpresa 1–7': x.D4b ?? '', 'D4c · Tipo de sorpresa': x.D4c ?? '', 'D4d · Ganas de ver lo sugerido 1–7': x.D4d ?? '',
      // respuestas abiertas tal cual: el equipo las codifica 1 / 0,5 / 0 en Panel → Codificación (a ciegas de la card)
      'D1a · Respuesta': x.D1a ?? '', 'D1b · Respuesta': x.D1b ?? '', 'D1c · Respuesta': x.D1c ?? '',
      'D2 · Gesto hecho': d2.gesto, 'D2b · Respuesta': x.D2b ?? '', 'D3 · Gesto hecho': d3.gesto, 'D3b · Respuesta': x.D3b ?? '', 'D4a · Respuesta': x.D4a ?? '',
      'D4 · Llegó al resumen (1/0)': d4.llegada != null ? 1 : 0, 'D4 · Tiempo hasta el resumen (s)': d4.llegada ?? '', 'D4 · Toques (n)': d4.toques,
      'D4e · SEQ 1–7': x.D4e ?? '', 'D4f · Qué le confundió': x.D4f ?? '',
    });
    onListo();
  };
  const responder = (qs: Pregunta[], luego: () => void, etiqueta = 'Continuar') => (
    <Preguntas qs={qs} etiquetaFinal={etiqueta} onAnswer={(q, v) => emit('answer', { estimulo: q.id, valor: String(v ?? '') })} onDone={(res) => { Object.assign(r.current, res); luego(); }} />
  );
  const progreso = ORDEN.indexOf(etapa) / ORDEN.length;

  return (
    <Page parte={parte} progreso={progreso}>
      {etapa === 'inicio' && (
        <>
          <Kicker>primera mirada</Kicker>
          <Title>Una pantalla</Title>
          <P>{T.inicio}</P>
          <div className="sh-grow" />
          <Next onClick={sig} track="d1.listo">Estoy listo</Next>
        </>
      )}
      {etapa === 'ver5' && <CincoSegundos pantalla={card} estimulo="D1" onFin={(ms) => { emit('action', { valor: 'estimulo.5s', extra: { realMs: ms } }); sig(); }} />}
      {etapa === 'd1' && responder([abierta('D1a', T.D1a), abierta('D1b', T.D1b), abierta('D1c', T.D1c), escala('D1d', T.D1d)], sig)}
      {/* D2 y D3 comparten el mismo prototipo vivo: en D3 aparece la carta siguiente, como en el uso real */}
      {(etapa === 'd2' || etapa === 'd2p' || etapa === 'd3') && (
        <TareaProto modulo="Descubrir" tarea={etapa === 'd3' ? 'D3' : 'D2'} pantalla={card} consigna={etapa === 'd3' ? T.D3 : T.D2} oculta={etapa === 'd2p'} esFin={esDecisivo}
          onFin={(fin) => { const t = etapa === 'd3' ? 'D3' : 'D2'; r.current[t.toLowerCase() as 'd2' | 'd3'] = resultado(t, fin); sig(); }} />
      )}
      {etapa === 'd2p' && responder([escala('D2a', T.D2a), abierta('D2b', T.D2b)], sig)}
      {etapa === 'd3p' && responder([escala('D3a', T.D3a), abierta('D3b', T.D3b)], sig)}
      {etapa === 'd4' && (
        <TareaProto modulo="Descubrir" tarea="D4" pantalla={card} consigna={T.D4} nota={T.D4nota} conListo meta={cfg.pantallas.resumen.pagina}
          onFin={(fin) => { r.current.d4 = { llegada: fin.llegada, toques: fin.toques.length }; sig(); }} />
      )}
      {etapa === 'd4p' && responder([
        escala('D4e', T.D4e), abierta('D4a', T.D4a), escala('D4b', T.D4b), { id: 'D4c', prompt: T.D4c, tipo: 'opcion', opciones: OPCIONES_D4C }, escala('D4d', T.D4d),
        { ...abierta('D4f', T.D4f), opcional: true },
      ], guardar, 'Terminar esta parte')}
    </Page>
  );
}

