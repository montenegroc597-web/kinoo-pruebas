import type { Asignacion, KinooEvent, PerfilRegistro } from './schema';
import { semillaDe } from './rotation';

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
  /** Modo equipo: no se encola, no se envía, no se persiste. */
  private inerte = false;
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
    if (this.inerte) return;
    try { this.cfg.storage?.setItem(this.cfg.storageKey, JSON.stringify(this.cola)); } catch { /* ignorar */ }
  }
  private avisar() { this.oyentes.forEach((f) => f()); }
  suscribir(f: () => void): () => void { this.oyentes.add(f); return () => this.oyentes.delete(f); }

  /** Con true el cliente no hace NADA con el servidor ni con el almacenamiento (el equipo está probando). */
  setInerte(v: boolean) { this.inerte = v; if (v) { this.cola = []; this.stop(); } }
  get esInerte(): boolean { return this.inerte; }

  enqueueEvent(e: KinooEvent) {
    if (this.inerte) return;
    this.cola.push({ kind: 'event', payload: e });
    this.guardar();
    this.avisar();
    if (this.cola.length >= this.cfg.maxLote) void this.flush();
  }
  enqueueRows(hoja: string, fila: Record<string, unknown>) {
    if (this.inerte) return;
    this.cola.push({ kind: 'rows', hoja, payload: fila });
    this.guardar();
    this.avisar();
  }
  pendientes(): number { return this.inerte ? 0 : this.cola.length; }
  red(): EstadoRed { if (this.inerte) return 'local'; return this.cola.length === 0 && this.estado !== 'local' && this.estado !== 'sin-conexion' ? 'sincronizado' : this.estado; }

  start() {
    if (this.inerte || this.timer || !this.cfg.url) return;
    this.timer = setInterval(() => void this.flush(), this.cfg.intervaloMs);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  private async post(body: unknown): Promise<{ ok: boolean; data?: any; error?: string }> {
    const res = await this.fetchFn(this.cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain no dispara el preflight CORS: una petición menos por lote
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
    if (this.inerte || !this.cfg.url || this.cola.length === 0) return;
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
    if (this.inerte || !this.cfg.url || !this.cfg.beacon || !this.cola.length) return;
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
        if (it.payload.codigo === tmp) { it.payload.codigo = a.codigo; n++; }
      } else if (it.payload.Participante === tmp) { it.payload.Participante = a.codigo; n++; }
    }
    if (n) { this.guardar(); this.avisar(); }
    return n;
  }

  // ---- llamadas directas (no van por la cola) ----
  /**
   * Configuración publicada: redacción de textos o «Config» del estudio (o su borrador, para la vista previa del equipo).
   * Es solo lectura: funciona también en modo equipo.
   */
  async leerConfig<T>(clave: ClaveConfig): Promise<T | null> {
    if (!this.cfg.url) return null;
    try { const r = await this.post({ action: 'config', key: this.cfg.key, clave }); return r.ok ? (r.data as T | null) : null; } catch { return null; }
  }
  async registrar(perfil: PerfilRegistro, sesionId: string): Promise<Asignacion & { provisional?: boolean }> {
    if (this.cfg.url && !this.inerte) {
      try {
        const r = await this.post({ action: 'register', key: this.cfg.key, sesionId, perfil });
        if (r.ok && r.data) return r.data as Asignacion;
      } catch { /* sin red: código provisional */ }
    }
    return asignacionProvisional(perfil, sesionId);
  }
  async reanudar(codigo: string, sesionId: string): Promise<(Asignacion & { partes?: number }) | null> {
    if (this.inerte || !this.cfg.url) return null;
    try {
      const r = await this.post({ action: 'resume', key: this.cfg.key, codigo, sesionId });
      return r.ok ? (r.data as Asignacion & { partes?: number }) : null;
    } catch { return null; }
  }
  /** Perfil (I1–I4) y control de atención. true si el servidor lo recibió (quien llama reintenta si es false). */
  async perfil(sesionId: string, cambios: Record<string, string | number>): Promise<boolean> {
    if (this.inerte || !this.cfg.url) return true;
    try { const r = await this.post({ action: 'profile', key: this.cfg.key, sesionId, cambios }); return !!(r.ok && r.data?.ok); } catch { return false; }
  }
  /** Partes terminadas; con `completo` el servidor marca «Completó = Sí» y calcula la duración con su propio reloj. */
  async progreso(sesionId: string, partes: number, completo: boolean): Promise<boolean> {
    if (this.inerte || !this.cfg.url) return true;
    try { const r = await this.post({ action: 'progress', key: this.cfg.key, sesionId, partes, completo }); return !!(r.ok && r.data?.ok); } catch { return false; }
  }
  async reasignar(tmp: string, asignacion: Asignacion): Promise<void> {
    if (this.inerte || !this.cfg.url) return;
    try { await this.post({ action: 'reassign', key: this.cfg.key, tmp, asignacion }); } catch { /* ignorar */ }
  }
}

export type ClaveConfig = 'textos' | 'textos-borrador' | 'estudio' | 'estudio-borrador';

/** Sin red al registrar: la sesión sigue con un código TMP-…; la card sale del sesionId (se corrige al reconectar). */
export function asignacionProvisional(perfil: PerfilRegistro, sesionId: string): Asignacion & { provisional: true } {
  return {
    codigo: 'TMP-' + sesionId.slice(0, 8),
    sesionId,
    variante: perfil.variante ?? (semillaDe(sesionId) % 2 ? 'B' : 'A'),
    flujo: perfil.flujo,
    provisional: true,
  };
}
