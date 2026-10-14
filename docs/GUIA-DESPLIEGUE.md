# Guía de despliegue

El backend es **Supabase** (proyecto «Pruebas Kinoo») y las dos apps se publican en **GitHub Pages**. El sistema ya está desplegado; esta guía sirve para rehacerlo desde cero o revisar que todo esté bien.

## 1. Supabase
Sigue `supabase/README.md` → «Base nueva desde cero»: migraciones en orden, `hojas.sql`, las dos claves y la Edge Function `kinoo` (sin JWT).

- `WRITE_KEY` = clave larga al azar. La usa la app de prueba y queda visible en el código público, así que solo sirve para escribir. Se **rota entre rondas**.
- `READ_KEY` = otra clave larga al azar, **distinta**. Abre el Panel y exporta los datos. **No se publica nunca**.
- Generarlas: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
- Prueba: `https://<ref>.supabase.co/functions/v1/kinoo?action=health&key=TU_WRITE_KEY` debe responder `{"ok":true,"filas":{…}}`.

## 2. El repositorio en GitHub (público)

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret**:

   | Secreto | Valor |
   |---|---|
   | `APPS_SCRIPT_URL` | la URL de la Edge Function (`https://<ref>.supabase.co/functions/v1/kinoo`). El nombre del secreto es histórico |
   | `WRITE_KEY` | la `WRITE_KEY` |
   | `READ_KEY` | la `READ_KEY` (solo la usa el export nocturno) |

   Y en **Variables**: `RONDA` = número de la ronda actual.
3. Cada push a `main` publica (workflow «Deploy (GitHub Pages)»):
   - App de prueba: `https://<usuario>.github.io/kinoo-pruebas/prueba/`
   - Panel: `https://<usuario>.github.io/kinoo-pruebas/panel/`
4. **Settings → Actions → General → Workflow permissions → Read and write** (para que el export nocturno pueda guardar en `data/`).

## 3. Configurar el estudio

No hay que sembrar nada a mano: la «Config» del estudio (variantes, moods, películas, mazos, claves y umbrales) se define y se publica en **Panel → Estudio**, versionada en Supabase. Ver `COMO-USAR.md` §1.

## 4. Verificación (lista de chequeo antes de la primera sesión real)

- [ ] `…/functions/v1/kinoo?action=health&key=WRITE_KEY` responde `ok`.
- [ ] Panel → **Estudio** publicado y sin pendientes; Panel → **Textos** publicado si cambió alguna pregunta.
- [ ] Abres el link **en tu celular** (iOS y Android), con **datos móviles** y con **Wi-Fi**, y haces el link completo con `?ronda=0`.
- [ ] En el Panel la vista **Salud** muestra tu sesión y **0 errores**; en **Participantes** apareces como válido (completó, control = 5, duración ≥ mínimo).
- [ ] Exportas el `.xlsx` en formato v2.0 y lo pegas en la plantilla `Registro_Pruebas_No_Moderadas_Kinoo_v2.0.xlsx`: las páginas de análisis se llenan sin errores de fórmula.
- [ ] *Actions → Exportar datos → Run workflow* crea `data/` con CSV **sin nombres**.
- [ ] Probaste cortar el internet a mitad de la prueba y al volver todo llegó.

## 5. Entre rondas

1. Si cambia la redacción de alguna pregunta: Panel → **Textos** → publicar una versión nueva **antes** de la primera sesión de la ronda.
2. Rota `WRITE_KEY`: cámbiala en la tabla `claves` de Supabase **y** en el secreto de GitHub, y relanza *Deploy*.
3. Cambia la variable `RONDA` y relanza *Deploy*.
4. Los códigos (P01, P02…) **no se reinician** entre rondas, y «Juan 2» seguirá contando aunque sea otra ronda.

## 6. Seguridad y privacidad (honestidad)

- La `WRITE_KEY` va en el JavaScript público, así que **no es secreta de verdad**: solo evita escrituras accidentales. Con ella no se puede leer, codificar ni publicar configuración. Es aceptable para un estudio académico con 30 a 100 personas.
- El v2.0 es **anónimo**: no se piden nombres, solo códigos P01, P02… (los datos archivados del v1.3 sí tenían nombres: el export los quita y tacha).
- Las tablas de Supabase no tienen acceso para `anon`/`authenticated`: todo pasa por `kinoo_api` con las claves.
- El Panel en GitHub Pages es una página pública, pero sin la `READ_KEY` no muestra ningún dato.
