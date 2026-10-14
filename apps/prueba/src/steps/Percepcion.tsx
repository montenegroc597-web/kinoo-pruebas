import React, { useEffect, useState } from 'react';
import { MODULO_CONTROL, PERCEPCION_TEXTOS as T, UEQ_PARES, UEQ_S_ITEMS, ueqS } from '@kinoo/tracking';
import { Kicker, Next, P, Page, Preguntas, Texto, Title, type Pregunta, type Resp } from '../ui/kit';
import { client, emit, fila, setCtx } from '../track';
import { getSession, useSession } from '../session';
import { extremosDe, type Parte } from './parte';

/** Control de atención («marca la opción 5») → Participantes. Si no hay red, App lo reintenta. */
export function enviarControl(valor: unknown): void {
  const s = getSession();
  if (!s || valor == null) return;
  const cambios = { 'Control de atención': Number(valor) };
  useSession.getState().patch({ perfilPendiente: { ...(s.perfilPendiente ?? {}), ...cambios } });
  void client.perfil(s.sesionId, cambios).then((ok) => { if (ok) useSession.getState().patch({ perfilPendiente: null }); });
}

/** M5 · Percepción final (§5): F1, F2 (con el control de atención), UEQ-S de 8 pares y F4. */
export function Percepcion({ parte, onListo }: { parte: Parte; onListo: () => void }) {
  const s = useSession((x) => x.s)!;
  const [etapa, setEtapa] = useState<'f12' | 'ueq' | 'f4'>('f12');
  const [r, setR] = useState<Resp>({});
  const [ueq, setUeq] = useState<Record<number, number>>({});
  const [f4, setF4] = useState('');
  useEffect(() => { setCtx({ bloque: 'percepcion', estimulo: etapa.toUpperCase(), pantalla: 'percepcion' }); }, [etapa]);
  const conControl = MODULO_CONTROL[s.flujo] === 'percepcion';
  const completa = UEQ_S_ITEMS.every((i) => ueq[i] != null);

  const guardar = () => {
    const u = ueqS(ueq);
    const r2 = (n: number | null) => (n == null ? '' : Math.round(n * 100) / 100);
    const items: Record<string, unknown> = {};
    UEQ_S_ITEMS.forEach((i) => { items[`F3 · UEQ-S ítem ${i}: ${UEQ_PARES[i - 1][0]} (1) – ${UEQ_PARES[i - 1][1]} (7)`] = ueq[i]; });
    fila('Percepción', 'fila', {
      'F1 · Qué tan chévere 1–7': r.F1 ?? '', 'F2 · Probabilidad de usar una app así 1–7': r.F2 ?? '', ...items,
      'UEQ-S Pragmática (auto, −3…+3)': r2(u.pragmatica), 'UEQ-S Hedónica (auto, −3…+3)': r2(u.hedonica), 'UEQ-S General (auto)': r2(u.general), 'F4 · Qué cambiaría (texto)': f4.trim(),
    });
    if (f4.trim()) fila('Notas', 'F4', { 'Módulo': 'Percepción', Pregunta: 'F4', Texto: f4.trim() });
    if (conControl) enviarControl(r.control);
    onListo();
  };

  const qs: Pregunta[] = [
    { id: 'F1', prompt: T.F1, tipo: 'escala', extremos: extremosDe(T.F1) },
    { id: 'F2', prompt: T.F2, tipo: 'escala', extremos: extremosDe(T.F2) },
    ...(conControl ? [{ id: 'control', prompt: T.control, tipo: 'escala' } as Pregunta] : []),
  ];
  return (
    <Page parte={parte} progreso={['f12', 'ueq', 'f4'].indexOf(etapa) / 3}>
      {etapa === 'f12' && (
        <>
          <Kicker>tu opinión</Kicker>
          <Preguntas qs={qs} etiquetaFinal="Continuar" onAnswer={(q, v) => emit('answer', { estimulo: q.id, valor: String(v ?? '') })} onDone={(res) => { setR(res); setEtapa('ueq'); }} />
        </>
      )}
      {etapa === 'ueq' && (
        <>
          <Title>Tu impresión</Title>
          <P>{T.F3}</P>
          <div>
            {UEQ_S_ITEMS.map((i) => (
              <div key={i} className="sh-ueq" role="radiogroup" aria-label={`${UEQ_PARES[i - 1][0]} – ${UEQ_PARES[i - 1][1]}`}>
                <div className="sh-words"><span>{UEQ_PARES[i - 1][0]}</span><span style={{ textAlign: 'right' }}>{UEQ_PARES[i - 1][1]}</span></div>
                <div className="sh-circles">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => <button key={n} type="button" role="radio" aria-label={`${n} de 7`} aria-checked={ueq[i] === n ? 'true' : 'false'} data-track={`ueq.${i}-${n}`} onClick={() => setUeq((o) => ({ ...o, [i]: n }))} />)}
                </div>
              </div>
            ))}
          </div>
          <Next disabled={!completa} onClick={() => { UEQ_S_ITEMS.forEach((i) => emit('answer', { estimulo: 'F3', valor: ueq[i], extra: { item: i } })); setEtapa('f4'); }} track="ueq.enviar">
            {completa ? 'Continuar' : `Faltan ${UEQ_S_ITEMS.filter((i) => ueq[i] == null).length} filas`}
          </Next>
        </>
      )}
      {etapa === 'f4' && (
        <>
          <p className="sh-q">{T.F4}</p>
          <Texto grande value={f4} onChange={setF4} track="f4" autoFocus />
          <div className="sh-grow" />
          <Next onClick={() => { emit('answer', { estimulo: 'F4', valor: f4.trim() }); guardar(); }} track="f4.terminar">Terminar</Next>
        </>
      )}
    </Page>
  );
}
