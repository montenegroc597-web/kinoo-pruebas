// Catálogo de prueba (datos ficticios; pósters reales solo de las tres de Nolan). Unifica los datos de Main, Ver y Mi espacio del artefacto.
import interstellar from './assets/posters/interstellar.jpg';
import oppenheimer from './assets/posters/oppenheimer.jpg';
import darkknight from './assets/posters/darkknight.jpg';

export type DimTuple = [label: string, value: number, word: string];
export interface Film {
  id: string; title: string; director: string; min: number; genre: string; mood: 'intensa' | 'ligera'; match: number; why: string; image?: string;
  /** moods de Ver / Mi espacio (ids de MOODS_VER) */
  tags: string[];
  // —— solo películas que aparecen como carta en Descubrir ——
  hook?: string; desc?: string; dims?: DimTuple[]; verdict?: string; reason?: string; creators?: [string, string][];
  genres?: string[]; meta?: string[]; platforms?: string[]; similar?: [string, string][];
}

export const FILMS: Film[] = [
  { id: 'interstellar', title: 'Interstellar', director: 'Christopher Nolan', min: 169, genre: 'Ciencia ficción', mood: 'intensa', match: 93, image: interstellar,
    why: 'es tu match más alto y la guardaste en el último mazo de Nolan.', tags: ['escapar', 'pensar', 'cine'],
    hook: 'Un padre cruza el universo para volver.', desc: 'Un grupo de astronautas viaja más allá de nuestra galaxia en busca de un nuevo hogar para la humanidad.',
    dims: [['Ritmo', 70, 'pausado'], ['Tono', 94, 'melancólico'], ['Historia', 90, 'épica'], ['Visual', 96, 'inmenso']],
    verdict: 'muy, muy tú', reason: 'Se parece a 2 películas que marcaste como ya vistas.', creators: [],
    genres: ['Ciencia ficción', 'Drama', 'Aventura'], meta: ['2 h 49', 'Ciencia ficción', '2014'], platforms: ['Netflix'],
    similar: [['Arrival', 'Mismo tono melancólico · ciencia ficción íntima'], ['Gravity', 'Visual inmenso · supervivencia en el espacio'], ['Contact', 'Historia épica · preguntas grandes']] },
  { id: 'oppenheimer', title: 'Oppenheimer', director: 'Christopher Nolan', min: 180, genre: 'Drama', mood: 'intensa', match: 88, image: oppenheimer,
    why: 'a Ana le encantó y encaja con tu gusto por lo denso.', tags: ['pensar', 'cine', 'sufrir'],
    hook: 'Cambió el mundo. El mundo no lo perdonó.', desc: 'La historia del físico que lideró el desarrollo de la bomba atómica y de lo que vino después.',
    dims: [['Ritmo', 74, 'denso'], ['Tono', 90, 'grave'], ['Historia', 86, 'biográfica'], ['Visual', 88, 'ardiente']],
    verdict: 'bastante tú', reason: 'A Ana le encantó; a Leo y 1 creador más también.', creators: [['A', 'var(--sun)'], ['L', 'var(--sun-core)'], ['+1', 'var(--brand)']],
    genres: ['Drama', 'Historia', 'Biográfica'], meta: ['3 h 00', 'Drama', '2023'], platforms: ['Netflix'],
    similar: [['JFK', 'Historia densa · tono grave'], ['Il Postino', 'Biográfica · ritmo contenido'], ['Heat', 'Tensión sostenida · personajes en conflicto']] },
  { id: 'darkknight', title: 'The Dark Knight', director: 'Christopher Nolan', min: 152, genre: 'Acción', mood: 'intensa', match: 58, image: darkknight,
    why: 'un riesgo bonito: más acción de la usual, con la fotografía que te gusta.', tags: ['cine', 'escapar'],
    hook: 'Cuando el orden se rompe, ¿quién responde?', desc: 'Un vigilante enmascarado enfrenta a un criminal que quiere hundir Ciudad Gótica en el caos.',
    dims: [['Ritmo', 35, 'frenético'], ['Tono', 55, 'oscuro'], ['Historia', 62, 'policial'], ['Visual', 82, 'sombrío']],
    verdict: 'un riesgo bonito', reason: 'Fuera de tu zona, pero lo visual encaja con tu gusto.', creators: [],
    genres: ['Acción', 'Crimen', 'Drama'], meta: ['2 h 32', 'Acción', '2008'], platforms: ['Netflix'],
    similar: [['Heat', 'Policial · ritmo frenético'], ['Joker', 'Tono oscuro · ciudad en caos'], ['Batman Begins', 'Mismo universo visual sombrío']] },
  { id: 'ciudad', title: 'Ciudad Naranja', director: 'Lucía Ferrer', min: 114, genre: 'Animada', mood: 'ligera', match: 92,
    why: 'es la que más encaja con tu perfil y la añadiste hace 3 días.', tags: ['escapar', 'apagar'],
    hook: 'Una noche. Una ciudad entera. Ningún mapa.', desc: 'Una adolescente cruza la ciudad antes del amanecer para encontrar a alguien que la está esperando.',
    dims: [['Ritmo', 88, 'ágil'], ['Tono', 95, 'nostálgico'], ['Historia', 90, 'aventura'], ['Visual', 97, 'neón']],
    verdict: 'muy, muy tú', reason: 'A Ana, Leo y 3 creadores más que sigues les interesó.', creators: [['A', 'var(--sun)'], ['L', 'var(--sun-core)'], ['+3', 'var(--brand)']],
    genres: ['Familiar', 'Acción', 'Animada'], meta: ['Animada', '1 h 54', '2024'], platforms: ['Netflix', 'Prime Video'] },
  { id: 'faro', title: 'El Faro Mudo', director: 'Marta Ibáñez', min: 101, genre: 'Misterio', mood: 'intensa', match: 78,
    why: 'tienes ganas de algo con tensión y dura menos de dos horas.', tags: ['raro', 'pensar'],
    hook: 'Dos extraños, un faro y una tormenta que no termina.', desc: 'Atrapados por el mal tiempo, dos fareros descubren que la luz lleva años enviando mensajes.',
    dims: [['Ritmo', 62, 'pausado'], ['Tono', 84, 'inquietante'], ['Historia', 88, 'enigma'], ['Visual', 80, 'sombrío']],
    verdict: 'bastante tú', reason: 'Se parece a 2 películas que marcaste como ya vistas.', creators: [['M', 'var(--sun)'], ['+1', 'var(--sun-core)']],
    genres: ['Misterio', 'Drama', 'Suspenso'], meta: ['Misterio', '1 h 41', '2023'], platforms: ['Prime Video'] },
  { id: 'verano', title: 'Último Verano', director: 'Marta Ibáñez', min: 102, genre: 'Drama', mood: 'intensa', match: 64,
    why: 'la marcaste para repetir y a creadores que sigues les encantó.', tags: ['sufrir', 'sentir'],
    hook: 'El verano en que todo cambió sin que nadie lo dijera.', desc: 'Unas vacaciones de playa entre padre e hija, recordadas veinte años después.',
    dims: [['Ritmo', 40, 'lento'], ['Tono', 82, 'melancólico'], ['Historia', 70, 'íntima'], ['Visual', 76, 'cálido']],
    verdict: 'un riesgo bonito', reason: 'Fuera de tu zona, pero el tono encaja con lo que viste esta semana.', creators: [['S', 'var(--sun-core)']],
    genres: ['Drama', 'Íntima', 'Lenta'], meta: ['Drama', '1 h 42', '2022'], platforms: ['Netflix', 'Prime Video'] },
  { id: 'marea', title: 'Marea Lenta', director: 'Lucía Ferrer', min: 88, genre: 'Comedia', mood: 'ligera', match: 85, why: 'corta, cálida y fácil de ver sin pensar demasiado.', tags: ['apagar', 'reir'] },
  { id: 'feria', title: 'Noche de Feria', director: 'Marta Ibáñez', min: 95, genre: 'Romance', mood: 'ligera', match: 81, why: 'perfecta para ver acompañado: ligera y con buen ritmo.', tags: ['sentir', 'reir'] },
  { id: 'vecinos', title: 'Vecinos de Siempre', director: 'Lucía Ferrer', min: 92, genre: 'Comedia', mood: 'ligera', match: 80, why: 'comedia coral para reírse sin complicarse.', tags: ['reir', 'apagar'] },
];
export const filmById = (id: string): Film | undefined => FILMS.find((f) => f.id === id);
export const DECK_NOLAN = ['interstellar', 'oppenheimer', 'darkknight'];
export const DECK_OTHER = ['ciudad', 'faro', 'verano'];

