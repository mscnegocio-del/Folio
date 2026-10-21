# Changelog — Folio

## [0.8.1] — 2026-10-21 — ley aplicable
Política 2026-10-21 r2 (borrador): al desbloquear se pide aceptar de nuevo.

### Avisos legales
- Términos de uso, sección 10 (Ley aplicable): cualquier controversia se someterá a los jueces del Perú, sin indicar una ciudad.
### Sitio
- El pie dice «© 2026 mscnegocio@gmail.com, Perú» y la portada muestra la interfaz de tres zonas (expedientes, agente y ficha).


## [0.8.0] — 2026-10-21 — tabla de revisión del expediente
Elige varios documentos y obtén una tabla: una fila por documento y una columna por pregunta, cada dato con su cita textual **verificada en tu equipo**. Política 2026-10-21 (borrador): al desbloquear se pide aceptar de nuevo.

### Agregado (v0.8 · E12: tabla de revisión)
- "Nueva tabla de revisión" (desde Documentos, la barra o `/cronologia`): plantillas **Cronología de resoluciones**, **Medios probatorios**, **Notificaciones** y **En blanco**; eliges los documentos y ves antes cuántos se envían y cuántos tokens, a qué proveedor y que van con los datos reemplazados.
- El agente revisa **un documento por consulta** y llena la tabla fila por fila ("Revisando 2 de 5 · Detener"). La fecha y el número de resolución se leen en tu equipo, sin IA.
- Cada celda del agente trae una **cita textual** que Folio busca en el documento, en tu equipo: **✓** si la encontró (con su página), **⚠** si no está en el texto. Los plazos van siempre en ámbar con "verifica en la resolución y tu casilla".
- Un clic en una celda abre la **fuente en la Ficha**: el pasaje del documento con la cita resaltada. Puedes **editar la celda** ("editado por ti") o **volver a revisar la fila**.
- **Agregar a Movimientos** (con Deshacer; omite los que ya existen), **Proponer a la memoria** (los plazos van a la caja de cambios como pendientes por verificar o plazos por confirmar), **Copiar** como tabla y **Exportar CSV**.
- **Columnas propias**: nombre, pregunta para el agente y tipo (texto, fecha, sí/no o cita textual); solo se pregunta esa columna en cada documento.
- Las tablas quedan en el expediente (Inicio y barra); "⋯" para renombrar o borrar.
### Avisos legales
- Política 2026-10-21 (borrador), sección 4: si usas una tabla de revisión, salen completos los documentos que elijas, uno por consulta, con los datos reemplazados. Sin nuevas conexiones.
### Pruebas
- e2e: ventana de nueva tabla, vista previa del lote, una consulta por documento sin nombres reales, citas ✓ y ⚠, fuente con la cita resaltada, editar, Movimientos con Deshacer, propuestas, CSV, columna nueva y accesibilidad (axe). Capturas 28 y 29.


## [0.7.0] — 2026-10-21 — nuevo expediente desde una resolución
Crea un expediente arrastrando la resolución, cédula o carátula que ya tienes: Folio lee el encabezado en tu equipo, sin IA, y registra a las partes antes de la primera consulta. Sin cambios en la política de privacidad.

### Agregado (v0.7 · E11: nuevo expediente desde una resolución)
- "Nuevo expediente" abre una ventana con una zona para **arrastrar o adjuntar** una resolución, cédula o carátula (PDF, Word o texto) y, debajo, el formulario a mano de siempre (ahora con juez y especialista).
- Folio lee el encabezado **en tu equipo, sin IA y sin red**: número, materia, especialidad (del número), distrito, juzgado, juez, especialista, partes con su rol y la resolución con su fecha. Muestra "Lo que Folio leyó" con lo detectado resaltado; lo que no aparece queda vacío y se avisa.
- Las partes se revisan en una lista (nombre, rol, DNI, "Mi cliente", quitar) y quedan registradas desde el primer momento, así que sus nombres ya se reemplazan en la primera consulta. El juez y el especialista son funcionarios públicos: no se reemplazan.
- Al crear, el documento queda como primer documento y la resolución como primer movimiento. El Inicio muestra "Creado desde «…»" y ofrece siempre "¿Quieres que el agente resuma lo que ordena esta resolución?" (consulta normal, con vista previa; sus propuestas van a la caja de cambios).
- Al agregar a un expediente una resolución del mismo número, Folio ofrece sumar solo las partes, el juzgado y el movimiento nuevos; nada se aplica sin tu clic.
- La Ficha tiene un bloque "Juzgado" (órgano, juez y especialista).
### Pruebas
- e2e: 5 encabezados ficticios (alimentos, penal, civil, laboral y una cédula) en `tests/fixtures/resoluciones/`, flujo completo de crear desde una resolución, datos nuevos de una segunda resolución, archivo sin texto, Esc y accesibilidad (axe). Capturas 26 y 27.

