// Fuente única de tipos del registro. La usan la app de prueba, el Panel y los tests.
// Protocolo v2.0 (pruebas no moderadas por link): hojas y columnas EXACTAS de Registro_Pruebas_No_Moderadas_Kinoo_v2.0.xlsx,
// más columnas de enlace al final (Sesión ID, Row ID…) que no mueven las del Excel.

/** Partes de la sesión (protocolo v2.0 §0 «Módulos y orden»). */
export type Modulo = 'intro' | 'descubrir' | 'ver' | 'moods' | 'mazos' | 'percepcion';
export type Bloque = 'registro' | Modulo;

/** Card que ve la persona (comparación entre personas, §6). */
export type Variante = 'A' | 'B';

/** Qué link abrió la persona (§0 «Opción más limpia: dividir en dos links»). */
export type Flujo = 'Completo' | 'Link 1' | 'Link 2';

export type EventTipo =
  | 'session.start' | 'session.end' | 'consent' | 'module.start' | 'module.end'
  | 'screen.view' | 'tap' | 'drag' | 'longpress'
  | 'task.start' | 'task.end' | 'answer' | 'action' | 'error';

export interface KinooEvent {
  eventId: string;
  sesionId: string;
  codigo: string;
  ronda: number;
  ts: string;
  tSesion: number;
  bloque: Bloque;
  /** pregunta o tarea en curso (D2, V2, Z3…) */
  estimulo: string | null;
  /** pantalla del prototipo que se ve */
  pantalla: string;
  variante: Variante | '';
  tipo: EventTipo;
  x?: number;
  y?: number;
  target?: string;
  resultado?: string;
  nToque?: number;
  tTarea?: number;
  valor?: string | number;
  extra?: Record<string, unknown>;
  ua: string;
  viewport: string;
}

/** Nombres de hoja (tabla public.hojas en Supabase). Coinciden con el Excel v2.0. */
export const HOJAS = {
  participantes: 'Participantes',
  descubrir: 'Descubrir',
  ver: 'Ver',
  moods: 'Moods',
  peliculas: 'Películas',
  mazos: 'Mazos',
  percepcion: 'Percepción',
  puntos: 'Puntos',
  notas: 'Notas',
  eventos: 'Eventos',
  errores: 'Errores',
} as const;
export type HojaNombre = (typeof HOJAS)[keyof typeof HOJAS];

const ENLACE = ['Sesión ID', 'Row ID'];
const BASE = ['Participante', 'Variante (auto)', 'Válido (auto)'];

/**
 * Columnas de cada hoja que escribe la app, en el orden exacto del Excel v2.0 + columnas de enlace al final.
 * Si cambias algo aquí: `npm run hojas-sql` regenera supabase/hojas.sql, que se aplica en Supabase (ver el skill kinoo-protocolo).
 */
