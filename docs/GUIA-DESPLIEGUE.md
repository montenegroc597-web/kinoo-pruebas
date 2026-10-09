> **Actualización: el backend ahora es Supabase** (proyecto «Pruebas Kinoo»), no Google Sheets/Apps Script. Ver `supabase/README.md`. Secrets del repo: `APPS_SCRIPT_URL` (= URL de la Edge Function `…/functions/v1/kinoo`), `WRITE_KEY`, `READ_KEY`. Las secciones de Apps Script de abajo quedan solo como alternativa histórica.

# Guía de despliegue

Tiempo: unos 20 minutos. Necesitas una **cuenta de Google** (donde vivirá el Sheet) y una **cuenta de GitHub**.

## 1. El Google Sheet y el Apps Script

1. En Google Drive crea una hoja de cálculo nueva y nómbrala **«Kinoo · Registro en vivo»**. Déjala vacía.
2. Menú **Extensiones → Apps Script**.
3. Borra el contenido de `Código.gs` y pega **todo** `backend/Code.gs` de este repositorio. Guarda.
4. En el panel izquierdo: **Configuración del proyecto (⚙) → Propiedades de la secuencia de comandos → Añadir propiedad**:
   - `WRITE_KEY` = una clave larga al azar (la usa la app de prueba; quedará visible en el código público, por eso solo sirve para escribir y se **rota entre rondas**).
   - `READ_KEY` = otra clave larga al azar, **distinta**. Es la que abre el Panel y exporta los datos. **No se publica nunca**.

   Puedes generarlas con: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
5. Arriba, en el selector de funciones elige **`setup`** y pulsa **Ejecutar**. Acepta los permisos (Google avisará de que la app no está verificada: *Avanzado → Ir a… (no seguro)*; es tu propio script). Esto crea todas las hojas con sus encabezados.
6. **Implementar → Nueva implementación → Tipo: Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   - Copia la **URL de la aplicación web** (termina en `/exec`).
7. Prueba en el navegador (cambia por tus datos):
   `https://script.google.com/macros/s/XXXX/exec?action=health&key=TU_WRITE_KEY`
   Debe responder `{"ok":true,"filas":{…}}`.

> Cada vez que cambies `backend/Code.template.gs` ejecuta `npm run build-backend`, vuelve a pegar `Code.gs` y usa **Implementar → Administrar implementaciones → Editar → Nueva versión** (si creas una *nueva implementación* la URL cambia).

## 2. El repositorio en GitHub (público)

1. Crea un repositorio **público** (por ejemplo `kinoo-pruebas`) y sube este proyecto:
   ```
   git remote add origin https://github.com/<usuario>/kinoo-pruebas.git
   git push -u origin main
   ```
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → New repository secret**:

   | Secreto | Valor |
   |---|---|
   | `APPS_SCRIPT_URL` | la URL `/exec` del paso 1.6 |
   | `WRITE_KEY` | la misma `WRITE_KEY` de Script Properties |
   | `READ_KEY` | la misma `READ_KEY` (solo la usa el export nocturno) |

   Y, en la pestaña **Variables**, `RONDA` = `1` (número de la ronda actual).
4. **Actions → Deploy (GitHub Pages) → Run workflow**. Al terminar tendrás:
   - App de prueba: `https://<usuario>.github.io/kinoo-pruebas/prueba/`
   - Panel: `https://<usuario>.github.io/kinoo-pruebas/panel/`
5. **Settings → Actions → General → Workflow permissions → Read and write** (para que el export nocturno pueda guardar en `data/`).

## 3. Llenar Config, Pantallas y Contraste

En tu computador, con Node 22:
```
npm install
npm run contrast
APPS_SCRIPT_URL="https://script.google.com/macros/s/XXXX/exec" READ_KEY="tu_read_key" npm run seed-config
```

## 4. Verificación (lista de chequeo antes de la primera sesión real)

- [ ] `…/exec?action=health&key=WRITE_KEY` responde `ok`.
- [ ] Abres la app de prueba **en tu celular**, con **datos móviles** y con **Wi-Fi**, y haces una sesión completa con `?ronda=0`.
- [ ] En el Sheet ves filas nuevas mientras avanzas (retraso menor de 10 s).
- [ ] En el Panel (con `READ_KEY`) la vista **Salud** muestra tu sesión activa y **0 errores**.
- [ ] Exportas el `.xlsx` en formato v1.3 y lo pegas en la plantilla `Registro_Pruebas_Usabilidad_Kinoo_v1.3.xlsx`: Resumen, Mapas de calor y Análisis se llenan sin errores de fórmula.
- [ ] *Actions → Exportar datos → Run workflow* crea `data/` con CSV **sin nombres**.
- [ ] Probaste cortar el internet a mitad de la prueba y al volver todo llegó.

## 5. Entre rondas

1. Rota `WRITE_KEY`: cámbiala en Script Properties **y** en el secreto de GitHub, y relanza *Deploy*.
2. Cambia la variable `RONDA` y relanza *Deploy*.
3. Los códigos (P01, P02…) **no se reinician** entre rondas, y «Juan 2» seguirá contando aunque sea otra ronda.

## 6. Seguridad y privacidad (honestidad)

- Las claves que van en el JavaScript público (`WRITE_KEY`) **no son secretas de verdad**: solo evitan escrituras accidentales. Es aceptable para un estudio académico con 8–30 personas.
- Los **nombres** solo viven en tu Google Sheet y en el Panel (con `READ_KEY`). El repositorio público recibe únicamente códigos; si alguien escribió su nombre en una respuesta abierta, el export lo tacha. La promesa del consentimiento (Ley 1581 de 2012) depende de que **no copies a mano** el Sheet al repositorio.
- El Sheet es privado: compártelo solo con el equipo.
- El Panel en GitHub Pages es una página pública, pero sin la `READ_KEY` no muestra ningún dato.
