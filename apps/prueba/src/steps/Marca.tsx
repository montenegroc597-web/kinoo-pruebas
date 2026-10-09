import React, { useEffect, useRef, useState } from 'react';
import { BRILLO_AVISO, MARCA_ATRIBUTO, MARCA_DESEADOS, MARCA_DIFERENCIALES, MARCA_EVITAR, MARCA_INICIO, MARCA_PALABRAS, MARCA_PARES, MARCA_PREGUNTAS, barajar, flujoDePantalla, nombreDePantalla } from '@kinoo/tracking';
import { precargarKino, type Brand } from '@kinoo/ui';
import { Kicker, Next, Opciones, P, Page, PointPicker, Preguntas, Title, type Pregunta } from '../ui/kit';
import { PantallaEstatica, useEscala } from '../ui/Estimulo';
import { Cronometrado } from './CincoSeg';
import { medirSelector } from '../capture';
import { emit, fila, punto, setCtx } from '../track';
import { useSession } from '../session';

const MS_VER = (() => { try { return new URLSearchParams(location.search).get('rapido') === '1' ? 1200 : 12000; } catch { return 12000; } })();
type Etapa = 'brillo' | 'intro' | 'ver' | 'preg' | 'punto' | 'lado' | 'comp';
type RespVersion = { agrado?: number; palabras?: string[]; leer?: number; dif?: Record<string, number>; punto?: { x: number; y: number }; jerarquia?: 0 | 1 };

