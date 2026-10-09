import React, { useState } from 'react';
import { UEQ_CAMBIAR, UEQ_INSTRUCCION, UEQ_PARES, UEQ_S_ITEMS } from '@kinoo/tracking';
import { Kicker, Next, P, Page, Texto, Title } from '../ui/kit';
import { emit, fila, setCtx } from '../track';

/** Prueba 3B: UEQ-S (8 pares). Se responde una vez, al terminar las situaciones. Guarda las respuestas CRUDAS 1–7 (izquierda→derecha). */
export function Ueq({ onListo, completo = false }: { onListo: () => void; completo?: boolean }) {
  const items = completo ? Array.from({ length: 26 }, (_, i) => i + 1) : UEQ_S_ITEMS;
  const [r, setR] = useState<Record<number, number>>({});
  const [coment, setComent] = useState('');
  setCtx({ bloque: 'ueq', estimulo: 'UEQ', pantalla: 'ueq', version: 'A' });
  const completa = items.every((i) => r[i] != null);

  const enviar = () => {
    const datos: Record<string, unknown> = { 'Versión evaluada': 'A', Formato: completo ? 'UEQ' : 'UEQ-S', 'Comentario libre': coment };
    items.forEach((i) => { datos[String(i)] = r[i]; emit('answer', { estimulo: 'UEQ', valor: r[i], extra: { item: i, izq: UEQ_PARES[i - 1][0], der: UEQ_PARES[i - 1][1] } }); });
    fila('UEQ', 'ueq', datos);
    if (coment) emit('answer', { estimulo: 'UEQ', valor: coment, extra: { q: 'cambiaria' } });
    onListo();
  };

  return (
    <Page fase={{ n: 3, nombre: 'Usar la app' }}>
      <Kicker>tu impresión</Kicker>
      <Title>Califica la app</Title>
      <P>{UEQ_INSTRUCCION}</P>
      <div>
        {items.map((i) => (
          <div key={i} className="sh-ueq" role="radiogroup" aria-label={`${UEQ_PARES[i - 1][0]} – ${UEQ_PARES[i - 1][1]}`}>
            <div className="sh-words"><span>{UEQ_PARES[i - 1][0]}</span><span style={{ textAlign: 'right' }}>{UEQ_PARES[i - 1][1]}</span></div>
            <div className="sh-circles">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <button key={n} type="button" role="radio" aria-label={`${n} de 7`} aria-checked={r[i] === n ? 'true' : 'false'} data-track={`ueq.${i}-${n}`} onClick={() => setR((o) => ({ ...o, [i]: n }))} />)}
            </div>
          </div>
        ))}
      </div>
      <p className="sh-q">{UEQ_CAMBIAR}</p>
      <Texto grande value={coment} onChange={setComent} track="ueq.comentario" />
      <Next disabled={!completa} onClick={enviar} track="ueq.enviar">{completa ? 'Enviar' : `Faltan ${items.filter((i) => r[i] == null).length} filas`}</Next>
    </Page>
  );
}