export const MOODS = [
  { id: 'apagar', label: 'Apagar el cerebro', quote: 'Hoy no hay examen: solo tú, el sofá y una historia fácil de querer.', source: 'Marea Lenta', tags: ['Ligera', 'Ritmo ágil', 'Familiar'], blurb: 'Nada de pensar, solo mirar.', prev: 'Sentir algo' },
  { id: 'sufrir', label: 'Sufrir bonito', quote: 'Duele porque te importa. Eso también es una forma de sentirte vivo.', source: 'Último Verano', tags: ['Drama', 'Tono intenso', 'Finales que pesan'], blurb: 'Quiero que me duela rico.', prev: 'Apagar el cerebro' },
  { id: 'escapar', label: 'Escapar un rato', quote: 'La salida de emergencia también puede tener palomitas.', source: 'Ciudad Naranja', tags: ['Fantasía', 'Mundos nuevos', 'Evasión'], blurb: 'Sácame de aquí.', prev: 'Salir pensando' },
  { id: 'sentir', label: 'Sentir algo', quote: 'No busques entenderla. Déjala que te encuentre primero.', source: 'Noche de Feria', tags: ['Emotiva', 'Cercana', 'Personajes'], blurb: 'Lo que sea, pero real.', prev: 'Solo reírme' },
  { id: 'pensar', label: 'Salir pensando', quote: 'Las mejores respuestas llegan dos días después de los créditos.', source: 'El Faro Mudo', tags: ['Cine de autor', 'Final abierto', 'Denso'], blurb: 'Dame algo para masticar.', prev: 'Escapar un rato' },
  { id: 'reir', label: 'Solo reírme', quote: 'Reírte también es una manera seria de pasarla bien.', source: 'Vecinos de Siempre', tags: ['Comedia', 'Ligera', 'Para compartir'], blurb: 'Cero drama, mucha risa.', prev: 'Sufrir bonito' },
  { id: 'raro', label: 'Algo raro', quote: 'Lo mejor del cine raro es que nunca sabes qué estás por ver.', source: 'Insectario', tags: ['Culto', 'Visual', 'Fuera de lo común'], blurb: 'Sorpréndeme de verdad.', prev: 'Cine. Del bueno.' },
  { id: 'cine', label: 'Cine. Del bueno.', quote: 'Hay noches que piden pantalla grande, aunque la pantalla sea la de tu casa.', source: 'Último Rollo', tags: ['Premiada', 'Visual', 'Ambiciosa'], blurb: 'Algo grande, de verdad.', prev: 'Algo raro' },
] as const;
export type MoodItem = (typeof MOODS)[number];
export const MOOD_PREV_DEFAULT = 'Sentir algo';

