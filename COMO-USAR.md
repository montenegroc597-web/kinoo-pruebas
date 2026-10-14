# Kinoo · Cómo usar la herramienta de pruebas (protocolo v2.0, no moderado)

La herramienta aplica el **Protocolo de pruebas no moderadas por link v2.0**: cada persona abre un link en su celular y responde sola, sin moderador. Los resultados llegan a Supabase en tiempo real y el Panel los muestra con las mismas fórmulas del `Registro_Pruebas_No_Moderadas_Kinoo_v2.0.xlsx`.

| Pieza | Quién la usa | Para qué |
|---|---|---|
| **Link de la prueba** (`/prueba/`) | Cada participante, en su celular | Introducción y las partes del protocolo sobre el **prototipo real** («Kinoo · Prueba Maze · Flujo»), con gestos, toques y tiempos medidos |
| **Supabase «Pruebas Kinoo»** | Nadie directamente | La base donde llega todo, con las hojas y columnas del Excel v2.0 |
| **Panel** (`/panel/`) | El equipo | Validez de cada persona, métricas por módulo con semáforo, card A vs B, moods, codificación a ciegas, edición de textos y de la «Config», exportación |

## 1. Antes de lanzar (una vez por ronda)

1. **Panel → Estudio** (la hoja «Config» del Excel). Define lo que el protocolo deja «(definir)»: qué cambia en la card B, la clave de codificación (resumen del mazo, propósito…), la definición de cada mood con su película objetivo y sus 3 distractores, las películas de M3d, los textos de los mazos y los umbrales. El Panel avisa de lo pendiente y no deja publicar lo inválido. **Publica** con un nombre de versión (p. ej. `ronda1-v1`).
2. **Panel → Textos** (opcional): ajusta la redacción de alguna pregunta. Guarda borrador → **Vista previa** → publica.
3. **Piloto** con 2 o 3 personas ajenas (§0.3), usando el enlace con `?ronda=0`: `…/prueba/?ronda=0`. Sus datos quedan marcados como ronda 0 y el Panel los excluye por defecto. Revisa que entendieron las instrucciones, que en **Salud** no hay errores y que la duración es razonable.

## 2. Los links

| Link | Enlace | Partes |
|---|---|---|
| Completo | `…/prueba/` | Introducción → M1 Descubrir → M2 Ver → M3 Moods → M4 Mazos → M5 Percepción (17–24 min) |
| Link 1 | `…/prueba/?link=1` | Introducción → M1 → M2 → M5 (12–17 min) |
| Link 2 | `…/prueba/?link=2` | Introducción → M3 → M4 (6–8 min); se envía a **otras** personas, para que los nombres de los moods del filtro no ayuden en M3 |

- **Card A / B:** sin parámetro, el servidor la asigna alternando (A, B, A, B…) según el orden en que las personas abren el link, así los grupos quedan parejos. Para el esquema del protocolo con dos copias del link, usa `?card=A` y `?card=B` (Link 1-A / Link 1-B). Se combinan: `?link=1&card=B`.
- El mensaje de invitación del Anexo A **no describe la app** (está en `docs/GUIA-ENVIO.md`).
- Es para el celular, en vertical. En un computador muestra un QR con el enlace.
- Si la persona cierra la pestaña y vuelve, retoma al principio de la parte que no terminó, con la misma card, textos y «Config».

### Modo equipo (probar sin registrar a nadie)
`…/prueba/?equipo=1`: eliges card, link y desde qué parte empezar. **No se guarda nada**. Con `?equipo=1&textos=borrador` ves los borradores de Textos y Estudio antes de publicarlos.

## 3. Qué mide cada parte

| Parte | Cómo se mide |
|---|---|
| M1 · Descubrir | La card A o B **5 s** (el reloj empieza cuando la pantalla ya cargó) → D1a–D1d → **D2 y D3 en el prototipo vivo**: se registra el primer gesto (deslizar → / ←, o tocar un botón), el tiempo y los toques fuera de lugar, y se puntúa 1 / 0,5 / 0 con la clave → SEQ y consecuencia → **D4: explora con libertad, completa su mazo de 10 cartas y llega al resumen** («qué dice este mazo de ti»; «Listo» se habilita al llegar, «No logro llegar» a los 2 min) → D4e, D4a–D4d, D4f |
| M2 · Ver | Ver 5 s → V1a–V1b → el filtro de mood **marcado con un círculo rojo** (V1c–V1d, sin explicación) → **V2 en el prototipo vivo**: elegir el mood objetivo (se leen el mood final, los movimientos de la barra y los toques) → explicación breve y V3a–V3d → la recomendación con su «por qué» y la confianza V4a–V4d |
| M3 · Moods | M3a–M3b para 3 moods al azar → M3c: cada mood con sus 4 películas barajadas (acierto y confusión automáticos, tiempo) → M3d y M3e por película |
| M4 · Mazos | La pantalla de mazos sin explicación → Z1, Z2 (4 frases) → **Z3: primer toque** sobre la pantalla (puntuado con la zona medida en el prototipo) → Z3a, Z4, Z5a, Z5b |
| M5 · Percepción | F1, F2, **control de atención** («marca la opción 5»; en el Link 2 va al final de M4), UEQ-S de 8 pares, F4 |

