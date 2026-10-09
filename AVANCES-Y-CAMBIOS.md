# Kinoo · Avances del proyecto y cambios durante la construcción

Ejecución del `PLAN-MAESTRO-Pruebas-Kinoo.md` (2026-10-08 → 2026-10-09). Este documento dice **qué se hizo, qué se verificó, qué cambió respecto al plan y por qué, y qué falta**.

## 1. Estado por fase

| Fase del plan | Estado | Evidencia |
|---|---|---|
| **F0 · Andamiaje** | ✅ | Monorepo npm workspaces, Vite 5 + React 18 + TypeScript estricto, Vitest, Playwright |
| **F1 · Design system** | ✅ | 19 componentes `Kinoo.*` en React; versión **A «Noche»** (artefacto original) y **B «Kino»** (tema `data-brand="kino"`); contraste AA verificado (`npm run contrast`) |
| **F2 · Pantallas y estado** | ✅ | 7 pantallas portadas del artefacto (S01–S08), 8 semillas de estado, `data-track` en **todo** elemento interactivo (probado), `data-zone` en las zonas de cada tarea |
| **F3 · Seguimiento cliente** | ✅ | Un listener en `#kinoo-frame`, cola con lotes, reintentos, persistencia, `sendBeacon`; probado sin red y sin duplicados |
| **F4 · Backend** | ✅ (falta publicarlo en tu Google) | `backend/Code.gs` probado **tal cual** contra un Sheet simulado: registro con `LockService`, Juan 1 / Juan 2, upsert por Row ID, dedupe de eventos, perfil, fases, codificación, `dump`/`csv`/`health` |
| **F5 · Sesión de prueba** | ✅ | 4 fases con pausa y retoma, 5 s (pantallas y cards), primer clic + SEQ, UEQ-S, marca A/B, cierre, barra del moderador, bloqueo en escritorio con QR |
| **F6 · Flujos tipo Maze** | ✅ | 5 misiones por sesión (+ M2 y V3 disponibles), éxito directo/indirecto/abandono/tiempo/error, embudo, rutas, gestos |
| **F7 · Panel** | ✅ | 11 vistas, mapas de calor sobre la pantalla real, binomial, codificación, afinidad, exportación `.xlsx`/CSV/PNG |
| **F8 · Deploy y export** | ✅ (falta que lo publiques tú) | 3 workflows (CI, Pages, export nocturno), export **anonimizado** probado de punta a punta |
| **F9 · Piloto** | ⏳ **Pendiente — requiere personas** | Lista de chequeo en `docs/GUIA-DESPLIEGUE.md` §4 |

## 2. Qué se verificó (todo se ejecutó, nada se dio por hecho)

| Tipo | Cantidad | Qué cubre |
|---|---|---|
| Pruebas de lógica (`npm test`) | **122** en 8 archivos | Nombres repetidos, cuadrado latino del Anexo E, zonas y miss clicks, UEQ, binomial (**tabla del protocolo §4.5 reproducida**), clasificación de misiones, `Code.gs` real, cliente con red caída, analítica del Panel, anonimización, export |
| Pantallas (dentro de `npm test`) | 33 | Todas las semillas A y B rastreables; las 5 zonas de tareas existen; flujos D1, M1, D2, M2, V1, V2, V3; match especial; deshacer; 3 rechazos en Ver |
| Extremo a extremo (`npm run e2e`) | **14** | **Sesión completa de 4 fases** (verifica cada hoja del «Excel»), dos «Juan» a la vez, contexto, sin consentimiento, escritorio con QR, **sin red desde el registro**, cerrar y retomar, barra del moderador, Panel completo, capturas A/B |
| TypeScript estricto | sin errores | |
| Contraste WCAG AA | 28 combinaciones, todas ✓ | `data/contraste.csv` |
| Builds | ✅ | app de prueba y Panel |

## 3. Cambios respecto al plan (y por qué)

