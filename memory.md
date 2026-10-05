# Estado actual — Folio
> Última actualización: 2026-10-05 · Versión publicada: 0.5.0

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

## ✅ Completado (sesión 2026-09-30 → 2026-10-03)
- [x] Repo público + GitHub Pages (sitio con SEO) · v0.2.0
- [x] v0.3.0 rediseño visual claro/oscuro, tipografías incluidas (sin Google Fonts)
- [x] v0.3.1 re-aceptación de avisos (T-201) + aviso de nueva versión desde GitHub
- [x] **v0.4.0 biblioteca legal peruana (E8)**: 7 normas en `docs/normas` (CONST, CC, CPC, CP parcial 1–200-A, NCPP, NCPCO, CNA · 4 588 entradas), búsqueda local, búsqueda asistida, fichas de citas (vigente, texto distinto, por regir, derogado, reubicado, inexistente, extranjera, fuera), fecha de corte, actualización automática
- [x] Revisión asistida del paquete contra el SPIJ: 510 artículos con cambios parciales → 0 pendientes (`normas/reporte-verificacion.md`, `normas/revision/`, `normas/ajustes/`); visto bueno del usuario 2026-10-03
- [x] Logo oficial en el sitio y banner en el README (commit 4ce9f76)
- [x] Sitio registrado en Google Search Console (propiedad por prefijo de URL, verificación por etiqueta meta en docs/index.html; no borrarla) y sitemap.xml enviado; indexación solicitada. Al inicio Google mostró "No se ha podido obtener" (normal); revisar en unos días
- [x] **v0.5.0 publicada — E9 rediseño UX (F1–F6)**: paleta marino/teal del logo, agente plegable (abierto/amplio/cerrado, `Ctrl+.`), pestaña Resumen, memoria sin tarjetas, línea de tiempo por mes, documentos en lista, ventana de privacidad, agenda agrupada. e2e TODO OK (65 comprobaciones). Capturas en `tests/shots/` (01, 02, 04, 10–13)

## ⏳ Pendiente (marcado por el usuario al cerrar la sesión 2026-10-03)
- [x] Anuncio v0.5.0 en X publicado por el usuario (2026-10-03, con banner). Post de citas publicado.
- [ ] Semana 5–11/10 en X: 7 borradores en Typefully (ver Historial); publicar a mano (X bloquea por API posts con enlaces); jueves como encuesta nativa; sábado grabar video con datos ficticios
- [ ] Post corto para grupos de Facebook de abogados (texto en la sesión 2026-10-03; revisar reglas del grupo sobre enlaces)
- [ ] **E9**: recoger observaciones del usuario sobre v0.5.0 (ajustes en una v0.5.x) y aplicar la paleta marino/teal al sitio (T-411)
- [ ] **T-304** Descargar del SPIJ las 4 normas que faltan → `normas/fuentes/`: `L30364.doc` (Ley 30364), `NLPT.doc` (Ley 29497), `LPAG.doc` (TUO Ley 27444), `LOPJ.doc` (TUO LOPJ). No están en "Normativa básica": usar el buscador del SPIJ. Luego: conversor + reporte (0 pendientes) + visto bueno + push (Folio las descarga solo)
- [ ] **T-304b** Código Penal, segunda parte (arts. 201 en adelante) → `normas/fuentes/CP-2.doc`; al tenerla, quitar `parcial` del CP en `catalogo.json`
- [ ] **T-307/T-308** F2: vigía diario de El Peruano (GitHub Actions + sitemap de busquedas.elperuano.pe) y alerta por expediente cuando cambia un artículo citado
- [ ] **§12.2 del spec**: horas semanales del mantenedor para revisar cambios (define el ritmo de F2)
- [ ] T-105/T-106 Probar con un PDF/DOCX reales y con OpenAI/Anthropic directos
- [ ] Verificar en la red del PJ (proxy Forcepoint) el aviso de versión y la descarga de la biblioteca (GitHub Pages); probar el traspaso de datos en Firefox
- [ ] T-205 Prueba con 3–5 abogados de confianza · T-206/T-309 prueba ciega de calidad (con y sin biblioteca)

- 2026-10-03: anuncio v0.5.0 publicado en X (a mano: X bloquea por API posts con enlaces). Post 2 (citas) publicado; versión simple en borrador Typefully d=11059349. Guía para próximos posts: process/estrategia-x.md. Semana 5–11/10 en borradores Typefully (lun 11059349, mar 11059640, mié 11059642, jue 11059644, vie 11059645, sáb 11059646 video, dom 11059648); se publican a mano