export const COLUMNAS: Record<string, string[]> = {
  [HOJAS.participantes]: [
    'Código', 'Variante de card (A/B)', 'Fecha', 'Dispositivo', 'Edad', 'Género', 'Frecuencia de consumo', 'Descubre en redes (Sí/No)', 'Nivel tecnológico',
    'Flujo (Completo / Link 1 / Link 2)', 'Duración (min)', 'Completó (Sí/No)', 'Control de atención', 'Excluir a mano (Sí)', 'Motivo de exclusión', 'Válido (auto)', 'Notas',
    'Sesión ID', 'Ronda', 'Inicio', 'Fin', 'Partes completadas', 'Versión de textos', 'Versión del estudio', 'Agente de usuario',
    // nombre que escribe al empezar (solo lo ve el equipo: el export público a data/ lo quita)
    'Nombre ingresado',
  ],
  [HOJAS.descubrir]: [
    ...BASE, 'D1a · Primer elemento que llamó la atención', '¿Prioritario? (auto)', 'D1b · Propósito de la pantalla (1/0,5/0)', 'D1c · Qué haría con la card (1/0,5/0)', 'D1d · Interés en la película 1–7',
    'D2 · Gesto «me interesa» (1 correcto · 0,5 alternativo · 0 incorrecto)', 'D2 · Tiempo hasta el gesto (s)', 'D2 · Toques fuera de lugar (n)', 'D2a · SEQ 1–7', 'D2b · Consecuencia esperada (1/0,5/0)',
    'D3 · Gesto «no me interesa» (1 · 0,5 · 0)', 'D3 · Tiempo hasta el gesto (s)', 'D3 · Toques fuera de lugar (n)', 'D3a · SEQ 1–7', 'D3b · Consecuencia esperada (1/0,5/0)',
    'D4a · Interpretación del match (1/0,5/0)', 'D4b · Sorpresa 1–7', 'D4c · Tipo de sorpresa', 'D4d · Ganas de ver lo sugerido 1–7',
    'Motivo si falló el gesto (código)', 'Motivo si no entendió la pantalla o el match (código)', 'Notas y citas textuales',
    'D1a · Respuesta', 'D1b · Respuesta', 'D1c · Respuesta', 'D2 · Gesto hecho', 'D2b · Respuesta', 'D3 · Gesto hecho', 'D3b · Respuesta', 'D4a · Respuesta',
    // D4 explorando el mazo hasta su resumen (columnas que el Excel v2.0 no trae)
    'D4 · Llegó al resumen (1/0)', 'D4 · Tiempo hasta el resumen (s)', 'D4 · Toques (n)', 'D4e · SEQ 1–7', 'D4f · Qué le confundió',
    // cómo terminó cada tarea: la persona toca «Terminé» o la salta; en D2/D3 cuenta el primer gesto, aquí van todos
    'D2 · Resultado de la tarea', 'D2 · Gestos que hizo (en orden)', 'D3 · Resultado de la tarea', 'D3 · Gestos que hizo (en orden)', 'D4 · Resultado de la tarea', ...ENLACE,
  ],
  [HOJAS.ver]: [
    ...BASE, 'V1a · Propósito de la pantalla (1/0,5/0)', 'V1b · Claridad 1–7', 'V1c · Entiende para qué sirve el filtro (1/0,5/0)', 'V1d · Qué espera al moverlo (1/0,5/0)',
    'V2 · Mood alcanzado (1 correcto · 0,5 cercano · 0 otro)', 'V2 · Mood en el que terminó', 'V2 · Tiempo hasta terminar (s)', 'V2 · Movimientos de la barra (n)', 'V2 · Toques fuera de lugar (n)', 'V2a · SEQ 1–7',
    'V3a · ¿Era lo que esperabas?', 'V3b · Utilidad del filtro 1–7', 'V3c · Preferencia', 'V3d · Qué cambiaría del filtro',
    'V4a · Confío en la recomendación 1–7', 'V4b · Entiendo por qué me la propone 1–7', 'V4c · Parece conocer mis gustos 1–7', 'Índice de confianza (auto, 1–7)', 'V4d · Ganas de ver la película 1–7',
    'Motivo si no entendió el filtro o falló la tarea (código)', 'Notas y citas textuales',
    'V1a · Respuesta', 'V1c · Respuesta', 'V1d · Respuesta', 'V2 · Mood objetivo', 'V2 · Resultado de la tarea', ...ENLACE,
  ],
  [HOJAS.moods]: [
    ...BASE, 'Mood', 'M3c · Película elegida', '¿Acierta? (auto)', 'Mood con el que lo confundió (auto)', 'M3c · Tiempo (s)',
    'M3a · Significado abierto (1/0,5/0) (solo 3 moods por persona)', 'M3b · Claridad 1–7 (solo esos 3)', 'Motivo si no lo entendió (código)', 'Notas y citas',
    'M3a · Respuesta', 'M3c · Orden en que lo vio', ...ENLACE,
  ],
  [HOJAS.peliculas]: [
    ...BASE, 'Película', 'M3d · Mood con el que la asocia', '¿Coincide con el previsto? (auto)', 'M3e · Nombre que le pondría', 'El nombre equivale a… (lo codifica el equipo)', 'Notas y citas',
    'Mood previsto', ...ENLACE,
  ],
  [HOJAS.mazos]: [
    ...BASE, 'Z1 · Idea clave 1 mencionada (1/0)', 'Z1 · Idea clave 2 (1/0)', 'Z1 · Idea clave 3 (1/0)', 'Z1 · Idea clave 4 (1/0)', 'Ideas clave captadas (auto, 0–4)',
    'Z2 · Frase 1', 'Z2 · Frase 2', 'Z2 · Frase 3', 'Z2 · Frase 4', 'Frases acertadas (auto, 0–4)',
    'Z3 · Primer clic para controlar el contenido (1 · 0,5 · 0)', 'Z3 · Tiempo al primer clic (s)', 'Z3a · SEQ 1–7', 'Z4 · Consecuencia que espera', '¿Acierta? (auto)',
    'Z5a · Claridad de cómo funciona 1–7', 'Z5b · Utilidad de tener mazos 1–7', 'Motivo si no entendió (código)', 'Notas y citas textuales',
    'Z1 · Respuesta', ...ENLACE,
  ],
  [HOJAS.percepcion]: [
    ...BASE, 'F1 · Qué tan chévere 1–7', 'F2 · Probabilidad de usar una app así 1–7',
    'F3 · UEQ-S ítem 6: aburrido (1) – emocionante (7)', 'F3 · UEQ-S ítem 7: no interesante (1) – interesante (7)', 'F3 · UEQ-S ítem 10: original (1) – convencional (7)',
    'F3 · UEQ-S ítem 11: obstructivo (1) – de apoyo (7)', 'F3 · UEQ-S ítem 13: complicado (1) – fácil (7)', 'F3 · UEQ-S ítem 15: habitual (1) – de vanguardia (7)',
    'F3 · UEQ-S ítem 20: ineficiente (1) – eficiente (7)', 'F3 · UEQ-S ítem 21: claro (1) – confuso (7)',
    'UEQ-S Pragmática (auto, −3…+3)', 'UEQ-S Hedónica (auto, −3…+3)', 'UEQ-S General (auto)', 'F4 · Qué cambiaría (texto)', ...ENLACE,
  ],
  /** Toques y gestos sobre el prototipo (para los mapas del Panel). No está en el Excel. */
  [HOJAS.puntos]: ['Participante', 'Variante', 'Módulo', 'Tarea', 'Pantalla', 'N.º de toque (1 = primero)', 'Tipo (toque / gesto)', 'Dirección', 'X (% ancho)', 'Y (% alto)', 'Tiempo desde que se mostró (s)', 'Resultado', ...ENLACE],
  /** Diagrama de afinidad (§7): una nota por cita u observación. */
  [HOJAS.notas]: ['Participante', 'Variante', 'Módulo', 'Pregunta', 'Texto', 'Tipo', 'Gravedad', 'Tema', ...ENLACE],
  [HOJAS.eventos]: ['eventId', 'sesionId', 'codigo', 'ronda', 'ts', 'tSesion', 'bloque', 'estimulo', 'pantalla', 'variante', 'tipo', 'x', 'y', 'target', 'resultado', 'nToque', 'tTarea', 'valor', 'extra', 'ua', 'viewport'],
  [HOJAS.errores]: ['ts', 'codigo', 'sesionId', 'pantalla', 'mensaje', 'stack', 'estado'],
};

/** Hojas a las que la app escribe con action:'rows' (una fila por persona, por persona y mood, o por persona y película). */
export const HOJAS_ESCRIBIBLES: string[] = [HOJAS.descubrir, HOJAS.ver, HOJAS.moods, HOJAS.peliculas, HOJAS.mazos, HOJAS.percepcion, HOJAS.puntos, HOJAS.notas, HOJAS.errores];

/** Orden de las hojas al exportar en el formato del Excel v2.0. */
export const ORDEN_EXCEL = [HOJAS.participantes, HOJAS.descubrir, HOJAS.ver, HOJAS.moods, HOJAS.peliculas, HOJAS.mazos, HOJAS.percepcion];

export interface Asignacion {
  codigo: string;
  sesionId: string;
  variante: Variante;
  flujo: Flujo;
}

export interface PerfilRegistro {
  ronda: number;
  flujo: Flujo;
  /** si el link fija la card (Link 1-A / Link 1-B); si no, el servidor alterna A, B, A, B… */
  variante?: Variante;
  dispositivo?: string;
  agente?: string;
  versionTextos?: string;
  versionEstudio?: string;
  /** nombre que escribe la persona al empezar (además del código P01…) */
  nombre?: string;
}
