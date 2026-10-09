// Catálogo: pantallas, tareas, misiones y textos EXACTOS del protocolo v1.3. No cambiar palabras: el protocolo exige leer igual a todos.

export interface PantallaCat { id: string; nombre: string; flujo: string; pruebas: string; ruta: string }
export const PANTALLAS: PantallaCat[] = [
  { id: 'S01', nombre: 'Inicio', flujo: 'Entrada a la app', pruebas: 'Primer clic (T3), Flujos (D1)', ruta: '/mood' },
  { id: 'S02', nombre: 'Descubrir (card)', flujo: 'Descubrir: explorar y guardar', pruebas: '5 segundos, 5 s – Cards, Primer clic (T2), Marca A-B, Flujos (D2)', ruta: '/descubrir' },
  { id: 'S03', nombre: 'Ficha de película / calificación', flujo: 'Ver: ficha y calificación', pruebas: 'Primer clic (T1), Marca A-B, Flujos (V2)', ruta: "/ver" },
  { id: 'S04', nombre: 'Ver', flujo: 'Ver: retomar y decidir', pruebas: '5 segundos, Primer clic (T5), Marca A-B, Flujos (V1)', ruta: "/ver" },
  { id: 'S05', nombre: 'Gestión de mazo', flujo: 'Mazo: gestión', pruebas: '5 segundos, Marca A-B, Primer clic (T4), Flujos (D1, M1)', ruta: '/mazos' },
  { id: 'S06', nombre: 'Lectura de mood', flujo: 'Descubrir: entrada', pruebas: 'Flujos (D1)', ruta: '/mood/lectura' },
  { id: 'S07', nombre: 'Fin del mazo / recarga', flujo: 'Mazo: gestión', pruebas: 'Primer clic (T4), Flujos (M2)', ruta: '/recarga' },
  { id: 'S08', nombre: 'Mi espacio', flujo: 'Ver: retomar y decidir', pruebas: 'Flujos (V3)', ruta: '/mi-espacio' },
];
export const flujoDePantalla = (id: string): string => PANTALLAS.find((p) => p.id === id.split('.')[0])?.flujo ?? '';
export const nombreDePantalla = (id: string): string => PANTALLAS.find((p) => p.id === id.split('.')[0])?.nombre ?? id;

// ---------- Primer clic ----------
export interface TareaCat {
  id: 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
  escenario: string;
  pantalla: string;
  seed: string;
  /** Pantalla S.. donde se mide la zona (puede ser un subestado). */
  vista: string;
  descripcionZona: string;
  seqSeguimiento: string;
}
export const SEQ_PREGUNTA = '«En general, ¿qué tan difícil o fácil te pareció esta tarea?»';
export const TAREAS: TareaCat[] = [
  { id: 'T1', escenario: 'Acabas de ver una película y quieres decir qué te pareció. ¿Dónde tocarías para calificarla?', pantalla: 'S03', seed: 'ver-back', vista: 'S03', descripcionZona: 'Botón «Sí» de «¿Viste la película?»', seqSeguimiento: '¿Qué hizo difícil encontrar dónde calificar?' },
  { id: 'T2', escenario: 'Estás explorando películas en Kinoo y una te llama la atención. ¿Dónde tocarías para ver más información sobre ella?', pantalla: 'S02', seed: 'deck-nolan-start', vista: 'S02', descripcionZona: 'Indicadores del card', seqSeguimiento: '¿Qué hizo difícil saber dónde tocar para ver más información?' },
  { id: 'T3', escenario: 'Es viernes en la noche y quieres ver algo que ya habías marcado antes. ¿Dónde tocarías?', pantalla: 'S01', seed: 'fresh', vista: 'S01', descripcionZona: 'Acceso al espacio Ver', seqSeguimiento: '¿Qué hizo difícil encontrar dónde ver lo que habías marcado?' },
  { id: 'T4', escenario: 'Ya terminaste las películas de tu mazo activo y quieres seguir viendo más. ¿Dónde tocarías para tener un nuevo mazo?', pantalla: 'S07', seed: 'deck-finished', vista: 'S07', descripcionZona: 'Acción de añadir / crear un nuevo mazo', seqSeguimiento: '¿Qué hizo difícil encontrar cómo tener un nuevo mazo?' },
  { id: 'T5', escenario: 'Kinoo te propone una película que no te interesa. ¿Dónde tocarías para decir que no?', pantalla: 'S04', seed: 'ver-pool', vista: 'S04', descripcionZona: 'Acción de descartar', seqSeguimiento: '¿Qué hizo difícil encontrar cómo decir que no?' },
];
export const PRIMER_CLIC_INTRO = 'Te voy a leer una situación y te voy a mostrar una pantalla. Toca o señala el primer lugar donde lo harías. Solo un toque; no hay respuestas incorrectas.';
export const PRIMER_CLIC_CONTINUAR = 'Sigue tocando hasta donde crees que lo lograrías. Máximo tres toques.';
export const PRIMER_CLIC_ESPERABAS = '¿Qué esperabas que pasara al tocar ahí?';

