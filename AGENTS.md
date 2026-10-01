# AGENTS.md — Folio v0.3.0
> Generado: 2026-09-30 · Autor: Milton Alejandro Salcedo Cruz

Folio es un agente de IA gratuito y de código abierto para abogados litigantes en el Perú.
Cada expediente tiene su propia memoria; todo se guarda cifrado en el equipo del abogado y
la IA se usa con la cuenta propia del abogado (BYOK). Folio no tiene servidores.

## Stack técnico
- Frontend: HTML + CSS + JavaScript vanilla (sin frameworks, sin npm, sin bundler)
- Backend: ninguno. Llamadas directas del navegador al proveedor de IA
- DB: IndexedDB (`folio-mvp`, store `kv`), cifrada con AES-GCM 256 + PBKDF2-SHA-256 (310 000 it.)
- IA: OpenRouter (recomendado), OpenAI, Anthropic, o "Servidor propio" compatible con OpenAI
- Build: `python build.py` → `dist/folio.html` (un solo archivo autocontenido)
- Deploy: GitHub Releases con `dist/folio.html`; se abre con doble clic (file://)
- Pruebas: Playwright (Python) con proveedor de IA simulado → `tests/e2e_test.py`

## Convenciones obligatorias
- Todo texto de interfaz en español del Perú, tuteo, oraciones en minúscula inicial (sentence case)
- Escapar SIEMPRE con `esc()` todo dato del usuario o del modelo antes de insertarlo en HTML
- Todo dato persistente pasa por `store.get/put` (cifrado). Nunca `localStorage` para datos o keys
- La seudonimización (`makePseudo`) se aplica a TODO lo que sale hacia un proveedor de IA
- Toda nueva salida de red debe declararse en la política (`src/legal.js`, sección 9)
- Si cambias textos legales: sube `APP.policyVersion` (src/core.js), agrega la entrada en `POLICY_CHANGES` (src/legal.js) y anótalo en process/decisions.md. Al desbloquear, Folio pide aceptar de nuevo
- Datos del autor solo en `src/config.js` (nunca correo institucional del PJ)
- Orden del bundle: CSS fonts.css → styles.css; JS config.js → core.js → normas.js → legal.js → ui.js (ver build.py)
- Biblioteca legal: solo texto oficial de normas y datos de modificación; nunca concordancias del SPIJ ni extracción automática del SPIJ (ver normas/README.md)
- UI: usar solo los tokens de `src/styles.css` (claro y oscuro); nunca volver a cargar fuentes desde Google Fonts
- Commits: `tipo(alcance): descripción en español` — tipos: feat, fix, docs, style, refactor, test, chore

## NUNCA
- NUNCA enviar contenido de expedientes a servidores del autor, ni agregar telemetría
- NUNCA conectar directo con la API propia de DeepSeek (datos en China). DeepSeek solo vía OpenRouter + ZDR
- NUNCA tocar el SIJ, ni accesos internos del Poder Judicial, ni romper captchas del CEJ/SINOE
- NUNCA guardar credenciales de SINOE en un servidor
- NUNCA agregar opciones que exijan configuración técnica al abogado (por eso se quitó Ollama)
- NUNCA afirmar plazos o normas en prompts/plantillas sin indicar que el abogado debe verificarlos
- NUNCA presentar los modelos de terceros como "propios" del autor
- NUNCA presentar la biblioteca legal como edición oficial ni publicar un paquete sin revisión humana

## Reglas de trabajo
- Leer memory.md al inicio de cada sesión
- Actualizar memory.md y CHANGELOG.md al terminar cada sesión
- Después de cambiar código: `python build.py` y `python tests/e2e_test.py` (deben pasar sin errores)
- Para contexto profundo → ver process/ (rutas abajo)

## Contexto profundo → process/
- Arquitectura y módulos: process/architecture.md
- Esquema de datos (IndexedDB): process/db-schema.md
- Tareas / backlog: process/tasks.md
- Decisiones (ADR): process/decisions.md
- Investigación de mercado, CEJ/SINOE, modelos y costos: process/research.md
- Ley 29733, roles y riesgos: process/legal-privacy.md

## Estado actual → memory.md
