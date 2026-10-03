# Spec — Biblioteca legal peruana (épica E8)

> Estado: **aprobado** (2026-10-01): lista de §5, descarga recomendada y búsqueda asistida activada · Versión objetivo: v0.4.0 (F1)
> F0 ✅ (§13) · F1 ✅ publicada en v0.4.0 (2026-10-03) con 7 normas y revisión asistida (§14) · Pendiente: 4 normas, CP parte 2 y F2.

## 1. Problema
Hoy el agente de Folio conoce muy bien **el caso** (memoria, movimientos, documentos), pero **la ley la saca de la
memoria del modelo de IA**. Eso tiene tres fallas graves para un abogado:

1. **Información desactualizada.** Los modelos se entrenan con datos de hace meses o años, y la legislación peruana
   cambia muy seguido: según un conteo publicado por Lampadia, el Código Penal de 1991 fue modificado 575 veces.
2. **Normas de otros países.** Los modelos mezclan jurisdicciones (Código Civil español, leyes mexicanas o argentinas)
   y lo hacen con mucha seguridad.
3. **Citas inventadas.** Un número de artículo o una cita textual que "suena bien" pero no existe.

Si un abogado detecta una sola de estas fallas en un escrito, deja de confiar en Folio.

## 2. Objetivo y no-objetivos
**Objetivo:** que cada respuesta del agente se apoye en el **texto vigente de las normas peruanas**, con la **fecha de
corte visible** y **cada cita verificada** contra esa biblioteca, para que el abogado sepa qué puede usar y qué debe revisar.

**No-objetivos (por ahora):**
- Ser una edición oficial. La fuente oficial sigue siendo el diario El Peruano y el SPIJ; Folio lo dice siempre.
- Calcular plazos procesales (regla del proyecto: nunca afirmar plazos sin pedir verificación).
- Jurisprudencia completa (acuerdos plenarios y precedentes vinculantes quedan para F3).
- Conectarse al SIJ, al CEJ o al SINOE (prohibido por AGENTS.md).

## 3. Principios no negociables
1. **Local-first:** la biblioteca se descarga al equipo del abogado y la búsqueda es local. Ninguna consulta ni dato de
   expediente sale hacia el repositorio de normas.
2. **Sin servidores del autor:** el paquete de normas se publica como archivos estáticos en GitHub Pages del repo,
   como el sitio web. Solo se descarga; nunca recibe datos.
3. **Fecha de corte siempre visible:** "Normas actualizadas al 15/10/2026". Si la biblioteca envejece, Folio lo advierte.
4. **Solo Perú por defecto:** el agente responde con legislación peruana; si menciona una norma extranjera, se marca.
5. **Verificar, no confiar:** toda cita se contrasta con la biblioteca y se muestra su estado. El abogado sigue siendo
   responsable y Folio le da el enlace para verificar en la fuente oficial.

## 4. Fuentes
| Fuente | Qué aporta | Uso en Folio |
|---|---|---|
| **Diario oficial El Peruano** (Normas Legales) | Publicación oficial; de ahí nace la vigencia (Constitución, art. 109: la ley rige desde el día siguiente de su publicación, salvo que ella misma postergue su vigencia) | Detectar cambios y fijar la fecha de vigencia de cada modificación |
| **SPIJ** (Ministerio de Justicia) | Edición oficial sistematizada (D.S. 001-2003-JUS). Más de 210 000 normas de acceso libre, incluidos códigos con texto actualizado; descarga en Word y PDF | Texto consolidado base de cada código y contraste de cada actualización |
| Archivo Digital de la Legislación del Congreso | Textos de leyes y su historial | Contraste puntual |
| Jurisprudencia vinculante (Corte Suprema, TC) | Acuerdos plenarios y precedentes | F3 |

