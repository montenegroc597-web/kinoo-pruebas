import type { Asignacion, KinooEvent, PerfilRegistro } from './schema';
import { ordenFlujosPara, ordenMarcaPara, ordenTareasPara } from './rotation';

type Item = { kind: 'event'; payload: KinooEvent } | { kind: 'rows'; hoja: string; payload: Record<string, unknown> };

export interface ClientConfig {
  url: string;
  key: string;
  fetchFn?: typeof fetch;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  intervaloMs?: number;
  maxLote?: number;
  beacon?: ((url: string, data: string) => boolean) | null;
  storageKey?: string;
}

export type EstadoRed = 'sincronizado' | 'pendiente' | 'sin-conexion' | 'local';

/** Cola con lotes, reintentos con backoff y persistencia. Nunca bloquea la prueba si falla la red. */
export class TrackingClient {
  private cola: Item[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private vuelo: Promise<void> | null = null;
  private fallos = 0;
  private proximoIntento = 0;
  private estado: EstadoRed;
  private oyentes = new Set<() => void>();
  private cfg: Required<Pick<ClientConfig, 'intervaloMs' | 'maxLote' | 'storageKey'>> & ClientConfig;

  constructor(cfg: ClientConfig) {
    this.cfg = { intervaloMs: 3000, maxLote: 25, storageKey: 'kinoo.queue', ...cfg };
    this.estado = cfg.url ? 'sincronizado' : 'local';
    this.cargar();
  }

  private get fetchFn(): typeof fetch {
    return this.cfg.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  }
  private cargar() {
    try {
      const raw = this.cfg.storage?.getItem(this.cfg.storageKey);
      if (raw) this.cola = JSON.parse(raw) as Item[];
    } catch { /* storage bloqueado: seguimos en memoria */ }
  }
  private guardar() {
    try { this.cfg.storage?.setItem(this.cfg.storageKey, JSON.stringify(this.cola)); } catch { /* ignorar */ }
  }
  private avisar() { this.oyentes.forEach((f) => f()); }
  suscribir(f: () => void): () => void { this.oyentes.add(f); return () => this.oyentes.delete(f); }

  enqueueEvent(e: KinooEvent) {
    this.cola.push({ kind: 'event', payload: e });
    this.guardar();
    this.avisar();
    if (this.cola.length >= this.cfg.maxLote) void this.flush();
  }
  enqueueRows(hoja: string, fila: Record<string, unknown>) {
    this.cola.push({ kind: 'rows', hoja, payload: fila });
    this.guardar();
    this.avisar();
  }
  pendientes(): number { return this.cola.length; }
  red(): EstadoRed { return this.cola.length === 0 && this.estado !== 'local' && this.estado !== 'sin-conexion' ? 'sincronizado' : this.estado; }

  start() {
    if (this.timer || !this.cfg.url) return;
    this.timer = setInterval(() => void this.flush(), this.cfg.intervaloMs);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  private async post(body: unknown): Promise<{ ok: boolean; data?: any; error?: string }> {
    const res = await this.fetchFn(this.cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS (Apps Script no lo soporta)
      body: JSON.stringify(body),
    });
    return (await res.json()) as { ok: boolean; data?: any; error?: string };
  }

  /** Envía un lote. Si falla, reintenta con backoff (3, 6, 12… hasta 60 s). */
  flush(forzar = false): Promise<void> {
    if (this.vuelo) return this.vuelo; // un solo envío a la vez; quien espera recibe el mismo resultado
    this.vuelo = this.enviarLote(forzar).finally(() => { this.vuelo = null; });
    return this.vuelo;
  }

  private async enviarLote(forzar: boolean): Promise<void> {
    if (!this.cfg.url || this.cola.length === 0) return;
    if (!forzar && Date.now() < this.proximoIntento) return;
    const lote = this.cola.slice(0, this.cfg.maxLote);
    try {
      const eventos = lote.filter((i): i is Extract<Item, { kind: 'event' }> => i.kind === 'event');
      if (eventos.length) {
        const r = await this.post({ action: 'events', key: this.cfg.key, events: eventos.map((i) => i.payload) });
        if (!r.ok) throw new Error(r.error ?? 'events');
      }
      const porHoja = new Map<string, Record<string, unknown>[]>();
      for (const i of lote) if (i.kind === 'rows') porHoja.set(i.hoja, [...(porHoja.get(i.hoja) ?? []), i.payload]);
      for (const [hoja, filas] of porHoja) {
        const r = await this.post({ action: 'rows', key: this.cfg.key, hoja, filas });
        if (!r.ok) throw new Error(r.error ?? 'rows');
      }
      // se quitan los elementos enviados POR IDENTIDAD: la cola pudo cambiar durante el envío (p. ej. sendBeacon al ocultar la página)
      const enviados = new Set(lote);
      this.cola = this.cola.filter((i) => !enviados.has(i));
      this.fallos = 0;
      this.proximoIntento = 0;
      this.estado = 'sincronizado';
      this.guardar();
    } catch {
      this.fallos++;
      this.proximoIntento = Date.now() + Math.min(60000, 3000 * 2 ** (this.fallos - 1));
      this.estado = 'sin-conexion';
    } finally {
      this.avisar();
    }
  }

  /** Vaciado completo (útil en tests y al terminar la sesión). */
  async vaciar(maxIntentos = 60): Promise<boolean> {
    for (let i = 0; i < maxIntentos && this.cola.length; i++) await this.flush(true);
    return this.cola.length === 0;
  }

  /** pagehide / visibilitychange: manda lo pendiente con sendBeacon (no se puede esperar respuesta). */
  enviarConBeacon() {
    if (!this.cfg.url || !this.cfg.beacon || !this.cola.length) return;
    const eventos = this.cola.filter((i) => i.kind === 'event').map((i) => i.payload);
    if (eventos.length && this.cfg.beacon(this.cfg.url, JSON.stringify({ action: 'events', key: this.cfg.key, events: eventos }))) {
      this.cola = this.cola.filter((i) => i.kind !== 'event'); // el servidor deduplica por eventId si además llegan por flush
      this.guardar();
    }
  }

  /** Cuando llega el código definitivo, lo pendiente en la cola (todavía con TMP-…) se re-etiqueta antes de enviarse. */
  reetiquetarCola(tmp: string, a: Asignacion): number {
    let n = 0;
    for (const it of this.cola) {
      if (it.kind === 'event') {
        if (it.payload.codigo === tmp) { it.payload.codigo = a.codigo; it.payload.nombreMostrado = a.nombreMostrado; n++; }
      } else if (it.payload.Participante === tmp) {
        it.payload.Participante = a.codigo; it.payload['Nombre mostrado'] = a.nombreMostrado; n++;
      }
    }
    if (n) { this.guardar(); this.avisar(); }
    return n;
  }

  // ---- llamadas directas (no van por la cola) ----
  async registrar(perfil: PerfilRegistro, sesionId: string): Promise<Asignacion & { provisional?: boolean }> {
    if (this.cfg.url) {
      try {
        const r = await this.post({ action: 'register', key: this.cfg.key, sesionId, perfil });
        if (r.ok && r.data) return r.data as Asignacion;
      } catch { /* sin red: código provisional */ }
    }
    return asignacionProvisional(perfil.nombre, sesionId);
  }
  async reanudar(codigo: string, sesionId: string): Promise<(Asignacion & { fasesCompletadas?: number }) | null> {
    if (!this.cfg.url) return null;
    try {
      const r = await this.post({ action: 'resume', key: this.cfg.key, codigo, sesionId });
      return r.ok ? (r.data as Asignacion & { fasesCompletadas?: number }) : null;
    } catch { return null; }
  }
  async perfil(sesionId: string, cambios: Record<string, string | number>): Promise<void> {
    if (!this.cfg.url) return;
    try { await this.post({ action: 'profile', key: this.cfg.key, sesionId, cambios }); } catch { /* el perfil también viaja en los eventos 'answer' */ }
  }
  async faseCompletada(sesionId: string, fasesCompletadas: number): Promise<void> {
    if (!this.cfg.url) return;
    try { await this.post({ action: 'phase', key: this.cfg.key, sesionId, fasesCompletadas }); } catch { /* se reintenta en la siguiente fase */ }
  }
  async reasignar(tmp: string, asignacion: Asignacion): Promise<void> {
    if (!this.cfg.url) return;
    try { await this.post({ action: 'reassign', key: this.cfg.key, tmp, asignacion }); } catch { /* ignorar */ }
  }
}

/** Sin red al registrar: la sesión sigue con un código TMP-… y órdenes derivados del sesionId. */
export function asignacionProvisional(nombre: string, sesionId: string): Asignacion & { provisional: true } {
  let h = 0;
  for (const ch of sesionId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const idx = (h % 5) + 1;
  return {
    codigo: 'TMP-' + sesionId.slice(0, 8),
    nombreMostrado: nombre.trim() + ' (provisional)',
    sesionId,
    ordenTareas: ordenTareasPara(idx),
    ordenMarca: ordenMarcaPara(idx),
    ordenFlujos: ordenFlujosPara(idx),
    provisional: true,
  };
}