## ⚠️ Decisiones vigentes (detalle en process/decisions.md)
- Solo gratuito con BYOK; plan pagado descartado por ahora (exige RUC, encargo de datos y choca con el cargo en el PJ)
- DeepSeek solo vía OpenRouter con ZDR, nunca su API directa
- Biblioteca legal: fuente única = texto oficial del SPIJ (descarga manual, nunca extracción automática); foros/redes no son fuente; ningún paquete sin revisión + visto bueno del mantenedor (D-28 a D-33)
- Distribución: HTML en GitHub Releases; biblioteca en GitHub Pages (`docs/normas`)
- Rediseño v0.5 (D-34 a D-37): el expediente es el centro; panel "Agente" (nunca "Folio IA"); destino de los datos siempre visible al enviar; teal `#0F766E` en claro; se mantienen DM Sans y Fragment Mono

## 🔴 Bloqueantes
- Nota: el anuncio se publicó antes de resolver los dos bloqueantes siguientes (decisión del usuario, 2026-10-03); siguen pendientes
- Validación de textos legales por un especialista en datos personales (antes de difundir)
- Consulta escrita sobre incompatibilidades del cargo en el PJ (antes de difundir y, sobre todo, antes de cobrar cualquier servicio). Pregunta concreta: "desarrollo y publico en mi tiempo libre un software gratuito y de código abierto, sin fines de lucro ni recursos institucionales, ¿hay incompatibilidad?" → Gerencia de RR. HH. / Oficina de Integridad de la CSJ Junín. Análisis en process/legal-privacy.md §Incompatibilidad del cargo

## 📌 Próximos pasos (próxima sesión)
- Redes: revisar qué post tuvo más respuestas y preparar la semana siguiente con process/estrategia-x.md
0. **E9**: observaciones del usuario sobre v0.5.0 → ajustes (v0.5.x) → T-411: llevar la paleta marino/teal al sitio (docs/index.html)
1. Si el usuario trae las 4 normas o `CP-2.doc`: `python normas/build_normas.py --strict --reporte normas/reporte-verificacion.md` → revisar pendientes del reporte (los formatos del SPIJ ya conocidos están en normas/README.md) → visto bueno → commit + push (sin Release: la app actualiza la biblioteca sola)
2. Si no: empezar F2 (spec §6 y T-307) o la prueba con abogados (T-205)
3. Al cambiar normas, el sitio y el README mencionan "Pronto: Ley 30364, NLPT, LPAG y LOPJ": actualizar cuando se publiquen

