---
name: kinoo-protocolo
description: Actualizar Kinoo Pruebas (link de prueba + Panel + Supabase) cuando llega un protocolo de pruebas nuevo, un artefacto/prototipo nuevo, o cambian preguntas, módulos, columnas del Excel o métricas. Usar ante "nuevo protocolo", "nueva versión del protocolo", "subí un artefacto", "nueva versión del prototipo", "agregar/quitar una pregunta", "cambiar umbrales", "nuevo Excel de registro". Guía para gastar pocos créditos: dice qué leer y qué NO leer.
---

# Kinoo · cambios de protocolo y de artefactos

Repo: `kinoo-pruebas/` (GitHub `montenegroc597-web/kinoo-pruebas`, deploy a Pages al hacer push a `main`).
Backend: Supabase, proyecto «Pruebas Kinoo» (`yafofroiagcauqocwbgq`), Edge Function `kinoo` → `public.kinoo_api`.
Protocolo vigente: **v2.0 no moderado por link** (`docs/protocolo/v2.0.txt`), Excel `Registro_Pruebas_No_Moderadas_Kinoo_v2.0.xlsx`.
Prototipo vigente: `packages/kinoo-ui/public/kinoo-flujo/` (lienzo «Kinoo Descubrir», claude.ai/artifact/Gs7VuK91c1zNqmUiK4CKCg, página «Prueba Maze · Flujo»).

## Regla de oro para ahorrar créditos
- **No leas**: el `.docx` entero, `PLAN-MAESTRO`, `_artefacto*`, los `.dc.html`, `public/*/`, `dc-runtime.js`, `package-lock.json`, `data/`.
- Protocolo nuevo → léelo como **diferencia**: `node scripts/protocolo-texto.mjs <nuevo.docx> docs/protocolo/vX.Y.txt` y
  `node scripts/protocolo-texto.mjs --comparar docs/protocolo/v2.0.txt docs/protocolo/vX.Y.txt`. Si la diferencia es casi todo
  (reescritura), lee el `.txt` nuevo completo (≈ 50 KB): sale más barato que el diff.
- Excel nuevo → solo encabezados: `node -e "const X=require('xlsx');const wb=X.readFile('<xlsx>');for(const n of wb.SheetNames){const a=X.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''});console.log(n, a[1]?.filter(Boolean).join(' | '))}"` y la hoja «Config» completa.
- Lienzo nuevo → `canvas.json` (páginas y tableros) y, de las páginas, solo el bloque `<script type="text/x-dc">` con `grep`/`awk`.

## ¿Quién cambia qué?
| Cambio | Dónde | ¿Código? |
|---|---|---|
| Redacción de una pregunta existente | Panel → **Textos** (borrador → vista previa → publicar) | No |
| Variantes A/B, moods, películas, mazos, claves de codificación, umbrales, qué pantalla del prototipo se usa | Panel → **Estudio** («Config» del Excel) | No |
| Pregunta, opción o columna nueva; módulo nuevo; métrica nueva | código (receta A) | Sí |
| Prototipo nuevo o nueva versión del lienzo | `npm run importar-prototipo` (receta B) | Mínimo |

## Mapa del sistema
- `packages/tracking/src/catalog.ts` — protocolo en datos: `MODULOS`, `FLUJOS` (qué partes tiene cada link), textos exactos con `editable()`, opciones, `UMBRALES` (por defecto; el Estudio los sobrescribe), `MOTIVOS`.
- `packages/tracking/src/estudio.ts` — la «Config» (secciones A–G del Excel): tipo `Estudio`, `ESTUDIO_DEFECTO`, `validarEstudio`, `aplicarEstudio`. Las pantallas del prototipo se definen como `{ pagina, acciones?, marca? }`.
- `packages/tracking/src/schema.ts` — hojas y **columnas exactas del Excel** + columnas de enlace al final. Si cambian: `npm run hojas-sql`.
- `packages/tracking/src/metrics.ts` — Fisher, Welch, veredicto A/B, UEQ-S, puntaje de gesto y de primer clic.
- `apps/prueba/src/App.tsx` — recorre `FLUJOS[link]`; `steps/<Módulo>.tsx` = un módulo (Intro, Descubrir, Ver, Moods, Mazos, Percepcion); `steps/tarea.tsx` = tarea sobre el prototipo vivo; `captura.ts` = gestos y toques dentro del iframe; `ui/Proto.tsx` = 5 segundos (cuenta desde que la pantalla cargó).
- `apps/panel/src/analytics.ts` — validez de personas y métricas por módulo, `METRICAS_AB` (las 22 del Excel; `primaria: true` las 5 que deciden). `views.tsx` = vistas; `Estudio.tsx` y `Textos.tsx` = editores.
- `packages/kinoo-ui/src/Prototipo.tsx` — `PROTOTIPOS` y `PrototipoVista`; `public/_prototipos/embed.js` ejecuta `acciones` y mide `marca` dentro del prototipo.
- `supabase/migrations/NNN_*.sql` — `kinoo_api` (cada cambio = migración nueva que la reescribe entera). `supabase/hojas.sql` = generado.
- `e2e/pg-backend.mjs` — las migraciones reales sobre PGlite (tests, `npm run mock`, `npm run carga`). `e2e/seed.mjs` = datos con resultados conocidos.

