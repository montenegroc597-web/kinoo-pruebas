# Guía de análisis

Cómo pasar de los datos al informe, siguiendo el **Protocolo v1.3 §5**.

## 1. El flujo de trabajo (el mismo día de cada sesión)

1. **Salud** (Panel): la sesión llegó completa (4/4 fases), sin errores y sin código `TMP-…`.
2. **Codificación** (Panel): convierte lo escrito en puntajes con la clave de corrección.
   - **5 segundos → Propósito y Acción**: 1 = lo dijo correcto · 0,5 = parcialmente · 0 = incorrecto o no sabe. La clave de cada pantalla aparece junto a la respuesta (viene del protocolo y de `packages/tracking/src/catalog.ts`). Si falló, elige el **motivo** de la lista.
   - **Cards → Contenido y Acción**: igual (1 / 0,5 / 0).
   - **Primer clic → Motivo** del fallo o de un SEQ ≤ 4.
   - **Notas → Tema**: lee todas las notas y agrúpalas sin lista previa (hasta 8 temas). El tablero de afinidad se arma solo con conteo de notas, problemas y gravedad promedio.
3. Revisa cada vista; los **semáforos** usan los criterios del protocolo: verde cumple, amarillo revisar, rojo rediseñar.
4. Prioriza los hallazgos por **gravedad** (4 impide · 3 dificulta mucho · 2 molestia menor · 1 cosmético) y por **cuántas personas** lo tuvieron.
5. Para cada hallazgo de gravedad 3–4, propón un cambio concreto y pruébalo en la **siguiente ronda con participantes nuevos**.

## 2. Cómo leer cada vista

**Resumen.** La tabla de objetivos junta un indicador por prueba. Marca amarillo/rojo lo que no cumple. «Sin datos» = falta codificar o falta muestra.

**5 segundos.** Propósito ≥ 80 %, acción ≥ 70 %, claridad ≥ 5,5 (nadie bajo 3). Mira el **mapa**: si lo más recordado es decorativo (fondo, ilustración) y no la acción principal, hay un problema de jerarquía (se cruza con la prueba de marca). Recuerda: esta prueba mide primera impresión, **no** usabilidad.

**Cards.** Atención en elemento prioritario ≥ 70 %, ≥ 2 elementos recordados por card, interés ≥ 5. Si el interés de películas **conocidas** vs **no conocidas** difiere en más de 1,5, el interés depende de la película y no del diseño. Si ≥ 30 % pide la misma información faltante, replantea la jerarquía del card.

**Primer clic + SEQ.**
- *% correcto* ≥ 80 % = la estructura funciona · 60–79 % revisar etiqueta o ubicación · < 60 % rediseñar ese punto.
- *Mediana al primer clic* < 5 s es buena señal; > 10 s indica duda aunque acierte.
- *Miss clicks* ≤ 20 % bien · 21–35 % revisar · > 35 % rediseñar.
- *Elemento que roba la tarea*: si más del 25 % de los miss clicks cae en el mismo elemento, revisa su etiqueta o jerarquía.
- *SEQ* ≥ 5,5 por tarea; > 30 % de 1–4 es problema. Compara **acertaron vs fallaron**: si los que fallaron califican alto no notaron su error (falsa seguridad).
- *Mapa de calor / de clics*: cuadrícula 10 × 20 sobre la pantalla real. Mancha sobre la zona verde = la estructura funciona; mancha sobre otro elemento = ese elemento compite; puntos dispersos = nadie sabe dónde ir.
- La zona correcta es el elemento completo con **mínimo 44 × 44 px** de área de toque (medida automáticamente).

**Flujos (misiones tipo Maze).**
- *Éxito directo*: cumplió la misión sin pasar por pantallas fuera de la ruta esperada. *Indirecto*: la cumplió con desvíos. *Abandono*: «No sé / me rindo». *Por tiempo*: aceptó pasar a la siguiente. *Error de flujo*: la app falló (es un **bug**, no un error del usuario).
- *Embudo*: cuántas personas llegan a cada paso de la ruta esperada; la caída más grande es el punto a rediseñar.
- *Puntos de salida*: pantalla donde abandonan. *Misclicks*: toques que no cayeron sobre un elemento interactivo.
- *Gestos*: ← → ↑, intentos de ↑ con la carta de frente (**bloqueado** a propósito: es lo que quieres medir), mantener presionado y deshacer.

