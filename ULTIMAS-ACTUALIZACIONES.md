# Últimas actualizaciones · versión B de marca = prototipo Kino real

Fecha: 2026-10-09 · Base: `main` en `a462c02` («Docs: backend en Supabase») · Repo: `montenegroc597-web/kinoo-pruebas`

**Para el modelo que publica esto (Sonnet):** este documento basta. **No leas** `PLAN-MAESTRO`, `_artefacto*` ni los `.dc.html`; no hace falta contexto extra. Sigue la sección 3 tal cual.

---

## 1. Qué cambió (en una frase)

En la **fase 4 · Marca A/B**, la opción **B** ya no es la app A con el tema `data-brand="kino"`: ahora es **el prototipo real «Kino · mazos»** (página H del lienzo `9MgLeWVWxCr9RXWFpCXwZW`, el de la conversación «Descubrimiento de películas en tiempo libre»), con su estética y su lógica, mostrado en el mismo marco de 390×844. La opción A no cambia.

## 2. Supabase: NO hay nada que aplicar

| Pieza | ¿Cambia? |
|---|---|
| `supabase/migrations/*.sql` (tablas, RLS, `kinoo_api`) | **No.** No hay migración nueva |
| `supabase/functions/kinoo` (Edge Function) | **No.** No hay que redesplegarla |
| Claves `WRITE_KEY` / `READ_KEY`, secretos de GitHub, variable `RONDA` | **No** |
| `packages/tracking` (esquema, catálogo, métricas), `backend/`, `apps/prueba/src/{track,session,capture}.ts` | **No** |
| Filas y columnas de la hoja `Marca A-B`, eventos, orden A→B / B→A, 12 s de mirada, preguntas M1–M10, toque M5 | **Igual.** La lógica de la prueba no se tocó |

Solo cambia el **frontend**, que se publica solo al hacer push a `main` (workflow «Deploy (GitHub Pages)»). **No ejecutes nada en Supabase.**

## 3. Pasos para publicar (en orden)

```bash
# 0) partir del repo limpio en main
git checkout main && git pull
git log -1 --oneline            # debe ser a462c02 (o un commit posterior que no toque los archivos de la sección 4)

# 1) aplicar el parche (viene junto a este documento)
git am --3way kino-B.patch      # si falla: git am --abort && git apply --3way kino-B.patch && git add -A && git commit -m "Marca: version B = prototipo Kino real"

# 2) comprobar (Node 22)
npm ci
npm run typecheck               # sin errores
npm test                        # 126 pruebas en verde (antes 122; +4 de KinoPantalla)

# 3) publicar
git push origin main            # dispara «Deploy (GitHub Pages)»; esperar a que termine en verde
```

Opcional, si el equipo tiene los navegadores de Playwright: `npx playwright test e2e/marca-kino.spec.ts` (3 pruebas) o `npm run e2e` (17 pruebas, ~4 min; ya pasaron todas antes de entregar).

**Verificación tras el deploy** (`<base>` = `https://<usuario>.github.io/kinoo-pruebas`):

1. `<base>/prueba/kino/index.html` → el prototipo Kino completo con su panel «Prototipo funcional · iteración mazos».
2. `<base>/prueba/kino/index.html?pantalla=S02` → solo el teléfono, en «Mazo del día · Sufrir», carta 1/10.
3. `<base>/prueba/?equipo=1` → elegir **P02** (orden B→A) → «Fase 4» → «Listo, ya lo hice» → «Ver la opción 1» → debe verse el mazo de Kino (fondo rojo/negro, carta crema «UNA CASA, UNA FAMILIA…»). No se guarda nada en modo equipo.
4. Panel → «Marca A/B»: los mapas de la columna B se dibujan sobre las pantallas de Kino.

Si el paso 1 da 404: el build no copió `packages/kinoo-ui/public`; revisar que `publicDir` esté en los dos `vite.config.ts` (sección 4).

## 4. Archivos del parche

