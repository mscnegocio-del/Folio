# Changelog — Folio

## [Sin publicar] — rediseño UX/UI v0.5 "el expediente primero"
### Cambiado
- Identidad del logo: azul marino + teal en claro y oscuro (reemplaza el acento azul); logo e ícono incluidos en el HTML.
- El expediente es el centro: carátula con número, partes, ficha de estado e indicador "Solo en este equipo · cifrado" (el sello girado sale de la carátula).
- Agente plegable: abierto, amplio o cerrado (botón flotante); recuerda la elección; `Ctrl+.` y `Esc`. En celular ocupa la pantalla completa.
- Nueva pestaña **Resumen** (estado, próximo plazo, últimos movimientos, pendientes, documentos y "Folio recuerda"), con pasos guiados en expedientes nuevos.
- Memoria sin tarjetas: hechos ("lo que consta") separados de la estrategia ("tu criterio"), campos con aspecto de documento y "Datos protegidos antes de consultar a la IA".
- Movimientos en línea de tiempo por mes (30 últimos + "Ver anteriores"); documentos en lista con buscador.
- Agente: detalle del proveedor plegable, "Folio recuerda" antes de la primera consulta, acciones rápidas según el plazo más cercano y "Actualizar memoria" bajo la última respuesta.
- Barra lateral: agenda agrupada (vencidos, hoy, próximos 7 días) y expedientes ordenados por última modificación.
- Ventana "Privacidad de este expediente" (también desde la barra lateral).
### Pruebas
- e2e: estados del agente (amplio, Esc, cerrado, se recuerda tras bloquear, Ctrl+.), Resumen, privacidad, línea de tiempo, documentos, expediente nuevo con pasos guiados, agente a pantalla completa y sin desbordes en celular.

## [0.4.0] — 2026-10-03
### Agregado
- Biblioteca legal peruana (E8): descarga recomendada desde la bienvenida o Ajustes, búsqueda local, búsqueda legal asistida, bloque de normas vigentes en cada consulta, fichas de verificación de citas, fecha de corte y avisos de atraso, actualización automática incremental y "Ver cambios recientes".
- Conversor `normas/build_normas.py` con reporte de calidad y catálogo de las 11 normas aprobadas; lee las exportaciones del SPIJ (HTML con extensión .doc), aplica cada cambio sobre la marca (*) o (n), registra la verificación en `normas/reporte-verificacion.md` y admite correcciones con texto oficial (`normas/ajustes/`) y revisiones (`normas/revision/`).
- Artículos reubicados y renumerados (p. ej., CP 153 → 129-A por la Ley 31146): ficha ⚠ con el número actual y el artículo de destino en el contexto del agente.
- Términos de uso §7 (la biblioteca no es edición oficial) y política sección 9 (descarga desde GitHub Pages). Versión de avisos "2026-10-01 r2".
### Cambiado
- Paquete inicial: 7 normas (4 588 entradas) con revisión asistida contra el SPIJ (`normas/reporte-verificacion.md`). El Código Penal llega hasta el art. 200-A (falta la segunda parte en el SPIJ) y Folio lo indica.
- Carga atómica de la biblioteca y búsqueda con más peso al título de cada artículo.
### Pruebas
- e2e con paquete ficticio armado por el conversor real: instalación, revisión previa, envío sin datos reales, fichas de citas, actualización incremental y aviso de atraso.

## [0.3.1] — 2026-10-01
### Agregado
- Aviso de nueva versión: al desbloquear, Folio consulta la página pública de versiones en GitHub (máximo dos veces al día) y, si hay una más reciente, muestra una barra que no interrumpe el trabajo, con "Actualizar" (copia de seguridad, descarga y pasos) y "Más tarde".
- Ajustes → Actualizaciones: activar o desactivar la búsqueda y "Buscar ahora".
- Política de privacidad (versión "2026-10-01"): declara la consulta a GitHub. Quien venga de una versión anterior verá la pantalla de re-aceptación.
- Re-aceptación de avisos (T-201): si la política o los términos cambiaron desde la última aceptación, Folio muestra qué cambió al desbloquear y pide aceptarlos para continuar. "Ahora no" bloquea sin borrar nada.
- Historial de aceptaciones en este equipo; Ajustes indica cuántas aceptaciones anteriores hay.
### Pruebas
- La prueba end-to-end cubre la re-aceptación (botón bloqueado sin casilla, rechazo, aceptación e historial) y el aviso de nueva versión (consulta GET sin datos, seguir trabajando, enlace de descarga, "Más tarde", límite de 12 h).

## [0.3.0] — 2026-09-30
### Cambiado
- Rediseño visual: la app usa el mismo sistema que el sitio web (botones en píldora, tarjetas redondeadas, pestañas en segmento, brillo azul en pantallas de entrada), en tema claro y oscuro.
- Tipografías: DM Sans (interfaz), Montserrat (títulos) y Fragment Mono (números de expediente, fechas y foliador), en lugar de Atkinson Hyperlegible y Courier Prime.
- Acento azul en lugar de violeta; nuevo logo (ícono de documento + "folio" + insignia Beta) e ícono de pestaña.
- Política de privacidad (versión "2026-09-30 r2"): la app ya no se conecta a ningún servicio al abrirse.
### Seguridad
- Las tipografías vienen incluidas en el archivo: se eliminó la consulta a Google Fonts que exponía la IP al abrir Folio (T-203).
### Pruebas
- La prueba end-to-end verifica que no haya solicitudes a Google Fonts y captura el expediente en modo oscuro.

## [0.2.0] — 2026-09-30
### Agregado
- Guía "¿Cómo obtengo mi key?" dentro de la app (OpenRouter, OpenAI, Anthropic, DeepSeek, servidor propio) y en `docs/guia-api-keys.md`.
- Modelos sugeridos en OpenRouter: Claude Sonnet 5.5, GPT-6.1 Sol, Gemini 3.8 Flash y DeepSeek V4.1 Flash.
- Opción "Servidor propio (lo configura un técnico)" con key opcional.
- `src/config.js` con los datos del autor; mención opcional del servicio de instalación (`serviceContact`).
- Harness del proyecto: `AGENTS.md`, `memory.md`, `process/`, prueba end-to-end en `tests/`.
### Cambiado
- Textos legales para versión gratuita y de código abierto (AGPL-3.0), sin RUC ni plan pagado.
- Anthropic: guía y enlaces actualizados a platform.claude.com.
- OpenRouter: razonamiento bajo y más tokens para modelos con razonamiento obligatorio.
- Lista de modelos sin `:free` ni `:batch`.
### Eliminado
- Opción Ollama (los ajustes guardados se migran a OpenRouter).
### Corregido
- Conexión real con OpenRouter desde file:// (se quitó la cabecera `X-Title`; /models sin cabeceras).
- Mensajes de error de red con diagnóstico (red bloqueada, sin internet, key con caracteres inválidos).

## [0.1.0] — 2026-09-30
### Agregado
- MVP local-first en un solo HTML: bóveda cifrada, bienvenida de 5 pasos con consentimientos, expedientes con memoria, movimientos (manual y pegado del CEJ), documentos PDF/DOCX/TXT, agente con streaming, seudonimización, revisión previa, actualizar memoria con aprobación, registro de envíos, copia de seguridad cifrada, modo oscuro y diseño responsive.