/** Tira de moods de Ver (incluye "Todas"). [id, etiqueta corta, "para …"] */
export const MOODS_VER: [string, string, string][] = [['todo', 'Todas', 'esta noche'], ['apagar', 'Apagar', 'apagar el cerebro'], ['sufrir', 'Sufrir', 'sufrir bonito'], ['escapar', 'Escapar', 'escapar un rato'], ['sentir', 'Sentir', 'sentir algo'], ['pensar', 'Pensar', 'salir pensando'], ['reir', 'Reír', 'solo reírte'], ['raro', 'Raro', 'algo raro'], ['cine', 'Del bueno', 'cine del bueno']];
export const MOODS_VER_ARIA: Record<string, string> = { todo: 'Todas', apagar: 'Apagar el cerebro', sufrir: 'Sufrir bonito', escapar: 'Escapar un rato', sentir: 'Sentir algo', pensar: 'Salir pensando', reir: 'Solo reírme', raro: 'Algo raro', cine: 'Cine del bueno' };

export type MarcaFilm = 'ring' | 'dot' | 'both' | 'x';
/** Marcas iniciales de Ver (idénticas a Ver.dc.html). */
export const MARCAS_VER_POOL: Record<string, MarcaFilm> = { interstellar: 'ring', oppenheimer: 'ring', darkknight: 'ring', ciudad: 'ring', marea: 'ring', faro: 'ring', feria: 'ring', verano: 'both', vecinos: 'dot' };

