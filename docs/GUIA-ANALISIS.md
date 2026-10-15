# Guía de análisis (protocolo v2.0)

Cómo pasar de los datos al informe, siguiendo el **Protocolo de pruebas no moderadas v2.0, §6–§7**. Las metas son las de Panel → Estudio (sección G); por defecto, las del Excel.

## 1. Flujo de trabajo

1. **Participantes**: revisa quién es válido. Excluye a mano a quien responde siempre lo mismo (la herramienta ya descarta a quien no completó, falló el control de atención o duró menos de la duración mínima).
2. **Codificación** (a ciegas de la card; §0.3: dos personas por separado, discuten si difieren y se guarda el código acordado):
   - D1a → elemento de la card (marca solo si es prioritario);
   - D1b, D1c, D2b, D3b, D4a, V1a, V1c, V1d, M3a → 1 / 0,5 / 0 con la clave que aparece junto a la respuesta (sale de Estudio → B y C);
   - Z1 → qué ideas clave (K1–K4) menciona;
   - M3e → a qué mood equivale el nombre propio;
   - Notas → tipo, tema y gravedad (diagrama de afinidad).
3. Lee cada vista con su semáforo: **verde** cumple · **amarillo** revisar antes de construir · **rojo** rediseñar.
4. **Card A vs B** al final, con la regla de decisión.

## 2. Cómo leer cada vista

**M1 · Descubrir.** Comprensión (D1b, D1c) ≥ 70 %; gesto correcto (D2, D3) ≥ 80 % (amarillo ≥ 60 %); SEQ ≥ 5,5; completa el mazo y llega a su resumen ≥ 80 % (D4, con su SEQ D4e ≥ 5,5); entiende qué dice el mazo ≥ 70 % (D4a) y sorpresa agradable ≥ 60 %. Lo que confundió al completar el mazo (D4f) aparece en una lista. Los tiempos y los toques fuera de lugar no tienen meta: diagnostican vacilación. La persona termina cada tarea con «Terminé» o la salta: se puntúa el primer gesto decisivo, saltar cuenta como 0, y el Panel muestra el % que saltó cada tarea (si es alto, la tarea es demasiado difícil). En los mapas, verde = gestos decisivos (el primero y los intentos siguientes), rojo = toques fuera de lugar. Si muchas personas tocan «Quiero verla» en vez de deslizar (0,5), el gesto no es evidente.

**M2 · Ver.** Lectura combinada de V1c y V3b (§2): ≥ 50 % entiende el filtro sin explicación → la interfaz se explica sola; < 30 % pero utilidad ≥ 5 → el concepto sirve y falta una pista visual; < 30 % y utilidad < 4 → replantear el filtro. Confianza < 4,5 → mostrar mejor el «por qué te la propone».

**M3 · Moods.** El azar en M3c es 25 %. Por mood (§3): acierto ≥ 70 % y película → mood ≥ 60 % → mantener; acierto < 70 % con una confusión dominante → diferenciar o fusionar; < 50 % sin confusión dominante → renombrar (mira los nombres propios ★); acierto alto pero película → mood bajo → cambiar la película o la definición. Un mood en rojo no invalida el módulo: se rediseña y se vuelve a probar solo ese mood.

**M4 · Mazos.** Ideas clave ≥ 60 % y frases ≥ 75 %. Una frase con muchos errores señala un malentendido concreto (p. ej. confundir mazo con lista guardada). Z1 bajo con Z2 alto = entienden cuando se les da la opción pero no lo deducen solos: falta una pista o un nombre más claro.

**M5 · Percepción.** «Chévere» ≥ 5,5; intención de uso ≥ 5; UEQ-S pragmática y hedónica > 0,8 (entre −0,8 y 0,8 neutra). El gráfico ordena los pares de peor a mejor.

## 3. Card A vs B (§6)

- Cada persona vio una sola card. Porcentajes → **Fisher exacta**; escalas, tiempos y UEQ-S → **t de Welch** (bilaterales).
- Veredicto: **Diferencia clara** (p < α) · **Tendencia** (diferencia ≥ mínimo relevante: 20 puntos, 1 punto en 1–7, 0,5 en UEQ-S o 20 % en tiempos, sin significancia) · **Sin diferencia**. «(n pequeño)» con menos de 12 por card.
- **Regla:** gana la card con diferencia clara a su favor en al menos 1 de las 5 primarias (★: D1b, D1c, D2, D3, D1d) y ninguna clara en contra. Solo tendencias → ampliar a 20 por card. Sin diferencias → decidir por criterios de equipo. Las otras 17 métricas explican, no deciden.
- El Panel usa los grados de libertad de Welch sin truncar; el Excel los trunca a un entero (Anexo F), así que el p puede variar en el tercer decimal.

## 4. Reporte (§7)

Resumen ejecutivo de una página (personas válidas por card, semáforo, 3 decisiones) → un apartado por módulo (porcentaje de personas que hizo bien cada cosa, motivos, citas, qué cambia) → card A vs B (veredictos, primarias, decisión) → moods (acierto, confusión, nombre propio, decisión por mood) → limitaciones (Anexo F) y próximos pasos. Exporta el `.xlsx` en formato v2.0 y pégalo en la plantilla del Registro para las gráficas del Excel; los mapas se descargan en PNG desde cada vista.