**UEQ-S.** Escala −3 a +3; > 0,8 verde, entre −0,8 y 0,8 neutro, < −0,8 rojo. Pragmática alta + hedónica baja = sirve pero no engancha; al revés = atrae pero cuesta usarla. Con 8–12 personas es tendencia (el manual del UEQ pide 20–30 para promedios estables).

**Marca A/B.** El orden de decisión (§4.5):
1. **Contraste** AA en todas las combinaciones (`npm run contrast`). Una versión que no cumple se corrige o se descarta aunque guste más.
2. **Legibilidad** ≥ 5,5 y ≥ 70 % con la primera mirada en el elemento previsto.
3. **Preferencia**: votos de «¿Cuál te resulta más agradable?» sin contar «Igual», con **prueba binomial bilateral** (α = 0,05). Ejemplo: con 12 votos decisivos hacen falta 10 para la misma versión; 8 de 12 no alcanza (es tendencia).
4. Si hay empate: mayor agrado promedio y más personas con ≥ 2 atributos deseados (cercana, cinematográfica, confiable, tranquila) y ninguno a evitar en más del 20 %.

Atención: cada participante usa **su propio celular**, así que brillo y tamaño varían; anótalo como limitación.

## 3. Exportar

**Panel → Exportar**:
- **Formato Registro v1.3**: mismas hojas y columnas que `Registro_Pruebas_Usabilidad_Kinoo_v1.3.xlsx`. Pega las hojas en la plantilla (copiar hoja a hoja o *Mover o copiar hoja*) y **Resumen, Mapas de calor y Análisis** se calculan con las fórmulas del protocolo. Las columnas extra al final (Nombre mostrado, Sesión ID, Row ID) puedes borrarlas.
- **Completo**: añade **Eventos** (cada toque, con coordenadas y tiempo), **Flujos**, **Notas** y **Errores**.
- **Anónimo**: sin nombres, para compartir.
- **CSV por hoja** y **PNG** de los mapas visibles.

## 4. Gráficos a mano en Excel (si los prefieres)

- **Misiones**: tabla dinámica sobre la hoja **Flujos**: filas = Misión, columnas = Resultado, valores = recuento → gráfico de barras apiladas.
- **Primer clic**: tabla dinámica sobre **Primer clic + SEQ**: promedio de *Puntaje final* y de *SEQ* por Tarea; mediana con `=MEDIANA(SI(...))`.
- **SEQ**: histograma (columna *SEQ 1–7*, intervalos 1–7).
- **Mapa de calor**: en la hoja **Puntos**, columnas *X* e *Y*; crea una cuadrícula 10 × 20 con `=CONTAR.SI.CONJUNTO(X;">="&x1;X;"<"&x2;Y;">="&y1;Y;"<"&y2)` y aplica **formato condicional de escala de color**.
- **Embudo**: la columna *Notas* de **Flujos** guarda `Pasos alcanzados: 3/4 [1110]`: un dígito por paso.

## 5. Estructura del informe (protocolo §5)

1. Resumen de una página con los 5 hallazgos principales.
2. Resultados por prueba (tabla + semáforo).
3. Hallazgos priorizados con evidencia (citas, mapas de clics).
4. Cambios propuestos.
5. Limitaciones: muestra pequeña (8–12), prototipo de baja fidelidad, **cada persona en su propio celular**, sesgo de reclutamiento (18–24, Bogotá).

Fórmula para escribir cada insight: **«[n] de [N] personas [hicieron / no pudieron hacer] [X] porque [motivo]»**. Con 8–12 personas, los porcentajes son tendencia: 8 de 10 aciertos (80 %) tiene un intervalo de confianza aproximado del 49 % al 94 %. Confirma en una segunda ronda.
