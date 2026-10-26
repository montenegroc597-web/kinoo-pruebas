// Catálogo del protocolo v2.0 (pruebas no moderadas por link): partes, preguntas y textos exactos, opciones, umbrales y motivos.
// Los textos que ve la persona son EDITABLES desde el Panel (textos.ts): aquí está la redacción original del protocolo,
// que es el valor por defecto. Códigos (D1a, V2…), opciones de respuesta, columnas y umbrales NO se editan desde «Textos».
// Lo que el equipo define antes de lanzar (variantes, moods, películas, mazos, claves) vive en estudio.ts («Config» del Excel).
import type { Flujo, Modulo } from './schema';
import { editable } from './textos';

// ---------------------------------------------------------------- partes y links
export interface ModuloCat { id: Modulo; codigo: string; nombre: string; aprox: string }
export const MODULOS: ModuloCat[] = [
  { id: 'intro', codigo: 'I', nombre: 'Unas preguntas sobre ti', aprox: '1 min' },
  { id: 'descubrir', codigo: 'M1', nombre: 'Descubrir', aprox: '5–7 min' },
  { id: 'ver', codigo: 'M2', nombre: 'Ver', aprox: '4–6 min' },
  { id: 'moods', codigo: 'M3', nombre: 'Cuestionario de categorías', aprox: '5–6 min' },
  { id: 'mazos', codigo: 'M4', nombre: 'Mazos', aprox: '2–3 min' },
  { id: 'percepcion', codigo: 'M5', nombre: 'Tu opinión', aprox: '2–3 min' },
];
export const moduloCat = (id: Modulo): ModuloCat => MODULOS.find((m) => m.id === id)!;

/**
 * Orden fijo de cada link (§0). v3.0: la prueba de flujos y conceptos (Completo, Link 1) ya NO incluye los moods;
 * esos van en el cuestionario de categorías (Link 2), que se envía aparte y tiene su propio análisis.
 */
export const FLUJOS: Record<Flujo, Modulo[]> = {
  Completo: ['intro', 'descubrir', 'ver', 'mazos', 'percepcion'],
  'Link 1': ['intro', 'descubrir', 'ver', 'percepcion'],
  'Link 2': ['intro', 'moods'],
};
/** Dónde va la pregunta de control de atención: en la escala de F2; en el cuestionario de moods (Link 2), al final de M3 (§0.3). */
export const MODULO_CONTROL: Record<Flujo, Modulo> = { Completo: 'percepcion', 'Link 1': 'percepcion', 'Link 2': 'moods' };
/** El Link 2 es el cuestionario de categorías (moods): se analiza aparte de la prueba de flujos. */
export const esCuestionarioMoods = (f: string | undefined): boolean => f === 'Link 2';

// ---------------------------------------------------------------- textos (Anexo A)
export const LINK_TEXTOS = editable('link', { fase: 0, prueba: 'Bienvenida y cierre (Anexo A)' }, {
  bienvenida: 'Hola, gracias por ayudarnos. Vamos a mostrarte unas pantallas de una app que estamos diseñando. No te estamos evaluando a ti: si algo no se entiende, es culpa del diseño, no tuya. Dura entre 15 y 20 minutos (unos 12 si es el Link 1; unos 8 si es el cuestionario de categorías). Hazlo desde tu celular, en vertical y en un lugar tranquilo, sin buscar ayuda ni respuestas, y responde con lo primero que pienses. Arriba verás cuánto llevas y, si una tarea se te hace muy difícil, siempre puedes saltarla. Te pedimos tu nombre solo para saber quién participó: no se publica y tus respuestas se usan solo para mejorar el diseño de la app. Al continuar aceptas participar.',
  final: 'Listo, terminaste. Gracias por tu tiempo. Tus respuestas nos ayudan a mejorar la app. Ya puedes cerrar esta ventana.',
  cincoSegundos: 'La pantalla se oculta sola en 5 segundos.',
  nombre: '¿Cómo te llamas?',
});

// ---------------------------------------------------------------- introducción y perfil (Anexo B)
export const INTRO_PREGUNTAS = editable('intro', { fase: 0, prueba: 'Introducción y perfil (Anexo B)' }, {
  I1: '¿Cuántos años tienes?',
  I2: '¿Con qué frecuencia ves películas o series, en cine o en streaming?',
  I3: '¿Descubres películas o series en redes sociales?',
  I4: '¿Qué tan cómodo te sientes usando apps nuevas en el celular?',
});
export const INTRO_OPCIONES = {
  I1: ['18–24', '25–31', '32–40', 'Otro'],
  I2: ['Todos los días', 'Varias veces por semana', 'Una vez por semana', 'Menos de una vez por semana'],
  I3: ['Sí', 'No'],
  I4: ['Poco', 'Medianamente', 'Muy cómodo'],
};
export const NIVEL_TEC: Record<string, 'Básico' | 'Medio' | 'Alto'> = { Poco: 'Básico', Medianamente: 'Medio', 'Muy cómodo': 'Alto' };

