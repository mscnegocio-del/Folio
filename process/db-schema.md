# Esquema de datos — IndexedDB

Base `folio-mvp` · versión 1 · object store `kv` (clave → valor). Todo registro, salvo `vault` y `consent`, se guarda cifrado como `{ iv: base64, ct: base64 }` (AES-GCM 256).

| Clave | Cifrado | Contenido |
|---|---|---|
| `vault` | No | `{ v:1, salt, iter:310000, check:{iv,ct}, createdAt }` — `check` descifra a `{ok:'folio'}` para validar la contraseña |
| `consent` | No | `{ policyVersion, appVersion, acceptedAt, items:{resp,verify,policy,transfer,norecovery}, pseudoAtStart }` — solo booleanos, sin datos personales |
| `settings` | Sí | ver Settings |
| `index` | Sí | lista resumida de expedientes (barra lateral y plazos globales) |
| `exp:<uuid>` | Sí | expediente completo |
| `doc:<uuid>` | Sí | `{ id, expId, name, text }` — texto extraído (máx. 1 500 000 car.) |
| `audit` | Sí | registro de envíos (máx. 500 entradas) |

## Settings
```js
{ provider: 'openrouter'|'openai'|'anthropic'|'custom', baseUrl, apiKey, model,
  zdr: true, pseudo: true, review: true, autoLockMin: 15, theme: 'auto'|'light'|'dark', lastExp }
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
    plazos:     [{ id, fecha:'AAAA-MM-DD', desc, done }]
  },
  movimientos: [{ id, fecha, acto, sumilla }],
  chat: [{ role:'user'|'assistant'|'error', content, at, meta?:{ provider, model, pseudo, replaced } }],
  docs: [{ id, name, type:'pdf'|'docx'|'txt', pages, chars, addedAt, scanned? }],
  createdAt, updatedAt
}
```
El chat guarda el texto **real** (restaurado); la seudonimización se aplica de nuevo en cada envío.

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
- Proveedor `ollama` guardado de versiones previas → se migra a `openrouter` al desbloquear (`doUnlock`).
- Si se cambia el esquema: subir la versión de `indexedDB.open` y documentarlo aquí.
