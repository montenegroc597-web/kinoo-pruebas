/**
 * Kinoo · Registro en vivo — Google Apps Script (Web App).
 * Escribe en el Google Sheet «Kinoo · Registro en vivo». Las hojas de entrada tienen los mismos
 * nombres y columnas que Registro_Pruebas_Usabilidad_Kinoo_v1.3.xlsx.
 *
 * Script Properties requeridas: WRITE_KEY, READ_KEY. Opcional: SHEET_ID (si el script no está ligado al Sheet).
 * NO editar el bloque COLUMNAS a mano: lo genera scripts/build-backend.mjs desde packages/tracking/src/schema.ts.
 */

var COLUMNAS = /*COLUMNAS_BEGIN*/{
 "Participantes": [
  "Código",
  "Ronda",
  "Fecha",
  "Edad",
  "Género",
  "Frecuencia de consumo",
  "Descubre en redes (Sí/No)",
  "Nivel tecnológico",
  "Orden de tareas",
  "Orden marca (A→B / B→A)",
  "Moderador/a",
  "Notas",
  "Nombre ingresado",
  "Nombre mostrado",
  "Sesión ID",
  "Orden flujos",
  "Consentimiento (fecha)",
  "Graba (Sí/No)",
  "Dispositivo",
  "Fases completadas"
 ],
 "5 segundos": [
  "Participante",
  "Pantalla ID",
  "Pantalla",
  "Flujo",
  "Versión",
  "Recuerdo libre (textual, en orden)",
  "Propósito (1/0,5/0)",
  "Acción principal (1/0,5/0)",
  "Claridad 1–7",
  "Palabra / sensación",
  "Puntos registrados",
  "Notas",
  "Motivo si no entendió propósito o acción (código)",
  "Nombre mostrado",
  "Sesión ID",
  "Row ID"
 ],
 "5 s – Cards": [
  "Participante",
  "Card",
  "Pantalla ID",
  "Flujo",
  "¿Conocía la película? (Sí/No)",
  "Primer elemento que llamó la atención",
  "¿Prioritario? (auto)",
  "Otros elementos recordados",
  "# elementos recordados",
  "Contenido (1/0,5/0)",
  "Interés 1–7",
  "Acción principal (1/0,5/0)",
  "Información que faltó",
  "Puntos registrados",
  "Notas",
  "Motivo si no captó contenido o acción (código)",
  "Nombre mostrado",
  "Sesión ID",
  "Row ID"
 ],
 "Primer clic + SEQ": [
  "Participante",
  "Tarea",
  "Orden en sesión",
  "Pantalla ID (auto)",
  "Flujo (auto)",
  "Tiempo al 1er clic (s)",
  "Resultado 1er clic (auto)",
  "Puntaje auto (1/0,5/0)",
  "Resultado manual (opcional; anula el auto)",
  "Puntaje final",
  "Clics totales",
  "Miss clicks",
  "SEQ 1–7",
  "Si SEQ ≤ 4: ¿qué la hizo difícil?",
  "¿Qué esperabas que pasara?",
  "Notas",
  "Motivo del fallo o de SEQ ≤ 4 (código)",
  "Nombre mostrado",
  "Sesión ID",
  "Row ID"
 ],
 "UEQ": [
  "Participante",
  "Versión evaluada",
  "Formato",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "Comentario libre",
  "Nombre mostrado",
  "Sesión ID",
  "Row ID"
 ],
 "Puntos": [
  "Participante",
  "Prueba",
  "Estímulo (tarea T1…T5 / card C1…C6 / par)",
  "Pantalla ID",
  "Versión",
  "N.º de clic (1 = primero)",
  "X (% ancho)",
  "Y (% alto)",
  "Celda de cuadrícula (alt., ej. C7)",
  "Tiempo desde que se mostró (s)",
  "Notas",
  "Resultado",
  "Nombre mostrado",
  "Sesión ID",
  "Row ID"
 ],
 "Marca A-B": [
  "Participante",
  "Orden visto (auto)",
  "Pantalla ID",
  "A · Agrado 1–7",
  "A · Legibilidad 1–7",
  "A · Aburrido–Emocionante 1–7",
  "A · Genérico–Distintivo 1–7",
  "A · # atributos deseados (0–3)",
  "A · # atributos a evitar (0–3)",
  "A · Primer elemento = jerarquía prevista (1/0)",
  "B · Agrado 1–7",
  "B · Legibilidad 1–7",
  "B · Aburrido–Emocionante 1–7",
  "B · Genérico–Distintivo 1–7",
  "B · # atributos deseados (0–3)",
  "B · # atributos a evitar (0–3)",
  "B · Primer elemento = jerarquía prevista (1/0)",
  "Preferencia directa (A/B/Igual)",
  "Dimensión que más pesó",
  "Motivo (textual)",
  "Notas",
  "¿Qué colores prefiere? (A/B/Igual)",
  "¿Cuál se lee mejor? (A/B/Igual)",
  "Atributo preguntado",
  "¿Cuál es más [atributo]? (A/B/Igual)",
  "A · Palabras",
  "B · Palabras",
  "A · Frío–Cálido",
  "B · Frío–Cálido",
  "A · Confuso–Claro",
  "B · Confuso–Claro",
  "Nombre mostrado",
  "Sesión ID",
  "Row ID"
 ],
 "Zonas": [
  "Tarea",
  "Pantalla ID",
  "Descripción de la zona correcta",
  "X1 (%)",
  "Y1 (%)",
  "X2 (%)",
  "Y2 (%)",
  "Alt. X1",
  "Alt. Y1",
  "Alt. X2",
  "Alt. Y2",
  "Notas",
  "Row ID"
 ],
 "Eventos": [
  "eventId",
  "sesionId",
  "codigo",
  "nombreMostrado",
  "ronda",
  "fase",
  "ts",
  "tSesion",
  "bloque",
  "estimulo",
  "pantalla",
  "version",
  "tipo",
  "x",
  "y",
  "target",
  "interactivo",
  "zona",
  "resultado",
  "nClic",
  "tTarea",
  "valor",
  "extra",
  "ua",
  "viewport"
 ],
 "Flujos": [
  "Participante",
  "Nombre mostrado",
  "Misión",
  "Flujo",
  "Orden",
  "Resultado",
  "Tiempo (s)",
  "Toques",
  "Misclicks",
  "Pantallas visitadas (ruta)",
  "Desvíos",
  "Ayuda abierta",
  "SEQ",
  "SEQ motivo",
  "Notas",
  "Sesión ID",
  "Row ID"
 ],
 "Notas": [
  "Participante",
  "Nombre mostrado",
  "Prueba",
  "Pantalla / Tarea / Card",
  "Texto",
  "Tipo",
  "Gravedad",
  "Tema",
  "Sesión ID",
  "Row ID"
 ],
 "Errores": [
  "ts",
  "codigo",
  "sesionId",
  "pantalla",
  "mensaje",
  "stack",
  "estado"
 ]
}/*COLUMNAS_END*/;
var HOJAS_ESCRIBIBLES = /*ESCRIBIBLES_BEGIN*/["Zonas","5 segundos","5 s – Cards","Primer clic + SEQ","UEQ","Puntos","Marca A-B","Flujos","Notas","Errores"]/*ESCRIBIBLES_END*/;
var PERFIL_EDITABLE = ['Edad', 'Género', 'Frecuencia de consumo', 'Descubre en redes (Sí/No)', 'Nivel tecnológico', 'Notas', 'Graba (Sí/No)', 'Dispositivo', 'Moderador/a'];
var HOJAS_LECTURA = ['Participantes', 'Config', 'Pantallas', 'Zonas', '5 segundos', '5 s – Cards', 'Primer clic + SEQ', 'UEQ', 'Puntos', 'Marca A-B', 'Contraste', 'Eventos', 'Flujos', 'Notas', 'Errores'];
var CUADRADO_LATINO = [
  ['T1', 'T2', 'T5', 'T3', 'T4'],
  ['T2', 'T3', 'T1', 'T4', 'T5'],
  ['T3', 'T4', 'T2', 'T5', 'T1'],
  ['T4', 'T5', 'T3', 'T1', 'T2'],
  ['T5', 'T1', 'T4', 'T2', 'T3']
];
var MAX_LOTE = 400;

