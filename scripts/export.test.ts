// @vitest-environment node
// Export nocturno a data/ (repositorio público): baja las hojas del v2.0 por HTTP, «Eventos» por páginas, y escribe CSV + xlsx.
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
  for (let i = 0; i < 200; i++) { try { await fetch(`http://localhost:${PORT}/__dump?hoja=Participantes`); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  await sembrar(post);
}, 60_000);
afterAll(() => { srv?.kill(); });

describe('export a data/ para el repositorio público', () => {
  it('baja las hojas del v2.0 y los eventos, y deja CSV + xlsx + resumen', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinoo-data-'));
    const out = execFileSync(process.execPath, ['scripts/export-sheet.mjs', '--dir', dir], { env: { ...process.env, APPS_SCRIPT_URL: `http://localhost:${PORT}`, READ_KEY: 'R' }, encoding: 'utf8' });
    expect(out).toContain('Exportado');
    const archivos = fs.readdirSync(dir);
    expect(archivos).toEqual(expect.arrayContaining(['Participantes.csv', 'Descubrir.csv', 'Ver.csv', 'Moods.csv', 'Películas.csv', 'Mazos.csv', 'Percepción.csv', 'Eventos.csv', 'resumen.json']));
    expect(archivos.some((f) => /^Registro_en_vivo_\d{4}-\d{2}-\d{2}\.xlsx$/.test(f))).toBe(true);
    const resumen = JSON.parse(fs.readFileSync(path.join(dir, 'resumen.json'), 'utf8'));
    expect(resumen.filas.Participantes).toBe(13);
    expect(resumen.filas.Eventos).toBe(3);
    expect(fs.readFileSync(path.join(dir, 'Participantes.csv'), 'utf8')).toContain('P01'); // el código enlaza las hojas
  });
});
