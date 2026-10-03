# Spec — Rediseño UX/UI v0.5.0: el expediente primero

> Estado: **aprobado por el usuario (2026-10-03)** e implementado (F1–F6) · sin logo SVG (va en WebP) · F7 (sitio) queda para después de revisar la app · nombre del panel: "Agente" · Épica E9 · Fuente: análisis externo
> `Folio_Propuesta_Rediseño_UX_UI.md` (revisado punto por punto en §11) + revisión del código actual (`src/ui.js`, `src/styles.css`).
> Alcance: interfaz y organización de la pantalla. **Sin cambios** en cifrado, formato del expediente, IA,
> seudonimización ni salidas de red → no cambia la política (`APP.policyVersion` se mantiene).

## 1. Problema
La pantalla del expediente muestra todo con el mismo peso al mismo tiempo (captura `tests/shots/01-expediente.png`):
- **Cuatro zonas compitiendo:** barra lateral, carátula con sello girado, memoria en 6 tarjetas y agente fijo (42 % del ancho).
- **El agente ocupa casi la mitad de la pantalla** aunque el abogado no esté conversando. Si no hay proveedor conectado, ese espacio queda vacío.
- **No hay una vista "¿cómo va el caso?"** El abogado tiene que leer seis tarjetas de formulario para saber el estado, el próximo plazo y qué se movió.
- **La memoria parece un formulario** (cajas de texto con borde), no la memoria del caso. Hechos y estrategia se ven iguales.
- **El sello "Guardado solo en este equipo"** compite con el número de expediente y se lee como advertencia.
- **Las tarjetas y los bordes están por todas partes:** cada sección es una tarjeta con sombra.
- **La marca no coincide:** la app usa acento azul `#4d6bfe` y un ícono genérico, mientras que el logo y el banner nuevos son azul marino + teal.

## 2. Objetivo
Que un abogado que nunca usó Folio entre a un expediente y responda **en menos de 10 segundos y sin desplazarse**:
qué expediente es, quiénes son las partes, en qué estado está, qué vence pronto, qué pasó último, qué documentos hay,
qué recuerda Folio y cómo se protegen sus datos (criterio del §38 del análisis).

Principio rector: **el expediente es el centro; el agente es una herramienta dentro del expediente; la privacidad es el fundamento, visible pero no alarmante.**

## 3. Sistema visual (F1)

### 3.1 Paleta (reemplaza el acento azul de v0.3)
Se deriva del logo y del banner. Contrastes medidos (WCAG; mínimo AA 4,5:1 para texto):

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `--paper` (fondo) | `#0B1220` | `#F7F5F0` | fondo general (blanco cálido en claro) |
| `--sheet` (superficie) | `#111B2A` | `#FFFFFF` | paneles y carátula |
| `--sheet-2` (elevada) | `#162235` | `#F1EEE7` | hover, filas, burbuja del abogado |
| `--ink` | `#F4F1EA` (16,6:1) | `#0B1220` (17,2:1) | texto principal |
| `--graphite` | `#9AA8B8` (7,7:1) | `#4A5668` (6,8:1) | texto secundario |
| `--faint` | `#7E8DA0` (5,1:1) | `#5F6B7C` (5,4:1) | metadatos |
| `--rule` | `#26364A` | `#E4E0D7` | separadores |
| `--accent` | `#35C7B3` (8,9:1) | `#0F766E` (5,5:1) | acción principal, activo, foco, enlaces |
| `--on-accent` | `#0B1220` | `#FFFFFF` | texto sobre botón teal |

- **Regla del teal:** solo para la acción principal de cada zona, el elemento activo (pestaña, expediente seleccionado), el foco, los enlaces y la identidad. Nunca de fondo en bloques grandes ni en texto decorativo.
- **El teal del análisis (`#35C7B3`) no se usa como texto en tema claro** (2,1:1, no pasa). En claro se usa `#0F766E`.
- Se mantienen `--danger`, `--warn` y `--ok`, recalibrados sobre el fondo marino. El rojo y el ámbar se reservan para plazos vencidos o de 0 a 3 días; el resto de los plazos va en gris (§20 del análisis).
- **Se mantienen los dos temas** (claro y oscuro), con el selector "Según el sistema / Claro / Oscuro" (D-24). El análisis solo define el oscuro.