export const DIM_INFO: Record<string, { short: string; area?: string; kicker: string; bg: string; ink: string; meaning: string; scale: string[] }> = {
  Ritmo: { short: 'ritmo', kicker: 'qué es el ritmo', bg: 'var(--brand)', ink: '#F4E7D0', meaning: 'Qué tan rápido se mueve la película: cuánto pasa en cada escena y cuánto espacio deja para respirar.', scale: ['pausado', 'denso', 'ágil', 'frenético'] },
  Tono: { short: 'tono', kicker: 'qué es el tono', bg: 'var(--cine-red)', ink: '#F4E7D0', meaning: 'La emoción que te deja en el cuerpo: cómo te sientes mientras la ves y cuando salen los créditos.', scale: ['melancólico', 'nostálgico', 'oscuro', 'cálido'] },
  Historia: { short: 'historia', kicker: 'qué es la historia', bg: 'var(--sun)', ink: '#1A1411', meaning: 'De qué va y a qué escala: qué está en juego y cómo te lo cuentan.', scale: ['épica', 'íntima', 'enigma', 'policial'] },
  Visual: { short: 'verse', area: 'lo visual', kicker: 'qué es lo visual', bg: 'var(--brand-deep)', ink: '#F4E7D0', meaning: 'Cómo se ve: la fotografía, la luz, el color y el tamaño de sus imágenes.', scale: ['inmenso', 'neón', 'ardiente', 'sombrío'] },
};
export const WORD_INFO: Record<string, string> = {
  pausado: 'escenas que se toman su tiempo; la historia respira entre momento y momento.', lento: 'va despacio a propósito: la calma es parte de la experiencia.',
  denso: 'pasa mucho en cada escena; pide tu atención completa.', ágil: 'se mueve rápido sin atropellarse; difícil aburrirse.', frenético: 'acción constante, cortes rápidos y casi sin pausas.',
  melancólico: 'deja una tristeza bonita, de esas que se quedan contigo.', grave: 'seria y con peso; no busca aliviarte.', oscuro: 'ambiente sombrío y personajes moralmente grises.',
  nostálgico: 'te lleva a recuerdos y a lo que ya pasó, con cariño.', inquietante: 'hay algo que no encaja y te mantiene en tensión.', cálido: 'se siente acogedora, como una manta.',
  épica: 'mucho en juego y a gran escala: el destino de muchos depende de pocos.', biográfica: 'basada en la vida de alguien real.', policial: 'crímenes, pistas y alguien que intenta resolverlos.',
  aventura: 'un viaje lleno de descubrimientos y mundos nuevos.', enigma: 'un misterio que se arma pieza a pieza.', íntima: 'pocos personajes y emociones vistas de cerca.',
  inmenso: 'paisajes y escalas enormes, para disfrutar en pantalla grande.', ardiente: 'colores cálidos e intensos, luz de fuego.', sombrío: 'mucha sombra y contraste: la luz también cuenta la historia.', neón: 'luces de color vibrante, ciudad de noche.',
};

export const PLATAFORMAS = [
  { name: 'Netflix', tag: 'En tu suscripción', sub: true },
  { name: 'Prime Video', tag: 'En tu suscripción', sub: true },
  { name: 'Alquiler', tag: 'Alquiler · $ 12.900', sub: false },
];
export const REACCIONES: [string, string, string, number][] = [['meh', 'No era para mí', 'var(--line-strong)', 13], ['ok', 'Estuvo bien', 'var(--sun)', 9], ['love', 'Me encantó', 'var(--brand)', 4]];
export const REACCION_TAGS: Record<string, string[]> = {
  meh: ['Muy lenta', 'Final flojo', 'No conecté', 'Tono equivocado'],
  ok: ['Buen ritmo', 'Entretenida', 'Bien actuada', 'Visualmente linda'],
  love: ['Me emocionó', 'Final increíble', 'Me dejó pensando', 'Para verla acompañado'],
};

