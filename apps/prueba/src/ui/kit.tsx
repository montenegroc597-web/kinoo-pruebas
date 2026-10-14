import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@kinoo/ui';
import { emit } from '../track';
import './shell.css';

export function Page({ children, parte, progreso }: { children: React.ReactNode; parte?: { n: number; total: number; nombre: string }; progreso?: number }) {
  return (
    <div className="sh-page">
      <div className="sh-col">
        {parte && (
          <div className="sh-top">
            <span className="sh-fase">Parte {parte.n} de {parte.total} · {parte.nombre}</span>
          </div>
        )}
        {progreso != null && <div className="sh-progress" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: progreso * 100 + '%' }} /></div>}
        {children}
      </div>
    </div>
  );
}

export const Kicker = ({ children }: { children: React.ReactNode }) => <span className="sh-kicker">{children}</span>;
export const Title = ({ children }: { children: React.ReactNode }) => <h1 className="sh-title">{children}</h1>;
export const P = ({ children }: { children: React.ReactNode }) => <p className="sh-p">{children}</p>;

export function Next({ children = 'Siguiente', onClick, disabled, track = 'shell.siguiente', variant = 'primary' }: { children?: React.ReactNode; onClick: () => void; disabled?: boolean; track?: string; variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <Button variant={variant} size="lg" block disabled={disabled} onClick={onClick} track={track}>{children}</Button>;
}

export function Texto({ value, onChange, placeholder, grande, track = 'shell.texto', autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; grande?: boolean; track?: string; autoFocus?: boolean }) {
  const common = { className: 'sh-input', value, placeholder, 'data-track': track, autoFocus, onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(e.target.value) };
  return grande ? <textarea {...common} /> : <input type="text" {...common} />;
}

export function Escala7({ value, onChange, extremos, track = 'shell.escala' }: { value: number | null; onChange: (n: number) => void; extremos?: [string, string]; track?: string }) {
  return (
    <div role="radiogroup" aria-label="Escala del 1 al 7" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="sh-scale">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => <button key={n} type="button" role="radio" aria-checked={value === n ? 'true' : 'false'} data-track={`${track}-${n}`} onClick={() => onChange(n)}>{n}</button>)}
      </div>
      {extremos && <div className="sh-ends"><span>1 = {extremos[0]}</span><span style={{ textAlign: 'right' }}>7 = {extremos[1]}</span></div>}
    </div>
  );
}

export function Opciones({ opciones, value, onChange, track = 'shell.opcion' }: { opciones: string[]; value: string | null; onChange: (v: string) => void; track?: string }) {
  return (
    <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {opciones.map((o, i) => <button key={o} type="button" role="radio" className="sh-opt" aria-checked={value === o ? 'true' : 'false'} data-track={`${track}-${i}`} onClick={() => onChange(o)}>{o}</button>)}
    </div>
  );
}

/** Un único toque sobre una pantalla estática (Z3): devuelve x, y en % de la pantalla. */
export function PointPicker({ children, onPoint, etiqueta, track }: { children: React.ReactNode; onPoint: (p: { x: number; y: number; t: number }) => void; etiqueta: string; track: string }) {
  const [p, setP] = useState<{ x: number; y: number; t: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const t0 = useRef(performance.now());
  const tomar = (e: React.PointerEvent) => {
    if (p) return; // cuenta solo el PRIMER toque (first click)
    const r = box.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
    const t = Math.round((performance.now() - t0.current) / 100) / 10;
    setP({ x, y, t });
    emit('tap', { target: track, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, nToque: 1, tTarea: t });
  };
  return (
    <div className="sh-stage">
      <p className="sh-q">{etiqueta}</p>
      <div ref={box} style={{ position: 'relative', touchAction: 'manipulation' }} onPointerDown={tomar} data-track={track}>
        <div style={{ pointerEvents: 'none' }}>{children}</div>
        {p && <span className="sh-marker" style={{ left: p.x + '%', top: p.y + '%' }} />}
      </div>
      <Next disabled={!p} onClick={() => p && onPoint(p)} track={track + '-listo'}>Listo</Next>
    </div>
  );
}

// ---------------------------------------------------------------- flujo de preguntas (una por pantalla)
export type Pregunta = {
  id: string; prompt: string; hint?: string; opcional?: boolean; extremos?: [string, string]; opciones?: string[];
  tipo: 'texto' | 'texto-largo' | 'escala' | 'opcion';
};
export type Resp = Record<string, any>;

const vacio = (q: Pregunta, v: any): boolean => {
  if (q.opcional) return false;
  if (v == null) return true;
  if (q.tipo === 'texto' || q.tipo === 'texto-largo') return String(v).trim() === '';
  return false;
};

/** Una pregunta por pantalla, con el texto exacto. Cada respuesta se emite como evento al avanzar. */
export function Preguntas({ qs, onDone, onAnswer, etiquetaFinal = 'Siguiente', antes }: { qs: Pregunta[]; onDone: (r: Resp) => void; onAnswer?: (q: Pregunta, v: any) => void; etiquetaFinal?: string; antes?: React.ReactNode }) {
  const [r, setR] = useState<Resp>({});
  const [i, setI] = useState(0);
  const q = qs[Math.min(i, qs.length - 1)];
  const v = r[q.id];
  const set = (x: any) => setR((o) => ({ ...o, [q.id]: x }));
  const ultimo = i >= qs.length - 1;
  const avanzar = () => {
    onAnswer?.(q, v);
    if (ultimo) onDone(r); else setI(i + 1);
  };
  return (
    <div className="sh-stage" style={{ alignItems: 'stretch', gap: 14 }} key={q.id}>
      {antes}
      {qs.length > 1 && <span className="sh-hint">Pregunta {i + 1} de {qs.length}</span>}
      <p className="sh-q">{q.prompt}</p>
      {q.hint && <span className="sh-hint">{q.hint}</span>}
      {q.tipo === 'texto' && <Texto value={v ?? ''} onChange={set} track={`q.${q.id}`} autoFocus />}
      {q.tipo === 'texto-largo' && <Texto value={v ?? ''} onChange={set} grande track={`q.${q.id}`} autoFocus />}
      {q.tipo === 'escala' && <Escala7 value={v ?? null} onChange={set} extremos={q.extremos} track={`q.${q.id}`} />}
      {q.tipo === 'opcion' && <Opciones opciones={q.opciones ?? []} value={v ?? null} onChange={set} track={`q.${q.id}`} />}
      <Next disabled={vacio(q, v)} onClick={avanzar} track={`q.${q.id}-siguiente`}>{ultimo ? etiquetaFinal : 'Siguiente'}</Next>
    </div>
  );
}

/** Escala para que la pantalla del prototipo quepa en el celular dejando `reservado` px para texto y botones. */
export function useEscala(ancho: number, alto: number, reservado: number, max = 1): number {
  const calc = () => (typeof window === 'undefined' ? 1 : Math.max(0.3, Math.min(max, (window.innerWidth - 24) / ancho, (window.innerHeight - reservado) / alto)));
  const [k, setK] = useState(calc);
  useEffect(() => {
    const on = () => setK(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ancho, alto, reservado]);
  return k;
}
