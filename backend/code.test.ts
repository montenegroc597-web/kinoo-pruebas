// @vitest-environment node
// Prueba el Code.gs REAL contra un Sheet simulado.
import { describe, it, expect, beforeEach } from 'vitest';
// @ts-expect-error módulo .mjs sin tipos
import { crearBackend } from '../e2e/fake-gas.mjs';
import { COLUMNAS, HOJAS } from '../packages/tracking/src/schema';

type B = { post: (b: any) => any; get: (p: any) => any; sheet: (n: string) => any };
let b: B;
beforeEach(async () => { b = await crearBackend(); });

const reg = (nombre: string, sesionId: string, extra: any = {}) => b.post({ action: 'register', key: 'W', sesionId, perfil: { nombre, ronda: 1, ...extra } });

describe('autorización', () => {
  it('rechaza claves malas', () => {
    expect(b.post({ action: 'register', key: 'x', perfil: { nombre: 'a' } }).ok).toBe(false);
    expect(b.get({ action: 'dump', key: 'W' }).ok).toBe(false); // WRITE_KEY no lee
    expect(b.get({ action: 'dump', key: 'R' }).ok).toBe(true);
    expect(b.post({ action: 'seed-config', key: 'W' }).ok).toBe(false);
  });
});

describe('registro de participantes', () => {
  it('Juan 1, Juan 2, Juan 3 y códigos P01..P03', () => {
    const a = reg('Juan', 's1').data, c = reg(' juan ', 's2').data, d = reg('JUÁN', 's3').data;
    expect([a.codigo, c.codigo, d.codigo]).toEqual(['P01', 'P02', 'P03']);
    expect([a.nombreMostrado, c.nombreMostrado, d.nombreMostrado]).toEqual(['Juan 1', 'Juan 2', 'Juan 3']);
    expect(a.ordenTareas).toBe('T1-T2-T5-T3-T4');
    expect(c.ordenTareas).toBe('T2-T3-T1-T4-T5');
    expect([a.ordenMarca, c.ordenMarca]).toEqual(['A→B', 'B→A']);
  });
  it('es idempotente por sesionId (reintento no duplica)', () => {
    const a = reg('Ana', 's1').data, a2 = reg('Ana', 's1').data;
    expect(a2.codigo).toBe(a.codigo);
    expect(b.sheet('Participantes').getLastRow()).toBe(2);
  });
  it('mismo nombre en otra ronda sigue contando', () => {
    reg('Ana', 's1', { ronda: 1 });
    expect(reg('Ana', 's2', { ronda: 2 }).data.nombreMostrado).toBe('Ana 2');
  });
  it('guarda el perfil y el dispositivo en Participantes', () => {
    reg('Ana', 's1', { edad: 25, dispositivo: 'iPhone 390x844', frecuencia: 'Una vez por semana' });
    const d = b.get({ action: 'dump', key: 'R', hojas: 'Participantes' }).data.Participantes;
    const h = d.headers, r = d.rows[0];
    expect(r[h.indexOf('Edad')]).toBe(25);
    expect(r[h.indexOf('Dispositivo')]).toBe('iPhone 390x844');
    expect(r[h.indexOf('Nombre mostrado')]).toBe('Ana 1');
  });
  it('rechaza nombre vacío', () => { expect(reg('  ', 's1').ok).toBe(false); });
  it('reanuda y registra fases completadas', () => {
    const a = reg('Ana', 's1').data;
    expect(b.post({ action: 'phase', key: 'W', sesionId: 's1', fasesCompletadas: 2 }).data.ok).toBe(true);
    b.post({ action: 'phase', key: 'W', sesionId: 's1', fasesCompletadas: 1 }); // no retrocede
    const r = b.post({ action: 'resume', key: 'W', sesionId: 's1', codigo: a.codigo }).data;
    expect(r.fasesCompletadas).toBe(2);
    expect(r.nombreMostrado).toBe('Ana 1');
    expect(b.post({ action: 'resume', key: 'W', sesionId: 'otra', codigo: 'P01' }).data).toBeNull();
  });
});

describe('eventos', () => {
  const ev = (id: string, extra: any = {}) => ({ eventId: id, sesionId: 's1', codigo: 'P01', nombreMostrado: 'Ana 1', ts: '2026-10-08T10:00:00Z', tipo: 'tap', pantalla: 'S02', x: 10, y: 20, ...extra });
  it('agrega y deduplica por eventId', () => {
    const r1 = b.post({ action: 'events', key: 'W', events: [ev('a'), ev('b')] }).data;
    expect(r1).toEqual({ aceptados: 2, duplicados: 0 });
    const r2 = b.post({ action: 'events', key: 'W', events: [ev('b'), ev('c')] }).data;
    expect(r2).toEqual({ aceptados: 1, duplicados: 1 });
    expect(b.sheet('Eventos').getLastRow()).toBe(4);
  });
  it('los eventos error van también a Errores', () => {
    b.post({ action: 'events', key: 'W', events: [ev('e1', { tipo: 'error', extra: { mensaje: 'boom', stack: 'x' } })] });
    expect(b.sheet('Errores').getLastRow()).toBe(2);
  });
  it('limita el tamaño del lote', () => {
    const muchos = Array.from({ length: 1000 }, (_, i) => ev('m' + i));
    expect(b.post({ action: 'events', key: 'W', events: muchos }).data.aceptados).toBe(400);
  });
});

