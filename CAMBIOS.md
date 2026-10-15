# Kinoo Pruebas · registro de cambios

Cada versión: qué cambió, por qué y cómo se verificó. Lo más nuevo arriba.
Historial anterior: `AVANCES-Y-CAMBIOS.md` (construcción, rondas 1–4).

---

## v3.3 · Nombre al empezar, pósters de películas y un Panel más fácil de leer (2026-10-14)

- **Nombre:** la bienvenida pide «¿Cómo te llamas?» (obligatorio, 2 letras o más) y se guarda en «Nombre ingresado» de Participantes, junto al código P01, P02… que sigue igual. Las personas ya registradas quedan como estaban. El texto de bienvenida ya no dice «anónimas»: dice que el nombre no se publica.
  - Migración `004_nombre_participante.sql` (register guarda `perfil.nombre`; profile acepta «Nombre ingresado»). Si la persona empieza sin red, el nombre se reenvía con el registro definitivo.
  - El export público a `data/` ya quitaba «Nombre ingresado» y tachaba el nombre dentro de las respuestas (`scripts/anonimizar.mjs`).
- **Pósters:** las 10 imágenes de `Recursos/Peliculas` se reducen a 360 px (≈ 20–80 KB) en `_blob/poster-*.jpg`. Coco, Titanic y Her ganan póster; entran 7 películas al catálogo (¿Qué pasó ayer?, Matrix, Terminator, Rocky, Smile, Superman, Proyecto Hail Mary).
  - M3d (propuesta, pendiente de confirmar en Panel → Estudio): Titanic → Sufrir bonito, ¿Qué pasó ayer? → Solo reírme, Matrix → Salir pensando, Terminator → Apagar el cerebro, Rocky → Sentir algo, Her → Algo raro.
  - M3c: Smile reemplaza a Hereditary como película neutra de «Escapar un rato». Superman y Proyecto Hail Mary quedan en el catálogo para usarlas desde Estudio.
  - `Recursos/` (originales, 14 MB) queda fuera del repositorio.
- **Panel:**
  - cada indicador es una tarjeta: la pregunta, el resultado grande, una barra con la meta marcada y el estado en palabras con ícono (✓ Cumple la meta / ! Cerca: revisar / ✕ Lejos: rediseñar); en Descubrir, Card A y Card B debajo;
  - Resumen: personas válidas contra la meta, personas por card, «¿Cómo vamos?» (cuántos cumplen, están cerca o hay que rediseñar) y la lista de lo que hay que mirar primero con «Ver detalle →»; los indicadores agrupados por módulo;
  - los conteos (gestos, primer elemento, sorpresa…) se ven como barras con %; los gestos en palabras («Deslizó a la derecha →»);
  - tiempos, toques y % que saltó cada tarea en mosaicos con su explicación;
  - el menú agrupado: Resultados · Personas y respuestas · Preparar la prueba · Sistema;
  - Participantes muestra el nombre.
- **Verificado:** typecheck, 67 pruebas unitarias (incluye el nombre en kinoo_api) y 8 de punta a punta; capturas del Panel revisadas.

---

## v3.2 · Las tareas terminan cuando la persona lo decide (2026-10-14)

- **Problema:** en D2 y D3 el primer gesto (deslizar o tocar un botón de decisión) cortaba la tarea y pasaba a las preguntas, aunque el gesto fuera el equivocado. La persona no podía corregir ni sabía que la tarea había terminado.
- **Ahora, en todas las tareas sobre el prototipo (D2, D3, D4 y V2):**
  - ningún toque termina la tarea; la persona puede equivocarse, corregir y seguir;
  - termina cuando toca **«Terminé»**, o la **salta** con «Es muy difícil, saltar» (pide confirmación: «Seguir intentando» / «Sí, saltar»);
  - al terminar ve un aviso claro (**«Tarea terminada»** o **«Tarea saltada»**) y luego «Continuar» a las preguntas;
  - desaparecen los temporizadores de «No sé qué hacer» y «No logro llegar», y en D4 «Terminé» ya no espera a llegar al resumen.
