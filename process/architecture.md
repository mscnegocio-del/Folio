# Arquitectura — Folio v0.2.0

## Principio rector: local-first, sin servidores
```
 Equipo del abogado (navegador)                       Proveedor de IA (cuenta del abogado)
 ┌──────────────────────────────────────┐             ┌─────────────────────────────┐
 │ folio.html                            │  fragmentos │ OpenRouter / OpenAI /        │
 │  ├─ Bóveda IndexedDB cifrada          │  seudonimiz.│ Anthropic / Servidor propio  │
 │  ├─ Memoria por expediente            │ ──────────► │                             │
 │  ├─ Texto de documentos (local)       │ ◄────────── │                             │
 │  └─ API key (cifrada)                 │  respuesta  └─────────────────────────────┘
 └──────────────────────────────────────┘
 Servidores de Folio: NO EXISTEN. Sin cuentas, sin telemetría.
 Salidas de red adicionales (declaradas en la política §9): Google Fonts al abrir;
 jsDelivr/cdnjs solo al importar PDF o DOCX.
```

## Estructura del repositorio
```
folio/
├── AGENTS.md              ← manual del agente (entry point)
├── memory.md              ← estado entre sesiones
├── CHANGELOG.md           ← historial de versiones
├── README.md              ← presentación pública del proyecto
├── build.py               ← ensambla src/ → dist/folio.html
├── src/
│   ├── shell.html         ← esqueleto HTML con marcadores /*__CSS__*/ y /*__JS__*/
│   ├── normas.js          ← biblioteca legal peruana: descarga, búsqueda, citas (E8)
│   ├── fonts.css          ← tipografías WOFF2 en base64 (DM Sans, Montserrat, Fragment Mono; OFL)
│   ├── styles.css         ← tokens, layout, componentes, temas claro/oscuro
│   ├── config.js          ← OWNER: datos del autor (editar antes de publicar)
│   ├── core.js            ← utilidades, DB, Vault, proveedores, LLM, seudonimización, recuperación
│   ├── legal.js           ← política, términos, autorización para clientes
│   └── ui.js              ← estado S, render, bienvenida, app, agente, ajustes, eventos, boot
├── dist/folio.html        ← artefacto distribuible (se sube a GitHub Releases)
├── docs/guia-api-keys.md  ← guía para obtener keys (espejo de la guía dentro de la app)
├── process/               ← contexto profundo (este directorio)
└── tests/e2e_test.py      ← prueba end-to-end con Playwright y proveedor simulado
```

## Módulos (src/core.js)
| Bloque | Elementos clave | Notas |
|---|---|---|
| Utilidades | `esc`, `escRe`, `b64/unb64`, fechas (`todayISO`, `daysUntil`, `fmtDate`) | `b64` por bloques para buffers grandes |
| DB | `DB.open/get/put/del/keys/clear/putMany` | `putMany` = una transacción (atómico) |
| Vault | `derive`, `encWith/decWith`, `create`, `unlock`, `changePass`, `lock` | `changePass` recifra todo y escribe en una sola transacción |
| store | `store.get/put/del` | capa cifrada sobre DB con `Vault.key` |
| Proveedores | `PROVIDERS`, `OR_RECOMMENDED`, `DEFAULT_SETTINGS`, `baseOf`, `isReady`, `headersFor` | `custom` = "Servidor propio" (key opcional) |
| LLM | `llm()`, `readSSE()`, `checkRes()`, `safeFetch()`, `listModels()` | streaming SSE OpenAI-compatible y Anthropic |
| Seudonimización | `makePseudo(exp, enabled)` → `{apply, restore, count, map}` | ver detalle abajo |
| Recuperación | `terms`, `chunkText` (~1400 car.), `retrieve` (top 4 por palabras clave) | sin embeddings, todo local |
| Contexto | `memoryText`, `buildContext`, `SYSTEM_PROMPT`, `parseJSONLoose` | |
| Render seguro | `md()` | escapa primero, luego **negrita**, *cursiva*, listas, títulos |
| Documentos | `LIBS`, `loadScript` (con respaldo), `extractText` | pdf.js 3.11.174 + worker como script; mammoth 1.8.0 |

