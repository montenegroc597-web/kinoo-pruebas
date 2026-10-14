import React, { useEffect, useRef, useState } from 'react';
import type { PantallaProto } from '@kinoo/tracking';
import { META, VistaProto } from '../ui/Proto';
import { Next, useEscala } from '../ui/kit';
import { useCapturaProto, type Toque } from '../captura';
import { emit, fila, setCtx } from '../track';

/** Punto de la hoja «Puntos» (mapas de toques y gestos del Panel). */
export function guardarPunto(modulo: string, tarea: string, pagina: string, t: Toque, resultado: string): void {
  fila('Puntos', `${tarea}-${t.n}`, {
    'Módulo': modulo, Tarea: tarea, Pantalla: pagina, 'N.º de toque (1 = primero)': t.n, 'Tipo (toque / gesto)': t.tipo, 'Dirección': t.dir ?? '',
    'X (% ancho)': t.x, 'Y (% alto)': t.y, 'Tiempo desde que se mostró (s)': t.t, Resultado: resultado,
  });
}

/** Tras cuántos segundos sin respuesta aparece «No sé qué hacer» (sin moderador, nadie debe quedarse atascado). */
const AYUDA_S = 30;
/** En una tarea de explorar (completar el mazo) se espera más antes de ofrecer «No logro llegar». */
const AYUDA_EXPLORAR_S = 120;

/**
 * Tarea sobre el prototipo vivo (D2, D3, V2): la consigna arriba, el prototipo debajo. Registra cada toque y gesto.
 * `esFin(toque)` decide si ese toque termina la tarea (p. ej. el primer gesto de deslizar); `conListo` muestra un botón «Listo»
 * en vez de terminar sola (V2). `oculta` mantiene el iframe montado pero invisible (entre D2 y D3 la carta sigue donde quedó).
 * `meta` = página del prototipo a la que hay que llegar navegando (D4): «Listo» se habilita al llegar y `llegada` guarda cuándo.
 */
export function TareaProto({ modulo, tarea, pantalla, consigna, nota, oculta, esFin, conListo, meta, onFin, onFrame }: {
  modulo: string; tarea: string; pantalla: PantallaProto; consigna: string; nota?: string; oculta?: boolean;
  esFin?: (t: Toque) => boolean; conListo?: boolean; meta?: string;
  onFin: (r: { toques: Toque[]; final: Toque | null; segundos: number; rindio: boolean; llegada: number | null }) => void; onFrame?: (f: HTMLIFrameElement | null) => void;
}) {
  const escala = useEscala(META.ancho, META.alto, conListo ? 310 : 220);
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const [listo, setListo] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const t0 = useRef(0);
  const toques = useRef<Toque[]>([]);
  const terminado = useRef(false);
  const llegada = useRef<number | null>(null);
  const [llego, setLlego] = useState(false);
  const activo = listo && !oculta;
  const segundos = () => Math.round((performance.now() - t0.current) / 100) / 10;

  // cada vez que la tarea se activa, empieza su reloj y su lista de toques
  useEffect(() => {
    if (!activo) return;
    t0.current = performance.now(); toques.current = []; terminado.current = false; llegada.current = null; setAyuda(false); setLlego(false);
    setCtx({ estimulo: tarea, pantalla: pantalla.pagina });
    emit('task.start', { estimulo: tarea });
    const id = setTimeout(() => setAyuda(true), (meta ? AYUDA_EXPLORAR_S : AYUDA_S) * 1000);
    return () => clearTimeout(id);
  }, [activo, tarea, pantalla.pagina, meta]);

  // llegar a la página meta: los enlaces del prototipo cargan otro documento dentro del mismo iframe
  useEffect(() => {
    if (!frame || !meta) return;
    const revisar = () => {
      let ruta = '';
      try { ruta = frame.contentWindow?.location.pathname ?? ''; } catch { return; }
      if (!activo || llegada.current != null || !ruta.endsWith(meta)) return;
      llegada.current = segundos();
      setLlego(true);
      emit('screen.view', { estimulo: tarea, valor: meta, tTarea: llegada.current });
    };
    frame.addEventListener('load', revisar);
    return () => frame.removeEventListener('load', revisar);
  }, [frame, meta, activo, tarea]);

  const terminar = (final: Toque | null, rindio = false) => {
    if (terminado.current) return;
    terminado.current = true;
    const s = segundos();
    emit('task.end', { estimulo: tarea, valor: rindio ? 'no sabe' : final ? `${final.tipo}:${final.dir ?? final.control}` : 'listo', tTarea: s });
    // un instante para que se vea la respuesta del prototipo (la carta sale volando) antes de pasar a las preguntas
    setTimeout(() => onFin({ toques: toques.current, final, segundos: s, rindio, llegada: llegada.current }), final ? 700 : 0);
  };

  useCapturaProto(frame, {
    activo, inicio: t0, ancho: META.ancho, alto: META.alto,
    onToque: (t) => {
      if (terminado.current) return;
      toques.current.push(t);
      emit(t.tipo === 'gesto' ? 'drag' : 'tap', { estimulo: tarea, x: t.x, y: t.y, nToque: t.n, tTarea: t.t, valor: t.dir ?? '', target: t.control });
      if (esFin?.(t)) terminar(t);
    },
  });

  return (
    <div className="sh-stage" style={{ display: oculta ? 'none' : undefined }}>
      <div className="sh-banner" role="status">{consigna}{nota ? <span style={{ display: 'block', fontWeight: 400, marginTop: 4 }}>{nota}</span> : null}</div>
      <VistaProto pantalla={pantalla} escala={escala} interactiva onListo={() => setListo(true)} onFrame={(f) => { setFrame(f); onFrame?.(f); }} />
      {conListo && <Next disabled={!listo || (!!meta && !llego)} onClick={() => terminar(null)} track={`${tarea}.listo`}>Listo</Next>}
      {ayuda && (!conListo || (meta && !llego)) && <Next variant="ghost" onClick={() => terminar(null, true)} track={`${tarea}.no-se`}>{meta ? 'No logro llegar' : 'No sé qué hacer'}</Next>}
    </div>
  );
}