**Producto**
1. **Ver ahora tiene botones «Otra» y «Verla»** bajo la tarjeta. El artefacto solo tenía swipe (los métodos existían pero no el marcado). El *Sistema de mazos v3 §7.1* pide «Botón primario: Verla; secundario: Otra», y una prueba de primer clic con un solo toque no puede medir un gesto de deslizar. La tarjeta sigue deslizándose.
2. **Ver tiene un enlace «Mi espacio»** (el artefacto no enlazaba esa pantalla) para poder medir la misión V3.
3. **Comunidad fuera**: la barra inferior tiene solo **Ver** y **Descubrir** (decisión del usuario).
4. **Marcas compartidas**: lo que marcas en Descubrir ahora alimenta Ver y Mi espacio (en el artefacto cada pantalla tenía su propio estado). Cada tarea parte de una **semilla** para que el estado sea idéntico entre participantes.
5. Placeholders (`[Plataforma]`, `[Director]`, `[Año]`) reemplazados por valores ficticios neutros (Netflix, Prime Video, Lucía Ferrer, 2024…). Se añadió una película de prueba («Vecinos de Siempre») para que «Vistas» no quede vacía.
6. Mazos de **3 cartas** (como el artefacto), no 10.

**Metodología**
7. **Cards: 4 estímulos** por participante (el protocolo permite 4–6) para respetar los ~60 min. En «¿Qué más recuerdas?» el participante **marca elementos de la lista** (y lo escrito va a Notas) para no depender de codificación textual; se mantiene la clave del protocolo.
8. **UEQ-S de 8 pares** por defecto; el formato completo (26) está implementado (`<Ueq completo />`) pero no se expone por configuración todavía.
9. **Éxito directo vs indirecto** se simplificó: *directo = cumplió la misión sin pasar por pantallas fuera de la ruta esperada*. La primera definición («recorrió toda la ruta») marcaba falsamente como indirecto el éxito que se detecta justo antes de la última pantalla.
10. **Sin pregunta P2b/C5b en vivo** (como se decidió): el motivo se codifica después en el Panel.
11. El **toque que cuenta como «primer clic»** es el `pointerdown`; el evento se emite al soltar (`tap`, `drag` con dirección, `longpress`).
12. Las **zonas correctas** no se dibujan a mano: se miden solas del DOM (mínimo 44 × 44 px) y se guardan en la hoja Zonas la primera vez.
13. **T5 acepta como «aceptable» un toque sobre la tarjeta** (porque el gesto de descartar empieza ahí) y **T2 acepta el cuerpo de la carta** (voltear).

**Técnicos / visuales**
14. **B «Kino»**: la guía J usa `#4A4541` para bordes (2,0:1 sobre el negro); el chequeo de contraste lo marcó en rojo y se subió a `#7A736B` (≥ 3:1, WCAG 1.4.11). La tipografía display de B es Archivo 900 a ancho normal (la guía pide *Expanded 125 %*, que desbordaba los layouts fijos de 390 px) y los títulos se reducen para que quepan.
15. El nombre mostrado usa **la forma del primero que se registró** («Juan» o «Juán»); lo que importa es la numeración.
16. **Panel**: la «línea de tiempo» de un participante es una tabla de eventos (no una reproducción animada). La hoja **Contraste** se llena con `npm run seed-config` (no por el navegador).
17. Dos parámetros de ayuda, **nunca con participantes**: `?catalogo=1` y `?rapido=1`.

## 3 bis. Segunda ronda de cambios (pedidos tras probarlo en local)

