// Kinoo · Registro en vivo — Edge Function (reemplaza al Apps Script). Mismo contrato: POST {action,key,...} y GET ?action=dump|csv|health&key=...
// La autorización (WRITE_KEY / READ_KEY, guardadas como hash en public.claves) se valida dentro de public.kinoo_api.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const celdaCsv = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

async function api(accion: string, cuerpo: Record<string, unknown>) {
  const { data, error } = await db.rpc('kinoo_api', { p_accion: accion, p_cuerpo: cuerpo });
  if (error) return { ok: false, error: error.message };
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    if (req.method === 'POST') {
      const b = JSON.parse(await req.text());
      return json(await api(String(b.action ?? ''), b));
    }
    if (req.method === 'GET') {
      const p = Object.fromEntries(new URL(req.url).searchParams);
      const accion = p.action ?? '';
      if (accion === 'health') return json(await api('health', { key: p.key }));
      if (accion === 'dump') return json(await api('dump', { key: p.key, hojas: p.hojas ? p.hojas.split('|') : [] }));
      if (accion === 'csv') {
        const r = await api('dump', { key: p.key, hojas: [p.hoja ?? ''] });
        const d = r?.ok ? r.data?.[p.hoja] : null;
        if (!d) return json({ ok: false, error: r?.error ?? 'hoja no permitida' });
        const texto = [d.headers, ...d.rows].map((fila: unknown[]) => fila.map(celdaCsv).join(',')).join('\n');
        return new Response(texto, { headers: { ...cors, 'Content-Type': 'text/csv; charset=utf-8' } });
      }
      return json({ ok: false, error: 'acción desconocida' });
    }
    return json({ ok: false, error: 'método no permitido' }, 405);
  } catch (err) {
    return json({ ok: false, error: String((err as Error)?.message ?? err) });
  }
});
