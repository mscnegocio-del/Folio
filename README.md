# Folio

**Agente de IA para abogados litigantes en el Perú. Tus expedientes no salen de tu equipo.**

Folio guarda cada expediente con su propia memoria: partes, plazos, pendientes, movimientos, documentos y estrategia. El agente de IA lee esa memoria antes de responder, así no repites el contexto en cada consulta.

Es gratuito y funciona con **tu propia cuenta** en un proveedor de IA (OpenRouter, OpenAI o Anthropic) o con un servidor propio en tu oficina. No hay cuentas de Folio, ni servidores de Folio, ni telemetría.

> ⚠️ Versión de prueba. Folio es una herramienta de apoyo: no es asesoría legal. Verifica toda cita, norma y plazo antes de usarla.

## Cómo empezar

1. Descarga `folio.html` desde la sección [Releases](../../releases) de este repositorio.
2. Ábrelo con doble clic en Chrome, Edge o Firefox actualizados. No necesita instalación.
3. Sigue los 5 pasos de bienvenida: avisos de privacidad, contraseña de tu bóveda y proveedor de IA.
4. ¿No tienes key? Dentro de Folio pulsa **“¿Cómo obtengo mi key?”** o lee la [guía paso a paso](docs/guia-api-keys.md).
5. Pulsa **“Probar con un expediente de ejemplo”** para verlo funcionando con datos ficticios.

## Privacidad por diseño

- **Todo queda en tu equipo**, cifrado con AES-GCM de 256 bits. La clave se deriva de tu contraseña (PBKDF2-SHA-256, 310 000 iteraciones) y nunca se guarda.
- **Datos personales reemplazados antes de enviar.** Nombres, DNI, RUC, teléfonos, correos y direcciones se cambian por marcadores como `[PERSONA_1]`; Folio restaura los datos reales solo en tu pantalla.
- **Revisión previa.** Antes de cada envío puedes ver exactamente qué texto sale de tu equipo.
- **Registro de envíos** local y exportable a CSV, para demostrar qué salió, cuándo y a qué proveedor.
- **Sin API directa de DeepSeek.** Según su política de privacidad, guarda los datos en China. El modelo se puede usar a través de OpenRouter con proveedores sin retención de datos.
- **Autorización para clientes.** Incluye un modelo de autorización escrita para el uso de IA con los datos del cliente.

Como el código es público, cualquiera puede verificar que Folio hace lo que dice.

## Qué no hace esta versión

- No se conecta al CEJ ni al SINOE: pegas el seguimiento del expediente y el agente lo ordena.
- No lee documentos escaneados como imagen (no hace OCR).
- No sincroniza entre equipos. Usa **Ajustes → Copia de seguridad** para no perder tus datos si limpias el navegador.
- No calcula plazos procesales: los registras tú.

## Para desarrolladores

Folio es un solo archivo HTML sin dependencias de compilación. El código está separado en `src/` y se ensambla con:

```bash
python build.py        # genera dist/folio.html
```

| Archivo | Contenido |
|---|---|
| `src/config.js` | Datos del autor (nombre, correo, ciudad, repositorio). **Edítalo antes de publicar.** |
| `src/core.js` | Cifrado, IndexedDB, proveedores de IA, seudonimización y recuperación de fragmentos |
| `src/legal.js` | Política de privacidad, términos de uso y autorización para clientes |
| `src/ui.js` | Interfaz, bienvenida, agente, ajustes y eventos |
| `src/styles.css` | Estilos y temas claro/oscuro |
| `src/shell.html` | Estructura HTML base |
| `tests/e2e_test.py` | Prueba end-to-end con Playwright y un proveedor de IA simulado |
| `AGENTS.md`, `memory.md`, `process/` | Contexto del proyecto para agentes de IA (arquitectura, decisiones, tareas, esquema de datos) |

```bash
pip install playwright && playwright install chromium
python tests/e2e_test.py     # debe terminar en "TODO OK"
```

Para publicar una versión: edita `src/config.js`, ejecuta `python build.py`, crea un Release en GitHub y adjunta `dist/folio.html`.

## Licencia

[AGPL-3.0](LICENSE). Puedes usar, estudiar y modificar Folio. Si lo modificas y lo ofreces a otros, debes publicar tu código bajo la misma licencia.

## Aviso legal

La política de privacidad y los términos incluidos son **borradores** y deben ser validados por un abogado especialista en protección de datos (Ley N.° 29733 y D.S. N.° 016-2024-JUS) antes de distribuir Folio.
