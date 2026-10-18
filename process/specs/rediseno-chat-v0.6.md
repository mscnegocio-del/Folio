# Spec — Rediseño v0.6: tres zonas, una protagonista

> Estado: **dirección aprobada por el usuario (2026-10-18)** · Épica E10 · Decisiones D-38 a D-41
> Prototipo navegable: `process/prototipos/rediseno-chat-v0.6.html` (estados con `?vista=hoy|inicio|chat|fuente|borrador|larga|limite|nueva|envio`; a Figma con el plugin html.to.design)
> **Regla del usuario (2026-10-18):** se implementa tal cual el prototipo hasta culminar las fases; ningún cambio sin su aprobación (AGENTS.md, D-42).
> Base: investigación de la competencia (`process/research.md` §8) y segunda opinión UX independiente (2026-10-18). El primer prototipo (4 columnas) se descartó: el chat quedaba en 416–576 px y la información se repetía en 3 o 4 lugares.

## 1. Problema
- Cada expediente tiene **un solo chat** (`exp.chat`): los temas se mezclan y no se puede volver a una conversación anterior.
- Al modelo solo le llegan **los últimos 8 mensajes**. En conversaciones largas el agente "olvida" sin avisar.
- La memoria se actualiza **solo si el abogado lo pide**. Si lo olvida, el siguiente chat parte de una memoria vieja.
- El abogado conoce el patrón de ChatGPT y Claude. Lo que da esa sensación es **aire**: una columna de lectura ancha y tranquila.

## 2. Objetivo
Trabajar un expediente con el Agente como en ChatGPT o Claude, pero **con memoria del caso siempre al día, privacidad visible y fuentes verificadas**. Cada dato vive en **un solo lugar**.

## 3. Pantalla: tres zonas
| Zona | Ancho | Contenido |
|---|---|---|
| **Izquierda: expedientes** | 248 px (riel de 60 px cuando falta espacio) | Buscar (Ctrl K) · **Hoy** (con contador) · "Expedientes" con un **+** discreto · lista de expedientes; **el activo despliega sus conversaciones** (3–5 últimas, "+ Nueva conversación", "Ver todas") · pie único: "🔒 Cifrado en este equipo · Bloquear · Ajustes" |
| **Centro: el Agente** | resto (nunca menos de ~640 px; columna de lectura de 700 px) | Encabezado de una línea (número y carátula pequeños, título de la conversación, "+ Nueva conversación", botón de la ficha) · hilo · caja de texto |
| **Derecha: Ficha del expediente** | 340 px, plegable (520 px en modo Borrador) | Modos **Ficha · Fuente · Borrador** · pestañas Documentos y Movimientos como listas simples |

- **Hoy:** vista central con lo que pide atención en todos los expedientes: plazos propuestos por confirmar, fechas registradas por el abogado, cambios de memoria por revisar y movimientos pegados sin revisar. Aclara que Folio no calcula plazos.
- **Inicio del expediente** (al abrirlo o con "+ Nueva conversación" sin texto): carátula, partes, juzgado y etapa en una línea; tarjeta **"Desde tu última visita"**; caja de texto con 3 atajos según el estado del caso; **lista de conversaciones** con título, una línea de resumen, fecha y estado ("✓ en la memoria" / "3 cambios por revisar").
- **Responsive:** ≥ 1280 px tres zonas; 1024–1279 px con la ficha abierta la barra izquierda pasa a riel (lo mismo en modo Borrador bajo 1440 px); < 1024 px una sola columna: ☰ abre los expedientes y "Ficha" abre una hoja.