- **Flujo ideal (qué cuenta como acierto):**
  - D2: el **primer** gesto decisivo es deslizar a la derecha (1) o tocar «Quiero verla» (0,5); D3 igual con izquierda / «No me interesa». Corregir después no cambia el puntaje (es primer clic, §1), pero queda en «Gestos que hizo (en orden)».
  - D4: llegar al resumen del mazo («Ver cómo te fue») antes de tocar «Terminé».
  - V2: la barra queda en el mood objetivo (1) o el cercano (0,5) al tocar «Terminé».
  - Saltar la tarea cuenta como 0.
- **Registro:** columnas nuevas al final de la hoja: «D2/D3/D4 · Resultado de la tarea» y «V2 · Resultado de la tarea» (Terminó / La saltó), «D2/D3 · Gestos que hizo (en orden)». En «Puntos», los gestos posteriores al primero salen como «decisivo (otro intento)».
- **Panel:** % que saltó cada tarea (Descubrir → Vacilación; Ver → Tarea V2).
- **Textos editables:** grupo nuevo «Tareas en el prototipo» (Terminé, saltar, confirmación y avisos); D4nota y V2listo dicen «Terminé».
- **Verificado:** typecheck, 67 pruebas unitarias y 8 de punta a punta, incluida una nueva: un gesto equivocado ya no avanza, se corrige, «Terminé» muestra el aviso y saltar pide confirmación.

---

## v3.1 · D4 en Descubrir: completar el mazo y ver qué dice de ti (2026-10-14)

- **Problema:** D4 mostraba «Tu match del mazo», que es del final del mazo de **Ver**, no de Descubrir.
- **Ahora:** D4 es una tarea de exploración libre sobre la card de la persona (A o B):
  - consigna: «Completa tu mazo de 10 cartas y mira qué dice este mazo de ti»;
  - la tarea se cumple cuando el prototipo llega a la pantalla del resumen (`Flujo2_Resumen`, el botón «Ver cómo te fue»);
  - «Listo» se habilita al llegar;
  - si a los 2 minutos no ha llegado, aparece «No logro llegar».
- **Preguntas después:**
  - D4e · SEQ;
  - D4a · «¿Qué te dijo el mazo sobre ti?», que se codifica;
  - D4b · sorpresa;
  - D4c · tipo de sorpresa;
  - D4d · ganas de ver lo que eligió;
  - D4f · qué le confundió (opcional).
- **Columnas nuevas al final de «Descubrir»** (el Excel v2.0 no las trae): «D4 · Llegó al resumen (1/0)», «D4 · Tiempo hasta el resumen (s)», «D4 · Toques (n)», «D4e · SEQ 1–7» y «D4f · Qué le confundió». Las columnas D4a–D4d del Excel se conservan con su nombre original.
- **Panel:** indicadores nuevos «Completa el mazo y llega a su resumen» y «Facilidad de completar el mazo», mediana del tiempo hasta el resumen y lista de confusiones.
- **Config:** `pantallas.match` pasa a llamarse `pantallas.resumen` (`Flujo2_Resumen.dc.html`). Se puede cambiar en Panel → Estudio.
- **Verificado:** 67 pruebas unitarias y 7 de punta a punta. En la del link completo, el celular virtual revela y elige las 10 cartas, abre «Ver cómo te fue» y toca «Listo».

---

## v3.0 · Protocolo v2.0 no moderado por link + prototipo «Prueba Maze · Flujo» (2026-10-14)

Base: v2.1 (sin publicar todavía; se publican juntas).
Fuentes: `Protocolo de pruebas no moderadas por link v2.0` (texto en `docs/protocolo/v2.0.txt`), `Registro_Pruebas_No_Moderadas_Kinoo_v2.0.xlsx` y el lienzo «Kinoo Descubrir» (claude.ai/artifact/Gs7VuK91c1zNqmUiK4CKCg), página «Prueba Maze · Flujo».

