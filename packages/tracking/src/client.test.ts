// @vitest-environment node
// El cliente de seguimiento contra el backend REAL (migraciones de Supabase sobre PGlite).
import { describe, it, expect } from 'vitest';
import { TrackingClient, asignacionProvisional } from './client';
import type { KinooEvent } from './schema';
// @ts-expect-error módulo .mjs sin tipos
import { crearBackend } from '../../../e2e/pg-backend.mjs';

const ev = (id: string): KinooEvent => ({ eventId: id, sesionId: 's', codigo: 'P01', ronda: 1, ts: new Date().toISOString(), tSesion: 1, bloque: 'descubrir', estimulo: 'D2', pantalla: 'Flujo1_Descubrir.dc.html', variante: 'A', tipo: 'tap', ua: 'x', viewport: '402x844' });
const perfil = { ronda: 1, flujo: 'Completo' as const };
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };

async function conBackend() {
  const b = await crearBackend();
  let caido = false;
  const llamadas: string[] = [];
  const fetchFn = (async (_u: string, init: any) => {
    if (caido) throw new TypeError('network');
    const body = JSON.parse(init.body);
    llamadas.push(body.action);
    const r = await b.post(body);
    return { json: async () => r };
  }) as unknown as typeof fetch;
  const filas = async (hoja: string): Promise<Record<string, any>[]> => b.filas(hoja);
  return { filas, fetchFn, llamadas, caer: (v: boolean) => { caido = v; } };
}

describe('TrackingClient', () => {
  it('envía eventos y filas en lotes y vacía la cola', async () => {
    const { filas, fetchFn } = await conBackend();
    const c = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: mem() });
    for (let i = 0; i < 30; i++) c.enqueueEvent(ev('e' + i));
    c.enqueueRows('Puntos', { Participante: 'P01', 'Row ID': 'p1' });
    expect(await c.vaciar()).toBe(true);
    expect((await filas('Eventos')).length).toBe(30);
    expect((await filas('Puntos')).length).toBe(1);
    expect(c.red()).toBe('sincronizado');
  });

  it('red caída: no pierde ni duplica al volver', async () => {
    const { filas, fetchFn, caer } = await conBackend();
    const c = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: mem() });
    caer(true);
    for (let i = 0; i < 10; i++) c.enqueueEvent(ev('e' + i));
    await c.flush(true);
    expect(c.pendientes()).toBe(10);
    expect(c.red()).toBe('sin-conexion');
    caer(false);
    expect(await c.vaciar()).toBe(true);
    expect((await filas('Eventos')).length).toBe(10);
    // un reintento duplicado no escribe de nuevo
    c.enqueueEvent(ev('e3'));
    await c.vaciar();
    expect((await filas('Eventos')).length).toBe(10);
  });

  it('persiste la cola y la recupera tras recargar', async () => {
    const { filas, fetchFn, caer } = await conBackend();
    const st = mem();
    const c1 = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: st });
    caer(true);
    c1.enqueueEvent(ev('a')); c1.enqueueEvent(ev('b'));
    caer(false);
    const c2 = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: st });
    expect(c2.pendientes()).toBe(2);
    await c2.vaciar();
    expect((await filas('Eventos')).length).toBe(2);
  });

  it('un sendBeacon durante un envío en curso no hace perder filas', async () => {
    const { filas, fetchFn } = await conBackend();
    const c = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: mem(), beacon: () => true });
    c.enqueueEvent(ev('e1')); c.enqueueEvent(ev('e2'));
    c.enqueueRows('Puntos', { Participante: 'P01', 'Row ID': 'r1' });
    c.enqueueRows('Puntos', { Participante: 'P01', 'Row ID': 'r2' });
    const envio = c.flush(true); // en vuelo
    c.enviarConBeacon(); // la página se oculta: quita los eventos de la cola
    await envio;
    expect(await c.vaciar()).toBe(true);
    expect((await filas('Puntos')).length).toBe(2); // las dos filas llegaron
  });

  it('modo equipo (inerte): no encola, no envía y no persiste nada', async () => {
    const { filas, fetchFn, llamadas } = await conBackend();
    const st = mem();
    const c = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: st });
    c.setInerte(true);
    c.enqueueEvent(ev('a')); c.enqueueRows('Puntos', { Participante: 'EQUIPO', 'Row ID': 'x' });
    expect(c.pendientes()).toBe(0);
    expect(c.red()).toBe('local');
    await c.flush(true);
    expect(await c.perfil('s', { Edad: 1 })).toBe(true);        // «éxito» sin tocar el servidor
    expect(await c.progreso('s', 4, true)).toBe(true);
    expect(await c.reanudar('P01', 's')).toBeNull();
    expect(llamadas).toEqual([]);                                 // ninguna llamada al backend
    expect((await filas('Eventos')).length).toBe(0);
    expect(st.m.size).toBe(0);                                    // nada en el almacenamiento
  });

  it('modo equipo sí puede LEER la configuración publicada (vista previa)', async () => {
    const { fetchFn } = await conBackend();
    const c = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: mem() });
    c.setInerte(true);
    expect(await c.leerConfig('textos')).toBeNull(); // todavía no hay nada publicado
    expect(await c.leerConfig('estudio')).toBeNull();
  });

  it('sin URL funciona en modo local', async () => {
    const c = new TrackingClient({ url: '', key: '', storage: mem() });
    c.enqueueEvent(ev('a'));
    await c.flush();
    expect(c.pendientes()).toBe(1);
    expect(c.red()).toBe('local');
  });

  it('registrar: online asigna; offline devuelve TMP y luego se reasigna', async () => {
    const { filas, fetchFn, caer } = await conBackend();
    const c = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: mem() });
    const a = await c.registrar(perfil, 's1');
    expect(a.codigo).toBe('P01');
    expect(a.variante).toBe('A');
    caer(true);
    const p = await c.registrar(perfil, 'sesion-xyz-1234');
    expect(p.codigo.startsWith('TMP-')).toBe(true);
    caer(false);
    const real = await c.registrar(perfil, 'sesion-xyz-1234');
    expect(real.codigo).toBe('P02');
    await c.reasignar(p.codigo, real);
    expect((await filas('Participantes')).length).toBe(2);
  });

  it('al llegar el código definitivo se re-etiqueta lo pendiente en la cola', async () => {
    const { filas, fetchFn, caer } = await conBackend();
    const c = new TrackingClient({ url: 'u', key: 'W', fetchFn, storage: mem() });
    caer(true);
    const prov = await c.registrar(perfil, 'sesion-abc-12345');
    c.enqueueEvent({ ...ev('x1'), codigo: prov.codigo });
    c.enqueueRows('Puntos', { Participante: prov.codigo, 'Row ID': 'p1' });
    caer(false);
    const real = await c.registrar(perfil, 'sesion-abc-12345');
    expect(c.reetiquetarCola(prov.codigo, real)).toBe(2);
    await c.vaciar();
    expect((await filas('Puntos'))[0].Participante).toBe('P01');
    expect((await filas('Eventos'))[0].codigo).toBe('P01');
  });

  it('asignación provisional: card determinista por sesión, o la que fija el link', () => {
    expect(asignacionProvisional(perfil, 'abc').variante).toBe(asignacionProvisional(perfil, 'abc').variante);
    expect(asignacionProvisional({ ...perfil, variante: 'B' }, 'abc').variante).toBe('B');
  });
});