| Archivo | Qué hace |
|---|---|
| `packages/kinoo-ui/public/kino/index.html` | `_artefacto_B/project/H_Prototipo.dc.html` **idéntico**, salvo 2 líneas: `support.js` → `dc-runtime.js` y `<script src="./embed.js">` antes de `</body>` |
| `packages/kinoo-ui/public/kino/dc-runtime.js` | Runtime oficial de los lienzos de diseño (React incluido), copiado del propio lienzo. No editar |
| `packages/kinoo-ui/public/kino/embed.js` | Con `?pantalla=S02/S04/S05` pulsa el atajo del prototipo («MAZO · CARTAS», «CARTAS», «ELEGIR MAZO») y deja solo el teléfono arriba a la izquierda. Marca `window.__kinoListo = true` |
| `packages/kinoo-ui/src/KinoPrototipo.tsx` | `KinoPantalla` (iframe dentro de `<Frame brand="B">`), `kinoUrl`, `precargarKino` y `KINO_PRIMARIO` (rectángulo de jerarquía prevista por pantalla, en px de 390×844) |
| `packages/kinoo-ui/src/index.ts` | Exporta lo anterior |
| `apps/prueba/vite.config.ts`, `apps/panel/vite.config.ts` | `publicDir: packages/kinoo-ui/public` → se sirve en `<base>/kino/` |
| `apps/prueba/src/ui/Estimulo.tsx` | `PantallaEstatica` con `brand="B"` dibuja `KinoPantalla` (lo usa Marca en «ver», «punto» y «lado») |
| `apps/prueba/src/steps/Marca.tsx` | Solo añade `precargarKino()` al montar (descarga los ~690 KB durante el aviso de brillo) y el comentario. Nada más |
| `apps/prueba/src/steps/Catalogo.tsx` | En `?catalogo=1`, la columna B es el prototipo Kino, usable |
| `apps/panel/src/Heat.tsx`, `apps/panel/src/views.tsx` | Prop `kino`: los mapas de calor de B en «Marca A/B» se pintan sobre Kino |
| `packages/kinoo-ui/src/ui.test.tsx` | +4 pruebas de `KinoPantalla` |
| `e2e/marca-kino.spec.ts` | 3 pruebas: prototipo servido, fase 4 con B = Kino, catálogo |
| `AVANCES-Y-CAMBIOS.md` (§3 quater), `COMO-USAR.md`, este archivo | Documentación |

## 5. Cómo funciona (por si algo falla)

- La prueba sigue midiendo el toque M5 sobre `#kinoo-punto` en % de 390×844. El iframe tiene `pointer-events: none`, así que el toque lo recibe la prueba, no el prototipo.
- La columna «B · Primer elemento = jerarquía prevista» sale de `KINO_PRIMARIO` (S02 = frase gancho de la carta; S04 = carta de la propuesta; S05 = título «Elige tu mazo»). Si se cambia el prototipo y se mueven esos elementos, hay que volver a medirlos.
- La versión A sigue siendo la de siempre. El tema `data-brand="kino"` (`kino.css`) queda en el código, pero la prueba ya no lo usa para B.

## 6. Decisiones abiertas (no bloquean el push)

1. **Arranque de B:** el prototipo tarda ~0,7 s en arrancar en un computador (más en celulares lentos) y el cronómetro de 12 s empieza al mostrarse. La precarga reduce la espera, pero B puede verse ~1 s menos que A. Si el equipo lo quiere exacto, la opción es que el cronómetro de la opción B arranque con `window.__kinoListo`, **pero eso cambia la lógica de la prueba**: hacerlo solo si el equipo lo pide.
2. **Nombre:** B muestra la estética de Kino (el plan suponía «Kinoo» en ambas). En las tres pantallas probadas no aparece el logotipo, así que el nombre no debería influir en la preferencia.
3. **Interacción:** en la prueba B es estática, igual que A (el protocolo compara aspecto, no uso). El prototipo completo y usable está en `…/prueba/kino/index.html` y en `?catalogo=1`.
