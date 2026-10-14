import React, { useEffect, useRef, useState } from 'react';
import { MAZOS_TEXTOS as T, MODULO_CONTROL, OPCIONES_Z2, PERCEPCION_TEXTOS, estudio, expandirZona, puntajeClic, type Rect } from '@kinoo/tracking';
import type { RectPx } from '@kinoo/ui';
import { Kicker, Next, P, Page, PointPicker, Preguntas, useEscala, type Pregunta, type Resp } from '../ui/kit';
import { META, VistaProto } from '../ui/Proto';
import { emit, fila, setCtx } from '../track';
import { useSession } from '../session';
import { enviarControl } from './Percepcion';
import { extremosDe, type Parte } from './parte';

type Etapa = 'inicio' | 'z1z2' | 'z3' | 'resto';
const MIN_W = (44 / META.ancho) * 100, MIN_H = (44 / META.alto) * 100; // área de toque mínima, en % de la pantalla

/** Zona correcta de Z3 (medida en el prototipo, en px) → % de la pantalla, ampliada al mínimo táctil. */
export const zonaPct = (m: RectPx | null): Rect | null =>
  m ? expandirZona({ x1: (m[0] / META.ancho) * 100, y1: (m[1] / META.alto) * 100, x2: (m[2] / META.ancho) * 100, y2: (m[3] / META.alto) * 100 }, MIN_W, MIN_H) : null;

/**
 * M4 · Mazos (§4). La pantalla de mazos sin explicación → Z1 (qué es un mazo) y Z2 (4 frases V/F/No sé) → Z3 primer clic
 * («controlar cuánto contenido») sobre la misma pantalla → Z3a SEQ → Z4 (consecuencia) → Z5a y Z5b. En el Link 2 cierra con el
 * control de atención.
 */
export function Mazos({ parte, onListo }: { parte: Parte; onListo: () => void }) {
  const s = useSession((x) => x.s)!;
  const cfg = estudio();
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const r = useRef<Resp & { z3?: { puntaje: number | null; t: number } }>({});
  const zona = useRef<Rect | null>(null);
  const escala = useEscala(META.ancho, META.alto, 200);
  useEffect(() => { setCtx({ bloque: 'mazos', estimulo: etapa.toUpperCase(), pantalla: cfg.pantallas.mazos.pagina }); }, [etapa, cfg.pantallas.mazos.pagina]);
  const conControl = MODULO_CONTROL[s.flujo] === 'mazos';

  const guardar = (res: Resp) => {
    const x = { ...r.current, ...res };
    const frases = cfg.mazos.frases.map((f, i) => ({ resp: x['Z2_' + i] ?? '', ok: x['Z2_' + i] === f.correcta }));
    const z4 = cfg.mazos.z4.find((o) => o.texto === x.Z4);
    fila('Mazos', 'fila', {
      'Z2 · Frase 1': frases[0].resp, 'Z2 · Frase 2': frases[1].resp, 'Z2 · Frase 3': frases[2].resp, 'Z2 · Frase 4': frases[3].resp,
      'Frases acertadas (auto, 0–4)': frases.filter((f) => f.ok).length,
      'Z3 · Primer clic para controlar el contenido (1 · 0,5 · 0)': x.z3?.puntaje ?? '', 'Z3 · Tiempo al primer clic (s)': x.z3?.t ?? '', 'Z3a · SEQ 1–7': x.Z3a ?? '',
      'Z4 · Consecuencia que espera': x.Z4 ?? '', '¿Acierta? (auto)': z4 ? (z4.correcta ? 1 : 0) : '',
      'Z5a · Claridad de cómo funciona 1–7': x.Z5a ?? '', 'Z5b · Utilidad de tener mazos 1–7': x.Z5b ?? '', 'Z1 · Respuesta': x.Z1 ?? '',
    });
    if (conControl) enviarControl(x.control);
    onListo();
  };
  const contestar = (q: Pregunta, v: unknown) => emit('answer', { estimulo: q.id, valor: String(v ?? '') });

  return (
    <Page parte={parte} progreso={['inicio', 'z1z2', 'z3', 'resto'].indexOf(etapa) / 4}>
      {etapa === 'inicio' && (
        <div className="sh-stage">
          <Kicker>otra parte de la app</Kicker>
          <P>{T.inicio}</P>
          <VistaProto pantalla={cfg.pantallas.mazos} escala={escala} onListo={() => emit('screen.view', { valor: 'mazos' })} />
          <Next onClick={() => setEtapa('z1z2')} track="m4.continuar">Continuar</Next>
        </div>
      )}
      {etapa === 'z1z2' && (
        <Preguntas etiquetaFinal="Continuar" onAnswer={contestar} onDone={(res) => { Object.assign(r.current, res); setEtapa('z3'); }}
          qs={[
            { id: 'Z1', prompt: T.Z1, tipo: 'texto-largo' },
            ...cfg.mazos.frases.map((f, i): Pregunta => ({ id: 'Z2_' + i, prompt: f.texto, hint: i === 0 ? T.Z2 : undefined, tipo: 'opcion', opciones: OPCIONES_Z2 })),
          ]} />
      )}
      {etapa === 'z3' && (
        <PointPicker etiqueta={T.Z3} track="z3.punto" onPoint={(p) => {
          const puntaje = puntajeClic(p.x, p.y, zona.current);
          r.current.z3 = { puntaje, t: p.t };
          fila('Puntos', 'Z3-1', {
            'Módulo': 'Mazos', Tarea: 'Z3', Pantalla: cfg.pantallas.zonaZ3.pagina, 'N.º de toque (1 = primero)': 1, 'Tipo (toque / gesto)': 'toque',
            'X (% ancho)': Math.round(p.x * 10) / 10, 'Y (% alto)': Math.round(p.y * 10) / 10, 'Tiempo desde que se mostró (s)': p.t, Resultado: puntaje === 1 ? 'Correcto' : puntaje == null ? 'Sin zona' : 'Fuera de la zona',
          });
          setEtapa('resto');
        }}>
          <VistaProto pantalla={cfg.pantallas.zonaZ3} escala={escala} onListo={(m) => { zona.current = zonaPct(m); }} />
        </PointPicker>
      )}
      {etapa === 'resto' && (
        <Preguntas etiquetaFinal="Terminar esta parte" onAnswer={contestar} onDone={guardar}
          qs={[
            { id: 'Z3a', prompt: T.Z3a, tipo: 'escala', extremos: extremosDe(T.Z3a) },
            { id: 'Z4', prompt: T.Z4, tipo: 'opcion', opciones: cfg.mazos.z4.map((o) => o.texto) },
            { id: 'Z5a', prompt: T.Z5a, tipo: 'escala', extremos: extremosDe(T.Z5a) },
            { id: 'Z5b', prompt: T.Z5b, tipo: 'escala', extremos: extremosDe(T.Z5b) },
            ...(conControl ? [{ id: 'control', prompt: PERCEPCION_TEXTOS.control, tipo: 'escala' } as Pregunta] : []),
          ]} />
      )}
    </Page>
  );
}
