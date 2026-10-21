# Esquema de datos — IndexedDB

Base `folio-mvp` · versión 1 · object store `kv` (clave → valor). Todo registro, salvo `vault` y `consent`, se guarda cifrado como `{ iv: base64, ct: base64 }` (AES-GCM 256).

| Clave | Cifrado | Contenido |
|---|---|---|
| `vault` | No | `{ v:1, salt, iter:310000, check:{iv,ct}, createdAt }` — `check` descifra a `{ok:'folio'}` para validar la contraseña |
| *(base aparte `folio-normas`)* | No | Biblioteca legal pública: `manifest`, `norma:<ID>` (artículos), `changes` (últimos 200 cambios). Sin datos del abogado; se borra con "Borrar todo" |
| `consent` | No | `{ policyVersion, appVersion, acceptedAt, items:{resp,verify,policy,transfer,norecovery}, pseudoAtStart, history:[{policyVersion, appVersion, acceptedAt}] }` (`history` desde T-201) — solo booleanos, sin datos personales |
| `settings` | Sí | ver Settings |
| `index` | Sí | lista resumida de expedientes (barra lateral y plazos globales) |
| `exp:<uuid>` | Sí | expediente completo |
| `doc:<uuid>` | Sí | `{ id, expId, name, text }` — texto extraído (máx. 1 500 000 car.) |
| `audit` | Sí | registro de envíos (máx. 500 entradas) |

## Settings
```js
{ provider: 'openrouter'|'openai'|'anthropic'|'custom', baseUrl, apiKey, model,
  zdr: true, pseudo: true, review: true, autoLockMin: 15, theme: 'auto'|'light'|'dark', lastExp,
  agentPanel?: 'abierto'|'amplio'|'cerrado',    // v0.5: panel del agente en pantallas anchas; si falta, abierto desde 1280 px
  contextoMax: 60000 }                           // v0.6: presupuesto útil de tokens por conversación (lo usa F4)
```

## Expediente (`exp:<uuid>`)
```js
{
  id, numero, materia, especialidad, organo, distrito, estado, ejemplo?,
  partes: [{ id, tok:'PERSONA_n', nombre, rol, doc, esCliente }],
  nextTok,                       // contador para tokens estables de seudonimización
  memoria: {
    resumen, hechos, estrategia,
    pendientes: [{ id, text, done }],
    plazos:     [{ id, fecha:'AAAA-MM-DD', desc, done }],
    // v0.6: lo que propone el agente (seccion: estado|resumen|hechos|estrategia|pend|plazo) y lo que el abogado aplicó
    propuestas: [{ id, at, chatId, seccion, tipo:'nuevo'|'cambia'|'plazo', antes, despues, fecha?, estado:'pendiente'|'aplicada'|'descartada', histId? }],  // máx. 200
    historial:  [{ id, at, seccion, antes, despues, chatId, itemId?, deshecho? }]   // máx. 300, el más reciente primero; `antes` solo en estado; en textos `despues` = lo agregado; itemId en pendientes y plazos
  },
  movimientos: [{ id, fecha, acto, sumilla }],
  chats: [{ id, titulo, createdAt, updatedAt, deChat?, resumen?,      // v0.6: varias conversaciones; título local (primeras palabras)
             mensajes: [{ role:'user'|'assistant'|'error', content, at, meta?:{ provider, model, pseudo, replaced, normas, frags, memoria, secciones }, citas?, envio?:{ texto, reemp:[[real, marcador]] }, guardado? }] }],
             // envio: texto que salió (con marcadores) para "Ver lo que se envió"; solo en las 10 respuestas más recientes de cada conversación
  chatActivo,                    // id de la conversación abierta
  ultimaVisita,                  // ISO de la última vez que el abogado abrió el expediente (crearlo cuenta como visita)
  juez, especialista,            // v0.7 (E11): funcionarios del juzgado; opcionales; no se seudonimizan (D-49)
  origen?: { docId, nombre, detectado:[...], resolucion, ofrecer },   // v0.7 (E11): documento del que se creó; `ofrecer` = mostrar "Resumir con el agente"
  docs: [{ id, name, type:'pdf'|'docx'|'txt', pages, chars, addedAt, scanned? }],
  createdAt, updatedAt
}
```
Las conversaciones guardan el texto **real** (restaurado); la seudonimización se aplica de nuevo en cada envío.
Abrir un expediente registra `ultimaVisita` sin cambiar `updatedAt` (la lista sigue ordenada por última modificación); la visita anterior queda en `S.visitaPrevia` para "desde tu última visita".

## Índice (`index`)
```js
[{ id, numero, titulo, materia, ejemplo, updatedAt, plazos:[{ fecha, desc }] }]   // solo plazos no cumplidos
```

## Registro de envíos (`audit`)
```js
[{ at, kind:'Consulta'|'Actualizar memoria'|'Ordenar movimientos', provider, model, exp, chars, pseudo, replaced, local }]
```

## Copia de seguridad (`.folio`)
```js
{ format:'folio-respaldo', version:1, app, exportedAt, records:{ <clave>: <valor tal cual en IndexedDB> } }
```
Se exporta cifrada (no se descifra nada). Restaurar reemplaza todo y pide la contraseña de esa copia.

## Migraciones
- v0.7 (E11): sin migración; `juez`, `especialista` y `origen` son opcionales.
- Proveedor `ollama` guardado de versiones previas → se migra a `openrouter` al desbloquear (`doUnlock`).
- v0.6 (`normalizeExp`, al abrir cada expediente): `exp.chat` → `exp.chats[0]` con título "Conversación anterior" (o una conversación vacía si no había mensajes); se agregan `chatActivo`, `memoria.propuestas`, `memoria.historial` y `ultimaVisita`. Funciona también con copias de seguridad antiguas: se migran al abrir.
- Si se cambia el esquema: subir la versión de `indexedDB.open` y documentarlo aquí.
