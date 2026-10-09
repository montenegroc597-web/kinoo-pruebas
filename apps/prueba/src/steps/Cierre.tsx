import React from 'react';
import { CIERRE } from '@kinoo/tracking';
import { Kicker, Page, Preguntas, type Pregunta } from '../ui/kit';
import { emit, fila, setCtx } from '../track';

const qs: Pregunta[] = [
  { id: 'K1', prompt: CIERRE[0].pregunta, tipo: 'texto-largo', opcional: true },
  { id: 'K2', prompt: CIERRE[1].pregunta, tipo: 'texto-largo', opcional: true },
  { id: 'K3', prompt: CIERRE[2].pregunta, tipo: 'texto-largo' },
];

/** Cierre (Anexo A): tres preguntas finales, que van a la hoja «Notas» para el diagrama de afinidad. */
export function Cierre({ onListo }: { onListo: () => void }) {
  setCtx({ bloque: 'cierre', estimulo: null, pantalla: 'cierre', version: 'U' });
  return (
    <Page fase={{ n: 4, nombre: 'Marca y cierre' }}>
      <Kicker>casi terminamos</Kicker>
      <Preguntas qs={qs} etiquetaFinal="Terminar" onAnswer={(q, v) => emit('answer', { estimulo: q.id, valor: String(v ?? '') })}
        onDone={(r) => {
          CIERRE.forEach((c) => { const t = (r[c.id] ?? '').toString().trim(); if (t) fila('Notas', c.id, { Prueba: 'Cierre', 'Pantalla / Tarea / Card': c.id, Texto: t, Tipo: c.tipo, Gravedad: '', Tema: '' }); });
          onListo();
        }} />
    </Page>
  );
}