### 1. Qué cambió en la prueba
- **Sin moderador y anónima.** La persona abre un link y hace todo sola. Ya no se piden nombres: el servidor asigna P01, P02…
- **Módulos del protocolo:** Intro (I1–I4) → M1 Descubrir (D1a–D4d) → M2 Ver (V1a–V4d) → M3 Moods (M3a–M3e) → M4 Mazos (Z1–Z5b) → M5 Percepción (F1, F2, control de atención, UEQ-S, F4).
- **Tres recorridos** (`FLUJOS` en `catalog.ts`): completo (`…/prueba/`); `?link=1` (Intro, Descubrir, Ver, Percepción); `?link=2` (Intro, Moods, Mazos, con el control de atención al final de M4).
- **Card A/B entre sujetos.** El servidor alterna la card o la fija el link (`?card=A|B`). La card queda guardada en la sesión y se conserva al retomar.
- **Prototipo real.** Las tareas usan el prototipo vivo (13 páginas `Flujo*.dc.html`, 402×844, en `packages/kinoo-ui/public/kinoo-flujo/`). Se mide dentro del prototipo:
  - gestos: → Quiero verla, ← No me interesa, ↑ Ya la vi;
  - toques y tiempo hasta la primera acción decisiva;
  - mood elegido en la tira (V2).
  - Las 5 s empiezan cuando la pantalla ya cargó.
- **Validez** (Excel): completó y control = 5 y duración ≥ mínimo (6 min por defecto) y no está excluida a mano. El Panel cuenta y compara solo las válidas.

### 2. Qué cambió en el sistema (modular)
- **«Config» del estudio en el Panel** (vista nueva **Estudio**, `packages/tracking/src/estudio.ts`). Es la hoja «Config» del Excel:
  - variantes A/B y su pantalla;
  - las 8 definiciones de mood con su objetivo y distractores;
  - películas y mazos;
  - claves de codificación (gesto correcto, D1b, D2b/D3b, D4a, V1a, V1c/V1d);
  - mood objetivo de V2 y umbrales;
  - qué pantalla del prototipo usa cada tarea.
  - Se edita con borrador, publicación e historial, igual que los textos. Cada sesión guarda la versión que vio.
- **Pantallas del prototipo como datos:** `{ pagina, acciones, marca }`. `embed.js` ejecuta las acciones (por ejemplo, pasar cartas hasta «Tu match del mazo») y mide la marca (círculo de V1c, zona correcta de Z3). Si cambia el lienzo, se cambia la Config, no el código.
- **Importador multipágina:** `importar-prototipo.mjs <id> <carpeta> --paginas <prefijo> --blobs <carpeta> --nombre`. Las imágenes conservan su extensión.
- **Hojas y columnas exactas del Excel v2.0** (`schema.ts`): Participantes, Descubrir, Ver, Moods, Películas, Mazos y Percepción, más Puntos, Notas, Eventos y Errores. La exportación produce el `.xlsx` en el formato de la plantilla, con «Válido» calculado.
- **Panel nuevo:**
  - Resumen con la regla de decisión sobre las 5 métricas primarias (D1b, D1c, D2, D3, D1d);
  - una vista por módulo, con mapas de calor y gestos sobre el prototipo real y un PNG por mapa;
  - matriz de moods;
  - **Card A vs B** con 22 métricas: Fisher exacta para porcentajes y Welch para escalas, tiempos y UEQ-S. El veredicto es «Diferencia clara», «Tendencia» o «Sin diferencia», y marca «n pequeño» si hay menos de 12 válidas por card;
  - codificación a ciegas (no muestra la card) y afinidad;
  - Participantes con exclusión manual;
  - Salud.
- **Supabase, migración `003_protocolo_v2.sql`:**
  - **archiva** el estudio v1.3: renombra hojas y filas a «v1.3 · <hoja>», sin borrar nada;
  - registro anónimo con card alternada o forzada;
  - `progress` calcula completó, fin y duración con el reloj del servidor;
  - `profile`, `rows` para cualquier hoja escribible, exclusión en `code`;
  - «Config» versionada;
  - `dump` ordenado.
- **Limpieza:** se borraron las pantallas React de la v1.3, el prototipo Kino, el tracker viejo, `contrast.mjs`, `seed-config.mjs`, la guía de moderador y las pruebas viejas. La skill `kinoo-protocolo` quedó reescrita para esta arquitectura.

### 3. Errores encontrados y corregidos en el camino
- **Welch:** el valor p salía mal por una división entera en la beta incompleta. Antes daba 0,0856; ahora da 0,1075, verificado con integración numérica.
- **`dump`:** no devolvía filas cuando el filtro era nulo. Se arregló con `coalesce`.
- **5 segundos:**
  - la pantalla quedaba gris si se ocultaba antes de tiempo;
  - el tiempo de la primera acción usaba un t0 viejo.