### 3.2 Tipografía: sin cambios de familia
Se mantienen **DM Sans** (interfaz), **Fragment Mono** (número de expediente, fechas, foliador, marcadores `[PERSONA_1]`) y Montserrat (títulos grandes), ya incluidas en el HTML (T-203).
Lo que cambia es la **jerarquía**: número de expediente en mono de 1,5 rem, partes a 1,15 rem en peso 500, etiquetas de sección en versalitas de 0,75 rem con espaciado, y cuerpo de 16 px.

### 3.3 Menos cajas
- Las secciones de la memoria dejan de ser tarjetas con sombra: son **bloques separados por espacio y una línea fina**, con etiqueta de sección arriba.
- Las tarjetas se reservan para lo que se agrupa de verdad: plazos de la pestaña Resumen, diálogos y documentos.
- Radios más sobrios: 12 px en paneles y 8 px en campos. Los botones siguen en píldora.

### 3.4 Logo
- El logo se usa en la barra lateral (en lugar de "ícono + folio"), en las pantallas de desbloqueo y de bienvenida, y como favicon.
- Variante oscura = `docs/img/folio-logo-blanco.webp`. Variante clara = el original azul marino.
- Va **dentro del HTML** (base64, a 2× del tamaño de uso, unos 6 a 10 KB por variante), porque `folio.html` es un solo archivo y funciona sin internet.
- Si el usuario consigue el logo **en SVG**, se usa ese: pesa menos, se ve nítido y se recolorea con tokens.
- Se mantiene la insignia "Beta".

## 4. Estructura de la pantalla (F2)

```text
┌─────────────┬──────────────────────────────────────────────┬──────────────────┐
│ [logo] Beta │ 00845-2026-0-1501-JP-FC-01     ● En trámite   │ Agente      ⤢  ✕ │
│ + Nuevo     │ Rosa Elena Quispe Rojas contra Julio C. Huamán│                  │
│ Buscar…     │ Alimentos · JPL de Huancayo, Junín            │ (conversación)   │
│             │ 🔒 Solo en este equipo · cifrado    Editar    │                  │
│ AGENDA      ├──────────────────────────────────────────────┤                  │
│ Vencidos 0  │ Resumen  Memoria  Movimientos 4  Documentos 1 │                  │
│ Esta semana │                                              │                  │
│  05/10 …    │            (contenido de la pestaña)          │ [acciones]       │
│             │                                              │ [consulta…]      │
│ EXPEDIENTES │                                              │ Se envía a Open- │
│  00845… ●   │                                              │ Router con datos │
│  00721…     │                                              │ reemplazados     │
│ Ajustes · Privacidad · Bloquear                            │                  │
└─────────────┴──────────────────────────────────────────────┴──────────────────┘
```

### 4.1 Panel del agente con tres estados (§7–8 del análisis)
- **Abierto:** columna derecha de 380 a 420 px (hoy ocupa el 42 % del ancho).
- **Amplio:** la columna ocupa alrededor del 60 % del ancho; el expediente queda visible a la izquierda. Sirve para trabajar un borrador largo.
- **Cerrado:** el panel se reduce a un botón fijo "Agente" en la esquina inferior derecha. Si hay una respuesta en curso, el botón muestra un indicador.
- **Se recuerda la última elección** en `settings.agentPanel = 'abierto'|'amplio'|'cerrado'` (dato cifrado; ver §9).
- **Valor por defecto:**
  - pantallas de 1280 px o más: abierto;
  - pantallas más angostas: cerrado;
  - si no hay proveedor conectado: cerrado. Al abrirlo, explica cómo conectar el proveedor (se implementó así en lugar de cambiar el texto del botón).
- **Atajo `Ctrl+.`** para abrir o cerrar el panel. `Esc` cierra el panel ampliado.
- **Móvil (menos de 820 px):** el agente es una hoja a pantalla completa, con botón "Volver al expediente". Reemplaza la pestaña "Agente" actual.
- **El estado del chat no se pierde** al abrir o cerrar el panel. Se oculta, no se vuelve a dibujar.

### 4.2 Carátula del expediente (§9)
- Número en mono, partes ("cliente **contra** contraparte"), materia · órgano · distrito, y una **ficha de estado** a la derecha.
- La ficha muestra el texto de `estado` cortado a unos 40 caracteres, con punto teal si hay un plazo en 7 días o menos, y gris si no lo hay.
- **No se inventan estados nuevos:** `estado` sigue siendo texto libre que escribe el abogado.
- **El sello girado sale de la carátula.** En su lugar queda un indicador compacto "🔒 Solo en este equipo · cifrado" (ícono SVG). Al hacer clic se abre la ventana "Privacidad de este expediente" (§4.4).
- El sello animado se conserva solo en la pantalla de desbloqueo y en el estado vacío, donde funciona como identidad.