## 4. Ver los resultados (Panel)

`https://<usuario>.github.io/<repo>/panel/` con la URL de la Edge Function (`…/functions/v1/kinoo`) y la `READ_KEY`. Se actualiza cada 15 s mientras la pestaña está visible.

| Vista | Responde |
|---|---|
| **Resumen** | Personas válidas por card, descartes, lectura A vs B y el semáforo de todos los indicadores |
| **Participantes** | Quién cuenta: **Válido** = completó + control de atención = 5 + duración ≥ mínimo + no excluido a mano. Casilla «excluir» para quien responde siempre lo mismo. Al tocar una fila, su recorrido |
| **M1 … M5** | Indicadores con semáforo (y por card en M1), gestos, tiempos, mapas de gestos y toques sobre la pantalla real, motivos y citas |
| **M3 · Moods** | Acierto por mood, **matriz de confusión**, película → mood, nombres propios (★ si ≥ 3 personas repiten uno) y la acción sugerida por mood (§3) |
| **Card A vs B** | Las 22 métricas con Fisher (porcentajes) o Welch (escalas, tiempos, UEQ-S), veredicto «Diferencia clara / Tendencia / Sin diferencia» y la **regla de decisión** con las 5 primarias |
| **Codificación** | Respuestas abiertas → 1 / 0,5 / 0 con la clave de «Config», **sin ver la card**; D1a con la lista de elementos; ideas clave del mazo; equivalencia de los nombres propios; notas del diagrama de afinidad |
| **Estudio / Textos** | La «Config» y la redacción, versionadas (borrador → vista previa → publicar) |
| **Salud** | Eventos por minuto, quién está respondiendo, errores de la app, sesiones sin terminar |
| **Exportar** | `.xlsx` en el formato del Registro v2.0 (para pegar en la plantilla, con «Válido» calculado), `.xlsx` completo y CSV por hoja |

> Con menos de 12 personas válidas por card, la comparación A/B es solo una pista (el Panel lo marca «n pequeño»). Las respuestas abiertas **no se califican solas**: hasta codificarlas, esas métricas salen «sin datos».

## 5. Dónde quedan los datos

- **Supabase** (privado, proyecto «Pruebas Kinoo»): todo. Es anónimo: solo códigos P01, P02… Los datos del estudio v1.3 quedaron archivados como «v1.3 · <hoja>».
- **GitHub, carpeta `data/`** (público): cada noche un proceso baja los datos y guarda CSV + `.xlsx`.

## 6. Probar en tu computador (sin Supabase)

```
npm install
npm run mock          # backend local en http://localhost:8787 (las migraciones reales de Supabase sobre PGlite)
npm run dev:prueba    # http://localhost:5173/?forzar=1   (VITE_APPS_SCRIPT_URL=http://localhost:8787 VITE_WRITE_KEY=W)
npm run dev:panel     # http://localhost:5174  → URL http://localhost:8787, clave R
```
El prototipo completo, navegable, queda en `…/prueba/kinoo-flujo/Flujo1_Descubrir.dc.html`.

## 7. Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Fórmulas (Fisher, Welch, UEQ-S…), textos, «Config», analítica del Panel y el SQL real de Supabase |
| `npm run e2e` | Un celular virtual hace el link completo sobre el prototipo real, el Link 2, sin red, el modo equipo, el Panel y los textos |
| `npm run carga` | Simula 10, 20 y 100 personas y mide el backend y lo que descarga el Panel |
| `npm run importar-prototipo` | Importa un prototipo de lienzo nuevo (ver el skill `kinoo-protocolo`) |
| `npm run protocolo-texto` | Extrae el texto de un protocolo .docx y lo compara con el anterior |
| `npm run hojas-sql` | Regenera `supabase/hojas.sql` si cambian las columnas en `schema.ts` |
| `npm run typecheck` / `npm run build` | TypeScript estricto / compila la app y el Panel |
| `npm run export-data` | Baja los datos a `data/` |

## 8. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| El Panel dice «no autorizado» | La `READ_KEY` no coincide con la guardada (como hash) en la tabla `claves` |
| No llegan datos | Mira **Salud** (eventos por minuto, errores) y que el celular tenga red; la app envía cada 3 s y reintenta sola |
| Quedó con código `TMP-…` | No había red al empezar; se corrige solo al volver la red |
| La pantalla del prototipo no carga | Revisa en el navegador `…/prueba/kinoo-flujo/<página>.dc.html`; si cambiaste el lienzo, vuelve a importarlo (skill `kinoo-protocolo`) |
| Una persona responde siempre lo mismo | Participantes → «excluir» |