- **Imágenes SVG sin extensión:** no se veían en el prototipo.
- **`embed.js`:** no encontraba textos en mayúsculas por CSS y medía marcas fuera de la pantalla.
- **V2:** el mood objetivo por defecto era el que el prototipo ya trae seleccionado. Ahora es «Solo reírme».
- **«Descargar PNG» del mapa de calor** (bug desde la v1.3): no encontraba el lienzo. Ahora hay un botón por mapa.

### 4. Verificación
- `npm run typecheck` y `npm test`: 67 pruebas. Incluyen las fórmulas del Excel (Fisher, Welch, UEQ-S), la Config, los textos y las 18 pruebas de `kinoo_api` con las migraciones reales sobre PGlite.
- `npm run e2e`, 7 pruebas: link completo en un celular virtual sobre el prototipo real, Link 2, sin red y retomando, modo equipo, Panel con 12 personas sembradas con resultados conocidos, y textos.
- `npm run carga`: 100 personas y 90 000 eventos. El Panel pesa 292 KB al abrir y 12 KB por refresco. El lote p95 tarda 9 ms. Los códigos salen únicos.
- En Playwright, a ojo:
  - las acciones llegan a «Tu match del mazo» en unos 3,6 s;
  - la marca del filtro de moods se mide;
  - la zona de Z3 («MOOD · 10 CARTAS») se mide.

### 5. Para publicar
Orden en Supabase: `002_textos_y_escala.sql` → `003_protocolo_v2.sql` → `hojas.sql`. Luego push a `main`.

### 6. Decisiones abiertas del equipo (están en la Config, sin tocar código)
- Qué cambia en la **card B**: hoy apunta a la misma pantalla que A.
- La clave de D4a: qué debe entender la persona del resumen del mazo. Hay una propuesta.
- La zona correcta de Z3 (hoy «MOOD · 10 CARTAS»).
- Las definiciones de los moods y sus distractores: son propuestas.
- Las películas de M3d que no están en el prototipo (Titanic, Supercool, El origen, Rápidos y furiosos, Her).

---

## v2.1 · Sistema adaptable, textos editables y escala a 100 participantes (2026-10-10)

Base: v2 (`84b5807`, «Marca: versión B = prototipo Kino real»).

### 1. Textos editables desde el Panel (vista nueva «Textos»)
- **Qué:** las preguntas e instrucciones de todas las fases (≈ 75 textos: bienvenida, consentimiento, contexto, 5 s, cards, primer clic, SEQ, flujos, UEQ, marca, cierre) se editan en el Panel. Flujo: **guardar borrador → vista previa en modo equipo (no registra nada) → publicar con un nombre de versión**. Hay historial y «restaurar al protocolo».
- **Bajo el protocolo:** solo se edita la *redacción*. Las claves, opciones de respuesta, columnas y métricas no se tocan desde el Panel. La validación impide dejar un texto vacío, pasar de 700 caracteres, perder un marcador (`{nombre}`, `{izq}`…) o quitar las anclas «1 = … 7 = …» de una escala.
- **Trazabilidad:** cada participante queda marcado con la versión que vio (columna nueva **«Versión de textos»** en Participantes). La redacción se fija al registrarse y no cambia si la sesión se retoma. El Resumen avisa si una ronda mezcla versiones.
- **Cómo:** `packages/tracking/src/textos.ts` (registro con `editable()`/`editableEn()`), `apps/prueba/src/textos.ts` (carga antes del primer render, con 2,5 s de espera máxima y caché sin red), `apps/panel/src/Textos.tsx`, tablas `config` y `config_historial` en Supabase.

### 2. Escala: el Panel ya no descarga todos los eventos
- **Problema encontrado:** el Panel pedía cada 10 s el volcado completo, con la hoja «Eventos». Con 100 participantes son unos 90 000 eventos: **27,7 MB por refresco**, casi 10 GB por hora con el Panel abierto, lo que agota la cuota de Supabase y congela el navegador. Además, un cálculo del Panel recalculaba la lista de participantes por cada evento (costo cuadrático).
- **Arreglo:** el servidor agrega lo que el Panel usa de los eventos (`resumen-eventos`: miss clicks por elemento, gestos de flujos, sesiones activas, eventos por minuto). El volcado del Panel excluye «Eventos». La línea de tiempo de un participante y el Excel completo piden los eventos **por páginas** y solo al usarlos. El Panel refresca cada 15 s y **solo con la pestaña visible**. Las sesiones activas usan la hora del servidor, no la del celular.
- **Medido** (`npm run carga`, mismas migraciones sobre PGlite, cota pesimista):

