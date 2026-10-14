import React, { useEffect, useRef, useState } from 'react';
import { LINK_TEXTOS, PROTOTIPO_ESTUDIO, peliculaDe, type PantallaProto } from '@kinoo/tracking';
import { PROTOTIPOS, PrototipoVista, type RectPx } from '@kinoo/ui';
import { emit, setCtx } from '../track';
import { useEscala } from './kit';

export const META = PROTOTIPOS[PROTOTIPO_ESTUDIO];
const base = (() => { try { return import.meta.env.BASE_URL ?? './'; } catch { return './'; } })();

/** Una pantalla del prototipo del estudio, escalada para el celular. */
export function VistaProto(p: { pantalla: PantallaProto; escala: number; interactiva?: boolean; resaltar?: boolean; id?: string; onListo?: (m: RectPx | null) => void; onFrame?: (f: HTMLIFrameElement | null) => void; children?: React.ReactNode }) {
  return <PrototipoVista prototipo={PROTOTIPO_ESTUDIO} {...p} />;
}

/**
 * Prueba de 5 segundos: muestra la pantalla, y el reloj empieza cuando el prototipo YA se pintó (no al montar el iframe),
 * así nadie la ve menos de 5 s por una carga lenta. Después la oculta sola (gris) y llama a `onFin`.
 */
export function CincoSegundos({ pantalla, estimulo, onFin, ms = 5000 }: { pantalla: PantallaProto; estimulo: string; onFin: (realMs: number) => void; ms?: number }) {
  const escala = useEscala(META.ancho, META.alto, 90);
  const [fase, setFase] = useState<'cargando' | 'visible' | 'oculta'>('cargando');
  const fin = useRef(onFin); fin.current = onFin;
  const t0 = useRef(0);
  useEffect(() => { setCtx({ estimulo, pantalla: pantalla.pagina }); }, [estimulo, pantalla.pagina]);
  const visible = fase !== 'cargando';
  // se arma UNA vez, cuando la pantalla aparece (si dependiera de `fase`, ocultarla cancelaría el paso a las preguntas)
  useEffect(() => {
    if (!visible) return;
    t0.current = performance.now();
    emit('screen.view', { valor: '5s', extra: { pagina: pantalla.pagina } });
    const a = setTimeout(() => setFase('oculta'), ms);
    const b = setTimeout(() => fin.current(Math.round(performance.now() - t0.current)), ms + 450);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [visible, ms, pantalla.pagina]);
  return (
    <div className="sh-stage" aria-label="Pantalla durante 5 segundos">
      <div style={{ width: META.ancho * escala, height: META.alto * escala, position: 'relative', borderRadius: 14, overflow: 'hidden', background: fase === 'oculta' ? '#3a3a3a' : undefined }}>
        {fase !== 'oculta' && <VistaProto pantalla={pantalla} escala={escala} onListo={() => setFase('visible')} />}
        {fase === 'cargando' && <div className="sh-cargando" aria-live="polite">Cargando…</div>}
      </div>
      <span className="sh-hint">{LINK_TEXTOS.cincoSegundos}</span>
    </div>
  );
}

/** Contenido de una película (póster si lo hay, título, director y sinopsis breve). Va dentro de `.sh-peli` (tarjeta o botón). */
export function ContenidoPelicula({ titulo, conSinopsis = true }: { titulo: string; conSinopsis?: boolean }) {
  const p = peliculaDe(titulo);
  return (
    <>
      {p?.poster ? <img src={`${base}${PROTOTIPO_ESTUDIO}/_blob/${p.poster}`} alt="" /> : <span className="sh-peli-sin" aria-hidden="true">{titulo.slice(0, 1)}</span>}
      <span className="sh-peli-txt">
        <strong>{titulo}</strong>
        {p?.director && <span className="sh-hint">{p.director}</span>}
        {conSinopsis && p?.sinopsis && <span className="sh-p" style={{ fontSize: 14 }}>{p.sinopsis}</span>}
      </span>
    </>
  );
}
/** Película de M3d: tarjeta con póster y sinopsis breve (protocolo §3). */
export const TarjetaPelicula = ({ titulo }: { titulo: string }) => <div className="sh-peli"><ContenidoPelicula titulo={titulo} /></div>;
