# Spec — E11: nuevo expediente desde una resolución

> Estado: **borrador, pendiente de aprobación del usuario** · Épica E11 · Decisiones propuestas D-48 a D-51
> Origen: idea del usuario (2026-10-21) tras revisar Harvey (Vault, tablas de revisión). Folio no copia su nube: todo se lee en el equipo.

## 1. Problema
- "Nuevo expediente" abre un formulario de 9 campos (número, materia, especialidad, distrito, órgano, estado, cliente, rol…) que el abogado llena a mano, aunque **ya tiene esos datos en un PDF**: la resolución o cédula que le llegó a su casilla, o la carátula.
- Las demás partes (contraparte, imputado, agraviado) se agregan después en la memoria. Mientras no estén registradas, **la seudonimización no las reemplaza**: el riesgo es mayor justo al empezar.
- Registrar un caso que ya se lleva cuesta tiempo y es la primera impresión de Folio.

## 2. Objetivo
Crear un expediente arrastrando una resolución, cédula o carátula: Folio lee el encabezado **en el equipo, sin IA**, llena el formulario, registra las partes con su rol y guarda el PDF como primer documento. El abogado revisa, corrige y marca a su cliente. Meta: un expediente listo en menos de 1 minuto, sin escribir.

## 3. Qué trae el encabezado (formato del Poder Judicial del Perú)
Las resoluciones, cédulas y carátulas impresas desde los sistemas del PJ repiten un bloque `ETIQUETA : valor`:

| Etiqueta (variantes) | Campo de Folio |
|---|---|
| EXPEDIENTE, EXP., N.° EXPEDIENTE | `numero` (formato `NNNNN-AAAA-N-NNNN-XX-XX-NN`) |
| MATERIA, DELITO | `materia` |
| JUEZ, JUEZA, JUEZ(A) | nueva: `juez` |
| ESPECIALISTA, ESPECIALISTA LEGAL, SECRETARIO(A) | nueva: `especialista` |
| DEMANDANTE, DEMANDADO, IMPUTADO, ACUSADO, AGRAVIADO, DENUNCIANTE, DENUNCIADO, TERCERO, MINISTERIO PÚBLICO | partes con su rol |
| Nombre del juzgado (primeras líneas: "2.° JUZGADO DE FAMILIA…", "JUZGADO DE PAZ LETRADO…") | `organo` |
| CORTE SUPERIOR DE JUSTICIA DE … | `distrito` |
| Código del número (`…-JP-FC-…`, `…-JR-PE-…`) | `especialidad` (FC/FA → Familia, PE → Penal, CI → Civil, LA → Laboral…) |
| "RESOLUCIÓN NÚMERO …", fecha | primer movimiento: fecha + acto (sumilla vacía para que la complete el abogado o el agente) |

Varias partes por rol se separan por `;`, saltos de línea o "y". Los nombres pueden venir en mayúsculas: se muestran con capitalización de nombre propio y el abogado puede corregir.

## 4. Flujo
1. "Nuevo expediente" ofrece arriba una zona: **"Arrastra una resolución, cédula o carátula (PDF, Word o texto) para llenar los datos"** · "o llénalo a mano" (el formulario actual queda debajo, sin cambios).
2. Folio extrae el texto en el equipo (pdf.js / mammoth, como hoy) y lee el encabezado con reglas.
3. El formulario aparece **lleno**, con lo detectado resaltado y un resumen: "Folio encontró: número, materia, juzgado, juez, especialista y 3 partes · revisa antes de crear".
4. **Partes detectadas** en una lista con su rol, editable (nombre, rol, documento si aparece), con "Mi cliente" (una o varias) y ✕ para quitar. Se agregan todas a la vez al crear: desde la primera consulta se seudonimizan.
5. Si no detecta algo, ese campo queda vacío con la nota "no aparece en el documento". Si el PDF no tiene texto (escaneo): "Este PDF parece una imagen escaneada: Folio no puede leerlo. Llena los datos a mano".
6. Al crear: el PDF se guarda como primer documento y la resolución como primer movimiento (si se detectó número y fecha). Se abre el Inicio del expediente.
7. **Opcional, solo con proveedor conectado y después de crear:** "¿Quieres que el agente resuma lo que ordena esta resolución?" → consulta normal (ya seudonimizada, con vista previa) cuyas propuestas (estado procesal, plazo por confirmar, pendientes) van a la caja "Cambios propuestos" de la Ficha. Ningún plazo se guarda sin confirmación.