### Detalles de proveedores (core.js → `llm`)
- OpenAI-compatible: `POST {base}/chat/completions`, `stream:true`; `max_tokens` solo en OpenRouter y servidor propio (OpenAI moderno lo rechaza).
- OpenRouter: `reasoning:{effort:'low'}` siempre; si `zdr` → `provider:{zdr:true, data_collection:'deny'}`. Sin cabecera `X-Title` (rompía CORS desde file://).
- Anthropic: `POST /v1/messages` con `anthropic-version: 2023-06-01` y `anthropic-dangerous-direct-browser-access: true`.
- `listModels` en OpenRouter: GET sin cabeceras (público), filtra `:free`, `:batch`, `~alias`, imagen/audio; sugeridos primero.
- Tokens: prueba de conexión 1024; chat 6000; actualizar memoria 4000; ordenar CEJ 8000.

### Seudonimización (`makePseudo`)
1. Por cada parte: token estable `[PERSONA_n]` (guardado en `parte.tok`); documento → `[DOC_n]`.
2. Variantes de nombre: completo, apellidos+nombres, nombre+primer apellido, y par de apellidos **solo si no lo comparte otra parte** (familias con mismos apellidos).
3. Regex tolerante a tildes/ñ y mayúsculas (`fuzzy`), con límites Unicode `\p{L}`.
4. Genéricos numerados y reversibles: `[CORREO_n]`, `[RUC_n]`, `[TELEFONO_n]`, `[DNI_n]`, `[DIRECCION_n]`.
5. Orden: variantes más largas primero → genéricos. `restore()` revierte en la respuesta (también durante el streaming).
6. Límite conocido: apellidos sueltos o apodos no se reemplazan → por eso existe la revisión previa.

## Flujos principales (src/ui.js)
- **Arranque** (`boot`): sin crypto.subtle/IndexedDB → error; con bóveda → bloqueo; sin bóveda → bienvenida.
- **Bienvenida** (5 pasos): Así funciona · Tus datos (3 checks) · Envío al extranjero (seudonimización + check) · Contraseña (≥10 car. + check) · Proveedor (opcional, con guía). `finishOnb` crea bóveda, guarda settings cifrados y `consent` en claro.
- **Consulta** (`sendChat`): `buildContext` → `makePseudo.apply` (sistema + historial + pregunta) → `reviewPayload` (si está activo) → `llm` streaming → `restore` → guarda chat → `logSend` (registro de envíos).
- **Actualizar memoria** (`proposeMemory`): conversación reciente → JSON de cambios → el abogado aprueba ítem por ítem (los plazos vienen desmarcados).
- **Pegar CEJ** (`pasteCEJ`): texto copiado → JSON de movimientos → revisión → agregar.
- **Diálogos**: un solo `<dialog>`; `askDialog` + `dlgPending/settleDlg/onDlgButton` (evita el bug de eventos `close` asíncronos que cancelaban el siguiente diálogo).
- **Auto-bloqueo**: inactividad configurable (5/15/30/60 min); no bloquea mientras hay una respuesta en curso.

## Diseño visual
- Desde v0.3.0 comparte el sistema visual del sitio web (spec: `process/specs/rediseno-visual-v0.3.md`).
- Tokens claro: fondo `#F5F5F4`, hoja `#FFFFFF`, tinta `#111114`. Oscuro: fondo `#0A0A0A`, hoja `#121214`, tinta `#F4F4F5`. Acento azul `#3D5AF1` / `#8B9DFF`.
- Componentes: botones en píldora (primario negro en claro, blanco en oscuro), tarjetas de 16 px, campos de 10 px, pestañas en segmento, brillo azul en pantallas de entrada.
- Tipografías incluidas en el HTML (`src/fonts.css`, sin Google Fonts): Montserrat (títulos), DM Sans (interfaz), Fragment Mono (números de expediente, fechas, foliador).
- Elemento distintivo: sello azul "Guardado solo en este equipo" con animación de estampado única; foliador "Fs. N" en documentos.
- Responsive: <1180 px el agente pasa a pestaña; <820 px la barra lateral es un cajón. Grillas con `minmax(0,1fr)` para evitar desbordes.

## Biblioteca legal (E8) — `src/normas.js`
- Paquete en `docs/normas/` (GitHub Pages): `manifest.json` + `<ID>.json.gz` con `sha256`; lo arma `normas/build_normas.py`
  desde `normas/fuentes/` (Word/TXT del SPIJ) y `normas/ajustes/` (correcciones y cambios por regir).
- `updateNormas()` descarga solo lo que cambió, verifica `sha256`, descomprime con `DecompressionStream` y guarda en la
  base IndexedDB `folio-normas` (sin cifrar: textos públicos). Registra cambios por artículo (`changes`).
- `Lib.search()` BM25 local con raíces simples; prioriza normas según la especialidad del expediente.
- Consulta: búsqueda asistida (`PLANNER_PROMPT`, JSON con citas y términos) → `gatherArticles()` (citas explícitas +
  plan + memoria + búsqueda, máx. 8 artículos / 14 000 caracteres) → `normasBlock()` + `LEGAL_RULES` en el prompt.
- `checkCitations()` revisa la respuesta: ✓ vigente, ⚠ texto distinto o por regir, ✗ derogado o inexistente, ○ fuera de
  la biblioteca, 🌐 extranjera. Se guarda en `msg.citas`.
- Avisos: encabezado "Normas al dd/mm/aaaa" (ámbar a los 14 días); a los 30 días cada respuesta lo advierte.

## Aviso de nuevas versiones
- `fetchLatestRelease()` (core.js) → `GET https://api.github.com/repos/<OWNER.repo>/releases/latest`, sin credenciales, 8 s de tiempo límite; falla en silencio (p. ej., proxy corporativo).
- `maybeCheckUpdate()` (ui.js) tras entrar a la app, como máximo cada 12 h (`settings.updateLastCheck`); el resultado se guarda cifrado en `settings.updateKnown`.
- Barra `.update-bar` no bloqueante; "Más tarde" la oculta hasta el próximo desbloqueo. Ajustes → Actualizaciones permite desactivarla (`settings.updateCheck`).

## Restricciones de entorno
- Se abre desde `file://` → origen `null`; Chrome/Edge/Firefox lo tratan como contexto seguro (crypto.subtle disponible).
- Los datos viven en el IndexedDB del navegador: borrar datos de navegación borra la bóveda → copia de seguridad cifrada.
- CORS: cualquier cabecera no estándar fuerza preflight; mantener solo las imprescindibles.
- Servidor propio: debe permitir CORS desde origen `null` (lo configura el técnico).
- El entorno de desarrollo de Claude no tiene acceso a CDNs ni a proveedores reales: PDF/DOCX y llamadas reales se prueban en la PC del usuario.

## Pruebas
`python tests/e2e_test.py` (requiere `pip install playwright` y `playwright install chromium`):
recorre bienvenida, conexión simulada, ejemplo, consulta con streaming, verificación de que **ningún dato real sale** (nombres, DNI, teléfono, correo, dirección), actualizar memoria, bloqueo/desbloqueo, ausencia de texto plano en IndexedDB, copia de seguridad, móvil y modo oscuro.
