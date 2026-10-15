// «Config» del estudio (hoja Config del Excel v2.0, secciones A–G): lo que el equipo define antes de lanzar el link.
// Se edita en Panel → Estudio y se publica en Supabase (versionado, como los textos). La app de prueba lo aplica al arrancar
// y lo fija en la sesión: una persona responde siempre con la misma configuración.
// Aquí están los valores iniciales: los moods y las películas salen del prototipo «Kinoo · Prueba Maze · Flujo»; los distractores
// son una propuesta para revisar y lo que el protocolo deja «(definir)» aparece en Panel → Estudio como pendiente.
import { UMBRALES, type Umbrales } from './catalog';
import type { Variante } from './schema';

/** Una pantalla del prototipo: página .dc.html y, si hace falta, acciones para llegar al estado que se muestra. */
export interface PantallaProto {
  pagina: string;
  /** pasos que embed.js ejecuta al abrir: tocar el elemento cuyo texto es `click` (hasta que aparezca `hasta`, máx. `max` veces) */
  acciones?: { click: string; hasta?: string; max?: number }[];
  /** elemento a resaltar o medir: selector CSS (se unen todos los que coinciden) o texto visible */
  marca?: { selector?: string; texto?: string };
}

export interface MoodCfg { nombre: string; definicion: string; objetivo: string; cercano: string; opuesto: string; neutra: string }
export interface PeliculaCfg { titulo: string; director: string; sinopsis: string; poster?: string }
export interface PeliculaM3d { titulo: string; moodPrevisto: string }

export interface Estudio {
  /** A. Variantes de la card: qué cambia y qué pantalla del prototipo muestra cada una */
  variantes: Record<Variante, { descripcion: string; pantalla: PantallaProto }>;
  /** B. Respuestas esperadas (para codificar y clasificar) */
  claves: {
    gestoMeInteresa: { correcto: string; aceptables: string[] };
    gestoNoMeInteresa: { correcto: string; aceptables: string[] };
    D1b: string; D2bD3b: string; D4a: string; V1a: string; V1cV1d: string;
    V2objetivo: string; V2cercano: string;
  };
  /** Pantallas del prototipo para cada momento de la prueba */
  pantallas: { resumen: PantallaProto; ver: PantallaProto; filtro: PantallaProto; recomendacion: PantallaProto; mazos: PantallaProto; zonaZ3: PantallaProto };
  /** C. Moods del filtro (hasta 10) */
  moods: MoodCfg[];
  /** Catálogo de películas que aparecen en M3c y M3d (título → póster y sinopsis) */
  peliculas: PeliculaCfg[];
  /** D. Películas para asociar a una categoría (M3d) */
  peliculasM3d: PeliculaM3d[];
  /** E. Mazos */
  mazos: { ideas: string[]; frases: { texto: string; correcta: 'Verdadero' | 'Falso' }[]; z4: { texto: string; correcta: boolean }[] };
  /** F. Elementos de la card y si son prioritarios (codificación de D1a) */
  elementosCard: { elemento: string; prioritario: boolean }[];
  /** G. Umbrales (se aplican sobre UMBRALES) */
  umbrales: Umbrales;
}

/** Prototipo del estudio (packages/kinoo-ui/public/kinoo-flujo, importado del lienzo «Kinoo Descubrir», página «Prueba Maze · Flujo»). */
export const PROTOTIPO_ESTUDIO = 'kinoo-flujo';