## Receta A · Protocolo nuevo
1. Extrae y compara (arriba). Clasifica cada diferencia: **redacción** / **Config** / **estructura** / **método**.
2. Redacción → Panel → Textos (y si el protocolo nuevo reemplaza al anterior, el texto por defecto en `catalog.ts`). Config → Panel → Estudio (y el valor inicial en `estudio.ts`).
3. Estructura:
   - pregunta nueva: texto con `editable()` en `catalog.ts`, la pregunta en `steps/<Módulo>.tsx` y su valor en `fila('<Hoja>', …)`;
   - columna nueva: `schema.ts` (al **final** de la hoja si el Excel no la trae; en su sitio si el Excel la trae) → `npm run hojas-sql`;
   - módulo nuevo: `MODULOS` y `FLUJOS` en `catalog.ts`, `steps/<Nuevo>.tsx`, `MODULOS` de `App.tsx`, su hoja en `schema.ts`, su cálculo en `analytics.ts` y su vista;
   - lógica del servidor: migración nueva `supabase/migrations/00N_….sql`. Si el estudio anterior debe quedar archivado, copia el patrón de `003` (renombra hojas y filas a «vX.Y · <hoja>»).
4. Datos de prueba con resultados conocidos en `e2e/seed.mjs` y sus asserts en `apps/panel/src/analytics.test.ts`.
5. Guarda el `.txt` nuevo en `docs/protocolo/` y registra en `CAMBIOS.md`.

## Receta B · Artefacto / prototipo nuevo
1. Baja del lienzo las páginas que se prueban y sus imágenes: `Artifact read` con `paths` para los `.dc.html` y, **de a una**, `path = <id de 32 hex>` para cada `/_blob/<id>` (sale `<id>.<ext>`).
2. `node scripts/importar-prototipo.mjs <id> <carpeta project> --paginas <prefijo> --blobs <carpeta de imágenes> --nombre "…"` → copia las páginas sin tocar su lógica (2 líneas: runtime común y `embed.js`), reescribe las imágenes con extensión y lista los atajos.
3. Completa `public/<id>/prototipo.json` (`ancho`, `alto`, `inicio`) y añádelo a `PROTOTIPOS` en `packages/kinoo-ui/src/Prototipo.tsx`. Si reemplaza al del estudio, cambia `PROTOTIPO_ESTUDIO` en `estudio.ts`.
4. En Panel → Estudio (o `ESTUDIO_DEFECTO`): página de cada variante y de cada pantalla (`acciones` para llegar a un estado, `marca` para el círculo de V1c y la zona de Z3). Revisa que el mood objetivo de V2 no sea el que la pantalla trae seleccionado.
5. Verifica a ojo: `npm run dev:prueba` → `/?equipo=1` (todas las partes) y `/<id>/<pagina>.dc.html`. Si el lienzo trae un `dc-runtime.js` más nuevo (`artifact-type/dc-runtime.js`), reemplaza `public/_prototipos/dc-runtime.js`.

## Verificar (siempre, en este orden)
```bash
cd kinoo-pruebas
npm run typecheck && npm test          # incluye el SQL real de kinoo_api y hojas.sql al día
npm run build
npm run e2e                            # ~2 min: link completo sobre el prototipo real, Link 2, sin red, equipo, Panel, textos
npm run carga -- 20                    # si se tocó el backend o el Panel
```

## Publicar (pedir confirmación al usuario antes de cada paso)
- Supabase: migraciones nuevas con el MCP (`apply_migration`, proyecto `yafofroiagcauqocwbgq`) y después `supabase/hojas.sql` (`execute_sql`); luego `get_advisors` (security). La Edge Function solo se redespliega si cambió `supabase/functions/kinoo/`.
- GitHub: commit en `main` + push → «Deploy (GitHub Pages)» y «CI» en verde (`gh run list`).
- `CAMBIOS.md`: fecha, qué, por qué y cómo se verificó.

## Cosas que no se deben romper
- Los nombres de hoja y columna son los del Excel: renombrar = migrar datos.
- Texto y «Config» no cambian dentro de una sesión (se fijan al empezar); el Panel avisa si una ronda mezcla versiones.
- El reloj de los 5 segundos empieza cuando el prototipo avisa que está listo (`prototipo-listo`), no al montar el iframe.
- El Panel nunca descarga «Eventos» entero (se pagina); la codificación no muestra la card.
- Modo equipo (`?equipo=1`) no escribe nada; `?equipo=1&textos=borrador` = vista previa de los borradores.
