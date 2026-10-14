// Textos editables del protocolo. Cada texto que se le lee o muestra al participante se registra aquí con una clave estable
// ("marca.M1", "tareas.T3.escenario"…). El valor por defecto es el texto EXACTO del protocolo; el Panel puede publicar otra
// redacción (versionada en Supabase) y la app de prueba la aplica al arrancar con `aplicarTextos`.
// Lo que NO se edita desde el Panel (claves, opciones de respuesta, columnas, métricas) cambia en código: ver el skill kinoo-protocolo.

export interface CampoTexto {
  clave: string;
  /** 0 = registro y consentimiento; 1–4 = fases de la sesión */
  fase: number;
  prueba: string;
  defecto: string;
}

export interface Meta { fase: number; prueba: string }

const campos = new Map<string, CampoTexto>();
let activos: Record<string, string> = {};

const registrar = (clave: string, meta: Meta, defecto: string) => {
  if (campos.has(clave)) throw new Error(`Texto duplicado: ${clave}`);
  campos.set(clave, { clave, fase: meta.fase, prueba: meta.prueba, defecto });
};
const leer = (clave: string): string => activos[clave] ?? campos.get(clave)!.defecto;

/** Grupo de textos editables: devuelve un objeto cuyas propiedades leen siempre la redacción activa. */
export function editable<T extends Record<string, string>>(prefijo: string, meta: Meta, defectos: T): Readonly<T> {
  const o = {} as T;
  for (const [k, v] of Object.entries(defectos)) {
    const clave = `${prefijo}.${k}`;
    registrar(clave, meta, v);
    Object.defineProperty(o, k, { get: () => leer(clave), enumerable: true });
  }
  return Object.freeze(o);
}

/** Hace editable una propiedad de texto de un objeto del catálogo (p. ej. el escenario de una tarea). */
export function editableEn<T extends object>(obj: T, campo: keyof T & string, clave: string, meta: Meta): T {
  registrar(clave, meta, String(obj[campo]));
  Object.defineProperty(obj, campo, { get: () => leer(clave), enumerable: true });
  return obj;
}

/** Todos los textos editables, en el orden en que aparecen en la sesión. */
export const camposTexto = (): CampoTexto[] => [...campos.values()].sort((a, b) => a.fase - b.fase);

// ---------- Validación: lo que el Panel puede cambiar sin romper el protocolo ----------
export const MAX_TEXTO = 700;
/** Marcadores que la app reemplaza al mostrar el texto; si el original los tiene, la nueva redacción también. */
const MARCADORES = /\{[a-z]+\}/g;

export interface ErrorTexto { clave: string; error: string }

/** Revisa una redacción propuesta: claves conocidas, sin vacíos, longitud, marcadores y anclas de la escala 1–7. */
export function validarTextos(propuesta: Record<string, string>): ErrorTexto[] {
  const errores: ErrorTexto[] = [];
  for (const [clave, valor] of Object.entries(propuesta)) {
    const c = campos.get(clave);
    if (!c) { errores.push({ clave, error: 'Esta clave no existe en el protocolo' }); continue; }
    const v = String(valor ?? '').trim();
    if (!v) { errores.push({ clave, error: 'No puede quedar vacío' }); continue; }
    if (v.length > MAX_TEXTO) errores.push({ clave, error: `Máximo ${MAX_TEXTO} caracteres` });
    const faltan = (c.defecto.match(MARCADORES) ?? []).filter((m) => !v.includes(m));
    if (faltan.length) errores.push({ clave, error: `Debe conservar ${faltan.join(', ')}` });
    if (/1 = .*7 = /.test(c.defecto) && !/1 = .*7 = /.test(v)) errores.push({ clave, error: 'Es una escala: debe decir qué significan «1 = …» y «7 = …»' });
  }
  return errores;
}

/** Solo las claves cuyo texto difiere del protocolo (lo que se guarda en Supabase). */
export function soloCambios(propuesta: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(propuesta)) {
    const c = campos.get(clave);
    const v = String(valor ?? '').trim();
    if (c && v && v !== c.defecto) o[clave] = v;
  }
  return o;
}

/** Aplica una redacción publicada. Ignora claves desconocidas y textos inválidos (se queda el del protocolo). */
export function aplicarTextos(cambios: Record<string, string> | null | undefined): { aplicados: number; ignorados: string[] } {
  const validos: Record<string, string> = {};
  const malos = new Set(validarTextos(cambios ?? {}).map((e) => e.clave));
  for (const [k, v] of Object.entries(cambios ?? {})) if (!malos.has(k)) validos[k] = String(v).trim();
  activos = soloCambios(validos);
  return { aplicados: Object.keys(activos).length, ignorados: [...malos] };
}

export const textosActivos = (): Record<string, string> => ({ ...activos });

/** Reemplaza los marcadores {nombre}… de un texto. */
export const rellenar = (t: string, valores: Record<string, string>): string => t.replace(MARCADORES, (m) => valores[m.slice(1, -1)] ?? m);

/** Versión de la redacción: «protocolo» si no hay cambios publicados. */
export interface VersionTextos { version: string; textos: Record<string, string>; publicado?: string; nota?: string }
export const VERSION_PROTOCOLO = 'protocolo';