**Derechos de reutilización (por confirmar en F0):** la Ley sobre el Derecho de Autor (D. Leg. 822, art. 9) excluiría
de protección los textos oficiales de normas. Hay que confirmarlo con el texto oficial, y además revisar las condiciones
de uso del SPIJ y de El Peruano. Folio usaría **solo el texto de la norma**, nunca las notas, concordancias ni
sumillas propias del SPIJ, que pueden ser obra protegida.

## 5. Alcance inicial (v1, propuesta a validar con abogados)
| Norma | Materias |
|---|---|
| Constitución Política del Perú (1993) | Todas |
| Código Civil | Civil, familia |
| Código Procesal Civil | Civil, familia, laboral (supletorio) |
| Código Penal | Penal |
| Código Procesal Penal (D. Leg. 957) | Penal |
| Nuevo Código Procesal Constitucional (Ley 31307) | Constitucional |
| Código de los Niños y Adolescentes (Ley 27337) | Familia |
| Ley 30364 y su reglamento | Violencia contra la mujer y el grupo familiar |
| Nueva Ley Procesal del Trabajo (Ley 29497) | Laboral |
| TUO de la Ley 27444, Procedimiento Administrativo General | Administrativo |
| TUO de la Ley Orgánica del Poder Judicial | Todas |

Tamaño estimado: unos 8 000 artículos, entre 6 y 8 MB de texto (1,5 a 2 MB comprimidos).

## 6. Cómo se mantiene actualizada (frecuencia: ¿automática o manual?)
**Respuesta corta: híbrida.** La detección y la descarga son automáticas; la publicación de un cambio pasa por una
revisión humana. Un error al consolidar un artículo de ley es peor que un día de demora, porque el abogado lo usaría
en un escrito.

```
 El Peruano publica         Vigía automático            Propuesta             Revisión humana         Folio del abogado
 una norma que modifica ─► (GitHub Actions, diario) ─► (cambio sugerido   ─► (mantenedor aprueba ─► descarga sola el
 un código vigilado         detecta "modifica el        artículo por          en un PR; se valida     paquete nuevo y avisa
                            art. X del Código Y"        artículo + diff)      con el SPIJ)            "3 artículos cambiaron"
```

| Evento | Frecuencia objetivo |
|---|---|
| Vigía revisa El Peruano | Diaria (automática) |
| Publicar un cambio detectado | ≤ 3 días hábiles desde su publicación en El Peruano; urgente (norma penal o procesal de vigencia inmediata) ≤ 48 h |
| Revisión completa contra el SPIJ aunque no haya alertas | Semanal; mueve la fecha de corte ("sin cambios al 22/10/2026") |
| Folio busca un paquete nuevo | Al desbloquear, como máximo cada 12 h (mismo mecanismo que el aviso de versión) |

**Normas publicadas pero aún no vigentes:** cada modificación guarda `vigenteDesde`. Si la fecha es futura, Folio
muestra los dos textos ("vigente hoy" y "regirá desde el …").

**Honestidad ante el atraso:** si la biblioteca tiene más de **14 días** sin actualizarse, el agente lo advierte en su
encabezado; con más de **30 días**, cada respuesta lleva el aviso "tu biblioteca puede no incluir cambios recientes".
Así, si el proyecto deja de mantenerse, Folio no engaña.

**Quién mantiene:** el autor como mantenedor. El repositorio acepta contribuciones por PR (por ejemplo, de abogados
voluntarios), y toda publicación requiere la aprobación del mantenedor.

