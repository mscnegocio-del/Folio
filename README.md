<div align="center">

# Folio — agente de IA para abogados litigantes en el Perú

**Inteligencia artificial para tus expedientes judiciales, gratuita y de código abierto.<br>Tus expedientes no salen de tu equipo.**

[![Descargar v0.2.0](https://img.shields.io/github/v/release/mscnegocio-del/Folio?label=descargar&color=5B3FC4)](https://github.com/mscnegocio-del/Folio/releases/latest)
[![Licencia AGPL-3.0](https://img.shields.io/badge/licencia-AGPL--3.0-blue)](LICENSE)
![Sin instalación](https://img.shields.io/badge/instalación-ninguna-success)
![Sin servidores](https://img.shields.io/badge/servidores-ninguno-success)
![Hecho en Perú](https://img.shields.io/badge/hecho%20en-Perú-red)

[Sitio web](https://mscnegocio-del.github.io/Folio/) · [Descargar](https://github.com/mscnegocio-del/Folio/releases/latest) · [Cómo empezar](#cómo-empezar-en-5-minutos) · [Privacidad](#privacidad-por-diseño) · [Preguntas frecuentes](#preguntas-frecuentes)

</div>

---

## ¿Qué es Folio?

Folio es un **asistente de IA para abogados** que organiza cada **expediente judicial** con su propia memoria: partes, plazos, pendientes, movimientos del CEJ, documentos y estrategia. Cuando le haces una consulta, el agente ya conoce el caso, así que no tienes que repetir el contexto en cada pregunta.

Está pensado para el **abogado litigante peruano**, el estudio pequeño y el abogado independiente: es **gratuito**, funciona en el navegador **sin instalar nada** y usa **tu propia cuenta de IA** (modelo BYOK, "trae tu propia key") con OpenRouter, OpenAI, Anthropic (Claude) o un servidor propio en tu oficina.

> ⚠️ **Versión de prueba.** Folio es una herramienta de apoyo, no asesoría legal. Verifica toda cita, norma y plazo antes de usarla.

## ¿Para qué te sirve?

| Tarea | Cómo te ayuda Folio |
|---|---|
| **Resumir un expediente** | Lee la memoria del caso y los documentos cargados, y te devuelve el estado actual en lenguaje claro. |
| **Ordenar el seguimiento del CEJ** | Copia los movimientos de la Consulta de Expedientes Judiciales, pégalos y la IA los ordena para que los revises y apruebes. |
| **Analizar escritos y resoluciones** | Carga PDF, Word (DOCX) o TXT; el texto se extrae en tu equipo y el agente lo usa como contexto. |
| **Preparar borradores** | Pide un borrador de escrito, un esquema de alegatos o una lista de argumentos basados en los hechos del caso. |
| **No perder pendientes** | Registra plazos y tareas por expediente; el agente puede proponerte actualizar la memoria, siempre con tu aprobación. |
| **Pensar la estrategia** | Conversa con el agente sobre riesgos, pruebas y próximos pasos con todo el caso a la vista. |

## Características

- 📁 **Memoria por expediente**: estado, resumen, plazos, pendientes, partes, hechos y estrategia.
- 🤖 **Agente con respuesta en tiempo real** que consulta la memoria y los documentos antes de responder.
- 📄 **Lectura local de documentos** PDF, DOCX y TXT.
- 📋 **"Pegar desde el CEJ"**: ordena los movimientos del expediente con IA y revisión del abogado.
- 🔒 **Bóveda cifrada** con auto-bloqueo y cambio de contraseña.
- 🕵️ **Seudonimización automática** de nombres, DNI, RUC, teléfonos, correos y direcciones antes de enviar algo a la IA.
- 👀 **Revisión previa**: ves el texto exacto que sale de tu equipo.
- 🧾 **Registro de envíos** exportable a CSV.
- 💾 **Copia de seguridad cifrada** (`.folio`) para mover tus datos o no perderlos.
- 🌓 Modo claro y oscuro; funciona en computadora y en celular.

## Cómo empezar en 5 minutos

1. **Descarga** `folio.html` desde [la última versión](https://github.com/mscnegocio-del/Folio/releases/latest).
2. **Ábrelo con doble clic** en Chrome, Edge o Firefox actualizados. No necesita instalación ni cuenta.
3. **Sigue los 5 pasos de bienvenida**: avisos de privacidad, contraseña de tu bóveda y proveedor de IA.
4. **¿No tienes key?** Dentro de Folio pulsa **"¿Cómo obtengo mi key?"** o lee la [guía paso a paso](docs/guia-api-keys.md).
5. Pulsa **"Probar con un expediente de ejemplo"** para verlo funcionando con datos ficticios.

### ¿Cuánto cuesta?

Folio es **gratis**. Lo único que pagas es el uso de IA directamente a tu proveedor, según lo que consumas. Con modelos económicos, una consulta normal suele costar centavos de sol. Revisa los precios vigentes en la página de tu proveedor.

## Privacidad por diseño

Folio se diseñó pensando en el secreto profesional y en la **Ley N.° 29733, Ley de Protección de Datos Personales**.

- **Todo queda en tu equipo**, cifrado con AES-GCM de 256 bits. La clave se deriva de tu contraseña (PBKDF2-SHA-256, 310 000 iteraciones) y nunca se guarda.
- **Sin servidores de Folio**: no hay cuentas, ni nube propia, ni telemetría. Tus expedientes nunca pasan por el autor.
- **Datos personales reemplazados antes de enviar**: nombres, DNI, RUC, teléfonos, correos y direcciones se cambian por marcadores como `[PERSONA_1]`. Folio restaura los datos reales solo en tu pantalla.
- **Revisión previa** de cada envío y **registro local** para demostrar qué salió, cuándo y a qué proveedor.
- **Sin API directa de DeepSeek**: según su política, guarda los datos en China. El modelo solo se ofrece vía OpenRouter, con proveedores sin retención de datos.
- **Autorización para clientes**: incluye un modelo de autorización escrita para usar IA con los datos del cliente.

Como el código es público, cualquiera puede auditar que Folio hace lo que dice.

## Proveedores y modelos de IA compatibles

| Proveedor | Para quién | Notas |
|---|---|---|
| **OpenRouter** (recomendado) | La mayoría | Una sola key para muchos modelos: Claude Sonnet, GPT, Gemini Flash y DeepSeek. |
| **OpenAI** | Quien ya tiene cuenta de OpenAI | Conexión directa. |
| **Anthropic (Claude)** | Quien prefiere Claude | Conexión directa. |
| **Servidor propio** | Estudios con soporte técnico | Cualquier servidor compatible con la API de OpenAI, instalado por un técnico. |

Los modelos pertenecen a sus respectivas empresas; Folio solo se conecta a ellos con tu cuenta.

## Qué no hace esta versión

- No se conecta automáticamente al CEJ ni a SINOE: pegas el seguimiento y el agente lo ordena.
- No lee documentos escaneados como imagen (no hace OCR).
- No sincroniza entre equipos: usa **Ajustes → Copia de seguridad**.
- No calcula plazos procesales: los registras y verificas tú.

## Preguntas frecuentes

**¿Folio reemplaza al abogado?**
No. Es un asistente: organiza información y propone borradores. La revisión y la decisión final son siempre del abogado.

**¿Mis expedientes se suben a internet?**
Se guardan solo en tu navegador, cifrados. Solo sale hacia el proveedor de IA el texto de cada consulta, seudonimizado y después de que lo revises.

**¿Qué pasa si borro los datos del navegador?**
Perderías la bóveda. Por eso conviene descargar periódicamente la copia de seguridad cifrada desde Ajustes.

**¿Funciona sin internet?**
Puedes consultar y editar tus expedientes sin conexión; el agente de IA necesita internet (salvo que uses un servidor propio en tu red).

**¿Es legal usar IA con datos de mis clientes?**
El abogado es el responsable del tratamiento de los datos. Folio te da herramientas (seudonimización, registro de envíos y un modelo de autorización), pero revisa tus obligaciones bajo la Ley N.° 29733 y su reglamento (D.S. N.° 016-2024-JUS).

**¿Quién está detrás de Folio?**
Es un proyecto personal y de código abierto de Milton Salcedo Cruz (Huancayo, Perú). Contacto: mscnegocio@gmail.com.

## Para desarrolladores

Folio es HTML, CSS y JavaScript sin frameworks ni npm. El código está en `src/` y se ensambla en un solo archivo:

```bash
python build.py              # genera dist/folio.html
pip install playwright && playwright install chromium
python tests/e2e_test.py     # debe terminar en "TODO OK"
```

| Archivo | Contenido |
|---|---|
| `src/config.js` | Datos del autor (nombre, correo, ciudad, repositorio) |
| `src/core.js` | Cifrado, IndexedDB, proveedores de IA, seudonimización y recuperación de fragmentos |
| `src/legal.js` | Política de privacidad, términos de uso y autorización para clientes |
| `src/ui.js` | Interfaz, bienvenida, agente, ajustes y eventos |
| `src/styles.css` · `src/shell.html` | Estilos (temas claro/oscuro) y estructura base |
| `tests/e2e_test.py` | Prueba end-to-end con Playwright y un proveedor de IA simulado |
| `AGENTS.md` · `memory.md` · `process/` | Contexto para agentes de IA: arquitectura, decisiones, tareas y esquema de datos |

Las contribuciones son bienvenidas: abre un *issue* con tu propuesta o reporta un problema.

## Licencia

[AGPL-3.0](LICENSE). Puedes usar, estudiar y modificar Folio. Si lo modificas y lo ofreces a otros, debes publicar tu código bajo la misma licencia.

## Aviso legal

Folio no es asesoría legal. La política de privacidad y los términos incluidos son **borradores** pendientes de validación por un especialista en protección de datos personales (Ley N.° 29733 y D.S. N.° 016-2024-JUS).

---

<sub>Palabras clave: inteligencia artificial para abogados, IA legal Perú, asistente legal con IA, gestión de expedientes judiciales, software para abogados litigantes, CEJ Poder Judicial, legaltech Perú, código abierto, BYOK.</sub>
