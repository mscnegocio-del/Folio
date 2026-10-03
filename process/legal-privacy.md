# Marco legal y privacidad — Folio
> Lectura técnica, no asesoría legal. Validar con un especialista en datos personales antes de difundir.

## Normas
- Ley N.° 29733, Ley de Protección de Datos Personales.
- Reglamento: D.S. N.° 016-2024-JUS.
- Autoridad: Autoridad Nacional de Protección de Datos Personales (MINJUSDH).

## Roles
- **Responsable:** decide finalidad y medios del tratamiento (tenga o no banco de datos formal). En Folio → **el abogado**.
- **Encargado:** trata datos por cuenta del responsable. Folio **no** lo es mientras el autor nunca reciba, guarde ni vea contenido.
- La única excepción de aplicación de la ley para privados es el uso doméstico o personal: no se puede hacer que "no aplique".

## Qué expondría al autor (y cómo lo evita Folio)
| Riesgo | Efecto | Estado en Folio |
|---|---|---|
| Cuentas propias (correo, pagos) | Autor = responsable (multas 0.5–100 UIT; UIT 2026 = S/5,500) | Sin cuentas |
| Telemetría o reportes de error con contenido | Autor = encargado | Sin telemetría |
| Plan pagado con proxy | Encargado: contrato de encargo, aviso de brechas en 48 h | Descartado (D-16) |
| Sincronización por servidor | Encargado | No existe (T-213 exigiría cifrado extremo a extremo) |
| Keys por cliente en cuenta del autor (sin proxy) | Menor exposición, pero sigue en la cadena | No aplica en la versión gratuita |

## Biblioteca legal (E8)
- D. Leg. 822, art. 9 b) y d): los textos oficiales de normas y los simples datos no son objeto de derecho de autor; hay
  que respetar el texto y citar la fuente. Folio no copia concordancias ni sumillas del SPIJ.
- SPIJ sin condiciones de uso publicadas → descarga manual, sin extracción automática. El Peruano: solo `busquedas.elperuano.pe` (robots lo permite).
- Términos de uso §7: la biblioteca no es edición oficial; se verifica en la fuente oficial.

## Flujo transfronterizo y datos sensibles
- Enviar fragmentos a OpenAI/Anthropic/OpenRouter (EE.UU. u otros) es flujo transfronterizo; con BYOK lo realiza el abogado, y Folio debe informarlo (paso 3 de la bienvenida + política §4).
- Expedientes de familia/violencia contienen datos sensibles (vida afectiva o familiar, salud, menores).
- Folio incluye un **modelo de autorización escrita del cliente**, con casilla separada para datos sensibles.
- Por API, Anthropic y OpenAI no entrenan con los datos y los borran a los 30 días por defecto (salvo ZDR, cumplimiento u obligación legal). Esto no aplica a ChatGPT/Claude.ai de consumo.
- DeepSeek API directa: almacena en China y puede entrenar → excluida (D-17).

## Medidas técnicas que respaldan los textos
- Cifrado local AES-GCM 256, clave PBKDF2-SHA-256 310 000 it., auto-bloqueo, sin recuperación.
- Seudonimización local por defecto; aviso explícito de que seudonimizar ≠ anonimizar (el reglamento considera identificable a quien puede reconocerse combinando datos).
- Revisión previa del texto exacto que sale; solo se envían fragmentos relevantes.
- Registro de envíos local (responsabilidad proactiva) exportable a CSV.
- Consentimientos separados y no premarcados; aceptación guardada con versión y fecha.
- Salidas de red declaradas: Google Fonts (siempre) y jsDelivr/cdnjs (al importar PDF/DOCX) exponen IP, no contenido.

## Textos incluidos (src/legal.js) — BORRADORES
- Política de privacidad (12 secciones): titular, resumen, rol del abogado, proveedores de IA y flujo transfronterizo, seudonimización y límites, datos sensibles, seguridad, conservación, datos que trata el desarrollador (ninguno), derechos de titulares, uso profesional, cambios.
- Términos de uso (11 secciones): qué es, software libre AGPL-3.0 "tal cual", resultados de IA, obligaciones del usuario, proveedores, usos no permitidos (incluye acceso no autorizado a portales del PJ), alcance, contenido, responsabilidad (salvo dolo o culpa inexcusable), ley aplicable, contacto.
- Autorización para clientes (copiable y descargable .txt).

## Cargo del autor en el Poder Judicial
- Revisar incompatibilidades (Código de Ética de la Función Pública y normativa interna del PJ) **por escrito** antes de difundir y, sobre todo, antes de cobrar cualquier servicio a abogados.
- Folio no toca el SIJ ni accesos internos; no usa información obtenida por el cargo.
- Usar cuenta de GitHub y correo personales, nunca institucionales.

## Incompatibilidad del cargo del autor (análisis 2026-10-03, no es asesoría legal)
- **Ley 30745** (Carrera del Trabajador Judicial, art. VIII): dedicación exclusiva, salvo docencia universitaria. Aplica a jurisdiccionales y administrativos. No dice "fuera de horario": cualquier trabajo remunerado habitual es riesgoso sin autorización.
- **Ley 27588** (incompatibilidades del empleo público): actividad privada solo sin conflicto de interés ni uso de información del cargo.
- **Ley 27815** (Código de Ética): prohibido usar cargo, tiempo, equipos o información del Estado en beneficio propio.
- **LOPJ**: prohíbe el patrocinio legal a trabajadores judiciales.
- Casos sancionados: ODANC Ica (suspensión 6 meses por presunto patrocinio ilegal); OCMA, ODECMA Lima Norte (escritos de terceros hechos con equipos del Estado, falta muy grave). Patrón: actividad ligada a lo judicial + recursos del PJ.
- **Conclusión para Folio:** ser conocido como autor de un software gratuito y de código abierto no es, por sí solo, incompatible (equivale a publicar). Riesgos: (1) sugerir respaldo del PJ; (2) desarrollarlo en horario o con red/equipos del PJ; (3) soporte personalizado o trato preferente a estudios; (4) cobrar servicios a partir de la reputación. El medio de pago (Yape, transferencia) no cambia la incompatibilidad y agrega riesgo tributario si no hay recibo por honorarios.
- Pendiente: consulta escrita (T-108). Noticia nov. 2025: ley que pasa a los trabajadores del PJ al régimen privado; verificar su efecto en la dedicación exclusiva.
- Fuentes: lpderecho.pe/ley-30745-ley-carrera-trabajador-judicial · busquedas.elperuano.pe/dispositivo/NL/1673543-3 · diariocorreo.pe (ODANC Ica) · anc.pj.gob.pe/prensa/DetalleNoticia/7371 · infobae.com/peru/2025/11/22