// ---------------------------------------------------------------- utilidades puras (se replican en packages/tracking/src/names.ts)
function normalizarNombre_(n) {
  return String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function formatoTitulo_(n) {
  return String(n || '').replace(/\s+/g, ' ').trim().split(' ').map(function (w) {
    return w ? w.charAt(0).toLocaleUpperCase('es') + w.slice(1).toLocaleLowerCase('es') : w;
  }).join(' ');
}
function siguienteCodigo_(existentes) {
  var max = 0;
  existentes.forEach(function (e) {
    var m = /^P(\d+)$/.exec(e.codigo);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  var indice = max + 1;
  return { codigo: 'P' + (indice < 10 ? '0' + indice : String(indice)), indice: indice };
}
function nombreMostrado_(nombre, existentes) {
  var norm = normalizarNombre_(nombre);
  var previos = existentes.filter(function (e) { return e.nombreNorm === norm; });
  var conBase = previos.filter(function (e) { return e.nombreBase; })[0];
  var base = conBase ? conBase.nombreBase : formatoTitulo_(nombre);
  return base + ' ' + (previos.length + 1);
}
function asignar_(nombre, existentes, sesionId) {
  var s = siguienteCodigo_(existentes);
  return {
    codigo: s.codigo,
    nombreMostrado: nombreMostrado_(nombre, existentes),
    sesionId: sesionId,
    ordenTareas: CUADRADO_LATINO[(s.indice - 1) % 5].join('-'),
    ordenMarca: (s.indice - 1) % 2 === 0 ? 'A→B' : 'B→A',
    ordenFlujos: (s.indice - 1) % 2 === 0 ? 'Descubrir→Ver' : 'Ver→Descubrir'
  };
}

// ---------------------------------------------------------------- Sheets
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}
function hoja_(nombre) {
  var ss = ss_();
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    var cols = COLUMNAS[nombre];
    if (cols) {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]);
      sh.setFrozenRows(1);
    }
  }
  return sh;
}
function encabezados_(sh) {
  var lc = sh.getLastColumn();
  if (lc < 1) return [];
  return sh.getRange(1, 1, 1, lc).getValues()[0].map(String);
}
function idxCol_(heads, candidatos) {
  for (var i = 0; i < candidatos.length; i++) {
    var k = heads.indexOf(candidatos[i]);
    if (k >= 0) return k;
  }
  return -1;
}
function filaDesdeObjeto_(heads, obj) {
  return heads.map(function (h) {
    var v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  });
}
function leerParticipantes_() {
  var sh = hoja_('Participantes');
  var heads = encabezados_(sh);
  var last = sh.getLastRow();
  var out = [];
  if (last < 2) return { sh: sh, heads: heads, filas: [], existentes: out };
  var vals = sh.getRange(2, 1, last - 1, heads.length).getValues();
  var iCod = heads.indexOf('Código'), iIng = heads.indexOf('Nombre ingresado'), iMos = heads.indexOf('Nombre mostrado'), iSes = heads.indexOf('Sesión ID');
  vals.forEach(function (r, k) {
    var mostrado = String(r[iMos] || '');
    out.push({ codigo: String(r[iCod]), nombreNorm: normalizarNombre_(r[iIng]), nombreBase: mostrado.replace(/ \d+$/, ''), sesionId: String(r[iSes] || ''), fila: k + 2, mostrado: mostrado });
  });
  return { sh: sh, heads: heads, filas: vals, existentes: out };
}

