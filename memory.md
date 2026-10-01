# Estado actual — Folio
> Última actualización: 2026-09-30 · Versión: 0.3.0

## ✅ Completado
- [x] Investigación de mercado (sept. 2026): BYOK existe globalmente; en Perú nadie combina BYOK + memoria por expediente → process/research.md
- [x] Análisis CEJ/SINOE de competidores (DOXS, Lexana, AbogacIA) y propuesta local-first
- [x] Análisis Ley 29733 + DS 016-2024-JUS: el abogado es responsable; Folio solo es software → process/legal-privacy.md
- [x] MVP de un solo HTML con bóveda cifrada local (AES-GCM 256, PBKDF2 310 000 it., auto-bloqueo)
- [x] Bienvenida de 5 pasos con consentimientos separados y registro de aceptación local
- [x] Expedientes con memoria (estado, resumen, plazos, pendientes, partes, hechos, estrategia)
- [x] Movimientos manuales y "Pegar desde el CEJ" ordenado por IA con revisión del abogado
- [x] Documentos PDF/DOCX/TXT extraídos localmente (pdf.js 3.11.174, mammoth 1.8.0 por CDN, carga diferida)
- [x] Agente con streaming, revisión previa del texto exacto enviado y "Actualizar memoria" con aprobación
- [x] Seudonimización reversible: partes, DNI, RUC, teléfonos, correos, direcciones
- [x] Registro de envíos local exportable a CSV; copia de seguridad cifrada (.folio); cambio de contraseña atómico
- [x] Política, términos y autorización para clientes (borradores; datos del autor en config.js)
- [x] Prueba real con OpenRouter OK (usuario, 2026-09-30)
- [x] Fix conexión: quitado `X-Title`, /models sin cabeceras, diagnóstico de errores de red detallado
- [x] Razonamiento `effort: low` en OpenRouter y más tokens (modelos con razonamiento obligatorio)
- [x] Lista de modelos sin `:free`/`:batch`; 4 modelos sugeridos (Sonnet 5.5, GPT-6.1 Sol, Gemini 3.8 Flash, DeepSeek V4.1 Flash)
- [x] Ollama eliminado; reemplazado por "Servidor propio (lo configura un técnico)"
- [x] Guía "¿Cómo obtengo mi key?" en la app y en docs/guia-api-keys.md
- [x] Textos legales reescritos para versión gratuita, sin RUC, licencia AGPL-3.0
- [x] Repositorio estructurado (src/, build.py, dist/, docs/, process/, tests/) + harness
- [x] Repo público en GitHub, Release v0.2.0, README con SEO y sitio en GitHub Pages (docs/index.html)
- [x] v0.3.0: rediseño visual igual al sitio (claro y oscuro), tipografías incluidas en el HTML (T-203), política r2 → process/specs/rediseno-visual-v0.3.md

## 🔄 En progreso
- [x] Publicado en GitHub (público) con Release v0.2.0 — 2026-09-30
- [x] src/config.js completado con datos del autor

## ⚠️ Decisiones vigentes (detalle en process/decisions.md)
- Solo gratuito con BYOK; plan pagado descartado por ahora (exige RUC, encargo de datos y choca con el cargo en el PJ)
- DeepSeek solo vía OpenRouter con ZDR, nunca su API directa
- Servicio de instalación de servidor propio: fuera de Folio; solo visible si se llena `OWNER.serviceContact`
- Distribución: HTML en GitHub Releases (sin .exe sin firmar por ahora)

## 🔴 Bloqueantes
- Validación de textos legales por un especialista en datos personales (antes de difundir)
- Consulta escrita sobre incompatibilidades del cargo en el PJ (antes de difundir y, sobre todo, antes de cobrar cualquier servicio)

## 📌 Próximos pasos (próxima sesión)
1. Registrar el sitio en Google Search Console y enviar sitemap.xml (lo hace el usuario)
2. Probar con un PDF real (pdf.js por CDN nunca se probó en el entorno de desarrollo) y con OpenAI/Anthropic directos
3. Publicar la re-aceptación (T-201, ya en `main`) en un Release v0.3.1 cuando el usuario lo indique
4. Prueba con 3–5 abogados de confianza; registrar fricciones en process/tasks.md
5. Prueba ciega de calidad: 20 tareas reales anonimizadas, DeepSeek V4.1 Flash vs Gemini 3.8 Flash vs Sonnet 5.5

## Historial
- 2026-09-30: repo público, Release v0.2.0, README con SEO, sitio en GitHub Pages (docs/index.html → https://mscnegocio-del.github.io/Folio/). Pendiente: registrar el sitio en Google Search Console.
- 2026-09-30: sitio rediseñado con estilo oscuro tipo DeepSeek Harness (Montserrat/DM Sans/Fragment Mono, botones píldora); sin logos ni textos de DeepSeek.
- 2026-09-30: v0.3.0 — app rediseñada con el sistema del sitio (DM Sans/Montserrat/Fragment Mono, acento azul, píldoras), fuentes en base64 (src/fonts.css), sin Google Fonts; e2e TODO OK.
- 2026-10-01: T-201 hecho — pantalla de re-aceptación tras desbloquear (POLICY_CHANGES en legal.js, consent.history); e2e TODO OK. Sin Release aún.