export const ESTUDIO_DEFECTO: Estudio = {
  variantes: {
    A: { descripcion: 'Card actual del prototipo (Descubrir, carta 1 de 10)', pantalla: { pagina: 'Flujo1_Descubrir.dc.html' } },
    B: { descripcion: '(definir: qué cambia respecto a A; mientras tanto muestra la misma card)', pantalla: { pagina: 'Flujo1_Descubrir.dc.html' } },
  },
  claves: {
    gestoMeInteresa: { correcto: 'derecha', aceptables: ['Quiero verla'] },
    gestoNoMeInteresa: { correcto: 'izquierda', aceptables: ['No me interesa'] },
    D1b: 'Descubrir películas y marcar las que te interesan',
    D2bD3b: '«Me interesa»: la película pasa a la lista de interés. «No me interesa»: se descarta',
    D4a: '(definir) Propuesta: entiende que el resumen describe los temas que se repiten en las películas que eligió en el mazo, no su personalidad',
    V1a: 'Decidir qué ver hoy según cómo te sientes',
    V1cV1d: 'Es para elegir qué ver según cómo me siento; al moverlo cambian las películas que propone',
    // no puede ser el mood que el prototipo trae seleccionado al abrir («Sufrir bonito»): se acertaría sin hacer nada
    V2objetivo: 'Solo reírme',
    V2cercano: 'Apagar el cerebro',
  },
  pantallas: {
    // D4: la persona completa el mazo de su card; la tarea se cumple al llegar a esta página («Ver cómo te fue»)
    resumen: { pagina: 'Flujo2_Resumen.dc.html' },
    ver: { pagina: 'FlujoV1_Feed.dc.html' },
    filtro: { pagina: 'FlujoV1_Feed.dc.html', marca: { selector: 'button[aria-pressed]' } },
    recomendacion: { pagina: 'FlujoV1_Feed.dc.html' },
    mazos: { pagina: 'Flujo4_Eleccion.dc.html' },
    zonaZ3: { pagina: 'Flujo4_Eleccion.dc.html', marca: { texto: 'MOOD · 10 CARTAS' } },
  },
  moods: [
    { nombre: 'Apagar el cerebro', definicion: '(definir)', objetivo: 'Mad Max: Furia', cercano: 'Entre navajas', opuesto: 'Aftersun', neutra: 'Oppenheimer' },
    { nombre: 'Sufrir bonito', definicion: '(definir)', objetivo: 'Vidas pasadas', cercano: 'Eterno resplandor', opuesto: 'Entre navajas', neutra: 'Mad Max: Furia' },
    { nombre: 'Escapar un rato', definicion: '(definir)', objetivo: 'Coco', cercano: 'La La Land', opuesto: 'Oppenheimer', neutra: 'Smile' },
    { nombre: 'Sentir algo', definicion: '(definir)', objetivo: 'Aftersun', cercano: 'Vidas pasadas', opuesto: 'Mad Max: Furia', neutra: 'Entre navajas' },
    { nombre: 'Salir pensando', definicion: '(definir)', objetivo: 'La llegada', cercano: 'Oppenheimer', opuesto: 'Entre navajas', neutra: 'Coco' },
    { nombre: 'Solo reírme', definicion: '(definir)', objetivo: 'Entre navajas', cercano: 'Todo en todas partes', opuesto: 'Aftersun', neutra: 'Interstellar' },
    { nombre: 'Algo raro', definicion: '(definir)', objetivo: 'Todo en todas partes', cercano: 'Eterno resplandor', opuesto: 'Coco', neutra: 'The Dark Knight' },
    { nombre: 'Cine del bueno', definicion: '(definir)', objetivo: 'Parásitos', cercano: 'Oppenheimer', opuesto: 'Coco', neutra: 'La La Land' },
  ],
  peliculas: [
    { titulo: 'Interstellar', director: 'Christopher Nolan', sinopsis: 'Un grupo de astronautas cruza un agujero de gusano para buscar un nuevo hogar para la humanidad.', poster: '8d36ec8e6ab2e36a214159e1cc93d1c6.jpg' },
    { titulo: 'Vidas pasadas', director: 'Celine Song', sinopsis: 'Dos amigos de la infancia se reencuentran en Nueva York veinte años después.' },
    { titulo: 'La llegada', director: 'Denis Villeneuve', sinopsis: 'Una lingüista intenta comunicarse con unos extraterrestres que acaban de llegar a la Tierra.' },
    { titulo: 'Aftersun', director: 'Charlotte Wells', sinopsis: 'Una mujer recuerda las vacaciones que pasó con su padre cuando tenía once años.' },
    { titulo: 'Eterno resplandor', director: 'Michel Gondry', sinopsis: 'Después de una ruptura, un hombre decide borrar a su ex de la memoria.' },
    { titulo: 'Oppenheimer', director: 'Christopher Nolan', sinopsis: 'La historia del físico que dirigió la creación de la bomba atómica.', poster: '1632e88b436a4b0f52ce128f48b74984.jpg' },
    { titulo: 'The Dark Knight', director: 'Christopher Nolan', sinopsis: 'Batman se enfrenta al Joker, que quiere hundir a Gotham en el caos.', poster: 'afe4882e107c9f765350409c23f76f18.jpg' },
    { titulo: 'Todo en todas partes', director: 'Daniels', sinopsis: 'La dueña de una lavandería descubre que puede saltar entre universos para salvar el multiverso.' },
    { titulo: 'Mad Max: Furia', director: 'George Miller', sinopsis: 'En un desierto postapocalíptico, una guerrera huye de un tirano en una persecución sin pausa.' },
    { titulo: 'Parásitos', director: 'Bong Joon-ho', sinopsis: 'Una familia pobre se infiltra, uno a uno, en la casa de una familia rica.' },
    { titulo: 'La La Land', director: 'Damien Chazelle', sinopsis: 'Una actriz y un pianista se enamoran mientras persiguen sus sueños en Los Ángeles.', poster: '47a12c3c151f8da9df8a65897c8a3b7b.jpg' },
    { titulo: 'Coco', director: 'Lee Unkrich', sinopsis: 'Un niño que sueña con ser músico viaja a la Tierra de los Muertos.', poster: 'poster-coco.jpg' },
    { titulo: 'Hereditary', director: 'Ari Aster', sinopsis: 'Tras la muerte de la abuela, una familia empieza a descubrir secretos aterradores.' },
    { titulo: 'Entre navajas', director: 'Rian Johnson', sinopsis: 'Un detective investiga la muerte de un escritor rico en medio de su excéntrica familia.' },
    { titulo: 'Titanic', director: 'James Cameron', sinopsis: 'Dos jóvenes de mundos distintos se enamoran a bordo de un barco condenado.', poster: 'poster-titanic.jpg' },
    { titulo: 'Supercool', director: 'Greg Mottola', sinopsis: 'Dos amigos intentan conseguir alcohol para una fiesta antes de graduarse.' },
    { titulo: 'El origen', director: 'Christopher Nolan', sinopsis: 'Un ladrón entra en los sueños de las personas para robar o plantar ideas.' },
    { titulo: 'Rápidos y furiosos', director: 'Rob Cohen', sinopsis: 'Un policía se infiltra en el mundo de las carreras callejeras de Los Ángeles.' },
    { titulo: 'Her', director: 'Spike Jonze', sinopsis: 'Un hombre solitario se enamora de un sistema operativo con voz propia.', poster: 'poster-her.jpg' },
    // pósters de Recursos/Peliculas (reducidos a 360 px de ancho)
    { titulo: '¿Qué pasó ayer?', director: 'Todd Phillips', sinopsis: 'Tres amigos despiertan en Las Vegas sin recordar la noche anterior y con el novio desaparecido.', poster: 'poster-que-paso-ayer.jpg' },
    { titulo: 'Matrix', director: 'Lana y Lilly Wachowski', sinopsis: 'Un programador descubre que el mundo en el que vive es una simulación controlada por máquinas.', poster: 'poster-matrix.jpg' },
    { titulo: 'Terminator', director: 'James Cameron', sinopsis: 'Un cyborg viaja desde el futuro para matar a la mujer cuyo hijo liderará la resistencia humana.', poster: 'poster-terminator.jpg' },
    { titulo: 'Rocky', director: 'John G. Avildsen', sinopsis: 'Un boxeador de barrio sin futuro recibe la oportunidad de pelear por el título mundial.', poster: 'poster-rocky.jpg' },
    { titulo: 'Smile', director: 'Parker Finn', sinopsis: 'Una psiquiatra empieza a vivir sucesos aterradores después de presenciar un hecho traumático con una paciente.', poster: 'poster-smile.jpg' },
    { titulo: 'Superman', director: 'James Gunn', sinopsis: 'El último hijo de Krypton intenta equilibrar su herencia alienígena con su vida humana en Metrópolis.', poster: 'poster-superman.jpg' },
    { titulo: 'Proyecto Hail Mary', director: 'Phil Lord y Christopher Miller', sinopsis: 'Un profesor de ciencias despierta solo en una nave espacial, sin memoria, con la misión de salvar la Tierra.', poster: 'poster-hail-mary.jpg' },
  ],
  peliculasM3d: [
    { titulo: 'Titanic', moodPrevisto: 'Sufrir bonito' },
    { titulo: '¿Qué pasó ayer?', moodPrevisto: 'Solo reírme' },
    { titulo: 'Matrix', moodPrevisto: 'Salir pensando' },
    { titulo: 'Terminator', moodPrevisto: 'Apagar el cerebro' },
    { titulo: 'Rocky', moodPrevisto: 'Sentir algo' },
    { titulo: 'Her', moodPrevisto: 'Algo raro' },
  ],
  mazos: {
    ideas: ['Sirve para filtrar el contenido según mis gustos', 'Controla cuánto contenido me aparece', 'Se puede cambiar o tener varios', 'Agrupa mis intereses'],
    frases: [
      { texto: 'Un mazo sirve para filtrar lo que me aparece según mis gustos.', correcta: 'Verdadero' },
      { texto: 'Un mazo define cuánto contenido me aparece.', correcta: 'Verdadero' },
      { texto: 'Un mazo es una lista de películas que guardé para verlas después.', correcta: 'Falso' },
      { texto: 'Un mazo solo sirve para películas que ya vi.', correcta: 'Falso' },
    ],
    z4: [
      { texto: 'Veré menos películas, más ajustadas a mis gustos', correcta: true },
      { texto: 'Veré las mismas películas de siempre', correcta: false },
      { texto: 'Veré todas las películas del catálogo', correcta: false },
      { texto: 'No sé', correcta: false },
    ],
  },
  elementosCard: [
    { elemento: 'Póster', prioritario: true }, { elemento: 'Título', prioritario: true }, { elemento: 'Indicadores del card', prioritario: false },
    { elemento: 'Información de la película', prioritario: false }, { elemento: 'Gesto de swipe / acciones', prioritario: false }, { elemento: 'Otro', prioritario: false },
  ],
  umbrales: { ...UMBRALES },
};

