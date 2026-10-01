/* ============================================================
   Textos legales · BORRADORES para validar con un especialista
   Reemplaza los campos entre corchetes antes de distribuir.
   ============================================================ */
const DRAFT_BANNER = `<div class="draft-banner"><strong>Borrador para revisión.</strong> Este texto debe validarlo un abogado especialista en protección de datos antes de publicar Folio. Completa los datos del autor en <code>config.js</code>.</div>`;

function policyHTML() {
  return `${DRAFT_BANNER}<div class="legal">
<p class="muted small">Versión ${esc(APP.policyVersion)}. Aplica a Folio ${esc(APP.version)}, versión de prueba que funciona en tu navegador.</p>
<h3>1. Quién ofrece Folio</h3>
<p>Folio es software libre y gratuito desarrollado por ${esc(OWNER.name)} (en adelante, “el desarrollador”), contacto: ${esc(OWNER.email)}. Su código fuente es público en ${esc(OWNER.repo)}, bajo licencia AGPL-3.0.</p>
<h3>2. En resumen</h3>
<p>Folio funciona en tu equipo y es gratuito. Tus expedientes, documentos, memoria del caso, conversaciones con el agente y tu API key se guardan cifrados solo en el almacenamiento local de tu navegador. En esta versión no existen servidores de Folio que reciban esa información: el desarrollador no la ve, no la guarda y no la analiza.</p>
<h3>3. Tu rol frente a los datos de tus clientes</h3>
<p>Al registrar expedientes en Folio, tú (abogado o estudio) decides qué datos personales se tratan y con qué finalidad. Por eso eres el responsable de ese tratamiento conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su Reglamento aprobado por Decreto Supremo N.° 016-2024-JUS. Folio es una herramienta de software bajo tu control; en esta versión no accede a esos datos.</p>
<h3>4. Envío a proveedores de inteligencia artificial</h3>
<p>Cuando usas el agente, la aplicación envía directamente desde tu equipo al proveedor que configuraste (por ejemplo, OpenAI, Anthropic u OpenRouter) los fragmentos del expediente necesarios para responder. Ese envío:</p>
<ul>
<li>se hace con tu propia cuenta y API key, bajo los términos y la política de privacidad del proveedor, que aceptas directamente con él;</li>
<li>constituye un flujo transfronterizo de datos personales, porque esos proveedores procesan la información en servidores ubicados fuera del Perú;</li>
<li>queda anotado solo en tu equipo, en el Registro de envíos de Ajustes (fecha, proveedor, modelo, tamaño y si se aplicó seudonimización).</li>
</ul>
<p>Se recomienda usar la API del proveedor y no sus aplicaciones de consumo, mantener activa la seudonimización y, si usas OpenRouter, exigir proveedores sin retención de datos. Folio no ofrece conexión directa con la API propia de DeepSeek porque, según su política de privacidad, almacena los datos en China; ese modelo puede usarse a través de OpenRouter con proveedores sin retención. Si usas un servidor propio instalado en tu oficina, la información no sale de tu red.</p>
<h3>5. Seudonimización y sus límites</h3>
<p>Si la activas, antes de cada envío Folio reemplaza en tu equipo los nombres y documentos de las partes que registraste, así como los DNI, RUC, teléfonos, correos y direcciones que detecta, por marcadores como [PERSONA_1]. Al recibir la respuesta, restaura los datos reales solo en tu pantalla. La seudonimización reduce el riesgo, pero no equivale a anonimizar: hechos muy específicos o datos no detectados pueden permitir identificar a una persona. Puedes revisar exactamente qué se envía antes de cada consulta.</p>
<h3>6. Datos sensibles</h3>
<p>Los expedientes pueden contener datos sensibles, como información de salud, de la vida familiar o afectiva, de hechos de violencia o de niñas, niños y adolescentes. Registra y envía solo lo indispensable para tu finalidad profesional y verifica que cuentas con la base legal o la autorización que corresponda.</p>
<h3>7. Seguridad</h3>
<p>Tus datos se cifran con AES-GCM de 256 bits. La clave se deriva de tu contraseña con PBKDF2-SHA-256 (${ITER.toLocaleString('es-PE')} iteraciones) y solo existe en la memoria de la aplicación mientras está desbloqueada. Folio se bloquea automáticamente tras el periodo de inactividad que elijas. Folio no almacena tu contraseña y nadie puede recuperarla. Las copias de seguridad que exportes están cifradas con tu contraseña y quedan bajo tu custodia.</p>
<h3>8. Conservación y eliminación</h3>
<p>Tú decides cuánto tiempo conservar cada expediente. Puedes eliminar un expediente o todos los datos desde Ajustes. Si borras los datos de navegación de tu navegador, la información de Folio también se elimina.</p>
<h3>9. Datos que trata el desarrollador</h3>
<p>Ninguno. Folio no crea cuentas, no usa cookies de seguimiento y no envía telemetría; como el código es público, cualquiera puede verificarlo. Al abrirse, la aplicación no se conecta a ningún servicio: las tipografías vienen incluidas en el archivo. Solo cuando importas un PDF o un Word descarga librerías de lectura desde jsDelivr o cdnjs. Esas solicitudes no incluyen contenido de tus expedientes, pero exponen tu dirección IP a esos servicios.</p>
<h3>10. Derechos de los titulares de los datos</h3>
<p>Como el desarrollador no accede a los datos de tus expedientes, las solicitudes de tus clientes o de terceros sobre sus datos deben dirigirse a ti como responsable. Folio te permite editar o eliminar cualquier dato para atenderlas. Los titulares también pueden acudir a la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos.</p>
<h3>11. Uso profesional</h3>
<p>Folio está dirigido a abogados y estudios jurídicos. No está destinado a menores de edad.</p>
<h3>12. Cambios</h3>
<p>Cualquier cambio en esta política se publicará con su fecha de versión y Folio pedirá una nueva aceptación cuando el cambio sea relevante.</p>
</div>`;
}

