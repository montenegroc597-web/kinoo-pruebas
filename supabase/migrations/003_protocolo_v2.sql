-- Kinoo · 003 — Protocolo v2.0 (pruebas no moderadas por link).
-- 1) ARCHIVA el estudio v1.3: sus hojas y filas pasan a llamarse «v1.3 · <hoja>» (no se borra nada; el Panel v2 no las muestra
--    y se pueden leer pidiéndolas por nombre en dump). Después de esta migración se aplica supabase/hojas.sql (hojas del v2.0).
-- 2) kinoo_api para el v2.0: registro anónimo con card A/B alternada (o fijada por el link), progreso con duración medida en el
--    servidor, configuración del estudio, hojas escribibles derivadas de la tabla «hojas» (sin listas fijas).

-- 1) archivo del v1.3
insert into public.hojas (nombre, columnas)
  select 'v1.3 · ' || nombre, columnas from public.hojas where nombre not like 'v1.3 · %'
  on conflict (nombre) do nothing;
update public.registros set hoja = 'v1.3 · ' || hoja where hoja not like 'v1.3 · %';
update public.semillas set nombre = 'v1.3 · ' || nombre where nombre not like 'v1.3 · %';
delete from public.hojas where nombre not like 'v1.3 · %';

-- 2) configuración: además de los textos, la «Config» del estudio (y su borrador)
alter table public.config drop constraint if exists config_clave_check;
alter table public.config add constraint config_clave_check check (clave in ('textos', 'textos-borrador', 'estudio', 'estudio-borrador'));

create or replace function public.kinoo_config(p_accion text, b jsonb) returns jsonb language plpgsql set search_path = public as $$
declare
  v_clave text := coalesce(nullif(b->>'clave', ''), 'textos');
  v_tipo text := case when v_clave like 'estudio%' then 'estudio' else 'textos' end;
  d jsonb := b->'datos';
  c jsonb;
  r jsonb;
