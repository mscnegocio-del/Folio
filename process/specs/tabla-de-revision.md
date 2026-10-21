# Spec — E12: tabla de revisión del expediente (cronología de resoluciones)

> Estado: **borrador, pendiente de aprobación del usuario** · Épica E12 · Decisiones propuestas D-52 a D-54
> Prototipo navegable: `process/prototipos/tabla-revision-v0.8.html` (estados con `?estado=elegir|revisando|lista|celda|columna`, `&tema=dark`)
> Origen: análisis de Harvey (2026-10-21). Harvey Vault tiene *review tables*: una fila por documento, columnas que la IA llena (fecha, moneda, texto literal), plantillas con un clic para tipos comunes (también litigio) y revisión final del abogado. Folio toma la idea, pero **verifica cada cita en el equipo** y no sube nada a una nube propia.

## 1. Problema
- Un expediente vivo acumula resoluciones, escritos y actas. Para saber "qué se ordenó, cuándo y qué falta", el abogado relee documento por documento o arma a mano una cronología en Word.
- El chat de Folio responde sobre fragmentos: sirve para preguntas, no para **recorrer todos los documentos con las mismas preguntas** y comparar.
- La IA puede inventar o deformar lo que dice un documento. Hoy no hay forma de comprobar que una respuesta sale del texto.

## 2. Objetivo
Elegir varios documentos del expediente y obtener **una tabla: una fila por documento y una columna por pregunta**, cada celda con su **cita textual** y la **página**, y la cita **verificada en el equipo** contra el texto del documento. Primera plantilla: **cronología de resoluciones**. Lo que el abogado aprueba pasa a Movimientos o a la caja de cambios de la memoria.

## 3. Plantillas (D-52)
| Plantilla | Columnas |
|---|---|
| **Cronología de resoluciones** (por defecto) | Fecha · Resolución · Qué ordena (1–2 líneas) · Plazo que menciona · Quién debe actuar |
| **Medios probatorios** | Documento · Prueba ofrecida · Quién la ofrece · Hecho que busca probar · ¿Admitida? |
| **En blanco** | El abogado define sus columnas |

- **Fecha** y **Resolución** salen primero del encabezado leído en el equipo (`leerEncabezado`, E11): sin IA ni costo. La IA solo las completa si el encabezado no las trae.
- Columna nueva: nombre, pregunta para el agente y tipo: **texto**, **fecha**, **sí/no** o **cita textual** (copia literal).

## 4. Flujo
1. Desde la pestaña **Documentos** de la Ficha ("Revisar en una tabla"), desde el Inicio o con la acción `/cronologia` de la caja.
2. Ventana **"Nueva tabla de revisión"**: plantilla, documentos (todos marcados; se pueden desmarcar) y el **destino con estimación**: "Se enviarán 5 documentos (≈ 21 000 tokens) a OpenRouter, uno por consulta, con los datos reemplazados · Ver lo que se enviará". Debajo: "Se lee en tu equipo, sin IA: fecha y número de resolución".
3. La tabla ocupa el centro (la Ficha se pliega a riel si falta espacio). Las filas se llenan **una por una**, con "Revisando 3 de 5 · Detener".
4. Cada celda muestra el valor y una marca:
   - **✓** cita encontrada en el documento (verificación local, D-53).
   - **⚠ no encontrada**: el agente dio una cita que no está en el texto → revisa (la celda se ve en ámbar).
   - **leído en tu equipo**: vino del encabezado, sin IA.
   - **— no aparece**: el agente no encontró el dato (mejor vacío que inventado).
   - Los **plazos** van siempre en ámbar con "Folio no calcula plazos: verifica en la resolución y en tu casilla".
5. **Clic en una celda** → la Ficha pasa a modo **Fuente del documento**: nombre, página y el pasaje con la cita resaltada; "Folio verificó en tu equipo que esta cita está en el documento" (o el aviso si no está).
6. El abogado puede **corregir una celda** (queda "editado por ti") y **volver a revisar una fila**.
7. Acciones de la tabla:
   - **Agregar a Movimientos (N)**: cada fila de la cronología se vuelve un movimiento (fecha, acto, sumilla = "qué ordena"); se omiten los que ya existen. Con "Deshacer".
   - **Proponer a la memoria**: los plazos y pendientes de la tabla van a la caja "Cambios propuestos" (los plazos solo si hay una fecha concreta, y siempre por confirmar).
   - **Exportar CSV** (descarga local) y **Copiar como tabla** (para pegar en un escrito).
