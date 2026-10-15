// @vitest-environment node
// Prueba public.kinoo_api con las MISMAS migraciones que corren en Supabase (sobre PGlite, Postgres en proceso).
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
// @ts-expect-error módulo .mjs sin tipos
import { crearBackend } from '../e2e/pg-backend.mjs';
// @ts-expect-error módulo .mjs sin tipos
import { construirHojasSql } from '../scripts/hojas-sql.mjs';
import { COLUMNAS, HOJAS } from '../packages/tracking/src/schema';

type B = { post: (b: any) => Promise<any>; get: (p: any) => Promise<any>; filas: (h: string) => Promise<Record<string, any>[]>; db: any };
let b: B;
beforeEach(async () => { b = await crearBackend(); });

const reg = (sesionId: string, perfil: any = {}) => b.post({ action: 'register', key: 'W', sesionId, perfil: { ronda: 1, flujo: 'Completo', ...perfil } });
const n = async (hoja: string) => (await b.filas(hoja)).length;

describe('autorización', () => {
  it('rechaza claves malas; la WRITE_KEY no lee, ni codifica, ni publica configuración', async () => {
    expect((await reg('s1', {})).ok).toBe(true);
    expect((await b.post({ action: 'register', key: 'x', perfil: {} })).ok).toBe(false);
    expect((await b.get({ action: 'dump', key: 'W' })).ok).toBe(false);
    expect((await b.get({ action: 'dump', key: 'R' })).ok).toBe(true);
    expect((await b.post({ action: 'code', key: 'W', hoja: 'Participantes', rowId: 's1', cambios: { 'Excluir a mano (Sí)': 'Sí' } })).ok).toBe(false);
    expect((await b.post({ action: 'config-save', key: 'W', clave: 'estudio', datos: { version: 'x', estudio: {} } })).ok).toBe(false);
    expect((await b.post({ action: 'resumen-eventos', key: 'W' })).ok).toBe(false);
  });
  it('anon y authenticated no tienen acceso directo a ninguna tabla', async () => {
    const r = await b.db.query(`select count(*)::int n from information_schema.role_table_grants where grantee in ('anon','authenticated') and table_schema = 'public'`);
    expect(r.rows[0].n).toBe(0);
  });
});

describe('registro anónimo y card A/B (§0.2)', () => {
  it('códigos P01, P02… y card alternada A, B, A, B…', async () => {
    const r = [];
    for (let i = 1; i <= 4; i++) r.push((await reg('s' + i)).data);
    expect(r.map((x) => x.codigo)).toEqual(['P01', 'P02', 'P03', 'P04']);
    expect(r.map((x) => x.variante)).toEqual(['A', 'B', 'A', 'B']);
    expect(r[0].flujo).toBe('Completo');
  });
  it('el link puede fijar la card (Link 1-A / Link 1-B) y el flujo; la alternancia sigue equilibrando', async () => {
    expect((await reg('s1', { variante: 'B', flujo: 'Link 1' })).data).toMatchObject({ variante: 'B', flujo: 'Link 1' });
    expect((await reg('s2')).data.variante).toBe('A'); // B ya tiene una: le toca a A
    expect((await reg('s3', { flujo: 'Link 9' })).data.flujo).toBe('Completo');
  });
  it('registros simultáneos: códigos únicos y cards equilibradas', async () => {
    const r = await Promise.all(Array.from({ length: 20 }, (_, i) => reg('c' + i)));
    expect(new Set(r.map((x) => x.data.codigo)).size).toBe(20);
    expect(r.filter((x) => x.data.variante === 'A').length).toBe(10);
  });
  it('es idempotente por sesión, guarda versión de textos y de estudio, y el nombre que escribió', async () => {
    const a = (await reg('s1', { versionTextos: 'r1', versionEstudio: 'e1', dispositivo: 'iOS', nombre: '  Ana Prueba ' })).data;
    expect((await reg('s1')).data.codigo).toBe(a.codigo);
    expect(await n('Participantes')).toBe(1);
    const [p] = await b.filas('Participantes');
    expect(p).toMatchObject({ 'Versión de textos': 'r1', 'Versión del estudio': 'e1', Dispositivo: 'iOS', 'Completó (Sí/No)': 'No' });
    expect(p['Nombre ingresado']).toBe('Ana Prueba');
  });
  it('perfil (I1–I4) y control de atención; no deja tocar columnas ajenas', async () => {
    await reg('s1');
    await b.post({ action: 'profile', key: 'W', sesionId: 's1', cambios: { Edad: '18–24', 'Control de atención': 5, Código: 'P99', 'Excluir a mano (Sí)': 'Sí' } });
    const [p] = await b.filas('Participantes');
    expect(p).toMatchObject({ Edad: '18–24', 'Control de atención': 5, Código: 'P01', 'Excluir a mano (Sí)': '' });
  });
  it('progreso: partes sin retroceder; al completar, «Completó = Sí» y la duración con el reloj del servidor', async () => {
    await reg('s1');
    await b.post({ action: 'progress', key: 'W', sesionId: 's1', partes: 3 });
    await b.post({ action: 'progress', key: 'W', sesionId: 's1', partes: 2 });
    let [p] = await b.filas('Participantes');
    expect(p['Partes completadas']).toBe(3);
    expect(p['Completó (Sí/No)']).toBe('No');
    await b.db.query(`update registros set datos = jsonb_set(datos, '{Inicio}', to_jsonb(to_char((now() - interval '12 minutes') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))) where hoja = 'Participantes'`);
    await b.post({ action: 'progress', key: 'W', sesionId: 's1', partes: 6, completo: true });
    [p] = await b.filas('Participantes');
    expect(p['Completó (Sí/No)']).toBe('Sí');
    expect(Number(p['Duración (min)'])).toBeCloseTo(12, 0);
    const r = (await b.post({ action: 'resume', key: 'W', sesionId: 's1', codigo: 'P01' })).data;
    expect(r).toMatchObject({ codigo: 'P01', variante: 'A', partes: 6, reanudada: true });
  });
  it('exclusión manual por el equipo (READ_KEY) en Participantes', async () => {
    await reg('s1');
    expect((await b.post({ action: 'code', key: 'R', hoja: 'Participantes', rowId: 's1', cambios: { 'Excluir a mano (Sí)': 'Sí', 'Motivo de exclusión': 'siempre lo mismo', 'Variante de card (A/B)': 'B' } })).data.ok).toBe(true);
    const [p] = await b.filas('Participantes');
    expect(p).toMatchObject({ 'Excluir a mano (Sí)': 'Sí', 'Motivo de exclusión': 'siempre lo mismo', 'Variante de card (A/B)': 'A' });
  });
});