También desde un expediente abierto: al agregar una resolución en Documentos, si su número coincide, Folio ofrece "Agregar las partes y datos nuevos que encontré" (mismo resumen, nada se aplica sin clic).

## 5. Privacidad (D-48)
- La lectura del encabezado es **100 % local, con reglas, sin IA y sin red**. Funciona sin proveedor conectado.
- Ningún nombre sale del equipo para crear el expediente. Las partes quedan registradas **antes** de la primera consulta, así que la seudonimización ya las cubre.
- El resumen opcional (paso 7) es una consulta normal: seudonimizada, con vista previa y anotada en el Registro de envíos. **Sin nuevas salidas de red → la política no cambia.**
- Folio no se conecta al CEJ, a SINOE ni a la casilla: el abogado arrastra un archivo que ya tiene (regla NUNCA de AGENTS.md).

## 6. Datos (IndexedDB, todo cifrado)
```js
exp.juez = ''            // nuevo, opcional
exp.especialista = ''    // nuevo, opcional (secretario/especialista legal)
exp.origen = { docId, tipo: 'resolucion'|'cedula'|'caratula'|'otro', detectado: ['numero','materia',…] }   // de dónde salieron los datos
// partes: igual que hoy (addParte), con el rol detectado
```
- `juez` y `especialista` se muestran en la Ficha (bloque "Juzgado") y entran en `memoryText()`. Son funcionarios públicos: **no se seudonimizan** por defecto (D-49); el abogado puede agregarlos como parte si lo prefiere.
- Migración: no hace falta (campos opcionales).

## 7. Calibración y pruebas
- Necesitamos **5–10 encabezados reales con los datos cambiados** (alimentos, penal, civil, laboral; resolución, cédula y carátula) para fijar las reglas. Se guardan en `tests/fixtures/resoluciones/` solo con datos ficticios.
- e2e: arrastrar cada fixture → campos y partes esperados; PDF escaneado → aviso; sin proveedor → funciona; ninguna solicitud de red al crear; las partes se seudonimizan en la primera consulta.
- Métrica de calidad: ≥ 90 % de campos correctos en los fixtures; lo dudoso se deja vacío antes que mal llenado (D-50).

## 8. Fuera de alcance
- OCR de escaneos (Tesseract pesa ~10 MB y es lento en el navegador; se evalúa aparte).
- Leer el CEJ, SINOE o la casilla electrónica, o descargar resoluciones automáticamente.
- Tablas de revisión de varios documentos (idea de Harvey): queda como E12 posible.

## 9. Fases
| Fase | Contenido |
|---|---|
| F0 | Aprobación de esta spec + fixtures con datos cambiados |
| F1 | Lector de encabezado (`leerEncabezado(texto)` en core.js) con pruebas sobre los fixtures |
| F2 | Zona de arrastre en "Nuevo expediente", formulario lleno y lista de partes editable; `juez`/`especialista` en la Ficha |
| F3 | PDF como primer documento y primer movimiento; "agregar datos nuevos" desde Documentos |
| F4 | Resumen opcional con el agente → caja de cambios propuestos; e2e, capturas → Release v0.7.0 |

## 10. Preguntas abiertas
1. ¿`juez` y `especialista` se seudonimizan o no? (propuesta D-49: no, son funcionarios públicos en ejercicio).
2. ¿Ofrecemos el resumen con el agente (paso 7) por defecto o solo si el abogado lo pide?
3. ¿La zona de arrastre también en la pantalla vacía ("Crea tu primer expediente")? Propuesta: sí, es la primera impresión (D-51).
4. Diseño: la v0.6 se hizo tal cual un prototipo (D-42). ¿Hacemos un prototipo HTML de esta pantalla antes de F2?