8. Las tablas quedan guardadas en el expediente: "Tablas de revisión" en el Inicio, con su fecha y estado.

## 5. Privacidad y costo (D-54)
- Cada documento sale **completo** (no fragmentos), **seudonimizado**, con la vista previa del lote y una entrada por documento en el Registro de envíos.
- **Cambio de política:** hoy la sección 4 dice que salen "los fragmentos del expediente necesarios para responder". Esta función envía documentos completos que el abogado elige → se actualiza la sección 4, se sube `APP.policyVersion` y se pide aceptar de nuevo. **No hay nuevas salidas de red.**
- Límite por documento: ~60 000 caracteres (≈ 17 000 tokens). Si es más largo, se revisan las primeras páginas y la fila lo dice ("se revisaron las págs. 1–20 de 48"); dividir en partes queda para después.
- La estimación de tokens se muestra antes de enviar (con la misma cuenta de la v0.6). Folio no muestra precios: dependen del modelo y del proveedor.

## 6. Verificación de citas (D-53)
- El agente devuelve, por celda: `valor`, `cita` (texto literal) y `pagina` (si el PDF trae `[Pág. N]`).
- Folio busca la cita en el texto del documento **en el equipo**: normaliza espacios, mayúsculas y tildes, y tolera cortes de línea y guiones de partición. Si la encuentra, guarda la página real y la posición para resaltarla; si no, marca ⚠.
- Una celda sin cita (por ejemplo "¿Admitida? sí") se marca "sin cita" y se trata como no verificada.

## 7. Datos (IndexedDB, todo cifrado)
```js
exp.tablas = [{ id, titulo, plantilla: 'cronologia'|'pruebas'|'blanco', createdAt, updatedAt,
  columnas: [{ id, nombre, pregunta, tipo: 'texto'|'fecha'|'sino'|'cita', local?: 'fecha'|'resolucion' }],
  filas: [{ docId, estado: 'pendiente'|'lista'|'error', recorte?: { hasta, de },
    celdas: { [colId]: { valor, cita?, pagina?, verificada: true|false|null, origen: 'local'|'agente'|'abogado' } } }] }]   // máx. 20 tablas por expediente
```
- Sin migración (campo nuevo, opcional). Entra en la copia de seguridad como el resto del expediente.

## 8. Fuera de alcance
- Revisar documentos escaneados (sin texto) y dividir documentos largos en partes.
- Tablas entre varios expedientes.
- Flujos guiados de varios pasos (otra idea de Harvey; posible E13).
- Cálculo de plazos (nunca: regla NUNCA de AGENTS.md).

## 9. Fases
| Fase | Contenido |
|---|---|
| F0 | Aprobación de esta spec y del prototipo |
| F1 | Datos `exp.tablas`, plantillas, columnas locales (fecha y resolución con `leerEncabezado`), vista de tabla en el centro |
| F2 | Extracción con el agente por documento (JSON con valor, cita y página), vista previa del lote, progreso y "Detener" |
| F3 | Verificación local de citas, Ficha en modo Fuente del documento, edición de celdas, volver a revisar |
| F4 | Agregar a Movimientos, proponer a la memoria, exportar CSV y copiar; política r3; e2e y capturas → Release v0.8.0 |

## 10. Preguntas para el usuario
1. ¿Aceptas el **cambio de política** (enviar documentos completos que eliges, con re-aceptación al desbloquear)? Sin él, la tabla solo podría usar fragmentos y perdería precisión.
2. ¿Las **plantillas iniciales** son cronología y medios probatorios, o prefieres otra (por ejemplo "Notificaciones": fecha de notificación, casilla, plazo)?
3. ¿**Publicamos la v0.7.0 (E11) antes** y la tabla va en una v0.8.0, o las juntamos en una sola versión?