| # | Pedido | Qué se hizo |
|---|---|---|
| 1 | La prueba de **cards repetía** la misma tarjeta y preguntaba el recuerdo de más | Ahora son **3 tarjetas distintas** (Ciudad Naranja de frente, Interstellar de reverso, El Faro Mudo de frente; de dos mazos, conocidas y no conocidas). Se quitaron «¿Qué más recuerdas?» (C2) y «Señala lo primero que viste» (C7), que repetían la pregunta del primer elemento y obligaban a mostrar la misma tarjeta otra vez |
| 2 | El **swipe** no se podía hacer porque solo se veía la tarjeta | La tarjeta se muestra **dentro de la pantalla completa de Descubrir** (cabecera, botones ←↑→ y barra inferior). Tras las preguntas la persona **la prueba de verdad**: toca y desliza; se registran sus toques, sus gestos y las acciones que dispara |
| 3 | Los **flujos estaban mal cortados** | Cada misión **arranca en su pantalla inicial** y la persona navega hasta la **pantalla objetivo** sin ayuda: D1 (inicio → tus mazos), M1 (mazos → cartas del mazo Nolan), D2 (primera carta → «Mazo terminado»), V2 (propuesta de Ver → plataforma → volver → calificar) y V3 (Ver → Mi espacio → quitar una guardada). El éxito es **llegar a la pantalla objetivo** (en D2 ya no importa qué decida en cada carta) |
| 4 | **No se mostraban los mazos** | La pantalla **«Tus mazos» (S05)** entra al test de 5 segundos (con su clave de corrección) y a la prueba de marca A/B (en lugar de la hoja de calificación); además están en los flujos M1 y D1 |
| 5 | Falta de **feedback al terminar una tarea** | Al llegar a la pantalla objetivo aparece **«¡Felicidades! Completaste la tarea»** con un botón «Siguiente situación»; después viene la pregunta de facilidad (SEQ). Si la persona se rinde o pasa por tiempo **no** se felicita (solo «Seguimos con la siguiente»). En las tareas de **primer clic no** se dice si acertó: el protocolo (§3.1) prohíbe mostrárselo antes del SEQ |
| 6 | Pasar los datos a **Supabase** | **Pendiente a propósito**: primero cerrar el flujo (esto). Ver «Siguiente paso» abajo |

Ajustes técnicos de esta ronda: `ProductApp` acepta un `ajuste` del mazo (qué película y qué cara se ven); los predicados de éxito de las misiones viven en `apps/prueba/src/misiones.ts` con sus pruebas (9 nuevas); el catálogo (`packages/tracking/src/catalog.ts`) define cada misión con su pantalla inicial y su ruta esperada. El Panel rotula el mapa de cards como «Primer toque al probar la tarjeta».

## 3 ter. Modo equipo (tercera ronda de cambios)

**Pedido:** que «continuar como equipo» no se registre como participante, deje saltar y devolverse, y no dé nada por terminado.
**Hecho:** `?equipo=1` (o el botón de la pantalla del QR). El cliente de seguimiento queda **inerte** (no encola, no envía, no persiste; probado), la sesión vive solo en memoria con el nombre «Equipo», hay un menú para elegir fase y participante simulado, cinta con Atrás / Saltar / Menú / Salir y un final que dice «no se guardó nada». Se eligió **no registrar nada** en vez de «registrar aparte» para no consumir códigos ni números de rotación. Se probó con un celular virtual (equipo.spec.ts): se recorre, se vuelve, se salta, se llega al final y **ninguna hoja recibe una sola fila**; y un participante normal sigue guardándose.

## 3 quater. La versión B de la marca es el prototipo Kino real (cuarta ronda, 2026-10-09)

**Pedido:** en la prueba de marca (fase 4) la opción B no debía ser la app A con otro tema, sino **el prototipo «Kino» creado en el lienzo** (página H «Kino · mazos»), con su estética y su funcionamiento.
**Hecho:** `packages/kinoo-ui/public/kino/` contiene `H_Prototipo.dc.html` **sin cambios** (solo `support.js` → `dc-runtime.js`, el runtime oficial de los lienzos, y una línea que carga `embed.js`). `KinoPantalla` lo muestra en un iframe dentro del mismo marco `#kinoo-frame` de 390×844; `embed.js` abre S02 (mazo · cartas), S04 (Ver · cartas) o S05 (elegir mazo) con los atajos del propio prototipo y deja solo el teléfono. **La lógica de la prueba no cambió**: mismas etapas, 12 s, preguntas, toque M5, filas de `Marca A-B`, eventos y orden A→B/B→A. La «jerarquía prevista» de B se mide con un rectángulo fijo medido en el prototipo (`KINO_PRIMARIO`). El Panel dibuja los mapas de B sobre el prototipo y el catálogo (`?catalogo=1`) lo deja usable. Supabase no cambia. Detalle y pasos de publicación: `ULTIMAS-ACTUALIZACIONES.md`.

## 4. Errores reales que encontraron las pruebas (y se corrigieron)