## 7. Formato del paquete
Publicado en `docs/normas/` (GitHub Pages, que permite la descarga desde `file://`, por confirmar en F1):
```json
// manifest.json
{ "formato": "folio-normas", "version": 12, "actualizadoAl": "2026-10-15",
  "normas": [{ "id": "CP", "titulo": "Código Penal", "archivo": "CP.json.gz", "sha256": "…", "bytes": 412345, "actualizadoAl": "2026-10-14" }] }
// CP.json.gz → CP.json
{ "id": "CP", "titulo": "Código Penal", "base": "D. Leg. 635 (1991)", "fuenteOficial": "https://spij.minjus.gob.pe/…",
  "articulos": [{ "n": "122-B", "ubicacion": "Libro II · Título I · Capítulo III",
    "texto": "…", "vigenteDesde": "2026-03-12", "derogado": false,
    "historial": [{ "norma": "Ley N.° 3xxxx", "publicada": "2026-03-11", "vigenteDesde": "2026-03-12" }],
    "proximo": null }] }
```
- Integridad: Folio verifica el `sha256` de cada archivo antes de usarlo.
- Actualización incremental: solo descarga las normas cuyo `sha256` cambió.
- En el equipo: base IndexedDB aparte (`folio-normas`) **sin cifrar**, porque es información pública y no contiene
  datos del abogado. Se documenta en `db-schema.md` como excepción.

## 8. Cambios en Folio
### 8.1 Descarga
- La bienvenida (paso 5) y Ajustes → **Biblioteca legal** ofrecen descargarla (≈ 2 MB). Se recomienda activarla, pero el
  abogado puede no hacerlo (la descarga expone la IP a GitHub).
- Funciona sin internet una vez descargada.

### 8.2 Búsqueda local
1. **Citas explícitas:** reconoce "art. 122-B CP", "artículo 1969 del Código Civil", "Ley 30364, art. 8" en la pregunta,
   en la memoria y en los documentos del expediente, y trae esos artículos exactos.
2. **Búsqueda por palabras** (BM25 con normalización de tildes y raíces) sobre los artículos, filtrada por la materia
   del expediente (por ejemplo, Familia → Código Civil, Código Procesal Civil, Código de los Niños y Adolescentes y Ley 30364).