// ---------------------------------------------------------------- tareas sobre el prototipo (D2, D3, D4, V2)
/** Botones y avisos comunes de toda tarea: la persona decide cuándo terminó, o la salta si se le hace muy difícil. */
export const TAREA_TEXTOS = editable('tarea', { fase: 1, prueba: 'Tareas en el prototipo (común a D2, D3, D4 y V2)' }, {
  nota: 'Cuando creas que terminaste, toca «Terminé».',
  terminar: 'Terminé',
  saltar: 'Es muy difícil, saltar',
  confirmarSaltar: '¿Saltar esta tarea? No pasa nada: que algo sea difícil también nos ayuda a mejorar la app.',
  siSaltar: 'Sí, saltar',
  seguir: 'Seguir intentando',
  hecha: 'Tarea terminada',
  saltada: 'Tarea saltada',
  despues: 'Ahora unas preguntas cortas sobre lo que acabas de hacer.',
  pista: 'Prueba la pantalla de arriba con el dedo. Si ya terminaste, toca «Terminé».',
  sinProbar: 'Todavía no has tocado la pantalla. Pruébala y luego toca «Terminé». Si de verdad no harías nada, toca de nuevo.',
  terminarAsi: 'Terminé sin tocar nada',
});

// ---------------------------------------------------------------- M1 · Descubrir
const M1 = { fase: 1, prueba: 'M1 · Descubrir' };
export const DESCUBRIR_TEXTOS = editable('descubrir', M1, {
  inicio: 'Imagina que abres una app para encontrar qué ver. Te vamos a mostrar una pantalla durante 5 segundos. Mírala con normalidad.',
  D1a: '¿Qué fue lo primero que te llamó la atención?',
  D1b: '¿Para qué crees que sirve esta pantalla?',
  D1c: '¿Qué crees que podrías hacer con esta tarjeta?',
  D1d: 'Del 1 al 7, ¿qué tantas ganas te dieron de ver esta película? 1 = ninguna, 7 = muchas.',
  D2: 'Ahora puedes usar la pantalla. Imagina que esta película te llama la atención. Haz lo que harías.',
  D2a: 'Del 1 al 7, ¿qué tan difícil o fácil fue saber qué hacer? 1 = muy difícil, 7 = muy fácil.',
  D2b: '¿Qué crees que pasó con esa película cuando lo hiciste?',
  D3: 'Ahora aparece otra película y esta no te llama la atención. Haz lo que harías.',
  D3a: 'Del 1 al 7, ¿qué tan difícil o fácil fue saber qué hacer? 1 = muy difícil, 7 = muy fácil.',
  D3b: '¿Qué crees que pasó con esa película cuando lo hiciste?',
  D4: 'Ahora explora la app con libertad: completa tu mazo de 10 cartas y mira qué dice este mazo de ti.',
  D4nota: 'Tómate el tiempo que quieras. Cuando hayas visto lo que dice tu mazo, toca «Terminé».',
  D4a: 'En tus palabras, ¿qué te dijo el mazo sobre ti?',
  D4b: 'Del 1 al 7, ¿qué tan sorprendente te pareció lo que dice el mazo? 1 = nada sorprendente, 7 = muy sorprendente.',
  D4c: 'Lo que dice el mazo sobre ti te resulta…',
  D4d: 'Del 1 al 7, ¿qué tantas ganas te dan de ver las películas que elegiste en el mazo? 1 = ninguna, 7 = muchas.',
  D4e: 'Del 1 al 7, ¿qué tan difícil o fácil fue completar el mazo y llegar a lo que dice de ti? 1 = muy difícil, 7 = muy fácil.',
  D4f: '¿Hubo algo que te confundiera mientras completabas el mazo? Si no, déjalo en blanco.',
});
export const OPCIONES_D4C = ['Agradable', 'Indiferente', 'Desagradable'];