// ---------------------------------------------------------------- estado activo
let activo: Estudio = clonar(ESTUDIO_DEFECTO);
function clonar<T>(x: T): T { return JSON.parse(JSON.stringify(x)) as T; }

/** La configuración con la que corre la app (o el Panel). */
export const estudio = (): Estudio => activo;

/** Una configuración guardada (de Supabase) se completa con los valores por defecto: una versión vieja no rompe la app. */
export function completarEstudio(parcial: Partial<Estudio> | null | undefined): Estudio {
  const d = clonar(ESTUDIO_DEFECTO);
  if (!parcial) return d;
  return {
    variantes: { A: { ...d.variantes.A, ...parcial.variantes?.A }, B: { ...d.variantes.B, ...parcial.variantes?.B } },
    claves: { ...d.claves, ...parcial.claves },
    pantallas: { ...d.pantallas, ...parcial.pantallas },
    moods: parcial.moods?.length ? parcial.moods : d.moods,
    peliculas: parcial.peliculas?.length ? parcial.peliculas : d.peliculas,
    peliculasM3d: parcial.peliculasM3d?.length ? parcial.peliculasM3d : d.peliculasM3d,
    mazos: { ...d.mazos, ...parcial.mazos },
    elementosCard: parcial.elementosCard?.length ? parcial.elementosCard : d.elementosCard,
    umbrales: { ...d.umbrales, ...parcial.umbrales },
  };
}

