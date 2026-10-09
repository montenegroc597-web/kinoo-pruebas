# Kinoo · Pruebas de usabilidad

Herramienta para evaluar la app **Kinoo** con personas reales siguiendo el *Protocolo de pruebas de usabilidad v1.3*, y recoger los datos en un Google Sheet casi en tiempo real.

- **`/prueba/`** — la app Kinoo real + el guion de la prueba (4 fases). Cada participante, en su celular.
- **Google Sheet** — mismas hojas y columnas que `Registro_Pruebas_Usabilidad_Kinoo_v1.3.xlsx`.
- **`/panel/`** — métricas, mapas de calor sobre la pantalla real, errores de flujo, codificación y exportación.

📖 **Empieza por [`COMO-USAR.md`](COMO-USAR.md).**

| Documento | Para qué |
|---|---|
| [`COMO-USAR.md`](COMO-USAR.md) | Cómo usar la herramienta, de punta a punta |
| [`AVANCES-Y-CAMBIOS.md`](AVANCES-Y-CAMBIOS.md) | Qué se construyó, qué se verificó, qué cambió respecto al plan y qué falta |
| [`docs/GUIA-DESPLIEGUE.md`](docs/GUIA-DESPLIEGUE.md) | Publicar el backend (Google) y las apps (GitHub Pages) |
| [`docs/GUIA-MODERADOR.md`](docs/GUIA-MODERADOR.md) | Cómo moderar una sesión |
| [`docs/GUIA-ANALISIS.md`](docs/GUIA-ANALISIS.md) | Leer el Panel y armar el informe |

```
npm install
npm test            # 122 pruebas de lógica y pantallas
npm run e2e         # 14 pruebas de extremo a extremo con un celular virtual
npm run mock        # backend simulado en :8787
npm run dev:prueba  # app de prueba (:5173, en escritorio usa ?forzar=1)
npm run dev:panel   # Panel (:5174)
```

Stack: TypeScript estricto · React 18 · Vite 5 · Zustand · Recharts · SheetJS · Google Apps Script · Playwright.

**Privacidad:** el repositorio es público. Los nombres solo viven en el Google Sheet y en el Panel; lo que se publica en `data/` está **anonimizado** (solo códigos P01, P02…).
