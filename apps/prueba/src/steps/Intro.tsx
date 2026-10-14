import React from 'react';
import { INTRO_OPCIONES, INTRO_PREGUNTAS, NIVEL_TEC } from '@kinoo/tracking';
import { Kicker, Page, Preguntas, type Pregunta } from '../ui/kit';
import { client, emit, setCtx } from '../track';
import { useSession } from '../session';
import type { Parte } from './parte';

/** Introducción y perfil (Anexo B): I1 a I4 → hoja Participantes. */
export function Intro({ parte, onListo }: { parte: Parte; onListo: () => void }) {
  const s = useSession((x) => x.s)!;
  setCtx({ bloque: 'intro', estimulo: null, pantalla: 'intro' });
  const qs: Pregunta[] = (['I1', 'I2', 'I3', 'I4'] as const).map((id) => ({ id, prompt: INTRO_PREGUNTAS[id], tipo: 'opcion', opciones: INTRO_OPCIONES[id] }));
  return (
    <Page parte={parte}>
      <Kicker>unas preguntas rápidas</Kicker>
      <Preguntas qs={qs} etiquetaFinal="Continuar" onAnswer={(q, v) => emit('answer', { estimulo: q.id, valor: String(v ?? '') })}
        onDone={(r) => {
          const cambios = { Edad: r.I1, 'Frecuencia de consumo': r.I2, 'Descubre en redes (Sí/No)': r.I3, 'Nivel tecnológico': NIVEL_TEC[r.I4] ?? '' };
          useSession.getState().patch({ perfilPendiente: cambios }); // si no llega, App lo reintenta cuando haya red
          void client.perfil(s.sesionId, cambios).then((ok) => { if (ok) useSession.getState().patch({ perfilPendiente: null }); });
          onListo();
        }} />
    </Page>
  );
}