## [0.6.0] — 2026-10-18 — rediseño "tres zonas"
Expedientes a la izquierda, el agente al centro y la Ficha del expediente a la derecha. Varias conversaciones por expediente, aviso cuando una conversación ya es larga y memoria que el agente propone y tú apruebas. Política 2026-10-18 (borrador): al desbloquear se pide aceptar de nuevo.

### Cambiado (v0.6 · F6: celular, accesibilidad y pruebas)
- Auditoría de accesibilidad con axe-core (WCAG 2 A/AA y buenas prácticas) en claro y oscuro, escritorio y celular: sin hallazgos. Se corrigieron el contraste del número del expediente activo, el encabezado de la conversación (nivel 1 para lectores de pantalla), el orden de encabezados de la bienvenida y la vista previa del envío (ahora se recorre con el teclado).
- Teclado: el foco no sale de la vista previa mientras está abierta (Tab y Shift+Tab giran dentro); Esc cancela la confirmación de un plazo; tras aplicar, descartar o confirmar, el foco queda en la caja de cambios.
- Celular: la bienvenida ya no desborda a 390 px (los pasos se desplazan dentro); las citas largas se parten en lugar de ensanchar la respuesta; el aviso con "Deshacer" siempre cabe en la pantalla.
### Agregado
- Propuestas de memoria al terminar cada respuesta, dentro de la misma respuesta (sin consulta extra): el agente agrega un bloque que Folio quita del texto, también mientras llega, y lleva a la caja de la Ficha. Si el modelo no lo hace, queda "Actualizar memoria".
### Pruebas
- e2e: celular con proveedor (conversación, aviso de contexto en ámbar, cambios en la hoja, aviso), teclado, axe (opcional: `pip install axe-playwright-python`) y propuestas dentro de la respuesta. Capturas 24 y 25.

### Cambiado (v0.6 · F5: cambios propuestos en la Ficha)
- Lo que propone el agente ("Actualizar memoria" y "Seguir en una nueva") ya no abre una ventana: aparece en la Ficha, en la caja "Cambios propuestos por el agente", con su sección, el tipo (+ nuevo, ~ cambia con el texto anterior) y ✓ / ✕ en cada uno.
- "Aplicar N cambios" no incluye los plazos: cada plazo se confirma aparte con "¿Verificaste la fecha en la resolución y en tu casilla?" [Sí, confirmar] [Todavía no]. "Descartar" rechaza los cambios y deja los plazos.
- Tras aplicar, descartar o confirmar un plazo, un aviso abajo ofrece "Deshacer" (si editaste esa parte de la memoria después, no se pisa tu texto). Lo recién aplicado se resalta en la Ficha.
- En el hilo, una sola línea: "El agente propone N cambios en la memoria y M plazos por confirmar · Revisar en la ficha →"; tras aplicar, "✓ N cambios aplicados a la memoria" en verde. "Hoy" lleva directo a la caja.
- "Continúa de «…»" dice cuántos cambios de la conversación anterior quedan por revisar; "la memoria está al día" solo cuando no queda ninguno.
### Pruebas
- e2e: caja de cambios, ✓/✕, aplicar sin plazos, resaltado, deshacer, confirmar plazo (con "Todavía no") y línea del hilo.

