import React, { useState } from 'react';
import { BIENVENIDA, CONSENTIMIENTO, NIVEL_TEC, CONTEXTO, RECORDATORIO } from '@kinoo/tracking';
import { Kicker, Next, Opciones, P, Page, Preguntas, Texto, Title, type Pregunta } from '../ui/kit';
import { client, emit, nuevoId, resetReloj, setCtx } from '../track';
import { nuevaSesion, useSession } from '../session';

const RONDA = (() => {
  try { const q = new URLSearchParams(window.location.search).get('ronda'); if (q && /^\d+$/.test(q)) return parseInt(q, 10); } catch { /* ignorar */ }
  return parseInt(import.meta.env.VITE_RONDA ?? '1', 10) || 1;
})();
export const rondaActual = RONDA;

const dispositivo = () => `${navigator.userAgent.replace(/\s+/g, ' ').slice(0, 120)} | ${window.screen.width}x${window.screen.height} @${window.devicePixelRatio || 1}`;

/** Bloque 0: bienvenida, nombre y consentimiento. Registra al participante (Juan 1, Juan 2…). */
export function Registro({ onListo, onRechazo }: { onListo: () => void; onRechazo: () => void }) {
  const [nombre, setNombre] = useState('');
  const [acepto, setAcepto] = useState(false);
  const [graba, setGraba] = useState<'Sí' | 'No'>('No');
  const [paso, setPaso] = useState<'nombre' | 'consent'>('nombre');
  const [enviando, setEnviando] = useState(false);
  const set = useSession((x) => x.set);

  const registrar = async () => {
    setEnviando(true);
    setCtx({ bloque: 'registro', fase: 1, estimulo: null, pantalla: 'registro' });
    resetReloj();
    const sesionId = nuevoId();
    const a = await client.registrar({ nombre: nombre.trim(), ronda: RONDA, dispositivo: dispositivo(), graba }, sesionId);
    set(nuevaSesion(a, nombre.trim(), RONDA, graba));
    emit('session.start', { extra: { provisional: !!a.provisional, ronda: RONDA } });
    emit('consent', { valor: 'acepta', extra: { graba } });
    setEnviando(false);
    onListo();
  };

  if (paso === 'nombre') {
    return (
      <Page>
        <Kicker>hola</Kicker>
        <Title>Antes de empezar</Title>
        <P>{BIENVENIDA}</P>
        <div className="sh-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label htmlFor="nombre" className="sh-q">¿Cómo te llamas?</label>
          <Texto value={nombre} onChange={setNombre} placeholder="Tu nombre" track="registro.nombre" autoFocus />
          <span className="sh-hint">Solo lo usa el equipo para unir tus respuestas. En los informes aparece un código, no tu nombre.</span>
        </div>
        <div className="sh-grow" />
        <Next disabled={nombre.trim().length < 2} onClick={() => setPaso('consent')} track="registro.continuar">Continuar</Next>
      </Page>
    );
  }
  return (
    <Page>
      <Kicker>consentimiento</Kicker>
      <Title>Tu participación</Title>
      <div className="sh-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <P>Yo, <strong>{nombre.trim()}</strong>, acepto participar en una sesión de evaluación de la aplicación Kinoo, realizada por el equipo KARUK como parte de un proyecto académico. Entiendo que:</P>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {CONSENTIMIENTO.map((c) => <li key={c} className="sh-p">{c}</li>)}
        </ul>
      </div>
      <span className="sh-q">¿Autorizas que se grabe la pantalla y el audio?</span>
      <Opciones opciones={['Sí', 'No']} value={graba} onChange={(v) => setGraba(v as 'Sí' | 'No')} track="registro.graba" />
      <button type="button" className="sh-opt" role="checkbox" aria-checked={acepto ? 'true' : 'false'} data-track="registro.acepto" onClick={() => setAcepto(!acepto)}>
        <span aria-hidden="true">{acepto ? '☑' : '☐'}</span> He leído y acepto participar
      </button>
      <span className="sh-hint">{RECORDATORIO}</span>
      <div className="sh-grow" />
      <Next disabled={!acepto || enviando} onClick={registrar} track="registro.empezar">{enviando ? 'Registrando…' : 'Empezar'}</Next>
      <Next variant="ghost" onClick={onRechazo} track="registro.no-acepto">No quiero participar</Next>
    </Page>
  );
}

const edadYGenero: Pregunta[] = [
  { id: 'edad', prompt: '¿Qué edad tienes?', tipo: 'numero' },
  { id: 'genero', prompt: '¿Con qué género te identificas?', tipo: 'opcion', opciones: ['Mujer', 'Hombre', 'Otro', 'Prefiero no decir'] },
];
const PREGUNTAS_CONTEXTO: Pregunta[] = [
  ...edadYGenero,
  { id: 'C1', prompt: CONTEXTO[0].pregunta, tipo: 'opcion', opciones: [...CONTEXTO[0].opciones] },
  { id: 'C2', prompt: CONTEXTO[1].pregunta, tipo: 'texto-largo' },
  { id: 'C3', prompt: CONTEXTO[2].pregunta, tipo: 'texto-largo' },
  { id: 'C4', prompt: CONTEXTO[3].pregunta, tipo: 'opcion', opciones: [...CONTEXTO[3].opciones] },
  { id: 'C4b', prompt: '¿En cuáles redes?', tipo: 'texto', cond: (r) => r.C4 === 'Sí' },
  { id: 'C5', prompt: CONTEXTO[4].pregunta, tipo: 'opcion', opciones: [...CONTEXTO[4].opciones] },
];

/** Bloque 1: preguntas de contexto (texto exacto del Anexo A). */
export function Contexto({ onListo }: { onListo: () => void }) {
  const s = useSession((x) => x.s)!;
  setCtx({ bloque: 'contexto', estimulo: null, pantalla: 'contexto' });
  return (
    <Page fase={{ n: 1, nombre: 'Primera impresión' }}>
      <Kicker>unas preguntas rápidas</Kicker>
      <Preguntas
        qs={PREGUNTAS_CONTEXTO}
        onAnswer={(q, v) => emit('answer', { estimulo: q.id, valor: typeof v === 'string' || typeof v === 'number' ? v : JSON.stringify(v) })}
        onDone={(r) => {
          const notas = `C2 dónde ve: ${r.C2 ?? ''} | C3 cómo se entera: ${r.C3 ?? ''}${r.C4b ? ` | redes: ${r.C4b}` : ''}`;
          void client.perfil(s.sesionId, { Edad: Number(r.edad), 'Género': r.genero, 'Frecuencia de consumo': r.C1, 'Descubre en redes (Sí/No)': r.C4, 'Nivel tecnológico': NIVEL_TEC[r.C5] ?? '', Notas: notas });
          onListo();
        }}
      />
    </Page>
  );
}