### 4.3 Barra lateral: Expedientes / Agenda / Ajustes (§19–20)
- **Arriba:** logo, "Nuevo expediente" y buscador. No se duplica la búsqueda en una barra superior.
- **Agenda:** plazos de todos los expedientes, agrupados en **Vencidos**, **Hoy** y **Próximos 7 días** (hoy: lista plana de 14 días).
  - Cada grupo se muestra solo si tiene elementos.
  - Si un grupo tiene más de 4 plazos, se pliega con "Ver N más".
- **Expedientes:** ordenados por última modificación. El expediente activo se marca con una barra teal a la izquierda.
- **Abajo:** Ajustes, Privacidad (abre la ventana de §4.4) y Bloquear.

### 4.4 Ventana "Privacidad de este expediente" (§15)
Reúne en un solo lugar lo que hoy está repartido. Son datos que Folio ya tiene, no textos legales nuevos:
- ✓ Guardado cifrado en este navegador; Folio no tiene servidores.
- ✓ Reemplazo de datos activado o desactivado, y cuántas partes y documentos se reemplazan.
- Proveedor y modelo actuales, y el último envío (fecha y si fue con datos reemplazados).
- Enlaces a "Registro de envíos", "Ajustes de privacidad" y "Política".

## 5. Pestañas del expediente (F3–F4)
Orden nuevo: **Resumen · Memoria · Movimientos (n) · Documentos (n)**. Al abrir un expediente se muestra **Resumen**.

### 5.1 Resumen (nueva; §10, §26, §38)
Vista de solo lectura que responde "¿qué está pasando?". Todo se calcula en el equipo, sin IA:

```text
ESTADO ACTUAL                                  PRÓXIMO PLAZO
Demanda contestada; audiencia única            05 OCT · en 2 días
programada                                     Presentar escrito con medios
                                               probatorios adicionales
RESUMEN DEL CASO                               + 1 plazo más este mes
Demanda de alimentos a favor de la hija…
                                               PENDIENTES  1 de 2 por hacer
ÚLTIMOS MOVIMIENTOS                 Ver todos   □ Reunir boletas de gastos…
● 28/09  Auto que fija audiencia
● 15/09  Contestación de demanda               DOCUMENTOS  Ver todos
● 02/09  Auto admisorio                        Fs. 12  Demanda.pdf · 02/09

FOLIO RECUERDA DE ESTE CASO
3 partes protegidas · hechos clave · estrategia · 4 movimientos · 1 documento
                                    [Ver memoria]   [Preguntar al agente]
```

- **Estado vacío:** si el expediente está recién creado, el Resumen muestra pasos guiados en lugar de bloques vacíos:
  "Agrega las partes", "Pega el seguimiento del CEJ" y "Sube la demanda".
- **Muchos movimientos:** el Resumen muestra solo los 3 últimos; el resto está en la pestaña.
- **Los pendientes se pueden marcar como hechos desde el Resumen.** Es la única edición permitida en esa pestaña.

### 5.2 Memoria (§11–14)
Es lo que el agente lee en cada consulta. Arriba lleva una línea fija:
*"Todo lo que está aquí lo escribiste o aprobaste tú. El agente lo lee antes de responder."* Así se distingue la memoria (fuente del abogado) de la interpretación de la IA (§33).

- **Situación:** estado procesal y resumen del caso.
- **Hechos clave**, con la etiqueta *"lo que consta en el expediente"*.
- **Estrategia**, con la etiqueta *"tu criterio y próximos pasos"*. Se distingue de Hechos con un filete lateral teal y la etiqueta, sin cambiar de color de fondo.
- **Plazos y Pendientes**, en dos columnas en escritorio.
- **Datos protegidos antes de consultar a la IA:** la tabla de partes actual con otro encabezado y una línea que explica el porqué:
  "Antes de cada envío, Folio cambia estos datos por el marcador. El proveedor ve `[PERSONA_1]`, no el nombre."
  La columna "Se envía como" muestra el marcador con ✓, o "sin reemplazo" en ámbar si el reemplazo está desactivado.