/** Prueba 4: validación de marca A/B. Cada persona ve las dos versiones (A = Noche, B = el prototipo real «Kino», ver KinoPantalla) en el orden asignado. */
export function Marca({ onListo }: { onListo: () => void }) {
  const s = useSession((x) => x.s)!;
  const primeroA = s.ordenMarca === 'A→B';
  const versiones: Brand[] = primeroA ? ['A', 'B'] : ['B', 'A'];
  const [par, setPar] = useState(0);
  const [v, setV] = useState(0); // 0 = primera opción, 1 = segunda
  const [etapa, setEtapa] = useState<Etapa>('brillo');
  const [res, setRes] = useState<Record<string, RespVersion>>({});
  const t0Punto = useRef(0);
  const pantalla = MARCA_PARES[par];
  const brand = versiones[v];
  const escala = useEscala(190);
  const palabras = barajar(MARCA_PALABRAS, s.indice * 7 + par * 13 + v);
  const opcion = (b: Brand) => (versiones[0] === b ? 'Opción 1' : 'Opción 2');

  useEffect(() => { setCtx({ bloque: 'marca', estimulo: pantalla, pantalla, version: brand }); }, [pantalla, brand]);
  useEffect(() => { precargarKino(); }, []); // la versión B es el prototipo Kino (iframe): se descarga mientras lee el aviso de brillo

  const qs: Pregunta[] = [
    { id: 'M1', prompt: MARCA_PREGUNTAS.M1, tipo: 'escala', extremos: ['nada agradable', 'muy agradable'] },
    { id: 'M2', prompt: MARCA_PREGUNTAS.M2, tipo: 'palabras', opciones: palabras, max: 3 },
    { id: 'M3', prompt: MARCA_PREGUNTAS.M3, tipo: 'escala', extremos: ['muy difícil', 'muy fácil'] },
    ...MARCA_DIFERENCIALES.map(([a, b], i) => ({ id: 'M4' + i, prompt: `¿Dónde ubicarías esta pantalla entre «${a}» y «${b}»?`, hint: MARCA_PREGUNTAS.M4, tipo: 'escala' as const, extremos: [a.toLowerCase(), b.toLowerCase()] as [string, string] })),
  ];

  const guardarVersion = (p: { x: number; y: number }) => {
    const t = (performance.now() - t0Punto.current) / 1000;
    punto({ prueba: 'Marca A-B', estimulo: pantalla, pantallaId: pantalla, version: brand, nClic: 1, x: p.x, y: p.y, t, key: `marca-${pantalla}-${brand}` });
    const fr = document.getElementById('kinoo-punto');
    const r = fr ? medirSelector(fr, '[data-hierarchy="primary"]') : null;
    const jer = r && p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2 ? 1 : 0;
    setRes((o) => ({ ...o, [`${pantalla}-${brand}`]: { ...o[`${pantalla}-${brand}`], punto: p, jerarquia: jer } }));
    emit('answer', { estimulo: pantalla, valor: jer, extra: { q: 'M5-jerarquia', version: brand } });
    if (v === 0) { setV(1); setEtapa('ver'); } else setEtapa('lado');
  };

  const guardarPar = (c: Record<string, any>) => {
    const A = res[`${pantalla}-A`] ?? {}, B = res[`${pantalla}-B`] ?? {};
    const trad = (x?: string) => (x === 'Igual' ? 'Igual' : x === 'Opción 1' ? versiones[0] : x === 'Opción 2' ? versiones[1] : '');
    const cuenta = (w?: string[], lista: string[] = []) => (w ?? []).filter((x) => lista.includes(x)).length;
    fila('Marca A-B', pantalla, {
      'Orden visto (auto)': s.ordenMarca, 'Pantalla ID': pantalla, Flujo: flujoDePantalla(pantalla),
      'A · Agrado 1–7': A.agrado ?? '', 'A · Legibilidad 1–7': A.leer ?? '', 'A · Aburrido–Emocionante 1–7': A.dif?.M40 ?? '', 'A · Genérico–Distintivo 1–7': A.dif?.M41 ?? '',
      'A · # atributos deseados (0–3)': cuenta(A.palabras, MARCA_DESEADOS), 'A · # atributos a evitar (0–3)': cuenta(A.palabras, MARCA_EVITAR), 'A · Primer elemento = jerarquía prevista (1/0)': A.jerarquia ?? '',
      'B · Agrado 1–7': B.agrado ?? '', 'B · Legibilidad 1–7': B.leer ?? '', 'B · Aburrido–Emocionante 1–7': B.dif?.M40 ?? '', 'B · Genérico–Distintivo 1–7': B.dif?.M41 ?? '',
      'B · # atributos deseados (0–3)': cuenta(B.palabras, MARCA_DESEADOS), 'B · # atributos a evitar (0–3)': cuenta(B.palabras, MARCA_EVITAR), 'B · Primer elemento = jerarquía prevista (1/0)': B.jerarquia ?? '',
      'Preferencia directa (A/B/Igual)': trad(c.M6), 'Motivo (textual)': c.M7 ?? '', '¿Qué colores prefiere? (A/B/Igual)': trad(c.M8), '¿Cuál se lee mejor? (A/B/Igual)': trad(c.M9),
      'Atributo preguntado': MARCA_ATRIBUTO, '¿Cuál es más [atributo]? (A/B/Igual)': trad(c.M10),
      'A · Palabras': (A.palabras ?? []).join('; '), 'B · Palabras': (B.palabras ?? []).join('; '),
      'A · Frío–Cálido': A.dif?.M42 ?? '', 'B · Frío–Cálido': B.dif?.M42 ?? '', 'A · Confuso–Claro': A.dif?.M43 ?? '', 'B · Confuso–Claro': B.dif?.M43 ?? '',
    });
    emit('task.end', { estimulo: pantalla, valor: trad(c.M6), extra: { prueba: 'Marca A-B' } });
    if (par + 1 < MARCA_PARES.length) { setPar(par + 1); setV(0); setEtapa('intro'); } else onListo();
  };

  const prog = (par + (etapa === 'brillo' || etapa === 'intro' ? 0 : etapa === 'lado' || etapa === 'comp' ? 0.9 : 0.3 + 0.3 * v)) / MARCA_PARES.length;
  const fase = { n: 4, nombre: 'Marca y cierre' };

  if (etapa === 'brillo') {
    return (
      <Page fase={fase}>
        <Kicker>último tramo</Kicker>
        <Title>Antes de seguir</Title>
        <P>{BRILLO_AVISO}</P>
        <div className="sh-grow" />
        <Next onClick={() => setEtapa('intro')} track="marca.brillo-ok">Listo, ya lo hice</Next>
      </Page>
    );
  }
  if (etapa === 'intro') {
    return (
      <Page fase={fase} progreso={prog}>
        <Kicker>pareja {par + 1} de {MARCA_PARES.length}</Kicker>
        <Title>Dos versiones</Title>
        <P>{MARCA_INICIO}</P>
        <div className="sh-grow" />
        <Next onClick={() => { emit('task.start', { estimulo: pantalla, extra: { prueba: 'Marca A-B', orden: s.ordenMarca } }); setEtapa('ver'); }} track="marca.ver-primera">Ver la {opcion(versiones[0]).toLowerCase()}</Next>
      </Page>
    );
  }
  if (etapa === 'ver') {
    return (
      <Page fase={fase} progreso={prog}>
        <Kicker>{opcion(brand)}</Kicker>
        <Cronometrado ms={MS_VER} etiqueta={`${opcion(brand)} durante unos segundos`} onFin={() => setEtapa('preg')}>
          {(esc) => <PantallaEstatica pantalla={pantalla} brand={brand} escala={esc} />}
        </Cronometrado>
        <span className="sh-hint">Mírala con calma unos segundos…</span>
      </Page>
    );
  }
  if (etapa === 'preg') {
    return (
      <Page fase={fase} progreso={prog}>
        <Kicker>sobre la {opcion(brand).toLowerCase()}</Kicker>
        <Preguntas qs={qs} etiquetaFinal="Continuar" onAnswer={(q, vv) => emit('answer', { estimulo: pantalla, valor: Array.isArray(vv) ? vv.join(';') : String(vv ?? ''), extra: { q: q.id, version: brand } })}
          onDone={(r) => {
            setRes((o) => ({ ...o, [`${pantalla}-${brand}`]: { agrado: r.M1, palabras: r.M2, leer: r.M3, dif: { M40: r.M40, M41: r.M41, M42: r.M42, M43: r.M43 } } }));
            t0Punto.current = performance.now(); setEtapa('punto');
          }} />
      </Page>
    );
  }
  if (etapa === 'punto') {
    return (
      <Page fase={fase} progreso={prog}>
        <PointPicker etiqueta={MARCA_PREGUNTAS.M5} track="marca.punto" onPoint={guardarPar_punto}>
          <PantallaEstatica pantalla={pantalla} brand={brand} escala={escala} id="kinoo-punto" />
        </PointPicker>
      </Page>
    );
  }
  function guardarPar_punto(p: { x: number; y: number }) { guardarVersion(p); }

  if (etapa === 'lado') {
    return (
      <Page fase={fase} progreso={prog}>
        <Kicker>las dos juntas</Kicker>
        <Title>Compara</Title>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }} aria-hidden="true">
          {versiones.map((b, i) => (
            <div key={b} style={{ textAlign: 'center' }}>
              <PantallaEstatica pantalla={pantalla} brand={b} escala={0.42} id={`kinoo-lado-${i}`} />
              <div className="sh-hint" style={{ marginTop: 6, fontWeight: 800 }}>{opcion(b)}</div>
            </div>
          ))}
        </div>
        <div className="sh-grow" />
        <Next onClick={() => setEtapa('comp')} track="marca.comparar">Responder</Next>
      </Page>
    );
  }
  const comp: Pregunta[] = [
    { id: 'M6', prompt: MARCA_PREGUNTAS.M6, tipo: 'opcion', opciones: ['Opción 1', 'Opción 2', 'Igual'] },
    { id: 'M7', prompt: MARCA_PREGUNTAS.M7, tipo: 'texto-largo' },
    { id: 'M8', prompt: MARCA_PREGUNTAS.M8, tipo: 'opcion', opciones: ['Opción 1', 'Opción 2', 'Igual'] },
    { id: 'M9', prompt: MARCA_PREGUNTAS.M9, tipo: 'opcion', opciones: ['Opción 1', 'Opción 2', 'Igual'] },
    { id: 'M10', prompt: MARCA_PREGUNTAS.M10, tipo: 'opcion', opciones: ['Opción 1', 'Opción 2', 'Igual'] },
  ];
  return (
    <Page fase={fase} progreso={prog}>
      <Kicker>las dos versiones</Kicker>
      <Preguntas qs={comp} etiquetaFinal={par + 1 < MARCA_PARES.length ? 'Siguiente pareja' : 'Terminar esta parte'}
        onAnswer={(q, vv) => emit('answer', { estimulo: pantalla, valor: String(vv ?? ''), extra: { q: q.id } })} onDone={guardarPar} />
    </Page>
  );
}
void Opciones;