// ---------- Contexto y cierre ----------
export const CONTEXTO = [
  { id: 'C1', pregunta: '¿Con qué frecuencia ves películas o series, en cine o en streaming?', col: 'Frecuencia de consumo', opciones: ['Casi todos los días', 'Varias veces por semana', 'Una vez por semana', 'Un par de veces al mes', 'Casi nunca'] },
  { id: 'C2', pregunta: '¿Dónde las ves normalmente?', col: 'Notas', abierta: true },
  { id: 'C3', pregunta: '¿Cómo te enteras de qué ver?', col: 'Notas', abierta: true },
  { id: 'C4', pregunta: '¿Descubres películas o series en redes sociales? ¿En cuáles?', col: 'Descubre en redes (Sí/No)', opciones: ['Sí', 'No'], abiertaSi: true },
  { id: 'C5', pregunta: '¿Qué tan cómodo te sientes usando apps nuevas en el celular: poco, medianamente o muy cómodo?', col: 'Nivel tecnológico', opciones: ['Poco', 'Medianamente', 'Muy cómodo'] },
] as const;
export const NIVEL_TEC: Record<string, 'Básico' | 'Medio' | 'Alto'> = { 'Poco': 'Básico', 'Medianamente': 'Medio', 'Muy cómodo': 'Alto' };
export const CIERRE = [
  { id: 'K1', pregunta: '¿Hay algo más que quieras comentar?', tipo: 'Positivo' },
  { id: 'K2', pregunta: '¿Qué cambiarías?', tipo: 'Idea' },
  { id: 'K3', pregunta: 'De todo lo que viste hoy, ¿qué fue lo que más te gustó y qué lo que menos?', tipo: 'Positivo' },
] as const;
export const FILTRO_RECLUTAMIENTO_NOTA = 'Perfil: 18–40 años, en Bogotá, ven películas o series al menos una vez por semana (Anexo C).';

export const CONSENTIMIENTO = [
  'La sesión dura entre 45 y 60 minutos y puedo retirarme en cualquier momento sin dar explicaciones.',
  'Se registrarán mis toques, tiempos y respuestas dentro de esta prueba. Si lo autorizo, también se grabará la pantalla y el audio.',
  'Mis datos se usarán solo para mejorar el diseño de la aplicación, de forma anónima, y no se compartirán con terceros (Ley 1581 de 2012 de protección de datos personales).',
  'Las pantallas que veré son confidenciales.',
];
export const BIENVENIDA = 'Gracias por participar. Vamos a ver unas pantallas de una aplicación que estamos diseñando. No estamos evaluándote a ti, sino la app: si algo es difícil, es culpa del diseño. No hay respuestas correctas ni incorrectas. Puedes parar cuando quieras.';
export const RECORDATORIO = 'Estamos probando la app, no a ti. No hay respuestas incorrectas.';