**Edición sin fricción:** los campos de texto se ven como **texto de documento** (sin borde, crecen con el contenido). El borde aparece solo al pasar el mouse o al enfocar. Se mantiene el guardado automático de hoy (`data-bind` + `saveSoon`): cero clics extra.

### 5.3 Movimientos: línea de tiempo (§16)
- Línea vertical con puntos; el más reciente se resalta en teal.
- **Agrupados por mes y año** con encabezados ("septiembre 2026").
- **Más de 30 movimientos:** se muestran los 30 últimos y el botón "Ver anteriores (N)", para que los expedientes con cientos de movimientos sigan siendo rápidos.
- Se mantienen "Pegar desde el CEJ" (acción principal) y "Agregar movimiento".

### 5.4 Documentos (§17)
- **Lista** en lugar de la cuadrícula de tarjetas: insignia de tipo (`PDF`, `DOCX`, `TXT`, en gris y sin colores por tipo), nombre, folios en mono, fecha y "Ver texto".
- **Buscador por nombre** cuando hay 6 documentos o más.
- La zona para arrastrar archivos se reduce a una franja cuando ya hay documentos.
- **No se promete "Abrir":** Folio guarda el texto extraído, no el archivo original.

## 6. Agente (F5; §7, §18, §26)
- **Encabezado:** "Agente" + "Conoce la memoria de este expediente". El proveedor y el modelo pasan a un **detalle desplegable**:
  "Con tu cuenta de OpenRouter · anthropic/claude-sonnet-5.5", junto con el estado de la biblioteca legal.
  "Actualizar memoria" se ofrece debajo de la última respuesta ("¿Algo de esto debe quedar en la memoria del caso?") y en la pestaña Memoria, no en el detalle, para que siga siendo fácil de encontrar.
- **Se mantiene visible junto al botón Enviar la línea "Se envía a OpenRouter con datos reemplazados".**
  Es la información de privacidad en el momento de decidir (D-06, Ley 29733), no "texto técnico".
- **Estado vacío "Folio recuerda":** antes de la primera consulta, el panel muestra lo que el agente ya sabe, calculado en el equipo:
  estado, próximo plazo, número de partes protegidas, movimientos y documentos. Debajo: "No tienes que repetir el contexto".
- **Acciones rápidas con verbos en infinitivo:** "Resumir expediente", "Preparar próximos plazos", "Analizar riesgos" y "Preparar borrador".
  - **Contextuales:** si hay un plazo en 7 días o menos, la primera acción es "Preparar: ⟨plazo⟩".
  - Si el expediente no tiene documentos, no se ofrece "Analizar riesgos" como primera acción.
- **Las respuestas de la IA se distinguen visualmente** de la memoria: sin fondo de papel y con su pie "Enviado a… · N datos reemplazados", como hoy.
  Nada de lo que dice la IA entra a la memoria sin pasar por "Actualizar memoria" (D-08).

## 7. Microinteracciones (F6, al final; §8 del roadmap del análisis)
- ~~Transición de 160 ms al abrir o cerrar el panel~~: no se implementó; el panel aparece sin animación, que es más sobrio. La única animación nueva es el punto del botón "Agente" mientras hay una respuesta en curso (desactivada con `prefers-reduced-motion`).
- El sello animado solo al desbloquear.
- Nada de brillos, gradientes ni animaciones de "IA pensando" más allá del indicador de escritura actual.

## 8. Sitio web (F7, opcional pero recomendado)
`docs/index.html` usa hoy el acento azul `#4d6bfe`, que no coincide con el logo ni con la app nueva.
Aplicar la paleta marino/teal al sitio mantiene la coherencia sitio ↔ app (D-24). El sitio puede ser más expresivo (banner, ilustración); la app, más sobria (§25).

## 9. Datos
- **Nuevo en `settings`:** `agentPanel: 'abierto'|'amplio'|'cerrado'` (opcional; si falta, se aplica el valor por defecto de §4.1). Se documenta en `process/db-schema.md`.
- **Sin cambios** en el expediente, el índice, los documentos ni el registro de envíos. **No hace falta migración.**
- **Sin nuevas salidas de red.** No se cambia la política.

## 10. Plan de trabajo (fases y tareas)

