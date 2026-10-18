# Spec — Rediseño v0.6: el agente al centro, el expediente a la derecha

> Estado: **borrador, pendiente de aprobación del usuario** · Épica E10 · Fecha: 2026-10-18
> Prototipo navegable: `process/prototipos/rediseno-chat-v0.6.html` (se importa a Figma con el plugin html.to.design)
> Decisiones del usuario (2026-10-18): prototipo HTML en lugar de Figma; memoria "punto medio" (propone sola, se aplica con un clic, plazos con confirmación, con deshacer).

## 1. Problema
- Cada expediente tiene **un solo chat** (`exp.chat`). Las conversaciones de temas distintos se mezclan y no hay forma de volver a una anterior.
- Al modelo solo le llegan **los últimos 8 mensajes**. En conversaciones largas el agente "olvida" lo del inicio sin avisar, y el abogado no sabe por qué responde peor.
- La memoria se actualiza **solo si el abogado pide** "Actualizar memoria". Si lo olvida, el siguiente chat parte de una memoria vieja.
- El abogado ya conoce el patrón de ChatGPT y Claude (lista a la izquierda, chat al centro). La v0.5 puso el expediente al centro (D-34) y el agente a un lado.

## 2. Objetivo
Que trabajar con Folio se sienta como ChatGPT o Claude, pero **por expediente y con memoria que siempre está al día**:
1. **Izquierda:** expedientes y agenda de plazos.
2. **Centro:** el agente. Conversaciones anteriores del expediente y la conversación actual.
3. **Derecha (plegable):** todo el expediente: resumen, memoria, documentos, movimientos y partes.
4. Cada chat nuevo **parte de la memoria actualizada**, y ningún chat se alarga hasta que el agente pierda precisión.

## 3. Pantalla (escritorio, desde 1180 px)
| Zona | Ancho | Contenido |
|---|---|---|
| Barra izquierda | 264 px | Logo, "Nuevo expediente", buscador, agenda agrupada (vencidos, hoy, 7 días), lista de expedientes (marca teal en el activo), pie con Privacidad, Ajustes y Bloquear |
| Conversaciones | 240 px, plegable | Chats del expediente activo, del más reciente al más antiguo: título, fecha, n.° de mensajes y marca "resumen en la memoria". Botón "Nuevo chat" |
| Chat | resto | Encabezado (número de expediente, estado, medidor de contexto, abrir o cerrar panel derecho), mensajes y caja de texto |
| Panel derecho | 360 px, plegable | Pestañas Resumen · Memoria · Documentos · Movimientos · Partes. En Memoria: "Cambios recientes" con deshacer |

- **Inicio del expediente** (sin chat abierto): caja de texto centrada ("¿En qué trabajamos hoy en este expediente?"), "Folio recuerda" y accesos a los últimos chats, como la página de un proyecto en Claude.
- Entre 820 y 1180 px: el panel derecho y la lista de conversaciones se abren encima del chat.
- Bajo 820 px (celular): chat a pantalla completa; ☰ abre expedientes y conversaciones; ⓘ abre el expediente como hoja.
- Se mantiene: nombre **"Agente"** (D-35), revisión previa del texto exacto, línea "Se envía a… con N datos reemplazados", fichas de citas, paleta marino/teal y tipografías (D-36, D-37), temas claro y oscuro.

## 4. Ventana de contexto
- Folio estima los tokens de cada envío (≈ caracteres / 4): instrucciones + memoria + normas + fragmentos + historial completo del chat.
- **Presupuesto por chat:** 60 000 tokens de historial por defecto (no el máximo del modelo: más contexto = más costo y respuestas menos precisas). Ajustable en Ajustes.
- **Medidor** en el encabezado del chat: gris hasta 70 %, ámbar desde 70 %, y desde 90 % un aviso sobre la caja de texto:
  "Esta conversación está cerca del límite. Para que el agente no pierda precisión, continúa en un chat nuevo: Folio guarda un resumen y actualiza la memoria." → **Continuar en un chat nuevo** · Seguir aquí.