// ---------- 5 segundos ----------
export const CINCO_SEG_INICIO = 'Te voy a mostrar una pantalla de una app durante 5 segundos. Mírala con normalidad.';
export const CINCO_SEG_PREGUNTAS = {
  P1: '¿Qué recuerdas de lo que viste?',
  P2: '¿Para qué crees que sirve esta pantalla?',
  P3: 'Si estuvieras usando esta pantalla, ¿qué harías primero?',
  P4: 'Del 1 al 7, ¿qué tan claro te quedó para qué sirve esta pantalla? 1 = nada claro, 7 = totalmente claro.',
  P5: '¿Qué palabra usarías para describir la sensación que te dio?',
  P6: 'Señala dónde estaba lo que más recuerdas.',
};
export const CINCO_SEG_PANTALLAS = ['S02', 'S04', 'S05', 'S03'];
export const CLAVE_5S: Record<string, { proposito: string; accion: string; elementos: string }> = {
  S02: { proposito: 'Encontrar/descubrir películas o series; guardar lo que te interesa', accion: 'Deslizar para guardar o descartar, o voltear la carta', elementos: 'Medidor de match, frase gancho, gesto de swipe' },
  S04: { proposito: 'Retomar algo que ya te había interesado; decidir qué ver ahora', accion: 'Aceptar («Verla») o pedir otra', elementos: 'La película propuesta y el «por qué» te la recomienda' },
  S05: { proposito: 'Elegir qué mazo (grupo de películas) quieres para hoy', accion: 'Barajar y repartir un mazo', elementos: 'El mazo del día, los otros mazos y el botón de barajar' },
  S03: { proposito: 'Contar qué te pareció una película que acabas de ver', accion: 'Elegir una reacción y guardar', elementos: 'Las tres reacciones y la opción de repetir' },
};

// ---------- Cards ----------
export const CARDS_INICIO = 'Ahora te voy a mostrar una tarjeta de una película durante 5 segundos. Mírala con normalidad.';
export const CARDS_PREGUNTAS = {
  C0: '¿Conocías esta película?',
  C1: '¿Qué fue lo primero que te llamó la atención?',
  C2: '¿Qué más recuerdas haber visto?',
  C3: '¿De qué crees que trata esta película?',
  C4: 'Del 1 al 7, ¿qué tantas ganas te dieron de ver esta película? 1 = ninguna, 7 = muchas.',
  C5: '¿Qué crees que podrías hacer con esta tarjeta?',
  C6: '¿Qué información te faltó para decidir si la verías?',
  C7: 'Señala lo primero que viste.',
};
/**
 * Estímulos de la prueba de cards: 3 tarjetas DISTINTAS (película, cara y mazo), mostradas dentro de la pantalla completa de Descubrir
 * para que se vea el contexto del gesto de deslizar. Mezcla conocidas / no conocidas y frente / reverso.
 */
export const CARDS_ESTIMULOS: { id: string; film: string; face: 'frente' | 'reverso'; deck: 'nolan' | 'other'; i: number }[] = [
  { id: 'C1', film: 'ciudad', face: 'frente', deck: 'other', i: 0 },
  { id: 'C2', film: 'interstellar', face: 'reverso', deck: 'nolan', i: 0 },
  { id: 'C3', film: 'faro', face: 'frente', deck: 'other', i: 1 },
];
export const CARDS_PRUEBA_GESTO = 'Ahora pruébala como lo harías: toca o desliza la tarjeta como creas que se usa. Cuando termines, toca «Listo».';
export const PELICULAS_CONOCIDAS = ['interstellar', 'darkknight', 'oppenheimer'];
export interface ElementoCard { id: string; etiqueta: string; prioridad: number | null }
export const ELEMENTOS_REVERSO: ElementoCard[] = [
  { id: 'poster', etiqueta: 'Póster / imagen principal', prioridad: 1 },
  { id: 'titulo', etiqueta: 'Título', prioridad: 2 },
  { id: 'indicadores', etiqueta: 'Indicadores (match, género, duración…)', prioridad: 3 },
  { id: 'info', etiqueta: 'Información de la película', prioridad: 3 },
  { id: 'gesto', etiqueta: 'Gesto de swipe / acciones', prioridad: 4 },
  { id: 'otro', etiqueta: 'Otro', prioridad: null },
];
export const ELEMENTOS_FRENTE: ElementoCard[] = [
  { id: 'gancho', etiqueta: 'Frase gancho', prioridad: 1 },
  { id: 'medidor', etiqueta: 'Medidor de match', prioridad: 2 },
  { id: 'dimensiones', etiqueta: 'Cuatro dimensiones (Ritmo, Tono, Historia, Visual)', prioridad: 3 },
  { id: 'info', etiqueta: 'Motivo social o géneros', prioridad: 3 },
  { id: 'gesto', etiqueta: 'Gesto de swipe / acciones', prioridad: 4 },
  { id: 'otro', etiqueta: 'Otro', prioridad: null },
];
export const esPrioritario = (e: ElementoCard | undefined): boolean => !!e && e.prioridad != null && e.prioridad <= 2;