3. **Diccionario jurídico** de sinónimos entre términos ("pensión de alimentos" ↔ "alimentos", "despido" ↔ "extinción
   del contrato"). Nunca asocia términos con números de artículo: eso lo resuelve la búsqueda sobre el texto real.

### 8.3 Flujo de una consulta
1. *(Opcional, ajuste "Búsqueda legal asistida", activado por defecto)* Primera llamada corta al modelo con la pregunta
   seudonimizada: "¿qué normas peruanas necesitas consultar?" → devuelve una lista JSON de normas y artículos o términos.
2. Folio busca **localmente** esos artículos y suma lo que encontró por citas y palabras (máx. 8 artículos, ≈ 4 000 tokens).
3. Llamada principal con un bloque nuevo: `== NORMAS PERUANAS (biblioteca al 15/10/2026) ==` con texto, vigencia e historial.
4. Verificador de citas sobre la respuesta (§8.4).

### 8.4 Verificador de citas (local, sin IA)
Debajo de cada respuesta, una ficha por cada norma citada:
- ✓ **Vigente**: está en la biblioteca y vigente (clic → ver el texto, su historial y el enlace al SPIJ).
- ⚠ **Cita textual distinta**: el texto entre comillas no coincide con el vigente.
- ⚠ **Modificado**: el artículo cambió después de la fecha que menciona la respuesta, o tiene un cambio por regir.
- ✗ **No encontrado** o **derogado**.
- 🌐 **Norma extranjera**: patrones como "Código Civil español", "BOE", "Código Penal Federal", "U.S.C.".
- ○ **Fuera de la biblioteca**: es una norma peruana que no está incluida; verificar en el SPIJ.

### 8.5 Instrucciones al modelo (SYSTEM_PROMPT)
- Responder con legislación peruana; usar como fuente **solo** el bloque de normas para citar artículos.
- Si la norma necesaria no está en el bloque, decirlo y sugerir verificarla en el SPIJ; no completarla de memoria.
- No citar derecho extranjero salvo que el abogado lo pida, y en ese caso indicarlo de forma expresa.
- Mencionar la fecha de corte cuando la respuesta dependa de una norma.
- Se mantiene la regla vigente sobre plazos (indicar siempre que deben verificarse).

### 8.6 Interfaz
- Encabezado del agente: "Normas al 15/10/2026 · 11 normas", en ámbar si está atrasada.
- Ajustes → **Biblioteca legal**: normas incluidas, fecha de cada una, "Buscar actualización", "Ver cambios recientes".
- Diálogo **Ver artículo**: texto vigente, ubicación, historial de modificaciones, "por regir" y enlace a la fuente oficial.
- *(F2)* **Alerta por expediente**: "El art. 122-B CP cambió el 12/03/2026 y lo citas en 2 expedientes".

### 8.7 Privacidad, política y pruebas
- Nueva salida de red (GitHub Pages) → sección 9 de la política, nueva `APP.policyVersion` y entrada en
  `POLICY_CHANGES` (la re-aceptación T-201 se encarga de pedir la aceptación).
- Los textos de normas que se envían al modelo son públicos y no llevan datos personales; la consulta sigue
  seudonimizada y pasa por la revisión previa.
- Costo: unos 4 000 tokens más de entrada por consulta (≈ +50 % sobre el supuesto de `research.md`). Se informará en
  la guía de costos.

## 9. Plan por fases
| Fase | Entregable | Criterio de aceptación |
|---|---|---|
| **F0 · Validación** (antes de codificar) | Confirmar el art. 9 del D. Leg. 822 y las condiciones de uso del SPIJ y El Peruano; lista final de normas con 3 a 5 abogados; elegir el formato de las fuentes | Reutilización permitida documentada en `legal-privacy.md`; lista aprobada |
| **F1 · Biblioteca v1** (v0.4.0) | `normas/` con script de armado desde los textos del SPIJ; paquete en GitHub Pages; descarga, búsqueda local, bloque de normas, verificador de citas, fecha de corte, avisos de atraso | Prueba e2e en verde; 40 preguntas de prueba con mejora medible (§10) |
| **F2 · Actualización continua** | Vigía diario en GitHub Actions + PR con el cambio propuesto; actualización incremental en Folio; alertas por expediente; "Ver cambios recientes" | Una modificación real de un código llega a Folio en ≤ 3 días hábiles tras su publicación |
| **F3 · Profundidad** | Jurisprudencia vinculante, biblioteca personal (el abogado importa reglamentos u ordenanzas), uso de herramientas (tool calling) | Por definir |

## 10. Pruebas y métricas
- **e2e** con paquete simulado: descarga y verificación `sha256`, búsqueda por cita explícita, bloque de normas en el
  envío, fichas del verificador (vigente, no encontrado, extranjera, cita textual distinta), avisos a 14 y 30 días,
  funcionamiento sin internet y ninguna solicitud con datos de expediente hacia GitHub.
- **Calidad** (se integra a la prueba ciega T-206): 40 preguntas reales anonimizadas, 20 de ellas sobre artículos
  modificados en 2025–2026. Se compara con y sin biblioteca en 3 modelos.
  - Meta: ≥ 90 % de respuestas que citan el texto vigente (hoy se espera mucho menos para cambios recientes).
  - 0 normas extranjeras sin señalar; 0 citas ✗ sin ficha de advertencia.

## 11. Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Error al consolidar un artículo | Revisión humana obligatoria, contraste con el SPIJ, historial por artículo, reporte "este texto está mal" desde Folio (abre un issue) |
| El proyecto deja de actualizarse | Fecha de corte visible y avisos a 14 y 30 días; formato abierto para que otros mantengan el paquete |
| Condiciones de uso del SPIJ o El Peruano impiden la extracción automática | F0 lo resuelve antes de codificar; la alternativa es el armado manual desde las descargas en Word |
| El proxy corporativo bloquea GitHub Pages | Falla en silencio y queda la última biblioteca; importación manual del paquete desde un archivo |
| Más costo por consulta | Límite de 8 artículos; la búsqueda asistida se puede desactivar |
| Falsa sensación de seguridad | Las fichas muestran "verificar en la fuente oficial"; los términos de uso lo explican |
| Incompatibilidades del cargo en el PJ (bloqueante vigente) | Sin cambios: sigue siendo gratuito y de código abierto; incluirlo en la consulta escrita pendiente |

## 12. Preguntas abiertas (para aprobar el spec)
1. ✅ **Normas de v1** (aprobada): ¿la lista de §5 cubre a los abogados que probarán Folio? ¿Qué agregarías o quitarías?
2. **Mantenimiento:** ¿cuánto tiempo semanal puede dedicar el mantenedor a revisar y aprobar cambios? Si es poco, conviene
   empezar con menos normas.
3. ✅ **Descarga** (recomendada, aprobado): ¿recomendada en la bienvenida, con opción de no hacerlo (propuesta), o siempre obligatoria?
4. ✅ **Búsqueda asistida** (activada, aprobado): ¿activada por defecto aunque cueste una llamada corta extra por consulta (propuesta)?

## 13. Resultados de F0 (2026-10-01)
- **Derechos:** confirmado con el texto oficial del D. Leg. 822 (gob.pe): art. 9 b) excluye de protección "los textos
  oficiales de carácter legislativo, administrativo o judicial … sin perjuicio de la obligación de respetar los textos y
  citar la fuente"; art. 9 d) excluye "los simples hechos o datos". Se publican el texto y los datos de modificación;
  nunca concordancias ni sumillas.