// ---- Mazos ----
export const HERO_BY_MOOD: Record<string, { name: string; desc: string; tone: string; ring: string }> = {
  apagar: { name: 'Ligeras y fáciles de querer', desc: 'Porque hoy no quieres pensar: ritmo ágil, final feliz, cero vueltas.', tone: 'var(--brand)', ring: 'var(--sun)' },
  sufrir: { name: 'Dramas que valen la pena', desc: 'Porque hoy el corazón quiere algo que le pese un poco.', tone: 'var(--cine-red)', ring: 'var(--sun)' },
  escapar: { name: 'Mundos para perderte', desc: 'Porque hoy no quieres estar aquí: fantasía, aventura, otro lugar.', tone: 'var(--sun)', ring: 'var(--brand)' },
  sentir: { name: 'Historias que se sienten cerca', desc: 'Porque hoy buscas algo que te toque, no solo que te entretenga.', tone: 'var(--brand)', ring: 'var(--sun)' },
  pensar: { name: 'Para salir pensando', desc: 'Porque hoy quieres una pregunta, no solo una historia.', tone: 'var(--cine-red)', ring: 'var(--sun)' },
  reir: { name: 'Para no complicarse la vida', desc: 'Porque hoy el plan es reírse, sin vueltas ni dramas.', tone: 'var(--sun)', ring: 'var(--brand)' },
  raro: { name: 'Lo raro que vale la pena', desc: 'Porque hoy quieres algo que no viste venir.', tone: 'var(--cine-red)', ring: 'var(--sun)' },
  cine: { name: 'Cine. Del bueno.', desc: 'Porque hoy mereces algo grande, aunque la pantalla sea la de tu casa.', tone: 'var(--brand)', ring: 'var(--sun)' },
};
export const HERO_DEFAULT = { name: 'Lentas y melancólicas', desc: 'Ritmo pausado, finales que se quedan contigo. Es el tono que más guardaste este mes.', tone: 'var(--brand)', ring: 'var(--sun)' };
export interface OtroMazo { id: string; back: 'mood' | 'hilo' | 'creadores'; short: string; kicker: string; name: string; desc: string; tone: string; ring: string; signed?: string; note?: string }
export const OTHER_DECKS: OtroMazo[] = [
  { id: 'nolan', back: 'hilo', short: 'Nolan', kicker: 'Hilo', name: 'Sigue a Christopher Nolan', desc: 'Porque marcaste Interstellar con ○: su obra y las películas que lo inspiraron.', tone: 'var(--sun)', ring: 'var(--brand)' },
  { id: 'creadores', back: 'creadores', short: 'Ana y Leo', kicker: 'Creadores', name: 'Lo que guardaron Ana y Leo', desc: 'Las ○ más recientes de creadores que sigues y que tú aún no has visto, con su nota en cada una.', tone: 'var(--cine-red)', ring: 'var(--sun)', signed: 'Ana', note: 'Para ver con la luz baja.' },
];
export const MYSTERY_OPTIONS = [
  { id: 'fuera', name: 'Fuera de tu género', premise: 'Un mazo con el tono que más te gusta, pero en un género que casi no tocas.' },
  { id: 'creadores2', name: 'Lo que aman tus creadores', premise: 'Tres películas fuera de tu zona segura que tus creadores seguidos adoran.' },
  { id: 'curva', name: 'Curva sorpresa', premise: 'La armamos nosotros con tu gusto de base: no sabrás qué sigue.' },
];

// ---- Recarga ----
export const RC_MOODS = [
  { id: 'melancolica', label: 'Melancólica', deck: 'Lentas y melancólicas', short: 'Lentas', desc: 'Ritmo pausado, finales que se quedan contigo.' },
  { id: 'ligera', label: 'Ligera', deck: 'Ligeras para soltar', short: 'Ligeras', desc: 'Corta, cálida y fácil de ver sin pensar demasiado.' },
  { id: 'tensa', label: 'Tensa', deck: 'Tensión a fuego lento', short: 'Tensión', desc: 'Suspenso sin sustos baratos, que se cocina despacio.' },
  { id: 'epica', label: 'Épica', deck: 'Épicas para perderse', short: 'Épicas', desc: 'Historias grandes, con escala y con peso.' },
  { id: 'rara', label: 'Rara', deck: 'Raras y fascinantes', short: 'Raras', desc: 'Premisas que no se parecen a nada que hayas visto.' },
  { id: 'calida', label: 'Cálida', deck: 'Cálidas, para abrazar', short: 'Cálidas', desc: 'Para ver acompañado y salir de mejor humor.' },
];
export const RC_ASKS: Record<string, { step: number; kicker: string; title: string; hint: string; cols: string; h: number; opts: { id: string; label: string; sub?: string }[]; key: 'mood' | 'nolan' | 'noir' }> = {
  mood: { step: 0, kicker: 'una cosa rápida', title: '¿Qué vibra traes hoy?', hint: 'Sin pensarlo mucho: tu respuesta ajusta los mazos de hoy.', cols: 'repeat(2, minmax(0, 1fr))', h: 74, opts: RC_MOODS.map((m) => ({ id: m.id, label: m.label })), key: 'mood' },
  hilo: { step: 1, kicker: 'tu hilo de hoy', title: '¿Te quedaste con ganas de más Nolan?', hint: 'Hoy guardaste 3 películas suyas en este mazo.', cols: '1fr', h: 70, opts: [{ id: 'mas', label: 'Sí, quiero más', sub: 'Un mazo con su obra' }, { id: 'parecido', label: 'Algo parecido', sub: 'Otras manos, el mismo pulso' }, { id: 'menos', label: 'Ya fue suficiente', sub: 'Lo dejamos descansar' }], key: 'nolan' },
  noir: { step: 2, kicker: 'una curiosidad', title: '¿Eres de cine negro?', hint: 'Dos de tus guardadas tienen ese aire.', cols: '1fr', h: 64, opts: [{ id: 'si', label: 'Me encanta' }, { id: 'depende', label: 'Depende del día' }, { id: 'no', label: 'No es lo mío' }], key: 'noir' },
};
export const RC_ORDER = ['mood', 'hilo', 'noir'] as const;