// ---------- Marca A/B ----------
export const MARCA_INICIO = 'Te voy a mostrar dos versiones de unas pantallas, una a la vez. Mira cada una unos segundos y después te haré unas preguntas sobre ella. No hay respuestas correctas.';
export const MARCA_PREGUNTAS = {
  M1: 'Del 1 al 7, ¿qué tan agradable te parece esta pantalla? 1 = nada agradable, 7 = muy agradable.',
  M2: 'De esta lista de palabras, elige las 3 que mejor describen esta app.',
  M3: 'Del 1 al 7, ¿qué tan fácil fue leer el texto de esta pantalla? 1 = muy difícil, 7 = muy fácil.',
  M4: 'En cada fila, marca del 1 al 7 dónde ubicarías esta pantalla.',
  M5: '¿Qué ves primero en esta pantalla? Señálalo.',
  M6: '¿Cuál te resulta más agradable: la Opción 1, la Opción 2 o te dan igual?',
  M7: '¿Por qué?',
  M8: '¿Cuál tiene colores que te gustan más?',
  M9: '¿Cuál se lee mejor?',
  M10: '¿Cuál te parece más cinematográfica?',
};
export const MARCA_DIFERENCIALES: [string, string][] = [['Aburrido', 'Emocionante'], ['Genérico', 'Distintivo'], ['Frío', 'Cálido'], ['Confuso', 'Claro']];
export const MARCA_PALABRAS = ['cercana', 'cinematográfica', 'confiable', 'tranquila', 'infantil', 'agresiva', 'genérica', 'moderna', 'sencilla', 'colorida', 'oscura', 'elegante'];
export const MARCA_DESEADOS = ['cercana', 'cinematográfica', 'confiable', 'tranquila'];
export const MARCA_EVITAR = ['infantil', 'agresiva', 'genérica'];
export const MARCA_ATRIBUTO = 'cinematográfica';
export const MARCA_PARES = ['S02', 'S04', 'S05'];
export const MARCA_DIMENSIONES = ['General', 'Colores', 'Tipografía', 'Contraste', 'Jerarquía'];
export const BRILLO_AVISO = 'Sube el brillo de tu pantalla al máximo y desactiva el modo de ahorro de energía. Así todas las personas ven lo mismo.';

// ---------- UEQ ----------
export const UEQ_INSTRUCCION = 'Ahora te voy a pedir que califiques las pantallas que viste. En cada fila hay dos palabras opuestas y siete círculos entre ellas. Marca el círculo que mejor describa tu impresión de la app: cuanto más cerca de una palabra, más describe esa palabra tu impresión. No hay respuestas correctas ni incorrectas. Responde rápido, con tu primera impresión, y marca un círculo en cada fila.';
export const UEQ_CAMBIAR = 'Si pudieras cambiar una sola cosa de la app, ¿qué cambiarías?';
export const UEQ_PARES: [string, string][] = [
  ['irritante', 'disfrutable'], ['no comprensible', 'comprensible'], ['creativo', 'monótono'], ['fácil de aprender', 'difícil de aprender'],
  ['valioso', 'de poca calidad'], ['aburrido', 'emocionante'], ['no interesante', 'interesante'], ['impredecible', 'predecible'],
  ['rápido', 'lento'], ['original', 'convencional'], ['obstructivo', 'de apoyo'], ['bueno', 'malo'], ['complicado', 'fácil'],
  ['me desagrada', 'me agrada'], ['habitual', 'de vanguardia'], ['desagradable', 'agradable'], ['seguro', 'inseguro'],
  ['motivador', 'desmotivador'], ['cumple mis expectativas', 'no cumple mis expectativas'], ['ineficiente', 'eficiente'],
  ['claro', 'confuso'], ['poco práctico', 'práctico'], ['ordenado', 'desordenado'], ['atractivo', 'poco atractivo'],
  ['amigable', 'poco amigable'], ['conservador', 'innovador'],
];

// ---------- Motivos (Config del Registro v1.3) ----------
export const MOTIVOS_5S = ['Texto o etiqueta poco clara', 'Elemento principal poco visible', 'Imagen o ilustración distrae', 'Jerarquía visual confusa', 'No reconoce el tipo de app', 'Otro'];
export const MOTIVOS_CLIC = ['No vio el elemento', 'Etiqueta ambigua', 'Esperaba otro lugar o patrón', 'Ícono no reconocible', 'No se ve que es accionable', 'Elemento muy pequeño o poco visible', 'Demasiadas opciones', 'Otro'];
export const MOTIVOS_CARDS = ['El póster o la imagen domina', 'Texto pequeño o poco legible', 'Demasiada información', 'Información insuficiente', 'Los indicadores no se entienden', 'Demasiadas opciones', 'Película poco conocida', 'Otro'];

