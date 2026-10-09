-- Kinoo · Pruebas de usabilidad — esquema en Supabase.
-- Todo el acceso pasa por la Edge Function «kinoo» (service_role). anon/authenticated NO tienen acceso a nada.
create table if not exists public.hojas (nombre text primary key, columnas jsonb not null);
create table if not exists public.registros (
  id bigserial primary key,
  hoja text not null references public.hojas(nombre),
  row_id text,
  datos jsonb not null,
  creado timestamptz not null default now()
);
create unique index if not exists registros_hoja_row on public.registros (hoja, row_id) where row_id is not null;
create index if not exists registros_hoja_id on public.registros (hoja, id);
create table if not exists public.semillas (nombre text primary key, datos jsonb not null);
create table if not exists public.claves (nivel text primary key check (nivel in ('write','read')), hash text not null);
alter table public.hojas enable row level security;
alter table public.registros enable row level security;
alter table public.semillas enable row level security;
alter table public.claves enable row level security;
revoke all on public.hojas, public.registros, public.semillas, public.claves from anon, authenticated;
revoke all on sequence public.registros_id_seq from anon, authenticated;

create or replace function public.kinoo_norm(n text) returns text language sql immutable set search_path = public as $$
  select btrim(regexp_replace(lower(regexp_replace(normalize(coalesce(n,''), NFD), '[̀-ͯ]', '', 'g')), '\s+', ' ', 'g'))
$$;
create or replace function public.kinoo_titulo(n text) returns text language sql immutable set search_path = public as $$
  select coalesce(string_agg(upper(left(w,1)) || lower(substr(w,2)), ' ' order by o), '')
  from regexp_split_to_table(btrim(regexp_replace(coalesce(n,''), '\s+', ' ', 'g')), ' ') with ordinality as t(w,o)
$$;
-- Normaliza un objeto a las columnas de la hoja (faltantes → '', objetos → texto JSON), como hacía la hoja de cálculo.
create or replace function public.kinoo_fila(p_hoja text, p_obj jsonb) returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_object_agg(c, case
      when p_obj -> c is null or jsonb_typeof(p_obj -> c) = 'null' then to_jsonb(''::text)
      when jsonb_typeof(p_obj -> c) in ('object','array') then to_jsonb((p_obj -> c)::text)
      else p_obj -> c end), '{}'::jsonb)
  from jsonb_array_elements_text((select columnas from public.hojas where nombre = p_hoja)) as t(c)