/** Aplica una configuración publicada: reemplaza la activa y los umbrales que usan las fórmulas. */
export function aplicarEstudio(parcial: Partial<Estudio> | null | undefined): Estudio {
  activo = completarEstudio(parcial);
  Object.assign(UMBRALES, activo.umbrales);
  return activo;
}

export interface ErrorEstudio { campo: string; error: string }
/** Revisa que la configuración se pueda usar en una prueba (lo que el protocolo exige antes de lanzar). */
export function validarEstudio(e: Estudio): ErrorEstudio[] {
  const err: ErrorEstudio[] = [];
  const titulos = new Set(e.peliculas.map((p) => p.titulo));
  const nombres = e.moods.map((m) => m.nombre.trim());
  if (e.moods.length < 2 || e.moods.length > 10) err.push({ campo: 'moods', error: 'Entre 2 y 10 moods' });
  if (new Set(nombres).size !== nombres.length) err.push({ campo: 'moods', error: 'Hay moods con el mismo nombre' });
  e.moods.forEach((m, i) => {
    if (!m.nombre.trim()) err.push({ campo: `moods.${i}`, error: 'Falta el nombre' });
    const pelis = [m.objetivo, m.cercano, m.opuesto, m.neutra];
    if (new Set(pelis).size !== 4) err.push({ campo: `moods.${i}`, error: `«${m.nombre}»: la película objetivo y los 3 distractores deben ser distintos` });
    pelis.filter((p) => !titulos.has(p)).forEach((p) => err.push({ campo: `moods.${i}`, error: `«${p}» no está en el catálogo de películas` }));
  });
  const deM3c = new Set(e.moods.flatMap((m) => [m.objetivo, m.cercano, m.opuesto, m.neutra]));
  if (e.peliculasM3d.length < 4 || e.peliculasM3d.length > 6) err.push({ campo: 'peliculasM3d', error: 'M3d lleva de 4 a 6 películas' });
  e.peliculasM3d.forEach((p, i) => {
    if (!titulos.has(p.titulo)) err.push({ campo: `peliculasM3d.${i}`, error: `«${p.titulo}» no está en el catálogo de películas` });
    if (deM3c.has(p.titulo)) err.push({ campo: `peliculasM3d.${i}`, error: `«${p.titulo}» ya sale en M3c: usa películas distintas` });
    if (!nombres.includes(p.moodPrevisto)) err.push({ campo: `peliculasM3d.${i}`, error: `El mood previsto «${p.moodPrevisto}» no existe` });
  });
  if (!nombres.includes(e.claves.V2objetivo)) err.push({ campo: 'claves.V2objetivo', error: 'El mood objetivo de V2 no está en la lista de moods' });
  if (e.mazos.ideas.length !== 4 || e.mazos.frases.length !== 4 || e.mazos.z4.length !== 4) err.push({ campo: 'mazos', error: 'Mazos: 4 ideas, 4 frases y 4 opciones de Z4' });
  if (e.mazos.z4.filter((o) => o.correcta).length !== 1) err.push({ campo: 'mazos.z4', error: 'Z4 debe tener exactamente una opción correcta' });
  return err;
}

/** Pendientes del equipo (no bloquean, pero el Panel los muestra antes de lanzar). */
export const pendientesEstudio = (e: Estudio): string[] =>
  [
    ...e.moods.filter((m) => /\(definir\)/.test(m.definicion)).map((m) => `Definición del mood «${m.nombre}»`),
    ...Object.entries(e.claves).filter(([, v]) => typeof v === 'string' && /\(definir/.test(v)).map(([k]) => `Clave de corrección ${k}`),
    ...(/\(definir/.test(e.variantes.B.descripcion) ? ['Qué cambia en la card B'] : []),
  ];

/** Versión de la configuración: «inicial» si no hay nada publicado. */
export interface VersionEstudio { version: string; estudio: Partial<Estudio>; publicado?: string; nota?: string }
export const VERSION_ESTUDIO_INICIAL = 'inicial';
export const peliculaDe = (titulo: string): PeliculaCfg | undefined => activo.peliculas.find((p) => p.titulo === titulo);