// ---------- Umbrales (hoja Config) ----------
export const UMBRALES = {
  primerClicVerde: 80, primerClicAmarillo: 60,
  seqVerde: 5.5, seqAmarillo: 4.5,
  missVerde: 20, missAmarillo: 35,
  ueqVerde: 0.8, ueqAmarillo: -0.8,
  proposito5s: 80, accion5s: 70, claridad5s: 5.5,
  atencionCards: 70, interesCards: 5, contenidoCards: 70, accionCards: 70,
  errorConcentrado: 25, medianaTiempoBueno: 5, medianaTiempoDuda: 10,
  jerarquiaMarca: 70, legibilidadMarca: 5.5,
};

// ---------- Flujos tipo Maze (Prueba 5) ----------
export type FlujoId = 'F-D' | 'F-M' | 'F-V';
export interface MisionCat {
  id: string; flujo: FlujoId; titulo: string; escenario: string; seed: string; pantallaInicio: string;
  rutaEsperada: string[]; maxTiempo: number; pasos: { id: string; etiqueta: string }[];
}
export const FLUJO_NOMBRE: Record<FlujoId, string> = { 'F-D': 'Descubrir', 'F-M': 'Mazos (micro-flujo)', 'F-V': 'Ver' };
export const MISIONES: MisionCat[] = [
  { id: 'D1', flujo: 'F-D', titulo: 'Del inicio a tus mazos', seed: 'fresh', pantallaInicio: 'S01', maxTiempo: 120,
    escenario: 'Hoy llegaste a casa cansado y no quieres pensar mucho. Cuéntale a Kinoo cómo te sientes y llega hasta las opciones de películas que te prepara.',
    rutaEsperada: ['S01', 'S01.sheet', 'S06', 'S05'],
    pasos: [{ id: 'mood.picked', etiqueta: 'Elige un mood' }, { id: 'mood.continue', etiqueta: 'Continúa' }, { id: 'screen:S06', etiqueta: 'Lee su mood' }, { id: 'screen:S05', etiqueta: 'Llega a Mazos' }] },
  { id: 'M1', flujo: 'F-M', titulo: 'De los mazos a las cartas de Nolan', seed: 'mazos-en-curso', pantallaInicio: 'S05', maxTiempo: 120,
    escenario: 'Ya tienes un mazo empezado, pero hoy te dieron ganas de ver cosas de Christopher Nolan. Empieza ese otro mazo y llega hasta sus cartas.',
    rutaEsperada: ['S05', 'S05.confirm', 'S05.barajando', 'S05.listo', 'S02', 'S02.flipped'],
    pasos: [{ id: 'deck.pick:nolan', etiqueta: 'Elige el mazo Nolan' }, { id: 'swap.confirm', etiqueta: 'Confirma el cambio' }, { id: 'deck.dealt:nolan', etiqueta: 'Se baraja' }, { id: 'screen:S02', etiqueta: 'Llega a las cartas' }] },
  { id: 'D2', flujo: 'F-D', titulo: 'De la primera carta al final del mazo', seed: 'deck-nolan-start', pantallaInicio: 'S02', maxTiempo: 180,
    escenario: 'Estas son las películas de tu mazo. Recórrelas todas: guarda las que te gustaría ver y di que no a las que no, hasta terminar el mazo.',
    rutaEsperada: ['S02', 'S02.flipped', 'S02.sheet', 'S02.dim', 'S02.match', 'S02.fin'],
    pasos: [{ id: 'card.flip', etiqueta: 'Voltea una carta' }, { id: 'mark', etiqueta: 'Decide sobre una carta' }, { id: 'marks3', etiqueta: 'Decide sobre las 3 cartas' }, { id: 'screen:S02.fin', etiqueta: 'Termina el mazo' }] },
  { id: 'M2', flujo: 'F-M', titulo: 'Del cierre del mazo al siguiente mazo', seed: 'deck-finished', pantallaInicio: 'S07', maxTiempo: 150,
    escenario: 'Terminaste tu mazo. Responde lo que Kinoo te pregunte y empieza un mazo nuevo.',
    rutaEsperada: ['S07', 'S07.recibo', 'S07.ask', 'S07.feedback', 'S07.elegir', 'S07.barajar', 'S07.listo', 'S02'],
    pasos: [{ id: 'recarga.ask', etiqueta: 'Responde las preguntas' }, { id: 'recarga.elegir', etiqueta: 'Elige el siguiente mazo' }, { id: 'deck.dealt', etiqueta: 'Empieza' }] },
  { id: 'V1', flujo: 'F-V', titulo: 'Decidir qué ver y salir a verla', seed: 'ver-pool', pantallaInicio: 'S04', maxTiempo: 120,
    escenario: 'Es viernes en la noche. Usa Kinoo para decidir qué película ver y ve a verla en la plataforma que tienes.',
    rutaEsperada: ['S04', 'S04.sheet-plat', 'S04.away'],
    pasos: [{ id: 'ver.watch', etiqueta: 'Pulsa «Verla»' }, { id: 'platform.picked', etiqueta: 'Elige plataforma' }, { id: 'platform.opened', etiqueta: 'Sale a la plataforma' }] },
  { id: 'V2', flujo: 'F-V', titulo: 'De la propuesta a calificar la película', seed: 'ver-pool', pantallaInicio: 'S04', maxTiempo: 180,
    escenario: 'Es viernes en la noche. Elige una película con Kinoo, ve a verla y, cuando vuelvas a Kinoo, cuéntale qué te pareció.',
    rutaEsperada: ['S04', 'S04.sheet-plat', 'S04.away', 'S03.back', 'S03'],
    pasos: [{ id: 'ver.watch', etiqueta: 'Pulsa «Verla»' }, { id: 'platform.opened', etiqueta: 'Sale a la plataforma' }, { id: 'ver.volver', etiqueta: 'Vuelve a Kinoo' }, { id: 'ver.sawit', etiqueta: 'Dice que la vio' }, { id: 'screen=S03', etiqueta: 'Llega a calificarla' }] },
  { id: 'V3', flujo: 'F-V', titulo: 'De Ver a quitar una guardada', seed: 'ver-pool', pantallaInicio: 'S04', maxTiempo: 120,
    escenario: 'Guardaste El Faro Mudo pero ya no te interesa. Sácala de tus guardadas.',
    rutaEsperada: ['S04', 'S08'],
    pasos: [{ id: 'nav:mi-espacio', etiqueta: 'Va a Mi espacio' }, { id: 'space.removed:faro', etiqueta: 'Quita El Faro Mudo' }] },
];
/** Misiones de la ronda (las 5 primeras; M2 y V3 solo en rondas largas). */
export const MISIONES_BASE = ['D1', 'M1', 'D2', 'V2', 'V3'];
export const MISION_SEQ_SEGUIMIENTO = '¿Qué hizo difícil esta tarea?';
export const MISION_SEQ_PREGUNTA = SEQ_PREGUNTA;