### Cambiado (v0.6 · F4: ventana de contexto)
- Folio estima en tu equipo cuánto ocupa cada conversación (instrucciones, memoria, normas, fragmentos e historial completo) frente a un presupuesto útil de 60 000 tokens, ajustable en Ajustes → Privacidad de cada consulta. Ya no se corta el historial a los últimos 8 mensajes.
- Hasta el 70 % no se muestra nada. Desde el 70 %, sobre la caja: "Esta conversación ya es larga…" con [Seguir en una nueva] y [Seguir aquí]; desde el 90 % la línea pasa a ámbar y "Seguir en una nueva" es la acción principal. El porcentaje está en el "⋯" de la conversación.
- Si se pasa del 100 %, se envían los mensajes más recientes que caben y la vista previa dice cuántos quedaron fuera.
- "Seguir en una nueva": el agente resume la conversación y propone cambios de memoria en una sola consulta (seudonimizada, con revisión previa); eliges qué cambios aplicar (los plazos van desmarcados) y se abre una conversación con "Continúa de «…»". El resumen se guarda cifrado y va al agente en la conversación nueva.
### Avisos legales
- Política 2026-10-18 (borrador), sección 4: declara la copia cifrada local de lo enviado ("Ver lo que se envió") y del resumen. Se pide aceptar de nuevo al desbloquear.
### Pruebas
- e2e: umbrales 70/90 %, "Seguir aquí", porcentaje en ⋯, historial que no cabe, "Seguir en una nueva" (una consulta sin datos reales, resumen guardado y enviado seudonimizado, memoria aprobada) y presupuesto en Ajustes.

### Cambiado (v0.6 · F3: caja de texto)
- Los chips de la caja definen qué sale: sin "Memoria" no se envía la memoria del expediente; sin "Documentos" no se envían fragmentos; sin "Biblioteca" no hay búsqueda de normas ni artículos. "Leyó…" muestra lo que realmente se envió.
- `@` cita un documento o un movimiento (`@«nombre»`): su texto va en la consulta aunque los documentos estén desactivados. Se elige con el mouse o con ↑ ↓ y Enter.
- `/` abre acciones con nombre jurídico: /absolver-traslado, /resumir-documento, /pegar-cej y /preparar-audiencia. Cada una pide al agente recordarte verificar plazos y normas.
- La píldora de destino abre la vista previa exacta del envío: el texto con marcadores (memoria, fragmentos, normas, conversación anterior, pregunta y la búsqueda de normas que sale antes), los reemplazos que solo ves tú, las instrucciones fijas de Folio y el modelo de terceros. "Revisar siempre antes de enviar" se cambia ahí y en Ajustes. La misma ventana reemplaza a la revisión previa anterior (también al actualizar la memoria y al pegar del CEJ).
- "Ver lo que se envió" bajo cada respuesta muestra el texto que salió (se guarda cifrado en las 10 respuestas más recientes de cada conversación).
### Pruebas
- e2e: vista previa, reemplazos, "Ver lo que se envió", chips sin memoria ni biblioteca, cita con @ y acción con /.

### Cambiado (v0.6 · F2: tres zonas, tal cual el prototipo)
- Nueva pantalla en tres zonas: a la izquierda los expedientes (buscador con Ctrl K, "Hoy" con contador y el expediente activo con sus conversaciones), al centro el agente en una columna de lectura de 700 px y a la derecha la Ficha del expediente, que se pliega.
- "Hoy" reúne lo que pide atención en todos los expedientes: plazos propuestos por el agente por confirmar, fechas que registraste (vencidas y de los próximos 14 días) y cambios de memoria por revisar. Recuerda que Folio no calcula plazos.
- Al abrir un expediente se ve su Inicio: carátula en una línea, "Desde tu última visita" (movimientos nuevos, plazos propuestos, pendientes y documentos que el agente aún no leyó), la caja "¿Qué necesitas hoy en este expediente?", atajos y la lista de conversaciones con su estado.
- La conversación muestra "Leyó la memoria, N documentos y M artículos ▸", las citas como chips dentro del párrafo (un clic abre el artículo en la Ficha, modo Fuente, con vigencia y "no es edición oficial"), un aviso ámbar cuando la respuesta habla de plazos y el recibo "Enviado a … con tu cuenta · modelo · N datos reemplazados".
- Cuando el agente redacta un escrito aparece "Borrador listo · Abrir al lado": la Ficha pasa a modo Borrador (520 px) con los huecos [entre corchetes] resaltados, "Guardar como documento", "Copiar" y "Pedir cambios en la conversación".
- Ficha: estado, próximo plazo, pendientes, hechos clave y partes con su marcador; pestañas Documentos y Movimientos; "Ver la memoria completa" abre la memoria editable con sus movimientos.
- Conversaciones: "+ Nueva conversación" (reutiliza una vacía), "⋯" para renombrarla o borrarla. Se quitan el panel flotante del agente, `Ctrl+.`, las pestañas Resumen/Memoria/Movimientos/Documentos y el indicador de privacidad de la carátula: la privacidad se dice en el pie de la barra ("Cifrado en este equipo"), en la píldora de destino y en el recibo.
- Pantallas de 1024 a 1279 px con la Ficha abierta (o bajo 1440 px en modo Borrador): la barra pasa a riel de íconos. Bajo 1024 px: una columna, ☰ abre los expedientes y la Ficha se abre como hoja.
### Pruebas
- e2e reescrito para la v0.6: tres zonas, Inicio, Hoy, citas en línea y modo Fuente, borrador al lado y guardado, riel a 1200/1366 px, renombrar conversación, Ctrl K, celular (cajón y hoja) y oscuro.