| Fase | Tarea | Contenido | Tamaño |
|---|---|---|---|
| F1 | T-401 | Tokens marino/teal claro+oscuro, menos sombras y radios, logo y favicon en base64 | M |
| F2 | T-402 | Panel del agente con tres estados + `settings.agentPanel` + atajo + móvil a pantalla completa | L |
| F2 | T-403 | Carátula nueva con ficha de estado + indicador de privacidad + ventana "Privacidad de este expediente" | M |
| F2 | T-404 | Barra lateral: agenda agrupada (vencidos/hoy/7 días), lista con marca teal, pie con Privacidad | M |
| F3 | T-405 | Pestaña **Resumen** (incluye estado vacío guiado) | L |
| F3 | T-406 | Memoria sin tarjetas: hechos vs estrategia, "datos protegidos", campos con aspecto de documento | M |
| F4 | T-407 | Movimientos: línea de tiempo agrupada por mes + "ver anteriores" | S |
| F4 | T-408 | Documentos en lista con insignias y buscador | S |
| F5 | T-409 | Agente: encabezado con detalle plegable, "Folio recuerda", acciones rápidas contextuales | M |
| F6 | T-410 | Microinteracciones + revisión de accesibilidad (contraste, foco, lector de pantalla) + e2e y capturas nuevas | M |
| F7 | T-411 | Sitio web con la paleta nueva | S |
| — | T-412 | Release v0.5.0 + prueba de 10 segundos con abogados (dentro de T-205) | S |

Orden: F1 → F2 → F3 → F4 → F5 → F6 (F7 puede ir en paralelo). Cada fase termina con `python build.py` +
`python tests/e2e_test.py` en verde y capturas en claro/oscuro/móvil para revisión del usuario antes de seguir.

## 11. Qué se toma y qué no del análisis externo

| § | Propuesta | Decisión | Por qué |
|---|---|---|---|
| 1, 2, 5, 27 | El expediente es el centro; la IA es una herramienta | ✅ Se toma | Es el diagnóstico correcto y coincide con D-01 (el diferenciador es la memoria) |
| 6, 8 | Agente colapsable (abrir, minimizar, ampliar) | ✅ Se toma | Libera el 42 % de la pantalla; se agrega la memoria de la preferencia y el atajo |
| 7 | Rótulo "**✦ Folio IA**" | ❌ No | Choca con el NUNCA de AGENTS.md: presentaría el modelo de un tercero como propio. El ✦ es un cliché de "estética de IA" que el mismo análisis pide evitar. Se usa "Agente" |
| 7 | Ocultar el proveedor como información técnica | ◐ En parte | El nombre del modelo va a un detalle plegable; **a dónde se envían los datos sigue visible al enviar** (D-06, Ley 29733) |
| 9 | Carátula digital con número en mono | ✅ Se toma | Ya está Fragment Mono; se mejora la jerarquía |
| 9, 22 | Cambiar a JetBrains Mono / IBM Plex Mono e Inter / Manrope | ❌ No | DM Sans y Fragment Mono ya cumplen ese papel y van dentro del HTML; cambiarlas suma peso y trabajo sin mejora visible |
| 10 | Zona de estado del expediente | ✅ Se toma | Como pestaña **Resumen**; "documentos nuevos" se cambia por "agregados en los últimos 7 días" (Folio no registra visitas) |
| 11 | Tarjetas con contadores "Folio conoce 7 elementos" | ❌ No | Hechos y estrategia son texto libre: el número sería inventado o exigiría reestructurar los datos. Se muestra "Folio recuerda" con contenido real |
| 12, 13 | Separar hechos de estrategia | ✅ Se toma | Etiquetas y filete; sin emojis |
| 14 | Partes como "datos protegidos antes de consultar a la IA" | ✅ Se toma | Hace visible el diferenciador de privacidad |
| 15 | Sello → indicador de producto + ventana de detalle | ✅ Se toma | El sello animado queda en el desbloqueo y en el estado vacío |
| 16 | Movimientos como línea de tiempo | ✅ Se toma | Ya existe una base; se agrupa por mes y se pagina |
| 17 | Documentos con insignias y búsqueda | ✅ Se toma | Sin "Abrir →" (no guardamos el original) ni XLSX (no se admite) |
| 18 | Acciones rápidas en infinitivo | ✅ Se toma | Además, contextuales al plazo más próximo |
| 19 | Barra lateral Expedientes / Agenda / Ajustes | ✅ Se toma | La agenda es un bloque agrupado, no pantallas aparte |
| 6 | Barra superior con buscador global | ❌ No | Duplica el buscador de la barra lateral y resta altura útil |
| 20 | Urgencia discreta de plazos | ✅ Se toma | Color solo de 0 a 3 días o vencido |
| 21 | Paleta marino/teal/blanco cálido | ✅ Se toma, corregida | El teal `#35C7B3` no pasa en tema claro (2,1:1) → `#0F766E`; se define también el tema claro |
| 23, 24 | Menos tarjetas; nada de glow, glassmorphism ni gradientes | ✅ Se toma | Coincide con D-24 y con la guía de diseño |
| 26 | "Folio recuerda de este expediente" | ✅ Se toma | Calculado en el equipo, sin gastar consultas de IA |
| 33, 34 | Separar fuente / memoria / IA | ◐ En parte | Ahora: rótulos y estilos distintos + D-08. Hecho por hecho con "Fuente: Demanda.pdf" exige convertir los hechos en lista con origen (cambia el formato del expediente) → **queda para un spec propio** |
| 31 | Métricas de UX | ✅ Se toma | Prueba de 10 segundos y número de clics dentro de T-205 |
| Mocks | Emojis 🧠 ⚖️ 📄 🟢 como íconos | ❌ No | Íconos SVG de trazo fino con `aria-hidden`, o ninguno |
| 28 | Flujo ideal del abogado | ✅ Se toma | El orden Resumen → Memoria → Movimientos → Documentos → Agente lo sigue |
| 25 | README más visual que la app | ✅ Se toma | Ya aplicado con el banner |

