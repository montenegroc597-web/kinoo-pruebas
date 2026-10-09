# Backend en Supabase (proyecto «Pruebas Kinoo»)

Reemplaza al Apps Script / Google Sheet. **Mismo contrato HTTP** que `backend/Code.gs`, así que la app de prueba, el Panel y los scripts no cambian: solo cambia la URL.

- `migrations/001_esquema.sql` — tablas (`hojas`, `registros`, `semillas`, `claves`), RLS activado **sin políticas** (anon/authenticated no leen ni escriben nada directo) y la función `kinoo_api` (registro «Juan 1/Juan 2», idempotencia por sesión, reanudar, fases, eventos con deduplicación, filas por Row ID, reasignar, codificar, volcado). Solo `service_role` puede ejecutarla.
- `functions/kinoo/index.ts` — Edge Function pública (sin JWT) que recibe `POST {action,key,…}` / `GET ?action=dump|csv|health&key=…` y llama a `kinoo_api`. La autorización real son las claves **WRITE_KEY** (la app de prueba, pública) y **READ_KEY** (Panel/exportación, privada), guardadas solo como hash SHA-256 en `public.claves`.
- URL: `https://<ref>.supabase.co/functions/v1/kinoo` → va en `APPS_SCRIPT_URL` / `VITE_APPS_SCRIPT_URL`.
- Cambiar una clave: `insert into claves(nivel,hash) values ('read', encode(sha256('NUEVA'::bytea),'hex')) on conflict (nivel) do update set hash = excluded.hash;`
- Ver los datos: Panel, o la tabla `registros` en el Table Editor de Supabase (`datos` es JSON con las columnas del Registro v1.3).