- **SPIJ:** no publica condiciones de uso ni `robots.txt`. Decisión: **sin extracción automática**; el mantenedor descarga
  cada norma en Word ("Descargar Word") y la guarda en `normas/fuentes/`.
- **El Peruano:** `diariooficial.elperuano.pe/robots.txt` prohíbe `/Normas` y `/NormasElperuano`; `busquedas.elperuano.pe`
  permite todo y publica `sitemap-normas_legales.xml` actualizado a diario → fuente del vigía de F2.
- **Lista de normas:** aprobada sin cambios.
- **Pendiente:** tiempo semanal del mantenedor (§12.2), para fijar el ritmo real de F2.

## 14. Revisión asistida del primer paquete (2026-10-02/03)
- Fuente única de verdad: el texto oficial del SPIJ (normas/fuentes). Foros, redes y recopilaciones privadas **no** se usan
  como fuente (circulan versiones viejas); LP Derecho tiene protección anti-robots y no se consulta de forma automática.
- Método: cada cambio parcial se aplica sobre la línea que el SPIJ marca con (*) o (n); el conversor registra cómo aplicó
  cada nota y genera `normas/reporte-verificacion.md`. Lo que no cuadra se revisa a mano contra el SPIJ:
  correcto → `normas/revision/<ID>.json`; incorrecto → `normas/ajustes/<ID>.json` armado con líneas copiadas del SPIJ.
- Resultado (7 normas, 4 588 entradas): 510 artículos con cambios parciales → 494 aplicados sobre la marca, 14 verificados a
  mano, 2 corregidos con texto oficial (Const. art. 2 inc. 5; CP art. 121), 0 pendientes. Controles globales sin hallazgos reales.
- Errores del conversor encontrados y corregidos durante la revisión (no estaban en el reporte inicial): texto perdido tras
  etiquetas "JURISPRUDENCIA…/PROCESOS CONSTITUCIONALES" y tras notas informativas; 11 artículos del CPP escondidos dentro de
  otros; versiones viejas cuando el SPIJ repite el encabezado sin comillas (p. ej., CP 152, 173; CPC 35, 425; CC 361); notas de
  estilo antiguo "(1)(2)"; artículos reubicados por la Ley 31146 (153 → 129-A…) y el 129-Ñ; capítulos derogados completos.
- Pendiente: visto bueno del mantenedor para publicar (regla: ningún paquete sin revisión humana).