### Cambiado (v0.6 · F1, sin cambios visibles todavía)
- Cada expediente guarda varias conversaciones (`chats`) en lugar de un solo chat; los expedientes y copias de seguridad anteriores se migran solos al abrirse ("Conversación anterior"). Cada conversación recibe un título local con las primeras palabras de la primera pregunta.
- "Actualizar memoria" guarda lo que propuso el agente y un historial de lo que aplicaste, con lo que había antes, para poder deshacerlo sin pisar lo que edites después.
- Folio recuerda la última vez que abriste cada expediente (para "desde tu última visita") sin cambiar el orden de la lista.
### Pruebas
- e2e: migración de un expediente antiguo, conversación activa con título, historial y propuestas de la memoria, deshacer seguro y visita sin cambiar la fecha de modificación.

### Sitio
- Los botones "Descargar" bajan `folio.html` directo (`releases/latest/download/folio.html`), sin pasar por la página de Releases; al hacer clic aparece un aviso ("ábrelo con doble clic") con enlace a GitHub por si la descarga no empieza.
- En celular y tableta, "Descargar" pasa a "Envíatelo a tu computadora": WhatsApp, correo, copiar enlace o compartir, con el enlace `?ref=celular` para medir en GoatCounter cuántos llegan después a la computadora. Eventos nuevos: `enviar-*` y `descargar-github`.
- Pregunta frecuente "¿Funciona en el celular?".
- Paleta marino/teal de la app en el sitio (T-411): fondo `#0B1220`, teal `#35C7B3` solo en la acción principal, el elemento activo, el foco y los enlaces.
- Animaciones sin librerías (CSS, SVG y JavaScript propio): la ventana de la portada se usa sola (pregunta, lectura de la memoria y respuesta por partes, con "Ver la demo de nuevo"); en "Datos personales protegidos" los datos reales se transforman en `[PERSONA_1]`, `[DNI_1]` y `[DIRECCION_1]`; nueva sección "Qué sale de tu computadora" con el recorrido de la consulta y "Servidores de Folio: no existen". Arrancan al entrar en pantalla, el diagrama se pausa fuera de ella y con "reducir movimiento" se ve el estado final.
- Celular: las pestañas de la maqueta "Pegar desde el CEJ" ya no se cortan en pantallas de 320 px (pasan a dos líneas) y los enlaces y botones chicos tienen zona de toque de 44 px en pantallas táctiles, sin cambiar cómo se ven.
- Fondo de partículas en la portada (canvas 2D propio, sin three.js): puntos teal y marfil unidos por hilos tenues, como la memoria del expediente. Se pausa fuera de pantalla y con la pestaña oculta, limita la resolución a 2× y la cantidad de partículas según el tamaño de la pantalla; con "reducir movimiento" queda un cuadro quieto.
### Documentación
- Spec E10 `process/specs/rediseno-chat-v0.6.md` aprobada: "tres zonas, una protagonista" (expedientes con conversaciones anidadas, el Agente al centro, Ficha con modos Ficha · Fuente · Borrador), vistas Hoy e Inicio del expediente, aviso de contexto solo desde ~70 %, memoria "punto medio" revisada en la Ficha. Decisiones D-38 a D-41 y prototipo navegable `process/prototipos/rediseno-chat-v0.6.html`.
- `process/research.md` §8: interfaces de la competencia en Perú (revisión con Playwright y segunda opinión).
- `process/estrategia-x.md`: guía para escribir en X (algoritmo, referentes, fórmula, ganchos, calendario semanal); enlazada desde AGENTS.md.

## [0.5.0] — 2026-10-03 — rediseño "el expediente primero"
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
