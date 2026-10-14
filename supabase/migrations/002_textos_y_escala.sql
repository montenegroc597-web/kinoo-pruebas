-- Kinoo · 002 — textos editables desde el Panel y lectura escalable (10–100+ participantes).
-- Aditiva: no borra ni cambia datos existentes. Reemplaza public.kinoo_api con las acciones nuevas:
--   config / config-save / config-historial  → redacción de los textos (versionada)
--   resumen-eventos                          → lo que el Panel necesita de «Eventos», ya agregado en el servidor
--   eventos                                  → eventos paginados (línea de tiempo de un participante, export)
--   dump {excluir:[…]}                       → el Panel ya no descarga «Eventos» cada vez que refresca

-- 1) Redacción de textos: «textos» = publicada (la usan los participantes), «textos-borrador» = vista previa del equipo.
create table if not exists public.config (
  clave text primary key check (clave in ('textos', 'textos-borrador')),
  datos jsonb not null,
  actualizado timestamptz not null default now()
);
create table if not exists public.config_historial (
  id bigserial primary key,
  clave text not null,
  datos jsonb not null,
  creado timestamptz not null default now()
);
alter table public.config enable row level security;
alter table public.config_historial enable row level security;
revoke all on public.config, public.config_historial from anon, authenticated;
revoke all on sequence public.config_historial_id_seq from anon, authenticated;

-- 2) Cada participante queda marcado con la versión de textos que vio (al final, para no mover las columnas del Registro v1.3).
update public.hojas set columnas = columnas || '["Versión de textos"]'::jsonb
  where nombre = 'Participantes' and not columnas ? 'Versión de textos';

-- 3) Índices para leer eventos por participante y por bloque sin recorrer toda la tabla.
create index if not exists registros_eventos_codigo on public.registros ((datos->>'codigo'), id) where hoja = 'Eventos';
create index if not exists registros_eventos_bloque on public.registros ((datos->>'bloque'), (datos->>'tipo')) where hoja = 'Eventos';
create index if not exists registros_eventos_creado on public.registros (creado) where hoja = 'Eventos';

-- 4) Textos: leer, guardar (borrador o publicar) e historial.
create or replace function public.kinoo_config(p_accion text, b jsonb) returns jsonb language plpgsql set search_path = public as $$
declare
  v_clave text := coalesce(nullif(b->>'clave', ''), 'textos');
  d jsonb := b->'datos';
  t jsonb;
  r jsonb;
begin
  if v_clave not in ('textos', 'textos-borrador') then raise exception 'clave no permitida: %', v_clave; end if;
  if p_accion = 'config' then
    select datos into r from config where clave = v_clave;
    return jsonb_build_object('ok', true, 'data', r);
  elsif p_accion = 'config-historial' then
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'creado', creado, 'version', datos->>'version', 'nota', datos->>'nota', 'textos', datos->'textos') order by id desc), '[]'::jsonb)
      into r from (select * from config_historial where clave = 'textos' order by id desc limit 50) h;
    return jsonb_build_object('ok', true, 'data', r);
  end if;
  -- config-save: la validación fina (claves, marcadores, escalas) la hace el Panel con validarTextos; aquí solo forma y tamaño.
  t := d->'textos';
  if d is null or jsonb_typeof(d) <> 'object' or t is null or jsonb_typeof(t) <> 'object' then raise exception 'datos inválidos'; end if;
  if coalesce(btrim(d->>'version'), '') = '' then raise exception 'falta el nombre de la versión'; end if;
  if (select count(*) from jsonb_each(t)) > 400 then raise exception 'demasiados textos'; end if;
  if exists (select 1 from jsonb_each(t) e where jsonb_typeof(e.value) <> 'string' or length(e.value #>> '{}') > 700 or length(e.key) > 80) then
    raise exception 'cada texto debe ser una cadena de hasta 700 caracteres';
  end if;
  d := jsonb_build_object('version', left(btrim(d->>'version'), 60), 'nota', left(coalesce(d->>'nota', ''), 500), 'textos', t,
    'publicado', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  insert into config (clave, datos, actualizado) values (v_clave, d, now())
    on conflict (clave) do update set datos = excluded.datos, actualizado = excluded.actualizado;
  if v_clave = 'textos' then insert into config_historial (clave, datos) values (v_clave, d); end if;
  return jsonb_build_object('ok', true, 'data', d);
end
$$;

-- 5) Lo que el Panel usa de «Eventos», agregado aquí (antes descargaba todos los eventos cada 10 s).
create or replace function public.kinoo_resumen_eventos() returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from registros where hoja = 'Eventos'),
    'provisionales', (select count(*) from registros where hoja = 'Eventos' and datos->>'codigo' like 'TMP-%'),
    'ahora', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'sesiones', coalesce((select jsonb_agg(jsonb_build_object('sesionId', s, 'codigo', c, 'nombre', n, 'pantalla', p, 'ts', ts)) from (
        select distinct on (datos->>'sesionId') datos->>'sesionId' s, datos->>'codigo' c, datos->>'nombreMostrado' n, datos->>'pantalla' p,
          to_char(creado at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') ts -- hora del servidor: el reloj del celular puede estar mal
        from registros where hoja = 'Eventos' and creado > now() - interval '30 minutes' order by datos->>'sesionId', id desc) u), '[]'::jsonb),
    'porMinuto', coalesce((select jsonb_agg(jsonb_build_object('min', m, 'n', k) order by m) from (
        select to_char(date_trunc('minute', creado) at time zone 'utc', 'HH24:MI') m, count(*) k
        from registros where hoja = 'Eventos' and creado > now() - interval '15 minutes' group by 1) x), '[]'::jsonb),
    'missPrimerClic', coalesce((select jsonb_agg(jsonb_build_object('codigo', c, 'tarea', t, 'target', g, 'n', k)) from (
        select datos->>'codigo' c, datos->>'estimulo' t, coalesce(nullif(datos->>'target', ''), 'none') g, count(*) k
        from registros where hoja = 'Eventos' and datos->>'bloque' = 'primer-clic' and datos->>'tipo' in ('tap', 'drag') and datos->>'resultado' = 'Miss click'
        group by 1, 2, 3) x), '[]'::jsonb),
    'gestosFlujos', coalesce((select jsonb_agg(jsonb_build_object('codigo', c, 'mision', m, 'tipo', t, 'valor', v, 'n', k)) from (
        select datos->>'codigo' c, datos->>'estimulo' m, datos->>'tipo' t, coalesce(datos->>'valor', '') v, count(*) k
        from registros where hoja = 'Eventos' and datos->>'bloque' = 'flujos'
          and (datos->>'tipo' in ('drag', 'longpress') or (datos->>'tipo' = 'action' and datos->>'valor' in ('gesture.blocked', 'undo')))
        group by 1, 2, 3, 4) x), '[]'::jsonb))
$$;

-- 6) Eventos paginados: por participante (línea de tiempo) o todos (export), siempre en orden de llegada.
create or replace function public.kinoo_eventos(b jsonb) returns jsonb language sql stable set search_path = public as $$
  with cols as (select columnas from hojas where nombre = 'Eventos'),
  pagina as (
    select id, datos from registros
    where hoja = 'Eventos' and id > coalesce(nullif(b->>'desde', '')::bigint, 0)
      and (coalesce(b->>'codigo', '') = '' or datos->>'codigo' = b->>'codigo')
    order by id limit least(greatest(coalesce(nullif(b->>'limite', '')::int, 2000), 1), 5000))
  select jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'headers', (select columnas from cols),
    'rows', coalesce((select jsonb_agg((select jsonb_agg(coalesce(p.datos -> c, to_jsonb(''::text)) order by o) from cols, jsonb_array_elements_text(cols.columnas) with ordinality t(c, o)) order by p.id) from pagina p), '[]'::jsonb),
    'ultimoId', (select max(id) from pagina)))
