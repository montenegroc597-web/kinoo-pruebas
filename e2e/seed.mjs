// Datos sintéticos de 10 participantes con resultados conocidos. Los usan los tests de analítica (en proceso) y el E2E del Panel (por HTTP).
export async function sembrar(post) {
  const N = 10;
  for (let i = 1; i <= N; i++) post({ action: 'register', key: 'W', sesionId: 's' + i, perfil: { nombre: 'Persona' + i, ronda: 1 } });
  post({ action: 'register', key: 'W', sesionId: 'piloto', perfil: { nombre: 'Piloto', ronda: 0 } });
  for (let i = 1; i <= N; i++) post({ action: 'phase', key: 'W', sesionId: 's' + i, fasesCompletadas: i <= 8 ? 4 : 2 });
  const P = (i) => 'P' + String(i).padStart(2, '0');
  const rows = (hoja, filas) => post({ action: 'rows', key: 'W', hoja, filas });

  // primer clic: T1 9/10 correcto (SEQ 6), T2 5/10 (SEQ 3 los que fallan)
  const pc = [];
  for (let i = 1; i <= N; i++) {
    pc.push({ Participante: P(i), Tarea: 'T1', 'Resultado 1er clic (auto)': i <= 9 ? 'Correcto' : 'Miss click', 'Puntaje final': i <= 9 ? 1 : 0, 'Tiempo al 1er clic (s)': 2 + i * 0.1, 'Clics totales': 1, 'Miss clicks': i <= 9 ? 0 : 1, 'SEQ 1–7': 6, 'Row ID': 'a' + i });
    const ok = i <= 5;
    pc.push({ Participante: P(i), Tarea: 'T2', 'Resultado 1er clic (auto)': ok ? 'Correcto' : 'Miss click', 'Puntaje final': ok ? 1 : 0, 'Tiempo al 1er clic (s)': 4, 'Clics totales': 2, 'Miss clicks': ok ? 0 : 2, 'SEQ 1–7': ok ? 6 : 3, 'Si SEQ ≤ 4: ¿qué la hizo difícil?': ok ? '' : 'No vi dónde', 'Row ID': 'b' + i });
  }
  rows('Primer clic + SEQ', pc);
  // 5 segundos
  rows('5 segundos', Array.from({ length: N }, (_, i) => ({ Participante: P(i + 1), 'Pantalla ID': 'S02', 'Propósito (1/0,5/0)': i < 8 ? 1 : 0.5, 'Acción principal (1/0,5/0)': i < 6 ? 1 : 0, 'Claridad 1–7': 6, 'Palabra / sensación': 'cálida', 'Row ID': 'c' + i })));
  // cards: prioritario 8/10
  rows('5 s – Cards', Array.from({ length: N }, (_, i) => ({ Participante: P(i + 1), Card: 'C1', '¿Conocía la película? (Sí/No)': i < 5 ? 'Sí' : 'No', 'Primer elemento que llamó la atención': 'Póster / imagen principal', '¿Prioritario? (auto)': i < 8 ? 1 : 0, '# elementos recordados': 3, 'Interés 1–7': i < 5 ? 6 : 3, 'Información que faltó': 'la duración', 'Row ID': 'd' + i })));
  // flujos D1: 8 directos, 1 indirecto, 1 abandono
  rows('Flujos', Array.from({ length: N }, (_, i) => ({ Participante: P(i + 1), 'Misión': 'D1', Flujo: 'Descubrir', Resultado: i < 8 ? 'Éxito directo' : i === 8 ? 'Éxito indirecto' : 'Abandono', 'Tiempo (s)': 20 + i, Toques: 5, Misclicks: 1, 'Pantallas visitadas (ruta)': i < 8 ? 'S01 > S01.sheet > S06 > S05' : 'S01 > S08', 'Desvíos': i >= 8 ? 'S08' : '', 'Ayuda abierta': 0, SEQ: 6, Notas: 'Pasos alcanzados: 4/4 [' + (i < 9 ? '1111' : '1100') + ']', 'Row ID': 'e' + i })));
  // UEQ-S: ítems positivos
  rows('UEQ', Array.from({ length: N }, (_, i) => ({ Participante: P(i + 1), 'Versión evaluada': 'A', Formato: 'UEQ-S', '6': 7, '7': 7, '10': 1, '11': 7, '13': 7, '15': 7, '20': 7, '21': 1, 'Comentario libre': i === 0 ? 'Más claridad' : '', 'Row ID': 'f' + i })));
  // marca: 9 B, 1 A
  rows('Marca A-B', Array.from({ length: N }, (_, i) => ({ Participante: P(i + 1), 'Pantalla ID': 'S02', 'A · Agrado 1–7': 4, 'B · Agrado 1–7': 6, 'A · Legibilidad 1–7': 6, 'B · Legibilidad 1–7': 5, 'A · # atributos deseados (0–3)': 1, 'B · # atributos deseados (0–3)': 2, 'A · Primer elemento = jerarquía prevista (1/0)': 1, 'B · Primer elemento = jerarquía prevista (1/0)': i < 8 ? 1 : 0, 'Preferencia directa (A/B/Igual)': i === 0 ? 'A' : 'B', 'A · Palabras': 'oscura; elegante', 'B · Palabras': 'moderna', 'Row ID': 'g' + i })));
  rows('Puntos', [{ Participante: 'P01', Prueba: 'Primer clic', 'Estímulo (tarea T1…T5 / card C1…C6 / par)': 'T1', 'Pantalla ID': 'S03', 'Versión': 'A', 'N.º de clic (1 = primero)': 1, 'X (% ancho)': 50, 'Y (% alto)': 80, Resultado: 'Correcto', 'Row ID': 'h1' }, { Participante: 'P99', Prueba: 'Primer clic', 'Estímulo (tarea T1…T5 / card C1…C6 / par)': 'T1', 'Pantalla ID': 'S03', 'Versión': 'A', 'N.º de clic (1 = primero)': 1, 'X (% ancho)': 1, 'Y (% alto)': 1, Resultado: 'Miss click', 'Row ID': 'h2' }]);
  // eventos recientes y un error
  const ahora = new Date().toISOString();
  post({ action: 'events', key: 'W', events: [
    { eventId: 'x1', sesionId: 's1', codigo: 'P01', nombreMostrado: 'Persona1 1', ts: ahora, tipo: 'tap', bloque: 'primer-clic', estimulo: 'T2', target: 'S02.card', resultado: 'Miss click', pantalla: 'S02' },
    { eventId: 'x2', sesionId: 's1', codigo: 'P01', nombreMostrado: 'Persona1 1', ts: ahora, tipo: 'tap', bloque: 'primer-clic', estimulo: 'T2', target: 'S02.card', resultado: 'Miss click', pantalla: 'S02' },
    { eventId: 'x3', sesionId: 's2', codigo: 'P02', nombreMostrado: 'Persona2 1', ts: ahora, tipo: 'tap', bloque: 'primer-clic', estimulo: 'T2', target: 'header.perfil', resultado: 'Miss click', pantalla: 'S02' },
    { eventId: 'x4', sesionId: 's1', codigo: 'P01', nombreMostrado: 'Persona1 1', ts: ahora, tipo: 'error', bloque: 'flujos', pantalla: 'S04', extra: { mensaje: 'boom' } },
  ] });
}
