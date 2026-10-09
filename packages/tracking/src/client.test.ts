// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { TrackingClient, asignacionProvisional } from './client';
import type { KinooEvent } from './schema';
// @ts-expect-error módulo .mjs sin tipos
import { crearBackend } from '../../../e2e/fake-gas.mjs';

const ev = (id: string): KinooEvent => ({ eventId: id, sesionId: 's', codigo: 'P01', nombreMostrado: 'Ana 1', ronda: 1, fase: 1, ts: new Date().toISOString(), tSesion: 1, bloque: 'registro', estimulo: null, pantalla: 'S01', version: 'A', tipo: 'tap', ua: 'x', viewport: '390x844' });
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };

async function conBackend() {
  const gas = await crearBackend();
  let caido = false;
  const llamadas: any[] = [];
  const fetchFn = (async (_u: string, init: any) => {
    if (caido) throw new TypeError('network');
    const body = JSON.parse(init.body);
    llamadas.push(body.action);
    return { json: async () => gas.post(body) };
  }) as unknown as typeof fetch;
  return { gas, fetchFn, llamadas, caer: (v: boolean) => { caido = v; } };
}

describe('TrackingClient', () => {
  it('envía eventos y filas en lotes y vacía la cola', async () => {
    const { gas, fetchFn } = await conBackend();
    const c = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: mem() });
    for (let i = 0; i < 30; i++) c.enqueueEvent(ev('e' + i));
    c.enqueueRows('Puntos', { Participante: 'P01', 'Row ID': 'p1' });
    expect(await c.vaciar()).toBe(true);
    expect(gas.sheet('Eventos').getLastRow()).toBe(31);
    expect(gas.sheet('Puntos').getLastRow()).toBe(2);
    expect(c.red()).toBe('sincronizado');
  });

  it('red caída: no pierde ni duplica al volver', async () => {
    const { gas, fetchFn, caer } = await conBackend();
    const st = mem();
    const c = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: st });
    caer(true);
    for (let i = 0; i < 10; i++) c.enqueueEvent(ev('e' + i));
    await c.flush(true);
    expect(c.pendientes()).toBe(10);
    expect(c.red()).toBe('sin-conexion');
    caer(false);
    expect(await c.vaciar()).toBe(true);
    expect(gas.sheet('Eventos').getLastRow()).toBe(11);
    // un reintento duplicado no escribe de nuevo
    c.enqueueEvent(ev('e3'));
    await c.vaciar();
    expect(gas.sheet('Eventos').getLastRow()).toBe(11);
  });

  it('persiste la cola y la recupera tras recargar', async () => {
    const { gas, fetchFn, caer } = await conBackend();
    const st = mem();
    const c1 = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: st });
    caer(true);
    c1.enqueueEvent(ev('a')); c1.enqueueEvent(ev('b'));
    caer(false);
    const c2 = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: st });
    expect(c2.pendientes()).toBe(2);
    await c2.vaciar();
    expect(gas.sheet('Eventos').getLastRow()).toBe(3);
  });

  it('sin URL funciona en modo local', async () => {
    const c = new TrackingClient({ url: '', key: '', storage: mem() });
    c.enqueueEvent(ev('a'));
    await c.flush();
    expect(c.pendientes()).toBe(1);
    expect(c.red()).toBe('local');
  });

  it('registrar: online asigna; offline devuelve TMP y luego se reasigna', async () => {
    const { gas, fetchFn, caer } = await conBackend();
    const c = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: mem() });
    const a = await c.registrar({ nombre: 'Luis', ronda: 1 }, 's1');
    expect(a.codigo).toBe('P01');
    expect(a.nombreMostrado).toBe('Luis 1');
    caer(true);
    const p = await c.registrar({ nombre: 'Rosa', ronda: 1 }, 'sesion-xyz-1234');
    expect(p.codigo.startsWith('TMP-')).toBe(true);
    caer(false);
    const real = await c.registrar({ nombre: 'Rosa', ronda: 1 }, 'sesion-xyz-1234');
    expect(real.codigo).toBe('P02');
    await c.reasignar(p.codigo, real);
    expect(gas.sheet('Participantes').getLastRow()).toBe(3);
  });

  it('asignación provisional es determinista', () => {
    expect(asignacionProvisional('A', 'abc').ordenTareas).toBe(asignacionProvisional('A', 'abc').ordenTareas);
  });
});