// ---------------------------------------------------------------- acciones
function register_(b) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var p = b.perfil || {};
    var nombre = String(p.nombre || '').trim();
    if (!nombre) throw new Error('nombre vacío');
    var sesionId = String(b.sesionId || Utilities.getUuid());
    var data = leerParticipantes_();
    // idempotente: mismo sesionId → misma asignación
    for (var i = 0; i < data.existentes.length; i++) {
      if (data.existentes[i].sesionId === sesionId) return asignacionDeFila_(data, i);
    }
    var a = asignar_(nombre, data.existentes, sesionId);
    var fila = {
      'Código': a.codigo, 'Ronda': (p.ronda === undefined || p.ronda === null || p.ronda === '') ? 1 : p.ronda, 'Fecha': new Date().toISOString(), 'Edad': p.edad || '', 'Género': p.genero || '',
      'Frecuencia de consumo': p.frecuencia || '', 'Descubre en redes (Sí/No)': p.descubreRedes || '', 'Nivel tecnológico': p.nivelTec || '',
      'Orden de tareas': a.ordenTareas, 'Orden marca (A→B / B→A)': a.ordenMarca, 'Moderador/a': '', 'Notas': p.notas || '',
      'Nombre ingresado': nombre, 'Nombre mostrado': a.nombreMostrado, 'Sesión ID': sesionId, 'Orden flujos': a.ordenFlujos,
      'Consentimiento (fecha)': new Date().toISOString(), 'Graba (Sí/No)': p.graba || 'No', 'Dispositivo': p.dispositivo || '', 'Fases completadas': 0
    };
    data.sh.appendRow(filaDesdeObjeto_(data.heads, fila));
    SpreadsheetApp.flush();
    return a;
  } finally {
    lock.releaseLock();
  }
}
function asignacionDeFila_(data, i) {
  var r = data.filas[i], h = data.heads;
  return {
    codigo: String(r[h.indexOf('Código')]), nombreMostrado: String(r[h.indexOf('Nombre mostrado')]), sesionId: String(r[h.indexOf('Sesión ID')]),
    ordenTareas: String(r[h.indexOf('Orden de tareas')]), ordenMarca: String(r[h.indexOf('Orden marca (A→B / B→A)')]),
    ordenFlujos: String(r[h.indexOf('Orden flujos')]), fasesCompletadas: Number(r[h.indexOf('Fases completadas')]) || 0, reanudada: true
  };
}
function resume_(b) {
  var data = leerParticipantes_();
  for (var i = 0; i < data.existentes.length; i++) {
    if (data.existentes[i].sesionId === String(b.sesionId) && data.existentes[i].codigo === String(b.codigo)) return asignacionDeFila_(data, i);
  }
  return null;
}
/** Contexto (edad, frecuencia…): se responde después de registrar, así que se actualiza la fila por sesionId. */
function perfil_(b) {
  var data = leerParticipantes_();
  for (var i = 0; i < data.existentes.length; i++) {
    if (data.existentes[i].sesionId === String(b.sesionId)) {
      Object.keys(b.cambios || {}).forEach(function (col) {
        var c = data.heads.indexOf(col);
        if (c >= 0 && PERFIL_EDITABLE.indexOf(col) >= 0) data.sh.getRange(data.existentes[i].fila, c + 1).setValue(b.cambios[col]);
      });
      SpreadsheetApp.flush();
      return { ok: true };
    }
  }
  return { ok: false, error: 'sesión no encontrada' };
}
function phase_(b) {
  var data = leerParticipantes_();
  for (var i = 0; i < data.existentes.length; i++) {
    if (data.existentes[i].sesionId === String(b.sesionId)) {
      var col = data.heads.indexOf('Fases completadas') + 1;
      var actual = Number(data.filas[i][col - 1]) || 0;
      data.sh.getRange(data.existentes[i].fila, col).setValue(Math.max(actual, Number(b.fasesCompletadas) || 0));
      return { ok: true };
    }
  }
  return { ok: false, error: 'sesión no encontrada' };
}
function eventos_(b) {
  var evs = (b.events || []).slice(0, MAX_LOTE);
  if (!evs.length) return { aceptados: 0, duplicados: 0 };
  var sh = hoja_('Eventos');
  var heads = encabezados_(sh);
  var vistos = {};
  var last = sh.getLastRow();
  if (last > 1) {
    var desde = Math.max(2, last - 3000);
    sh.getRange(desde, 1, last - desde + 1, 1).getValues().forEach(function (r) { vistos[String(r[0])] = true; });
  }
  var nuevos = [], dup = 0;
  evs.forEach(function (e) {
    if (!e || !e.eventId) return;
    if (vistos[e.eventId]) { dup++; return; }
    vistos[e.eventId] = true;
    nuevos.push(filaDesdeObjeto_(heads, e));
    if (e.tipo === 'error') registrarError_(e);
  });
  if (nuevos.length) sh.getRange(sh.getLastRow() + 1, 1, nuevos.length, heads.length).setValues(nuevos);
  SpreadsheetApp.flush();
  return { aceptados: nuevos.length, duplicados: dup };
}
function registrarError_(e) {
  var sh = hoja_('Errores');
  var heads = encabezados_(sh);
  var ex = e.extra || {};
  sh.appendRow(filaDesdeObjeto_(heads, { ts: e.ts, codigo: e.codigo, sesionId: e.sesionId, pantalla: e.pantalla, mensaje: ex.mensaje || e.valor || '', stack: ex.stack || '', estado: ex.estado || '' }));
}
/** upsert por Row ID. filas: [{...columnas}] */
function filas_(b) {
  var nombre = b.hoja;
  if (HOJAS_ESCRIBIBLES.indexOf(nombre) < 0) throw new Error('hoja no permitida: ' + nombre);
  var filas = (b.filas || []).slice(0, MAX_LOTE);
  var sh = hoja_(nombre);
  var heads = encabezados_(sh);
  var iRow = heads.indexOf('Row ID');
  var existentes = {};
  var last = sh.getLastRow();
  if (iRow >= 0 && last > 1) {
    sh.getRange(2, iRow + 1, last - 1, 1).getValues().forEach(function (r, k) { if (r[0] !== '') existentes[String(r[0])] = k + 2; });
  }
  var nuevas = [], actualizadas = 0;
  filas.forEach(function (o) {
    var arr = filaDesdeObjeto_(heads, o);
    var rid = iRow >= 0 ? String(o['Row ID'] || '') : '';
    if (rid && existentes[rid]) {
      sh.getRange(existentes[rid], 1, 1, heads.length).setValues([arr]);
      actualizadas++;
    } else {
      if (rid) existentes[rid] = -1;
      nuevas.push(arr);
    }
  });
  if (nuevas.length) sh.getRange(sh.getLastRow() + 1, 1, nuevas.length, heads.length).setValues(nuevas);
  SpreadsheetApp.flush();
  return { nuevas: nuevas.length, actualizadas: actualizadas };
}
/** El equipo codifica desde el Panel: cambia columnas concretas de una fila por Row ID. */
function codificar_(b) {
  var sh = hoja_(b.hoja);
  var heads = encabezados_(sh);
  var iRow = heads.indexOf('Row ID');
  if (iRow < 0) throw new Error('la hoja no tiene Row ID');
  var last = sh.getLastRow();
  if (last < 2) return { ok: false };
  var ids = sh.getRange(2, iRow + 1, last - 1, 1).getValues();
  for (var k = 0; k < ids.length; k++) {
    if (String(ids[k][0]) === String(b.rowId)) {
      Object.keys(b.cambios || {}).forEach(function (col) {
        var c = heads.indexOf(col);
        if (c >= 0) sh.getRange(k + 2, c + 1).setValue(b.cambios[col]);
      });
      SpreadsheetApp.flush();
      return { ok: true };
    }
  }
  return { ok: false, error: 'Row ID no encontrado' };
}
function reasignar_(b) {
  var tmp = String(b.tmp), real = b.asignacion;
  var cambios = 0;
  HOJAS_LECTURA.forEach(function (nombre) {
    var sh = ss_().getSheetByName(nombre);
    if (!sh || sh.getLastRow() < 2) return;
    var heads = encabezados_(sh);
    var iCod = idxCol_(heads, ['Participante', 'codigo', 'Código']);
    var iNom = idxCol_(heads, ['Nombre mostrado', 'nombreMostrado']);
    if (iCod < 0) return;
    var rng = sh.getRange(2, 1, sh.getLastRow() - 1, heads.length);
    var vals = rng.getValues(), tocado = false;
    vals.forEach(function (r) {
      if (String(r[iCod]) === tmp) { r[iCod] = real.codigo; if (iNom >= 0) r[iNom] = real.nombreMostrado; cambios++; tocado = true; }
    });
    if (tocado) rng.setValues(vals);
  });
  return { cambios: cambios };
}
function seed_(b) {
  ['Config', 'Pantallas', 'Zonas', 'Contraste'].forEach(function (nombre) {
    var datos = b[nombre.toLowerCase()];
    if (!datos || !datos.length) return;
    var sh = hoja_(nombre);
    sh.clear();
    sh.getRange(1, 1, datos.length, Math.max.apply(null, datos.map(function (r) { return r.length; }))).setValues(datos.map(function (r) {
      var w = Math.max.apply(null, datos.map(function (x) { return x.length; }));
      return r.concat(Array(w - r.length).fill(''));
    }));
  });
  return { ok: true };
}
function dump_(hojas) {
  var out = {};
  (hojas && hojas.length ? hojas : HOJAS_LECTURA).forEach(function (nombre) {
    if (HOJAS_LECTURA.indexOf(nombre) < 0) return;
    var sh = ss_().getSheetByName(nombre);
    if (!sh || sh.getLastRow() < 1) { out[nombre] = { headers: COLUMNAS[nombre] || [], rows: [] }; return; }
    var all = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    out[nombre] = { headers: all[0].map(String), rows: all.slice(1) };
  });
  return out;
}
function csvCelda_(v) {
  var s = String(v === null || v === undefined ? '' : v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csv_(hoja) {
  var d = dump_([hoja])[hoja];
  if (!d) throw new Error('hoja no permitida');
  return [d.headers].concat(d.rows).map(function (r) { return r.map(csvCelda_).join(','); }).join('\n');
}
function health_() {
  var filas = {};
  HOJAS_LECTURA.forEach(function (n) { var sh = ss_().getSheetByName(n); filas[n] = sh ? Math.max(0, sh.getLastRow() - 1) : 0; });
  var ult = null, sh = ss_().getSheetByName('Eventos');
  if (sh && sh.getLastRow() > 1) ult = sh.getRange(sh.getLastRow(), 7).getValue();
  return { ok: true, filas: filas, ultimoEvento: ult };
}

/** Ejecutar UNA vez a mano desde el editor: crea todas las hojas con sus encabezados. */
function setup() {
  Object.keys(COLUMNAS).forEach(function (n) { hoja_(n); });
  ['Config', 'Pantallas', 'Contraste'].forEach(function (n) { hoja_(n); });
}

// ---------------------------------------------------------------- entrada HTTP
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function autorizado_(key, nivel) {
  var props = PropertiesService.getScriptProperties();
  var w = props.getProperty('WRITE_KEY'), r = props.getProperty('READ_KEY');
  if (nivel === 'read') return !!r && key === r;
  return (!!w && key === w) || (!!r && key === r);
}
function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    var a = b.action;
    var lectura = (a === 'seed-config' || a === 'code');
    if (!autorizado_(b.key, lectura ? 'read' : 'write')) return json_({ ok: false, error: 'no autorizado' });
    var r;
    switch (a) {
      case 'register': r = register_(b); break;
      case 'resume': r = resume_(b); break;
      case 'phase': r = phase_(b); break;
      case 'profile': r = perfil_(b); break;
      case 'events': r = eventos_(b); break;
      case 'rows': r = filas_(b); break;
      case 'reassign': r = reasignar_(b); break;
      case 'seed-config': r = seed_(b); break;
      case 'code': r = codificar_(b); break;
      default: return json_({ ok: false, error: 'acción desconocida' });
    }
    return json_({ ok: true, data: r });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
function doGet(e) {
  try {
    var p = e.parameter || {};
    if (p.action === 'health') {
      if (!autorizado_(p.key, 'write')) return json_({ ok: false, error: 'no autorizado' });
      return json_(health_());
    }
    if (!autorizado_(p.key, 'read')) return json_({ ok: false, error: 'no autorizado' });
    if (p.action === 'dump') return json_({ ok: true, data: dump_(p.hojas ? String(p.hojas).split('|') : null) });
    if (p.action === 'csv') return ContentService.createTextOutput(csv_(p.hoja)).setMimeType(ContentService.MimeType.CSV);
    return json_({ ok: false, error: 'acción desconocida' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
