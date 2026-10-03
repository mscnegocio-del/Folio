# Tareas — Folio

Estados: ✅ hecho · 🔄 en curso · ⏳ pendiente · 💤 en espera (depende de algo externo)

## Épicas
- E1 Núcleo local-first (bóveda, expedientes, memoria) — ✅
- E2 Agente y privacidad (seudonimización, revisión, registro) — ✅
- E3 Proveedores y onboarding (BYOK, guía de keys) — ✅
- E4 Publicación (GitHub, licencia, Release, legal) — 🔄
- E5 Validación con usuarios y calidad de modelos — ⏳
- E6 App de escritorio (Electron) y conectores CEJ/SINOE — ⏳
- E7 Endurecimiento de seguridad — ⏳
- E8 Biblioteca legal peruana actualizada (normas vigentes, verificador de citas) — 🔄 spec aprobado; F0 ✅; F1 motor ✅, faltan los textos reales

## Sprint actual — Publicación v0.2.0
| # | Tarea | Estado |
|---|---|---|
| T-101 | Completar `src/config.js` (nombre, correo personal, ciudad, URL del repo) y `python build.py` | ✅ |
| T-102 | Subir repositorio a GitHub (público) + sitio en GitHub Pages | ✅ |
| T-103 | Agregar LICENSE desde plantilla GitHub (GNU AGPLv3) | ✅ |
| T-104 | Crear Release v0.2.0 con `dist/folio.html` (y v0.3.0 con el rediseño) | ✅ |
| T-105 | Probar con un PDF y un DOCX reales (CDN) en la PC del usuario | ⏳ |
| T-106 | Probar OpenAI y Anthropic directos con keys reales (solo OpenRouter está probado) | ⏳ |
| T-107 | Validación de textos legales por especialista en datos personales | 💤 |
| T-108 | Consulta escrita sobre incompatibilidades del cargo en el PJ | 💤 |

## E8 · Biblioteca legal peruana
| # | Tarea | Estado |
|---|---|---|
| T-301 | F0: derechos (D. Leg. 822 art. 9), condiciones SPIJ/El Peruano, lista de normas | ✅ |
| T-302 | Motor en Folio: descarga con sha256, búsqueda BM25, búsqueda asistida, bloque de normas, verificador de citas, fecha de corte y avisos de atraso | ✅ |
| T-303 | Conversor `normas/build_normas.py` + catálogo + datos ficticios de prueba + e2e | ✅ |
| T-304 | Descargar del SPIJ las 11 normas a `normas/fuentes/` (Word) y calibrar el conversor con los archivos reales | 🔄 7 de 11 listas (CONST, CC, CPC, CP parcial, NCPP, NCPCO, CNA); faltan L30364, NLPT, LPAG, LOPJ |
| T-304b | Código Penal, segunda parte (arts. 201 en adelante): no se encontró en el SPIJ. Mientras tanto CP figura como incompleto (`parcial` en catalogo.json) | 💤 pendiente |
| T-305 | Revisión humana del primer paquete (artículos por norma, saltos, muestras contra el SPIJ) y publicación en `docs/normas/` | ⏳ |
| T-306 | Release v0.4.0 con la biblioteca | ⏳ |
| T-307 | F2: vigía diario (GitHub Actions + sitemap de busquedas.elperuano.pe) que abre un PR con el cambio propuesto | ⏳ |
| T-308 | F2: alerta por expediente cuando cambia un artículo citado en su memoria o chats | ⏳ |
| T-309 | Prueba de calidad con 40 preguntas (con y sin biblioteca) dentro de T-206 | ⏳ |

## Backlog priorizado
| # | Tarea | Épica | Notas |
|---|---|---|---|
| T-201 | ✅ Re-pedir aceptación de avisos si cambia `APP.policyVersion` | E4 | Pantalla tras desbloquear con los cambios (`POLICY_CHANGES`); historial en `consent.history` |
| T-202 | Integridad SRI (`integrity` + `crossorigin`) para pdf.js y mammoth | E7 | Evita que un CDN comprometido inyecte código con acceso a la bóveda abierta |
| T-203 | ✅ Incluir tipografías en el HTML (base64 o subset) — hecho en v0.3.0 | E7 | Elimina la exposición de IP a Google Fonts |
| T-204 | Content-Security-Policy por `<meta>` (connect-src solo proveedores) | E7 | Evaluar compatibilidad con file:// |
| T-205 | Prueba con 3–5 abogados de confianza; registrar fricciones | E5 | Mensaje de presentación pendiente |
| T-206 | Prueba ciega de calidad: 20 tareas anonimizadas, DeepSeek V4.1 Flash vs Gemini 3.8 Flash vs Sonnet 5.5 | E5 | Pantalla de comparación lado a lado sin revelar el modelo |
| T-207 | Texto del primer Release y mensaje para abogados | E4 | |
| T-208 | Selector "Rápido / Profundo" (modelo económico vs. modelo grande) | E5 | Solo si la prueba ciega lo justifica |
| T-209 | Empaquetar en Electron: datos en disco, key en llavero del SO, sin dependencia de CDN | E6 | Firma de código antes de distribuir .exe |
| T-210 | Conector CEJ local: el abogado resuelve el captcha en su sesión y el conector lee el resultado | E6 | Nunca romper captchas desde servidor |
| T-211 | SINOE: lector de avisos por correo (OAuth solo lectura) + descarga de cédula desde la PC | E6 | Credenciales solo en el llavero del SO |
| T-212 | OCR local para PDF escaneados | E6 | Evaluar Tesseract en Electron |
| T-213 | Sincronización entre equipos | E6 | Implica rol de encargado si pasa por servidor: diseñar cifrado extremo a extremo |
| T-214 | Plantillas de escritos frecuentes (alimentos, violencia, apelación) | E5 | Siempre como borrador |
| T-215 | Reemplazo de apodos y apellidos sueltos (alias por parte) | E2 | Campo "también conocido como" en Partes |

## Completado (resumen)
Ver memory.md → ✅ Completado y CHANGELOG.md.