describe('filas de los módulos', () => {
  it('upsert por Row ID en las hojas del v2.0; Participantes y Eventos no se escriben con rows', async () => {
    const fila = (v: number) => ({ Participante: 'P01', 'D2a · SEQ 1–7': v, 'Row ID': 's1|Descubrir|fila' });
    expect((await b.post({ action: 'rows', key: 'W', hoja: HOJAS.descubrir, filas: [fila(3)] })).data).toEqual({ nuevas: 1, actualizadas: 0 });
    expect((await b.post({ action: 'rows', key: 'W', hoja: HOJAS.descubrir, filas: [fila(6)] })).data).toEqual({ nuevas: 0, actualizadas: 1 });
    expect((await b.filas(HOJAS.descubrir))[0]['D2a · SEQ 1–7']).toBe(6);
    expect((await b.post({ action: 'rows', key: 'W', hoja: 'Participantes', filas: [{}] })).ok).toBe(false);
    expect((await b.post({ action: 'rows', key: 'W', hoja: 'Eventos', filas: [{}] })).ok).toBe(false);
  });
  it('codificar una respuesta abierta', async () => {
    await b.post({ action: 'rows', key: 'W', hoja: HOJAS.ver, filas: [{ Participante: 'P01', 'V1c · Respuesta': 'para el ánimo', 'Row ID': 'r1' }] });
    expect((await b.post({ action: 'code', key: 'R', hoja: HOJAS.ver, rowId: 'r1', cambios: { 'V1c · Entiende para qué sirve el filtro (1/0,5/0)': 0.5 } })).data.ok).toBe(true);
    expect((await b.filas(HOJAS.ver))[0]['V1c · Entiende para qué sirve el filtro (1/0,5/0)']).toBe(0.5);
  });
});

describe('eventos', () => {
  const ev = (id: string, extra: any = {}) => ({ eventId: id, sesionId: 's1', codigo: 'P01', ts: '2026-10-14T10:00:00Z', tipo: 'tap', bloque: 'descubrir', estimulo: 'D2', ...extra });
  it('agrega, deduplica, manda los errores a Errores y limita el lote', async () => {
    expect((await b.post({ action: 'events', key: 'W', events: [ev('a'), ev('b')] })).data).toEqual({ aceptados: 2, duplicados: 0 });
    expect((await b.post({ action: 'events', key: 'W', events: [ev('b'), ev('e', { tipo: 'error', extra: { mensaje: 'boom' } })] })).data).toEqual({ aceptados: 1, duplicados: 1 });
    expect((await b.filas('Errores'))[0].mensaje).toBe('boom');
    expect((await b.post({ action: 'events', key: 'W', events: Array.from({ length: 1000 }, (_, i) => ev('m' + i)) })).data.aceptados).toBe(400);
  });
  it('paginados y resumen para Salud', async () => {
    await b.post({ action: 'events', key: 'W', events: [ev('a'), ev('b', { codigo: 'P02', sesionId: 's2' }), ev('c', { codigo: 'TMP-1' })] });
    const p1 = (await b.post({ action: 'eventos', key: 'R', codigo: 'P01' })).data;
    expect(p1.rows.length).toBe(1);
    const r = (await b.post({ action: 'resumen-eventos', key: 'R' })).data;
    expect(r).toMatchObject({ total: 3, provisionales: 1 });
    expect(r.sesiones.length).toBe(2);
  });
});