// ---------------------------------------------------------------- M2 · Ver
const M2 = { fase: 2, prueba: 'M2 · Ver' };
export const VER_TEXTOS = editable('ver', M2, {
  inicio: 'Ahora vamos a otra parte de la app. Verás una pantalla durante 5 segundos.',
  V1a: '¿Para qué crees que sirve esta pantalla?',
  V1b: 'Del 1 al 7, ¿qué tan clara te quedó? 1 = nada clara, 7 = totalmente clara.',
  V1c: '¿Para qué crees que sirve el elemento marcado con el círculo rojo?',
  V1d: '¿Qué crees que pasa si lo mueves?',
  V2: 'Hoy tienes ganas de ver algo que te haga sentir {mood}. Haz lo que harías en esta pantalla para encontrarlo.',
  V2listo: 'Cuando lo hayas encontrado, toca «Terminé».',
  V2a: 'Del 1 al 7, ¿qué tan difícil o fácil fue saber qué hacer? 1 = muy difícil, 7 = muy fácil.',
  V3: 'Este es tu filtro de mood: al moverlo, Kinoo te propone películas según cómo te sientes en ese momento.',
  V3a: '¿El filtro hace lo que esperabas que hiciera?',
  V3b: 'Del 1 al 7, ¿qué tan útil te parece este filtro para decidir qué ver? 1 = nada útil, 7 = muy útil.',
  V3c: '¿Qué preferirías?',
  V3d: '¿Qué cambiarías de este filtro?',
  V4: 'Kinoo te propone esta película.',
  V4a: 'Confío en que esta recomendación me va a gustar.',
  V4b: 'Entiendo por qué Kinoo me propone esta película.',
  V4c: 'Kinoo parece conocer mis gustos.',
  V4d: 'Del 1 al 7, ¿qué tantas ganas te dan de verla? 1 = ninguna, 7 = muchas.',
});
export const OPCIONES_V3A = ['Sí', 'En parte', 'No'];
export const OPCIONES_V3C = ['Mover el filtro yo mismo', 'Que Kinoo me sugiera el mood', 'Las dos opciones'];
export const ACUERDO: [string, string] = ['totalmente en desacuerdo', 'totalmente de acuerdo'];

// ---------------------------------------------------------------- M3 · Moods
const M3 = { fase: 3, prueba: 'M3 · Moods' };
export const MOODS_TEXTOS = editable('moods', M3, {
  inicio: 'Ahora te vamos a mostrar algunas categorías para elegir qué ver, sin explicarlas. Responde con lo primero que pienses.',
  M3a: '¿Qué esperarías encontrar en la categoría «{mood}»?',
  M3b: 'Del 1 al 7, ¿qué tan claro te queda lo que significa «{mood}»? 1 = nada claro, 7 = totalmente claro.',
  M3c: '¿Cuál de estas 4 películas encaja mejor con «{mood}»?',
  M3d: '¿Con cuál de estas categorías asociarías esta película?',
  M3e: 'Si tuvieras que ponerle tú un nombre a este tipo de película, ¿cómo la llamarías? Una o dos palabras.',
});
export const NINGUNA_M3C = 'Ninguna / no sé';
export const NINGUNA_M3D = 'Ninguna';
/** Moods con pregunta abierta por persona (§3: con 3 por persona y 30–40 personas, cada mood recibe 9–12 respuestas). */
export const MOODS_ABIERTOS_POR_PERSONA = 3;

// ---------------------------------------------------------------- M4 · Mazos
const M4 = { fase: 4, prueba: 'M4 · Mazos' };
export const MAZOS_TEXTOS = editable('mazos', M4, {
  inicio: 'Ahora vamos a ver otra parte de la app. Mira esta pantalla.',
  Z1: '¿Qué crees que es un mazo en esta app?',
  Z2: 'Marca si cada frase es verdadera o falsa según lo que crees. Si no sabes, marca «No sé».',
  Z3: 'Quieres controlar cuánto contenido te aparece. ¿Dónde tocarías?',
  Z3a: 'Del 1 al 7, ¿qué tan difícil o fácil fue saber dónde tocar? 1 = muy difícil, 7 = muy fácil.',
  Z4: 'Si activas un mazo con pocas películas, ¿qué esperas que pase con lo que te aparece en Descubrir?',
  Z5a: 'Del 1 al 7, ¿qué tan claro te queda cómo funciona un mazo? 1 = nada claro, 7 = totalmente claro.',
  Z5b: 'Del 1 al 7, ¿qué tan útil te parece tener mazos? 1 = nada útil, 7 = muy útil.',
});
export const OPCIONES_Z2 = ['Verdadero', 'Falso', 'No sé'];