function termsHTML() {
  return `${DRAFT_BANNER}<div class="legal">
<p class="muted small">Versión ${esc(APP.policyVersion)}.</p>
<h3>1. Qué es Folio</h3>
<p>Folio es una herramienta de apoyo para organizar expedientes y consultar a un modelo de inteligencia artificial elegido por el usuario. No es un servicio de asesoría legal y no reemplaza el criterio profesional del abogado.</p>
<h3>2. Software libre y gratuito</h3>
<p>Folio se distribuye gratis bajo licencia AGPL-3.0, cuyo texto completo está en ${esc(OWNER.repo)}. Se ofrece en fase de prueba y “tal cual”. Puede contener errores y cambiar sin aviso. El desarrollador no garantiza su disponibilidad continua ni resultados específicos, en la medida permitida por la ley.</p>
<h3>3. Resultados de la inteligencia artificial</h3>
<p>Las respuestas del agente pueden contener errores, omisiones o información inventada, incluidas normas, jurisprudencia y plazos. Debes verificar todo antes de usarlo en un escrito, una audiencia o una decisión. Folio no calcula plazos procesales de forma automática: los plazos que registras son tu responsabilidad.</p>
<h3>4. Tus obligaciones</h3>
<ul>
<li>Cumplir la Ley N.° 29733 y su Reglamento respecto de los datos de tus clientes y de terceros.</li>
<li>Respetar el secreto profesional y las normas éticas de la abogacía.</li>
<li>Contar con la autorización de tus clientes cuando envíes sus datos a un proveedor de IA ubicado fuera del Perú, si corresponde.</li>
<li>Custodiar tu contraseña y tus copias de seguridad.</li>
</ul>
<h3>5. Proveedores de IA</h3>
<p>Tu relación con el proveedor de IA es directa: los costos, límites, disponibilidad y tratamiento de datos se rigen por sus propias condiciones. El desarrollador no controla ni responde por sus servicios.</p>
<h3>6. Usos no permitidos</h3>
<p>No puedes usar Folio para fines ilícitos, para tratar datos obtenidos ilícitamente ni para intentar acceder sin autorización a sistemas de terceros, incluidos los portales del Poder Judicial, del Ministerio Público u otras entidades.</p>
<h3>7. Alcance de esta versión</h3>
<p>Esta versión no se conecta al CEJ, al SINOE ni a otros portales, no sincroniza entre equipos y no lee documentos escaneados como imagen.</p>
<h3>8. Tu contenido</h3>
<p>El contenido que registras es tuyo. El desarrollador no obtiene ningún derecho sobre él.</p>
<h3>9. Responsabilidad</h3>
<p>En la medida permitida por la legislación peruana, el desarrollador no responde por daños derivados del uso de Folio o de las respuestas del agente, salvo dolo o culpa inexcusable.</p>
<h3>10. Ley aplicable</h3>
<p>Estos términos se rigen por las leyes de la República del Perú. Cualquier controversia se someterá a los jueces de ${esc(OWNER.city)}.</p>
<h3>11. Contacto</h3>
<p>${esc(OWNER.email)}</p>
</div>`;
}

function clauseText() {
  return `AUTORIZACIÓN PARA EL USO DE HERRAMIENTAS DE INTELIGENCIA ARTIFICIAL

Yo, [NOMBRE COMPLETO DEL CLIENTE], identificado(a) con DNI N.° [__________], autorizo a [NOMBRE DEL ABOGADO O ESTUDIO], con domicilio en [DOMICILIO], en su calidad de responsable del tratamiento de mis datos personales conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su Reglamento aprobado por Decreto Supremo N.° 016-2024-JUS, a tratar la información de mi caso mediante herramientas de software instaladas en sus equipos, incluido el servicio de inteligencia artificial de [NOMBRE DEL PROVEEDOR], con la finalidad exclusiva de analizar, organizar y preparar documentos para la defensa de mis intereses en el proceso [N.° DE EXPEDIENTE / DESCRIPCIÓN].

Declaro que se me ha informado que:
1. Los servidores de dicho proveedor se ubican fuera del Perú, por lo que el envío de información constituye un flujo transfronterizo de datos personales.
2. Antes de cada envío se reemplazarán los nombres, documentos de identidad y datos de contacto por marcadores, aunque esta medida no garantiza el anonimato absoluto.
3. Solo se enviará la información indispensable para la finalidad indicada.
4. Mi abogado revisará todo contenido generado antes de usarlo.
5. Puedo revocar esta autorización en cualquier momento y ejercer mis derechos de acceso, rectificación, cancelación y oposición escribiendo a [CORREO DEL ABOGADO O ESTUDIO].

[  ] Autorizo además el tratamiento de mis datos sensibles (por ejemplo, de salud, de mi vida familiar o de mis hijos menores de edad) para la misma finalidad.

Lugar y fecha: [__________]

_____________________________
Firma del cliente
Nombre: [__________]
DNI: [__________]`;
}
function clauseHTML() {
  return `${DRAFT_BANNER}<p class="small muted">Úsala para pedir a tu cliente una autorización escrita y separada antes de enviar datos de su caso a un proveedor de IA. Adáptala a cada caso.</p><pre class="payload" id="clause-text">${esc(clauseText())}</pre>`;
}
