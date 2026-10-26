import React, { useEffect, useRef, useState } from 'react';
import { TAREA_TEXTOS as TT, type PantallaProto } from '@kinoo/tracking';
import { META, VistaProto } from '../ui/Proto';
import { Next, P, Title, useEscala } from '../ui/kit';
import { useCapturaProto, type Toque } from '../captura';
import { emit, fila, setCtx } from '../track';

/** Punto de la hoja «Puntos» (mapas de toques y gestos del Panel). */
export function guardarPunto(modulo: string, tarea: string, pagina: string, t: Toque, resultado: string): void {
  fila('Puntos', `${tarea}-${t.n}`, {
    'Módulo': modulo, Tarea: tarea, Pantalla: pagina, 'N.º de toque (1 = primero)': t.n, 'Tipo (toque / gesto)': t.tipo, 'Dirección': t.dir ?? '',
    'X (% ancho)': t.x, 'Y (% alto)': t.y, 'Tiempo desde que se mostró (s)': t.t, Resultado: resultado,
  });
}

export type FinTarea = { toques: Toque[]; segundos: number; salto: boolean; llegada: number | null };
/** Cómo terminó la tarea, tal cual se guarda en la columna «Resultado de la tarea». */
export const resultadoTarea = (f: { salto: boolean }) => (f.salto ? 'La saltó' : 'Terminó');

/**
 * Tarea sobre el prototipo vivo (D2, D3, D4, V2): la consigna arriba, el prototipo debajo. Registra cada toque y gesto.
 * Ningún toque termina la tarea: la persona puede equivocarse, corregir y seguir explorando, y termina cuando ELLA cree que acabó
 * («Terminé») o la salta si se le hace muy difícil (con confirmación). Al terminar ve un aviso claro antes de las preguntas.
 * Qué cuenta como acierto lo decide cada módulo con los toques (p. ej. el PRIMER gesto decisivo en D2/D3, como pide el protocolo).
 * `oculta` mantiene el iframe montado pero invisible (entre D2 y D3 la carta sigue donde quedó).
 * `meta` = página del prototipo a la que hay que llegar navegando (D4): `llegada` guarda cuándo llegó (null si nunca).
 */
export function TareaProto({ modulo, tarea, pantalla, consigna, nota = TT.nota, oculta, meta, onFin, onFrame }: {
  modulo: string; tarea: string; pantalla: PantallaProto; consigna: string; nota?: string; oculta?: boolean; meta?: string;
  onFin: (r: FinTarea) => void; onFrame?: (f: HTMLIFrameElement | null) => void;
}) {
  const escala = useEscala(META.ancho, META.alto, 310);
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const [listo, setListo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [sinProbar, setSinProbar] = useState(false);
  const [tocos, setTocos] = useState(0);
  const [fin, setFin] = useState<FinTarea | null>(null);
  const t0 = useRef(0);
  const toques = useRef<Toque[]>([]);
  const llegada = useRef<number | null>(null);
  const activo = listo && !oculta && !fin;
  const segundos = () => Math.round((performance.now() - t0.current) / 100) / 10;

  // cada vez que la tarea empieza (D2 y luego D3 en el mismo prototipo), arranca su reloj y su lista de toques
  useEffect(() => {
    if (!listo || oculta) return;
    t0.current = performance.now(); toques.current = []; llegada.current = null; setConfirmar(false); setSinProbar(false); setTocos(0); setFin(null);
    setCtx({ estimulo: tarea, pantalla: pantalla.pagina });
    emit('task.start', { estimulo: tarea });
  }, [listo, oculta, tarea, pantalla.pagina]);

  // llegar a la página meta: los enlaces del prototipo cargan otro documento dentro del mismo iframe
  useEffect(() => {
    if (!frame || !meta) return;
    const revisar = () => {
      let ruta = '';
      try { ruta = frame.contentWindow?.location.pathname ?? ''; } catch { return; }
      if (!activo || llegada.current != null || !ruta.endsWith(meta)) return;
      llegada.current = segundos();
      emit('screen.view', { estimulo: tarea, valor: meta, tTarea: llegada.current });
    };
    frame.addEventListener('load', revisar);
    return () => frame.removeEventListener('load', revisar);
  }, [frame, meta, activo, tarea]);

  const terminar = (salto: boolean) => {
    if (fin) return;
    const r = { toques: toques.current, segundos: segundos(), salto, llegada: llegada.current };
    emit('task.end', { estimulo: tarea, valor: salto ? 'saltó' : 'terminó', tTarea: r.segundos });
    setFin(r);
  };

  useCapturaProto(frame, {
    activo, inicio: t0, ancho: META.ancho, alto: META.alto,
    onToque: (t) => {
      toques.current.push(t); setTocos(toques.current.length); setSinProbar(false);
      emit(t.tipo === 'gesto' ? 'drag' : 'tap', { estimulo: tarea, x: t.x, y: t.y, nToque: t.n, tTarea: t.t, valor: t.dir ?? '', target: t.control });
    },
  });

  return (
    <div className="sh-stage" style={{ display: oculta ? 'none' : undefined }}>
      {fin ? (
        <div className="sh-tarea-fin" role="status">
          <span className="sh-tarea-icono" aria-hidden="true">{fin.salto ? '→' : '✓'}</span>
          <Title>{fin.salto ? TT.saltada : TT.hecha}</Title>
          <P>{TT.despues}</P>
        </div>
      ) : (
        <div className="sh-banner" role="status">{consigna}{nota ? <span style={{ display: 'block', fontWeight: 400, marginTop: 4 }}>{nota}</span> : null}</div>
      )}
      {/* el prototipo sigue montado tras terminar (D3 continúa donde quedó D2), pero ya no se ve */}
      <div style={{ display: fin ? 'none' : undefined }}>
        <VistaProto pantalla={pantalla} escala={escala} interactiva onListo={() => setListo(true)} onFrame={(f) => { setFrame(f); onFrame?.(f); }} />
      </div>
      {fin ? <Next onClick={() => onFin(fin)} track={`${tarea}.continuar`}>Continuar</Next>
        : confirmar ? (
          <>
            <p className="sh-q" style={{ fontSize: 16 }}>{TT.confirmarSaltar}</p>
            <div className="sh-row" style={{ width: '100%' }}>
              <div style={{ flex: 1 }}><Next variant="secondary" onClick={() => setConfirmar(false)} track={`${tarea}.seguir`}>{TT.seguir}</Next></div>
              <div style={{ flex: 1 }}><Next onClick={() => terminar(true)} track={`${tarea}.saltar-si`}>{TT.siSaltar}</Next></div>
            </div>
          </>
        ) : (
          <>
            {sinProbar && <p className="sh-aviso" role="alert">{TT.sinProbar}</p>}
            {!sinProbar && listo && tocos === 0 && <span className="sh-hint">{TT.pista}</span>}
            <Next disabled={!listo} onClick={() => (tocos === 0 && !sinProbar ? setSinProbar(true) : terminar(false))} track={`${tarea}.termine`}>{sinProbar ? TT.terminarAsi : TT.terminar}</Next>
            <Next variant="ghost" disabled={!listo} onClick={() => setConfirmar(true)} track={`${tarea}.saltar`}>{TT.saltar}</Next>
          </>
        )}
    </div>
  );
}
