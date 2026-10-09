# Kinoo · Cómo usar la herramienta de pruebas

Esta herramienta sirve para **evaluar la app Kinoo con personas reales** y recoger los resultados en un Excel (Google Sheet) casi en tiempo real. Está formada por tres piezas:

| Pieza | Para quién | Qué hace |
|---|---|---|
| **App de prueba** (`/prueba/`) | Cada participante, en su celular | La app Kinoo real + el guion del protocolo. Registra cada toque, tiempo y respuesta |
| **Google Sheet «Kinoo · Registro en vivo»** | El equipo | El «Excel» donde llega todo, fila por fila, con las mismas hojas y columnas del `Registro_Pruebas_Usabilidad_Kinoo_v1.3.xlsx` |
| **Panel** (`/panel/`) | El equipo | Métricas con semáforo, mapas de calor sobre la pantalla real, errores de flujo, codificación y exportación |

El método es el del **Protocolo de pruebas v1.3** (`Documentos ux/`). Cuando algo no esté aquí, manda el protocolo.

---

## 1. Antes de la primera sesión (una sola vez)

1. **Despliegue**: sigue `docs/GUIA-DESPLIEGUE.md` (crear el Sheet, pegar `backend/Code.gs` en Apps Script, subir el repo a GitHub público, activar Pages y los 3 secretos). Son ~20 minutos.
2. **Llenar Config, Pantallas y Contraste del Sheet**:
   ```
   npm run contrast
   APPS_SCRIPT_URL=<url> READ_KEY=<clave> npm run seed-config
   ```
3. **Sesión piloto** con alguien externo (protocolo §0.4), usando el enlace con `?ronda=0`:
   `https://<usuario>.github.io/<repo>/prueba/?ronda=0`
   Los datos del piloto quedan marcados como ronda 0 y el Panel los excluye por defecto.
4. Abre el Panel (`/panel/`), entra con la URL del Apps Script y la `READ_KEY`, y revisa en **Salud** que el piloto llegó sin errores. Corrige lo que haya salido en el piloto.

## 2. Cómo se hace una sesión

**El participante** abre `https://<usuario>.github.io/<repo>/prueba/` **en su celular** (envía el enlace por WhatsApp o muéstrale el QR que aparece si lo abre desde un computador). La prueba es **autoguiada**: todo el guion sale en pantalla con el texto exacto del protocolo. Dura de 45 a 60 minutos y se divide en 4 fases con una pausa entre cada una:

| Fase | Qué hace el participante |
|---|---|
| **1 · Primera impresión** | Nombre y consentimiento → preguntas de contexto → test de 5 segundos (3 pantallas) → 4 tarjetas |
| **2 · Encontrar acciones** | 5 situaciones de «¿dónde tocarías?» sobre las pantallas reales, cada una con la pregunta de facilidad (SEQ) |
| **3 · Usar la app** | 5 situaciones completas (Descubrir, mazos y Ver) con SEQ + cuestionario UEQ-S |
| **4 · Marca y cierre** | Compara las dos versiones visuales (A «Noche» y B «Kino») → 3 preguntas finales |

- **Nombre y repetidos.** Al empezar escribe su nombre. La primera persona que se llame «Juan» queda como **Juan 1**, la siguiente **Juan 2**, y así (da igual si escribe «JUÁN» o «juan »). Cada fila de cada hoja queda ligada a su código (P01, P02…) y a su nombre numerado.
- **Si cierra la página**, al volver a abrir el mismo enlace en el mismo celular **retoma en la fase donde iba** (esa fase empieza desde su principio; lo ya respondido está guardado).
- **Si se cae el internet**, la prueba sigue. Todo queda en el celular y se envía cuando vuelve la red, sin duplicados.

**El moderador** (en persona o por videollamada) no necesita hacer nada durante la prueba, pero puede abrir la **barra del moderador** con un **toque largo de 2 segundos en la esquina superior derecha**:
pausar, saltar el paso actual, escribir una nota (tipo Problema / Positivo / Idea y gravedad 1–4), marcar «cambió de opinión» y ver el estado de la red. Ese toque no cuenta como clic de la prueba.

Reglas de moderación del protocolo (resumen): no ayudar, no decir «muy bien», si pregunta «¿está bien?» responder «¿qué esperarías que pasara?», y no contar nada de Kinoo antes de la prueba de 5 segundos. Detalle en `docs/GUIA-MODERADOR.md`.

## 3. Ver los resultados (Panel)

Entra a `https://<usuario>.github.io/<repo>/panel/` con la URL del Apps Script y la `READ_KEY` (no se guarda; solo vive en esa pestaña). Se actualiza solo cada 10 segundos.