## 4. Caja de texto (centro de mando)
- Chips de **qué lee el agente**: ✓ Memoria · ✓ N documentos · ✓ Biblioteca. Se activan y desactivan y definen qué sale.
- **@** cita un documento o un movimiento; **/** abre acciones con nombre jurídico (/absolver-traslado, /resumir-documento, /pegar-cej). Cada acción lleva su recordatorio de verificar plazos y normas.
- **Píldora de destino:** "🔒 OpenRouter · claude-sonnet-5.5". Un clic abre la **vista previa exacta** del envío (texto con marcadores y lista de reemplazos). "Revisar siempre antes de enviar" es una preferencia ahí y en Ajustes, no una casilla en cada mensaje.

## 5. Respuestas, fuentes y plazos
- Sobre cada respuesta: "Leyó la memoria, 2 documentos y 3 artículos ▸" (se despliega con cada fuente).
- **Citas en línea** como chips con estado (✓ vigente, ⚠ texto distinto o por regir, ✗ derogado o inexistente). Un clic abre la **Ficha en modo Fuente**: texto oficial del artículo, vigencia, norma modificatoria, fecha de corte de la biblioteca y "no es edición oficial".
- Todo plazo mencionado lleva un bloque ámbar: Folio no calcula plazos; se verifica en la resolución y la casilla.
- Bajo cada respuesta, el **recibo**: "Enviado a OpenRouter con tu cuenta · modelo · N datos reemplazados · Ver lo que se envió".
- Cuando el agente produce un escrito: tarjeta "Borrador listo · Abrir al lado" → **Ficha en modo Borrador** con "Guardar como documento".

## 6. Ventana de contexto
- Folio estima los tokens (instrucciones + memoria + normas + fragmentos + historial completo) contra un **presupuesto útil de 60 000 tokens** por conversación (ajustable en Ajustes), por debajo del máximo del modelo.
- **Hasta ~70 % no se muestra nada.** Al ~70 %, una línea tranquila sobre la caja: "Esta conversación ya es larga. Para que el agente no pierda precisión, sigue en una nueva: Folio guarda un resumen." [Seguir en una nueva] [Seguir aquí]. Al ~90 % la línea pasa a ámbar y "Seguir en una nueva" es la acción principal. El porcentaje solo aparece en el menú "⋯" de la conversación.
- **Seguir en una nueva:** el agente resume la conversación (seudonimizado y con revisión previa), se proponen los cambios de memoria (§7) y se abre una conversación con "Continúa de «…» · resumen guardado".
- Al 100 % no se corta nada: se envían los mensajes más recientes que quepan y se avisa cuántos quedaron fuera.

## 7. Memoria "punto medio" (D-39)
- **Cuándo propone el agente:** al terminar una respuesta con novedades, al seguir en una conversación nueva, al guardar o importar un documento y al pegar movimientos del CEJ. También con "Actualizar memoria" a mano.
- En el hilo, **una sola línea**: "El agente propone 3 cambios en la memoria y 1 plazo por confirmar · Revisar en la ficha →".
- En la **Ficha**, la caja "Cambios propuestos por el agente": cada ítem con su sección y tipo (**+ nuevo**, **~ cambia** con el texto anterior al expandir, **! plazo**) y ✓ / ✕. "Aplicar N cambios" **excluye los plazos**: cada plazo se confirma aparte, con "¿Verificaste la fecha en la resolución y tu casilla?".
- Tras aplicar: "Memoria actualizada · Deshacer" y la conversación queda "✓ en la memoria". El historial guarda sección, antes, después, fecha y conversación de origen, con deshacer por cambio.
- **Nunca se aplica nada sin un clic del abogado.**

## 8. Voz y privacidad (D-41)
- **"El agente"** es el modelo de terceros con la cuenta del abogado: propone, redacta, resume. **"Folio"** es el software: cifra, reemplaza datos, guarda, avisa. Nunca "Folio recuerda/propone" para algo que hizo el modelo.
- La privacidad se dice **una vez y es accionable**: píldora de destino (antes), recibo (después) y "Cifrado en este equipo" (pie de la barra). Se eliminan las demás repeticiones.
- El modelo siempre aparece como de terceros ("Claude Sonnet 5.5 de Anthropic, vía OpenRouter, con tu cuenta").

## 9. Estética
- **Papel y tinta:** `--sheet` para el centro (la hoja), `--paper` para la barra y la ficha. Bordes de 1 px; sin tarjetas dentro de tarjetas; sombra solo en la caja de texto.
- **Escala de 6 tamaños:** 12 · 13 · 14 · 16 (respuesta) · 17 (título de conversación) · 26 (carátula, Montserrat).
- **Fragment Mono solo para números y códigos** (expediente, fechas, citas, marcadores).
- **Color con significado:** teal solo para enviar, la acción principal de cada zona, lo activo, el foco y los enlaces; ámbar para plazos y "por verificar"; verde para vigente y aplicado; rojo solo para derogado y errores. Tokens de `src/styles.css`, claro y oscuro.

## 10. Datos (IndexedDB, todo cifrado)
```js
exp.chats = [{ id, titulo, createdAt, updatedAt, deChat?, resumen?, mensajes:[ ...igual que el antiguo exp.chat ] }]
exp.chatActivo = id
exp.memoria.propuestas = [{ id, at, chatId, seccion, tipo:'nuevo'|'cambia'|'plazo', antes, despues, fecha?, estado:'pendiente'|'aplicada'|'descartada', histId? }]   // máx. 200
exp.memoria.historial = [{ id, at, seccion, antes, despues, chatId, itemId?, deshecho? }]   // máx. 300
exp.ultimaVisita = ISO   // crear el expediente cuenta como visita
settings.contextoMax = 60000
// "Revisar siempre antes de enviar" reutiliza settings.review (ya existe); los tokens se estiman al vuelo en F4, no se guardan
```
- **Migración:** `exp.chat` (si tiene mensajes) pasa a `exp.chats[0]` con título "Conversación anterior". Se documenta en `process/db-schema.md`.
- **Sin nuevas salidas de red.** El resumen y las propuestas usan el mismo proveedor, con seudonimización y revisión previa → no cambia la política.

## 11. Fuera de alcance
- Agente a nivel de despacho (preguntas sobre todos los expedientes), sincronización entre equipos, chats compartidos.
- Predicción o perfil de jueces (no se hará).
- Cambios en la biblioteca legal, el cifrado o la seudonimización.

## 12. Fases
| Fase | Contenido |
|---|---|
| F0 | ✅ Investigación, segunda opinión, prototipo HTML y aprobación de la dirección |
| F1 | ✅ Datos: `chats`, migración (`normalizeExp`), propuestas e historial de memoria con deshacer, `ultimaVisita` (2026-10-18; sin cambios visibles en la v0.5) |
| F2 | ✅ Tres zonas: barra con conversaciones anidadas, vista Hoy, Inicio del expediente, Ficha con modos Ficha · Fuente · Borrador, riel y celular (2026-10-18). La caja de cambios propuestos en la Ficha llega en F5; chips, @, / y vista previa en F3 |
| F3 | ✅ Caja de texto: chips que definen qué sale (memoria, documentos, biblioteca), @ para citar documentos y movimientos, / con 4 acciones que recuerdan verificar, píldora de destino y vista previa exacta (la misma antes de enviar y en "Ver lo que se envió") (2026-10-18) |
| F4 | ✅ Contexto: estimación (~3,5 caracteres por token, historial completo dentro del presupuesto), línea de aviso 70/90 %, porcentaje en ⋯, "Seguir en una nueva" con resumen y propuestas en una consulta (2026-10-18). Las propuestas se revisan con la ventana actual hasta F5 |
| F5 | ✅ Propuestas de memoria en la Ficha (✓/✕, "Aplicar N cambios" sin plazos, plazo confirmado aparte), aviso con "Deshacer", línea del hilo y "Hoy" → caja (2026-10-18). Pendiente de decisión: propuestas automáticas al terminar cada respuesta (§7) |
| F6 | ✅ Celular, accesibilidad (axe-core sin hallazgos en claro/oscuro, escritorio/celular), teclado, e2e y capturas; propuestas dentro de la misma respuesta; `APP.version` 0.6.0 (2026-10-18). Falta publicar el Release |

## 13. Preguntas abiertas
1. ¿Se proponen cambios de memoria también al bloquear Folio o cerrar la pestaña con una conversación abierta?
2. Prueba de primer clic con 3–5 abogados en una laptop de 1366 px antes de F2 (retomar un expediente, pedir y guardar un esquema, aplicar cambios salvo el plazo y confirmarlo).
