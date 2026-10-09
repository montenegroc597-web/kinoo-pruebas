// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error módulo .mjs sin tipos
import { sembrar } from '../e2e/seed.mjs';

const PORT = 8799;
let srv: ChildProcess;
const post = async (b: unknown) => (await fetch(`http://localhost:${PORT}`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(b) })).json();

beforeAll(async () => {
  srv = spawn(process.execPath, ['e2e/mock-backend.mjs'], { env: { ...process.env, MOCK_PORT: String(PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(`http://localhost:${PORT}/__dump?hoja=Config`); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  await sembrar(post);
  await post({ action: 'rows', key: 'W', hoja: 'Notas', filas: [{ Participante: 'P01', Texto: 'Mi hermana Persona3 me la mostró', Tipo: 'Positivo', 'Row ID': 'n1' }] });
}, 30_000);
afterAll(() => { srv?.kill(); });

describe('export a data/ para el repositorio público', () => {
  it('baja las hojas, quita los nombres y deja CSV + xlsx', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinoo-data-'));
    const out = execFileSync(process.execPath, ['scripts/export-sheet.mjs', '--dir', dir], { env: { ...process.env, APPS_SCRIPT_URL: `http://localhost:${PORT}`, READ_KEY: 'R' }, encoding: 'utf8' });
    expect(out).toContain('Exportado');
    const archivos = fs.readdirSync(dir);
    expect(archivos).toEqual(expect.arrayContaining(['Participantes.csv', 'Flujos.csv', 'Eventos.csv', 'resumen.json']));
    expect(archivos.some((f) => /^Registro_en_vivo_\d{4}-\d{2}-\d{2}\.xlsx$/.test(f))).toBe(true);
    const todo = archivos.filter((f) => f.endsWith('.csv')).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    expect(todo).not.toMatch(/Persona\d/);          // ningún nombre en ninguna hoja
    expect(todo).not.toContain('Nombre mostrado');
    expect(fs.readFileSync(path.join(dir, 'Notas.csv'), 'utf8')).toContain('Mi hermana [nombre] me la mostró');
    expect(fs.readFileSync(path.join(dir, 'Participantes.csv'), 'utf8')).toContain('P01'); // el código sí
  });
  it('seed-config llena Config, Pantallas (S01–S08) y Contraste', async () => {
    execFileSync(process.execPath, ['scripts/contrast.mjs'], { stdio: 'ignore' }); // genera data/contraste.csv
    const out = execFileSync(process.execPath, ['scripts/seed-config.mjs'], { env: { ...process.env, APPS_SCRIPT_URL: `http://localhost:${PORT}`, READ_KEY: 'R' }, encoding: 'utf8' });
    expect(JSON.parse(out).ok).toBe(true);
    const d = (await (await fetch(`http://localhost:${PORT}/__dump?hoja=Pantallas`)).json()).data.Pantallas;
    expect(d.headers[0]).toContain('Catálogo de pantallas');
    expect(d.rows.map((r: string[]) => r[0])).toEqual(['ID', 'S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08']);
    const c = (await (await fetch(`http://localhost:${PORT}/__dump?hoja=Config`)).json()).data.Config;
    expect(c.rows.map((r: string[]) => r[0])).toEqual(expect.arrayContaining(['T1', 'T5']));
    const k = (await (await fetch(`http://localhost:${PORT}/__dump?hoja=Contraste`)).json()).data.Contraste;
    expect(k.rows.length).toBeGreaterThan(20);
  });
  it('sin secretos no exporta nada y no falla', () => {
    const out = execFileSync(process.execPath, ['scripts/export-sheet.mjs', '--dir', os.tmpdir()], { env: { ...process.env, APPS_SCRIPT_URL: '', READ_KEY: '' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(out).toBe('');
  });
});
