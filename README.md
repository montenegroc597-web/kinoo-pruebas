# Kinoo · Pruebas de usabilidad no moderadas

Herramienta para aplicar el **Protocolo de pruebas no moderadas por link v3.0** de Kinoo: cada persona abre un link en su celular y prueba el **prototipo real** sin moderador; los datos llegan a Supabase en tiempo real y el Panel los analiza con las fórmulas del Excel de registro v2.0. Desde el v3.0 el Panel analiza **solo flujos y conceptos**; los moods tienen su propia vista («Cuestionario de moods»).

- **`/prueba/`** — el link: introducción y los módulos M1 Descubrir, M2 Ver, M4 Mazos y M5 Percepción sobre el prototipo «Kinoo · Prueba Maze · Flujo» (gestos, toques y tiempos medidos dentro del prototipo). Variantes: `?link=1` (sin Mazos), `?link=2` (**cuestionario de moods**, aparte de la prueba de flujos), `?card=A|B`.
- **Supabase** (proyecto «Pruebas Kinoo») — hojas y columnas de `Registro_Pruebas_No_Moderadas_Kinoo_v2.0.xlsx` (ver `supabase/README.md`).
- **`/panel/`** — validez, métricas por módulo, card A vs B (Fisher / Welch), moods, codificación a ciegas, «Config» del estudio y textos editables, exportación.

📖 **Empieza por [`COMO-USAR.md`](COMO-USAR.md).** Últimos cambios: [`CAMBIOS.md`](CAMBIOS.md).

| Documento | Para qué |
|---|---|
| [`COMO-USAR.md`](COMO-USAR.md) | Cómo usar la herramienta, de punta a punta |
| [`docs/GUIA-ENVIO.md`](docs/GUIA-ENVIO.md) | Cómo y a quién enviar los links |
| [`docs/GUIA-ANALISIS.md`](docs/GUIA-ANALISIS.md) | Leer el Panel, codificar y decidir A vs B |
| [`docs/GUIA-DESPLIEGUE.md`](docs/GUIA-DESPLIEGUE.md) · [`supabase/README.md`](supabase/README.md) | Publicar el backend y las apps |
| [`CAMBIOS.md`](CAMBIOS.md) | Registro de cambios por versión |
| [`.claude/skills/kinoo-protocolo/SKILL.md`](.claude/skills/kinoo-protocolo/SKILL.md) | Cómo adaptar el sistema a un protocolo o un artefacto nuevo |
| [`docs/protocolo/`](docs/protocolo/) | Texto de cada versión del protocolo (base para comparar la siguiente) |

```
npm install
npm test            # fórmulas, «Config», textos, analítica y el SQL real de Supabase (sobre PGlite)
npm run e2e         # un celular virtual hace el link completo sobre el prototipo real
npm run mock        # backend local en :8787 (las migraciones de Supabase sobre PGlite)
npm run dev:prueba  # el link (:5173, en escritorio usa ?forzar=1)
npm run dev:panel   # Panel (:5174)
npm run carga       # simulación de 10, 20 y 100 personas
```

Stack: TypeScript estricto · React 18 · Vite 5 · Zustand · Recharts · SheetJS · Supabase (Postgres + Edge Function) · PGlite · Playwright.

**Privacidad:** el repositorio es público. El v2.0 es anónimo (solo códigos P01, P02…); lo que se publica en `data/` no lleva nombres.