describe('configuración versionada: textos y «Config» del estudio', () => {
  it('publicar el estudio guarda la versión e historial; el borrador no pisa lo publicado', async () => {
    expect((await b.post({ action: 'config', key: 'W', clave: 'estudio' })).data).toBeNull();
    await b.post({ action: 'config-save', key: 'R', clave: 'estudio', datos: { version: 'ronda1', estudio: { claves: { V2objetivo: 'Solo reírme' } } } });
    await b.post({ action: 'config-save', key: 'R', clave: 'estudio-borrador', datos: { version: 'borrador', estudio: { claves: { V2objetivo: 'Algo raro' } } } });
    expect((await b.post({ action: 'config', key: 'W', clave: 'estudio' })).data.estudio.claves.V2objetivo).toBe('Solo reírme');
    expect((await b.post({ action: 'config', key: 'W', clave: 'estudio-borrador' })).data.estudio.claves.V2objetivo).toBe('Algo raro');
    expect((await b.post({ action: 'config-historial', key: 'R', clave: 'estudio' })).data.map((h: any) => h.version)).toEqual(['ronda1']);
  });
  it('textos: forma y tamaño', async () => {
    expect((await b.post({ action: 'config-save', key: 'R', clave: 'textos', datos: { version: 'v', textos: { 'descubrir.D1a': 'x'.repeat(701) } } })).ok).toBe(false);
    expect((await b.post({ action: 'config-save', key: 'R', clave: 'textos', datos: { textos: {} } })).ok).toBe(false);
    expect((await b.post({ action: 'config', key: 'W', clave: 'otra' })).ok).toBe(false);
  });
});

describe('hojas, archivo del v1.3 y export', () => {
  it('dump: hojas del v2.0 en el orden del Excel, sin Eventos si se excluye; las archivadas solo por nombre', async () => {
    await b.db.query(`insert into hojas (nombre, columnas) values ('v1.3 · 5 segundos', '["Participante"]') on conflict do nothing`);
    const d = (await b.post({ action: 'dump', key: 'R', excluir: ['Eventos'] })).data;
    expect(Object.keys(d)).toEqual(expect.arrayContaining(['Participantes', 'Descubrir', 'Ver', 'Moods', 'Películas', 'Mazos', 'Percepción']));
    expect(d.Eventos).toBeUndefined();
    expect(d['v1.3 · 5 segundos']).toBeUndefined();
    expect((await b.post({ action: 'dump', key: 'R', hojas: ['v1.3 · 5 segundos'] })).data['v1.3 · 5 segundos']).toBeDefined();
    expect(String(await b.get({ action: 'csv', key: 'R', hoja: 'Moods' })).split('\n')[0]).toContain('Participante,Variante (auto)');
  });
  it('la migración 003 archiva un estudio anterior sin perder filas', async () => {
    const db = b.db;
    await db.exec(`delete from hojas; insert into hojas values ('5 segundos', '["Participante","Row ID"]'); insert into registros (hoja, row_id, datos) values ('5 segundos', 'r1', '{"Participante":"P01"}');`);
    await db.exec(fs.readFileSync(new URL('./migrations/003_protocolo_v2.sql', import.meta.url), 'utf8'));
    const r = await db.query(`select hoja, datos->>'Participante' p from registros`);
    expect(r.rows).toEqual([{ hoja: 'v1.3 · 5 segundos', p: 'P01' }]);
  });
  it('hojas.sql está al día con schema.ts y crea cada hoja con sus columnas', async () => {
    const enDisco = fs.readFileSync(new URL('./hojas.sql', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(enDisco).toBe(await construirHojasSql());
    const r = await b.db.query('select nombre, columnas from hojas');
    const enDb = Object.fromEntries(r.rows.map((x: any) => [x.nombre, x.columnas]));
    for (const [hoja, cols] of Object.entries(COLUMNAS)) expect(enDb[hoja], hoja).toEqual(cols);
  });
});
