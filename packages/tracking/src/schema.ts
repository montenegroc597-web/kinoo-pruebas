// Fuente única de tipos del registro. La usan la app de prueba, el Panel y los tests.

export type Bloque =
  | 'registro' | 'contexto' | 'cinco-seg' | 'cards' | 'primer-clic'
  | 'flujos' | 'ueq' | 'marca' | 'cierre';

export type Version = 'A' | 'B' | 'U';

export type EventTipo =
  | 'session.start' | 'session.end' | 'consent' | 'phase.start' | 'phase.end'
  | 'screen.view' | 'tap' | 'drag' | 'longpress'
  | 'task.start' | 'task.end' | 'answer' | 'help.open'
  | 'giveup' | 'skip' | 'pause' | 'resume' | 'action' | 'error';

export type ResultadoClic = 'Correcto' | 'Aceptable' | 'Miss click' | 'Sin zona definida';

export interface KinooEvent {
  eventId: string;
  sesionId: string;
  codigo: string;
  nombreMostrado: string;
  ronda: number;
  fase: number;
  ts: string;
  tSesion: number;
  bloque: Bloque;
  estimulo: string | null;
  pantalla: string;
  version: Version;
  tipo: EventTipo;
  x?: number;
  y?: number;
  target?: string;
  interactivo?: boolean;
  zona?: 'correcta' | 'aceptable' | null;
  resultado?: ResultadoClic;
  nClic?: number;
  tTarea?: number;
  valor?: string | number;
  extra?: Record<string, unknown>;
  ua: string;
  viewport: string;
}

/** Nombres de hoja del Google Sheet. Coinciden con Registro_Pruebas_Usabilidad_Kinoo_v1.3.xlsx. */
export const HOJAS = {
  participantes: 'Participantes',
  config: 'Config',
  pantallas: 'Pantallas',
  zonas: 'Zonas',
  cincoSeg: '5 segundos',
  cards: '5 s – Cards',
  primerClic: 'Primer clic + SEQ',
  ueq: 'UEQ',
  puntos: 'Puntos',
  marca: 'Marca A-B',
  contraste: 'Contraste',
  eventos: 'Eventos',
  flujos: 'Flujos',
  notas: 'Notas',
  errores: 'Errores',
} as const;
export type HojaNombre = (typeof HOJAS)[keyof typeof HOJAS];