| Participantes | Eventos | Panel por refresco antes | Panel por refresco ahora | Lote de 25 eventos (p95) |
|---|---|---|---|---|
| 10 | 9 000 | 2,8 MB | 76 KB | 10 ms |
| 20 | 18 000 | 5,5 MB | 150 KB | 10 ms |
| 100 | 90 000 | 27,7 MB | 736 KB | 9 ms |

- El registro concurrente sigue dando códigos y números únicos (probado con 20 registros simultáneos y 100 secuenciales).

### 3. Prototipos enchufables (artefactos nuevos)
- `scripts/importar-prototipo.mjs <archivo.dc.html> <id>`: copia el lienzo **sin tocar su lógica** (solo 2 líneas: runtime común y modo incrustado), lista los atajos de su panel y crea `prototipo.json`. Probado: reproduce byte a byte el `index.html` de Kino.
- `public/_prototipos/embed.js` es genérico. Cada prototipo declara en `prototipo.json` el atajo de cada pantalla y su jerarquía prevista: `primario` (px) o `primarioTexto`, que se mide solo.
- `VERSIONES_MARCA` (en `packages/kinoo-ui/src/Prototipo.tsx`) define qué es la opción A y la B. Los nombres del Panel («A · Noche», «B · Kino») salen de ahí.
- `KinoPantalla` → `PrototipoPantalla` (genérico). `dc-runtime.js` y `embed.js` se movieron a `public/_prototipos/`. Las URL públicas de Kino no cambian.

### 4. Protocolos nuevos con pocos créditos
- `scripts/protocolo-texto.mjs`: `.docx` → texto (títulos `#`, tablas `|`). `--comparar` imprime **solo** los párrafos que cambiaron, con su sección. El v1.3 quedó en `docs/protocolo/v1.3.txt` como base.
- Skill **`kinoo-protocolo`** (`.claude/skills/kinoo-protocolo/SKILL.md`): qué leer y qué no, mapa del sistema, recetas para «protocolo nuevo» y «artefacto nuevo», verificación y publicación.
- `UMBRALES` es ahora la fuente única de metas y semáforos. Antes había valores sueltos como 80/60, 25, 1,5 o 0,05 en las fórmulas y en el Panel.

### 5. Backend probado de verdad + limpieza
- Las pruebas, el backend local de los E2E (`npm run mock`) y la simulación de carga ejecutan **las migraciones de Supabase** sobre PGlite (Postgres en proceso). Antes probaban el `Code.gs` de Apps Script, que ya no se usa en producción.
- Eliminado el código heredado de Google: `backend/Code.gs`, `Code.template.gs`, `build-backend.mjs`, `e2e/fake-gas.mjs`. Las pruebas de anonimización y export pasaron a `scripts/`.
- `supabase/hojas.sql` se genera desde `schema.ts` (`npm run hojas-sql`). La CI verifica que esté al día.
- `export-sheet.mjs` baja «Eventos» por páginas. `seed-config.mjs` empaqueta el catálogo.
- Limpieza: `void X;` muertos, un `filter(… || true)`, una función declarada después de un `return`, el texto «Apps Script» del login del Panel. `% atributos` y `% jerarquía` de la marca ahora se calculan sobre las filas con dato (una fila vacía ya no cuenta como 0).

### Migración Supabase
`supabase/migrations/002_textos_y_escala.sql` es **aditiva**: tablas `config` y `config_historial` con RLS y sin acceso para anon/authenticated; columna «Versión de textos»; 3 índices parciales sobre «Eventos»; funciones `kinoo_config`, `kinoo_resumen_eventos`, `kinoo_eventos`; y `kinoo_api` con las acciones nuevas. No cambia ni borra datos y la Edge Function no se redespliega (las acciones nuevas van por POST, que ya pasa todo a `kinoo_api`).

### Verificación
- `npm run typecheck` sin errores · `npm test` (backend SQL real, analítica, cliente, textos, interfaz) · `npm run build` · `npm run e2e` (incluye `textos.spec.ts`: editar → publicar → la app lo muestra y lo registra) · `npm run carga`.
