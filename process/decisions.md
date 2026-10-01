# Decisiones (ADR) — Folio

| # | Decisión | Fecha | Alternativas descartadas | Razón |
|---|---|---|---|---|
| D-01 | Diferenciador = memoria estructurada por expediente (harness), no BYOK | 2026-09-30 | Competir por modelo o por BYOK | BYOK ya es estándar (Law OSS, Mike, LQ.AI); DOXS solo ofrece chat por expediente en su plan de S/200 |
| D-02 | Arquitectura local-first, sin servidores del autor | 2026-09-30 | Backend central con memoria en la nube | Privacidad como argumento; el autor no es responsable ni encargado del contenido (Ley 29733) |
| D-03 | Fase 1 = solo BYOK, cero backend | 2026-09-30 | Proxy propio desde el inicio | "Desde lo más simple"; validar con abogados reales antes de invertir |
| D-04 | Prototipo como un solo archivo HTML descargable | 2026-09-30 | Artifact publicado; Electron desde el inicio | Un artifact publicado bloquea llamadas a proveedores; HTML = doble clic, sin instalación |
| D-05 | Bóveda AES-GCM 256 + PBKDF2-SHA-256 310 000 it., sin recuperación | 2026-09-30 | Datos en claro / localStorage | Privacidad por diseño; la key del proveedor también va cifrada |
| D-06 | Seudonimización local activada por defecto + revisión previa del envío | 2026-09-30 | Enviar texto real | Reduce exposición en flujo transfronterizo; seudonimizar ≠ anonimizar, por eso se muestra lo que sale |
| D-07 | Recuperación por palabras clave (top 4 fragmentos) | 2026-09-30 | Embeddings | Todo local, sin dependencias ni costos adicionales; suficiente para MVP |
| D-08 | La memoria solo cambia con aprobación del abogado (ítem por ítem) | 2026-09-30 | Actualización automática | El abogado es responsable; los plazos propuestos vienen desmarcados |
| D-09 | Folio no calcula plazos procesales | 2026-09-30 | Calculadora de días hábiles | Riesgo alto de error (feriados, días no laborables del PJ); el abogado los registra |
| D-10 | CEJ: "pegar seguimiento" + ordenar con IA; sin scraping | 2026-09-30 | Scraping en servidor con captcha (DOXS/Apify) | Romper captchas del PJ es zona gris y riesgo serio para personal del PJ |
| D-11 | SINOE fuera del MVP; a futuro credenciales solo en el llavero del SO | 2026-09-30 | Guardar credenciales en servidor (DOXS Max) | La casilla es el domicilio procesal electrónico; no custodiarla |
| D-12 | Quitar cabecera `X-Title` y pedir /models sin cabeceras | 2026-09-30 | Mantener cabeceras opcionales | Fallaba la conexión real desde file:// (preflight CORS) |
| D-13 | OpenRouter con `reasoning.effort = low` y más tokens | 2026-09-30 | max_tokens bajos | Modelos actuales (p. ej. Sonnet 5.5) tienen razonamiento obligatorio y agotaban el presupuesto |
| D-14 | Ocultar modelos `:free` | 2026-09-30 | Mostrarlos | Suelen usar las consultas para entrenar |
| D-15 | Eliminar Ollama de la app | 2026-09-30 | Mantenerlo | Un abogado no sabría configurarlo |
| D-16 | Solo gratuito con BYOK; plan pagado descartado por ahora | 2026-09-30 | Plan propio con DeepSeek (S/29–49/mes) | Exige RUC, facturación, rol de encargado y agrava la incompatibilidad con el cargo en el PJ |
| D-17 | DeepSeek solo vía OpenRouter con ZDR; nunca su API directa | 2026-09-30 | Opción "API de DeepSeek" | Su política (feb. 2026) indica que guarda datos en China y puede entrenar con ellos |
| D-18 | "Servidor propio (lo configura un técnico)" en lugar de "Otro compatible" | 2026-09-30 | Mantener opción técnica genérica | El abogado no configura nada; el técnico pone la dirección |
| D-19 | Servicio de instalación de servidor propio fuera de Folio; mención solo si `OWNER.serviceContact` | 2026-09-30 | Promocionarlo en la app sin aviso | Transparencia: si aparece, se declara "independiente y pagado" |
| D-20 | Código abierto en GitHub con licencia AGPL-3.0 | 2026-09-30 | MIT; solo descarga | Reputación/portafolio y verificabilidad; AGPL evita forks cerrados que lucren sin publicar código |
| D-21 | Distribuir el HTML en Releases; no `.exe` sin firmar | 2026-09-30 | Instalador Electron sin firma | La advertencia de SmartScreen asusta a usuarios no técnicos |
| D-22 | Datos del autor centralizados en `src/config.js`; nunca correo del PJ | 2026-09-30 | Datos fijos en textos legales | Separar el proyecto personal del trabajo institucional; editar en un solo lugar |
| D-23 | Textos legales en tercera persona ("el desarrollador") | 2026-09-30 | "Nosotros" | No hay empresa ni RUC detrás |
| D-24 | Rediseño v0.3.0: app con el mismo sistema visual del sitio, en claro y oscuro | 2026-09-30 | Solo oscuro (clon exacto del sitio); mantener el estilo papel/violeta | Coherencia sitio↔app; el modo claro se mantiene para lecturas largas de día; texto secundario con más contraste que el sitio |
| D-25 | Tipografías incluidas en el HTML (T-203) y política r2: la app ya no consulta Google Fonts | 2026-09-30 | Seguir con Google Fonts | Elimina la exposición de IP al abrir; funciona sin internet. Se cambió la sección 9 de la política → `policyVersion` = "2026-09-30 r2 (borrador)" |
