import React, { useEffect, useRef, useState } from 'react';
import { MODULO_CONTROL, MOODS_ABIERTOS_POR_PERSONA, MOODS_TEXTOS as T, PERCEPCION_TEXTOS, NINGUNA_M3C, NINGUNA_M3D, barajar, elegir, estudio, rellenar, type MoodCfg } from '@kinoo/tracking';
import { Kicker, Next, P, Page, Preguntas, Texto, Title, Opciones } from '../ui/kit';
import { ContenidoPelicula, TarjetaPelicula } from '../ui/Proto';
import { emit, fila, setCtx } from '../track';
import { useSession } from '../session';
import { enviarControl } from './Percepcion';
import { extremosDe, type Parte } from './parte';

type Etapa = 'inicio' | 'abiertas' | 'm3c' | 'm3d' | 'control';

/** Acierto y confusión de M3c (las columnas «(auto)» del Excel). */
export function evaluarM3c(m: MoodCfg, elegida: string, moods: MoodCfg[]): { acierta: 0 | 1; confusion: string } {
  if (elegida === m.objetivo) return { acierta: 1, confusion: '' };
  if (elegida === NINGUNA_M3C) return { acierta: 0, confusion: 'Ninguna / no sé' };
  return { acierta: 0, confusion: moods.find((o) => o.objetivo === elegida)?.nombre ?? 'Otra película' };
}

/**
 * M3 · Cuestionario de moods (§3; desde el v3.0 es un link aparte, el Link 2, que cierra con el control de atención). M3a–M3b para 3 moods al azar; M3c para todos (una pantalla por mood, en orden aleatorio, 4 películas
 * barajadas + «Ninguna / no sé»); M3d y M3e para cada película de la sección D (orden aleatorio). La aleatorización es
 * determinista por persona: si retoma, ve el mismo orden.
 */
export function Moods({ parte, onListo }: { parte: Parte; onListo: () => void }) {
  const s = useSession((x) => x.s)!;
  const cfg = estudio();
  const abiertos = useRef(elegir(cfg.moods, Math.min(MOODS_ABIERTOS_POR_PERSONA, cfg.moods.length), s.semilla)).current;
  const ordenM3c = useRef(barajar(cfg.moods, s.semilla + 1)).current;
  const ordenM3d = useRef(barajar(cfg.peliculasM3d, s.semilla + 2)).current;
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [k, setK] = useState(0);
  const resAbiertas = useRef<Record<string, { M3a: string; M3b: number }>>({});
  useEffect(() => { setCtx({ bloque: 'moods', estimulo: etapa.toUpperCase(), pantalla: 'moods' }); }, [etapa]);

  const guardarMood = (m: MoodCfg, orden: number, elegida: string, segundos: number) => {
    const { acierta, confusion } = evaluarM3c(m, elegida, cfg.moods);
    const ab = resAbiertas.current[m.nombre];
    fila('Moods', m.nombre, {
      Mood: m.nombre, 'M3c · Película elegida': elegida, '¿Acierta? (auto)': acierta, 'Mood con el que lo confundió (auto)': confusion, 'M3c · Tiempo (s)': segundos,
      'M3b · Claridad 1–7 (solo esos 3)': ab?.M3b ?? '', 'M3a · Respuesta': ab?.M3a ?? '', 'M3c · Orden en que lo vio': orden,
    });
  };
  const total = abiertos.length + ordenM3c.length + ordenM3d.length;
  const conControl = MODULO_CONTROL[s.flujo] === 'moods';
  const hechos = etapa === 'control' ? total : etapa === 'abiertas' ? k : etapa === 'm3c' ? abiertos.length + k : etapa === 'm3d' ? abiertos.length + ordenM3c.length + k : 0;

  return (
    <Page parte={parte} progreso={hechos / total}>
      {etapa === 'inicio' && (
        <>
          <Kicker>categorías</Kicker>
          <Title>Para elegir qué ver</Title>
          <P>{T.inicio}</P>
          <div className="sh-grow" />
          <Next onClick={() => setEtapa('abiertas')} track="m3.listo">Empezar</Next>
        </>
      )}
      {etapa === 'abiertas' && (
        <Preguntas key={abiertos[k].nombre} etiquetaFinal="Siguiente"
          qs={[{ id: 'M3a', prompt: rellenar(T.M3a, { mood: abiertos[k].nombre }), tipo: 'texto-largo' }, { id: 'M3b', prompt: rellenar(T.M3b, { mood: abiertos[k].nombre }), tipo: 'escala', extremos: extremosDe(T.M3b) }]}
          onAnswer={(q, v) => emit('answer', { estimulo: q.id, valor: String(v ?? ''), extra: { mood: abiertos[k].nombre } })}
          onDone={(r) => {
            resAbiertas.current[abiertos[k].nombre] = { M3a: r.M3a, M3b: r.M3b };
            if (k + 1 < abiertos.length) setK(k + 1); else { setK(0); setEtapa('m3c'); }
          }} />
      )}
      {etapa === 'm3c' && (
        <EligePelicula key={ordenM3c[k].nombre} mood={ordenM3c[k]} semilla={s.semilla + 10 + k}
          onElegir={(elegida, seg) => {
            guardarMood(ordenM3c[k], k + 1, elegida, seg);
            if (k + 1 < ordenM3c.length) setK(k + 1); else { setK(0); setEtapa('m3d'); }
          }} />
      )}
      {etapa === 'm3d' && (
        <PeliculaAMood key={ordenM3d[k].titulo} titulo={ordenM3d[k].titulo} moods={cfg.moods.map((m) => m.nombre)}
          onListo={(mood, nombre) => {
            const p = ordenM3d[k];
            fila('Películas', p.titulo, {
              'Película': p.titulo, 'M3d · Mood con el que la asocia': mood, '¿Coincide con el previsto? (auto)': mood === p.moodPrevisto ? 1 : 0,
              'M3e · Nombre que le pondría': nombre, 'Mood previsto': p.moodPrevisto,
            });
            if (k + 1 < ordenM3d.length) setK(k + 1); else if (conControl) setEtapa('control'); else onListo();
          }} />
      )}
      {etapa === 'control' && (
        <Preguntas etiquetaFinal="Terminar" qs={[{ id: 'control', prompt: PERCEPCION_TEXTOS.control, tipo: 'escala' }]}
          onAnswer={(q, v) => emit('answer', { estimulo: q.id, valor: String(v ?? '') })}
          onDone={(res) => { enviarControl(res.control); onListo(); }} />
      )}
    </Page>
  );
}