// ---------- Fases ----------
export const FASES = [
  { n: 1, nombre: 'Primera impresión', bloques: ['registro', 'contexto', 'cinco-seg', 'cards'], aprox: '15 min' },
  { n: 2, nombre: 'Encontrar acciones', bloques: ['primer-clic'], aprox: '10–12 min' },
  { n: 3, nombre: 'Usar la app', bloques: ['flujos', 'ueq'], aprox: '15 min' },
  { n: 4, nombre: 'Marca y cierre', bloques: ['marca', 'cierre'], aprox: '15–20 min' },
] as const;

export const ESTADO_DE_SEED: Record<string, string> = {
  fresh: 'Sin mood, sin marcas, mazo Nolan sin repartir',
  'deck-nolan-start': 'Mazo Nolan repartido, carta 1 de frente',
  'deck-nolan-flipped': 'Mazo Nolan repartido, carta 1 volteada',
  'deck-finished': 'Mazo terminado: Recarga en cierre',
  'ver-pool': 'Marcas como en Ver.dc.html (7 ○ y 1 ◉)',
  'ver-back': 'Volviendo de la plataforma (sheet «¿La viste?»)',
  'ver-react': 'Sheet de reacción abierto',
  'mazos-en-curso': 'Mazos con un mazo en curso',
};