- **Continuar en un chat nuevo:** (1) Folio pide al modelo un resumen del chat (seudonimizado y con revisión previa, como toda salida), (2) lo guarda en el chat y propone los cambios de memoria (§5), (3) abre un chat nuevo con la marca "Viene de: <título>" y el resumen como contexto inicial.
- Al 100 % no se corta nada: se envían los mensajes más recientes que quepan, y el aviso dice cuántos quedaron fuera.

## 5. Memoria "punto medio" (reemplaza el flujo manual de D-08)
**Cuándo propone Folio, sin que se lo pidan:** al abrir un chat nuevo o cambiar de chat (sobre el que se deja), al continuar en un chat nuevo, al crear o importar un documento, y con "Actualizar memoria" a mano como hoy.

**Cómo se ve:** una tarjeta al final del chat: "Folio propone 4 cambios en la memoria", agrupados por sección (hechos, estrategia, pendientes, plazos, estado).
- Hechos, estrategia, pendientes y estado vienen **marcados**; **plazos y fechas vienen desmarcados** con "verifica la fecha con la resolución y tu casilla".
- **Aplicar seleccionados** (un clic) · Revisar uno por uno · Descartar.
- Al aplicar: aviso "Memoria actualizada · Deshacer".

**Historial:** cada cambio guarda sección, antes, después, fecha y chat de origen. Panel derecho → Memoria → **Cambios recientes**, con "Deshacer" por cambio y enlace al chat de donde salió.
**Nunca** se aplica nada sin un clic del abogado (sigue la responsabilidad del abogado de D-08 y Ley 29733).

## 6. Datos (IndexedDB, todo cifrado)
```js
exp.chats = [{ id, titulo, createdAt, updatedAt, deChat?, resumen?, mensajes:[ ...igual que exp.chat ], tokensAprox }]
exp.chatActivo = id
exp.memoria.historial = [{ id, at, seccion, antes, despues, chatId, deshecho? }]   // máx. 300
settings.contextoMax = 60000
```
- **Migración:** `exp.chat` (si tiene mensajes) pasa a `exp.chats[0]` con título "Conversación anterior". Se documenta en `process/db-schema.md`.
- El título del chat se genera en el equipo (primeras palabras de la primera pregunta); el abogado puede renombrarlo.
- **Sin nuevas salidas de red.** El resumen y la propuesta de memoria usan el mismo proveedor, con seudonimización y revisión previa → no cambia la política.

## 7. Fuera de alcance
- Sincronización entre equipos, chats compartidos y búsqueda dentro de todos los chats (después).
- Cambios en la biblioteca legal, el cifrado o la seudonimización.

## 8. Decisiones a registrar al aprobar
- D-38: el agente pasa al centro y el expediente al panel derecho (reemplaza la composición de D-34; se mantienen D-35 a D-37).
- D-39: memoria "punto medio": Folio propone sola en puntos fijos y se aplica con un clic; plazos desmarcados; historial con deshacer (actualiza D-08).
- D-40: varios chats por expediente con presupuesto de contexto y "Continuar en un chat nuevo" con resumen.

## 9. Fases
| Fase | Contenido |
|---|---|
| F0 | Prototipo HTML y aprobación de esta spec |
| F1 | Datos: `chats`, migración, historial de memoria |
| F2 | Diseño de tres zonas + lista de conversaciones + panel derecho |
| F3 | Medidor de contexto, aviso y "Continuar en un chat nuevo" |
| F4 | Propuestas automáticas de memoria, aplicar con un clic, cambios recientes y deshacer |
| F5 | Celular, accesibilidad, e2e y capturas → Release v0.6.0 |

## 10. Preguntas abiertas
1. ¿60 000 tokens por chat te parece bien como presupuesto inicial?
2. ¿La lista de conversaciones va en una columna propia del centro (prototipo) o anidada bajo el expediente activo en la barra izquierda, como los proyectos de Claude?
3. ¿Se proponen cambios de memoria también al bloquear Folio o cerrar la pestaña con un chat abierto?