/** M3c: ¿cuál de estas 4 películas encaja con el mood? (+ «Ninguna / no sé»). Mide el tiempo de elección. */
function EligePelicula({ mood, semilla, onElegir }: { mood: MoodCfg; semilla: number; onElegir: (titulo: string, segundos: number) => void }) {
  const opciones = useRef(barajar([mood.objetivo, mood.cercano, mood.opuesto, mood.neutra], semilla)).current;
  const t0 = useRef(performance.now());
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="sh-stage" style={{ alignItems: 'stretch', gap: 10 }}>
      <p className="sh-q">{rellenar(T.M3c, { mood: mood.nombre })}</p>
      <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opciones.map((t, i) => (
          <button key={t} type="button" role="radio" className="sh-peli" aria-checked={sel === t ? 'true' : 'false'} data-track={`m3c.op-${i}`} onClick={() => setSel(t)}>
            <ContenidoPelicula titulo={t} conSinopsis={false} />
          </button>
        ))}
        <button type="button" role="radio" className="sh-opt" aria-checked={sel === NINGUNA_M3C ? 'true' : 'false'} data-track="m3c.ninguna" onClick={() => setSel(NINGUNA_M3C)}>{NINGUNA_M3C}</button>
      </div>
      <Next disabled={!sel} track="m3c.siguiente" onClick={() => {
        const seg = Math.round((performance.now() - t0.current) / 100) / 10;
        emit('answer', { estimulo: 'M3c', valor: sel!, tTarea: seg, extra: { mood: mood.nombre } });
        onElegir(sel!, seg);
      }}>Siguiente</Next>
    </div>
  );
}

/** M3d (película → mood) y M3e (cómo la llamaría), una película por pantalla. */
function PeliculaAMood({ titulo, moods, onListo }: { titulo: string; moods: string[]; onListo: (mood: string, nombre: string) => void }) {
  const [mood, setMood] = useState<string | null>(null);
  const [paso, setPaso] = useState<'M3d' | 'M3e'>('M3d');
  const [nombre, setNombre] = useState('');
  return (
    <div className="sh-stage" style={{ alignItems: 'stretch', gap: 12 }}>
      <TarjetaPelicula titulo={titulo} />
      {paso === 'M3d' ? (
        <>
          <p className="sh-q">{T.M3d}</p>
          <Opciones opciones={[...moods, NINGUNA_M3D]} value={mood} onChange={setMood} track="m3d" />
          <Next disabled={!mood} track="m3d.siguiente" onClick={() => { emit('answer', { estimulo: 'M3d', valor: mood!, extra: { pelicula: titulo } }); setPaso('M3e'); }}>Siguiente</Next>
        </>
      ) : (
        <>
          <p className="sh-q">{T.M3e}</p>
          <Texto value={nombre} onChange={setNombre} track="m3e" autoFocus />
          <Next disabled={!nombre.trim()} track="m3e.siguiente" onClick={() => { emit('answer', { estimulo: 'M3e', valor: nombre.trim(), extra: { pelicula: titulo } }); onListo(mood!, nombre.trim()); }}>Siguiente</Next>
        </>
      )}
    </div>
  );
}