| # | Qué pasaba | Cómo se encontró | Arreglo |
|---|---|---|---|
| 1 | **Tocar la carta no la volteaba** (con `setPointerCapture` el clic nunca llegaba al botón) | E2E de la sesión completa | El toque sin arrastre voltea en `pointerup`, como en el artefacto |
| 2 | La cola **perdía filas** si el navegador ocultaba la página durante un envío | E2E (fila ausente) | Se quitan de la cola los elementos enviados **por identidad**, no por cantidad. Prueba de regresión añadida |
| 3 | Si se recargaba mientras se registraba, quedaba un código `TMP-…` y **filas pendientes salían con el código viejo** | E2E | La cola se **re-etiqueta** al llegar el código definitivo (y el servidor corrige lo ya enviado) |
| 4 | El **piloto (ronda 0) se guardaba como ronda 1** | Prueba de analítica | `Code.gs`: `0` ya no se trata como «vacío» |
| 5 | El contexto (edad…) y las fases completadas **se perdían si no había red** al enviarlos | E2E sin red | Reintento automático hasta que el servidor confirma |
| 6 | El carrusel de mazos tenía un **botón dentro de otro botón** (sin `data-track`) | Prueba de rastreo | Se aplanó |
| 7 | Los botones perdían su tipografía (la regla `button{font:inherit}` pisaba la del componente) | Capturas A/B | Regla con especificidad 0 |

## 5. Lo que falta o conviene saber

1. **Publicar** (te toca a ti, es tu cuenta de Google y tu GitHub): `docs/GUIA-DESPLIEGUE.md`. No se ha probado contra un Google Sheet *real* ni en GitHub Pages; lo probado es el mismo `Code.gs` contra un Sheet simulado y los mismos builds que usa Pages. **Haz el piloto antes de la primera sesión.**
2. **F9 · Piloto con una persona externa** (protocolo §0.4): ajustar tiempos y redacción. No se puede automatizar.
3. **Dos supuestos que conviene revisar**: ¿la versión B es «Kino» (guía J / pantallas H del lienzo)? ¿Se usa «Kinoo» en ambas versiones? (hoy sí).
4. **Límites conocidos**: la `WRITE_KEY` es visible en el código público (solo evita escrituras accidentales; se rota entre rondas); con cada participante en su celular el brillo y el tamaño varían en la prueba de marca; el Panel es una página pública que no muestra datos sin la `READ_KEY`.
5. **No implementado a propósito**: Comunidad, economía de sobres, modo a ciegas, captura externa, variantes de tienda, manual de marca.
6. Mejoras posibles: reproducción animada de sesiones en el Panel; elegir UEQ completo por configuración; empaquetar la codificación de «Propósito/Acción» con ayuda semiautomática.

## 6. Siguiente paso: Supabase

Hoy el «Excel» es un Google Sheet con Apps Script. Para pasar a Supabase el cambio queda acotado: el esquema de datos (`packages/tracking/src/schema.ts`), el cliente de envío (`TrackingClient`) y el Panel (`apps/panel/src/api.ts`) ya están aislados del backend; solo habría que reemplazar `backend/Code.gs` por tablas (`participantes`, `eventos`, `filas` por hoja) con RLS, una función de registro que asigne código y numere los nombres repetidos, y la lectura del Panel. Pendiente de tu confirmación de alcance (¿se mantiene el export a Excel/Sheets?, ¿Realtime para el Panel?).

## 7. Mapa del repositorio

```
apps/prueba      App del participante (4 fases)           apps/panel   Panel del equipo
packages/kinoo-ui  Design system A+B, 7 pantallas, store     packages/tracking  Esquema, catálogo, fórmulas, cliente
backend/         Code.gs (Apps Script) + pruebas           scripts/     contraste, export anonimizado, seed, build-backend
e2e/             Playwright + backend simulado + datos de prueba      docs/   guías de despliegue, moderador y análisis
.github/workflows  CI, Pages y export nocturno             data/        export anonimizado (lo escribe el workflow)
```
Referencia de origen: `_artefacto/` (versión A) y `_artefacto_B/` (versión B) en la carpeta `Pruebas/`, y `PLAN-MAESTRO-Pruebas-Kinoo.md`.
