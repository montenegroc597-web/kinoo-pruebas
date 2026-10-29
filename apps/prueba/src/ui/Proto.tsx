import React, { useEffect, useRef, useState } from 'react';
import { LINK_TEXTOS, PROTOTIPO_ESTUDIO, SEGUNDOS_CUENTA, SEGUNDOS_VISTA, peliculaDe, type PantallaProto } from '@kinoo/tracking';
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
 * Vista rápida (antes «5 segundos», ahora SEGUNDOS_VISTA): primero una cuenta regresiva 3‑2‑1 para que la persona se prepare
 * (el prototipo carga debajo, tapado); el reloj empieza cuando terminó la cuenta Y el prototipo YA se pintó (no al montar
 * el iframe), así nadie la ve menos tiempo por una carga lenta. Después la oculta sola (gris) y llama a `onFin`.
 */
export function CincoSegundos({ pantalla, estimulo, onFin, ms = SEGUNDOS_VISTA * 1000 }: { pantalla: PantallaProto; estimulo: string; onFin: (realMs: number) => void; ms?: number }) {
  const escala = useEscala(META.ancho, META.alto, 90);
  const [fase, setFase] = useState<'cargando' | 'visible' | 'oculta'>('cargando');
  const [cuenta, setCuenta] = useState(SEGUNDOS_CUENTA);
  const [pintada, setPintada] = useState(false);
  const fin = useRef(onFin); fin.current = onFin;
  const t0 = useRef(0);
  useEffect(() => { setCtx({ estimulo, pantalla: pantalla.pagina }); }, [estimulo, pantalla.pagina]);
  useEffect(() => {
    if (cuenta <= 0) return;
    const t = setTimeout(() => setCuenta((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [cuenta]);
  useEffect(() => { if (cuenta <= 0 && pintada) setFase((f) => (f === 'cargando' ? 'visible' : f)); }, [cuenta, pintada]);
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
  const contando = cuenta > 0;
  return (
    <div className="sh-stage" aria-label={`Pantalla durante ${SEGUNDOS_VISTA} segundos`}>
      <div style={{ width: META.ancho * escala, height: META.alto * escala, position: 'relative', borderRadius: 14, overflow: 'hidden', background: fase === 'oculta' ? '#3a3a3a' : undefined }}>
        {fase !== 'oculta' && <VistaProto pantalla={pantalla} escala={escala} onListo={() => setPintada(true)} />}
        {contando && (
          <div className="sh-cargando sh-cuenta" role="timer" aria-live="assertive">
            <span>{LINK_TEXTOS.cuenta}</span>
            <strong className="sh-cuenta-n" data-track="cuenta">{cuenta}</strong>
            <span>{LINK_TEXTOS.cuentaAviso}</span>
          </div>
        )}
        {!contando && fase === 'cargando' && <div className="sh-cargando" aria-live="polite">Cargando…</div>}
      </div>
      <span className="sh-hint">{contando ? LINK_TEXTOS.cuentaAviso : LINK_TEXTOS.cincoSegundos}</span>
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