describe('filas por hoja', () => {
  it('upsert por Row ID', () => {
    const fila = (v: number) => ({ Participante: 'P01', Tarea: 'T1', 'SEQ 1–7': v, 'Row ID': 'P01-T1' });
    expect(b.post({ action: 'rows', key: 'W', hoja: HOJAS.primerClic, filas: [fila(3)] }).data).toEqual({ nuevas: 1, actualizadas: 0 });
    expect(b.post({ action: 'rows', key: 'W', hoja: HOJAS.primerClic, filas: [fila(6)] }).data).toEqual({ nuevas: 0, actualizadas: 1 });
    const d = b.get({ action: 'dump', key: 'R', hojas: HOJAS.primerClic }).data[HOJAS.primerClic];
    expect(d.rows.length).toBe(1);
    expect(d.rows[0][d.headers.indexOf('SEQ 1–7')]).toBe(6);
  });
  it('hoja no permitida', () => {
    expect(b.post({ action: 'rows', key: 'W', hoja: 'Participantes', filas: [{}] }).ok).toBe(false);
  });
  it('codificar cambia columnas por Row ID', () => {
    b.post({ action: 'rows', key: 'W', hoja: HOJAS.cincoSeg, filas: [{ Participante: 'P01', 'Pantalla ID': 'S02', 'Row ID': 'r1' }] });
    expect(b.post({ action: 'code', key: 'R', hoja: HOJAS.cincoSeg, rowId: 'r1', cambios: { 'Propósito (1/0,5/0)': 0.5 } }).data.ok).toBe(true);
    const d = b.get({ action: 'dump', key: 'R', hojas: HOJAS.cincoSeg }).data[HOJAS.cincoSeg];
    expect(d.rows[0][d.headers.indexOf('Propósito (1/0,5/0)')]).toBe(0.5);
  });
});

describe('reasignar TMP', () => {
  it('reemplaza el código provisional en todas las hojas', () => {
    b.post({ action: 'events', key: 'W', events: [{ eventId: 'x', codigo: 'TMP-1', nombreMostrado: '', tipo: 'tap' }] });
    b.post({ action: 'rows', key: 'W', hoja: HOJAS.puntos, filas: [{ Participante: 'TMP-1', 'Row ID': 'p1' }] });
    const r = b.post({ action: 'reassign', key: 'W', tmp: 'TMP-1', asignacion: { codigo: 'P04', nombreMostrado: 'Luis 1' } }).data;
    expect(r.cambios).toBe(2);
    const e = b.get({ action: 'dump', key: 'R', hojas: HOJAS.eventos }).data[HOJAS.eventos];
    expect(e.rows[0][e.headers.indexOf('codigo')]).toBe('P04');
  });
});

describe('lectura y export', () => {
  it('dump y csv devuelven encabezados del Registro v1.3', () => {
    const d = b.get({ action: 'dump', key: 'R', hojas: 'Primer clic + SEQ|UEQ' }).data;
    expect(d['Primer clic + SEQ'].headers.slice(0, 3)).toEqual(['Participante', 'Tarea', 'Orden en sesión']);
    expect(d.UEQ.headers.length).toBe(COLUMNAS[HOJAS.ueq].length);
    const csv = b.get({ action: 'csv', key: 'R', hoja: 'Primer clic + SEQ' });
    expect(String(csv).split('\n')[0]).toContain('Participante,Tarea');
  });
  it('health informa filas', () => {
    reg('Ana', 's1');
    const h = b.get({ action: 'health', key: 'W' });
    expect(h.ok).toBe(true);
    expect(h.filas.Participantes).toBe(1);
  });
  it('seed-config llena Config/Pantallas/Zonas', () => {
    b.post({ action: 'seed-config', key: 'R', pantallas: [['ID', 'Pantalla'], ['S01', 'Inicio']], zonas: [['Tarea'], ['T1']] });
    const d = b.get({ action: 'dump', key: 'R', hojas: 'Pantallas|Zonas' }).data;
    expect(d.Pantallas.headers).toEqual(['ID', 'Pantalla']);
    expect(d.Pantallas.rows[0]).toEqual(['S01', 'Inicio']);
  });
});

describe('Code.gs está sincronizado con schema.ts', () => {
  it('todas las hojas de COLUMNAS están en Code.gs', async () => {
    const fs = await import('node:fs');
    const gs = fs.readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');
    for (const [hoja, cols] of Object.entries(COLUMNAS)) {
      expect(gs).toContain(JSON.stringify(hoja));
      expect(gs).toContain(JSON.stringify(cols[cols.length - 1]));
    }
  });
});