| Vista | Responde |
|---|---|
| **Resumen** | ¿Cuántas personas hicieron la prueba y cumplimos las metas? (semáforo por indicador) |
| **Participantes** | Quién hizo qué; al tocar una fila, su línea de tiempo completa |
| **5 segundos / Cards** | ¿Qué pantallas comunican y qué capta la atención? + mapas de recuerdo y atención |
| **Primer clic + SEQ** | % de acierto, tiempo, **miss clicks**, SEQ, elemento que «roba» la tarea, y **mapa de calor / mapa de clics sobre la pantalla real** con la zona correcta dibujada |
| **Flujos** | Por misión: éxito directo / indirecto / abandono, embudo de pasos, rutas más frecuentes, desvíos, puntos de salida, gestos (←, →, ↑, mantener presionado, deshacer) |
| **UEQ** | Pragmática, hedónica y los pares que más bajan |
| **Marca A/B** | Agrado, legibilidad, atributos, preferencia con prueba binomial y quién gana |
| **Codificación** | Convertir respuestas escritas en 1 / 0,5 / 0 con la clave de corrección, y agrupar notas en temas (afinidad) |
| **Salud** | Eventos por minuto, sesiones activas, **errores de flujo**, tareas sin zona, sesiones incompletas |
| **Exportar** | `.xlsx` en el formato del Registro v1.3, `.xlsx` completo, `.xlsx` anónimo, CSV por hoja y PNG de los mapas |

> **Importante:** con menos de 8 personas los porcentajes son indicativos, no concluyentes. El Panel lo avisa en cada vista.
> «Propósito», «Acción» y «Contenido» **no se calculan solos**: el equipo los codifica en la vista **Codificación** con la clave del protocolo. Hasta entonces esas métricas salen «sin datos».

Cómo leer cada vista, cómo hacer los gráficos a mano en Excel y cómo armar el informe: `docs/GUIA-ANALISIS.md`.

## 4. Dónde quedan los datos

- **Google Sheet** (privado, en tu cuenta): todo, **con nombres**. Es la fuente única de verdad.
- **GitHub, carpeta `data/`** (público): cada noche (23:00 hora de Colombia) un proceso automático baja el Sheet y guarda CSV + un `.xlsx` **sin nombres** (solo el código P01, P02…; y si alguien escribió su nombre dentro de una respuesta, se tacha como `[nombre]`). También se puede ejecutar a mano desde la pestaña *Actions → Exportar datos*.

## 5. Probar todo en tu computador (sin Google)

```
npm install
npm run mock          # backend simulado en http://localhost:8787 (ejecuta el Code.gs real sobre un Sheet en memoria)
npm run dev:prueba    # http://localhost:5173/?forzar=1   (en escritorio hace falta ?forzar=1)
npm run dev:panel     # http://localhost:5174  → URL http://localhost:8787, clave R
```
(`VITE_APPS_SCRIPT_URL=http://localhost:8787 VITE_WRITE_KEY=W` al arrancar `dev:prueba`.)

Dos parámetros de ayuda, **nunca con participantes**: `?catalogo=1` muestra todas las pantallas en A y B lado a lado; `?rapido=1` acorta la mirada de 12 s de la prueba de marca (para pruebas automáticas).

## 6. Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | 100+ pruebas de lógica (fórmulas, nombres, backend, Panel, pantallas) |
| `npm run e2e` | Pruebas de extremo a extremo con un celular virtual: sesión completa, registro concurrente, sin red, retomar, moderador y Panel |
| `npm run typecheck` | TypeScript estricto |
| `npm run contrast` | Contraste WCAG AA de las versiones A y B → `data/contraste.csv` |
| `npm run seed-config` | Llena Config, Pantallas y Contraste del Sheet |
| `npm run export-data` | Baja el Sheet y lo guarda anonimizado en `data/` |
| `npm run build` | Compila la app de prueba y el Panel |

## 7. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| «Registrando…» y queda con código `TMP-…` | No hay red o el Apps Script no responde. La prueba sigue; cuando vuelve la red se corrige solo. Revisa `?action=health` |
| El Panel dice «no autorizado» | La `READ_KEY` no coincide con la de Script Properties |
| No aparecen datos en el Panel | Mira la vista **Salud** (eventos por minuto, errores) y confirma que el celular tiene red; la cola se envía cada 3 s |
| Una tarea sale «sin zona» | La zona se mide sola la primera vez que alguien hace la tarea; hazla tú una vez en el piloto |
| Cambiaste `Code.gs` | En Apps Script: *Implementar → Administrar implementaciones → Editar → Nueva versión* |
| Una persona se registró con el nombre equivocado | Corrígelo en el Sheet (hoja Participantes, «Nombre ingresado» y «Nombre mostrado») |

## 8. Qué no hace (todavía)

Comunidad, economía de sobres, modo a ciegas y captura externa (TikTok/Instagram/WhatsApp) están **fuera de alcance** de esta versión. El resumen de lo que cambió respecto al plan y lo que queda pendiente está en `AVANCES-Y-CAMBIOS.md`.
