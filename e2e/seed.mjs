// Datos sintéticos del protocolo v2.0 con resultados conocidos. Los usan los tests de analítica (en proceso), el export y el E2E del
// Panel (por HTTP). Cada envío se espera: el orden de registro decide los códigos (P01, P02…) y la card (A, B, A, B…).
//
// 12 personas + 1 piloto (ronda 0). Válidas: P01–P10 (5 con la card A: impares; 5 con la B: pares).
//   P11 no completa · P12 falla el control de atención (marca 3) · el estudio publicado pone la duración mínima en 0
//   (el servidor mide la duración con su reloj y en un test dura segundos).
export const VALIDAS = 10;
export const ESTUDIO_SEED = { umbrales: { duracionMinima: 0 } };

export async function sembrar(post) {
  const P = (i) => 'P' + String(i).padStart(2, '0');
  const rows = (hoja, filas) => post({ action: 'rows', key: 'W', hoja, filas });
  await post({ action: 'config-save', key: 'R', clave: 'estudio', datos: { version: 'seed', estudio: ESTUDIO_SEED } });

  for (let i = 1; i <= 12; i++) await post({ action: 'register', key: 'W', sesionId: 's' + i, perfil: { ronda: 1, flujo: 'Completo', dispositivo: i % 3 ? 'Android' : 'iOS' } });
  await post({ action: 'register', key: 'W', sesionId: 'piloto', perfil: { ronda: 0, flujo: 'Completo' } });
  for (let i = 1; i <= 12; i++) {
    await post({ action: 'profile', key: 'W', sesionId: 's' + i, cambios: { Edad: '18–24', 'Frecuencia de consumo': 'Una vez por semana', 'Descubre en redes (Sí/No)': 'Sí', 'Nivel tecnológico': 'Medio', 'Control de atención': i === 12 ? 3 : 5 } });
    if (i !== 11) await post({ action: 'progress', key: 'W', sesionId: 's' + i, partes: 6, completo: true });
  }
  const A = (i) => i % 2 === 1; // P01, P03… vieron la card A
  const base = (i, clave) => ({ Participante: P(i), 'Sesión ID': 's' + i, 'Row ID': `s${i}|${clave}` });
  const todos = Array.from({ length: 12 }, (_, k) => k + 1);

  // M1 · Descubrir: D2 correcto 5/5 en A y 2/5 en B · D1b 9/10 · D1d A = 6, B = 3 · sorpresa agradable 5/10 · D1a prioritario 8/10 · llega al resumen del mazo 9/10
  await rows('Descubrir', todos.map((i) => ({
    ...base(i, 'Descubrir'), 'D1a · Primer elemento que llamó la atención': i <= 8 ? 'Póster' : 'Otro', '¿Prioritario? (auto)': i <= 8 ? 1 : 0,
    'D1b · Propósito de la pantalla (1/0,5/0)': i === 10 ? 0 : 1, 'D1c · Qué haría con la card (1/0,5/0)': 1, 'D1d · Interés en la película 1–7': A(i) ? 6 : 3,
    'D2 · Gesto «me interesa» (1 correcto · 0,5 alternativo · 0 incorrecto)': A(i) || i <= 4 ? 1 : 0, 'D2 · Tiempo hasta el gesto (s)': 2 + i * 0.1, 'D2 · Toques fuera de lugar (n)': A(i) ? 0 : 2, 'D2a · SEQ 1–7': 6,
    'D3 · Gesto «no me interesa» (1 · 0,5 · 0)': 1, 'D3 · Tiempo hasta el gesto (s)': 3, 'D3 · Toques fuera de lugar (n)': 0, 'D3a · SEQ 1–7': 6,
    'D2b · Consecuencia esperada (1/0,5/0)': 1, 'D3b · Consecuencia esperada (1/0,5/0)': 1, 'D4a · Interpretación del match (1/0,5/0)': i <= 7 ? 1 : 0,
    'D4b · Sorpresa 1–7': 5, 'D4c · Tipo de sorpresa': A(i) ? 'Agradable' : 'Indiferente', 'D4d · Ganas de ver lo sugerido 1–7': 5,
    'D4 · Llegó al resumen (1/0)': i === 10 ? 0 : 1, 'D4 · Tiempo hasta el resumen (s)': i === 10 ? '' : 60 + i, 'D4e · SEQ 1–7': 6, 'D4 · Resultado de la tarea': i === 10 ? 'La saltó' : 'Terminó',
    'D2 · Gesto hecho': A(i) || i <= 4 ? 'drag:derecha' : 'drag:izquierda', 'D3 · Gesto hecho': 'drag:izquierda', 'D1b · Respuesta': 'para descubrir películas',
  })));
  // M2 · Ver: entiende el filtro sin explicación 2/10 (V1c) pero utilidad 5 → «el concepto sirve» · V2 correcto 8/10 · confianza 6
  await rows('Ver', todos.map((i) => ({
    ...base(i, 'Ver'), 'V1a · Propósito de la pantalla (1/0,5/0)': 1, 'V1b · Claridad 1–7': 6, 'V1c · Entiende para qué sirve el filtro (1/0,5/0)': i <= 2 ? 1 : 0,
    'V1d · Qué espera al moverlo (1/0,5/0)': 1, 'V2 · Mood alcanzado (1 correcto · 0,5 cercano · 0 otro)': i <= 8 ? 1 : 0, 'V2 · Mood en el que terminó': i <= 8 ? 'Solo reírme' : 'Sufrir bonito',
    'V2 · Tiempo hasta terminar (s)': 10, 'V2 · Movimientos de la barra (n)': 2, 'V2 · Toques fuera de lugar (n)': 0, 'V2a · SEQ 1–7': 6, 'V3a · ¿Era lo que esperabas?': 'Sí',
    'V3b · Utilidad del filtro 1–7': 5, 'V3c · Preferencia': 'Las dos opciones', 'V3d · Qué cambiaría del filtro': i === 1 ? 'Que se vea que se puede mover' : '',
    'V4a · Confío en la recomendación 1–7': 6, 'V4b · Entiendo por qué me la propone 1–7': 6, 'V4c · Parece conocer mis gustos 1–7': 6, 'Índice de confianza (auto, 1–7)': 6, 'V4d · Ganas de ver la película 1–7': 5,
  })));
  // M3 · Moods: «Sufrir bonito» 8/10 aciertan (2 lo confunden con «Sentir algo») · «Algo raro» 3/10 (7 «Ninguna / no sé»)
  await rows('Moods', todos.flatMap((i) => [
    { ...base(i, 'Moods|Sufrir bonito'), Mood: 'Sufrir bonito', 'M3c · Película elegida': i <= 8 ? 'Vidas pasadas' : 'Aftersun', '¿Acierta? (auto)': i <= 8 ? 1 : 0, 'Mood con el que lo confundió (auto)': i <= 8 ? '' : 'Sentir algo', 'M3c · Tiempo (s)': 4 },
    { ...base(i, 'Moods|Algo raro'), Mood: 'Algo raro', 'M3c · Película elegida': i <= 3 ? 'Todo en todas partes' : 'Ninguna / no sé', '¿Acierta? (auto)': i <= 3 ? 1 : 0, 'Mood con el que lo confundió (auto)': i <= 3 ? '' : 'Ninguna / no sé', 'M3c · Tiempo (s)': 9 },
  ]));
  // M3d: Titanic → «Sufrir bonito» 7/10; 4 personas lo llaman «drama de amor»
  await rows('Películas', todos.map((i) => ({
    ...base(i, 'Películas|Titanic'), 'Película': 'Titanic', 'M3d · Mood con el que la asocia': i <= 7 ? 'Sufrir bonito' : 'Sentir algo', '¿Coincide con el previsto? (auto)': i <= 7 ? 1 : 0,
    'M3e · Nombre que le pondría': i <= 4 ? 'Drama de amor' : 'Llorar', 'Mood previsto': 'Sufrir bonito',
  })));
  // M4 · Mazos: ideas 2/4 (50 %) · frases 3/4 (75 %) · Z3 correcto 8/10 · Z4 acierta 5/10
  await rows('Mazos', todos.map((i) => ({
    ...base(i, 'Mazos'), 'Z1 · Idea clave 1 mencionada (1/0)': 1, 'Z1 · Idea clave 2 (1/0)': 1, 'Z1 · Idea clave 3 (1/0)': 0, 'Z1 · Idea clave 4 (1/0)': 0, 'Ideas clave captadas (auto, 0–4)': 2,
    'Z2 · Frase 1': 'Verdadero', 'Z2 · Frase 2': 'Verdadero', 'Z2 · Frase 3': 'Falso', 'Z2 · Frase 4': 'Verdadero', 'Frases acertadas (auto, 0–4)': 3,
    'Z3 · Primer clic para controlar el contenido (1 · 0,5 · 0)': i <= 8 ? 1 : 0, 'Z3 · Tiempo al primer clic (s)': 3, 'Z3a · SEQ 1–7': 5,
    'Z4 · Consecuencia que espera': i <= 5 ? 'Veré menos películas, más ajustadas a mis gustos' : 'No sé', '¿Acierta? (auto)': i <= 5 ? 1 : 0, 'Z5a · Claridad de cómo funciona 1–7': 5, 'Z5b · Utilidad de tener mazos 1–7': 6,
  })));
  // M5 · Percepción: F1 = 6, F2 = 5, UEQ-S pragmática y hedónica = +3
  await rows('Percepción', todos.map((i) => ({
    ...base(i, 'Percepción'), 'F1 · Qué tan chévere 1–7': 6, 'F2 · Probabilidad de usar una app así 1–7': 5,
    'F3 · UEQ-S ítem 6: aburrido (1) – emocionante (7)': 7, 'F3 · UEQ-S ítem 7: no interesante (1) – interesante (7)': 7, 'F3 · UEQ-S ítem 10: original (1) – convencional (7)': 1,
    'F3 · UEQ-S ítem 11: obstructivo (1) – de apoyo (7)': 7, 'F3 · UEQ-S ítem 13: complicado (1) – fácil (7)': 7, 'F3 · UEQ-S ítem 15: habitual (1) – de vanguardia (7)': 7,
    'F3 · UEQ-S ítem 20: ineficiente (1) – eficiente (7)': 7, 'F3 · UEQ-S ítem 21: claro (1) – confuso (7)': 1, 'F4 · Qué cambiaría (texto)': i === 1 ? 'Más claridad en el filtro' : '',
  })));
  await rows('Puntos', [
    { ...base(1, 'Puntos|D2-1'), 'Módulo': 'Descubrir', Tarea: 'D2', 'N.º de toque (1 = primero)': 1, 'Tipo (toque / gesto)': 'gesto', 'Dirección': 'derecha', 'X (% ancho)': 50, 'Y (% alto)': 40, Resultado: 'decisivo' },
    { ...base(99, 'Puntos|D2-1'), Participante: 'P99', 'Módulo': 'Descubrir', Tarea: 'D2', 'X (% ancho)': 1, 'Y (% alto)': 1, Resultado: 'fuera de lugar' },
  ]);
  await rows('Notas', [{ ...base(1, 'Notas|F4'), 'Módulo': 'Percepción', Pregunta: 'F4', Texto: 'Mi hermana Persona3 me la mostró' }]);
  const ahora = new Date().toISOString();
  await post({ action: 'events', key: 'W', events: [
    { eventId: 'x1', sesionId: 's1', codigo: 'P01', ts: ahora, tipo: 'drag', bloque: 'descubrir', estimulo: 'D2', valor: 'derecha', pantalla: 'Flujo1_Descubrir.dc.html' },
    { eventId: 'x2', sesionId: 's2', codigo: 'P02', ts: ahora, tipo: 'tap', bloque: 'descubrir', estimulo: 'D2', pantalla: 'Flujo1_Descubrir.dc.html' },
    { eventId: 'x3', sesionId: 's1', codigo: 'P01', ts: ahora, tipo: 'error', bloque: 'ver', pantalla: 'FlujoV1_Feed.dc.html', extra: { mensaje: 'boom' } },
  ] });
}