/** Columnas de cada hoja que escribe la app (en el orden exacto del Registro v1.3 + columnas de enlace al final). */
export const COLUMNAS: Record<string, string[]> = {
  [HOJAS.participantes]: ['Código', 'Ronda', 'Fecha', 'Edad', 'Género', 'Frecuencia de consumo', 'Descubre en redes (Sí/No)', 'Nivel tecnológico', 'Orden de tareas', 'Orden marca (A→B / B→A)', 'Moderador/a', 'Notas', 'Nombre ingresado', 'Nombre mostrado', 'Sesión ID', 'Orden flujos', 'Consentimiento (fecha)', 'Graba (Sí/No)', 'Dispositivo', 'Fases completadas'],
  [HOJAS.cincoSeg]: ['Participante', 'Pantalla ID', 'Pantalla', 'Flujo', 'Versión', 'Recuerdo libre (textual, en orden)', 'Propósito (1/0,5/0)', 'Acción principal (1/0,5/0)', 'Claridad 1–7', 'Palabra / sensación', 'Puntos registrados', 'Notas', 'Motivo si no entendió propósito o acción (código)', 'Nombre mostrado', 'Sesión ID', 'Row ID'],
  [HOJAS.cards]: ['Participante', 'Card', 'Pantalla ID', 'Flujo', '¿Conocía la película? (Sí/No)', 'Primer elemento que llamó la atención', '¿Prioritario? (auto)', 'Otros elementos recordados', '# elementos recordados', 'Contenido (1/0,5/0)', 'Interés 1–7', 'Acción principal (1/0,5/0)', 'Información que faltó', 'Puntos registrados', 'Notas', 'Motivo si no captó contenido o acción (código)', 'Nombre mostrado', 'Sesión ID', 'Row ID'],
  [HOJAS.primerClic]: ['Participante', 'Tarea', 'Orden en sesión', 'Pantalla ID (auto)', 'Flujo (auto)', 'Tiempo al 1er clic (s)', 'Resultado 1er clic (auto)', 'Puntaje auto (1/0,5/0)', 'Resultado manual (opcional; anula el auto)', 'Puntaje final', 'Clics totales', 'Miss clicks', 'SEQ 1–7', 'Si SEQ ≤ 4: ¿qué la hizo difícil?', '¿Qué esperabas que pasara?', 'Notas', 'Motivo del fallo o de SEQ ≤ 4 (código)', 'Nombre mostrado', 'Sesión ID', 'Row ID'],
  [HOJAS.ueq]: ['Participante', 'Versión evaluada', 'Formato', ...Array.from({ length: 26 }, (_, i) => String(i + 1)), 'Comentario libre', 'Nombre mostrado', 'Sesión ID', 'Row ID'],
  [HOJAS.puntos]: ['Participante', 'Prueba', 'Estímulo (tarea T1…T5 / card C1…C6 / par)', 'Pantalla ID', 'Versión', 'N.º de clic (1 = primero)', 'X (% ancho)', 'Y (% alto)', 'Celda de cuadrícula (alt., ej. C7)', 'Tiempo desde que se mostró (s)', 'Notas', 'Resultado', 'Nombre mostrado', 'Sesión ID', 'Row ID'],
  [HOJAS.marca]: ['Participante', 'Orden visto (auto)', 'Pantalla ID', 'A · Agrado 1–7', 'A · Legibilidad 1–7', 'A · Aburrido–Emocionante 1–7', 'A · Genérico–Distintivo 1–7', 'A · # atributos deseados (0–3)', 'A · # atributos a evitar (0–3)', 'A · Primer elemento = jerarquía prevista (1/0)', 'B · Agrado 1–7', 'B · Legibilidad 1–7', 'B · Aburrido–Emocionante 1–7', 'B · Genérico–Distintivo 1–7', 'B · # atributos deseados (0–3)', 'B · # atributos a evitar (0–3)', 'B · Primer elemento = jerarquía prevista (1/0)', 'Preferencia directa (A/B/Igual)', 'Dimensión que más pesó', 'Motivo (textual)', 'Notas', '¿Qué colores prefiere? (A/B/Igual)', '¿Cuál se lee mejor? (A/B/Igual)', 'Atributo preguntado', '¿Cuál es más [atributo]? (A/B/Igual)', 'A · Palabras', 'B · Palabras', 'A · Frío–Cálido', 'B · Frío–Cálido', 'A · Confuso–Claro', 'B · Confuso–Claro', 'Nombre mostrado', 'Sesión ID', 'Row ID'],
  [HOJAS.eventos]: ['eventId', 'sesionId', 'codigo', 'nombreMostrado', 'ronda', 'fase', 'ts', 'tSesion', 'bloque', 'estimulo', 'pantalla', 'version', 'tipo', 'x', 'y', 'target', 'interactivo', 'zona', 'resultado', 'nClic', 'tTarea', 'valor', 'extra', 'ua', 'viewport'],
  [HOJAS.flujos]: ['Participante', 'Nombre mostrado', 'Misión', 'Flujo', 'Orden', 'Resultado', 'Tiempo (s)', 'Toques', 'Misclicks', 'Pantallas visitadas (ruta)', 'Desvíos', 'Ayuda abierta', 'SEQ', 'SEQ motivo', 'Notas', 'Sesión ID', 'Row ID'],
  [HOJAS.notas]: ['Participante', 'Nombre mostrado', 'Prueba', 'Pantalla / Tarea / Card', 'Texto', 'Tipo', 'Gravedad', 'Tema', 'Sesión ID', 'Row ID'],
  [HOJAS.errores]: ['ts', 'codigo', 'sesionId', 'pantalla', 'mensaje', 'stack', 'estado'],
};

/** Hojas a las que la app puede escribir con action:'rows'. */
export const HOJAS_ESCRIBIBLES: string[] = [HOJAS.cincoSeg, HOJAS.cards, HOJAS.primerClic, HOJAS.ueq, HOJAS.puntos, HOJAS.marca, HOJAS.flujos, HOJAS.notas, HOJAS.errores];

export interface Asignacion {
  codigo: string;
  nombreMostrado: string;
  sesionId: string;
  ordenTareas: string;
  ordenMarca: 'A→B' | 'B→A';
  ordenFlujos: 'Descubrir→Ver' | 'Ver→Descubrir';
}

export interface PerfilRegistro {
  nombre: string;
  ronda: number;
  edad?: number;
  genero?: string;
  frecuencia?: string;
  descubreRedes?: 'Sí' | 'No';
  nivelTec?: 'Básico' | 'Medio' | 'Alto';
  notas?: string;
  dispositivo?: string;
  graba?: 'Sí' | 'No';
}
