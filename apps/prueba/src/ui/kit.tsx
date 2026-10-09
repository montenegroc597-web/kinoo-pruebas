import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@kinoo/ui';
import { emit } from '../track';
import './shell.css';

export function Page({ children, fase, total = 4, progreso }: { children: React.ReactNode; fase?: { n: number; nombre: string }; total?: number; progreso?: number }) {
  return (
    <div className="sh-page">
      <div className="sh-col">
        {fase && (
          <div className="sh-top">
            <span className="sh-fase">Fase {fase.n} de {total} · {fase.nombre}</span>
            <span>Kinoo · Prueba</span>
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

export function Texto({ value, onChange, placeholder, grande, track = 'shell.texto', type = 'text', autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; grande?: boolean; track?: string; type?: string; autoFocus?: boolean }) {
  const common = { className: 'sh-input', value, placeholder, 'data-track': track, autoFocus, onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(e.target.value) };
  return grande ? <textarea {...common} /> : <input type={type} inputMode={type === 'number' ? 'numeric' : undefined} {...common} />;
}

export function Escala7({ value, onChange, extremos, track = 'shell.escala' }: { value: number | null; onChange: (n: number) => void; extremos: [string, string]; track?: string }) {
  return (
    <div role="radiogroup" aria-label="Escala del 1 al 7" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="sh-scale">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => <button key={n} type="button" role="radio" aria-checked={value === n ? 'true' : 'false'} data-track={`${track}-${n}`} onClick={() => onChange(n)}>{n}</button>)}
      </div>
      <div className="sh-ends"><span>1 = {extremos[0]}</span><span style={{ textAlign: 'right' }}>7 = {extremos[1]}</span></div>
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

export function Palabras({ palabras, value, onChange, max = 3, track = 'shell.palabra' }: { palabras: string[]; value: string[]; onChange: (v: string[]) => void; max?: number; track?: string }) {
  return (
    <div className="sh-wrap">
      {palabras.map((w, i) => {
        const on = value.includes(w);
        return <button key={w} type="button" className="sh-word" aria-pressed={on ? 'true' : 'false'} data-track={`${track}-${i}`} onClick={() => onChange(on ? value.filter((x) => x !== w) : value.length < max ? [...value, w] : value)}>{w}</button>;
      })}
    </div>
  );
}

/** Cuenta atrás visible para pruebas cronometradas. */
export function useTemporizador(ms: number, activo: boolean, onFin: () => void) {
  const fin = useRef(onFin); fin.current = onFin;
  useEffect(() => {
    if (!activo) return;
    const id = setTimeout(() => fin.current(), ms);
    return () => clearTimeout(id);
  }, [ms, activo]);
}

/** Captura un único toque sobre un estímulo (P6, C7, M5): devuelve x,y en % del marco. */
export function PointPicker({ children, onPoint, etiqueta, track }: { children: React.ReactNode; onPoint: (p: { x: number; y: number }) => void; etiqueta: string; track: string }) {
  const [p, setP] = useState<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const tomar = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
    setP({ x, y });
    emit('answer', { valor: `punto:${x.toFixed(1)},${y.toFixed(1)}`, target: track, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
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
  id: string; prompt: string; hint?: string; opcional?: boolean; max?: number; extremos?: [string, string]; opciones?: string[];
  tipo: 'texto' | 'texto-largo' | 'numero' | 'escala' | 'opcion' | 'multi' | 'opcion-texto' | 'palabras';
  cond?: (r: Record<string, any>) => boolean;
};
export type Resp = Record<string, any>;

const vacio = (q: Pregunta, v: any): boolean => {
  if (q.opcional) return false;
  if (v == null) return true;
  if (q.tipo === 'texto' || q.tipo === 'texto-largo' || q.tipo === 'numero') return String(v).trim() === '';
  if (q.tipo === 'multi') return !(v as string[]).length;
  if (q.tipo === 'palabras') return (v as string[]).length < (q.max ?? 3);
  if (q.tipo === 'opcion-texto') return !(v as { op?: string }).op;
  return false;
};

export function Preguntas({ qs, onDone, onAnswer, etiquetaFinal = 'Siguiente', antes }: { qs: Pregunta[]; onDone: (r: Resp) => void; onAnswer?: (q: Pregunta, v: any) => void; etiquetaFinal?: string; antes?: React.ReactNode }) {
  const [r, setR] = useState<Resp>({});
  const visibles = qs.filter((q) => !q.cond || q.cond(r));
  const [i, setI] = useState(0);
  const q = visibles[Math.min(i, visibles.length - 1)];
  const v = r[q.id];
  const set = (x: any) => setR((o) => ({ ...o, [q.id]: x }));
  const ultimo = i >= visibles.length - 1;
  const avanzar = () => {
    onAnswer?.(q, v);
    if (ultimo) onDone(r); else setI(i + 1);
  };
  return (
    <div className="sh-stage" style={{ alignItems: 'stretch', gap: 14 }} key={q.id}>
      {antes}
      <span className="sh-hint">Pregunta {Math.min(i + 1, visibles.length)} de {visibles.length}</span>
      <p className="sh-q">{q.prompt}</p>
      {q.hint && <span className="sh-hint">{q.hint}</span>}
      {q.tipo === 'texto' && <Texto value={v ?? ''} onChange={set} track={`q.${q.id}`} autoFocus />}
      {q.tipo === 'numero' && <Texto value={v ?? ''} onChange={(x) => set(x.replace(/\D/g, '').slice(0, 3))} track={`q.${q.id}`} type="text" autoFocus />}
      {q.tipo === 'texto-largo' && <Texto value={v ?? ''} onChange={set} grande track={`q.${q.id}`} autoFocus />}
      {q.tipo === 'escala' && <Escala7 value={v ?? null} onChange={set} extremos={q.extremos ?? ['', '']} track={`q.${q.id}`} />}
      {q.tipo === 'opcion' && <Opciones opciones={q.opciones ?? []} value={v ?? null} onChange={set} track={`q.${q.id}`} />}
      {q.tipo === 'multi' && (
        <div className="sh-wrap">
          {(q.opciones ?? []).map((o, k) => {
            const on = ((v as string[]) ?? []).includes(o);
            return <button key={o} type="button" className="sh-word" aria-pressed={on ? 'true' : 'false'} data-track={`q.${q.id}-${k}`} onClick={() => set(on ? (v as string[]).filter((x) => x !== o) : [...((v as string[]) ?? []), o])}>{o}</button>;
          })}
        </div>
      )}
      {q.tipo === 'palabras' && <Palabras palabras={q.opciones ?? []} value={v ?? []} onChange={set} max={q.max ?? 3} track={`q.${q.id}`} />}
      {q.tipo === 'opcion-texto' && (
        <>
          <Opciones opciones={q.opciones ?? []} value={(v as { op?: string })?.op ?? null} onChange={(op) => set({ ...(v ?? {}), op })} track={`q.${q.id}`} />
          <Texto value={(v as { txt?: string })?.txt ?? ''} onChange={(txt) => set({ ...(v ?? {}), txt })} placeholder="Con tus palabras (opcional)" track={`q.${q.id}-txt`} />
        </>
      )}
      <Next disabled={vacio(q, v)} onClick={avanzar} track={`q.${q.id}-siguiente`}>{ultimo ? etiquetaFinal : 'Siguiente'}</Next>
    </div>
  );
}