$$;
create or replace function public.kinoo_autorizado(p_key text, p_nivel text) returns boolean language sql stable set search_path = public as $$
  select p_key is not null and p_key <> '' and exists (
    select 1 from public.claves
    where hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex') and (nivel = 'read' or (p_nivel = 'write' and nivel = 'write')))
$$;
create or replace function public.kinoo_asignacion(d jsonb, reanudada boolean) returns jsonb language sql immutable set search_path = public as $$
  select jsonb_build_object('codigo', d->>'Código', 'nombreMostrado', d->>'Nombre mostrado', 'sesionId', d->>'Sesión ID',
    'ordenTareas', d->>'Orden de tareas', 'ordenMarca', d->>'Orden marca (A→B / B→A)', 'ordenFlujos', d->>'Orden flujos')
    || case when reanudada then jsonb_build_object('fasesCompletadas', coalesce(nullif(d->>'Fases completadas','')::numeric, 0), 'reanudada', true) else '{}'::jsonb end
$$;

create or replace function public.kinoo_api(p_accion text, p_cuerpo jsonb) returns jsonb language plpgsql set search_path = public as $$
declare
  b jsonb := coalesce(p_cuerpo, '{}'::jsonb);
  lectura boolean := p_accion in ('seed-config','code','dump');
  hojas_lectura text[] := array['Participantes','Config','Pantallas','Zonas','5 segundos','5 s – Cards','Primer clic + SEQ','UEQ','Puntos','Marca A-B','Contraste','Eventos','Flujos','Notas','Errores'];
  escribibles text[] := array['Zonas','5 segundos','5 s – Cards','Primer clic + SEQ','UEQ','Puntos','Marca A-B','Flujos','Notas','Errores'];
  latino text[] := array['T1-T2-T5-T3-T4','T2-T3-T1-T4-T5','T3-T4-T2-T5-T1','T4-T5-T3-T1-T2','T5-T1-T4-T2-T3'];
  v_res jsonb; p jsonb; v_nombre text; sesion text; norm text; idx int; cod text; base text; previos int; r jsonb;
  e jsonb; o jsonb; ex jsonb; rid text; nuevas int := 0; act int := 0; dup int := 0; acept int := 0; n int; h text; col text; colnom text; cambios jsonb; tmp text;
begin
  if not public.kinoo_autorizado(b->>'key', case when lectura then 'read' else 'write' end) then
    return jsonb_build_object('ok', false, 'error', 'no autorizado');
  end if;

  if p_accion = 'register' then
    perform pg_advisory_xact_lock(734100);
    p := coalesce(b->'perfil', '{}'::jsonb);
    v_nombre := btrim(coalesce(p->>'nombre',''));
    if v_nombre = '' then raise exception 'nombre vacío'; end if;
    sesion := coalesce(nullif(b->>'sesionId',''), gen_random_uuid()::text);
    select datos into r from registros where hoja = 'Participantes' and row_id = sesion;
    if found then return jsonb_build_object('ok', true, 'data', kinoo_asignacion(r, true)); end if;
    select coalesce(max((regexp_match(datos->>'Código', '^P(\d+)$'))[1]::int), 0) + 1 into idx from registros where hoja = 'Participantes';
    cod := 'P' || case when idx < 10 then '0' || idx else idx::text end;
    norm := kinoo_norm(v_nombre);
    select count(*), min(regexp_replace(datos->>'Nombre mostrado', ' \d+$', '')) into previos, base
      from registros where hoja = 'Participantes' and kinoo_norm(datos->>'Nombre ingresado') = norm;
    base := coalesce(base, kinoo_titulo(v_nombre));
    r := kinoo_fila('Participantes', jsonb_build_object(
      'Código', cod,
      'Ronda', case when p ? 'ronda' and jsonb_typeof(p->'ronda') <> 'null' and p->>'ronda' <> '' then p->'ronda' else '1'::jsonb end,
      'Fecha', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'Edad', coalesce(p->>'edad',''), 'Género', coalesce(p->>'genero',''), 'Frecuencia de consumo', coalesce(p->>'frecuencia',''),
      'Descubre en redes (Sí/No)', coalesce(p->>'descubreRedes',''), 'Nivel tecnológico', coalesce(p->>'nivelTec',''),
      'Orden de tareas', latino[((idx - 1) % 5) + 1], 'Orden marca (A→B / B→A)', case when (idx - 1) % 2 = 0 then 'A→B' else 'B→A' end,
      'Moderador/a', '', 'Notas', coalesce(p->>'notas',''), 'Nombre ingresado', v_nombre, 'Nombre mostrado', base || ' ' || (previos + 1),
      'Sesión ID', sesion, 'Orden flujos', case when (idx - 1) % 2 = 0 then 'Descubrir→Ver' else 'Ver→Descubrir' end,
      'Consentimiento (fecha)', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'Graba (Sí/No)', coalesce(nullif(p->>'graba',''), 'No'), 'Dispositivo', coalesce(p->>'dispositivo',''), 'Fases completadas', 0));
    insert into registros (hoja, row_id, datos) values ('Participantes', sesion, r);
    return jsonb_build_object('ok', true, 'data', kinoo_asignacion(r, false));

  elsif p_accion = 'resume' then
    select datos into r from registros where hoja = 'Participantes' and row_id = coalesce(b->>'sesionId','') and datos->>'Código' = coalesce(b->>'codigo','');
    if found then return jsonb_build_object('ok', true, 'data', kinoo_asignacion(r, true)); end if;
    return jsonb_build_object('ok', true, 'data', null);

  elsif p_accion = 'profile' then
    select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into cambios from jsonb_each(coalesce(b->'cambios','{}'::jsonb)) as t(k, v)
      where k = any (array['Edad','Género','Frecuencia de consumo','Descubre en redes (Sí/No)','Nivel tecnológico','Notas','Graba (Sí/No)','Dispositivo','Moderador/a']);
    update registros set datos = datos || cambios where hoja = 'Participantes' and row_id = coalesce(b->>'sesionId','');
    if found then return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', true)); end if;
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', false, 'error', 'sesión no encontrada'));

  elsif p_accion = 'phase' then
    update registros set datos = jsonb_set(datos, '{Fases completadas}', to_jsonb(greatest(coalesce(nullif(datos->>'Fases completadas','')::numeric, 0), coalesce(nullif(b->>'fasesCompletadas','')::numeric, 0))))
      where hoja = 'Participantes' and row_id = coalesce(b->>'sesionId','');
    if found then return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', true)); end if;
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', false, 'error', 'sesión no encontrada'));

  elsif p_accion = 'events' then
    for e in select x from jsonb_array_elements(coalesce(b->'events','[]'::jsonb)) with ordinality as t(x, ord) where ord <= 400 order by ord loop
      if e is null or jsonb_typeof(e) <> 'object' or coalesce(e->>'eventId','') = '' then continue; end if;
      insert into registros (hoja, row_id, datos) values ('Eventos', e->>'eventId', kinoo_fila('Eventos', e)) on conflict (hoja, row_id) where row_id is not null do nothing;
      get diagnostics n = row_count;
      if n = 0 then dup := dup + 1; continue; end if;
      acept := acept + 1;
      if e->>'tipo' = 'error' then
        ex := case when jsonb_typeof(e->'extra') = 'object' then e->'extra' else '{}'::jsonb end;
        insert into registros (hoja, datos) values ('Errores', kinoo_fila('Errores', jsonb_build_object('ts', e->'ts', 'codigo', e->'codigo', 'sesionId', e->'sesionId', 'pantalla', e->'pantalla',
          'mensaje', coalesce(nullif(ex->>'mensaje',''), e->>'valor', ''), 'stack', coalesce(ex->>'stack',''), 'estado', coalesce(ex->>'estado',''))));
      end if;
    end loop;
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('aceptados', acept, 'duplicados', dup));

  elsif p_accion = 'rows' then
    h := b->>'hoja';
    if h is null or not (h = any (escribibles)) then raise exception 'hoja no permitida: %', h; end if;
    for o in select x from jsonb_array_elements(coalesce(b->'filas','[]'::jsonb)) with ordinality as t(x, ord) where ord <= 400 order by ord loop
      if jsonb_typeof(o) <> 'object' then continue; end if;
      rid := nullif(o->>'Row ID','');
      if rid is null then
        insert into registros (hoja, datos) values (h, kinoo_fila(h, o)); nuevas := nuevas + 1;
      else
        insert into registros (hoja, row_id, datos) values (h, rid, kinoo_fila(h, o))
          on conflict (hoja, row_id) where row_id is not null do update set datos = excluded.datos
          returning (xmax = 0)::int into n;
        if n = 1 then nuevas := nuevas + 1; else act := act + 1; end if;
      end if;
    end loop;
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('nuevas', nuevas, 'actualizadas', act));

  elsif p_accion = 'code' then
    h := b->>'hoja';
    if not exists (select 1 from hojas where nombre = h and columnas ? 'Row ID') then raise exception 'la hoja no tiene Row ID'; end if;
    select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into cambios from jsonb_each(coalesce(b->'cambios','{}'::jsonb)) as t(k, v)
      where (select columnas from hojas where nombre = h) ? k;
    update registros set datos = datos || cambios where hoja = h and row_id = coalesce(b->>'rowId','');
    if found then return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', true)); end if;
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', false, 'error', 'Row ID no encontrado'));

  elsif p_accion = 'reassign' then
    tmp := b->>'tmp'; r := coalesce(b->'asignacion','{}'::jsonb); n := 0;
    for h in select nombre from hojas loop
      col := (select c from unnest(array['Participante','codigo','Código']) c where (select columnas from hojas where nombre = h) ? c limit 1);
      colnom := (select c from unnest(array['Nombre mostrado','nombreMostrado']) c where (select columnas from hojas where nombre = h) ? c limit 1);
      if col is null then continue; end if;
      update registros set datos = jsonb_set(case when colnom is not null then jsonb_set(datos, array[colnom], to_jsonb(r->>'nombreMostrado')) else datos end, array[col], to_jsonb(r->>'codigo'))
        where hoja = h and datos->>col = tmp;
      get diagnostics idx = row_count; n := n + idx;
    end loop;
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('cambios', n));

  elsif p_accion = 'seed-config' then
    for h in select unnest(array['Config','Pantallas','Contraste']) loop
      o := b -> lower(h);
      if o is not null and jsonb_typeof(o) = 'array' and jsonb_array_length(o) > 0 then
        insert into semillas (nombre, datos) values (h, o) on conflict (nombre) do update set datos = excluded.datos;
      end if;
    end loop;
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', true));

  elsif p_accion = 'dump' then
    v_res := '{}'::jsonb;
    foreach h in array hojas_lectura loop
      if jsonb_typeof(b->'hojas') = 'array' and jsonb_array_length(b->'hojas') > 0 and not (b->'hojas' ? h) then continue; end if;
      if exists (select 1 from semillas where nombre = h) then
        select jsonb_build_object('headers', coalesce(datos->0, '[]'::jsonb), 'rows', coalesce((select jsonb_agg(x order by ord) from jsonb_array_elements(datos) with ordinality t(x,ord) where ord > 1), '[]'::jsonb)) into r from semillas where nombre = h;
      elsif exists (select 1 from hojas where nombre = h) then
        select jsonb_build_object('headers', hh.columnas, 'rows', coalesce((
          select jsonb_agg((select jsonb_agg(coalesce(g.datos -> c, to_jsonb(''::text)) order by ord) from jsonb_array_elements_text(hh.columnas) with ordinality t(c,ord)) order by g.id)
          from registros g where g.hoja = hh.nombre), '[]'::jsonb)) into r from hojas hh where hh.nombre = h;
      else
        r := jsonb_build_object('headers', '[]'::jsonb, 'rows', '[]'::jsonb);
      end if;
      v_res := v_res || jsonb_build_object(h, r);
    end loop;
    return jsonb_build_object('ok', true, 'data', v_res);

  elsif p_accion = 'health' then
    v_res := '{}'::jsonb;
    foreach h in array hojas_lectura loop
      v_res := v_res || jsonb_build_object(h, case when exists (select 1 from semillas where nombre = h)
        then (select greatest(jsonb_array_length(datos) - 1, 0) from semillas where nombre = h)
        else (select count(*) from registros where hoja = h) end);
    end loop;
    return jsonb_build_object('ok', true, 'filas', v_res, 'ultimoEvento', (select datos->>'ts' from registros where hoja = 'Eventos' order by id desc limit 1));
  end if;
  return jsonb_build_object('ok', false, 'error', 'acción desconocida');
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end
$$;
revoke all on function public.kinoo_api(text, jsonb) from public, anon, authenticated;
revoke all on function public.kinoo_autorizado(text, text), public.kinoo_fila(text, jsonb), public.kinoo_asignacion(jsonb, boolean), public.kinoo_norm(text), public.kinoo_titulo(text) from public, anon, authenticated;
grant execute on function public.kinoo_api(text, jsonb) to service_role;
