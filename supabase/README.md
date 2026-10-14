# Backend en Supabase (proyecto «Pruebas Kinoo», `yafofroiagcauqocwbgq`)

Todo pasa por la Edge Function pública `kinoo` (`POST {action,key,…}` / `GET ?action=dump|csv|health&key=…`), que llama a `public.kinoo_api`. La autorización son dos claves guardadas solo como hash SHA-256 en `public.claves`: **WRITE_KEY** (la app de prueba, pública) y **READ_KEY** (Panel y exportación, privada).

| Archivo | Qué es |
|---|---|
| `migrations/001_esquema.sql` | Tablas (`hojas`, `registros`, `semillas`, `claves`), RLS activado **sin políticas** (anon/authenticated no leen ni escriben nada directo) y `kinoo_api`: registro «Juan 1/Juan 2», idempotencia por sesión, reanudar, fases, eventos con deduplicación, filas por Row ID, reasignar, codificar, volcado |
| `migrations/002_textos_y_escala.sql` | Textos editables (`config`, `config_historial`), columna «Versión de textos», índices de «Eventos» y las acciones `config`, `config-save`, `config-historial`, `resumen-eventos`, `eventos` y `dump {excluir}` |
| `migrations/003_protocolo_v2.sql` | Protocolo v2.0: **archiva** el estudio v1.3 («v1.3 · <hoja>», sin borrar filas), registro anónimo con card A/B alternada o fijada por el link, `progress` (completó y duración con el reloj del servidor), exclusión manual en Participantes, «Config» del estudio versionada; las hojas escribibles salen de la tabla `hojas` |
| `hojas.sql` | **Generado** desde `packages/tracking/src/schema.ts` (`npm run hojas-sql`): hojas y columnas. Idempotente |
| `functions/kinoo/index.ts` | La Edge Function (sin JWT) |
| `kinoo_api.test.ts` | Pruebas de `kinoo_api` con estas mismas migraciones sobre PGlite (`npm test`) |

## Base nueva desde cero
1. Las migraciones en orden (`001`, `002`, `003`…) → 2. `hojas.sql` (estado actual de las hojas) → 3. claves:
   `insert into claves(nivel,hash) values ('write', encode(sha256('…'::bytea),'hex')), ('read', encode(sha256('…'::bytea),'hex'));`
4. Desplegar `functions/kinoo` sin verificación de JWT. Su URL (`https://<ref>.supabase.co/functions/v1/kinoo`) va en el secreto `APPS_SCRIPT_URL` (nombre histórico) y en `VITE_APPS_SCRIPT_URL`.

## Cambios
- **Nunca** editar una migración ya aplicada: crear `00N_….sql`. Si cambia `kinoo_api`, la migración la reescribe entera (`create or replace`).
- Si cambian columnas en `schema.ts`: `npm run hojas-sql` y aplicar `hojas.sql` (no toca las filas guardadas).
- Cambiar una clave: `insert into claves(nivel,hash) values ('read', encode(sha256('NUEVA'::bytea),'hex')) on conflict (nivel) do update set hash = excluded.hash;`
- Ver los datos: Panel, o la tabla `registros` en el Table Editor (`datos` = JSON con las columnas del Registro v2.0).