$$;

-- 7) kinoo_api: igual a la 001 + versión de textos en el registro, «excluir» en dump y despacho de las acciones nuevas.
create or replace function public.kinoo_api(p_accion text, p_cuerpo jsonb) returns jsonb language plpgsql set search_path = public as $$
declare
  b jsonb := coalesce(p_cuerpo, '{}'::jsonb);
  lectura boolean := p_accion in ('seed-config','code','dump','config-save','config-historial','resumen-eventos','eventos');
  hojas_lectura text[] := array['Participantes','Config','Pantallas','Zonas','5 segundos','5 s – Cards','Primer clic + SEQ','UEQ','Puntos','Marca A-B','Contraste','Eventos','Flujos','Notas','Errores'];
  escribibles text[] := array['Zonas','5 segundos','5 s – Cards','Primer clic + SEQ','UEQ','Puntos','Marca A-B','Flujos','Notas','Errores'];
  latino text[] := array['T1-T2-T5-T3-T4','T2-T3-T1-T4-T5','T3-T4-T2-T5-T1','T4-T5-T3-T1-T2','T5-T1-T4-T2-T3'];
  v_res jsonb; p jsonb; v_nombre text; sesion text; norm text; idx int; cod text; base text; previos int; r jsonb;
  e jsonb; o jsonb; ex jsonb; rid text; nuevas int := 0; act int := 0; dup int := 0; acept int := 0; n int; h text; col text; colnom text; cambios jsonb; tmp text;
begin
  if not public.kinoo_autorizado(b->>'key', case when lectura then 'read' else 'write' end) then
    return jsonb_build_object('ok', false, 'error', 'no autorizado');
  end if;

  if p_accion in ('config', 'config-save', 'config-historial') then
    return public.kinoo_config(p_accion, b);
  elsif p_accion = 'resumen-eventos' then
    return jsonb_build_object('ok', true, 'data', public.kinoo_resumen_eventos());
  elsif p_accion = 'eventos' then
    return public.kinoo_eventos(b);

  elsif p_accion = 'register' then
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
      'Graba (Sí/No)', coalesce(nullif(p->>'graba',''), 'No'), 'Dispositivo', coalesce(p->>'dispositivo',''), 'Fases completadas', 0,
      'Versión de textos', left(coalesce(nullif(p->>'versionTextos',''), 'protocolo'), 60)));
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
      if jsonb_typeof(b->'excluir') = 'array' and b->'excluir' ? h then continue; end if;
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
revoke all on function public.kinoo_config(text, jsonb), public.kinoo_resumen_eventos(), public.kinoo_eventos(jsonb) from public, anon, authenticated;
grant execute on function public.kinoo_api(text, jsonb) to service_role;
