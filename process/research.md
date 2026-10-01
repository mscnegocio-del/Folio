# Investigación — mercado, integraciones y modelos
> Fuentes consultadas en septiembre de 2026. Verificar antes de citar públicamente.

## 1. ¿Existe el modelo "app gratis + BYOK"?
Sí, a nivel global, pero no en Perú con memoria por expediente.

| Producto | Modelo | Notas |
|---|---|---|
| Law OSS (lawoss.com) | Hosteado gratis, key propia (Claude/Gemini) | Agente de litigio; beta; advierte no subir documentos sensibles; jurisprudencia EE.UU./Reino Unido |
| Mike (mikeoss.com) | Open source, clon de Harvey/Legora | Workspaces por caso con contexto completo: lo más parecido al harness por expediente |
| LQ.AI (LegalQuants) | Open source, self-hosted, BYOK u Ollama | Proyectos por caso |
| Astra for Law (OpenAI) | Modelo base para legaltechs (gpt-6-astra-law) | Lanzado ~mediados de sept. 2026; conviene ofrecerlo como opción, no competir |

### Competencia directa en Perú (sin BYOK)
| Producto | Qué hace | Precio reportado |
|---|---|---|
| DOXS.AI | CEJFLOW: monitorea CEJ 2 veces/día (3 expedientes, 20 consultas/día en Pro), extensión de navegador; Max: SINOE, calendario de audiencias, SUNARP y chat por expediente | Pro S/35/mes · Max S/200/mes (también se reportó un plan de S/99) |
| Lexana | Automatiza SINOE con alertas por WhatsApp, gestión de expedientes, jurisprudencia semántica, análisis de jueces | Planes Base/Pro/Apex |
| AbogacIA (abogacia.pe) | Monitorea SINOE, alertas por correo/WhatsApp, descarga el PDF de la cédula | — |

**Diferenciador de Folio:** memoria estructurada del caso (estado, plazos, partes, hechos, estrategia) + privacidad local + gratis. DOXS ofrece chat por expediente solo en su plan más caro.

## 2. Cómo se integran con CEJ y SINOE (inferencia técnica)
- **CEJ** (cej.pj.gob.pe, público con captcha):
  - Scraping en servidor resolviendo captcha (DOXS; scraper de Apify con hasta 20 reintentos, figura en mantenimiento → frágil).
  - Extensión de navegador que llena el formulario (DOXS).
- **SINOE** (privado, usuario/contraseña; la casilla es el domicilio procesal electrónico):
  - DOXS Max lo hace "desde la web sin extensión" → infiere que guardan credenciales y entran en nombre del abogado.
  - El SINOE avisa por correo, pero la notificación solo está dentro de la casilla.
- No hay API pública del PJ para el CEJ.

**Propuesta Folio (futuro, E6):** conector local donde el abogado resuelve el captcha en su propia sesión; credenciales SINOE en el llavero del SO y login desde su PC; lector de avisos SINOE por correo (OAuth solo lectura) como disparador. Trade-off: el conector solo trabaja con la PC encendida.

## 3. Modelos y costos (OpenRouter, sept. 2026)
Supuesto por consulta: ~8 000 tokens de entrada (memoria + fragmentos + historial) y ~2 500 de salida (incluye razonamiento). Uso intensivo: 400 consultas/mes.

| Modelo | Entrada / salida (US$ por M tokens) | Índice AA* | Por consulta | 400/mes |
|---|---|---|---|---|
| DeepSeek V4.1 Flash | 0.0198 / 0.396 | 39.5 | ~$0.0012 | ~$0.46 |
| DeepSeek V4 Pro 0813 | 0.66 / 1.98 (×2 en hora pico) | 36.0 | ~$0.010 | ~$4.1 |
| GPT-6 Luna | 0.10 / 0.50 | 37.3 | ~$0.002 | ~$0.82 |
| Gemini 3.8 Flash | 0.75 / 3.75 | 40.9 | ~$0.015 | ~$6.2 |
| Claude Sonnet 5.5 | 2 / 10 | 56.0 | ~$0.041 | ~$16.4 |
| GPT-6.1 Sol | 2 / 10 | 51.8 | ~$0.041 | ~$16.4 |
| Claude Opus 5.5 | 4 / 20 | 57.6 | ~$0.082 | ~$33 |

*Índice de inteligencia de Artificial Analysis incluido en la lista de OpenRouter; medida general, no evalúa derecho peruano.

Conclusiones:
- V4.1 Flash supera a V4 Pro en índice y cuesta ~9 veces menos → nunca usar V4 Pro.
- DeepSeek está ~16 puntos debajo de Sonnet 5.5: la diferencia se nota en redacción y en riesgo de inventar normas → prueba ciega (T-206).
- Varios modelos actuales tienen razonamiento obligatorio: requieren margen de tokens (ver D-13).
- Los precios listados pueden ser los del proveedor más barato; con ZDR/fuera de China pueden subir. Ver `openrouter.ai/api/v1/models/<id>/endpoints`.

## 4. OpenRouter: funciones relevantes
- Keys de aprovisionamiento (Management API): crear una key por cliente con límite de crédito y reinicio diario/semanal/mensual; la key de administración no puede hacer completions.
- Guardrails por key: límite de gasto, modelos permitidos, proveedores permitidos, exigir ZDR, regiones de datos. Permitiría un plan pagado sin proxy.
- No guarda prompts salvo que se active el registro; NO activarlo (según terceros, a cambio de ~1% de descuento cede derechos comerciales amplios).
- ZDR: por cuenta o por solicitud (`provider.zdr`); excluye la API propia de DeepSeek.

## 5. DeepSeek API directa
Su política de privacidad (actualizada feb. 2026) indica que almacena los datos en servidores en China y puede usarlos para entrenar salvo exclusión del usuario. Por eso Folio solo la permite vía OpenRouter con ZDR (D-17).

## 6. Plan pagado (archivado, D-16)
Diseño evaluado por si se retoma:
- Esencial ~S/29/mes con IGV: DeepSeek V4.1 Flash con tope $3/mes por key; neto ~S/23; costo típico S/2–5.
- Profesional ~S/39–49/mes: + ~40 consultas "profundas" con Sonnet 5.5 (~S/6 de costo).
- Implementación: guardrails por key + función serverless (Supabase) que crea/revoca keys al confirmar pago.
- Requisitos: RUC, comprobantes electrónicos, pasarela, términos del plan, política ampliada, consulta de incompatibilidad.
- Posicionamiento: no "más barato que la API", sino "sin crear cuentas ni keys, precio fijo en soles". Comparar con ChatGPT Plus y DOXS.

## 7. Servidor propio (servicio aparte, D-19)
- GPU de 24 GB → modelos tipo Qwen3.8 27B cuantizado (índice 33.7). GPU de 8–12 GB → modelos pequeños, no aptos para redactar escritos.
- No compite en costo (equipo de miles de soles vs S/2–60/mes de API). Argumento único: "nada sale de tu oficina".
- Cliente ideal: estudio con varios abogados y casos sensibles (familia, violencia, penal).
- Cobrar por instalación requiere RUC (recibos por honorarios) y consulta previa de incompatibilidad.