## Historial
- 2026-10-05: métricas base — descargas de folio.html en Releases: 6 en total (v0.2.0: 0 · v0.3.0: 2 · v0.3.1: 1 · v0.4.0: 2 · v0.5.0: 1; incluye descargas propias); repo: 1 estrella, 0 forks. Visitas al repo: solo el dueño las ve en GitHub → Insights → Traffic (14 días). GoatCounter agregado al sitio por el usuario (commit dfc1210, código `foliope`, panel en https://foliope.goatcounter.com); cuenta solo desde el 2026-10-05; nunca dentro de la app. Aviso en el pie del sitio y clics en los 4 botones de descarga como eventos (`descargar-menu`, `-portada`, `-pasos`, `-final`)
- 2026-09-30: repo público, Release v0.2.0, README con SEO, sitio en GitHub Pages (docs/index.html → https://mscnegocio-del.github.io/Folio/). Pendiente: registrar el sitio en Google Search Console.
- 2026-09-30: sitio rediseñado con estilo oscuro tipo DeepSeek Harness (Montserrat/DM Sans/Fragment Mono, botones píldora); sin logos ni textos de DeepSeek.
- 2026-09-30: v0.3.0 — app rediseñada con el sistema del sitio (DM Sans/Montserrat/Fragment Mono, acento azul, píldoras), fuentes en base64 (src/fonts.css), sin Google Fonts; e2e TODO OK.
- 2026-10-01: T-201 hecho — pantalla de re-aceptación tras desbloquear (POLICY_CHANGES en legal.js, consent.history); e2e TODO OK. Sin Release aún.
- 2026-10-01: v0.3.1 publicada — re-aceptación de avisos (T-201) + aviso de nueva versión desde GitHub (política 2026-10-01). Los usuarios de v0.3.0 o anteriores deben descargar v0.3.1 a mano una vez; desde ahí la app avisa sola.
- 2026-10-01: spec E8 (biblioteca legal peruana vigente + verificador de citas + actualización híbrida diaria/semanal). Pendiente aprobación.
- 2026-10-01: E8 F0+F1 (motor). D. Leg. 822 art. 9 b confirmado; SPIJ sin términos → descarga manual; vigía F2 sobre busquedas.elperuano.pe. APP.version 0.4.0 sin release (falta corpus real). Pendiente respuesta §12.2 (horas semanales del mantenedor).
- 2026-10-01: conversor calibrado con CP.doc y NCPP.doc reales del SPIJ (son HTML con extensión .doc; cada artículo trae su historial y se conserva la última versión; incorporados van con la nota después; fe de erratas al final). Resultado: CP parte 1 = 290 arts (1 a 200-A), NCPP = 574. Falta: CP segunda parte (el SPIJ lo divide en dos), revisión humana de artículos con modificaciones parciales (22 CP, 80 NCPP marcados 'revisar') y el resto de normas.
- 2026-10-02: CP segunda parte queda pendiente (el usuario no la encontró). CP marcado `parcial` en el catálogo: Folio no marca como inexistentes los artículos que faltan y avisa al modelo. Siguiente: descargar CONST, CC, CPC, NCPCO y CNA.
- 2026-10-02: 7 normas convertidas desde el SPIJ: CONST 229 (incl. 16 DFT), CC 2149, CPC 903, CP 290 (parcial), NCPP 581, NCPCO 141, CNA 283. Conversor: disposiciones finales como entradas propias (DFT-CUARTA…), derogación solo si es del artículo completo, salta índices/cuadros de modificaciones/datos de Word, ignora artículos de otras normas citados (saltos >100). Pendiente: revisión humana de 213 artículos con modificaciones parciales; faltan L30364, NLPT, LPAG, LOPJ (buscador del SPIJ) y CP parte 2.
- 2026-10-03: revisión asistida del paquete (7 normas, 4 588 entradas): 510 artículos con cambios parciales → 494 sobre marca, 14 verificados, 2 ajustes (CONST 2, CP 121), 0 pendientes. Se corrigieron ~10 errores del conversor (texto perdido, versiones viejas, notas (1)(2), reubicados Ley 31146, 129-Ñ). Reporte: normas/reporte-verificacion.md. **Falta: visto bueno del usuario para publicar docs/normas y v0.4.0**; faltan L30364, NLPT, LPAG, LOPJ y CP parte 2.
- 2026-10-03: v0.4.0 publicada con la biblioteca legal (7 normas en docs/normas, GitHub Pages). Probada con el paquete real: instalación, búsqueda, fichas (152 ✓, 153 → 129-A, 296 ○ parcial). Siguiente: L30364, NLPT, LPAG, LOPJ y CP parte 2; luego F2 (vigía diario de El Peruano).
- 2026-10-03: cierre de sesión. Pendientes marcados: 4 normas (L30364, NLPT, LPAG, LOPJ), CP parte 2, F2 vigía, §12.2, Search Console, pruebas con PDF/proveedores/red PJ/Firefox y con abogados.
- 2026-10-03: logo oficial en el sitio (docs/img/folio-logo-blanco.webp, versión blanca para fondo oscuro; original recortado en folio-logo.webp; favicon folio-icono.png) y banner en el README (docs/img/folio-banner.webp).
- 2026-10-03: spec E9 rediseño UX v0.5.0 a partir del análisis externo (Folio_Propuesta_Rediseño_UX_UI.md): se toma la mayor parte; se descartan 'Folio IA' (presentaría el modelo como propio), cambio de tipografías, contadores de memoria, barra superior con buscador y emojis; teal corregido a #0F766E en tema claro (contraste). Pendiente aprobación.
- 2026-10-03: E9 implementado (F1–F6) sin publicar: tokens marino/teal (contraste AA verificado), logo WebP incluido por build.py desde `src/img`, panel del agente con 3 estados (`settings.agentPanel`), Resumen calculado en el equipo, memoria con campos tipo documento, línea de tiempo y documentos en lista. folio.html +47 KB. Pendiente: revisión del usuario y Release.
- 2026-10-03: **v0.5.0 publicada** (Release en GitHub con dist/folio.html). Sin cambio de política (no hay salidas de red nuevas): los usuarios de v0.3.1+ reciben el aviso de nueva versión. Sitio: solo se actualizó el número de versión (la paleta queda para T-411).
- 2026-10-03: Search Console: verificado con la cuenta correcta (la etiqueta de otra cuenta se quitó), sitemap enviado y comprobado en línea.
- 2026-10-03: Search Console verificado; Typefully conectado y borrador del anuncio v0.5.0 creado (no publicado). Análisis de incompatibilidad del cargo (Ley 30745 dedicación exclusiva salvo docencia; Ley 27588; Ley 27815; casos ODANC Ica y OCMA ODECMA Lima Norte) → process/legal-privacy.md. Regla nueva: trabajar Folio solo fuera de horario y en equipo personal, nunca en la red del PJ.
- 2026-10-03: cierre. Redes: anuncio y post de citas publicados en X; guía process/estrategia-x.md; 7 borradores semanales; post para Facebook. Sin cambios de código.