begin
  if v_clave not in ('textos', 'textos-borrador', 'estudio', 'estudio-borrador') then raise exception 'clave no permitida: %', v_clave; end if;
  if p_accion = 'config' then
    select datos into r from config where clave = v_clave;
    return jsonb_build_object('ok', true, 'data', r);
  elsif p_accion = 'config-historial' then
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'creado', creado, 'version', datos->>'version', 'nota', datos->>'nota', v_tipo, datos->v_tipo) order by id desc), '[]'::jsonb)
      into r from (select * from config_historial where clave = v_tipo order by id desc limit 50) h;
    return jsonb_build_object('ok', true, 'data', r);
  end if;
  -- config-save: la validación fina la hace el Panel (validarTextos / validarEstudio); aquí solo forma y tamaño.
  c := d->v_tipo;
  if d is null or jsonb_typeof(d) <> 'object' or c is null or jsonb_typeof(c) <> 'object' then raise exception 'datos inválidos'; end if;
  if coalesce(btrim(d->>'version'), '') = '' then raise exception 'falta el nombre de la versión'; end if;
  if length(c::text) > 200000 then raise exception 'configuración demasiado grande'; end if;
  if v_tipo = 'textos' and exists (select 1 from jsonb_each(c) e where jsonb_typeof(e.value) <> 'string' or length(e.value #>> '{}') > 700 or length(e.key) > 80) then
    raise exception 'cada texto debe ser una cadena de hasta 700 caracteres';
  end if;
  d := jsonb_build_object('version', left(btrim(d->>'version'), 60), 'nota', left(coalesce(d->>'nota', ''), 500), v_tipo, c,
    'publicado', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  insert into config (clave, datos, actualizado) values (v_clave, d, now())
    on conflict (clave) do update set datos = excluded.datos, actualizado = excluded.actualizado;
  if v_clave = v_tipo then insert into config_historial (clave, datos) values (v_clave, d); end if;
  return jsonb_build_object('ok', true, 'data', d);
end
$$;

-- Salud del Panel: total, provisionales, sesiones con actividad reciente (hora del servidor) y eventos por minuto.
create or replace function public.kinoo_resumen_eventos() returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from registros where hoja = 'Eventos'),
    'provisionales', (select count(*) from registros where hoja = 'Eventos' and datos->>'codigo' like 'TMP-%'),
    'ahora', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'sesiones', coalesce((select jsonb_agg(jsonb_build_object('sesionId', s, 'codigo', c, 'bloque', bl, 'pantalla', p, 'ts', ts)) from (
        select distinct on (datos->>'sesionId') datos->>'sesionId' s, datos->>'codigo' c, datos->>'bloque' bl, datos->>'pantalla' p,
          to_char(creado at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') ts
        from registros where hoja = 'Eventos' and creado > now() - interval '30 minutes' order by datos->>'sesionId', id desc) u), '[]'::jsonb),
    'porMinuto', coalesce((select jsonb_agg(jsonb_build_object('min', m, 'n', k) order by m) from (
        select to_char(date_trunc('minute', creado) at time zone 'utc', 'HH24:MI') m, count(*) k
        from registros where hoja = 'Eventos' and creado > now() - interval '15 minutes' group by 1) x), '[]'::jsonb))
$$;

create or replace function public.kinoo_asignacion(d jsonb, reanudada boolean) returns jsonb language sql immutable set search_path = public as $$
  select jsonb_build_object('codigo', d->>'Código', 'sesionId', d->>'Sesión ID', 'variante', d->>'Variante de card (A/B)', 'flujo', d->>'Flujo (Completo / Link 1 / Link 2)')
    || case when reanudada then jsonb_build_object('partes', coalesce(nullif(d->>'Partes completadas','')::numeric, 0), 'reanudada', true) else '{}'::jsonb end
$$;

create or replace function public.kinoo_api(p_accion text, p_cuerpo jsonb) returns jsonb language plpgsql set search_path = public as $$
declare
  b jsonb := coalesce(p_cuerpo, '{}'::jsonb);
  lectura boolean := p_accion in ('code','dump','config-save','config-historial','resumen-eventos','eventos');
  orden text[] := array['Participantes','Descubrir','Ver','Moods','Películas','Mazos','Percepción','Puntos','Notas','Eventos','Errores'];
  editables_participante text[] := array['Excluir a mano (Sí)','Motivo de exclusión','Notas','Género','Dispositivo'];
  v_res jsonb; p jsonb; sesion text; idx int; cod text; r jsonb; v_var text; v_flujo text; nA int; nB int;
  e jsonb; o jsonb; ex jsonb; rid text; nuevas int := 0; act int := 0; dup int := 0; acept int := 0; n int; h text; col text; cambios jsonb; tmp text; sel boolean;
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
    -- anónimo: código P01, P02… y card A/B. Sin variante en el link, la que lleva menos personas (A, B, A, B…).
    perform pg_advisory_xact_lock(734100);
    p := coalesce(b->'perfil', '{}'::jsonb);
    sesion := coalesce(nullif(b->>'sesionId',''), gen_random_uuid()::text);
    select datos into r from registros where hoja = 'Participantes' and row_id = sesion;
    if found then return jsonb_build_object('ok', true, 'data', kinoo_asignacion(r, true)); end if;
    select coalesce(max((regexp_match(datos->>'Código', '^P(\d+)$'))[1]::int), 0) + 1 into idx from registros where hoja = 'Participantes';
    cod := 'P' || case when idx < 10 then '0' || idx else idx::text end;
    v_flujo := case when p->>'flujo' in ('Completo', 'Link 1', 'Link 2') then p->>'flujo' else 'Completo' end;
    if p->>'variante' in ('A', 'B') then
      v_var := p->>'variante';
    else
      select count(*) filter (where datos->>'Variante de card (A/B)' = 'A'), count(*) filter (where datos->>'Variante de card (A/B)' = 'B')
        into nA, nB from registros where hoja = 'Participantes';
      v_var := case when nA <= nB then 'A' else 'B' end;
    end if;
    r := kinoo_fila('Participantes', jsonb_build_object(
      'Código', cod, 'Variante de card (A/B)', v_var,
      'Fecha', to_char(now() at time zone 'America/Bogota', 'YYYY-MM-DD'),
      'Dispositivo', coalesce(p->>'dispositivo',''), 'Flujo (Completo / Link 1 / Link 2)', v_flujo, 'Completó (Sí/No)', 'No',
      'Sesión ID', sesion,
      'Ronda', case when p ? 'ronda' and jsonb_typeof(p->'ronda') <> 'null' and p->>'ronda' <> '' then p->'ronda' else '1'::jsonb end,
      'Inicio', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'Partes completadas', 0,
      'Versión de textos', left(coalesce(nullif(p->>'versionTextos',''), 'protocolo'), 60),
      'Versión del estudio', left(coalesce(nullif(p->>'versionEstudio',''), 'inicial'), 60),
      'Agente de usuario', left(coalesce(p->>'agente',''), 300)));
    insert into registros (hoja, row_id, datos) values ('Participantes', sesion, r);
    return jsonb_build_object('ok', true, 'data', kinoo_asignacion(r, false));

  elsif p_accion = 'resume' then
    select datos into r from registros where hoja = 'Participantes' and row_id = coalesce(b->>'sesionId','') and datos->>'Código' = coalesce(b->>'codigo','');
    if found then return jsonb_build_object('ok', true, 'data', kinoo_asignacion(r, true)); end if;
    return jsonb_build_object('ok', true, 'data', null);

  elsif p_accion = 'profile' then
    select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into cambios from jsonb_each(coalesce(b->'cambios','{}'::jsonb)) as t(k, v)
      where k = any (array['Edad','Frecuencia de consumo','Descubre en redes (Sí/No)','Nivel tecnológico','Dispositivo','Control de atención']);
    update registros set datos = datos || cambios where hoja = 'Participantes' and row_id = coalesce(b->>'sesionId','');
    if found then return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', true)); end if;
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', false, 'error', 'sesión no encontrada'));

  elsif p_accion = 'progress' then
    -- partes terminadas (no retrocede); al completar, la duración se mide con el reloj del servidor desde «Inicio»
    update registros set datos = datos
      || jsonb_build_object('Partes completadas', greatest(coalesce(nullif(datos->>'Partes completadas','')::numeric, 0), coalesce(nullif(b->>'partes','')::numeric, 0)))
      || case when (b->>'completo')::boolean is true and datos->>'Completó (Sí/No)' <> 'Sí' then jsonb_build_object(
           'Completó (Sí/No)', 'Sí',
           'Fin', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'Duración (min)', round((extract(epoch from now() - (datos->>'Inicio')::timestamptz) / 60)::numeric, 1))
         else '{}'::jsonb end
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
    -- escribibles: hojas del estudio actual con «Row ID» (no Participantes, ni Eventos, ni las archivadas)
    h := b->>'hoja';
    if h is null or h like 'v1.3 · %' or h in ('Participantes', 'Eventos')
       or not exists (select 1 from hojas where nombre = h and columnas ? 'Row ID') then
      raise exception 'hoja no permitida: %', h;
    end if;
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
    -- codificación del equipo: columnas de una fila por Row ID; en Participantes, por Sesión ID y solo las columnas de exclusión y notas
    h := b->>'hoja';
    if h = 'Participantes' then
      select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into cambios from jsonb_each(coalesce(b->'cambios','{}'::jsonb)) as t(k, v) where k = any (editables_participante);
    else
      if not exists (select 1 from hojas where nombre = h and columnas ? 'Row ID') then raise exception 'la hoja no tiene Row ID'; end if;
      select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into cambios from jsonb_each(coalesce(b->'cambios','{}'::jsonb)) as t(k, v)
        where (select columnas from hojas where nombre = h) ? k;
    end if;
    update registros set datos = datos || cambios where hoja = h and row_id = coalesce(b->>'rowId','');
    if found then return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', true)); end if;
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('ok', false, 'error', 'Row ID no encontrado'));

  elsif p_accion = 'reassign' then
    tmp := b->>'tmp'; r := coalesce(b->'asignacion','{}'::jsonb); n := 0;
    for h in select nombre from hojas where nombre not like 'v1.3 · %' loop
      col := (select c from unnest(array['Participante','codigo','Código']) c where (select columnas from hojas where nombre = h) ? c limit 1);
      if col is null then continue; end if;
      update registros set datos = jsonb_set(datos, array[col], to_jsonb(r->>'codigo')) where hoja = h and datos->>col = tmp;
      get diagnostics idx = row_count; n := n + idx;
    end loop;
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('cambios', n));

  elsif p_accion = 'dump' then
    -- por defecto, las hojas del estudio actual en el orden del Excel; las archivadas («v1.3 · …») solo si se piden por nombre
    v_res := '{}'::jsonb;
    sel := coalesce(jsonb_typeof(b->'hojas') = 'array' and jsonb_array_length(b->'hojas') > 0, false);
    for h in select nombre from hojas
             where (sel and b->'hojas' ? nombre) or (not sel and nombre not like 'v1.3 · %')
             order by coalesce(array_position(orden, nombre), 99), nombre loop
      if jsonb_typeof(b->'excluir') = 'array' and b->'excluir' ? h then continue; end if;
      select jsonb_build_object('headers', hh.columnas, 'rows', coalesce((
        select jsonb_agg((select jsonb_agg(coalesce(g.datos -> c, to_jsonb(''::text)) order by ord) from jsonb_array_elements_text(hh.columnas) with ordinality t(c,ord)) order by g.id)
        from registros g where g.hoja = hh.nombre), '[]'::jsonb)) into r from hojas hh where hh.nombre = h;
      v_res := v_res || jsonb_build_object(h, r);
    end loop;
    return jsonb_build_object('ok', true, 'data', v_res);

  elsif p_accion = 'health' then
    select coalesce(jsonb_object_agg(nombre, (select count(*) from registros g where g.hoja = hh.nombre)), '{}'::jsonb) into v_res
      from hojas hh where nombre not like 'v1.3 · %';
    return jsonb_build_object('ok', true, 'filas', v_res, 'ultimoEvento', (select datos->>'ts' from registros where hoja = 'Eventos' order by id desc limit 1));
  end if;
  return jsonb_build_object('ok', false, 'error', 'acción desconocida');
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end
$$;
revoke all on function public.kinoo_api(text, jsonb) from public, anon, authenticated;
revoke all on function public.kinoo_config(text, jsonb), public.kinoo_resumen_eventos(), public.kinoo_asignacion(jsonb, boolean) from public, anon, authenticated;
grant execute on function public.kinoo_api(text, jsonb) to service_role;