## 12. Respuestas a las preguntas del §32 del análisis (las que aplican)
1. **¿El expediente siempre en el centro?** Sí.
2. **¿El agente abierto por defecto?** Sí en pantallas de 1280 px o más; si no, cerrado. Se recuerda la elección del abogado.
3. **¿Qué se ve al abrir un expediente?** La pestaña Resumen (§5.1).
4. **¿Qué es "memoria"?** Lo que el abogado escribió o aprobó: estado, resumen, hechos, estrategia, plazos, pendientes y partes. El agente la lee siempre. Movimientos y documentos son fuentes que el agente consulta.
5. y 6. **¿Quién genera qué?** Folio solo propone, a través de "Actualizar memoria"; todo lo guarda el abogado (D-08).
7. y 8. **¿Qué se envía?** Lo que muestra la revisión previa. Nunca se envía la contraseña, la clave, otros expedientes ni el archivo original.
9. **¿Cómo comunicar la privacidad sin ansiedad?** Indicador compacto + ventana de detalle + línea en el momento de enviar.
15. a 17. **Expediente vacío, cientos de movimientos, muchos documentos:** §5.1, §5.3 y §5.4.

## 13. Fuera de alcance
- Hechos con fuente por elemento (§33–34 del análisis): spec aparte.
- Plantillas de escritos (T-214).
- Búsqueda dentro del texto de los documentos.
- Calendario mensual.
- Cambios en la bienvenida (solo hereda los tokens y el logo).

## 14. Criterios de aceptación
- `python build.py` y `python tests/e2e_test.py` terminan en "TODO OK". El e2e cubre: tres estados del panel, la preferencia que se recuerda tras bloquear y desbloquear, la pestaña Resumen con y sin datos, y el agente a pantalla completa en móvil.
- Texto con contraste AA (4,5:1) o más en ambos temas; foco visible en todos los controles; panel y pestañas navegables con teclado.
- Sin desplazamiento horizontal a 375 px en ambos temas.
- Ninguna solicitud de red nueva (se verifica en el e2e como hoy).
- `folio.html` no crece más de 50 KB respecto de v0.4.0 (ajustado al implementar: el logo en WebP aporta ~10 KB; resultado: +47 KB).
- En la captura del expediente de ejemplo a 1440×900 con el agente abierto se ven **sin desplazarse**: número, partes, estado, próximo plazo, último movimiento y el indicador de privacidad.
- Prueba de 10 segundos con 3 abogados (T-205): responden al menos 7 de las 9 preguntas del §2 sin ayuda.

## 15. Preguntas abiertas para el usuario
1. **¿Tienes el logo en SVG?** Si no, va en base64 en WebP (unos 6 a 10 KB por variante).
2. **¿Se incluye F7 (sitio con la paleta nueva) en esta versión?** Recomendado: sí, para no tener dos identidades.
3. **¿Nombre del panel?** Recomendado: "Agente", que mantiene "agente de IA" del README y del sitio y no presenta el modelo como propio. Alternativa: "Asistente".