// ---------------------------------------------------------------- M5 · Percepción final
const M5 = { fase: 5, prueba: 'M5 · Percepción final' };
export const PERCEPCION_TEXTOS = editable('percepcion', M5, {
  F1: 'Del 1 al 7, ¿qué tan chévere te parece esta forma de descubrir y elegir qué ver? 1 = nada chévere, 7 = muy chévere.',
  F2: 'Del 1 al 7, ¿qué tan probable es que uses una app así? 1 = nada probable, 7 = muy probable.',
  control: 'Para comprobar que estás leyendo, marca la opción 5 de esta escala.',
  F3: 'En cada fila hay dos palabras opuestas y siete círculos entre ellas. Marca el círculo que mejor describa tu impresión de la app. Responde rápido, con tu primera impresión.',
  F4: 'Si pudieras cambiar una sola cosa de lo que viste, ¿qué cambiarías?',
});
/** Respuesta correcta de la pregunta de control de atención. */
export const CONTROL_CORRECTO = 5;

/** UEQ: los 26 pares del cuestionario (Anexo G del v1.3). Instrumento estandarizado: NO editable. El v2.0 usa los 8 del UEQ-S (Anexo C). */
export const UEQ_PARES: [string, string][] = [
  ['irritante', 'disfrutable'], ['no comprensible', 'comprensible'], ['creativo', 'monótono'], ['fácil de aprender', 'difícil de aprender'],
  ['valioso', 'de poca calidad'], ['aburrido', 'emocionante'], ['no interesante', 'interesante'], ['impredecible', 'predecible'],
  ['rápido', 'lento'], ['original', 'convencional'], ['obstructivo', 'de apoyo'], ['bueno', 'malo'], ['complicado', 'fácil'],
  ['me desagrada', 'me agrada'], ['habitual', 'de vanguardia'], ['desagradable', 'agradable'], ['seguro', 'inseguro'],
  ['motivador', 'desmotivador'], ['cumple mis expectativas', 'no cumple mis expectativas'], ['ineficiente', 'eficiente'],
  ['claro', 'confuso'], ['poco práctico', 'práctico'], ['ordenado', 'desordenado'], ['atractivo', 'poco atractivo'],
  ['amigable', 'poco amigable'], ['conservador', 'innovador'],
];

// ---------------------------------------------------------------- umbrales («Config», sección G)
/**
 * Metas y semáforos (verde ≥ …, amarillo ≥ …). Valores por defecto del Excel v2.0; el equipo los ajusta en Panel → Estudio
 * (estudio.ts los aplica sobre este objeto al arrancar). En porcentajes van de 0 a 100.
 */
export const UMBRALES = {
  validosPorVariante: 15, minimoTendencia: 12, duracionMinima: 6,
  primerElemento: 70,
  comprension: 70, comprensionAmarillo: 50,
  filtroSinExplicacion: 50, filtroSinExplicacionAmarillo: 30,
  gesto: 80, gestoAmarillo: 60,
  seq: 5.5, seqAmarillo: 4.5,
  opinion: 5, opinionAmarillo: 4,
  confianza: 5.5, confianzaAmarillo: 4.5,
  sorpresaAgradable: 60, sorpresaAgradableAmarillo: 40,
  moodAcierto: 70, moodAciertoAmarillo: 50,
  peliculaMood: 60, peliculaMoodAmarillo: 40,
  mazoIdeas: 60, mazoIdeasAmarillo: 40,
  mazoFrases: 75, mazoFrasesAmarillo: 50,
  ueq: 0.8, ueqAmarillo: -0.8,
  alfa: 0.05, difPorcentaje: 20, difEscala: 1, difUeq: 0.5, difTiempo: 20,
};
export type Umbrales = typeof UMBRALES;

// ---------------------------------------------------------------- motivos («Config», sección H)
export const MOTIVOS = {
  pantalla: ['Texto o etiqueta poco clara', 'Elemento principal poco visible', 'No reconoció el tipo de app', 'Esperaba otro gesto o patrón', 'Demasiada información', 'Imagen o ilustración distrae', 'Otro'],
  gesto: ['No vio qué hacer', 'Probó otro gesto', 'Esperaba un botón', 'No supo hacia dónde deslizar', 'El gesto no respondió (¿falla del prototipo?)', 'Se distrajo', 'Otro'],
  concepto: ['La palabra es ambigua', 'Se parece a otra categoría', 'Usa un término que no conoce', 'Esperaba otra cosa', 'No tiene suficiente contexto', 'Película poco conocida', 'Otro'],
};
/** Tipos de nota del diagrama de afinidad (§7). */
export const TIPOS_NOTA = ['Problema', 'Positivo', 'Idea'] as const;
