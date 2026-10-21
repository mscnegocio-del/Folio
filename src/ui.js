/* ============================================================
   Folio MVP · interfaz
   ============================================================ */
const S = {
  screen: 'boot', bootError: '', onb: null, settings: null, draftCfg: null, index: [], exp: null, docTexts: {},
  sending: false, abort: null, audit: [], lastSend: null,
  stampPress: false, lastActive: Date.now(), filter: '', consent: null, updateHidden: false,
  quick: [], movsAll: false,
  visitaPrevia: null,   // fecha de la visita anterior al expediente abierto ("Desde tu última visita")
  // v0.6 · tres zonas: vista central, ficha (abierta/cerrada, pestaña y modo), barra y hoja en el celular, chips de la caja
  vista: 'inicio', vistaPrev: null, ficha: 'abierta', fichaTab: 'ficha', fichaModo: 'ficha', fuente: null, borrador: null,
  sideOpen: false, fichaMovil: false, ctx: { memoria: true, docs: true, biblioteca: true }, menu: null,
  prop: { exp: null, sel: {}, confirmar: null, nuevos: [] },   // F5: ✓/✕ de cada propuesta, plazo en confirmación y cambios recién aplicados (resaltados)
  ne: null, recienCreado: null,
  tablaId: null, nt: null, revision: null, fuenteDoc: null,   // E12: tabla abierta, ventana "Nueva tabla", revisión en curso y celda en la ficha   // E11: ventana "Nuevo expediente" y expediente recién creado desde un documento
  seguirAqui: {}   // F4: conversaciones en las que el abogado eligió "Seguir aquí" (nivel del aviso que ocultó; no se guarda)
};
const root = () => $('#root');
// Logo de Folio (imagen incluida en el HTML por build.py, variante clara u oscura según el tema) + insignia Beta
const BRAND = '<span class="brand-logo" role="img" aria-label="Folio"></span><span class="badge">Beta</span>';

/* ---------- Utilidades de interfaz ---------- */
function toast(msg, err = false) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), err ? 7000 : 3800);
}
function fail(e) { console.error(e); toast(e instanceof FolioError ? e.message : 'Ocurrió un error inesperado: ' + (e?.message || e), true); }
function applyTheme() { const t = S.settings?.theme || 'auto'; if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; }
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

let dlgPending = null;
function settleDlg(v) { const p = dlgPending; dlgPending = null; if (p) p.resolve(v); }
function openDialog({ title, body, foot = '', wide = false }) {
  settleDlg(false);
  const d = $('#dlg'); d.className = wide ? 'wide' : '';
  d.innerHTML = `<div class="dlg"><div class="dlg-head"><h2 id="dlg-title">${esc(title)}</h2><button class="btn ghost sm" data-action="dlg-close" aria-label="Cerrar">✕</button></div><div class="dlg-body">${body}</div>${foot ? `<div class="dlg-foot">${foot}</div>` : ''}</div>`;
  if (!d.open) d.showModal();
  return d;
}
function closeDialog() { settleDlg(false); const d = $('#dlg'); if (d.open) d.close(); }
function askDialog({ title, body, ok = 'Confirmar', cancel = 'Cancelar', danger = false, wide = false, collect }) {
  return new Promise(resolve => {
    openDialog({ title, body, wide, foot: `<button class="btn" data-dlg="no">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-dlg="yes">${esc(ok)}</button>` });
    dlgPending = { resolve, collect };
  });
}
function onDlgButton(b) {
  if (b.dataset.dlg !== 'yes') return closeDialog();
  const p = dlgPending; if (!p) return closeDialog();
  const d = $('#dlg'); const v = p.collect ? p.collect(d) : true;
  if (v === null) return;
  dlgPending = null; if (d.open) d.close(); p.resolve(v);
}
function showLegal(which) {
  if (which === 'policy') openDialog({ title: 'Política de privacidad', body: policyHTML(), wide: true, foot: `<button class="btn primary" data-action="dlg-close">Entendido</button>` });
  if (which === 'terms') openDialog({ title: 'Términos de uso', body: termsHTML(), wide: true, foot: `<button class="btn primary" data-action="dlg-close">Entendido</button>` });
  if (which === 'clause') openDialog({ title: 'Autorización de tu cliente para usar IA', body: clauseHTML(), wide: true, foot: `<button class="btn" data-action="clause-download">Descargar .txt</button><button class="btn primary" data-action="clause-copy">Copiar texto</button>` });
}

/* ---------- Router ---------- */
function render() {
  const r = root();
  if (S.screen === 'boot') r.innerHTML = `<div class="screen-center"><p class="muted">Abriendo Folio…</p></div>`;
  else if (S.screen === 'error') r.innerHTML = `<div class="screen-center"><div class="lock"><div class="brand" style="justify-content:center;margin-bottom:1rem">${BRAND}</div><div class="note danger"><p>${esc(S.bootError)}</p></div></div></div>`;
  else if (S.screen === 'onb') renderOnb();
  else if (S.screen === 'lock') renderLock();
  else if (S.screen === 'reconsent') renderReconsent();
  else if (S.screen === 'app') renderApp();
}

/* ============================================================
   Bienvenida y avisos (onboarding)
   ============================================================ */
const ONB_STEPS = ['Así funciona', 'Tus datos', 'Envío al extranjero', 'Tu contraseña', 'Tu proveedor de IA'];
function newOnb() { return { step: 0, checks: {}, pseudo: true, normas: true, pass: '', pass2: '', cfg: { ...DEFAULT_SETTINGS } }; }
function onbCanNext() {
  const o = S.onb, c = o.checks;
  if (o.step === 1) return !!(c.resp && c.verify && c.policy);
  if (o.step === 2) return !!c.transfer;
  if (o.step === 3) return o.pass.length >= 10 && o.pass === o.pass2 && !!c.norecovery;
  return true;
}
function checkHTML(key, html) { return `<label class="check"><input type="checkbox" data-onb-check="${key}" ${S.onb.checks[key] ? 'checked' : ''}><span>${html}</span></label>`; }
function passStrength(p) {
  if (!p) return ''; let s = 0; if (p.length >= 10) s++; if (p.length >= 14) s++; if (/[A-ZÁÉÍÓÚÑ]/.test(p) && /[a-záéíóúñ]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^\wÁÉÍÓÚÑáéíóúñ]/.test(p)) s++;
  if (p.length < 10) return `<span style="color:var(--danger)">Muy corta: usa al menos 10 caracteres.</span>`;
  return s <= 2 ? `<span style="color:var(--warn)">Aceptable. Una frase larga es más segura.</span>` : `<span style="color:var(--ok)">Fuerte.</span>`;
}
function onbBody() {
  const o = S.onb;
  if (o.step === 0) return `
    <h1>Tu asistente para litigar, sin sacar tus expedientes de tu equipo</h1>
    <p class="lead">Folio guarda cada expediente con su propia memoria: partes, plazos, movimientos, documentos y estrategia. El agente de IA lee esa memoria para ayudarte a revisar el caso, ordenar pendientes y preparar borradores.</p>
    <div class="flow" aria-label="Cómo viaja la información">
      <div class="node you"><h3 role="heading" aria-level="2">Tu equipo</h3><ul><li>Expedientes y memoria del caso</li><li>Documentos y conversaciones</li><li>Tu API key</li></ul><p class="small muted" style="margin:.5em 0 0">Todo cifrado con tu contraseña.</p></div>
      <div class="arrow"><svg viewBox="0 0 64 20" aria-hidden="true"><path d="M2 10h56m-8-7 8 7-8 7" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Solo los fragmentos que la consulta necesita, con los nombres reemplazados</span></div>
      <div class="node"><h3 role="heading" aria-level="2">Tu proveedor de IA</h3><ul><li>OpenAI, Anthropic u OpenRouter, con tu propia cuenta</li><li>O un servidor propio en tu oficina</li></ul></div>
      <div class="none"><span aria-hidden="true">⊘</span><span><s>Servidores de Folio</s>: no existen en esta versión. Nunca vemos tus expedientes.</span></div>
    </div>
    <div class="note"><p>Esta es una versión de prueba. Funciona en este navegador, sin cuenta y sin conectarse al CEJ ni al SINOE.</p></div>`;
  if (o.step === 1) return `
    <h1>Tus datos y tu responsabilidad</h1>
    <p class="lead">Los expedientes contienen datos personales de tus clientes y de terceros. Al registrarlos en Folio, tú decides qué se guarda y para qué: eres el responsable de ese tratamiento según la Ley 29733 y su reglamento (D.S. 016-2024-JUS).</p>
    <p>Folio no recibe, no ve y no almacena tus expedientes. Todo queda cifrado en este equipo con una contraseña que solo tú conoces.</p>
    ${checkHTML('resp', 'Entiendo que soy responsable del tratamiento de los datos personales que registre en Folio y del secreto profesional que les corresponde.')}
    ${checkHTML('verify', 'Entiendo que el agente de IA puede equivocarse. Revisaré toda cita, plazo, norma o jurisprudencia antes de usarla en un escrito o decisión.')}
    ${checkHTML('policy', 'Leí la <a href="#" data-action="show-policy">política de privacidad</a> y los <a href="#" data-action="show-terms">términos de uso</a> de esta versión.')}`;
  if (o.step === 2) return `
    <h1>Envío de fragmentos fuera del Perú</h1>
    <p class="lead">Para responder, el agente envía desde tu equipo los fragmentos necesarios del expediente al proveedor de IA que elijas. Sus servidores están fuera del Perú, así que ese envío es un flujo transfronterizo de datos personales.</p>
    <div class="sheet"><label class="switch"><input type="checkbox" data-onb-pseudo ${o.pseudo ? 'checked' : ''}><span><strong>Reemplazar datos personales antes de enviar</strong><br><span class="small muted">Nombres y documentos de las partes, DNI, RUC, teléfonos, correos y direcciones se cambian por marcadores como [PERSONA_1]. El proveedor no ve los datos reales; Folio los restaura en tu pantalla.</span></span></label></div>
    <div class="note warn"><p>Reemplazar datos reduce el riesgo, pero no anonimiza: un hecho muy específico puede identificar a alguien. En casos de violencia familiar, menores de edad o salud, envía solo lo indispensable y revisa lo que sale en cada consulta.</p></div>
    ${checkHTML('transfer', 'Entiendo que, al usar el agente, fragmentos de mis expedientes se envían al proveedor que yo elija, y que debo contar con la autorización de mis clientes cuando corresponda. <a href="#" data-action="show-clause">Ver modelo de autorización para clientes</a>.')}`;
  if (o.step === 3) return `
    <h1>Crea la contraseña de tu bóveda</h1>
    <p class="lead">Con esta contraseña se cifran tus expedientes, documentos, conversaciones y tu API key. Folio no la guarda en ningún lugar.</p>
    <label class="field"><span>Contraseña</span><input class="input" type="password" data-onb-field="pass" value="${esc(o.pass)}" autocomplete="new-password" minlength="10"><small id="pass-strength">${passStrength(o.pass)}</small></label>
    <label class="field"><span>Repite la contraseña</span><input class="input" type="password" data-onb-field="pass2" value="${esc(o.pass2)}" autocomplete="new-password"><small id="pass-match"></small></label>
    <div class="note danger"><p>Si olvidas esta contraseña, nadie puede recuperar tus datos, tampoco nosotros. Si borras los datos de navegación de este navegador, la bóveda también se borra. Haz copias de seguridad desde Ajustes.</p></div>
    <div style="margin-top:1em">${checkHTML('norecovery', 'Entiendo que no hay forma de recuperar mi contraseña ni mis datos si la olvido.')}</div>`;
  return `
    <h1>Conecta tu proveedor de IA</h1>
    <p class="lead">Usas tu propia cuenta: pagas directo al proveedor y solo por lo que consumes. Puedes hacerlo ahora o después desde Ajustes.</p>
    <button type="button" class="btn" data-action="show-keyguide" style="margin-bottom:1rem">¿Es tu primera vez? Ver guía paso a paso</button>
    <div class="sheet" id="pf-block">${providerFieldsHTML(o.cfg)}</div>
    <label class="check"><input type="checkbox" data-onb-normas ${o.normas ? 'checked' : ''}><span><strong>Descargar la biblioteca legal peruana (recomendado)</strong><br><span class="small muted">Textos vigentes de la Constitución, los códigos y leyes principales, para que el agente cite normas peruanas actualizadas y Folio verifique sus citas. Menos de 1 MB desde el sitio público del proyecto; las búsquedas se hacen en tu equipo.</span></span></label>
    <div class="note"><p>Tu key se guarda cifrada en este equipo y solo se usa para llamar al proveedor directamente desde aquí.</p></div>`;
}
function renderOnb() {
  const o = S.onb; const last = o.step === ONB_STEPS.length - 1;
  root().innerHTML = `<div class="onb">
    <aside>
      <div class="brand">${BRAND}</div>
      <ol class="steps" aria-label="Pasos de configuración" tabindex="0">${ONB_STEPS.map((s, i) => `<li class="${i < o.step ? 'done' : i === o.step ? 'now' : ''}" ${i === o.step ? 'aria-current="step"' : ''}>${esc(s)}</li>`).join('')}</ol>
      <div class="legal-links"><a href="#" data-action="show-policy">Política de privacidad</a><a href="#" data-action="show-terms">Términos de uso</a><a href="#" data-action="show-clause">Autorización para clientes</a><span class="tiny muted">Versión ${esc(APP.version)}</span></div>
    </aside>
    <main><div class="content">${onbBody()}</div>
      <div class="nav">
        ${o.step > 0 ? `<button class="btn ghost" data-action="onb-back">Atrás</button>` : '<span></span>'}
        ${last ? `<div class="row"><button class="btn" data-action="onb-finish" data-skip="1">Configurar después</button><button class="btn primary" data-action="onb-finish">Terminar y abrir Folio</button></div>`
               : `<button class="btn primary" data-action="onb-next" ${onbCanNext() ? '' : 'disabled'}>Continuar</button>`}
      </div>
    </main></div>`;
  $('.onb main h1')?.setAttribute('tabindex', '-1'); $('.onb main h1')?.focus({ preventScroll: true });
}
function updateOnbNav() {
  const b = $('[data-action="onb-next"]'); if (b) b.disabled = !onbCanNext();
  if (S.onb.step === 3) {
    const ps = $('#pass-strength'); if (ps) ps.innerHTML = passStrength(S.onb.pass);
    const pm = $('#pass-match'); if (pm) pm.innerHTML = S.onb.pass2 ? (S.onb.pass === S.onb.pass2 ? '<span style="color:var(--ok)">Coinciden.</span>' : '<span style="color:var(--danger)">No coinciden.</span>') : '';
  }
}
async function finishOnb(skip) {
  const o = S.onb; const btns = $$('[data-action="onb-finish"]'); btns.forEach(b => b.disabled = true);
  try {
    await Vault.create(o.pass);
    const cfg = skip ? { provider: o.cfg.provider, baseUrl: '', apiKey: '', model: '' } : pickCfg(o.cfg);
    S.settings = { ...DEFAULT_SETTINGS, ...cfg, pseudo: o.pseudo };
    await store.put('settings', S.settings);
    await DB.put('consent', { policyVersion: APP.policyVersion, appVersion: APP.version, acceptedAt: new Date().toISOString(), items: { ...o.checks }, pseudoAtStart: o.pseudo });
    S.index = []; await store.put('index', []);
    S.audit = []; await store.put('audit', []);
    const wantNormas = o.normas; S.onb = null;
    await enterApp();
    if (wantNormas) installNormas(true);
  } catch (e) { btns.forEach(b => b.disabled = false); fail(e); }
}

/* ---------- Campos del proveedor (compartidos) ---------- */
const pickCfg = c => ({ provider: c.provider, baseUrl: c.baseUrl || '', apiKey: (c.apiKey || '').trim(), model: (c.model || '').trim(), zdr: !!c.zdr });
function curCfg() { return S.screen === 'onb' ? S.onb.cfg : S.draftCfg; }
function providerFieldsHTML(cfg) {
  const p = PROVIDERS[cfg.provider] || PROVIDERS.openrouter;
  const own = cfg.provider === 'custom';
  const opts = Object.entries(PROVIDERS).map(([k, v]) => `<option value="${k}" ${cfg.provider === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('');
  const presets = cfg.provider === 'openrouter' ? `<div class="presets" role="group" aria-label="Modelos sugeridos">${OR_RECOMMENDED.map(m => `<button type="button" class="preset ${cfg.model === m.id ? 'on' : ''}" data-action="pick-model" data-model="${esc(m.id)}"><strong>${esc(m.name)}</strong><span>${esc(m.tag)}</span></button>`).join('')}</div>` : '';
  return `<label class="field"><span>Proveedor</span><select class="select" data-pf="provider">${opts}</select><small>${esc(p.note)}</small></label>
  ${own ? `<label class="field"><span>Dirección del servidor</span><input class="input mono" data-pf="baseUrl" value="${esc(cfg.baseUrl)}" placeholder="http://192.168.1.50:11434/v1" spellcheck="false"><small>La indica quien instaló el servidor.</small></label>` : ''}
  <div class="field"><div class="row" style="justify-content:space-between"><label for="pf-key" style="font-weight:700;font-size:.875rem">API key${own ? ' (opcional)' : ''}</label>${own ? '' : '<button type="button" class="linklike" data-action="show-keyguide">¿Cómo obtengo mi key?</button>'}</div><div class="row" style="flex-wrap:nowrap"><input id="pf-key" class="input mono" type="password" data-pf="apiKey" value="${esc(cfg.apiKey)}" placeholder="${esc(p.keyHint)}" autocomplete="off" spellcheck="false"><button type="button" class="btn sm" data-action="toggle-key">Mostrar</button></div>${p.keyUrl ? `<small>Se crea en <a href="${p.keyUrl}" target="_blank" rel="noopener noreferrer">${esc(new URL(p.keyUrl).host)}</a>.</small>` : ''}</div>
  <div class="field"><label for="pf-model" style="font-weight:700;font-size:.875rem">Modelo</label>${presets}<div class="row" style="flex-wrap:nowrap"><input id="pf-model" class="input mono" data-pf="model" list="models-dl" value="${esc(cfg.model)}" placeholder="${cfg.provider === 'openrouter' ? 'Elige uno arriba o pulsa “Ver modelos”' : 'Pulsa “Ver modelos” para elegir'}" spellcheck="false"><button type="button" class="btn sm" data-action="list-models">Ver modelos</button></div><datalist id="models-dl"></datalist><small>${cfg.provider === 'openrouter' ? 'Los gratuitos no aparecen en la lista porque suelen usar tus consultas para entrenar.' : 'Para trabajo legal conviene un modelo grande.'}</small></div>
  ${cfg.provider === 'openrouter' ? `<label class="switch" style="margin-bottom:1rem"><input type="checkbox" data-pf="zdr" ${cfg.zdr ? 'checked' : ''}><span><strong>Solo proveedores sin retención de datos</strong><br><span class="small muted">OpenRouter enviará tus consultas únicamente a proveedores que no guardan ni entrenan con ellas. Así, DeepSeek se ejecuta fuera de China y no en la API propia de DeepSeek. Algunos modelos pueden no estar disponibles.</span></span></label>` : ''}
  ${own && OWNER.serviceContact ? `<p class="small muted">Servicio de instalación independiente y pagado, ofrecido por el autor de Folio: ${esc(OWNER.serviceContact)}</p>` : ''}
  <div class="row"><button type="button" class="btn" data-action="test-conn">Probar conexión</button><span id="conn-result" class="small muted" role="status"></span></div>`;
}
async function testConn() {
  const cfg = pickCfg(curCfg()); const out = $('#conn-result');
  if (!cfg.model) { out.innerHTML = '<span style="color:var(--danger)">Elige un modelo primero.</span>'; return; }
  out.textContent = 'Probando…';
  try { await llm({ cfg, system: 'Responde únicamente con la palabra OK.', messages: [{ role: 'user', content: 'Prueba de conexión.' }], maxTokens: 1024 }); out.innerHTML = `<span style="color:var(--ok)">Conexión correcta con ${esc(cfg.model)}.</span>`; }
  catch (e) { out.innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span>`; }
}
async function fillModels() {
  const cfg = pickCfg(curCfg()); const out = $('#conn-result');
  try { out && (out.textContent = 'Buscando modelos…'); const ms = await listModels(cfg); const tags = Object.fromEntries(OR_RECOMMENDED.map(r => [r.id, r.tag])); $('#models-dl').innerHTML = ms.map(m => `<option value="${esc(m)}"${tags[m] ? ` label="${esc(tags[m])}"` : ''}>`).join(''); out && (out.textContent = `${ms.length} modelos disponibles. Escribe en el campo Modelo para filtrar.`); $('#pf-model')?.focus(); }
  catch (e) { out && (out.innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span>`); }
}

function keyGuideHTML(focus) {
  const open = k => (focus === k ? 'open' : '');
  const step = arr => `<ol>${arr.map(s => `<li>${s}</li>`).join('')}</ol>`;
  return `<p>Folio no tiene servidores: usa tu propia cuenta en un proveedor de IA y pagas directo a ese proveedor, solo por lo que usas. Elige una opción:</p>
  <details class="guide" ${open('openrouter')}><summary>OpenRouter <span class="chip ok">Recomendado</span></summary>
    <p class="small muted">Una sola key te da acceso a Claude, GPT, Gemini y DeepSeek.</p>
    ${step(['Entra a <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">openrouter.ai</a> y crea tu cuenta con Google o con tu correo.',
      'En <strong>Credits</strong>, carga saldo con tarjeta. Para empezar, US$5 a US$10 alcanzan para varias semanas de uso normal.',
      'En <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer">Keys</a>, pulsa <strong>Create key</strong>, ponle de nombre “Folio” y fija un límite de crédito con reinicio mensual, por ejemplo US$10. Así nunca gastarás más de eso.',
      'Copia la key: empieza con <code>sk-or-</code>. Guárdala en un lugar seguro, porque puede que no vuelva a mostrarse completa.',
      'En Folio elige <strong>OpenRouter</strong>, pega la key, elige un modelo sugerido y pulsa <strong>Probar conexión</strong>.'])}
    <p class="small">Deja activada en Folio la opción <strong>Solo proveedores sin retención de datos</strong>. En los ajustes de OpenRouter, no actives el registro de tus consultas a cambio de descuentos.</p></details>
  <details class="guide" ${open('openai')}><summary>OpenAI (GPT)</summary>
    ${step(['Entra a <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">platform.openai.com</a>. No es chatgpt.com: la suscripción ChatGPT Plus no incluye la API.',
      'En <strong>Billing</strong>, agrega una tarjeta y carga crédito.',
      'En los límites de uso de tu cuenta, fija un tope de gasto mensual.',
      'En <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">API keys</a>, pulsa <strong>Create new secret key</strong>, ponle “Folio” y cópiala. Empieza con <code>sk-</code> y solo se muestra una vez.',
      'En Folio elige <strong>OpenAI</strong>, pega la key, pulsa <strong>Ver modelos</strong> y elige uno.'])}</details>
  <details class="guide" ${open('anthropic')}><summary>Anthropic (Claude)</summary>
    ${step(['Entra a <a href="https://platform.claude.com" target="_blank" rel="noopener noreferrer">platform.claude.com</a> (Claude Console). La suscripción Claude Pro no incluye la API.',
      'En <strong>Billing</strong>, carga crédito. Si tu cuenta lo permite, fija también un límite de gasto.',
      'Ve a <strong>Settings → API keys</strong>, pulsa <strong>Create key</strong> y ponle un nombre.',
      'Copia la key: empieza con <code>sk-ant-</code> y la consola la muestra completa solo una vez.',
      'En Folio elige <strong>Anthropic (Claude)</strong>, pega la key, pulsa <strong>Ver modelos</strong> y elige uno.'])}</details>
  <details class="guide" ${open('deepseek')}><summary>DeepSeek <span class="chip">Económico</span></summary>
    <p>No uses la API propia de DeepSeek: según su política de privacidad, guarda los datos en China y puede usarlos para entrenar sus modelos. Usa DeepSeek a través de <strong>OpenRouter</strong> con la opción sin retención activada: es el mismo modelo, ejecutado por proveedores fuera de China, y el más barato de la lista.</p></details>
  <details class="guide" ${open('custom')}><summary>Servidor propio en tu oficina</summary>
    <p>Un modelo instalado en una computadora de tu oficina con tarjeta gráfica. Nada sale de tu red, pero requiere una instalación técnica: quien lo instale te dará la dirección del servidor para ponerla en Folio.</p>
    <p class="small muted">La calidad depende del equipo. Con tarjetas gráficas de 24 GB o más se obtienen resultados aceptables; con menos, los modelos son pequeños y cometen más errores en la redacción de escritos.</p>
    ${OWNER.serviceContact ? `<p class="small">Servicio de instalación independiente y pagado, ofrecido por el autor de Folio: ${esc(OWNER.serviceContact)}</p>` : ''}</details>
  <h3 style="font-size:1rem;margin:1.2rem 0 .4rem">¿Cuánto cuesta?</h3>
  <p class="small">Una consulta típica en Folio cuesta aproximadamente menos de US$0.002 con DeepSeek V4.1 Flash, unos US$0.015 con Gemini 3.8 Flash y unos US$0.04 con Claude Sonnet 5.5 o GPT-6.1 Sol. Precios aproximados de septiembre de 2026; revisa los vigentes en la página del proveedor.</p>`;
}
function showKeyGuide() {
  const focus = (curCfg() || {}).provider || 'openrouter';
  openDialog({ title: '¿Cómo obtengo mi API key?', body: keyGuideHTML(focus), wide: true, foot: '<button class="btn primary" data-action="dlg-close">Entendido</button>' });
}

/* ============================================================
   Bloqueo
   ============================================================ */
function renderLock() {
  root().innerHTML = `<div class="screen-center"><div class="lock">
    <div class="brand lock-brand">${BRAND}</div>
    <div class="stamp big ${S.stampPress ? 'press' : ''}"><b>Guardado solo en este equipo</b><span>Bóveda cifrada</span></div>
    <h1>Desbloquea Folio</h1><p class="muted">Ingresa la contraseña de tu bóveda.</p>
    <form data-form="unlock"><label class="field"><span>Contraseña</span><input class="input" type="password" name="pass" autocomplete="current-password" required autofocus></label>
    <button class="btn primary block" type="submit">Desbloquear</button><p id="lock-err" class="small" style="color:var(--danger);margin-top:.8em" role="alert"></p></form>
    <p class="tiny muted" style="margin-top:2rem">¿Olvidaste la contraseña? Solo puedes restaurar una copia de seguridad o empezar de cero. <a href="#" data-action="wipe-from-lock">Borrar todo y empezar</a></p>
  </div></div>`;
  S.stampPress = false;
  setTimeout(() => $('input[name=pass]')?.focus(), 30);
}
async function doUnlock(pass) {
  const err = $('#lock-err'); const btn = $('[data-form="unlock"] button'); btn.disabled = true; err.textContent = '';
  try {
    await Vault.unlock(pass);
    S.settings = { ...DEFAULT_SETTINGS, ...(await store.get('settings') || {}) };
    if (!PROVIDERS[S.settings.provider]) Object.assign(S.settings, { provider: 'openrouter', baseUrl: '', model: '' });
    S.index = await store.get('index') || [];
    S.audit = await store.get('audit') || [];
    S.consent = await DB.get('consent');
    if (needsReconsent(S.consent)) { S.screen = 'reconsent'; render(); return; }
    enterApp();
  } catch (e) { btn.disabled = false; err.textContent = e instanceof FolioError ? e.message : 'No se pudo abrir la bóveda.'; }
}
function lockNow(msg) {
  cerrarEnvio(false); S.menu = null; S.ne = null; S.nt = null; S.revision?.ctrl.abort(); S.revision = null;   // la ventana «Nuevo expediente» (con el texto del documento) no sobrevive al bloqueo
  if (S.sending && S.abort) S.abort.abort();
  Vault.lock(); Object.assign(S, { settings: null, draftCfg: null, index: [], exp: null, docTexts: {}, audit: [], lastSend: null, consent: null, updateHidden: false, screen: 'lock', vista: 'inicio', sideOpen: false, fichaMovil: false });
  closeDialog(); render(); if (msg) toast(msg);
}
setInterval(() => {
  if ((S.screen !== 'app' && S.screen !== 'reconsent') || !S.settings || S.sending) return;
  if (Date.now() - S.lastActive > (S.settings.autoLockMin || 15) * 60000) lockNow('Folio se bloqueó por inactividad.');
}, 20000);
['pointerdown', 'keydown', 'wheel'].forEach(ev => document.addEventListener(ev, () => { S.lastActive = Date.now(); }, { passive: true }));

/* ============================================================
   Re-aceptación de avisos (T-201): si cambió APP.policyVersion
   ============================================================ */
function needsReconsent(c) { return !c || c.policyVersion !== APP.policyVersion; }
function renderReconsent() {
  const c = S.consent; const changes = policyChangesSince(c?.policyVersion);
  const when = fmtDateTime(c?.acceptedAt || '');
  const since = c ? `Aceptaste la versión <span class="mono">${esc(c.policyVersion)}</span> el ${esc(when)}${when.endsWith('.') ? '' : '.'}` : 'No encontramos una aceptación previa en este equipo.';
  root().innerHTML = `<div class="screen-center"><div class="reconsent">
    <div class="brand" style="margin-bottom:1.5rem">${BRAND}</div>
    <h1>Actualizamos los avisos de Folio</h1>
    <p class="lead muted">${since} La versión vigente es <span class="mono">${esc(APP.policyVersion)}</span>. Revisa los cambios y acéptalos para seguir usando Folio.</p>
    ${changes.length ? `<div class="sheet"><h3>Qué cambió</h3><ul class="changes">${changes.map(ch => ch.items.map(it => `<li>${esc(it)}</li>`).join('')).join('')}</ul></div>` : ''}
    <div class="row" style="margin-bottom:1rem"><button class="btn sm" data-action="show-policy">Leer la política de privacidad</button><button class="btn sm" data-action="show-terms">Leer los términos de uso</button></div>
    <label class="check"><input type="checkbox" data-reconsent-check><span>Leí la política de privacidad y los términos de uso de esta versión y los acepto.</span></label>
    <div class="row" style="justify-content:space-between;margin-top:1.25rem">
      <button class="btn ghost" data-action="reconsent-decline">Ahora no, bloquear</button>
      <button class="btn primary" data-action="reconsent-accept" disabled>Aceptar y continuar</button>
    </div>
    <p class="tiny muted" style="margin-top:1.5rem">Si no estás de acuerdo, puedes dejar de usar Folio: tus expedientes siguen cifrados en este equipo y no se envían a ningún lugar.</p>
  </div></div>`;
}
async function acceptReconsent() {
  const old = S.consent;
  const history = old ? [...(old.history || []), { policyVersion: old.policyVersion, appVersion: old.appVersion, acceptedAt: old.acceptedAt }] : [];
  S.consent = { ...(old || {}), policyVersion: APP.policyVersion, appVersion: APP.version, acceptedAt: new Date().toISOString(), items: { ...(old?.items || {}), policy: true }, history };
  await DB.put('consent', S.consent);
  enterApp();
  setTimeout(() => toast('Avisos aceptados. La aceptación queda guardada en este equipo.'), 60);
}

/* ============================================================
   Aplicación
   ============================================================ */
async function enterApp() {
  S.screen = 'app'; S.stampPress = true; applyTheme();
  await Lib.load();
  const last = S.settings.lastExp && S.index.find(x => x.id === S.settings.lastExp);
  if (last) await openExp(last.id, true); else { S.exp = null; S.vista = S.index.length ? 'hoy' : 'vacio'; render(); }
  setTimeout(() => { S.stampPress = false; }, 50);
  maybeCheckUpdate().catch(() => {});
  maybeUpdateNormas().catch(() => {});
}
function caratulaTitle(e) {
  const cli = e.partes.filter(p => p.esCliente).map(p => p.nombre).join(', ');
  const con = e.partes.filter(p => !p.esCliente).map(p => p.nombre).join(', ');
  return cli || con ? `${cli || 'Cliente'} contra ${con || 'contraparte'}` : (e.materia || 'Expediente sin partes');
}
function upsertIndex(e) {
  const props = e.memoria.propuestas.filter(p => p.estado === 'pendiente').map(p => ({ tipo: p.tipo, seccion: p.seccion, fecha: p.fecha || '', desc: p.despues, chatId: p.chatId, chat: e.chats.find(c => c.id === p.chatId)?.titulo || (e.tablas || []).find(t => t.id === p.chatId)?.titulo || '' }));
  const s = { id: e.id, numero: e.numero, titulo: caratulaTitle(e), materia: e.materia, estado: e.estado || '', ejemplo: !!e.ejemplo, updatedAt: e.updatedAt, plazos: e.memoria.plazos.filter(p => !p.done).map(p => ({ fecha: p.fecha, desc: p.desc })), props };
  const i = S.index.findIndex(x => x.id === e.id); if (i >= 0) S.index[i] = s; else S.index.unshift(s);
}
let saveT = null;
function saveSoon() { clearTimeout(saveT); saveT = setTimeout(() => saveExp().catch(fail), 350); }
async function saveExp() {
  clearTimeout(saveT); const e = S.exp; if (!e || !Vault.key) return;
  e.updatedAt = new Date().toISOString();
  await store.put('exp:' + e.id, e); upsertIndex(e); await store.put('index', S.index);
  renderBarra();
}
async function saveSettings() { await store.put('settings', S.settings); }
async function addAudit(entry) { S.audit.unshift(entry); S.audit = S.audit.slice(0, 500); await store.put('audit', S.audit); }

async function openExp(id, silent) {
  try {
    if (S.exp?.id === id) { Object.assign(S, { vista: 'inicio', sideOpen: false }); resetFicha(); render(); return; }   // ya abierto: vuelve a su inicio
    S.revision?.ctrl.abort();
    const e = await store.get('exp:' + id); if (!e) throw new FolioError('No se encontró el expediente.');
    normalizeExp(e); S.visitaPrevia = e.ultimaVisita; e.ultimaVisita = new Date().toISOString();
    await store.put('exp:' + id, e);   // migración y visita: no cambian la fecha de modificación ni el orden de la lista
    Object.assign(S, { exp: e, docTexts: {}, vista: 'inicio', sideOpen: false, movsAll: false }); resetFicha();
    for (const d of e.docs) { const r = await store.get('doc:' + d.id); if (r) S.docTexts[d.id] = r.text; }
    if (S.settings.lastExp !== id) { S.settings.lastExp = id; saveSettings(); }
    render();
  } catch (e) { if (!silent) fail(e); S.exp = null; S.vista = S.index.length ? 'hoy' : 'vacio'; render(); }
}
function blankExp(f) {
  const c = newChat(), ahora = new Date().toISOString();   // crear el expediente cuenta como la primera visita
  return { id: uid(), numero: f.numero || '', materia: f.materia || '', especialidad: f.especialidad || '', organo: f.organo || '', distrito: f.distrito || '', estado: f.estado || '',
    partes: [], nextTok: 1, memoria: { resumen: '', hechos: '', estrategia: '', pendientes: [], plazos: [], propuestas: [], historial: [] }, movimientos: [], docs: [],
    chats: [c], chatActivo: c.id, ultimaVisita: ahora, createdAt: ahora, updatedAt: ahora };
}
function addParte(e, nombre, rol, doc, esCliente) { e.partes.push({ id: uid(), tok: `PERSONA_${e.nextTok++}`, nombre: nombre.trim(), rol, doc: (doc || '').trim(), esCliente: !!esCliente }); }

/* ---------- Íconos de trazo fino (decorativos: aria-hidden) ---------- */
const ICONS = {
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  expand: '<path d="M14 4h6v6M20 4l-6.5 6.5M10 20H4v-6M4 20l6.5-6.5"/>',
  shrink: '<path d="M20 10h-6V4M14 10l6.5-6.5M4 14h6v6M10 14l-6.5 6.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chat: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4.5 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>'
};
const ico = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const trunc = (s, n) => s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
function fmtDayMon(iso) { const [, m, d] = iso.split('-'); return `${d} ${MESES[+m - 1].slice(0, 3)}`; }
function whenLabel(iso) { const d = daysUntil(iso); return d < 0 ? `vencido hace ${plural(-d, 'día', 'días')}` : d === 0 ? 'vence hoy' : d === 1 ? 'mañana' : `en ${d} días`; }
function urgency(iso) { const d = daysUntil(iso); return d <= 0 ? 'due' : d <= 3 ? 'soon' : ''; }
function nextPlazos(e) { return e.memoria.plazos.filter(p => !p.done).sort((a, b) => a.fecha.localeCompare(b.fecha)); }

/* Campos con aspecto de documento: crecen con el texto (field-sizing donde existe; si no, JS) */
const FIELD_SIZING = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
function autosize(t) { if (FIELD_SIZING || !t.offsetParent) return; t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }
function autosizeAll() { if (!FIELD_SIZING) $$('textarea.docfield').forEach(autosize); }

/* ---------- Privacidad: ventana de detalle (la abre el pie de la barra: "Cifrado en este equipo") ---------- */
function lastSendText() {
  const s = S.settings;
  if (s && s.provider === 'custom') return 'IA en tu servidor propio';
  if (S.lastSend) return `Último envío a ${provLabel(S.lastSend.provider)}, ${rel(S.lastSend.at)}${S.lastSend.pseudo ? ', con datos reemplazados' : ''}`;
  return 'Nada enviado en esta sesión';
}
function showPrivacy() {
  const s = S.settings, e = EXP_VISTAS.includes(S.vista) ? S.exp : null, ready = isReady(s);
  const ok = t => `<li>${ico('check')}<span>${t}</span></li>`, warn = t => `<li class="warn"><span class="bang" aria-hidden="true">!</span><span>${t}</span></li>`;
  const items = [
    ok(`${e ? 'Este expediente se guarda cifrado' : 'Tus expedientes se guardan cifrados'} en este navegador, con tu contraseña. Folio no tiene servidores y no ve tus datos.`),
    s.pseudo ? ok(`Antes de enviar al proveedor de IA, Folio reemplaza los nombres y documentos ${e ? `de ${plural(e.partes.length, 'parte registrada', 'partes registradas')}` : 'de las partes'}, además de DNI, RUC, teléfonos, correos y direcciones, por marcadores como <span class="tok">[PERSONA_1]</span>.`)
      : warn('El reemplazo de datos está <strong>desactivado</strong>: el proveedor recibe los nombres y documentos reales.'),
    s.review ? ok('Antes de cada envío ves el texto exacto que saldrá de tu equipo.') : warn('La revisión previa de cada envío está desactivada.')];
  const prov = !ready ? 'Sin proveedor conectado: nada sale de tu equipo.' : `${esc(provLabel(s.provider))} · <span class="mono">${esc(s.model)}</span>${PROVIDERS[s.provider]?.abroad ? ', con servidores fuera del Perú' : ', en tu red'}`;
  const sends = e ? S.audit.filter(a => a.exp === (e.numero || 's/n')).length : 0;
  openDialog({ title: e ? 'Privacidad de este expediente' : 'Privacidad', body: `<ul class="checks">${items.join('')}</ul>
    <dl class="kv"><dt>Proveedor de IA</dt><dd>${prov}</dd><dt>En esta sesión</dt><dd>${esc(lastSendText())}</dd>${e ? `<dt>Envíos registrados</dt><dd>${plural(sends, 'envío', 'envíos')} de este expediente en el registro de este equipo</dd>` : ''}</dl>`,
    foot: `<button class="btn ghost" data-action="show-policy">Política de privacidad</button><button class="btn" data-action="privacy-settings">Ajustes de privacidad</button><button class="btn primary" data-action="dlg-close">Entendido</button>` });
}

function deadlineChip(fecha, done) {
  if (done) return `<span class="chip ok">Cumplido</span>`;
  const d = daysUntil(fecha);
  if (d < 0) return `<span class="chip due">Vencido</span>`;
  if (d === 0) return `<span class="chip due">Hoy</span>`;
  if (d <= 3) return `<span class="chip soon">En ${d} día${d > 1 ? 's' : ''}</span>`;
  return `<span class="chip">En ${d} días</span>`;
}

/* ============================================================
   v0.6 · tres zonas (E10): expedientes · el Agente · Ficha del expediente
   El marcado sigue TAL CUAL el prototipo process/prototipos/rediseno-chat-v0.6.html (D-42).
   ============================================================ */
const EXP_VISTAS = ['inicio', 'chat', 'memoria', 'tabla'];
const MQ_MOVIL = matchMedia('(max-width:1023px)');
const HOY_DIAS = 14;   // "Hoy" muestra las fechas registradas vencidas y las de los próximos 14 días
// Íconos del prototipo (trazo fino, decorativos)
const IC = {
  mas: '<path d="M12 5v14M5 12h14"/>', buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  hoy: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  carpeta: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  ficha: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M14.5 4.5v15"/>', cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  enviar: '<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>', candado: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  ajustes: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  volver: '<path d="M19 12H5M11 6l-6 6 6 6"/>', flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  doc: '<path d="M6.5 3.5h7l4 4v12.5a.5.5 0 0 1-.5.5H6.5a.5.5 0 0 1-.5-.5v-16a.5.5 0 0 1 .5-.5z"/><path d="M13.5 3.5v4h4M9 12.5h6M9 16h4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', aviso: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17h.01"/>',
  puntos: '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>',
  tabla: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15"/>',
  copiar: '<rect x="8" y="8" width="11.5" height="11.5" rx="2"/><path d="M15.5 8V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2"/>',
  bajar: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>'
};
const ic = (n, st = '') => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${st ? ` style="${st}"` : ''}>${IC[n]}</svg>`;
const numCorto = n => (n || '').split('-').slice(0, 2).join('-') || 'Sin número';
const ddmm = iso => iso ? fmtDate(iso).slice(0, 5) : '—';
const pad2 = n => String(n).padStart(2, '0');
const diaLocal = iso => { const d = new Date(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; };
const esHoy = iso => !!iso && new Date(iso).toDateString() === new Date().toDateString();
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const lcFirst = s => s ? s[0].toLowerCase() + s.slice(1) : s;
const listaY = a => a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}`;
const SECC = { estado: 'estado', resumen: 'resumen', hechos: 'hechos', estrategia: 'estrategia', pend: 'pendientes', plazo: 'plazos' };
const memSecciones = e => [e.estado && 'estado', e.memoria.resumen.trim() && 'resumen', e.memoria.hechos.trim() && 'hechos', e.memoria.estrategia.trim() && 'estrategia',
  e.memoria.pendientes.some(p => !p.done) && 'pendientes', e.memoria.plazos.some(p => !p.done) && 'plazos'].filter(Boolean);
function chatsOrdenados(e) { return e.chats.filter(c => c.mensajes.length).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')); }
function docsLeidos(e) { const s = new Set(); e.chats.forEach(c => c.mensajes.forEach(m => (m.meta?.frags || []).forEach(n => s.add(n)))); return s; }

/* Ficha: abierta o cerrada en pantalla ancha; hoja (ficha-movil) en el celular */
const fichaVisible = () => !!S.exp && (S.vista === 'inicio' || S.vista === 'chat' || S.vista === 'tabla');
function fichaAbierta() { return MQ_MOVIL.matches ? S.fichaMovil : S.ficha === 'abierta'; }
function abrirFicha() { if (MQ_MOVIL.matches) S.fichaMovil = true; else S.ficha = 'abierta'; }
function resetFicha() { Object.assign(S, { fichaModo: 'ficha', fichaTab: 'ficha', fuente: null, borrador: null, fuenteDoc: null }); }
function layout() {
  const v = $('#v6'); if (!v) return;
  const movil = MQ_MOVIL.matches, abierta = S.ficha === 'abierta' && fichaVisible();
  Object.assign(v.dataset, { vista: S.vista, modo: S.fichaModo, ficha: S.ficha, side: S.sideOpen ? 'abierto' : 'cerrado' });
  v.classList.toggle('ficha-movil', movil && S.fichaMovil);
  // Riel: con la ficha abierta, bajo 1280 px (o bajo 1440 px en modo Borrador) la barra izquierda se reduce a íconos
  v.classList.toggle('riel', !movil && abierta && (innerWidth < 1280 || (S.fichaModo === 'borrador' && innerWidth < 1440)));
  const t = $('#cab [data-action="toggle-ficha"]'); if (t) t.classList.toggle('on', fichaAbierta());
}

/* ---------- Estructura principal ---------- */
function renderApp() {
  if (EXP_VISTAS.includes(S.vista) && !S.exp) S.vista = S.index.length ? 'hoy' : 'vacio';
  root().innerHTML = `<div class="v6" id="v6">
    <aside class="barra" id="barra" aria-label="Expedientes">${barraHTML()}</aside>
    <main class="centro" id="centro" aria-label="Agente">${centroHTML()}</main>
    <aside class="ficha" id="ficha" aria-label="Ficha del expediente">${fichaHTML()}</aside>
  </div><div class="velo-m" data-action="cerrar-capas"></div>`;
  S.stampPress = false;
  layout(); scrollHilo(); autosizeAll();
}
function renderBarra() {
  const b = $('#barra'); if (!b) return;
  if (document.activeElement?.id === 'q-exp') { $('#exps').innerHTML = expsHTML(); return; }   // no quitar el foco del buscador
  b.innerHTML = barraHTML();
}
function renderCentro() {
  const c = $('#centro'); if (!c) return;
  const borrador = $('#q')?.value || '';
  c.innerHTML = centroHTML();
  const q = $('#q'); if (q && borrador && !S.sending) q.value = borrador;
  layout(); scrollHilo(); autosizeAll();
}
function renderFicha() {
  const f = $('#ficha'); if (!f) return;
  const y = $('#fcuerpo')?.scrollTop || 0; f.innerHTML = fichaHTML();
  const c = $('#fcuerpo'); if (c) c.scrollTop = y;
}
// Tras cambiar datos del expediente: barra, ficha y la vista central (salvo el hilo, que no cambia)
function refreshExp() { renderBarra(); renderFicha(); if (S.vista === 'chat') { const c = $('#cab'); if (c) c.innerHTML = cabHTML(); layout(); } else renderCentro(); }
function scrollHilo() { if (S.vista !== 'chat') return; const s = $('#scroll'); if (s) s.scrollTop = s.scrollHeight; }

/* ---------- Izquierda: expedientes ---------- */
function barraHTML() {
  const h = hoyItems().total;
  return `<i class="logo" role="img" aria-label="Folio"></i>
    <label class="buscar">${ic('buscar')}<input id="q-exp" data-search placeholder="Buscar" value="${esc(S.filter)}" aria-label="Buscar expediente" autocomplete="off" spellcheck="false"><kbd>Ctrl K</kbd></label>
    <button class="navi nav-hoy${S.vista === 'hoy' ? ' on' : ''}" data-action="vista-hoy">${ic('hoy')}Hoy${h ? `<span class="cnt">${h}</span>` : ''}</button>
    <div class="secc"><span class="lbl">Expedientes</span><button class="ib" data-action="new-exp" aria-label="Nuevo expediente" title="Nuevo expediente">${ic('mas')}</button></div>
    <div class="exps" id="exps">${expsHTML()}</div>
    <div class="pie">
      <button class="seg" data-action="privacy" title="Ver cómo se protegen tus datos">${ic('candado')}Cifrado en este equipo</button>
      <button class="ib" data-action="lock-now" aria-label="Bloquear" title="Bloquear">${ic('candado')}</button>
      <button class="ib" data-action="open-settings" aria-label="Ajustes" title="Ajustes">${ic('ajustes')}</button>
    </div>
    <div class="riel-ico">
      <i class="marca" role="img" aria-label="Folio"></i>
      <button class="ib" data-action="riel-buscar" aria-label="Buscar">${ic('buscar')}</button>
      <button class="ib${h ? ' dot' : ''}" data-action="vista-hoy" aria-label="Hoy">${ic('hoy')}</button>
      <button class="ib on" data-action="riel-abrir" aria-label="Expedientes" title="Expedientes">${ic('carpeta')}</button>
      <button class="ib abajo" data-action="lock-now" aria-label="Cifrado en este equipo · Bloquear" title="Cifrado en este equipo · Bloquear">${ic('candado')}</button>
    </div>`;
}
function expsHTML() {
  if (!S.index.length) return `<div class="exps-vacio">Aún no tienes expedientes.</div>`;
  const f = norm(S.filter);
  const items = S.index.filter(x => !f || norm(`${x.numero} ${x.titulo} ${x.materia}`).includes(f)).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  if (!items.length) return `<div class="exps-vacio">Ningún expediente coincide con “${esc(S.filter)}”.</div>`;
  return items.map(x => {
    const act = S.exp?.id === x.id, on = act && EXP_VISTAS.includes(S.vista);
    const next = !act && (x.plazos || []).map(p => p.fecha).sort()[0];   // el activo muestra su plazo en la ficha
    const t = [x.materia || x.titulo, x.estado].filter(Boolean).join(' · ') || 'Expediente sin datos';
    return `<button class="exp${on ? ' on' : ''}" data-action="open-exp" data-id="${x.id}"${on ? ' aria-current="true"' : ''}><div class="n">${esc(act ? (x.numero || 'Sin número') : numCorto(x.numero))}${next ? `<em>${ddmm(next)}</em>` : ''}</div><div class="t">${esc(t)}</div></button>${act ? convsHTML() : ''}`;
  }).join('');
}
function convsHTML() {
  const e = S.exp, c = activeChat(e), enChat = S.vista === 'chat', todas = chatsOrdenados(e);
  let lista = todas.slice(0, 3);
  if (enChat && c.mensajes.length && !lista.includes(c)) lista = [c, ...lista.slice(0, 2)];
  const tablas = [...(e.tablas || [])].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 2);
  if (S.vista === 'tabla' && tablaActual() && !tablas.includes(tablaActual())) tablas.unshift(tablaActual());
  const tb = tablas.map(t => `<button class="conv${S.vista === 'tabla' && t.id === S.tablaId ? ' on' : ''}" data-action="open-tabla" data-id="${t.id}" title="${esc(t.titulo)}">${ic('tabla')}${esc(t.titulo)}</button>`).join('');
  return `<div class="convs">${tb}${enChat && !c.mensajes.length ? '<button class="conv on" data-action="new-chat">Nueva conversación</button>' : ''}${lista.map(x => `<button class="conv${enChat && x.id === c.id ? ' on' : ''}" data-action="open-chat" data-id="${x.id}" title="${esc(x.titulo)}">${esc(x.titulo || 'Conversación sin título')}</button>`).join('')}<button class="conv nueva" data-action="new-chat">+ Nueva conversación</button><button class="conv nueva" data-action="nueva-tabla">+ Nueva tabla de revisión</button>${todas.length > 3 ? `<button class="conv todas" data-action="vista-inicio">Ver todas (${todas.length})</button>` : ''}</div>`;
}

/* ---------- Centro: encabezado y vistas ---------- */
function centroHTML() {
  const v = S.vista;
  if (v === 'tabla') return `<header class="cab" id="cab">${cabHTML()}</header>${updateBarHTML()}<div class="tabla-v" id="scroll">${tablaHTML()}</div>`;
  const body = v === 'hoy' ? hoyHTML() : v === 'inicio' ? inicioHTML() : v === 'chat' ? chatHTML() : v === 'memoria' ? memoriaHTML() : v === 'ajustes' ? settingsHTML() : emptyHTML();
  return `<header class="cab" id="cab">${cabHTML()}</header>${updateBarHTML()}<div class="scroll" id="scroll">${body}</div>${v === 'chat' ? `${largaHTML()}<div class="pie-chat">${cajaHTML('chat')}</div>` : ''}`;
}
/* Aviso de conversación larga (F4): nada hasta ~70 %; línea tranquila; ámbar desde ~90 % con "Seguir en una nueva" como acción principal.
   "Seguir aquí" la oculta en esta sesión hasta el siguiente umbral. */
function nivelContexto(e) { const u = usoContexto(e); return u >= CTX_ALTO ? 2 : u >= CTX_AVISO ? 1 : 0; }
function largaHTML() {
  const e = S.exp, c = activeChat(e); if (!isReady(S.settings) || !conversados(c).length) return '';
  const n = nivelContexto(e); if (!n || (S.seguirAqui[c.id] || 0) >= n) return '';
  return `<div class="larga${n === 2 ? ' alta' : ''}" role="status"><span><b>Esta conversación ya es larga.</b> Para que el agente no pierda precisión, sigue en una nueva: Folio guarda un resumen.</span><span class="acc"><button class="pb ${n === 2 ? 'prim' : 'tinta'}" data-action="seguir-nueva"${S.sending ? ' disabled' : ''}>Seguir en una nueva</button><button class="pb" data-action="seguir-aqui">Seguir aquí</button></span></div>`;
}
function cabHTML() {
  const e = S.exp, v = S.vista;
  const corto = e ? `<span class="num">${esc(numCorto(e.numero))}</span>${e.materia ? ' · ' + esc(e.materia) : ''}` : '';
  const [miga, titulo] = v === 'hoy' ? ['', 'Hoy'] : v === 'inicio' ? [`<span class="num">${esc(e.numero || 'Sin número')}</span>`, 'Inicio del expediente']
    : v === 'chat' ? [corto, activeChat(e).titulo || 'Nueva conversación'] : v === 'tabla' ? [corto, tablaActual()?.titulo || 'Tabla de revisión'] : v === 'memoria' ? [corto, 'Memoria del expediente'] : v === 'ajustes' ? ['', 'Ajustes'] : ['', 'Expedientes'];
  return `<button class="ib solo-movil" data-action="toggle-side" aria-label="Expedientes">${ic('menu')}</button>
    <div class="tit">${miga ? `<span class="miga">${miga}</span>` : ''}<span class="titulo"${v === 'chat' || v === 'tabla' ? ' role="heading" aria-level="1"' : ''}>${esc(titulo)}</span></div>
    ${v === 'tabla' ? `<div class="acc-t"><button class="pb" data-action="tabla-col"${S.revision ? ' disabled' : ''}>${ic('mas')}<span class="t">Columna</span></button><button class="pb" data-action="tabla-copiar" aria-label="Copiar">${ic('copiar')}<span class="t">Copiar</span></button><button class="pb" data-action="tabla-csv" aria-label="Exportar CSV">${ic('bajar')}<span class="t">Exportar CSV</span></button><button class="ib" data-action="tabla-menu" aria-label="Más opciones de la tabla">${ic('puntos')}</button></div>` : ''}
    ${v === 'chat' ? `<button class="pb solo-pc" data-action="new-chat">${ic('mas')}Nueva conversación</button><button class="ib" data-action="chat-menu" aria-label="Más opciones de la conversación" title="${conversados(activeChat(e)).length ? `Contexto usado: ${usoContexto(e)} % del presupuesto de esta conversación` : ''}">${ic('puntos')}</button>` : ''}
    ${fichaVisible() ? `<button class="ib${fichaAbierta() ? ' on' : ''}" data-action="toggle-ficha" aria-label="Ficha del expediente" title="Ficha del expediente">${ic('ficha')}</button>` : ''}`;
}

/* Hoy: lo que pide atención en todos los expedientes (calculado con el índice, sin abrir cada expediente) */
function hoyItems() {
  const props = [], fechas = [], cambios = [];
  for (const x of S.index) {
    const pend = x.props || [], porChat = {};
    pend.filter(p => p.tipo === 'plazo').forEach(p => props.push({ ...p, id: x.id, numero: x.numero }));
    pend.filter(p => p.tipo !== 'plazo').forEach(p => {
      const g = porChat[p.chatId] || (porChat[p.chatId] = { id: x.id, numero: x.numero, chatId: p.chatId, chat: p.chat, n: 0, secs: [] });
      g.n++; const s = SECC[p.seccion] || p.seccion; if (!g.secs.includes(s)) g.secs.push(s);
    });
    cambios.push(...Object.values(porChat));
    (x.plazos || []).filter(p => daysUntil(p.fecha) <= HOY_DIAS).forEach(p => fechas.push({ ...p, id: x.id, numero: x.numero }));
  }
  const porFecha = (a, b) => (a.fecha || '').localeCompare(b.fecha || '');
  props.sort(porFecha); fechas.sort(porFecha);
  return { props, fechas, cambios, total: props.length + fechas.length + cambios.length };
}
function hoyHTML() {
  const h = hoyItems(), d = new Date();
  const sub = `${cap(d.toLocaleDateString('es-PE', { weekday: 'long' }))} ${d.getDate()} de ${MESES[d.getMonth()]} · lo que pide tu atención en todos tus expedientes`;
  const fila = (f, cls, txt, small, ir, attrs) => `<button class="fila-hoy" ${attrs}><span class="f${cls ? ' ' + cls : ''}">${f}</span><span>${txt}<small>${small}</small></span><span class="ir">${ir}</span></button>`;
  const grupo = (lbl, rows) => rows.length ? `<div class="grupo"><span class="lbl">${lbl}</span>${rows.join('')}</div>` : '';
  const num = x => `<span class="num">${esc(numCorto(x.numero))}</span>`;
  const html = grupo('Plazos por confirmar', h.props.map(p => fila(ddmm(p.fecha), 'w', esc(p.desc), `${num(p)} · propuesto por el agente, por verificar`, 'Revisar', `data-action="hoy-ir" data-id="${p.id}" data-chat="${esc(p.chatId)}"`)))
    + grupo('Fechas que registraste', h.fechas.map(p => { const paso = daysUntil(p.fecha) < 0;
      return fila(ddmm(p.fecha), paso ? 'd' : '', esc(p.desc), `${num(p)}${paso ? ' · la fecha ya pasó: ¿lo marcas como hecho?' : ''}`, 'Abrir', `data-action="open-exp" data-id="${p.id}"`); }))
    + grupo('Cambios de memoria por revisar', h.cambios.map(g => fila(String(g.n), '', `Cambios propuestos en «${esc(g.chat || 'Conversación sin título')}»`, `${num(g)} · ${esc(listaY(g.secs))}`, 'Revisar', `data-action="hoy-ir" data-id="${g.id}" data-chat="${esc(g.chatId)}"`)));
  return `<div class="col hoy">
    <h1>Hoy</h1>
    <div class="sub">${esc(sub)}</div>
    ${html || '<div class="grupo"><span class="sin">Nada pide tu atención por ahora.</span></div>'}
    <p class="nota">Folio no calcula plazos: aquí ves las fechas que registraste y las que propuso el agente. Verifícalas en la resolución y en tu casilla.</p>
  </div>`;
}

/* Inicio del expediente: carátula en una línea, novedades, caja de texto, atajos y conversaciones */
function inicioHTML() {
  const e = S.exp, ready = isReady(S.settings);
  const cli = e.partes.filter(p => p.esCliente).map(p => p.nombre);
  const meta = [cli.length ? `${cli.join(', ')} (tu cliente)` : '', e.organo, e.estado, e.ejemplo ? 'ejemplo con datos ficticios' : ''].filter(Boolean).join(' · ');
  S.quick = ready ? quickActions(e).slice(0, 2) : [];
  const chats = chatsOrdenados(e);
  return `<div class="col inicio">
    <h1>${esc(e.materia || caratulaTitle(e))}</h1>
    ${meta ? `<div class="imeta">${esc(meta)}</div>` : ''}
    ${novedadesHTML(e)}
    ${origenHTML(e)}
    ${cajaHTML('inicio')}
    ${ready ? `<div class="atajos">${S.quick.map(([l], i) => `<button class="atajo" data-action="quick" data-i="${i}">${esc(l)}</button>`).join('')}<button class="atajo" data-action="paste-cej">/pegar-cej</button></div>` : ''}
    <div class="bloque"><span class="lbl">Conversaciones</span>
      <div class="lista-conv">${chats.length ? chats.map(lcHTML).join('') : '<div class="vacio-conv">Todavía no conversas con el agente sobre este expediente.</div>'}</div>
    </div>
    ${(e.tablas || []).length ? `<div class="bloque"><span class="lbl">Tablas de revisión</span><div class="lista-conv">${[...e.tablas].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(t => { const r = resumenTabla(t);
      return `<button class="lc" data-action="open-tabla" data-id="${t.id}"><span><b>${esc(t.titulo)}</b><small>${plural(t.filas.length, 'documento', 'documentos')} · ${plural(t.columnas.length, 'columna', 'columnas')}</small></span><span class="e"><span class="num">${esHoy(t.updatedAt) ? 'hoy' : diaLocal(t.updatedAt)}</span>${r.mal ? `<i class="w">${r.mal} por revisar</i>` : r.ok ? `<i>✓ ${plural(r.ok, 'cita verificada', 'citas verificadas')}</i>` : ''}</span></button>`; }).join('')}</div></div>` : ''}
  </div>`;
}
function novedadesHTML(e) {
  const prev = S.visitaPrevia; if (!prev) return '';
  const rows = [], r = (f, t, cls = '') => `<div class="r"><span class="num">${f}</span><span${cls ? ` class="${cls}"` : ''}>${t}</span></div>`;
  sortedMovs(e).filter(v => v.addedAt && v.addedAt > prev).slice(0, 3).forEach(v => rows.push(r(ddmm(v.fecha), `Nuevo movimiento: ${esc(lcFirst(v.acto))}${v.sumilla ? ` · ${esc(v.sumilla)}` : ''}`)));
  e.memoria.propuestas.filter(p => p.estado === 'pendiente' && p.tipo === 'plazo').forEach(p => rows.push(r(ddmm(p.fecha), `Plazo propuesto por el agente: ${esc(lcFirst(p.despues))} (por verificar)`, 'w')));
  const pend = e.memoria.pendientes.filter(p => !p.done).length, leidos = docsLeidos(e), sinLeer = e.docs.filter(d => !leidos.has(d.name)).length;
  const resumen = [pend ? plural(pend, 'pendiente abierto', 'pendientes abiertos') : '', sinLeer ? `${plural(sinLeer, 'documento', 'documentos')} que el agente aún no leyó` : ''].filter(Boolean);
  if (resumen.length) rows.push(r('—', resumen.join(' · ')));
  if (!rows.length) rows.push(r('—', 'Sin novedades en este expediente'));
  return `<div class="nov"><span class="lbl">Desde tu última visita · <span class="num">${diaLocal(prev)}</span></span>${rows.join('')}</div>`;
}
function lcHTML(c) {
  const props = S.exp.memoria.propuestas.filter(p => p.chatId === c.id), pend = props.filter(p => p.estado === 'pendiente');
  const cambios = pend.filter(p => p.tipo !== 'plazo').length, plazos = pend.length - cambios;
  const est = cambios ? [`${plural(cambios, 'cambio', 'cambios')} por revisar`, 'w'] : plazos ? [`${plural(plazos, 'plazo', 'plazos')} por confirmar`, 'w'] : props.some(p => p.estado === 'aplicada') ? ['✓ en la memoria', ''] : null;
  const ult = [...c.mensajes].reverse().find(m => m.role === 'user'), linea = c.resumen || ult?.content || '';
  return `<button class="lc" data-action="open-chat" data-id="${c.id}"><span><b>${esc(c.titulo || 'Conversación sin título')}</b>${linea ? `<small>${esc(trunc(linea.replace(/\s+/g, ' '), 90))}</small>` : ''}</span><span class="e"><span class="num">${esHoy(c.updatedAt) ? 'hoy' : diaLocal(c.updatedAt)}</span>${est ? `<i${est[1] ? ' class="w"' : ''}>${est[0]}</i>` : ''}</span></button>`;
}

/* Caja de texto: chips de lo que lee el agente, píldora de destino y enviar (el efecto de chips, @ y / llega en F3) */
function cajaHTML(donde) {
  const s = S.settings, e = S.exp;
  if (!isReady(s)) return `<div class="sin-prov"><span>Conecta tu proveedor de IA para conversar con el agente.</span><button class="pb" data-action="open-settings">Conectar proveedor</button></div>`;
  const chip = (k, txt) => `<button type="button" class="cchip${S.ctx[k] ? ' on' : ''}" data-action="chip" data-k="${k}" aria-pressed="${S.ctx[k]}">${ic('check')}${txt}</button>`;
  const chips = [chip('memoria', 'Memoria'), e.docs.length ? chip('docs', plural(e.docs.length, 'documento', 'documentos')) : '', Lib.installed() ? chip('biblioteca', 'Biblioteca') : ''].join('');
  const ph = donde === 'inicio' ? '¿Qué necesitas hoy en este expediente?' : 'Escribe al agente · @ para citar un documento · / para acciones';
  return `<form class="caja" data-form="chat" data-donde="${donde}">
    <div class="menu" id="menu-caja" role="listbox" aria-label="Sugerencias" hidden></div>
    <textarea id="q" rows="1" placeholder="${ph}" aria-label="Escribe al agente" autocomplete="off"${S.sending ? ' disabled' : ''}></textarea>
    <div class="fila">
      <div class="chips">${chips}</div>
      <button type="button" class="destino" data-action="destino" title="Ver lo que se enviará">${ic('candado')}${esc(s.provider === 'custom' ? 'Servidor propio' : provLabel(s.provider))}<span class="modelo">· <span class="num">${esc(s.model.split('/').pop())}</span></span></button>
      ${S.sending ? `<button type="button" class="enviar" data-action="stop" aria-label="Detener la respuesta" title="Detener">${ic('cerrar')}</button>` : `<button type="submit" class="enviar" aria-label="Enviar">${ic('enviar')}</button>`}
    </div>
  </form>`;
}

/* Memoria completa: lo que el abogado escribió o aprobó, con sus movimientos (la ficha muestra lo esencial) */
function memoriaHTML() {
  const e = S.exp;
  return `<div class="col mem-completa">
    <div class="mc-cab"><div><h1>Memoria del expediente</h1><div class="imeta"><span class="num">${esc(e.numero || 'Sin número')}</span> · ${esc(caratulaTitle(e))}</div></div>
      <div class="row" style="flex-wrap:nowrap"><button class="pb" data-action="edit-exp">Editar datos</button><button class="pb" data-action="vista-volver">${ic('volver')}Volver</button></div></div>
    ${memHTML()}
    <section class="mem-sec" style="margin-top:1.5rem">${movsHTML()}</section>
  </div>`;
}

/* ---------- Derecha: Ficha del expediente (modos Ficha · Fuente · Borrador) ---------- */
function fichaHTML() {
  const e = S.exp; if (!e) return '';
  const tabs = [['ficha', 'Ficha', null], ['docs', 'Documentos', e.docs.length], ['movs', 'Movimientos', e.movimientos.length]];
  const head = S.fichaModo === 'ficha'
    ? `<div class="ftabs" role="tablist" aria-label="Ficha del expediente">${tabs.map(([k, l, n]) => `<button class="tab${S.fichaTab === k ? ' on' : ''}" role="tab" aria-selected="${S.fichaTab === k}" data-action="ftab" data-tab="${k}">${l}${n != null ? ` <span class="num">${n}</span>` : ''}</button>`).join('')}</div>`
    : `<button class="volver" data-action="ficha-volver">${ic('volver')}Volver a la ficha</button>`;
  const body = S.fichaModo === 'fuente' ? fuenteHTML() : S.fichaModo === 'fuente-doc' ? fuenteDocHTML() : S.fichaModo === 'borrador' ? borradorHTML() : S.fichaTab === 'docs' ? fdocsHTML() : S.fichaTab === 'movs' ? fmovsHTML() : fichaPanelHTML();
  return `<div class="fcab">${head}<button class="ib" data-action="toggle-ficha" aria-label="Cerrar la ficha" title="Cerrar la ficha">${ic('cerrar')}</button></div><div class="fcuerpo" id="fcuerpo" tabindex="-1">${body}</div>`;
}
function fichaPanelHTML() {
  const e = S.exp, m = e.memoria, next = nextPlazos(e)[0], pend = m.pendientes.filter(p => !p.done);
  const propPlazos = m.propuestas.filter(p => p.estado === 'pendiente' && p.tipo === 'plazo').length;
  const sin = t => `<div class="sin">${t}</div>`, nuevos = recienAplicados(e);
  return `<div class="panel">
    <div class="bloque"><span class="lbl">Estado</span>${e.estado ? `<div class="fest">${esc(e.estado)}</div>` : sin('Sin registrar')}</div>
    ${e.juez || e.especialista ? `<div class="bloque"><span class="lbl">Juzgado</span>${e.organo ? `<div class="fest">${esc(e.organo)}</div>` : ''}${e.juez ? `<div class="parte"><span>Juez: ${esc(e.juez)}</span></div>` : ''}${e.especialista ? `<div class="parte"><span>Especialista: ${esc(e.especialista)}</span></div>` : ''}</div>` : ''}
    <div class="bloque"><span class="lbl">Próximo plazo</span>${next
      ? `<div class="plazo"><span class="num">${ddmm(next.fecha)}</span><div><b>${esc(next.desc)}</b><small>${esc(cap(whenLabel(next.fecha)))} · verifícalo con la resolución</small></div></div>`
      : sin(`Ningún plazo confirmado${propPlazos ? ` · ${propPlazos === 1 ? 'hay 1 propuesto abajo' : `hay ${propPlazos} propuestos abajo`}` : ''}`)}</div>
    ${cambiosHTML(e)}
    <div class="bloque"><span class="lbl">Pendientes</span>${pend.length ? pend.map(p => `<label class="pend${nuevos.items.has(p.id) ? ' nuevo' : ''}"><input type="checkbox" data-action="toggle-pend" data-id="${p.id}">${esc(p.text)}</label>`).join('') : sin('Nada pendiente')}</div>
    <div class="bloque"><span class="lbl">Hechos clave</span>${m.hechos.trim() ? `<div class="doct">${marcarNuevos(m.hechos.trim(), nuevos.hechos)}</div>` : sin('Sin registrar')}</div>
    <div class="bloque"><span class="lbl">Partes</span>${e.partes.length ? e.partes.map(p => `<div class="parte"><span>${esc(p.nombre)} · ${esc(lcFirst(p.rol))}${p.esCliente ? ', tu cliente' : ''}</span>${S.settings.pseudo ? `<span class="num">[${esc(p.tok)}]</span>` : ''}</div>`).join('') : sin('Ninguna registrada')}</div>
    <a class="mas" href="#" data-action="vista-memoria">Ver la memoria completa →</a>
  </div>`;
}
/* ---------- Cambios propuestos por el agente (v0.6 · F5, spec §7): ✓/✕, "Aplicar N cambios" sin plazos, cada plazo se confirma aparte ---------- */
function propState(e) { if (S.prop.exp !== e.id) S.prop = { exp: e.id, sel: {}, confirmar: null, nuevos: [] }; return S.prop; }
const propPend = (e, chatId) => e.memoria.propuestas.filter(p => p.estado === 'pendiente' && (chatId === undefined || p.chatId === chatId));
const PROP_K = { estado: 'Estado', resumen: 'Resumen', hechos: 'Hechos', estrategia: 'Estrategia', pend: 'Pendientes', plazo: 'Plazo' };
function cambiosHTML(e) {
  const st = propState(e), pend = propPend(e); if (!pend.length) return '';
  const cambios = pend.filter(p => p.tipo !== 'plazo'), plazos = pend.filter(p => p.tipo === 'plazo');
  const chats = [...new Set(pend.map(p => p.chatId))], ch = chats.length === 1 && e.chats.find(c => c.id === chats[0]);
  const de = chats.length > 1 ? `de ${chats.length} conversaciones` : ch ? `de «${esc(trunc(ch.titulo || 'Conversación sin título', 30))}»` : '';
  const n = cambios.filter(p => st.sel[p.id] !== false).length;
  const siNo = p => { const no = st.sel[p.id] === false;
    return `<span class="si-no"><button class="si${no ? '' : ' on'}" data-action="prop-si" data-id="${p.id}" aria-label="Aceptar" aria-pressed="${!no}">${ic('check')}</button><button class="no${no ? ' on' : ''}" data-action="prop-no" data-id="${p.id}" aria-label="Rechazar" aria-pressed="${no}">${ic('cerrar')}</button></span>`; };
  const cb = p => `<div class="cb${st.sel[p.id] === false ? ' rechazado' : ''}"><span class="s${p.tipo === 'cambia' ? ' m' : ''}">${p.tipo === 'cambia' ? '~' : '+'}</span><div class="txt"><div class="k">${PROP_K[p.seccion] || esc(p.seccion)}${p.tipo === 'cambia' ? ' · cambia' : ''}</div>${esc(p.despues)}${p.tipo === 'cambia' && p.antes ? `<span class="antes">Antes: ${esc(p.antes)}</span>` : ''}</div>${siNo(p)}</div>`;
  const pz = p => { const preg = st.confirmar === p.id;
    return `<div class="cb pz"><span class="s p">!</span><div class="txt"><div class="k">Plazo · por confirmar</div><span class="num">${esc(fmtDate(p.fecha))}</span> · ${esc(lcFirst(p.despues))}</div>${preg ? '<span></span>' : `<button class="confirmar" data-action="plazo-confirmar" data-id="${p.id}">Confirmar</button>`}
      ${preg ? `<div class="pregunta"><span>¿Verificaste la fecha en la resolución y en tu casilla?</span><div><button class="pb" data-action="plazo-si" data-id="${p.id}">Sí, confirmar</button><button class="pb" data-action="plazo-no">Todavía no</button></div></div>` : ''}</div>`; };
  return `<section class="cambios" id="cambios" aria-label="Cambios propuestos por el agente">
    <div class="cc"><b>Cambios propuestos por el agente</b><span>${de}</span></div>
    ${cambios.map(cb).join('')}${plazos.map(pz).join('')}
    ${cambios.length ? `<div class="acc"><button class="pb prim" data-action="prop-aplicar"${n ? '' : ' disabled'}>Aplicar ${plural(n, 'cambio', 'cambios')}</button><button class="pb" data-action="prop-descartar">Descartar</button></div>` : ''}
  </section>`;
}
// Lo aplicado en esta sesión se resalta en la Ficha (pendientes en verde, hechos con marca)
function recienAplicados(e) {
  const ids = new Set(propState(e).nuevos), hist = e.memoria.historial.filter(h => ids.has(h.id) && !h.deshecho);
  return { items: new Set(hist.filter(h => h.itemId).map(h => h.itemId)), hechos: hist.filter(h => h.seccion === 'hechos').map(h => h.despues) };
}
function marcarNuevos(texto, nuevos) {
  let html = esc(texto);
  for (const t of nuevos) { const x = esc(t.trim()), i = html.lastIndexOf(x); if (x && i >= 0) html = html.slice(0, i) + `<mark>${x}</mark>` + html.slice(i + x.length); }
  return html;
}
// Aviso inferior con "Deshacer" (como el prototipo); los demás avisos siguen arriba
let avisoT = null, avisoFn = null;
function aviso(txt, deshacer) {
  $('#aviso')?.remove(); clearTimeout(avisoT); avisoFn = deshacer || null;
  $('#v6')?.insertAdjacentHTML('beforeend', `<div class="aviso" id="aviso" role="status"><span>${esc(txt)}</span>${deshacer ? '<button data-action="aviso-deshacer">Deshacer</button>' : ''}</div>`);
  avisoT = setTimeout(() => { $('#aviso')?.remove(); avisoFn = null; }, 5000);
}
// Después de un cambio en las propuestas: ficha, barra, encabezado y la línea del hilo (sin volver a pintar la conversación)
function refreshProps() {
  refreshExp();
  const l = $('#prop-linea'); if (l && S.vista === 'chat') { const n = propLineaHTML(S.exp, activeChat(S.exp)); if (n) l.outerHTML = n; else l.remove(); }
}
function revisarCambios() {
  abrirFicha(); Object.assign(S, { fichaModo: 'ficha', fichaTab: 'ficha' }); renderFicha(); layout();
  const c = $('#cambios'); if (!c) return;
  c.scrollIntoView({ block: 'center' }); c.classList.add('foco'); setTimeout(() => c.classList.remove('foco'), 1600);
}
function focoCambios() { ($('#cambios button:not([disabled])') || $('#fcuerpo'))?.focus({ preventScroll: true }); }
async function aplicarCambios(descartar = false) {
  const e = S.exp, st = propState(e), lote = propPend(e).filter(p => p.tipo !== 'plazo');
  const si = descartar ? [] : lote.filter(p => st.sel[p.id] !== false);
  lote.forEach(p => { if (si.includes(p)) st.nuevos.push(aplicarPropuesta(e, p).id); else p.estado = 'descartada'; });
  st.sel = {}; await saveExp(); refreshProps(); focoCambios();
  aviso(descartar ? 'Cambios descartados' : `Memoria actualizada · ${plural(si.length, 'cambio', 'cambios')}`, async () => {
    const no = lote.filter(p => !revertirPropuesta(e, p));
    await saveExp(); refreshProps();
    if (no.length) toast(`${plural(no.length, 'cambio no se deshizo porque', 'cambios no se deshicieron porque')} editaste esa parte de la memoria después.`, true);
  });
}
async function confirmarPlazo(id) {
  const e = S.exp, st = propState(e), p = e.memoria.propuestas.find(x => x.id === id); if (!p || p.estado !== 'pendiente') return;
  st.confirmar = null; st.nuevos.push(aplicarPropuesta(e, p).id); await saveExp(); refreshProps(); focoCambios();
  aviso(`Plazo confirmado: ${ddmm(p.fecha)} · ${lcFirst(p.despues)}`, async () => { revertirPropuesta(e, p); await saveExp(); refreshProps(); });
}
// Línea del hilo: lo que propuso el agente en esta conversación, o lo ya aplicado, o "Actualizar memoria" a mano
function propLineaHTML(e, c) {
  const msgs = c.mensajes, last = msgs[msgs.length - 1]; if (!last || S.sending) return '';
  const props = e.memoria.propuestas.filter(p => p.chatId === c.id), pend = props.filter(p => p.estado === 'pendiente');
  const cambios = pend.filter(p => p.tipo !== 'plazo').length, plazos = pend.length - cambios;
  if (cambios) return `<div class="prop" id="prop-linea"><span>El agente propone <b>${plural(cambios, 'cambio', 'cambios')}</b> en la memoria${plazos ? ` y <b>${plural(plazos, 'plazo', 'plazos')}</b> por confirmar` : ''}</span><button data-action="revisar-cambios">Revisar en la ficha →</button></div>`;
  const ult = props.reduce((a, p) => p.at > a ? p.at : a, ''), lote = props.filter(p => p.at === ult), aplic = lote.filter(p => p.estado === 'aplicada').length;
  const ultResp = [...msgs].reverse().find(m => m.role === 'assistant')?.at || '';
  if (aplic && ult >= ultResp) return `<div class="prop hecho" id="prop-linea"><span>✓ ${plural(aplic, 'cambio aplicado', 'cambios aplicados')} a la memoria${plazos ? ` · falta confirmar ${plural(plazos, 'plazo', 'plazos')}` : ''}</span><button data-action="revisar-cambios">Ver en la ficha →</button></div>`;
  if (plazos) return `<div class="prop" id="prop-linea"><span>El agente propone <b>${plural(plazos, 'plazo', 'plazos')}</b> por confirmar</span><button data-action="revisar-cambios">Revisar en la ficha →</button></div>`;
  return isReady(S.settings) && last.role === 'assistant' ? `<div class="prop" id="prop-linea"><span>¿Algo de esto debe quedar en la memoria del caso?</span><button data-action="propose-memory" title="El agente propone cambios a la memoria; tú decides cuáles guardar">Actualizar memoria</button></div>` : '';
}
function fdocsHTML() {
  const e = S.exp, leidos = docsLeidos(e);
  const docs = [...e.docs].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  const tipo = d => d.type === 'pdf' ? 'PDF' : d.type === 'docx' ? 'DOC' : 'TXT';
  const det = d => d.borrador ? `<small>guardado desde la conversación · ${d.addedAt === todayISO() ? 'hoy' : ddmm(d.addedAt)}</small>`
    : !leidos.has(d.name) ? '<small class="w">el agente aún no lo leyó</small>'
    : `<small>${d.type === 'pdf' ? `${plural(d.pages || 0, 'página', 'páginas')} · ` : ''}${ddmm(d.addedAt)}</small>`;
  return `<div class="panel" data-drop>
    ${docs.length ? `<div>${docs.map(d => `<button class="li" data-action="view-doc" data-id="${d.id}"><span class="doc-ic">${tipo(d)}</span><span>${esc(d.name)}${det(d)}</span></button>`).join('')}</div>`
      : '<div class="sin">Sin documentos. Agrega la demanda, resoluciones o escritos clave para que el agente pueda citarlos. El texto se extrae en tu equipo y se guarda cifrado.</div>'}
    <div class="row" style="gap:6px"><button class="pb" data-action="pick-file">${ic('mas')}Agregar documento</button>${docsConTexto(e).length ? `<button class="pb" data-action="nueva-tabla">${ic('tabla')}Revisar en una tabla</button>` : ''}</div>
  </div>`;
}
function fmovsHTML() {
  const all = sortedMovs(S.exp), movs = S.movsAll ? all : all.slice(0, MOVS_LIMIT);
  return `<div class="panel">
    ${all.length ? `<div>${movs.map(v => `<div class="li"><span class="num">${esc(fmtDate(v.fecha))}</span><span>${esc(v.acto)}${v.sumilla ? `<small>${esc(v.sumilla)}</small>` : ''}</span></div>`).join('')}</div>${all.length > movs.length ? `<button class="pb" data-action="movs-all">Ver anteriores (${all.length - movs.length})</button>` : ''}`
      : '<div class="sin">Sin movimientos. Copia el seguimiento desde la consulta del CEJ y pégalo: el agente lo ordena. Folio no se conecta al CEJ por ti.</div>'}
    <button class="pb" data-action="paste-cej">Pegar desde el CEJ</button>
  </div>`;
}
function fuenteHTML() {
  const { norma, n } = S.fuente || {}, a = norma && Lib.article(norma, n), m = a && Lib.meta(norma);
  if (!a) return '<div class="panel fuente"><div class="sin">Ese artículo no está en tu biblioteca.</div></div>';
  const last = (a.historial || []).slice(-1)[0];
  const [cls, icono, txt] = a.derogado ? ['bad', 'cerrar', 'Derogado'] : a.reubicadoEn ? ['warn', 'aviso', `Reubicado y renumerado: hoy es el art. ${a.reubicadoEn}`]
    : a.proximo ? ['warn', 'aviso', `Tiene un cambio que rige desde el ${fmtDate(a.proximo.vigenteDesde)}`]
    : ['', 'check', last ? `Vigente desde el ${fmtDate(last.vigenteDesde || last.publicada)} (${last.norma})` : 'Vigente'];
  const corte = m?.actualizadoAl || Lib.manifest.actualizadoAl;
  return `<div class="panel fuente">
    <div class="bloque">
      <span class="lbl">Fuente citada</span>
      <h3>Art. ${esc(a.n)} · ${esc(m?.titulo || norma)}</h3>
      ${a.titulo || a.ubicacion ? `<span class="ubi">${esc([a.titulo, a.ubicacion].filter(Boolean).join(' · '))}</span>` : ''}
      <span class="vig${cls ? ' ' + cls : ''}">${ic(icono, 'width:13px;height:13px')}${esc(txt)}</span>
    </div>
    ${a.reubicadoEn ? `<a href="#" data-action="ver-articulo" data-norma="${esc(norma)}" data-n="${esc(a.reubicadoEn)}">Ver el artículo ${esc(a.reubicadoEn)} →</a>` : ''}
    <div class="texto-ley">${esc(a.texto)}</div>
    ${a.proximo ? `<div class="bloque"><span class="lbl">Cambio que aún no rige · ${esc(a.proximo.norma)}</span><div class="texto-ley">${esc(a.proximo.texto)}</div></div>` : ''}
    <p class="nota">Texto tomado del SPIJ, actualizado al <span class="num">${esc(fmtDate(corte))}</span>. La biblioteca de Folio no es una edición oficial: verifica en la fuente antes de usar el artículo en un escrito.${m?.fuenteOficial ? ` <a href="${esc(m.fuenteOficial)}" target="_blank" rel="noopener noreferrer">Verificar en la fuente oficial</a>.` : ''}</p>
  </div>`;
}
function borradorHTML() {
  const m = activeChat(S.exp).mensajes[S.borrador];
  if (!m || m.role !== 'assistant') return '<div class="panel"><div class="sin">No se encontró el borrador en esta conversación.</div></div>';
  const html = md(m.content).replace(/<p>(\s*(?:<strong>)?sumilla\s*:)/i, '<p class="sum">$1').replace(/\[([^\]\n<>]{2,160})\]/g, '<span class="hueco">[$1]</span>');
  return `<div class="panel">
    <div class="bloque"><span class="lbl">Borrador del agente · revísalo antes de usarlo</span><h3 style="margin:0;font-size:17px;font-weight:500">${esc(borrTitulo(m))}</h3></div>
    <div class="escrito">${html}</div>
    <div class="borr-acc"><button class="pb prim" data-action="borr-guardar"${m.guardado ? ' disabled' : ''}>${m.guardado ? 'Guardado en Documentos' : 'Guardar como documento'}</button><button class="pb" data-action="borr-copiar">Copiar</button><button class="pb" data-action="borr-pedir">Pedir cambios en la conversación</button></div>
    <p class="nota">Borrador de apoyo: la redacción final, la verificación de normas y plazos, y la firma son tuyas.</p>
  </div>`;
}
/* ---------- Biblioteca legal peruana (E8) ---------- */
function libStatusHTML() {
  if (!Lib.installed()) return `<button class="libstat off" data-action="open-settings" title="Descarga la biblioteca legal para que el agente cite normas peruanas vigentes">Sin biblioteca legal</button>`;
  const age = Lib.ageDays(); const cls = age >= NORMAS_STALE_WARN ? 'warn' : '';
  return `<span class="libstat ${cls}" title="${age >= NORMAS_STALE_WARN ? `La biblioteca tiene ${age} días sin actualizarse: puede no incluir cambios recientes.` : 'Textos de normas peruanas en tu equipo'}">Normas al ${esc(fmtDate(Lib.manifest.actualizadoAl))}</span>`;
}
function showArticle(id, n) {
  const a = Lib.article(id, n), m = Lib.meta(id); if (!a) return toast('Ese artículo no está en tu biblioteca.', true);
  const hist = (a.historial || []).map(h => `<li>${esc(h.norma)}${h.publicada ? `, publicada el ${esc(fmtDate(h.publicada))}` : ''}${h.vigenteDesde ? `, vigente desde ${esc(fmtDate(h.vigenteDesde))}` : ''}</li>`).join('');
  openDialog({ title: `${m?.titulo || id} · artículo ${a.n}`, wide: true, body: `
    ${a.ubicacion ? `<p class="small muted">${esc(a.ubicacion)}</p>` : ''}
    ${a.derogado ? '<div class="note danger"><p>Este artículo figura como <strong>derogado</strong>.</p></div>' : ''}
    ${a.reubicadoEn ? `<div class="note warn"><p>Este artículo fue <strong>reubicado y renumerado</strong>: su contenido hoy es el <a href="#" data-action="ver-articulo" data-norma="${esc(id)}" data-n="${esc(a.reubicadoEn)}">artículo ${esc(a.reubicadoEn)}</a>.</p></div>` : ''}
    ${a.titulo ? `<h3 style="margin:.4rem 0">${esc(a.titulo)}</h3>` : ''}
    <div class="payload" style="font-family:var(--ui);font-size:.95rem">${esc(a.texto)}</div>
    ${a.proximo ? `<div class="note warn" style="margin-top:1rem"><p><strong>Cambio que aún no rige</strong> (desde ${esc(fmtDate(a.proximo.vigenteDesde))}, ${esc(a.proximo.norma)}):</p><p style="white-space:pre-wrap">${esc(a.proximo.texto)}</p></div>` : ''}
    ${hist ? `<p class="payload-label">Modificaciones</p><ul class="small">${hist}</ul>` : ''}
    <p class="small muted" style="margin-top:1rem">Texto de tu biblioteca legal, actualizada al ${esc(fmtDate(Lib.manifest.actualizadoAl))}. Folio no es una edición oficial.${m?.fuenteOficial ? ` <a href="${esc(m.fuenteOficial)}" target="_blank" rel="noopener noreferrer">Verificar en la fuente oficial</a>.` : ''}</p>`,
    foot: `<button class="btn" data-action="dlg-close">Cerrar</button>` });
}
function normasSettingsHTML() {
  const s = S.settings;
  const head = `<div class="sheet-head"><h3>Biblioteca legal peruana</h3>${Lib.installed() ? libStatusHTML() : ''}</div>`;
  if (!Lib.installed()) return `${head}<p class="hint">Textos vigentes de la Constitución, los códigos y las leyes principales. Con ella, el agente cita normas peruanas actualizadas y Folio verifica cada cita. Menos de 1 MB desde el sitio público del proyecto; las búsquedas se hacen en tu equipo.</p>
    <div class="row"><button class="btn primary sm" data-action="normas-install">Descargar biblioteca</button><span id="normas-status" class="small muted"></span></div>`;
  const rows = Lib.manifest.normas.filter(n => Lib.normas[n.id]).map(n => `<tr><td>${esc(n.titulo)}${n.parcial ? `<br><span class="small" style="color:var(--warn)">Incompleta: ${esc(n.parcial)}</span>` : ''}</td><td class="mono">${esc(fmtDate(n.actualizadoAl || Lib.manifest.actualizadoAl))}</td><td>${Lib.normas[n.id].articulos.length.toLocaleString('es-PE')}</td></tr>`).join('');
  const age = Lib.ageDays();
  return `${head}<p class="hint">Textos al ${esc(fmtDate(Lib.manifest.actualizadoAl))}${age > 0 ? ` (hace ${age} día${age === 1 ? '' : 's'})` : ''}. Folio no es una edición oficial: verifica cada artículo en la fuente oficial antes de usarlo.</p>
    ${age >= NORMAS_STALE_WARN ? `<div class="note warn" style="margin-bottom:1rem"><p>La biblioteca tiene ${age} días sin actualizarse. Pulsa “Buscar actualización”.</p></div>` : ''}
    <div class="table-wrap"><table class="audit"><thead><tr><th>Norma</th><th>Actualizada al</th><th>Artículos</th></tr></thead><tbody>${rows}</tbody></table></div>
    <label class="switch" style="margin:1rem 0 .6rem"><input type="checkbox" data-setting="legalPlanner" ${s.legalPlanner !== false ? 'checked' : ''}><span><strong>Búsqueda legal asistida</strong><br><span class="small muted">Antes de responder, el agente indica qué artículos leer (una consulta corta extra a tu proveedor) y Folio los busca en tu equipo.</span></span></label>
    <label class="switch" style="margin-bottom:1rem"><input type="checkbox" data-setting="normasAuto" ${s.normasAuto !== false ? 'checked' : ''}><span><strong>Actualizar la biblioteca automáticamente</strong><br><span class="small muted">Revisa si hay textos nuevos al abrir Folio, como máximo dos veces al día.</span></span></label>
    <div class="row"><button class="btn sm" data-action="normas-install">Buscar actualización</button><button class="btn ghost sm" data-action="normas-changes">Ver cambios recientes</button><button class="btn ghost sm danger" data-action="normas-remove">Eliminar biblioteca</button><span id="normas-status" class="small muted"></span></div>`;
}
function refreshNormasUI() { const sec = $('#normas-section'); if (sec) sec.innerHTML = normasSettingsHTML(); if (S.vista === 'chat' || S.vista === 'inicio') { renderCentro(); renderFicha(); } }
async function installNormas(quiet = false) {
  const st = () => $('#normas-status');
  try {
    if (st()) st().textContent = 'Conectando…';
    const r = await updateNormas(msg => { if (st()) st().textContent = msg; });
    S.settings.normasLastCheck = Date.now(); await saveSettings();
    refreshNormasUI();
    if (r.firstInstall) toast(`Biblioteca legal descargada: textos al ${fmtDate(r.manifest.actualizadoAl)}.`);
    else toast(r.changes.length ? `Biblioteca actualizada al ${fmtDate(r.manifest.actualizadoAl)}: ${r.changes.length} artículo${r.changes.length === 1 ? ' cambió' : 's cambiaron'}.` : `Tu biblioteca ya está al día (textos al ${fmtDate(r.manifest.actualizadoAl)}).`);
  } catch (e) { if (st()) st().textContent = ''; if (quiet) toast('No se pudo descargar la biblioteca legal. Puedes intentarlo desde Ajustes.', true); else fail(e); }
}
async function maybeUpdateNormas() {
  const s = S.settings; if (!s || s.normasAuto === false || !Lib.installed()) return;
  if (Date.now() - (s.normasLastCheck || 0) < UPDATE_EVERY_MS) return;
  const r = await updateNormas().catch(() => null);
  if (!S.settings) return;
  S.settings.normasLastCheck = Date.now(); await saveSettings();
  if (r?.changes.length) { refreshNormasUI(); toast(`Biblioteca legal actualizada al ${fmtDate(r.manifest.actualizadoAl)}: ${r.changes.length} artículo${r.changes.length === 1 ? ' cambió' : 's cambiaron'}. Míralos en Ajustes.`); }
}
async function confirmRemoveNormas() {
  if (!(await askDialog({ title: 'Eliminar biblioteca legal', ok: 'Eliminar', danger: true, body: '<p>El agente dejará de recibir textos de normas y Folio no podrá verificar citas. Tus expedientes no se tocan. Puedes volver a descargarla cuando quieras.</p>' }))) return;
  await removeNormas(); refreshNormasUI(); toast('Biblioteca legal eliminada.');
}
async function showNormasChanges() {
  const log = await NDB.get('changes') || [];
  const T = { modificado: 'Modificado', nuevo: 'Nuevo', derogado: 'Derogado' };
  openDialog({ title: 'Cambios recientes en tu biblioteca', wide: true, body: log.length
    ? `<div class="table-wrap"><table class="audit"><thead><tr><th>Corte</th><th>Norma</th><th>Artículo</th><th>Cambio</th></tr></thead><tbody>${log.slice(0, 100).map(c => `<tr><td class="mono">${esc(fmtDate(c.corte))}</td><td>${esc(Lib.meta(c.norma)?.corto || c.norma)}</td><td>${Lib.article(c.norma, c.n) ? `<a href="#" data-action="ver-articulo" data-norma="${esc(c.norma)}" data-n="${esc(c.n)}">${esc(c.n)}</a>` : esc(c.n)}</td><td>${esc(T[c.tipo] || c.tipo)}</td></tr>`).join('')}</tbody></table></div>`
    : '<p>Todavía no hay cambios registrados. Aparecerán aquí cuando la biblioteca se actualice.</p>', foot: `<button class="btn" data-action="dlg-close">Cerrar</button>` });
}

/* ---------- Aviso de nueva versión (no bloquea el trabajo) ---------- */
function pendingUpdate() { const k = S.settings?.updateKnown; return k && cmpVersion(k.version, APP.version) > 0 ? k : null; }
function updateBarHTML() {
  const k = pendingUpdate(); if (!k || S.updateHidden) return '';
  return `<div class="update-bar" role="status"><span><strong>Hay una nueva versión de Folio: v${esc(k.version)}.</strong> <span class="muted">Puedes seguir trabajando y actualizar cuando quieras; tus expedientes se mantienen.</span></span>
    <span class="row" style="flex-wrap:nowrap"><button class="btn primary sm" data-action="update-how">Actualizar</button><button class="btn ghost sm" data-action="update-later">Más tarde</button></span></div>`;
}
async function maybeCheckUpdate(force = false) {
  const s = S.settings; if (!s || (!s.updateCheck && !force)) return null;
  if (!force && Date.now() - (s.updateLastCheck || 0) < UPDATE_EVERY_MS) return pendingUpdate();
  const rel = await fetchLatestRelease();
  if (!S.settings) return null; // se bloqueó mientras consultaba
  S.settings.updateLastCheck = Date.now();
  if (rel) S.settings.updateKnown = rel;
  await saveSettings();
  if (S.screen === 'app' && !S.updateHidden && !!pendingUpdate() !== !!$('.update-bar')) render();
  return rel;
}
function showUpdateHow() {
  const k = pendingUpdate(); if (!k) return;
  openDialog({ title: `Actualizar a Folio v${esc(k.version)}`, body: `<p>Tus expedientes no están dentro del archivo: se guardan cifrados en este navegador. Por eso el archivo nuevo los encuentra al abrirlo.</p>
    <ol class="update-steps">
      <li><strong>Por precaución, descarga una copia de seguridad.</strong><br><button class="btn sm" data-action="export-backup" style="margin-top:.4rem">Descargar copia de seguridad</button></li>
      <li><strong>Descarga el nuevo archivo.</strong><br><a class="btn primary sm" style="margin-top:.4rem" href="${esc(k.file)}" target="_blank" rel="noopener noreferrer">Descargar folio.html v${esc(k.version)}</a> <a class="small" href="${esc(k.page)}" target="_blank" rel="noopener noreferrer">Ver novedades</a></li>
      <li><strong>Cierra esta pestaña y abre el archivo nuevo con doble clic</strong>, en el mismo navegador de siempre. Desbloquéalo con tu contraseña de siempre.</li>
    </ol>
    <div class="note"><p>En Chrome y Edge tus expedientes aparecen aunque el archivo nuevo esté en otra carpeta (por ejemplo, Descargas). En Firefox, guarda el archivo nuevo reemplazando el anterior. Si no ves tus expedientes, restaura la copia desde Ajustes → Copia de seguridad.</p></div>`,
    foot: `<button class="btn" data-action="dlg-close">Seguir trabajando</button>` });
}
function emptyHTML() {
  return `<div class="empty"><div class="stamp ${S.stampPress ? 'press' : ''}" style="margin-bottom:2rem"><b>Guardado solo en este equipo</b><span>Bóveda abierta</span></div>
    <h1>Crea tu primer expediente</h1>
    <p class="lead">Arrastra la última resolución o cédula que te llegó y Folio llena los datos por ti. También puedes llenarlo a mano. Cada expediente tiene su propia memoria y el agente la lee antes de responder.</p>
    ${!isReady(S.settings) ? `<div class="note warn"><p>Aún no conectas un proveedor de IA. Puedes registrar expedientes igual y conectarlo cuando quieras.</p><button class="btn sm" data-action="open-settings">Conectar proveedor</button></div>` : ''}
    <div class="row"><button class="btn primary" data-action="new-exp">Nuevo expediente</button><button class="btn" data-action="load-sample">Probar con un expediente de ejemplo</button></div>
    <p class="tiny muted" style="margin-top:1rem">El ejemplo usa datos ficticios.</p></div>`;
}
/* ---------- Memoria: lo que el abogado escribió o aprobó (spec v0.5 §5.2) ---------- */
function memHTML() {
  const e = S.exp, m = e.memoria, pseudo = S.settings.pseudo;
  const plazos = [...m.plazos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const canPropose = isReady(S.settings) && activeChat(e).mensajes.some(x => x.role === 'assistant');
  return `<div class="mem">
    <div class="mem-note">${ico('check')}<p>Todo lo que está aquí lo escribiste o aprobaste tú. El agente lo lee antes de cada respuesta.</p>${canPropose ? '<button class="btn sm" data-action="propose-memory" title="El agente propone cambios a partir de la conversación; tú decides cuáles guardar">Actualizar desde la conversación</button>' : ''}</div>
    <section class="mem-sec"><h2 class="eyebrow">Situación actual</h2>
      <label class="dfield"><span>Estado procesal</span><input class="docfield" data-bind="estado" value="${esc(e.estado)}" placeholder="Ej.: demanda admitida, pendiente audiencia única"></label>
      <label class="dfield"><span>Resumen del caso</span><textarea class="docfield" data-bind="memoria.resumen" rows="2" placeholder="Qué se pide, a favor de quién y por qué">${esc(m.resumen)}</textarea></label></section>
    <div class="mem-cols">
      <section class="mem-sec"><h2 class="eyebrow" id="h-hechos">Hechos clave</h2><p class="sec-sub">Lo que consta en el expediente</p>
        <textarea class="docfield" data-bind="memoria.hechos" rows="3" aria-labelledby="h-hechos" placeholder="Hechos relevantes y sus fechas">${esc(m.hechos)}</textarea></section>
      <section class="mem-sec strategy"><h2 class="eyebrow" id="h-estrategia">Estrategia</h2><p class="sec-sub">Tu criterio y próximos pasos</p>
        <textarea class="docfield" data-bind="memoria.estrategia" rows="3" aria-labelledby="h-estrategia" placeholder="Tu teoría del caso y próximos pasos">${esc(m.estrategia)}</textarea></section>
    </div>
    <div class="mem-cols">
      <section class="mem-sec"><h2 class="eyebrow">Plazos</h2><p class="sec-sub">Registra el vencimiento que confirmaste con la resolución y tu notificación SINOE.</p>
        <ul class="list">${plazos.map(p => `<li><input type="checkbox" aria-label="Marcar cumplido" data-action="toggle-plazo" data-id="${p.id}" ${p.done ? 'checked' : ''}><span><span class="date">${esc(fmtDate(p.fecha))}</span> ${deadlineChip(p.fecha, p.done)}<br><span class="${p.done ? 'done' : ''}">${esc(p.desc)}</span></span><button class="iconbtn" aria-label="Eliminar plazo" data-action="del-plazo" data-id="${p.id}">✕</button></li>`).join('') || '<li class="list-empty">Sin plazos registrados.</li>'}</ul>
        <div class="addrow"><input class="input mono" type="date" id="nplazo-f" aria-label="Fecha de vencimiento"><input class="input" id="nplazo-d" placeholder="Qué vence" aria-label="Descripción del plazo"><button class="btn sm" data-action="add-plazo">Agregar</button></div></section>
      <section class="mem-sec"><h2 class="eyebrow">Pendientes</h2><p class="sec-sub">Tareas del caso para ti o tu equipo.</p>
        <ul class="list">${m.pendientes.map(p => `<li><input type="checkbox" aria-label="Marcar hecho" data-action="toggle-pend" data-id="${p.id}" ${p.done ? 'checked' : ''}><span class="${p.done ? 'done' : ''}">${esc(p.text)}</span><button class="iconbtn" aria-label="Eliminar pendiente" data-action="del-pend" data-id="${p.id}">✕</button></li>`).join('') || '<li class="list-empty">Sin pendientes.</li>'}</ul>
        <div class="addrow"><input class="input" id="npend" placeholder="Nuevo pendiente" aria-label="Nuevo pendiente"><button class="btn sm" data-action="add-pend">Agregar</button></div></section>
    </div>
    <section class="mem-sec"><div class="sec-head"><h2 class="eyebrow">Datos protegidos antes de consultar a la IA</h2><span class="chip ${pseudo ? 'ok' : 'soon'}">${pseudo ? 'Reemplazo activado' : 'Reemplazo desactivado en Ajustes'}</span></div>
      <p class="sec-sub">Antes de cada envío, Folio cambia estos nombres y documentos por el marcador. El proveedor de IA ve <span class="tok">[PERSONA_1]</span>, no el nombre.</p>
      <div class="table-wrap"><table class="partes-table"><thead><tr><th>Nombre completo</th><th>Rol</th><th>Documento</th><th>Cliente</th><th>Se envía como</th><th><span class="sr-only">Quitar</span></th></tr></thead><tbody>
      ${e.partes.map(p => `<tr><td>${esc(p.nombre)}</td><td>${esc(p.rol)}</td><td class="mono">${esc(p.doc || '—')}</td><td><input type="checkbox" aria-label="Es mi cliente" data-action="toggle-cliente" data-id="${p.id}" ${p.esCliente ? 'checked' : ''}></td><td>${pseudo ? `<span class="tok">[${esc(p.tok)}]</span>` : '<span class="chip soon">Sin reemplazo</span>'}</td><td><button class="iconbtn" aria-label="Quitar a ${esc(p.nombre)}" data-action="del-parte" data-id="${p.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="6" class="small muted">Agrega las partes para que el agente las identifique sin ver sus datos reales.</td></tr>'}
      </tbody></table></div>
      <div class="addrow"><input class="input" id="nparte-n" placeholder="Nombres y apellidos" style="flex:2 1 14em" aria-label="Nombre de la parte"><select class="select" id="nparte-r" style="flex:1 1 9em" aria-label="Rol">${['Demandante', 'Demandado', 'Agraviado(a)', 'Imputado(a)', 'Tercero', 'Testigo', 'Otro'].map(r => `<option>${r}</option>`).join('')}</select><input class="input mono" id="nparte-d" placeholder="DNI o RUC" style="flex:1 1 8em" aria-label="Documento"><label class="row small" style="flex:0 0 auto"><input type="checkbox" id="nparte-c"> Mi cliente</label><button class="btn sm" data-action="add-parte">Agregar</button></div></section>
  </div>`;
}

/* ---------- Movimientos: línea de tiempo por mes (spec v0.5 §5.3) ---------- */
const MOVS_LIMIT = 30;
function sortedMovs(e) { return [...e.movimientos].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')); }
function movItemHTML(v, latest, del = true) {
  return `<li class="${latest ? 'latest' : ''}"><div class="mv-top"><span class="when">${esc(fmtDate(v.fecha))}</span>${del ? `<button class="iconbtn" aria-label="Eliminar movimiento" data-action="del-mov" data-id="${v.id}">✕</button>` : ''}</div><div class="acto">${esc(v.acto)}</div>${v.sumilla ? `<div class="sum">${esc(v.sumilla)}</div>` : ''}</li>`;
}
function movsHTML() {
  const all = sortedMovs(S.exp), movs = S.movsAll ? all : all.slice(0, MOVS_LIMIT);
  const groups = []; let cur = null;
  movs.forEach(v => { const k = v.fecha ? v.fecha.slice(0, 7) : ''; if (!cur || cur.k !== k) groups.push(cur = { k, items: [] }); cur.items.push(v); });
  const label = k => k ? `${MESES[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}` : 'Sin fecha';
  return `<div class="pane-head"><div><h2 class="eyebrow">Movimientos del expediente</h2><p class="sec-sub">Copia el seguimiento desde la consulta del CEJ y pégalo: el agente lo ordena. Folio no se conecta al CEJ por ti.</p></div>
      <div class="row"><button class="btn primary sm" data-action="paste-cej">Pegar desde el CEJ</button><button class="btn sm" data-action="add-mov">Agregar movimiento</button></div></div>
    ${all.length ? groups.map((g, gi) => `<h3 class="tl-month">${label(g.k)}</h3><ol class="timeline">${g.items.map((v, i) => movItemHTML(v, gi === 0 && i === 0)).join('')}</ol>`).join('')
      + (all.length > movs.length ? `<button class="btn sm" data-action="movs-all">Ver anteriores (${all.length - movs.length})</button>` : '')
      : '<p class="muted">Sin movimientos. Agrega el primero o pega el seguimiento del CEJ.</p>'}`;
}

async function addFiles(files) {
  const e = S.exp; if (!e) return;
  for (const f of files) {
    if (f.size > 40 * 1024 * 1024) { toast(`${f.name} supera 40 MB; divídelo antes de cargarlo.`, true); continue; }
    toast(`Leyendo ${f.name} en tu equipo…`);
    try {
      const r = await extractText(f); const id = uid(); const text = r.text.slice(0, 1500000);
      await store.put('doc:' + id, { id, expId: e.id, name: f.name, text });
      S.docTexts[id] = text;
      e.docs.push({ id, name: f.name, type: r.type, pages: r.pages, chars: text.length, addedAt: todayISO(), scanned: !!r.scanned });
      await saveExp(); refreshExp();
      toast(r.scanned ? `${f.name}: casi no tiene texto. Puede ser un escaneo.` : `${f.name} agregado.`, !!r.scanned);
      if (!r.scanned) await datosNuevosDe(e, f.name, text);
    } catch (err) { fail(err); }
  }
}
/* ============================================================
   Agente
   ============================================================ */
/* Acciones rápidas según el expediente (spec v0.5 §6): si un plazo vence en 7 días o menos, va primero */
function quickActions(e) {
  const next = nextPlazos(e).find(p => daysUntil(p.fecha) >= 0), acts = [];
  if (next && daysUntil(next.fecha) <= 7) acts.push([`Preparar: ${trunc(next.desc, 32)}`, `Ayúdame a preparar lo que vence el ${fmtDate(next.fecha)}: ${next.desc}. Indica qué debo presentar o hacer, qué revisar antes y en qué orden. Recuérdame verificar la fecha con la resolución y mi notificación.`]);
  acts.push(['Resumir expediente', 'Resume el expediente en pocas líneas: qué se discute, en qué etapa está y qué viene.']);
  if (acts.length === 1) acts.push(['Preparar próximos plazos', '¿Qué plazos tengo registrados y qué debería preparar para cada uno?']);
  acts.push(['Analizar riesgos', 'Identifica los puntos débiles y riesgos de mi posición, y cómo mitigarlos.']);
  acts.push(['Preparar borrador', 'Prepara un borrador de escrito para: ', true]);
  return acts;
}
/* ---------- Conversación: hilo en la columna de lectura (prototipo v0.6) ---------- */
function chatHTML() {
  const e = S.exp, c = activeChat(e), msgs = c.mensajes;
  if (!msgs.length) return `<div class="col hilo" id="hilo">${parteDeHTML(e, c)}</div>`;
  return `<div class="col hilo" id="hilo">${msgs.map(msgHTML).join('')}${propLineaHTML(e, c)}</div>`;
}
/* Conversación nueva: lo que el agente ya sabe, calculado en el equipo (no gasta consultas) */
function parteDeHTML(e, c) {
  const next = nextPlazos(e)[0], prev = c.deChat && e.chats.find(x => x.id === c.deChat);
  const una = s => trunc(String(s || '').replace(/\s+/g, ' ').trim(), 160);
  const rows = [['Estado', e.estado || 'sin registrar'], ['Estrategia', una(e.memoria.estrategia) || 'sin registrar'],
    prev?.resumen ? ['Resumen anterior', una(prev.resumen)] : ['Próximo plazo', next ? `${fmtDate(next.fecha)}, ${next.desc}` : 'ninguno registrado']];
  S.quick = isReady(S.settings) ? quickActions(e).slice(0, 3) : [];
  return `${prev ? `<div class="continua">${ic('flecha')}<span>Continúa de <a href="#" data-action="open-chat" data-id="${prev.id}">«${esc(prev.titulo || 'Conversación anterior')}»</a> · ${(n => n ? `Folio guardó un resumen · ${plural(n, 'cambio', 'cambios')} de memoria por revisar en la ficha` : 'Folio guardó un resumen y la memoria está al día')(propPend(e, prev.id).length)}</span></div>` : ''}
    <div class="ya"><span class="lbl">El agente parte de</span>${rows.map(([k, v]) => `<div class="r"><span>${k}</span><span>${esc(v)}</span></div>`).join('')}</div>
    ${S.quick.length ? `<div class="atajos">${S.quick.map(([l], i) => `<button class="atajo" data-action="quick" data-i="${i}">${esc(l)}</button>`).join('')}</div>` : ''}`;
}
const PLAZO_RE = /\bplazos?\b|d[ií]as\s+h[aá]biles|\bvence\b|\bvencimiento/i;
const ESCRITO_RE = /^\s*(?:\*\*)?sumilla\s*:|señor(?:a)?\s+juez|\bpetitorio\b/im;
function msgHTML(m, i) {
  if (m.role === 'user') return `<div class="yo">${esc(m.content)}</div>`;
  if (m.role === 'error') return `<div class="err-msg" role="alert">${esc(m.content)}</div>`;
  const { html, resto } = citasEnLinea(md(m.content), m.citas);
  const viejo = m.citas?.age >= NORMAS_STALE_ALERT ? `<div class="verif">${ic('aviso')}<span>Tu biblioteca legal tiene ${m.citas.age} días sin actualizarse: puede no incluir cambios recientes.</span></div>` : '';
  const plazo = PLAZO_RE.test(m.content) ? `<div class="verif">${ic('aviso')}<span>Folio no calcula plazos: verifica la fecha en la resolución y en tu casilla antes de anotarlo.</span></div>` : '';
  return `<div class="resp">${leyoHTML(m)}${html}${resto ? `<div class="fichas">${resto}</div>` : ''}${plazo}${viejo}${ESCRITO_RE.test(m.content) ? borrHTML(m, i) : ''}${reciboHTML(m, i)}</div>`;
}
/* "Leyó la memoria, 2 documentos y 3 artículos ▸": se despliega con cada fuente */
function leyoHTML(m) {
  const t = m.meta; if (!t) return '';
  const docs = [...new Set(t.frags || [])], arts = t.normas || [];
  const partes = t.memoria === false ? [] : ['<u>la memoria</u>'];
  if (docs.length) partes.push(`<u>${plural(docs.length, 'documento', 'documentos')}</u>`);
  if (arts.length) partes.push(`<u>${plural(arts.length, 'artículo', 'artículos')}</u>`);
  if (!partes.length) return '';
  const lista = t.memoria === false ? [] : [`<span><b>Memoria:</b> ${t.secciones?.length ? esc(listaY(t.secciones)) : 'la del expediente'}</span>`];
  if (docs.length) lista.push(`<span><b>Documentos:</b> ${docs.map(esc).join(' · ')}</span>`);
  if (arts.length) {
    const por = {}; arts.forEach(s => { const [id, n] = s.split(' '); (por[id] = por[id] || []).push(n); });
    const txt = Object.entries(por).map(([id, ns]) => `${ns.length > 1 ? 'arts.' : 'art.'} ${listaY(ns)} del ${Lib.meta(id)?.titulo || id}`).join('; ');
    const corte = m.citas?.corte || Lib.manifest?.actualizadoAl;
    lista.push(`<span><b>Biblioteca:</b> ${esc(txt)}${corte ? ` (textos al <span class="num">${esc(fmtDate(corte))}</span>)` : ''}</span>`);
  }
  return `<button class="leyo" data-action="leyo" aria-expanded="false">Leyó ${listaY(partes)}<span> ▸</span></button><div class="leyo-lista" hidden>${lista.join('')}</div>`;
}
/* Citas en línea: cada chip va al final del párrafo o ítem que la menciona; las que no se ubican van debajo */
const CITA = { vigente: ['ok', '✓', 'Vigente en tu biblioteca'], porRegir: ['warn', '⚠', 'Tiene un cambio que aún no rige'], textoDistinto: ['warn', '⚠', 'La cita textual no coincide con el texto vigente'],
  derogado: ['bad', '✗', 'Derogado'], reubicado: ['warn', '⚠', 'Artículo reubicado y renumerado: cita el número actual'], noEncontrado: ['bad', '✗', 'No existe en tu biblioteca'], fuera: ['info', '○', 'No está en tu biblioteca: verifícala en el SPIJ'], extranjera: ['bad', '🌐', 'Norma de otro país'] };
const CITA_TXT = { vigente: 'vigente', porRegir: 'por regir', textoDistinto: 'texto distinto', derogado: 'derogado', reubicado: 'reubicado', noEncontrado: 'no existe', fuera: 'fuera de tu biblioteca', extranjera: 'de otro país' };
function citaChip(it, vistos) {
  const [cls, sym, tip] = CITA[it.estado] || CITA.fuera;
  const marca = vistos.has(it.estado) ? sym : `${sym} ${CITA_TXT[it.estado] || ''}`; vistos.add(it.estado);
  const title = esc(tip + (it.modificado ? `. Última modificación: ${fmtDate(it.modificado)}` : '')), c = `cita${cls === 'ok' ? '' : ' ' + cls}`;
  return it.norma && !it.norma.startsWith('fuera:') && it.estado !== 'noEncontrado'
    ? `<button class="${c}" data-action="ver-articulo" data-norma="${esc(it.norma)}" data-n="${esc(it.n)}" title="${title}">${esc(it.label)} <i>${esc(marca)}</i></button>`
    : `<span class="${c}" title="${title}">${esc(it.label)} <i>${esc(marca)}</i></span>`;
}
function citasEnLinea(html, citas) {
  if (!citas?.items?.length) return { html, resto: '' };
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  const bloques = [...tpl.content.querySelectorAll('p, li, h4')].map(el => [el, citeText(el.textContent)]);
  const vistos = new Set(), resto = [];
  for (const it of citas.items) {
    const chip = citaChip(it, vistos), b = it.raw && bloques.find(([, t]) => t.includes(it.raw));
    if (b) b[0].insertAdjacentHTML('beforeend', ' ' + chip); else resto.push(chip);
  }
  return { html: tpl.innerHTML, resto: resto.join('') };
}
/* Recibo: a quién se envió, con qué modelo de terceros y cuántos datos se reemplazaron */
function reciboHTML(m, i) {
  const t = m.meta; if (!t) return '';
  const modelo = OR_RECOMMENDED.find(r => r.id === t.model)?.name || String(t.model || '').split('/').pop();
  const donde = t.provider === 'custom' ? 'Procesado en tu servidor propio' : `Enviado a ${esc(provLabel(t.provider))} con tu cuenta`;
  return `<div class="recibo">${donde} · ${esc(modelo)} · ${t.pseudo ? plural(t.replaced, 'dato reemplazado', 'datos reemplazados') : 'sin reemplazo de datos'} · <button data-action="ver-envio" data-i="${i}">Ver lo que se envió</button></div>`;
}
/* Borrador listo: tarjeta "Abrir al lado" → Ficha en modo Borrador */
function borrTitulo(m) {
  const s = m.content.match(/^\s*(?:\*\*)?sumilla\s*:\s*(?:\*\*)?\s*(.+)$/im), h = m.content.match(/^#{1,6}\s+(.+)$/m);
  const t = (s ? s[1] : h ? h[1] : '').replace(/\*+/g, '').trim();
  return t ? cap(trunc(t, 80)) : (activeChat(S.exp).titulo || 'Borrador del agente');
}
function borrHTML(m, i) {
  return `<div class="borr"><span class="ic">${ic('doc')}</span><div><b>${esc(borrTitulo(m))}</b><span>Borrador del agente · ${m.guardado ? 'guardado en Documentos' : 'aún no está guardado'}</span></div><button class="pb" data-action="abrir-borrador" data-i="${i}">Abrir al lado</button></div>`;
}
async function guardarBorrador() {
  const e = S.exp, m = activeChat(e).mensajes[S.borrador]; if (!m || m.guardado) return;
  const id = uid(), text = m.content, name = `${borrTitulo(m).replace(/[\\/:*?"<>|]/g, '').slice(0, 70)}.txt`;
  await store.put('doc:' + id, { id, expId: e.id, name, text }); S.docTexts[id] = text;
  e.docs.push({ id, name, type: 'txt', pages: 1, chars: text.length, addedAt: todayISO(), borrador: true });
  m.guardado = id; await saveExp(); refreshExp(); toast('Guardado en Documentos del expediente');
}
/* Conversaciones: abrir, nueva (reutiliza una vacía), renombrar y borrar */
async function irAChatNuevo() {
  const e = S.exp; let c = e.chats.find(x => !x.mensajes.length);
  if (!c) { c = newChat(); e.chats.push(c); }
  e.chatActivo = c.id; Object.assign(S, { vista: 'chat', sideOpen: false }); resetFicha(); render();
}
function abrirChat(id) {
  const e = S.exp; if (!e.chats.some(c => c.id === id)) return;
  e.chatActivo = id; Object.assign(S, { vista: 'chat', sideOpen: false }); resetFicha(); render();
}
async function chatMenu() {
  const c = activeChat(S.exp), n = c.mensajes.filter(m => m.role !== 'error').length;
  const r = await askDialog({ title: 'Conversación', ok: 'Guardar', collect: d => ({ titulo: $('#cv-t', d).value.trim() }),
    body: `<label class="field"><span>Título</span><input class="input" id="cv-t" value="${esc(c.titulo)}" placeholder="Nueva conversación" maxlength="120"></label>
      <p class="small muted">${plural(n, 'mensaje', 'mensajes')}${n ? ` · contexto usado: <span class="mono">${usoContexto(S.exp)} %</span> del presupuesto de esta conversación` : ''}. Si borras la conversación, la memoria del caso se mantiene.</p>
      ${c.mensajes.length ? '<button type="button" class="btn danger sm" data-action="del-chat">Borrar conversación</button>' : ''}` });
  if (!r) return;
  c.titulo = r.titulo; await saveExp(); renderCentro(); renderBarra();
}
async function deleteChat() {
  const e = S.exp, c = activeChat(e); closeDialog();
  const ok = await askDialog({ title: 'Borrar conversación', ok: 'Borrar', danger: true, body: `<p>Se borrará «${esc(c.titulo || 'Conversación sin título')}» de este equipo. La memoria del caso se mantiene. No se puede deshacer.</p>` });
  if (!ok) return;
  e.chats = e.chats.filter(x => x.id !== c.id);
  if (!e.chats.length) e.chats.push(newChat());
  e.chatActivo = (chatsOrdenados(e)[0] || e.chats[0]).id; S.vista = 'inicio'; resetFicha();
  await saveExp(); render(); toast('Conversación borrada.');
}

/* ============================================================
   Caja de texto (v0.6 · F3): chips, @ para citar, / para acciones, vista previa exacta del envío
   ============================================================ */
// Menciones con @: @«nombre del documento» o @«Movimiento del dd/mm/aaaa · acto»
const movLabel = v => `Movimiento del ${fmtDate(v.fecha)} · ${v.acto}`;
function citadosEn(e, text) {
  const out = { docs: [], movs: [] };
  for (const [, n] of String(text).matchAll(/@«([^»\n]+)»/g)) {
    const d = e.docs.find(x => x.name === n); if (d) { if (!out.docs.includes(d.id)) out.docs.push(d.id); continue; }
    const v = e.movimientos.find(x => movLabel(x) === n); if (v && !out.movs.includes(v.id)) out.movs.push(v.id);
  }
  return out;
}
// Acciones con nombre jurídico. Cada una recuerda verificar plazos y normas.
const VERIFICA = 'Recuérdame verificar los plazos en la resolución y en mi casilla, y las normas que cites.';
function acciones(e) {
  const penal = e.especialidad === 'Penal';
  return [
    ['/absolver-traslado', penal ? 'Esquema para absolver el traslado de la acusación' : 'Esquema para absolver un traslado',
      { texto: `Prepara el esquema del escrito para absolver el traslado${penal ? ' de la acusación' : ''}: observaciones, fundamentos y medios probatorios. Deja entre corchetes lo que debo completar. ${VERIFICA}` }],
    ['/resumir-documento', 'Resumen de un documento del expediente', { texto: 'Resume este documento del expediente en pocas líneas: qué pide o resuelve, fechas y puntos clave. ' + VERIFICA + ' @', arroba: true }],
    ['/pegar-cej', 'Ordenar movimientos copiados del CEJ', { cej: true }],
    ['/cronologia', 'Tabla con la cronología de resoluciones del expediente', { tabla: 'cronologia' }],
    ['/preparar-audiencia', penal ? 'Puntos para la audiencia de control de acusación' : 'Puntos para preparar la próxima audiencia',
      { texto: `Prepara los puntos para la audiencia${penal ? ' de control de acusación' : ''}: qué plantear, en qué orden y qué pruebas llevar. ${VERIFICA}` }]
  ];
}
function cerrarMenu() { S.menu = null; const m = $('#menu-caja'); if (m) { m.hidden = true; m.innerHTML = ''; } }
function pintarMenu() {
  const m = $('#menu-caja'), mn = S.menu; if (!m || !mn) return;
  const t = mn.tipo === '/' ? 'Acciones · cada una recuerda verificar plazos y normas' : mn.items.length ? 'Citar en tu mensaje' : 'No hay documentos ni movimientos que coincidan';
  m.innerHTML = `<div class="t">${t}</div>${mn.items.map((x, i) => `<button type="button" class="${i === mn.sel ? 'on' : ''}" data-action="menu-pick" data-i="${i}" role="option" aria-selected="${i === mn.sel}"><span class="${mn.tipo === '/' ? 'num' : ''}">${esc(x[0])}</span><small>${esc(x[1])}</small></button>`).join('')}`;
  m.hidden = false;
}
function actualizarMenu(q) {
  const e = S.exp, v = q.value, antes = v.slice(0, q.selectionStart);
  if (/^\/\S*$/.test(v)) {
    const f = v.toLowerCase();
    S.menu = { tipo: '/', items: acciones(e).filter(a => a[0].startsWith(f)), sel: 0 };
    if (!S.menu.items.length) return cerrarMenu();
    return pintarMenu();
  }
  const m = antes.match(/(^|\s)@([^\s@«»]*)$/);
  if (!m) return cerrarMenu();
  const f = norm(m[2]), docs = [...e.docs].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  const items = [...docs.map(d => [d.name, [d.type === 'pdf' && d.pages ? `${d.pages} págs.` : '', ddmm(d.addedAt)].filter(Boolean).join(' · ')]),
    ...sortedMovs(e).slice(0, 6).map(x => [movLabel(x), x.sumilla || 'movimiento del expediente'])].filter(x => !f || norm(x[0]).includes(f)).slice(0, 8);
  S.menu = { tipo: '@', items, sel: 0, desde: antes.length - m[2].length - 1 };
  pintarMenu();
}
async function elegirMenu(i) {
  const q = $('#q'), mn = S.menu; if (!q || !mn || !mn.items[i]) return;
  if (mn.tipo === '@') {
    const fin = q.selectionStart, ins = `@«${mn.items[i][0]}» `;
    q.value = q.value.slice(0, mn.desde) + ins + q.value.slice(fin);
    const pos = mn.desde + ins.length; cerrarMenu(); q.focus(); q.setSelectionRange(pos, pos); return;
  }
  const accion = mn.items[i][2]; cerrarMenu();
  if (accion.cej) { q.value = ''; await pasteCEJ(); return; }
  if (accion.tabla) { q.value = ''; nuevaTablaVentana(accion.tabla); return; }
  q.value = accion.texto; q.focus(); q.setSelectionRange(q.value.length, q.value.length);
  if (accion.arroba) actualizarMenu(q);
}
function teclaMenu(ev) {
  const mn = S.menu; if (!mn) return false;
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { if (!mn.items.length) return false; mn.sel = (mn.sel + (ev.key === 'ArrowDown' ? 1 : mn.items.length - 1)) % mn.items.length; pintarMenu(); return true; }
  if ((ev.key === 'Enter' || ev.key === 'Tab') && !ev.shiftKey && mn.items.length) { elegirMenu(mn.sel); return true; }
  if (ev.key === 'Escape') { cerrarMenu(); return true; }
  return false;
}

/* Modelo de terceros, dicho siempre como tal (D-41) */
const FABRICANTE = { anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', deepseek: 'DeepSeek', 'meta-llama': 'Meta', mistralai: 'Mistral', 'x-ai': 'xAI', qwen: 'Alibaba', moonshotai: 'Moonshot AI' };
const nombreModelo = id => OR_RECOMMENDED.find(r => r.id === id)?.name || String(id || '').split('/').pop();
function modeloTercero(provider, model) {
  if (provider === 'custom') return `Modelo en tu servidor propio: ${model}. Nada sale de tu red.`;
  const fab = provider === 'openrouter' ? FABRICANTE[String(model).split('/')[0]] : provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : '';
  return `Modelo de terceros: ${nombreModelo(model)}${fab ? ` de ${fab}` : ''}${provider === 'openrouter' ? ', vía OpenRouter' : ''}, con tu cuenta. Folio no tiene servidores: lo que envías va directo de tu equipo al proveedor.`;
}
function reemplazosEn(P, texto) { return P.enabled ? Object.entries(P.map).filter(([tok]) => texto.includes(tok)).map(([tok, real]) => [real, tok]) : []; }

/* Vista previa del envío: la misma ventana antes de enviar (si "Revisar siempre" está activo), desde la píldora y en "Ver lo que se envió" */
let envioPend = null;
function cerrarEnvio(v) { const p = envioPend; envioPend = null; $('#velo-envio')?.remove(); if (p) p(v); }
function abrirEnvio({ antes = true, provider, model, n, texto, reemp = [], instr = '', puedeEnviar = true }) {
  cerrarEnvio(false); cerrarMenu();
  const dest = provider === 'custom' ? 'tu servidor propio' : `${provLabel(provider)} con tu cuenta`;
  const sub = n == null ? 'Este es el texto que salió de tu equipo.' : n > 0 ? `Folio reemplazó ${plural(n, 'dato personal', 'datos personales')} en tu equipo antes de enviar. Este es el texto exacto que ${antes ? 'sale' : 'salió'}.`
    : S.settings.pseudo ? `Folio no encontró datos personales que reemplazar. Este es el texto exacto que ${antes ? 'sale' : 'salió'}.` : `El reemplazo de datos está desactivado: el proveedor recibe los nombres reales. Este es el texto exacto que ${antes ? 'sale' : 'salió'}.`;
  const v = $('#v6'); if (!v) return Promise.resolve(false);
  v.insertAdjacentHTML('beforeend', `<div class="velo" id="velo-envio">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="envio-t">
      <div class="mc"><div><h2 id="envio-t">Lo que se ${antes ? 'enviará' : 'envió'} a ${esc(dest)}</h2><p>${esc(sub)}</p></div><button class="ib" data-action="envio-cerrar" aria-label="Cerrar">${ic('cerrar')}</button></div>
      <div class="envio" tabindex="0" role="region" aria-label="Texto que ${antes ? 'se enviará' : 'se envió'}">${highlightTokens(texto)}</div>
      ${reemp.length ? `<details class="reemp"><summary>Ver los ${plural(reemp.length, 'reemplazo', 'reemplazos')} (solo los ves tú)</summary><table>${reemp.map(([r, t]) => `<tr><td>${esc(r)}</td><td>${esc(t)}</td></tr>`).join('')}</table></details>` : ''}
      ${instr ? `<details class="reemp"><summary>Ver las instrucciones fijas de Folio para el modelo (no contienen datos del caso)</summary><div class="envio" tabindex="0" role="region" aria-label="Instrucciones fijas de Folio" style="margin:6px 0 0">${esc(instr)}</div></details>` : ''}
      <p class="tercero">${esc(modeloTercero(provider, model))}</p>
      <div class="mp">${antes
        ? `<label><input type="checkbox" id="envio-revisar" ${S.settings.review ? 'checked' : ''}>Revisar siempre antes de enviar</label><button class="pb" data-action="envio-cerrar">Cancelar</button><button class="pb prim" data-action="envio-enviar" ${puedeEnviar ? '' : 'disabled title="Escribe tu consulta primero"'}>Enviar</button>`
        : `<label></label><button class="pb prim" data-action="envio-cerrar">Cerrar</button>`}</div>
    </div></div>`);
  setTimeout(() => $(antes && puedeEnviar ? '[data-action="envio-enviar"]' : '#velo-envio [data-action="envio-cerrar"]')?.focus(), 30);
  return new Promise(r => { envioPend = r; });
}
function highlightTokens(s) { return esc(s).replace(/\[(?:PERSONA|DOC|CORREO|RUC|TELEFONO|DNI|DIRECCION)_\d+\]/g, t => `<mark>${t}</mark>`); }
// Datos del caso del texto de sistema (lo que sigue a "FECHA DE HOY"); las instrucciones fijas van aparte
function partirSistema(system) { const c = system.indexOf('\n\nFECHA DE HOY:'); return c >= 0 ? [system.slice(0, c), system.slice(c + 2)] : [system, '']; }
// Revisión antes de enviar (memoria y CEJ): misma ventana del prototipo
async function reviewPayload(system, messages, P) {
  if (!S.settings.review) return true;
  const [instr, data] = partirSistema(system), texto = [data, ...messages.map(m => m.content)].filter(Boolean).join('\n\n');
  return abrirEnvio({ provider: S.settings.provider, model: S.settings.model, n: P.enabled ? reemplazosEn(P, texto).length : 0, texto, reemp: reemplazosEn(P, texto), instr });
}

/* Ventana de contexto (v0.6 · F4, spec §6): Folio estima los tokens en el equipo contra un presupuesto útil por conversación */
const tokensDe = n => Math.ceil(n / 3.5);   // ~3,5 caracteres por token en español; es una estimación, no se guarda
const NORMAS_RESERVA = 6000;                 // caracteres que se reservan para los artículos que agrega la búsqueda de normas
const CTX_AVISO = 70, CTX_ALTO = 90;          // % del presupuesto: línea tranquila y línea ámbar
const presupuesto = () => S.settings.contextoMax || DEFAULT_SETTINGS.contextoMax;
const conversados = c => c.mensajes.filter(m => m.role === 'user' || m.role === 'assistant');
function chatPrevio(e, c) { const p = c.deChat && e.chats.find(x => x.id === c.deChat); return p?.resumen ? p : null; }
// Instrucciones + memoria + normas + fragmentos: lo que va en cada consulta además del historial
function contextoBase(e, text) {
  const c = S.ctx, lib = Lib.installed() && c.biblioteca, chat = activeChat(e);
  const ctx = buildContext(e, S.docTexts, text, { memoria: c.memoria, docs: c.docs && e.docs.length > 0, citados: citadosEn(e, text), previo: chatPrevio(e, chat) });
  return { ctx, lib, chars: SYSTEM_PROMPT.length + (lib ? LEGAL_RULES.length + NORMAS_RESERVA : 0) + (c.memoria ? MEMORIA_AUTO.length : 0) + ctx.text.length + text.length };
}
// Porcentaje del presupuesto que ocupa la conversación activa con su historial completo (se recalcula solo si algo cambió)
let usoMemo = { k: '', v: 0 };
function usoContexto(e) {
  const c = activeChat(e), msgs = conversados(c), ult = [...msgs].reverse().find(m => m.role === 'user')?.content || '';
  const k = [c.id, c.mensajes.length, c.updatedAt, e.updatedAt, e.docs.length, presupuesto(), S.ctx.memoria, S.ctx.docs, S.ctx.biblioteca, Lib.installed()].join('|');
  if (usoMemo.k !== k) usoMemo = { k, v: Math.round(tokensDe(contextoBase(e, ult).chars + msgs.reduce((a, m) => a + m.content.length, 0)) / presupuesto() * 100) };
  return usoMemo.v;
}
/* Armado único de la consulta: lo usan la vista previa y el envío, así lo que se muestra es lo que sale.
   Al 100 % no se corta nada a ciegas: van los mensajes más recientes que caben y se avisa cuántos quedaron fuera. */
function historyFor(e, cabe = Infinity) {
  const todos = conversados(activeChat(e)), h = [];
  let usado = 0;
  for (let i = todos.length - 1; i >= 0; i--) { usado += todos[i].content.length; if (tokensDe(usado) > cabe && h.length) break; h.unshift({ role: todos[i].role, content: todos[i].content }); }
  while (h.length && h[0].role !== 'user') h.shift();
  const out = []; for (const m of h) { if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n\n' + m.content; else out.push({ ...m }); }
  return { msgs: out, fuera: todos.length - h.length };
}
function prepararEnvio(text) {
  const e = S.exp, s = S.settings, c = S.ctx, P = makePseudo(e, s.pseudo);
  const { ctx, chars } = contextoBase(e, text);
  const lib = Lib.installed() && c.biblioteca, usePlanner = lib && s.legalPlanner !== false;
  const plannerSystem = PLANNER_PROMPT + normasCatalogText();
  const plannerUser = usePlanner ? P.apply(`Especialidad: ${e.especialidad || 'sin indicar'}\nMateria: ${e.materia || 'sin indicar'}\nEstado procesal: ${c.memoria ? e.estado || 'sin indicar' : 'sin indicar'}\n\nConsulta del abogado:\n${text}`) : '';
  const system0 = P.apply(SYSTEM_PROMPT + (lib ? LEGAL_RULES : '') + (c.memoria ? MEMORIA_AUTO : '') + '\n\n' + ctx.text);
  const { msgs, fuera } = historyFor(e, presupuesto() - tokensDe(chars)), hist = msgs.map(m => ({ role: m.role, content: P.apply(m.content) }));
  const messages = [...hist, { role: 'user', content: P.apply(text) }];
  if (messages.length >= 2 && messages[messages.length - 2].role === 'user') { const last = messages.pop(); messages[messages.length - 1].content += '\n\n' + last.content; }
  return { e, s, P, ctx, lib, usePlanner, plannerSystem, plannerUser, system0, messages, text, fuera };
}
// Texto que se muestra: datos del caso, normas, conversación anterior y la pregunta (con marcadores)
function textoEnvio(x, normas = null, historial = true) {
  const [, data] = partirSistema(x.system0), prev = x.messages.slice(0, -1), q = x.messages[x.messages.length - 1].content;
  const corte = Lib.manifest?.actualizadoAl ? ` (biblioteca al ${fmtDate(Lib.manifest.actualizadoAl)})` : '';
  const partes = [data];
  if (x.lib) partes.push(`=== NORMAS VIGENTES${corte} ===\n${normas ?? 'Folio agregará los artículos de tu biblioteca que pida la búsqueda de normas: textos públicos, sin datos del caso.'}`);
  const fuera = x.fuera ? `(${plural(x.fuera, 'mensaje más antiguo no cabe', 'mensajes más antiguos no caben')} en el presupuesto de contexto y no se ${x.fuera === 1 ? 'envía' : 'envían'})` : '';
  const anteriores = !prev.length ? '' : historial ? prev.map(m => `[${m.role === 'user' ? 'Abogado' : 'Agente'}]\n${m.content}`).join('\n\n') : `(${plural(prev.length, 'mensaje anterior', 'mensajes anteriores')} de esta conversación)`;
  if (fuera || anteriores) partes.push(`=== CONVERSACIÓN ANTERIOR ===\n${[fuera, anteriores].filter(Boolean).join('\n\n')}`);
  partes.push(`=== PREGUNTA ===\n${q}`);
  if (x.usePlanner && normas == null) partes.push(`=== BÚSQUEDA DE NORMAS (consulta corta que sale antes, sin la memoria) ===\n${x.plannerUser}`);
  return partes.join('\n\n');
}
async function vistaPrevia(x, { puedeEnviar = true } = {}) {
  const texto = textoEnvio(x), reemp = reemplazosEn(x.P, texto);
  return abrirEnvio({ provider: x.s.provider, model: x.s.model, n: x.P.enabled ? reemp.length : 0, texto, reemp, instr: partirSistema(x.system0)[0], puedeEnviar });
}
const ENVIO_GUARDADOS = 10;   // "Ver lo que se envió" se guarda (cifrado) en las 10 respuestas más recientes de cada conversación
function verEnvio(m) {
  const t = m.meta || {}, v = m.envio;
  abrirEnvio({ antes: false, provider: t.provider, model: t.model, n: v ? v.reemp.length : null,
    texto: v ? v.texto : 'El detalle del envío se guarda solo para las respuestas más recientes de cada conversación.', reemp: v ? v.reemp : [] });
}
async function sendChat(text, { revisado = false } = {}) {
  text = text.trim(); if (!text || S.sending) return;
  await Lib.load();
  const x = prepararEnvio(text), { e, s, P, ctx, lib, usePlanner, plannerSystem, plannerUser, system0, messages } = x, leyoMemoria = S.ctx.memoria;
  if (!revisado && s.review && !(await vistaPrevia(x))) return;
  cerrarMenu();
  const chat = activeChat(e), push = m => { chat.mensajes.push(m); chat.updatedAt = new Date().toISOString(); };
  if (!chat.titulo) chat.titulo = autoTitle(text);
  push({ role: 'user', content: text, at: new Date().toISOString() });
  S.sending = true; S.abort = new AbortController(); renderCentro(); renderBarra();
  $('#hilo')?.insertAdjacentHTML('beforeend', `<div class="resp" id="streaming"><span class="typing" aria-label="El agente está escribiendo"><i></i><i></i><i></i></span></div>`); scrollHilo();
  let system = system0, arts = [];
  try {
    let plan = null;
    if (usePlanner) {
      try { plan = parseJSONLoose(await llm({ cfg: s, system: plannerSystem, messages: [{ role: 'user', content: plannerUser }], maxTokens: 1500, signal: S.abort.signal })); }
      catch (err) { if (err.name === 'AbortError') throw err; plan = null; }
      await logSend('Búsqueda de normas', plannerSystem.length + plannerUser.length, P);
    }
    if (lib) { arts = gatherArticles(e, text, plan); system = system0 + normasBlock(arts); }
    const chars = system.length + messages.reduce((a, m) => a + m.content.length, 0);
    let pending = null;
    const full = await llm({ cfg: s, system, messages, stream: true, maxTokens: 6000, signal: S.abort.signal, onDelta: t => { pending = t; requestAnimationFrame(() => { if (pending == null) return; const el = $('#streaming'); if (el) { el.innerHTML = md(P.restore(separarMemoria(pending).texto)); scrollHilo(); } pending = null; }); } });
    const sep = separarMemoria(full), content = P.restore(sep.texto).trim() || '(El modelo no devolvió texto.)';
    proponerDesdeRespuesta(e, chat.id, sep.json, P);
    const enviado = textoEnvio(x, lib ? arts.map(({ id, a }) => `Art. ${a.n} ${Lib.meta(id)?.corto || id}`).join(' · ') || '(ningún artículo)' : null, false);
    push({ role: 'assistant', content, at: new Date().toISOString(), meta: { provider: s.provider, model: s.model, pseudo: P.enabled, replaced: P.count(), normas: arts.map(({ id, a }) => id + ' ' + a.n), frags: [...new Set(ctx.frags.map(f => f.name))], memoria: leyoMemoria, secciones: leyoMemoria ? memSecciones(e) : [] },
      envio: { texto: enviado, reemp: reemplazosEn(P, enviado) }, citas: checkCitations(content) });
    chat.mensajes.filter(m => m.envio).slice(0, -ENVIO_GUARDADOS).forEach(m => delete m.envio);
    await logSend('Consulta', chars, P);
  } catch (err) {
    if (err.name === 'AbortError') push({ role: 'error', content: 'Detuviste la respuesta.' });
    else push({ role: 'error', content: err instanceof FolioError ? err.message : 'Error inesperado: ' + err.message });
  } finally { S.sending = false; S.abort = null; await saveExp().catch(fail); renderCentro(); renderFicha(); renderBarra(); if (S.vista === 'chat') $('#q')?.focus(); }
}
async function logSend(kind, chars, P) {
  const s = S.settings; S.lastSend = { at: Date.now(), provider: s.provider, pseudo: P.enabled };
  await addAudit({ at: new Date().toISOString(), kind, provider: s.provider, model: s.model, exp: S.exp?.numero || 's/n', chars, pseudo: P.enabled, replaced: P.count(), local: !PROVIDERS[s.provider]?.abroad });
}

/* ---------- La memoria se actualiza con tu aprobación ---------- */
const MEMORIA_JSON = `{"estado": string|null, "resumen_agregar": string|null, "hechos_agregar": string|null, "estrategia_agregar": string|null, "pendientes_nuevos": [string], "plazos_nuevos": [{"fecha": "AAAA-MM-DD", "descripcion": string}]}`;
const MEMORIA_REGLAS = `Incluye solo información nueva que aparezca de forma explícita en la conversación. No inventes fechas: un plazo nuevo solo se propone si la conversación menciona una fecha concreta. Usa null o listas vacías si no hay nada. Conserva los marcadores como [PERSONA_1] tal cual.`;
const convoTexto = msgs => msgs.map(m => `${m.role === 'user' ? 'ABOGADO' : 'AGENTE'}: ${m.content}`).join('\n\n');
// Respuesta del modelo → propuestas con sección, con los datos reales restaurados en el equipo
function itemsMemoria(j, R) {
  const items = [];
  if (R(j.estado)) items.push({ k: 'estado', label: 'Nuevo estado procesal', v: R(j.estado) });
  if (R(j.resumen_agregar)) items.push({ k: 'resumen', label: 'Agregar al resumen', v: R(j.resumen_agregar) });
  if (R(j.hechos_agregar)) items.push({ k: 'hechos', label: 'Agregar a hechos clave', v: R(j.hechos_agregar) });
  if (R(j.estrategia_agregar)) items.push({ k: 'estrategia', label: 'Agregar a la estrategia', v: R(j.estrategia_agregar) });
  (Array.isArray(j.pendientes_nuevos) ? j.pendientes_nuevos : []).map(R).filter(Boolean).forEach(v => items.push({ k: 'pend', label: 'Nuevo pendiente', v }));
  (Array.isArray(j.plazos_nuevos) ? j.plazos_nuevos : []).filter(p => p && /^\d{4}-\d{2}-\d{2}$/.test(p.fecha || '') && R(p.descripcion)).forEach(p => items.push({ k: 'plazo', label: `Nuevo plazo, ${fmtDate(p.fecha)}`, v: R(p.descripcion), fecha: p.fecha }));
  return items;
}
async function proposeMemory(btn) {
  const e = S.exp, s = S.settings; const P = makePseudo(e, s.pseudo);
  const convo = convoTexto(activeChat(e).mensajes.filter(m => m.role !== 'error').slice(-8));
  const system = `Eres el módulo de memoria de Folio. Propón cambios a la memoria de un expediente judicial peruano a partir de la conversación reciente. Devuelve SOLO un objeto JSON válido, sin texto adicional, con esta forma:
${MEMORIA_JSON}
${MEMORIA_REGLAS}`;
  const user = P.apply(`FECHA DE HOY: ${todayISO()}\n\nMEMORIA ACTUAL:\n${memoryText(e)}\n\nCONVERSACIÓN RECIENTE:\n${convo}`);
  if (!(await reviewPayload(system, [{ role: 'user', content: user }], P, 'memoria'))) return;
  btn = btn || $('[data-action="propose-memory"]'); if (btn) { btn.disabled = true; btn.textContent = 'Analizando…'; }
  try {
    const out = await llm({ cfg: s, system, messages: [{ role: 'user', content: user }], maxTokens: 4000 });
    await logSend('Actualizar memoria', system.length + user.length, P);
    const R = v => typeof v === 'string' ? P.restore(v).trim() : '', items = itemsMemoria(parseJSONLoose(out), R);
    if (!items.length) { toast('El agente no encontró información nueva para la memoria.'); renderCentro(); return; }
    addProposals(e, items, activeChat(e).id); await saveExp(); renderBarra(); renderCentro(); revisarCambios();
  } catch (err) { fail(err); renderCentro(); }
}

/* ---------- Propuestas al terminar cada respuesta (F5, spec §7; opción aprobada: dentro de la misma respuesta, sin consulta extra) ---------- */
const MEMORIA_AUTO = `
Memoria del expediente: si en esta respuesta o en la pregunta del abogado aparece información nueva y explícita que no está en la memoria (estado procesal, hechos, estrategia, pendientes o plazos con una fecha concreta), termina tu respuesta con un bloque en líneas propias, exactamente así:
<memoria>${MEMORIA_JSON}</memoria>
El bloque no se muestra al abogado: Folio lo convierte en cambios propuestos que él revisa. No lo menciones en tu respuesta. Si no hay nada nuevo, no agregues el bloque. No inventes fechas. Conserva los marcadores como [PERSONA_1] tal cual.`;
// Quita el bloque <memoria> del texto (también a medio llegar en el streaming) y devuelve su contenido
function separarMemoria(t) {
  t = String(t || ''); const i = t.indexOf('<memoria>');
  if (i >= 0) { const f = t.indexOf('</memoria>', i); return { texto: (t.slice(0, i) + (f >= 0 ? t.slice(f + 10) : '')).trimEnd(), json: t.slice(i + 9, f >= 0 ? f : undefined) }; }
  for (let k = Math.min(8, t.length); k > 0; k--) if ('<memoria>'.startsWith(t.slice(-k))) return { texto: t.slice(0, -k), json: '' };
  return { texto: t, json: '' };
}
// Si el modelo no respeta el formato no pasa nada: no hay propuestas y queda "Actualizar memoria"
function proponerDesdeRespuesta(e, chatId, json, P) {
  if (!json.trim()) return 0;
  let j; try { j = parseJSONLoose(json); } catch { return 0; }
  const R = v => typeof v === 'string' ? P.restore(v).trim() : '', ya = new Set(propPend(e).map(p => p.seccion + '|' + p.despues));
  const items = itemsMemoria(j, R).filter(it => !ya.has(it.k + '|' + it.v) && !(it.k === 'estado' && it.v === e.estado));
  if (items.length) addProposals(e, items, chatId);
  return items.length;
}

/* ---------- Seguir en una nueva (F4, spec §6): el agente resume, propone cambios de memoria y se abre una conversación que continúa ---------- */
async function seguirEnNueva(btn) {
  const e = S.exp, s = S.settings, prev = activeChat(e), P = makePseudo(e, s.pseudo);
  const system = `Eres el módulo de memoria de Folio. Una conversación entre un abogado litigante peruano y su asistente ya es larga y seguirá en una nueva. Devuelve SOLO un objeto JSON válido, sin texto adicional, con esta forma:
{"resumen_conversacion": string, ${MEMORIA_JSON.slice(1)}
En "resumen_conversacion" resume en 3 a 6 líneas lo que se pidió, lo que se concluyó o preparó y lo que falta, para que el asistente continúe sin la conversación completa. Las demás claves son cambios propuestos a la memoria del expediente. ${MEMORIA_REGLAS}`;
  const base = tokensDe(system.length + memoryText(e).length + 200);
  const { msgs, fuera } = historyFor(e, presupuesto() - base);
  const user = P.apply(`FECHA DE HOY: ${todayISO()}\n\nMEMORIA ACTUAL:\n${memoryText(e)}\n\nCONVERSACIÓN${fuera ? ` (sin ${plural(fuera, 'mensaje más antiguo', 'mensajes más antiguos')}, que no caben)` : ''}:\n${convoTexto(msgs)}`);
  if (!(await reviewPayload(system, [{ role: 'user', content: user }], P))) return;
  btn = btn || $('[data-action="seguir-nueva"]'); if (btn) { btn.disabled = true; btn.textContent = 'Resumiendo…'; }
  try {
    const out = await llm({ cfg: s, system, messages: [{ role: 'user', content: user }], maxTokens: 4000 });
    await logSend('Resumen para seguir en una nueva', system.length + user.length, P);
    const j = parseJSONLoose(out), R = v => typeof v === 'string' ? P.restore(v).trim() : '';
    const resumen = R(j.resumen_conversacion);
    if (!resumen) throw new FolioError('El agente no devolvió el resumen de la conversación. Intenta de nuevo o con otro modelo.');
    prev.resumen = resumen; await saveExp();
    const items = itemsMemoria(j, R); if (items.length) addProposals(e, items, prev.id);
    const c = newChat(prev.id); e.chats = [...e.chats.filter(x => x.mensajes.length), c]; e.chatActivo = c.id;
    Object.assign(S, { vista: 'chat', sideOpen: false }); resetFicha();
    await saveExp(); render(); if (items.length) revisarCambios(); $('#q')?.focus();
  } catch (err) { fail(err); if (btn?.isConnected) { btn.disabled = false; btn.textContent = 'Seguir en una nueva'; } }
}

/* ---------- Movimientos pegados del CEJ ---------- */
async function pasteCEJ() {
  const s = S.settings;
  const text = await askDialog({ title: 'Pegar seguimiento del CEJ', ok: isReady(s) ? 'Ordenar con el agente' : 'Entendido', wide: true,
    collect: d => { if (!isReady(s)) return ''; const v = $('#cej-text', d).value.trim(); if (!v) { $('#cej-err', d).textContent = 'Pega primero el texto copiado del CEJ.'; return null; } return v; },
    body: `<ol class="small"><li>Abre la consulta del expediente en cej.pj.gob.pe.</li><li>Selecciona el bloque de seguimiento del expediente y cópialo.</li><li>Pégalo aquí. El agente extrae fecha, acto y sumilla; tú revisas antes de guardar.</li></ol>
      ${isReady(s) ? `<label class="field"><span>Texto copiado</span><textarea class="textarea" id="cej-text" rows="10" placeholder="Pega aquí el seguimiento del expediente"></textarea></label><p id="cej-err" class="small" style="color:var(--danger)" role="alert"></p>` : '<div class="note warn"><p>Para ordenar el texto necesitas conectar un proveedor de IA. Mientras tanto, usa Agregar movimiento.</p></div>'}` });
  if (!text) return;
  const e = S.exp; const P = makePseudo(e, s.pseudo);
  const system = `Extrae los movimientos procesales del texto copiado de la Consulta de Expedientes Judiciales (CEJ) del Poder Judicial del Perú. Devuelve SOLO un objeto JSON válido, sin texto adicional: {"movimientos":[{"fecha":"AAAA-MM-DD"|null,"acto":"texto breve, por ejemplo 'Resolución 3' o 'Escrito'","sumilla":"resumen en una línea"}]}. Usa exactamente las fechas del texto. No inventes movimientos. Conserva los marcadores como [PERSONA_1] tal cual.`;
  const user = P.apply(text.slice(0, 20000));
  if (!(await reviewPayload(system, [{ role: 'user', content: user }], P, 'cej'))) return;
  toast('El agente está ordenando los movimientos…');
  try {
    const out = await llm({ cfg: s, system, messages: [{ role: 'user', content: user }], maxTokens: 8000 });
    await logSend('Ordenar movimientos', system.length + user.length, P);
    const list = (parseJSONLoose(out).movimientos || []).map(v => ({ fecha: /^\d{4}-\d{2}-\d{2}$/.test(v.fecha || '') ? v.fecha : '', acto: P.restore(String(v.acto || '')).trim(), sumilla: P.restore(String(v.sumilla || '')).trim() })).filter(v => v.acto);
    if (!list.length) { toast('No se encontraron movimientos en el texto.', true); return; }
    const sel = await askDialog({ title: `${list.length} movimientos encontrados`, ok: 'Agregar seleccionados', wide: true,
      collect: d => $$('[data-mv]', d).filter(c => c.checked).map(c => +c.dataset.mv),
      body: `<p>Revisa cada movimiento contra el CEJ antes de agregarlo.</p><ul class="proposal">${list.map((v, i) => `<li><label class="check"><input type="checkbox" data-mv="${i}" checked><span><span class="mono"><strong>${esc(fmtDate(v.fecha))}</strong></span> ${esc(v.acto)}<br><span class="small muted">${esc(v.sumilla)}</span></span></label></li>`).join('')}</ul>` });
    if (!sel || !sel.length) return;
    const ahora = new Date().toISOString(); sel.forEach(i => e.movimientos.push({ id: uid(), ...list[i], addedAt: ahora }));
    await saveExp(); refreshExp(); toast(`${sel.length} movimientos agregados.`);
  } catch (err) { fail(err); }
}

/* ============================================================
   Formularios de expediente y movimiento
   ============================================================ */
const ESPECIALIDADES = ['Civil', 'Familia', 'Penal', 'Laboral', 'Contencioso administrativo', 'Constitucional', 'Comercial', 'Otra'];
/* ============================================================
   Nuevo expediente desde una resolución, cédula o carátula (E11 · prototipo nuevo-expediente-v0.7.html)
   El encabezado se lee en el equipo, sin IA ni red (D-48); el juez y el especialista no se seudonimizan (D-49)
   ============================================================ */
const NE_ROLES = ['Demandante', 'Demandado', 'Menor alimentista', 'Agraviado(a)', 'Imputado(a)', 'Tercero', 'Otro'];
const NE_CAMPOS = [['numero', 'Número de expediente', '00000-2026-0-0000-XX-XX-00'], ['materia', 'Materia', 'Ej.: alimentos, desalojo, violencia familiar'], ['especialidad', 'Especialidad', ''],
  ['distrito', 'Distrito judicial', 'Ej.: Junín'], ['organo', 'Órgano jurisdiccional', 'Ej.: 2.° Juzgado de Familia de Huancayo'], ['juez', 'Juez', 'Nombres y apellidos'],
  ['especialista', 'Especialista', 'Especialista o secretario'], ['estado', 'Estado procesal', 'Ej.: calificación de la demanda']];
function nuevoExpediente() {
  S.ne = { estado: 'formulario', archivo: null, enc: null, datos: {}, partes: [] };
  $('#v6')?.insertAdjacentHTML('beforeend', `<div class="velo" id="velo-ne"><div class="modal ne" role="dialog" aria-modal="true" aria-labelledby="ne-t"></div></div>`);
  fondoInerte(true); pintarNE(); setTimeout(() => $('#velo-ne .zona-ne')?.focus(), 30);
}
function cerrarNE() { S.ne = null; $('#velo-ne')?.remove(); fondoInerte(false); }
// Mientras la ventana está abierta, el resto de la pantalla no se recorre con teclado ni lector de pantalla
function fondoInerte(si) { $$('#v6 > :not(.velo):not(.aviso)').forEach(x => { x.inert = si; if (si) x.setAttribute('aria-hidden', 'true'); else x.removeAttribute('aria-hidden'); }); }
// Guarda lo que el abogado escribió antes de volver a pintar la ventana
function leerNE() {
  const n = S.ne, m = $('#velo-ne'); if (!n || !m) return;
  $$('[data-ne-campo]', m).forEach(i => { n.datos[i.dataset.neCampo] = i.value.trim(); });
  $$('.pt', m).forEach((r, i) => { const p = n.partes[i]; if (!p) return; p.nombre = $('[data-pt=nombre]', r).value; p.rol = $('[data-pt=rol]', r).value; p.doc = $('[data-pt=doc]', r).value; p.cli = $('[data-pt=cli]', r).checked; });
}
// Encabezado leído, con lo detectado resaltado (para ver de dónde salió cada dato)
function hojaNE(texto, marcas) {
  const l = String(texto).replace(/\r/g, '').split('\n'), fin = l.findIndex((x, i) => i > 4 && /^\s*(AUTOS|VISTOS|VISTO|CONSIDERANDO|AL ESCRITO|SE ADJUNTA)/i.test(x));
  const t = l.slice(0, fin > 0 ? fin + 1 : 22).join('\n').replace(/[ \t]+$/gm, '').trimEnd() + (fin > 0 ? ' …' : ''), rangos = [];
  for (const m of [...new Set(marcas.filter(x => x && x.length > 2))].sort((a, b) => b.length - a.length)) {
    let i = t.indexOf(m); while (i >= 0 && rangos.some(([a, b]) => i < b && i + m.length > a)) i = t.indexOf(m, i + 1);
    if (i >= 0) rangos.push([i, i + m.length]);
  }
  rangos.sort((a, b) => a[0] - b[0]); let html = '', p = 0;
  for (const [a, b] of rangos) { html += esc(t.slice(p, a)) + `<mark>${esc(t.slice(a, b))}</mark>`; p = b; }
  return html + esc(t.slice(p));
}
function pintarNE() {
  const n = S.ne, m = $('#velo-ne .modal'); if (!n || !m) return;
  const st = n.estado, lleno = st === 'lleno', a = n.archivo, enc = n.enc, pseudo = S.settings.pseudo;
  const det = k => lleno && enc?.detectado.includes(k) ? `<i class="det">${k === 'especialidad' ? 'del número' : 'del documento'}</i>` : '';
  const campo = ([k, l, ph]) => {
    const v = n.datos[k] || '', leido = lleno && enc?.detectado.includes(k), falta = lleno && !leido;
    const input = k === 'especialidad' ? `<select class="select" data-ne-campo="especialidad"><option value="">Elegir</option>${ESPECIALIDADES.map(x => `<option ${v === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`
      : `<input class="input${k === 'numero' ? ' mono' : ''}" data-ne-campo="${k}" value="${esc(v)}" placeholder="${esc(ph)}" autocomplete="off">`;
    return `<label class="field${k === 'organo' || k === 'estado' ? ' ancho' : ''}${leido ? ' leido' : ''}${falta ? ' falta' : ''}"><span>${l} ${det(k)}</span>${input}${falta ? `<small>${k === 'estado' ? 'No aparece en el encabezado. El agente puede proponerlo al resumir la resolución.' : 'No aparece en el encabezado.'}</small>` : ''}</label>`;
  };
  const clientes = n.partes.filter(p => p.cli).length;
  const pt = (p, i) => `<div class="pt${p.cli ? ' cli' : ''}"><input class="input" data-pt="nombre" value="${esc(p.nombre)}" placeholder="Nombres y apellidos o razón social" aria-label="Nombre">
    <select class="select" data-pt="rol" aria-label="Rol">${NE_ROLES.map(r => `<option${r === p.rol ? ' selected' : ''}>${r}</option>`).join('')}</select>
    <input class="input doc-in" data-pt="doc" value="${esc(p.doc || '')}" placeholder="DNI (opcional)" aria-label="Documento">
    <label class="cli-t"><input type="checkbox" data-pt="cli" data-action="ne-cli"${p.cli ? ' checked' : ''}>Mi cliente</label>
    <button type="button" class="ib" data-action="ne-quitar" data-i="${i}" aria-label="Quitar parte">${ic('cerrar')}</button>
    <span class="tok">${pseudo ? `se enviará como [PERSONA_${i + 1}]` : 'el reemplazo de datos está desactivado: se enviará con su nombre'}</span></div>`;
  const zona = st === 'formulario' ? `<label class="zona-ne" tabindex="0" data-ne-zona><span class="ico">${ic('doc')}</span><span class="tx"><b>Arrastra una resolución, cédula o carátula</b><small>Folio llena los datos y registra a las partes · PDF, Word o texto · ${ic('candado')} se lee en tu equipo, no sale nada</small></span><span class="pb">Adjuntar archivo</span><input type="file" id="ne-file" accept=".pdf,.docx,.txt,.md" hidden></label>`
    : st === 'leyendo' ? `<div class="zona-ne archivo"><span class="ico">${ic('doc')}</span><span class="tx"><b>${esc(a.name)}</b><small>Leyendo el encabezado en tu equipo…</small><span class="barra-p"><i></i></span></span></div>`
    : st === 'lleno' ? `<div class="zona-ne archivo"><span class="ico">${ic('doc')}</span><span class="tx"><b>${esc(a.name)}</b><small>Se guardará como primer documento${enc?.resolucion ? ' y primer movimiento' : ''} del expediente</small></span><button type="button" class="pb" data-action="ne-otro">Cambiar archivo</button></div>`
    : `<div class="zona-ne error"><span class="ico">${ic('aviso')}</span><span class="tx"><b>${n.error ? esc(n.error) : 'Este PDF parece una imagen escaneada'}</b><small>${n.error ? 'Llena los datos a mano o prueba con otro archivo.' : 'Folio no puede leer su texto. Llena los datos a mano o prueba con otra resolución.'}</small></span><button type="button" class="pb" data-action="ne-otro">Probar con otro</button></div>`;
  const nDatos = enc ? enc.detectado.length : 0, nPartes = enc ? enc.partes.length : 0;
  m.innerHTML = `<div class="mc"><h2 id="ne-t">Nuevo expediente</h2><button type="button" class="ib" data-action="ne-cerrar" aria-label="Cerrar">${ic('cerrar')}</button></div>
    <div class="mcuerpo">${zona}
      ${lleno ? `<div class="encontro" role="status">${ic('check')}<span>${nDatos || nPartes ? `Folio encontró <b>${plural(nDatos, 'dato', 'datos')}</b> y <b>${plural(nPartes, 'parte', 'partes')}</b> en el documento. Revísalos y marca a tu cliente antes de crear.` : 'Folio no encontró un encabezado conocido en este documento. Llena los datos a mano; el documento se guardará igual.'}</span></div>` : '<div class="o">o llénalo a mano</div>'}
      <div class="dos${lleno ? ' con-doc' : ''}">
        ${lleno ? `<div class="doc"><span class="lbl">Lo que Folio leyó</span><div class="hoja" tabindex="0" role="region" aria-label="Encabezado leído">${hojaNE(a.text, enc.marcas)}</div><small>Solo se lee el encabezado; el resto se guarda como documento.</small></div>` : ''}
        <div class="formulario"${st === 'leyendo' ? ' inert' : ''}>
          <div class="grid2">${NE_CAMPOS.map(campo).join('')}</div>
          ${lleno && (n.datos.juez || n.datos.especialista) ? `<div class="funcionarios">${ic('candado')}<span>El juez y el especialista son funcionarios públicos: sus nombres no se reemplazan al consultar a la IA.</span></div>` : ''}
          <div class="partes"><div class="cab-p"><span class="lbl">Partes</span>${lleno && n.partes.length ? `<small>${clientes ? plural(clientes, 'cliente marcado', 'clientes marcados') : 'Marca quién es tu cliente'}</small>` : ''}</div>
            ${n.partes.length ? n.partes.map(pt).join('') : '<div class="lista-vacia">Agrega a tu cliente y a las demás partes. Sus nombres se reemplazan por marcadores antes de cada consulta.</div>'}
            <button type="button" class="agregar" data-action="ne-agregar">${ic('mas')}Agregar parte</button>
          </div>
          <p class="ne-err" id="ne-err" role="alert"></p>
        </div>
      </div>
    </div>
    <div class="mp"><span class="nota">${ic('candado')}Todo se guarda cifrado en este equipo</span><button type="button" class="pb" data-action="ne-cerrar">Cancelar</button><button type="button" class="pb prim" data-action="ne-crear"${(lleno && n.partes.length && !clientes) || st === 'leyendo' ? ' disabled' : ''}>Crear expediente</button></div>`;
}
async function archivoNE(f) {
  const n = S.ne; if (!n || !f) return;
  leerNE(); n.archivo = { name: f.name }; n.estado = 'leyendo'; n.error = ''; pintarNE();
  try {
    if (f.size > 40 * 1024 * 1024) throw new FolioError(`${f.name} supera 40 MB.`);
    const r = await extractText(f); if (S.ne !== n) return;
    const text = r.text.slice(0, 1500000);
    if (r.scanned || !text.trim()) { Object.assign(n, { estado: 'escaneo', archivo: null, error: r.type === 'pdf' ? '' : 'Este archivo no tiene texto' }); pintarNE(); return; }
    const enc = leerEncabezado(text);
    n.archivo = { name: f.name, text, type: r.type, pages: r.pages };
    n.enc = enc;
    for (const k of enc.detectado) if (!n.datos[k]) n.datos[k] = enc[k];
    const ya = new Set(n.partes.map(p => norm(p.nombre)));
    n.partes = [...n.partes.filter(p => p.nombre.trim()), ...enc.partes.filter(p => !ya.has(norm(p.nombre))).map(p => ({ nombre: p.nombre, rol: p.rol, doc: '', cli: false }))];
    n.estado = 'lleno'; pintarNE();
  } catch (err) { if (S.ne !== n) return; Object.assign(n, { estado: 'escaneo', archivo: null, error: err instanceof FolioError ? err.message : 'No se pudo leer el archivo.' }); pintarNE(); }
}
async function crearNE() {
  const n = S.ne; if (!n) return; leerNE();
  const d = n.datos, partes = n.partes.filter(p => p.nombre.trim());
  if (!d.numero && !partes.length) { $('#ne-err').textContent = 'Ingresa al menos el número de expediente o el nombre de tu cliente.'; return; }
  if (n.estado === 'lleno' && partes.length && !partes.some(p => p.cli)) { $('#ne-err').textContent = 'Marca quién es tu cliente.'; return; }
  const e = blankExp(d); e.juez = d.juez || ''; e.especialista = d.especialista || '';
  partes.forEach(p => addParte(e, p.nombre, p.rol, p.doc, p.cli));
  const docTexts = {};
  if (n.archivo?.text) {
    const a = n.archivo, id = uid();
    await store.put('doc:' + id, { id, expId: e.id, name: a.name, text: a.text }); docTexts[id] = a.text;
    e.docs.push({ id, name: a.name, type: a.type, pages: a.pages, chars: a.text.length, addedAt: todayISO() });
    const r = n.enc?.resolucion;
    if (r) e.movimientos.push({ id: uid(), fecha: r.fecha || '', acto: r.acto, sumilla: '', addedAt: new Date().toISOString() });
    e.origen = { docId: id, nombre: a.name, detectado: n.enc?.detectado || [], resolucion: r?.acto || '', ofrecer: true };
  }
  cerrarNE();
  Object.assign(S, { exp: e, docTexts, movsAll: false, vista: 'inicio', sideOpen: false, visitaPrevia: null, recienCreado: e.id }); resetFicha();
  await saveExp(); S.settings.lastExp = e.id; await saveSettings(); render();
  aviso(`Expediente creado${partes.length ? ` con ${plural(partes.length, 'parte', 'partes')}` : ''}${e.docs.length ? ' y 1 documento' : ''}`);
}
// Inicio de un expediente recién creado desde un documento: de dónde salió y la oferta de resumirlo (D-50)
function origenHTML(e) {
  const o = e.origen; if (!o) return '';
  const rows = [], r = (f, t) => `<div class="r"><span class="num">${f}</span><span>${t}</span></div>`;
  if (S.recienCreado === e.id) {
    const mov = e.movimientos.find(v => v.acto === o.resolucion);
    if (mov) rows.push(r(mov.fecha ? ddmm(mov.fecha) : '—', `${esc(mov.acto)}: primer movimiento del expediente`));
    if (e.partes.length) rows.push(r('—', `${plural(e.partes.length, 'parte registrada', 'partes registradas')}: sus nombres se reemplazan antes de cada consulta`));
    rows.push(r('—', '1 documento: la resolución, guardada cifrada en este equipo'));
  }
  const ofrece = o.ofrecer && isReady(S.settings) && e.docs.some(d => d.id === o.docId);
  const s = S.settings;
  return `${rows.length ? `<div class="nov"><span class="lbl">Creado desde «${esc(o.nombre)}»</span>${rows.join('')}</div>` : ''}
    ${ofrece ? `<div class="ofrece"><div class="t">${ic('doc')}<div><b>¿Quieres que el agente resuma lo que ordena esta resolución?</b><br><small>Propondrá el estado procesal, los pendientes y los plazos que mencione. Tú revisas cada cambio en la ficha; ningún plazo se guarda sin tu confirmación.</small></div></div>
      <div class="acc"><button class="pb prim" data-action="ne-resumir">Resumir con el agente</button><button class="pb" data-action="ne-ahora-no">Ahora no</button><button type="button" class="destino" data-action="destino" title="Ver lo que se enviará">${ic('candado')}${esc(s.provider === 'custom' ? 'Servidor propio' : provLabel(s.provider))}<span class="modelo">· <span class="num">${esc(s.model.split('/').pop())}</span></span></button></div></div>` : ''}`;
}
async function resumirOrigen() {
  const e = S.exp, o = e.origen, d = o && e.docs.find(x => x.id === o.docId); if (!d) return;
  o.ofrecer = false; await saveExp(); await irAChatNuevo();
  await sendChat(`Resume lo que ordena @«${d.name}»: qué decide el juzgado, qué plazos menciona y qué debo hacer ahora. Recuérdame verificar cada plazo en la resolución y en mi casilla.`);
}
// Al agregar una resolución a un expediente abierto: si es del mismo número, ofrece las partes y datos nuevos (nada se aplica sin clic)
async function datosNuevosDe(e, docName, text) {
  const enc = leerEncabezado(text); if (!enc.numero || enc.numero !== e.numero) return;
  const clave = s => norm(s).split(/\s+/).sort().join(' '), ya = new Set(e.partes.map(p => clave(p.nombre)));
  const items = enc.partes.filter(p => !ya.has(clave(p.nombre))).map(p => ({ k: 'parte', label: `Parte: ${p.nombre} · ${lcFirst(p.rol)}`, p }));
  for (const [k, l] of [['juez', 'Juez'], ['especialista', 'Especialista'], ['organo', 'Órgano jurisdiccional']]) if (enc[k] && enc[k] !== e[k]) items.push({ k, label: `${l}: ${enc[k]}${e[k] ? ` (antes: ${e[k]})` : ''}`, v: enc[k] });
  const r = enc.resolucion; if (r && !e.movimientos.some(v => v.acto === r.acto)) items.push({ k: 'mov', label: `Movimiento: ${r.acto}${r.fecha ? ` del ${fmtDate(r.fecha)}` : ''}`, r });
  if (!items.length) return;
  const sel = await askDialog({ title: 'Datos nuevos en la resolución', ok: 'Agregar seleccionados', wide: true, collect: d => $$('[data-nuevo]', d).filter(c => c.checked).map(c => +c.dataset.nuevo),
    body: `<p>Folio leyó el encabezado de «${esc(docName)}» en tu equipo. Marca lo que quieres agregar al expediente.</p><ul class="proposal">${items.map((it, i) => `<li><label class="check"><input type="checkbox" data-nuevo="${i}" checked><span>${esc(it.label)}</span></label></li>`).join('')}</ul>` });
  if (!sel?.length) return;
  sel.map(i => items[i]).forEach(it => {
    if (it.k === 'parte') addParte(e, it.p.nombre, it.p.rol, '', false);
    else if (it.k === 'mov') e.movimientos.push({ id: uid(), fecha: it.r.fecha || '', acto: it.r.acto, sumilla: '', addedAt: new Date().toISOString() });
    else e[it.k] = it.v;
  });
  await saveExp(); refreshExp(); aviso(`Expediente actualizado · ${plural(sel.length, 'dato', 'datos')}`);
}

/* ============================================================
   Tablas de revisión (E12 · prototipo tabla-revision-v0.8.html)
   Una fila por documento; cada celda del agente con su cita verificada en el equipo (D-53).
   Los documentos elegidos salen completos y seudonimizados, uno por consulta (D-54).
   ============================================================ */
const tablaActual = () => (S.exp?.tablas || []).find(t => t.id === S.tablaId);
const docsConTexto = e => e.docs.filter(d => !d.scanned && (S.docTexts[d.id] || '').trim());
const fechaDMA = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
const isoDeDMA = s => { const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
const docTokens = d => tokensDe(Math.min((S.docTexts[d.id] || '').length, TABLA_LIMITE) + 900);
function abrirTabla(id) {
  S.tablaId = id; S.vista = 'tabla'; S.sideOpen = false; S.ficha = 'cerrada'; resetFicha(); render();
}
/* ---------- Ventana "Nueva tabla de revisión" ---------- */
function nuevaTablaVentana(plantilla = 'cronologia') {
  const e = S.exp; if (!e) return;
  S.nt = { plantilla, sel: new Set(docsConTexto(e).map(d => d.id)) };
  $('#v6')?.insertAdjacentHTML('beforeend', `<div class="velo" id="velo-nt"><div class="modal ne nt" role="dialog" aria-modal="true" aria-labelledby="nt-t"></div></div>`);
  fondoInerte(true); pintarNT(); setTimeout(() => $('#velo-nt .pl.on')?.focus(), 30);
}
function cerrarNT() { S.nt = null; $('#velo-nt')?.remove(); fondoInerte(false); }
function pintarNT() {
  const e = S.exp, n = S.nt, m = $('#velo-nt .modal'); if (!n || !m) return;
  const s = S.settings, docs = [...e.docs].sort((a, b) => (a.addedAt || '').localeCompare(b.addedAt || '')), sel = docs.filter(d => n.sel.has(d.id));
  const tokens = sel.reduce((a, d) => a + docTokens(d), 0), dest = s.provider === 'custom' ? 'tu servidor propio' : `${provLabel(s.provider)} con tu cuenta`;
  const tipo = d => d.type === 'pdf' ? 'PDF' : d.type === 'docx' ? 'DOC' : 'TXT';
  const local = (PLANTILLAS[n.plantilla].columnas || []).filter(c => c.local).map(c => c.local === 'fecha' ? 'fecha' : 'número de resolución');
  m.innerHTML = `<div class="mc"><h2 id="nt-t">Nueva tabla de revisión</h2><button type="button" class="ib" data-action="nt-cerrar" aria-label="Cerrar">${ic('cerrar')}</button></div>
    <div class="mcuerpo">
      <div class="campo"><span class="lbl2">Plantilla</span><div class="plantillas" role="radiogroup" aria-label="Plantilla">${Object.entries(PLANTILLAS).map(([k, p]) => `<button type="button" class="pl${n.plantilla === k ? ' on' : ''}" role="radio" aria-checked="${n.plantilla === k}" data-action="nt-plantilla" data-k="${k}"><b>${k === 'blanco' ? 'En blanco' : esc(p.titulo)}</b><small>${esc(p.desc)}</small></button>`).join('')}</div></div>
      <div class="campo"><span class="lbl2">Documentos a revisar</span>
        ${docs.length ? `<div class="docs-l">${docs.map(d => { const ok = !d.scanned && (S.docTexts[d.id] || '').trim();
          return `<label class="dl${ok ? '' : ' off'}"><input type="checkbox" data-nt-doc="${d.id}"${ok ? (n.sel.has(d.id) ? ' checked' : '') : ' disabled'}><span class="doc-ic">${tipo(d)}</span><span>${esc(d.name)}</span><small>${ok ? `${d.pages ? plural(d.pages, 'pág.', 'págs.') + ' · ' : ''}≈ ${docTokens(d).toLocaleString('es-PE')} tokens` : 'escaneado: sin texto'}</small></label>`; }).join('')}</div>`
          : '<div class="lista-vacia">Este expediente aún no tiene documentos. Agrégalos en la pestaña Documentos de la ficha.</div>'}
      </div>
      ${isReady(s) ? `<div class="estim">
        <div class="l">${ic('candado')}<span>Se enviarán <b>${plural(sel.length, 'documento completo', 'documentos completos')}</b> (≈ ${tokens.toLocaleString('es-PE')} tokens) a <b>${esc(dest)}</b>, uno por consulta, con los datos reemplazados. <a href="#" data-action="nt-ver">Ver lo que se enviará</a></span></div>
        ${local.length ? `<div class="l">${ic('check')}<span>Se lee en tu equipo, sin IA: ${listaY(local)}.</span></div>` : ''}
        ${n.plantilla === 'blanco' ? `<div class="l">${ic('mas')}<span>Después de crearla agregas tus columnas y sus preguntas.</span></div>` : ''}
      </div>` : `<div class="sin-prov"><span>Conecta tu proveedor de IA para revisar documentos con el agente.</span><button class="pb" data-action="open-settings">Conectar proveedor</button></div>`}
    </div>
    <div class="mp"><span class="nota">${ic('candado')}La tabla se guarda cifrada en este expediente</span><button type="button" class="pb" data-action="nt-cerrar">Cancelar</button><button type="button" class="pb prim" data-action="nt-crear"${sel.length && isReady(s) ? '' : ' disabled'}>${n.plantilla === 'blanco' ? 'Crear tabla' : `Revisar ${plural(sel.length, 'documento', 'documentos')}`}</button></div>`;
}
async function crearTabla({ siempre = false } = {}) {
  const e = S.exp, n = S.nt; if (!n) return;
  const ids = e.docs.filter(d => n.sel.has(d.id)).map(d => d.id); if (!ids.length) return;
  const t = nuevaTabla(e, n.plantilla, ids);
  if (t.columnas.length && !(await vistaPreviaLote(t, t.columnas, ids, { siempre }))) { e.tablas = e.tablas.filter(x => x.id !== t.id); return; }
  cerrarNT(); await saveExp(); abrirTabla(t.id);
  if (t.columnas.length) revisarTabla(t, t.columnas, ids); else columnaVentana();
}
/* ---------- Lo que sale: un documento completo por consulta, seudonimizado ---------- */
// Columnas que van al agente para un documento: las que el encabezado no resuelve en el equipo
function colsAgente(texto, cols) { const r = leerEncabezado(texto).resolucion; return cols.filter(c => !(c.local === 'fecha' ? r?.fecha : c.local === 'resolucion' ? r?.acto : '')); }
function loteTabla(e, cols, ids) {
  return ids.map(id => { const d = e.docs.find(x => x.id === id), P = makePseudo(e, S.settings.pseudo), r = recorteDoc(S.docTexts[id] || ''), textoP = P.apply(r.texto), pend = colsAgente(S.docTexts[id] || '', cols);
    return { d, P, user: pend.length ? mensajeTabla(d.name, textoP, pend) : '' }; }).filter(x => x.user);
}
async function vistaPreviaLote(t, cols, ids, { siempre = false } = {}) {
  if (!siempre && !S.settings.review) return true;
  const lote = loteTabla(S.exp, cols, ids), texto = lote.map((x, i) => `=== DOCUMENTO ${i + 1} DE ${lote.length} (una consulta) ===\n${x.user}`).join('\n\n');
  const reemp = lote.flatMap(x => reemplazosEn(x.P, x.user)).filter((r, i, a) => a.findIndex(y => y[1] === r[1]) === i);
  if (!lote.length) return true;   // todo se leyó en el equipo: no sale nada
  return abrirEnvio({ provider: S.settings.provider, model: S.settings.model, n: S.settings.pseudo ? reemp.length : 0, texto, reemp, instr: TABLA_PROMPT });
}
/* ---------- Motor: un documento a la vez; fecha y resolución del encabezado sin IA ---------- */
async function revisarTabla(t, cols, ids) {
  const e = S.exp, s = S.settings; if (S.revision) return;
  const ctrl = new AbortController(); S.revision = { tablaId: t.id, ctrl, hechos: 0, total: ids.length };
  ids.forEach(id => { const f = t.filas.find(x => x.docId === id); if (f) { f.estado = 'pendiente'; delete f.error; } });
  pintarTabla();
  try {
    for (const id of ids) {
      if (ctrl.signal.aborted || S.exp !== e) break;   // si cambias de expediente, la revisión se detiene
      const f = t.filas.find(x => x.docId === id), d = e.docs.find(x => x.id === id); if (!f || !d) continue;
      f.estado = 'revisando'; pintarTabla();
      const texto = S.docTexts[id] || '', r = recorteDoc(texto), enc = leerEncabezado(texto), P = makePseudo(e, s.pseudo);
      f.recorte = r.recorte || undefined;
      const pend = [];
      for (const c of cols) {
        const loc = c.local === 'fecha' ? fechaDMA(enc.resolucion?.fecha) : c.local === 'resolucion' ? enc.resolucion?.acto || '' : '';
        if (loc) f.celdas[c.id] = { valor: loc, origen: 'local', verificada: null };
        else if (f.celdas[c.id]?.origen !== 'abogado') pend.push(c);
      }
      if (pend.length) {
        const textoP = P.apply(r.texto), user = mensajeTabla(d.name, textoP, pend);
        try {
          const out = await llm({ cfg: s, system: TABLA_PROMPT, messages: [{ role: 'user', content: user }], maxTokens: 3000, signal: ctrl.signal });
          await logSend('Tabla de revisión', TABLA_PROMPT.length + user.length, P);
          const j = parseJSONLoose(out).celdas || {};
          for (const c of pend) {
            const x = j[c.id] || {}, valor = typeof x.valor === 'string' && x.valor.trim() ? x.valor.trim() : typeof x.valor === 'number' ? String(x.valor) : null;
            const cita = typeof x.cita === 'string' && x.cita.trim() ? x.cita.trim().slice(0, 600) : null;
            const b = cita ? buscarCita(textoP, cita) : null;
            f.celdas[c.id] = { valor: valor ? P.restore(valor) : null, cita, verificada: b ? b.ok : null, pagina: b?.ok ? b.pagina : null, origen: 'agente' };
          }
          f.estado = 'lista';
        } catch (err) {
          if (err.name === 'AbortError') { f.estado = 'pendiente'; break; }
          Object.assign(f, { estado: 'error', error: err instanceof FolioError ? err.message : 'No se pudo revisar este documento.' });
        }
      } else f.estado = 'lista';
      if (S.exp !== e) break;
      S.revision.hechos++; t.updatedAt = new Date().toISOString(); await saveExp(); pintarTabla();
    }
  } finally { if (S.revision?.ctrl === ctrl) S.revision = null; if (S.exp === e) { t.updatedAt = new Date().toISOString(); await saveExp().catch(fail); pintarTabla(); renderBarra(); } }
}
/* ---------- Vista de la tabla (centro) ---------- */
function marcaCelda(c, col) {
  if (c.origen === 'local') return '<span class="marca loc">leído en tu equipo</span>';
  if (c.origen === 'abogado') return '<span class="marca">editado por ti</span>';
  const pz = col.plazo ? '<span class="marca w">verifica en la resolución y tu casilla</span>' : '';
  if (c.verificada === true) return `<span class="marca ok">✓ cita ${c.pagina ? `en pág. ${c.pagina}` : 'encontrada'}</span>${pz}`;
  if (c.verificada === false) return `<span class="marca w">⚠ cita no encontrada en el documento</span>${pz}`;
  return `<span class="marca w">sin cita: revísala</span>${pz}`;
}
function celdaHTML(t, f, col) {
  const c = f.celdas[col.id];
  if (!c || c.valor == null || c.valor === '') return '<span class="vacia">— no aparece</span>';
  const sel = S.fuenteDoc && S.fuenteDoc.docId === f.docId && S.fuenteDoc.colId === col.id && S.fichaModo === 'fuente-doc';
  const cls = `celda${c.origen === 'agente' && c.verificada !== true ? ' nf' : ''}${col.plazo ? ' pz' : ''}${sel ? ' sel' : ''}`;
  return `<button type="button" class="${cls}" data-action="celda" data-doc="${f.docId}" data-col="${esc(col.id)}"><span class="v">${esc(c.valor)}</span>${marcaCelda(c, col)}</button>`;
}
function resumenTabla(t) {
  const celdas = t.filas.flatMap(f => Object.values(f.celdas)), ag = celdas.filter(c => c.origen === 'agente' && c.valor);
  return { ok: ag.filter(c => c.verificada === true).length, mal: ag.filter(c => c.verificada !== true).length, loc: celdas.filter(c => c.origen === 'local').length };
}
function movsCandidatos(t) {
  const e = S.exp; if (t.plantilla !== 'cronologia' && t.plantilla !== 'notificaciones') return [];
  const colAct = t.plantilla === 'cronologia' ? 'resolucion' : 'acto', colSum = t.plantilla === 'cronologia' ? 'ordena' : 'hacer';
  return t.filas.filter(f => f.estado === 'lista').map(f => {
    const d = e.docs.find(x => x.id === f.docId), fecha = isoDeDMA(f.celdas.fecha?.valor), acto = f.celdas[colAct]?.valor || (d ? d.name.replace(/\.[a-z0-9]+$/i, '') : '');
    return { fecha, acto, sumilla: f.celdas[colSum]?.valor || '' };
  }).filter(m => m.acto && !e.movimientos.some(v => norm(v.acto) === norm(m.acto) && (!m.fecha || !v.fecha || v.fecha === m.fecha)));
}
function plazosCandidatos(t) {
  const col = t.columnas.find(c => c.plazo); if (!col) return [];
  return t.filas.filter(f => f.celdas[col.id]?.valor && !f.celdas[col.id].propuesta).map(f => ({ f, col }));
}
function tablaHTML() {
  const t = tablaActual(); if (!t) return '<div class="col"><p class="sin">Esa tabla ya no existe.</p></div>';
  const e = S.exp, rv = S.revision?.tablaId === t.id ? S.revision : null, r = resumenTabla(t), movs = movsCandidatos(t), pl = plazosCandidatos(t);
  const tipo = d => d?.type === 'pdf' ? 'PDF' : d?.type === 'docx' ? 'DOC' : 'TXT';
  const estado = rv ? `<div class="estado-t"><div class="prog"><span>Revisando <b>${Math.min(rv.hechos + 1, rv.total)} de ${rv.total}</b> ${rv.total === 1 ? 'documento' : 'documentos'} · el agente lee uno por uno, con los datos reemplazados</span><span class="barra-p"><i style="width:${Math.round(rv.hechos / rv.total * 100)}%"></i></span></div><div class="acc"><button class="pb" data-action="tabla-detener">Detener</button></div></div>`
    : `<div class="estado-t"><div class="res"><span><b>${plural(t.filas.length, 'documento', 'documentos')}</b></span>${r.ok ? `<span class="ok">✓ ${plural(r.ok, 'cita verificada', 'citas verificadas')} en el documento</span>` : ''}${r.mal ? `<span class="w">⚠ ${r.mal} por revisar</span>` : ''}${r.loc ? `<span>${plural(r.loc, 'dato leído', 'datos leídos')} en tu equipo</span>` : ''}${t.filas.some(f => f.estado === 'pendiente') ? '<button class="pb" data-action="tabla-continuar">Continuar la revisión</button>' : ''}</div>
      <div class="acc">${t.columnas.some(c => c.plazo) ? `<button class="pb" data-action="tabla-proponer"${pl.length ? '' : ' disabled'}>Proponer a la memoria (${pl.length})</button>` : ''}${t.plantilla === 'cronologia' || t.plantilla === 'notificaciones' ? `<button class="pb prim" data-action="tabla-movs"${movs.length ? '' : ' disabled'}>${movs.length ? `Agregar a Movimientos (${movs.length})` : 'En Movimientos ✓'}</button>` : ''}</div></div>`;
  const filas = t.filas.map(f => {
    const d = e.docs.find(x => x.id === f.docId);
    const docTd = `<td><div class="docn"><span class="doc-ic">${tipo(d)}</span><span><b>${esc(d?.name || 'Documento borrado')}</b><small>${d?.pages ? plural(d.pages, 'pág.', 'págs.') : ''}${f.recorte ? ` · se revisaron las págs. 1–${f.recorte.hasta || '?'}${f.recorte.de ? ` de ${f.recorte.de}` : ''}` : ''}</small></span></div></td>`;
    if (!t.columnas.length) return `<tr>${docTd}<td class="cola">Agrega una columna para revisar este documento.</td></tr>`;
    if (f.estado === 'revisando') return `<tr>${docTd}<td colspan="${t.columnas.length}"><div class="skel" style="width:70%"></div><div class="skel" style="width:45%"></div><span class="cola">Revisando con el agente…</span></td></tr>`;
    if (f.estado === 'pendiente' && !Object.keys(f.celdas).length) return `<tr>${docTd}<td colspan="${t.columnas.length}" class="cola">${rv ? 'En cola' : 'Sin revisar'}</td></tr>`;
    if (f.estado === 'error') return `<tr>${docTd}<td colspan="${t.columnas.length}" class="cola err">${esc(f.error || 'No se pudo revisar.')} <button class="pb" data-action="tabla-fila" data-doc="${f.docId}">Reintentar</button></td></tr>`;
    return `<tr>${docTd}${t.columnas.map(c => `<td>${celdaHTML(t, f, c)}</td>`).join('')}</tr>`;
  }).join('');
  return `${estado}<div class="tabla-w"><table class="rev" aria-label="${esc(t.titulo)}"><thead><tr><th scope="col">Documento</th>${t.columnas.map(c => `<th scope="col">${esc(c.nombre)}${c.nota ? `<small>${esc(c.nota)}</small>` : ''}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>
    <div class="nota-t">Cada celda del agente trae una cita textual: Folio la busca en el documento <b>en tu equipo</b>. ✓ = la encontró; ⚠ = no está en el texto, revísala. Los plazos se verifican siempre en la resolución y en tu casilla.</div>`;
}
function pintarTabla() { if (S.vista !== 'tabla') return; const c = $('#centro'); if (!c) return; const sc = $('.tabla-w', c)?.scrollTop || 0; c.innerHTML = centroHTML(); const w = $('.tabla-w', c); if (w) w.scrollTop = sc; layout(); }
/* ---------- Ficha en modo "Fuente del documento" ---------- */
function fuenteDocHTML() {
  const t = tablaActual(), fd = S.fuenteDoc, e = S.exp; if (!t || !fd) return '';
  const f = t.filas.find(x => x.docId === fd.docId), col = t.columnas.find(c => c.id === fd.colId), c = f?.celdas[fd.colId], d = e.docs.find(x => x.id === fd.docId);
  if (!f || !col || !c || !d) return '<div class="panel"><div class="sin">Esa celda ya no existe.</div></div>';
  const P = makePseudo(e, S.settings.pseudo), textoP = P.apply(recorteDoc(S.docTexts[d.id] || '').texto);
  let pasaje = '', b = null;
  if (c.cita) { b = buscarCita(textoP, c.cita); if (b?.ok) { const a = Math.max(0, b.ini - 220), z = Math.min(textoP.length, b.fin + 220);
    pasaje = `${a > 0 ? '… ' : ''}${esc(P.restore(textoP.slice(a, b.ini)))}<mark>${esc(P.restore(textoP.slice(b.ini, b.fin)))}</mark>${esc(P.restore(textoP.slice(b.fin, z)))}${z < textoP.length ? ' …' : ''}`.replace(/\[Pág\. \d+\]\n?/g, ''); } }
  const est = c.origen === 'local' ? ['', 'Leído en tu equipo del encabezado, sin IA'] : c.origen === 'abogado' ? ['', 'Editado por ti'] : b?.ok ? ['', 'Cita encontrada en el documento'] : c.cita ? ['w', 'La cita del agente no está en el documento'] : ['w', 'El agente no dio una cita'];
  const nota = c.origen === 'local' ? 'Folio leyó este dato del encabezado del documento, en tu equipo. Verifícalo en la resolución.'
    : c.origen === 'abogado' ? 'Escribiste este valor. Folio no lo verifica.'
    : b?.ok ? `Folio verificó en tu equipo que esta cita está en el documento. "${esc(col.nombre)}" es un resumen del agente: revisa el documento completo antes de usarlo en un escrito.`
    : c.cita ? `El agente citó: «${esc(P.restore(c.cita))}». Folio no encontró ese texto en el documento. Corrige la celda o vuelve a revisar la fila.` : 'Sin una cita no se puede comprobar de dónde salió. Corrige la celda o vuelve a revisar la fila.';
  return `<div class="panel fuente">
    <div class="bloque"><span class="lbl">Fuente en el documento · ${esc(col.nombre)}</span><h3>${esc(d.name)}${b?.ok && b.pagina ? ` · pág. ${b.pagina}` : ''}</h3></div>
    <span class="vig${est[0] ? ' warn' : ''}">${ic(est[0] ? 'aviso' : 'check', 'width:13px;height:13px')}${est[1]}</span>
    <div class="bloque"><span class="lbl">Valor</span><div class="fest">${esc(c.valor || '—')}</div></div>
    ${pasaje ? `<div class="pasaje">${pasaje}</div>` : ''}
    ${col.plazo ? '<div class="verif">' + ic('aviso') + '<span>Folio no calcula plazos: verifica la fecha en la resolución y en tu casilla.</span></div>' : ''}
    <p class="nota">${nota}</p>
    <div class="acc"><button class="pb" data-action="celda-editar">Editar celda</button><button class="pb" data-action="tabla-fila" data-doc="${f.docId}"${S.revision ? ' disabled' : ''}>Volver a revisar esta fila</button></div>
  </div>`;
}
/* ---------- Columnas, edición, movimientos, memoria y exportación ---------- */
function columnaVentana() {
  const t = tablaActual(); if (!t) return;
  const ids = t.filas.map(f => f.docId), tokens = S.exp.docs.filter(d => ids.includes(d.id)).reduce((a, d) => a + docTokens(d), 0);
  $('#v6')?.insertAdjacentHTML('beforeend', `<div class="velo" id="velo-col"><div class="modal ne chica" role="dialog" aria-modal="true" aria-labelledby="nc-t">
    <div class="mc"><h2 id="nc-t">Nueva columna</h2><button type="button" class="ib" data-action="col-cerrar" aria-label="Cerrar">${ic('cerrar')}</button></div>
    <div class="mcuerpo">
      <label class="campo"><span class="lbl2">Nombre</span><input class="input" id="col-n" placeholder="Ej.: monto de la pensión" maxlength="60"></label>
      <label class="campo"><span class="lbl2">Pregunta para el agente</span><textarea class="input" id="col-p" rows="2" placeholder="Ej.: ¿qué monto o porcentaje de pensión se pide, se ofrece o se fija en este documento?"></textarea></label>
      <div class="campo"><span class="lbl2" id="col-tl">Tipo</span><div class="seg" role="radiogroup" aria-labelledby="col-tl">${Object.entries(TIPOS_COL).map(([k, l], i) => `<button type="button" role="radio" aria-checked="${!i}" class="${i ? '' : 'on'}" data-action="col-tipo" data-k="${k}">${l}</button>`).join('')}</div></div>
      <div class="estim"><div class="l">${ic('candado')}<span>Se revisarán de nuevo <b>${plural(ids.length, 'documento', 'documentos')}</b> (≈ ${tokens.toLocaleString('es-PE')} tokens) solo para esta columna, con los datos reemplazados.</span></div></div>
      <p class="ne-err" id="col-err" role="alert"></p>
    </div>
    <div class="mp"><button type="button" class="pb" data-action="col-cerrar">Cancelar</button><button type="button" class="pb prim" data-action="col-crear">Agregar columna</button></div></div></div>`);
  fondoInerte(true); setTimeout(() => $('#col-n')?.focus(), 30);
}
function cerrarColumna() { $('#velo-col')?.remove(); fondoInerte(false); }
async function crearColumna() {
  const t = tablaActual(); if (!t) return;
  const nombre = $('#col-n').value.trim(), pregunta = $('#col-p').value.trim(), tipo = $('#velo-col .seg .on')?.dataset.k || 'texto';
  if (!nombre || !pregunta) { $('#col-err').textContent = 'Escribe el nombre y la pregunta.'; return; }
  const col = { id: 'c' + uid().slice(0, 6), nombre, pregunta: tipo === 'cita' ? `${pregunta} Responde copiando el texto literal.` : pregunta, tipo };
  const ids = t.filas.map(f => f.docId);
  if (!(await vistaPreviaLote(t, [col], ids))) return;
  t.columnas.push(col); cerrarColumna(); await saveExp(); pintarTabla();
  revisarTabla(t, [col], ids);
}
async function editarCelda() {
  const t = tablaActual(), fd = S.fuenteDoc; if (!t || !fd) return;
  const f = t.filas.find(x => x.docId === fd.docId), c = f?.celdas[fd.colId]; if (!f) return;
  const r = await askDialog({ title: 'Editar celda', ok: 'Guardar', collect: d => $('#celda-v', d).value.trim(),
    body: `<label class="field"><span>${esc(t.columnas.find(x => x.id === fd.colId)?.nombre || 'Valor')}</span><textarea class="textarea" id="celda-v" rows="3">${esc(c?.valor || '')}</textarea></label><p class="small muted">El valor queda como "editado por ti": Folio no lo verifica.</p>` });
  if (r == null || r === false) return;
  f.celdas[fd.colId] = { ...(c || {}), valor: r || null, origen: 'abogado', verificada: null };
  t.updatedAt = new Date().toISOString(); await saveExp(); pintarTabla(); renderFicha();
}
async function agregarMovs() {
  const t = tablaActual(), e = S.exp, movs = movsCandidatos(t); if (!movs.length) return;
  const nuevos = movs.map(m => ({ id: uid(), fecha: m.fecha, acto: m.acto, sumilla: m.sumilla, addedAt: new Date().toISOString(), deTabla: t.id }));
  e.movimientos.push(...nuevos); await saveExp(); pintarTabla(); renderFicha();
  aviso(`${plural(nuevos.length, 'movimiento agregado', 'movimientos agregados')}`, async () => { const ids = new Set(nuevos.map(n => n.id)); e.movimientos = e.movimientos.filter(v => !ids.has(v.id)); await saveExp(); pintarTabla(); renderFicha(); });
}
async function proponerDeTabla() {
  const t = tablaActual(), e = S.exp, pl = plazosCandidatos(t); if (!pl.length) return;
  const items = pl.map(({ f, col }) => {
    const v = f.celdas[col.id].valor, fecha = isoDeDMA(v), d = e.docs.find(x => x.id === f.docId), de = f.celdas.resolucion?.valor || f.celdas.acto?.valor || d?.name || '';
    return fecha ? { k: 'plazo', v: `${v} (${de})`, fecha } : { k: 'pend', v: `Verificar plazo: ${v} (${de})` };
  });
  addProposals(e, items, t.id); pl.forEach(({ f, col }) => { f.celdas[col.id].propuesta = true; });
  await saveExp(); pintarTabla(); renderBarra(); revisarCambios();
  aviso(`${plural(items.length, 'cambio enviado', 'cambios enviados')} a la caja de la ficha`);
}
function tablaFilas(t) {
  const e = S.exp, cols = t.columnas;
  return [['Documento', ...cols.map(c => c.nombre), ...cols.map(c => `Cita · ${c.nombre}`)],
    ...t.filas.map(f => { const d = e.docs.find(x => x.id === f.docId); return [d?.name || '', ...cols.map(c => f.celdas[c.id]?.valor || ''), ...cols.map(c => f.celdas[c.id]?.cita ? makePseudo(e, false).restore(f.celdas[c.id].cita) : '')]; })];
}
function exportarTabla() {
  const t = tablaActual(); if (!t) return;
  const csv = tablaFilas(t).map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${t.titulo.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-')}-${numCorto(S.exp.numero || 'expediente')}.csv`);
  aviso('Tabla descargada en tu equipo (CSV)');
}
async function copiarTabla() {
  const t = tablaActual(); if (!t) return;
  const filas = tablaFilas(t).map(r => r.slice(0, 1 + t.columnas.length));
  await navigator.clipboard.writeText(filas.map(r => r.map(x => String(x).replace(/\s+/g, ' ')).join('\t')).join('\n'));
  aviso('Copiada: pégala en tu escrito como tabla');
}
async function tablaMenu() {
  const t = tablaActual(); if (!t) return;
  const r = await askDialog({ title: 'Tabla de revisión', ok: 'Guardar', collect: d => ({ titulo: $('#tb-t', d).value.trim() }),
    body: `<label class="field"><span>Título</span><input class="input" id="tb-t" value="${esc(t.titulo)}" maxlength="80"></label>
      <p class="small muted">${plural(t.filas.length, 'documento', 'documentos')} · ${plural(t.columnas.length, 'columna', 'columnas')}. Si borras la tabla, los documentos y la memoria se mantienen.</p>
      <button type="button" class="btn danger sm" data-action="tabla-borrar">Borrar tabla</button>` });
  if (!r) return; if (r.titulo) t.titulo = r.titulo; await saveExp(); render();
}
async function borrarTabla() {
  const e = S.exp, t = tablaActual(); closeDialog(); if (!t) return;
  if (!(await askDialog({ title: 'Borrar tabla', ok: 'Borrar', danger: true, body: `<p>Se borrará «${esc(t.titulo)}» de este equipo. Los documentos, los movimientos y la memoria se mantienen. No se puede deshacer.</p>` }))) return;
  e.tablas = e.tablas.filter(x => x.id !== t.id); S.vista = 'inicio'; S.tablaId = null; resetFicha(); await saveExp(); render(); aviso('Tabla borrada');
}

async function expForm(e) {
  const isNew = !e; e = e || {};
  const r = await askDialog({ title: isNew ? 'Nuevo expediente' : 'Datos del expediente', ok: isNew ? 'Crear expediente' : 'Guardar cambios', wide: true,
    collect: d => { const f = Object.fromEntries($$('[name]', d).map(i => [i.name, i.type === 'checkbox' ? i.checked : i.value.trim()])); if (isNew && !f.numero && !f.cliente) { $('#exp-err', d).textContent = 'Ingresa al menos el número de expediente o el nombre de tu cliente.'; return null; } return f; },
    body: `<div class="grid2">
      <label class="field"><span>Número de expediente</span><input class="input mono" name="numero" value="${esc(e.numero)}" placeholder="00000-2026-0-0000-XX-XX-00"></label>
      <label class="field"><span>Materia</span><input class="input" name="materia" value="${esc(e.materia)}" placeholder="Ej.: alimentos, desalojo, violencia familiar"></label>
      <label class="field"><span>Especialidad</span><select class="select" name="especialidad"><option value="">Elegir</option>${ESPECIALIDADES.map(x => `<option ${e.especialidad === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="field"><span>Distrito judicial</span><input class="input" name="distrito" value="${esc(e.distrito)}" placeholder="Ej.: Junín"></label>
      <label class="field" style="grid-column:1/-1"><span>Órgano jurisdiccional</span><input class="input" name="organo" value="${esc(e.organo)}" placeholder="Ej.: 2.° Juzgado de Familia de Huancayo"></label>
      <label class="field"><span>Juez</span><input class="input" name="juez" value="${esc(e.juez)}" placeholder="Nombres y apellidos"></label>
      <label class="field"><span>Especialista</span><input class="input" name="especialista" value="${esc(e.especialista)}" placeholder="Especialista o secretario"></label>
      <label class="field" style="grid-column:1/-1"><span>Estado procesal</span><input class="input" name="estado" value="${esc(e.estado)}" placeholder="Ej.: calificación de la demanda"></label>
      ${isNew ? `<label class="field"><span>Tu cliente</span><input class="input" name="cliente" placeholder="Nombres y apellidos"><small>Podrás agregar más partes en la memoria.</small></label>
      <label class="field"><span>Rol de tu cliente</span><select class="select" name="rolCliente">${['Demandante', 'Demandado', 'Agraviado(a)', 'Imputado(a)', 'Tercero', 'Otro'].map(x => `<option>${x}</option>`).join('')}</select></label>
      <label class="field"><span>Contraparte</span><input class="input" name="contraparte" placeholder="Nombres y apellidos o razón social"></label>
      <label class="field"><span>Rol de la contraparte</span><select class="select" name="rolContra">${['Demandado', 'Demandante', 'Imputado(a)', 'Agraviado(a)', 'Tercero', 'Otro'].map(x => `<option>${x}</option>`).join('')}</select></label>` : ''}
    </div><p id="exp-err" class="small" style="color:var(--danger)" role="alert"></p>
    ${isNew ? '' : '<div class="note danger" style="margin-top:.5rem"><p>¿Ya no necesitas este expediente? <button type="button" class="btn danger sm" data-action="del-exp">Eliminar expediente</button></p></div>'}` });
  if (!r) return;
  if (isNew) {
    const ne = blankExp(r);
    if (r.cliente) addParte(ne, r.cliente, r.rolCliente, '', true);
    if (r.contraparte) addParte(ne, r.contraparte, r.rolContra, '', false);
    Object.assign(S, { exp: ne, docTexts: {}, movsAll: false, vista: 'inicio', sideOpen: false, visitaPrevia: null }); resetFicha();
    await saveExp(); S.settings.lastExp = ne.id; await saveSettings(); render(); toast('Expediente creado.');
  } else {
    Object.assign(S.exp, { numero: r.numero, materia: r.materia, especialidad: r.especialidad, organo: r.organo, distrito: r.distrito, estado: r.estado, juez: r.juez, especialista: r.especialista });
    await saveExp(); render(); toast('Datos guardados.');
  }
}
async function deleteExp() {
  const e = S.exp; closeDialog();
  const ok = await askDialog({ title: 'Eliminar expediente', ok: 'Eliminar definitivamente', danger: true, body: `<p>Se eliminará <strong class="mono">${esc(e.numero || 'este expediente')}</strong> con su memoria, movimientos, documentos y conversaciones de este equipo. No se puede deshacer.</p>` });
  if (!ok) return;
  for (const d of e.docs) await store.del('doc:' + d.id);
  await store.del('exp:' + e.id); S.index = S.index.filter(x => x.id !== e.id); await store.put('index', S.index);
  S.exp = null; S.vista = S.index.length ? 'hoy' : 'vacio'; S.settings.lastExp = null; await saveSettings(); render(); toast('Expediente eliminado.');
}
async function movForm() {
  const r = await askDialog({ title: 'Agregar movimiento', ok: 'Agregar',
    collect: d => { const f = { fecha: $('#mv-f', d).value, acto: $('#mv-a', d).value.trim(), sumilla: $('#mv-s', d).value.trim() }; if (!f.acto) { $('#mv-err', d).textContent = 'Indica el acto, por ejemplo Resolución 2.'; return null; } return f; },
    body: `<div class="grid2"><label class="field"><span>Fecha</span><input class="input mono" type="date" id="mv-f" value="${todayISO()}"></label><label class="field"><span>Acto</span><input class="input" id="mv-a" placeholder="Ej.: Resolución 2, Escrito, Audiencia"></label></div>
      <label class="field"><span>Sumilla</span><textarea class="textarea" id="mv-s" rows="3" placeholder="Qué se resolvió o presentó"></textarea></label><p id="mv-err" class="small" style="color:var(--danger)" role="alert"></p>` });
  if (!r) return;
  S.exp.movimientos.push({ id: uid(), ...r, addedAt: new Date().toISOString() }); await saveExp(); refreshExp(); toast('Movimiento agregado.');
}

/* ---------- Expediente de ejemplo (datos ficticios) ---------- */
async function loadSample() {
  const e = blankExp({ numero: '00845-2026-0-1501-JP-FC-01', materia: 'Alimentos', especialidad: 'Familia', organo: 'Juzgado de Paz Letrado de Huancayo', distrito: 'Junín', estado: 'Demanda contestada; audiencia única programada' });
  e.ejemplo = true;
  addParte(e, 'Rosa Elena Quispe Rojas', 'Demandante', '45879632', true);
  addParte(e, 'Julio César Huamán Torres', 'Demandado', '41236598', false);
  const m = e.memoria;
  m.resumen = 'Demanda de alimentos a favor de la hija de la demandante, de 7 años. Se pide una pensión mensual equivalente al 30 % de los ingresos del demandado, técnico en una empresa minera de la región.';
  m.hechos = 'La convivencia terminó en 2024.\nEl demandado dejó de aportar desde enero de 2026.\nLa madre cubre pensión escolar, útiles y controles médicos de la menor.';
  m.estrategia = 'Acreditar los ingresos del demandado con informe de su empleador. Presentar liquidación de gastos mensuales de la menor con boletas.';
  m.pendientes.push({ id: uid(), text: 'Reunir boletas de gastos escolares de 2026', done: false }, { id: uid(), text: 'Pedir al juzgado oficio al empleador del demandado', done: true });
  m.plazos.push({ id: uid(), fecha: addDaysISO(2), desc: 'Presentar escrito con medios probatorios adicionales', done: false }, { id: uid(), fecha: addDaysISO(9), desc: 'Audiencia única (confirmar hora en la resolución)', done: false });
  [['2026-08-04', 'Demanda', 'Ingreso de la demanda por mesa de partes electrónica.'], ['2026-08-12', 'Resolución 1', 'Admite a trámite la demanda y corre traslado al demandado.'], ['2026-09-02', 'Escrito del demandado', 'Contesta la demanda; alega ingresos menores a los indicados.'], ['2026-09-15', 'Resolución 3', 'Tiene por contestada la demanda y cita a audiencia única.']]
    .forEach(([fecha, acto, sumilla]) => e.movimientos.push({ id: uid(), fecha, acto, sumilla }));
  const docText = `SUMILLA: Demanda de alimentos\n\nSEÑOR JUEZ DEL JUZGADO DE PAZ LETRADO DE HUANCAYO:\n\nROSA ELENA QUISPE ROJAS, identificada con DNI N.° 45879632, con domicilio real en Jr. Los Pinos 245, El Tambo, teléfono 964 123 456 y correo rosa.quispe@correo.pe, ante usted me presento y digo:\n\nI. PETITORIO\nInterpongo demanda de alimentos contra JULIO CÉSAR HUAMÁN TORRES, identificado con DNI N.° 41236598, a fin de que acuda a nuestra menor hija con una pensión alimenticia mensual equivalente al 30 % de sus ingresos.\n\nII. FUNDAMENTOS DE HECHO\n1. La recurrente y el demandado mantuvieron una convivencia que concluyó en el año 2024.\n2. Desde enero de 2026 el demandado no aporta para la manutención de la menor, pese a percibir ingresos como técnico en una empresa minera.\n3. La recurrente asume sola los gastos de educación, alimentación, vestido y salud de la menor, que ascienden aproximadamente a S/ 1,200 mensuales.\n\nIII. MEDIOS PROBATORIOS\n1. Partida de nacimiento de la menor.\n2. Boletas de pago de pensión escolar.\n3. Constancias de atención médica.\n\n(Documento ficticio de ejemplo.)`;
  const id = uid(); await Promise.resolve();
  S.exp = e; S.docTexts = { [id]: docText };
  await store.put('doc:' + id, { id, expId: e.id, name: 'Demanda de alimentos (ejemplo).txt', text: docText });
  e.docs.push({ id, name: 'Demanda de alimentos (ejemplo).txt', type: 'txt', pages: 1, chars: docText.length, addedAt: todayISO() });
  Object.assign(S, { vista: 'inicio', movsAll: false, sideOpen: false, visitaPrevia: null }); resetFicha();
  await saveExp(); S.settings.lastExp = e.id; await saveSettings(); render(); toast('Expediente de ejemplo cargado. Todos sus datos son ficticios.');
}

/* ============================================================
   Ajustes
   ============================================================ */
async function settingsView() { if (S.vista !== 'ajustes') S.vistaPrev = S.vista; S.vista = 'ajustes'; S.draftCfg = { ...pickCfg(S.settings) }; S.sideOpen = false; render(); }
function closeSettings() { const p = S.vistaPrev; S.vista = p && p !== 'ajustes' ? p : S.exp ? 'inicio' : S.index.length ? 'hoy' : 'vacio'; render(); }
function settingsHTML() {
  const s = S.settings;
  return `<div class="settings"><div class="wrap">
    <div class="row" style="justify-content:space-between;margin-bottom:1rem"><h1 style="margin:0">Ajustes</h1><button class="btn" data-action="close-settings">Volver a expedientes</button></div>
    <section class="sheet"><div class="sheet-head"><h3>Proveedor de IA</h3><button class="btn sm" data-action="show-keyguide">Guía para obtener tu key</button></div><p class="hint">Usas tu propia cuenta. La key se guarda cifrada en este equipo.</p><div id="pf-block">${providerFieldsHTML(S.draftCfg)}</div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" data-action="save-provider">Guardar proveedor</button></div></section>
    <section class="sheet"><h3>Privacidad de cada consulta</h3>
      <label class="switch" style="margin:.6rem 0 1rem"><input type="checkbox" data-setting="pseudo" ${s.pseudo ? 'checked' : ''}><span><strong>Reemplazar datos personales antes de enviar</strong><br><span class="small muted">Nombres y documentos de las partes, DNI, RUC, teléfonos, correos y direcciones.</span></span></label>
      <label class="switch" style="margin-bottom:1rem"><input type="checkbox" data-setting="review" ${s.review ? 'checked' : ''}><span><strong>Revisar el texto antes de cada envío</strong><br><span class="small muted">Muestra exactamente lo que saldrá de tu equipo y te pide confirmar.</span></span></label>
      <label class="field" style="max-width:360px"><span>Presupuesto de contexto por conversación</span><select class="select" data-setting="contextoMax">${[30000, 60000, 100000, 150000].map(n => `<option value="${n}" ${presupuesto() === n ? 'selected' : ''}>${n.toLocaleString('es-PE')} tokens${n === DEFAULT_SETTINGS.contextoMax ? ' (recomendado)' : ''}</option>`).join('')}</select><small>Desde el 70 % Folio te sugiere seguir en una conversación nueva con un resumen. Súbelo solo si tu modelo admite más contexto.</small></label>
      <div class="note warn"><p>Reemplazar datos reduce el riesgo, pero no anonimiza. Envía solo lo indispensable en casos sensibles.</p></div></section>
    <section class="sheet"><h3>Seguridad</h3>
      <label class="field" style="max-width:280px"><span>Bloqueo automático por inactividad</span><select class="select" data-setting="autoLockMin">${[5, 15, 30, 60].map(n => `<option value="${n}" ${s.autoLockMin === n ? 'selected' : ''}>${n} minutos</option>`).join('')}</select></label>
      <div class="row"><button class="btn" data-action="change-pass">Cambiar contraseña</button><button class="btn" data-action="lock-now">Bloquear ahora</button></div></section>
    <section class="sheet"><h3>Copias de seguridad</h3><p class="hint">La copia sale cifrada con tu contraseña actual. Guárdala en un lugar seguro: sin ella, perder este navegador es perder tus datos.</p>
      <div class="row"><button class="btn" data-action="export-backup">Descargar copia cifrada</button><button class="btn" data-action="import-backup">Restaurar una copia</button></div></section>
    <section class="sheet"><div class="sheet-head"><h3>Registro de envíos</h3>${S.audit.length ? '<button class="btn sm" data-action="export-audit">Descargar CSV</button>' : ''}</div>
      <p class="hint">Cada vez que el agente envía información, queda anotado aquí, solo en este equipo. Te sirve para demostrar qué salió, cuándo y a quién.</p>
      ${S.audit.length ? `<div class="table-wrap"><table class="audit"><thead><tr><th>Fecha</th><th>Acción</th><th>Expediente</th><th>Destino</th><th>Datos reemplazados</th></tr></thead><tbody>${S.audit.slice(0, 50).map(a => `<tr><td class="mono">${esc(fmtDateTime(a.at))}</td><td>${esc(a.kind)}</td><td class="mono">${esc(a.exp)}</td><td>${esc(provLabel(a.provider))}<br><span class="muted">${esc(a.model)}</span></td><td>${a.pseudo ? a.replaced : 'Desactivado'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Aún no hay envíos.</p>'}</section>
    <section class="sheet"><h3>Documentos legales</h3><p class="hint" id="consent-line"></p>
      <div class="row"><button class="btn" data-action="show-policy">Política de privacidad</button><button class="btn" data-action="show-terms">Términos de uso</button><button class="btn" data-action="show-clause">Autorización para clientes</button></div></section>
    <section class="sheet" id="normas-section">${normasSettingsHTML()}</section>
    <section class="sheet"><h3>Actualizaciones</h3><p class="hint">Estás usando Folio v${esc(APP.version)}.</p>
      <label class="switch" style="margin-bottom:1rem"><input type="checkbox" data-setting="updateCheck" ${s.updateCheck ? 'checked' : ''}><span><strong>Buscar nuevas versiones al abrir Folio</strong><br><span class="small muted">Consulta la página pública de versiones en GitHub como máximo dos veces al día. No envía datos tuyos ni de tus expedientes; GitHub ve tu dirección IP.</span></span></label>
      <div class="row"><button class="btn sm" data-action="check-update">Buscar ahora</button><span id="update-result" class="small muted">${pendingUpdate() ? `Hay una nueva versión: v${esc(pendingUpdate().version)}. <a href="#" data-action="update-how">Cómo actualizar</a>` : ''}</span></div></section>
    <section class="sheet"><h3>Apariencia</h3><label class="field" style="max-width:280px"><span>Tema</span><select class="select" data-setting="theme">${[['auto', 'Según el sistema'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => `<option value="${v}" ${s.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></section>
    <section class="sheet"><h3>Qué no hace esta versión</h3><ul class="small"><li>No se conecta al CEJ ni al SINOE: pegas el seguimiento y el agente lo ordena.</li><li>No lee documentos escaneados como imagen.</li><li>No sincroniza entre equipos ni tiene app móvil.</li><li>No calcula plazos procesales: los registras tú.</li></ul><p class="tiny muted">Folio ${esc(APP.version)}</p></section>
    <section class="sheet" style="border-color:var(--danger)"><h3>Borrar todo</h3><p class="hint">Elimina de este navegador todos los expedientes, documentos, conversaciones, ajustes y el registro de envíos.</p><button class="btn danger" data-action="wipe-all">Borrar todos los datos de este equipo</button></section>
  </div></div>`;
}
async function checkUpdateNow() {
  const out = $('#update-result'); if (out) out.textContent = 'Buscando…';
  const rel = await maybeCheckUpdate(true); const el = $('#update-result'); if (!el) return;
  if (!rel) el.innerHTML = '<span style="color:var(--warn)">No se pudo consultar GitHub. Revisa tu conexión o inténtalo más tarde.</span>';
  else if (pendingUpdate()) { S.updateHidden = false; el.innerHTML = `Hay una nueva versión: v${esc(rel.version)}. <a href="#" data-action="update-how">Cómo actualizar</a>`; }
  else el.textContent = 'Ya tienes la versión más reciente.';
}
async function fillConsentLine() {
  const c = await DB.get('consent'); const el = $('#consent-line');
  if (el && c) el.textContent = `Aceptaste los avisos de la versión ${c.policyVersion} el ${fmtDateTime(c.acceptedAt)}. La aceptación queda guardada en este equipo${c.history?.length ? ` junto con ${c.history.length === 1 ? 'la aceptación anterior' : `las ${c.history.length} aceptaciones anteriores`}` : ''}.`;
}
async function exportBackup() {
  const keys = await DB.keys(); const records = {};
  for (const k of keys) records[k] = await DB.get(k);
  download(new Blob([JSON.stringify({ format: 'folio-respaldo', version: 1, app: APP.version, exportedAt: new Date().toISOString(), records })], { type: 'application/json' }), `folio-respaldo-${todayISO()}.folio`);
  toast('Copia descargada. Está cifrada con tu contraseña actual.');
}
async function importBackup(file) {
  let data; try { data = JSON.parse(await file.text()); } catch { return toast('El archivo no es una copia de Folio válida.', true); }
  if (data.format !== 'folio-respaldo' || !data.records?.vault) return toast('El archivo no es una copia de Folio válida.', true);
  const ok = await askDialog({ title: 'Restaurar copia de seguridad', ok: 'Reemplazar y restaurar', danger: true, body: `<p>La copia es del ${esc(fmtDateTime(data.exportedAt))}. Reemplazará <strong>todos</strong> los datos actuales de este equipo.</p><p>Después se pedirá la contraseña con la que se hizo esa copia.</p>` });
  if (!ok) return;
  await DB.clear(); await DB.putMany(Object.entries(data.records));
  lockNow('Copia restaurada. Ingresa la contraseña de esa copia.');
}
async function wipeAll() {
  const ok = await askDialog({ title: 'Borrar todos los datos', ok: 'Borrar todo', danger: true,
    collect: d => $('#wipe-ok', d).checked ? true : ($('#wipe-err', d).textContent = 'Marca la casilla para confirmar.', null),
    body: `<p>Se borrarán de este navegador todos los expedientes, documentos, conversaciones, ajustes, tu API key y el registro de envíos. No se puede deshacer.</p><label class="check"><input type="checkbox" id="wipe-ok"><span>Entiendo que el borrado es definitivo.</span></label><p id="wipe-err" class="small" style="color:var(--danger)" role="alert"></p>` });
  if (!ok) return;
  await DB.clear(); await NDB.clear().catch(() => {}); Vault.lock(); location.reload();
}
async function changePassFlow() {
  const r = await askDialog({ title: 'Cambiar contraseña', ok: 'Cambiar contraseña',
    collect: d => { const c = $('#cp-c', d).value, n = $('#cp-n', d).value, n2 = $('#cp-n2', d).value; const er = $('#cp-err', d);
      if (n.length < 10) { er.textContent = 'La nueva contraseña debe tener al menos 10 caracteres.'; return null; }
      if (n !== n2) { er.textContent = 'Las contraseñas nuevas no coinciden.'; return null; } return { c, n }; },
    body: `<label class="field"><span>Contraseña actual</span><input class="input" type="password" id="cp-c" autocomplete="current-password"></label><label class="field"><span>Nueva contraseña</span><input class="input" type="password" id="cp-n" autocomplete="new-password"></label><label class="field"><span>Repite la nueva contraseña</span><input class="input" type="password" id="cp-n2" autocomplete="new-password"></label><p class="small muted">Las copias de seguridad anteriores seguirán usando la contraseña antigua.</p><p id="cp-err" class="small" style="color:var(--danger)" role="alert"></p>` });
  if (!r) return;
  toast('Cifrando de nuevo tus datos…');
  try { await Vault.changePass(r.c, r.n); toast('Contraseña cambiada.'); } catch (e) { fail(e); }
}
function exportAudit() {
  const rows = [['fecha', 'accion', 'expediente', 'proveedor', 'modelo', 'caracteres', 'reemplazo_activo', 'datos_reemplazados', 'procesamiento_local']]
    .concat(S.audit.map(a => [a.at, a.kind, a.exp, provLabel(a.provider), a.model, a.chars, a.pseudo ? 'si' : 'no', a.replaced, a.local ? 'si' : 'no']));
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  download(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `folio-registro-envios-${todayISO()}.csv`);
}

/* ============================================================
   Eventos (delegados)
   ============================================================ */
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = val; }
document.addEventListener('click', async ev => {
  if (ev.target.id === 'velo-envio') { cerrarEnvio(false); return; }
  if (ev.target.id === 'velo-ne') { cerrarNE(); return; }
  if (ev.target.id === 'velo-nt') { cerrarNT(); return; }
  if (ev.target.id === 'velo-col') { cerrarColumna(); return; }
  if (S.menu && !ev.target.closest('#menu-caja, #q')) cerrarMenu();
  const db = ev.target.closest('[data-dlg]'); if (db) { onDlgButton(db); return; }
  const a = ev.target.closest('[data-action]'); if (!a) return;
  const act = a.dataset.action, id = a.dataset.id;
  if (a.tagName === 'A') ev.preventDefault();
  try {
    switch (act) {
      case 'dlg-close': closeDialog(); break;
      case 'show-policy': showLegal('policy'); break;
      case 'show-terms': showLegal('terms'); break;
      case 'show-clause': showLegal('clause'); break;
      case 'clause-copy': await navigator.clipboard.writeText(clauseText()); toast('Texto copiado.'); break;
      case 'clause-download': download(new Blob([clauseText()], { type: 'text/plain;charset=utf-8' }), 'autorizacion-uso-ia-cliente.txt'); break;
      case 'onb-next': if (onbCanNext()) { S.onb.step++; renderOnb(); } break;
      case 'onb-back': S.onb.step--; renderOnb(); break;
      case 'onb-finish': await finishOnb(!!a.dataset.skip); break;
      case 'toggle-key': { const i = $('#pf-key'); if (i) { i.type = i.type === 'password' ? 'text' : 'password'; a.textContent = i.type === 'password' ? 'Mostrar' : 'Ocultar'; } break; }
      case 'list-models': await fillModels(); break;
      case 'show-keyguide': showKeyGuide(); break;
      case 'pick-model': { const cfg = curCfg(); cfg.model = a.dataset.model; const inp = $('#pf-model'); if (inp) inp.value = cfg.model; $$('.preset').forEach(b => b.classList.toggle('on', b.dataset.model === cfg.model)); break; }
      case 'test-conn': await testConn(); break;
      case 'wipe-from-lock': await wipeAll(); break;
      case 'toggle-side': S.sideOpen = !S.sideOpen; layout(); break;
      case 'cerrar-capas': S.sideOpen = false; S.fichaMovil = false; layout(); break;
      case 'open-exp': await openExp(id); break;
      case 'vista-hoy': Object.assign(S, { vista: 'hoy', sideOpen: false }); render(); break;
      case 'vista-inicio': Object.assign(S, { vista: 'inicio', sideOpen: false }); resetFicha(); render(); break;
      case 'vista-memoria': S.vistaPrev = S.vista; Object.assign(S, { vista: 'memoria', sideOpen: false, fichaMovil: false }); render(); $('#scroll').scrollTop = 0; break;
      case 'vista-volver': S.vista = S.vistaPrev === 'chat' ? 'chat' : 'inicio'; render(); break;
      case 'hoy-ir': {
        await openExp(id); const e = S.exp; if (!e || e.id !== id) break;
        if (a.dataset.chat && e.chats.some(c => c.id === a.dataset.chat)) { e.chatActivo = a.dataset.chat; S.vista = 'chat'; }
        else if (a.dataset.chat && (e.tablas || []).some(t => t.id === a.dataset.chat)) { S.tablaId = a.dataset.chat; S.vista = 'tabla'; }
        abrirFicha(); resetFicha(); render(); revisarCambios(); break; }
      case 'open-chat': abrirChat(id); break;
      case 'new-chat': await irAChatNuevo(); $('#q')?.focus(); break;
      case 'chat-menu': await chatMenu(); break;
      case 'del-chat': await deleteChat(); break;
      case 'toggle-ficha': if (MQ_MOVIL.matches) S.fichaMovil = !S.fichaMovil; else S.ficha = S.ficha === 'abierta' ? 'cerrada' : 'abierta'; layout(); break;
      case 'riel-abrir': S.ficha = 'cerrada'; layout(); break;
      case 'riel-buscar': S.ficha = 'cerrada'; layout(); $('#q-exp')?.focus(); break;
      case 'ftab': S.fichaTab = a.dataset.tab; renderFicha(); break;
      case 'ficha-volver': S.fichaModo = 'ficha'; S.fuenteDoc = null; renderFicha(); layout(); pintarTabla(); break;
      case 'abrir-borrador': S.borrador = +a.dataset.i; S.fichaModo = 'borrador'; abrirFicha(); renderFicha(); layout(); $('#fcuerpo').scrollTop = 0; break;
      case 'borr-guardar': await guardarBorrador(); break;
      case 'borr-copiar': { const m = activeChat(S.exp).mensajes[S.borrador]; if (m) { await navigator.clipboard.writeText(m.content); toast('Borrador copiado.'); } break; }
      case 'borr-pedir': S.fichaModo = 'ficha'; renderFicha(); layout(); $('#q')?.focus(); break;
      case 'leyo': { const l = a.nextElementSibling; l.hidden = !l.hidden; a.lastChild.textContent = l.hidden ? ' ▸' : ' ▾'; a.setAttribute('aria-expanded', !l.hidden); break; }
      case 'chip': S.ctx[a.dataset.k] = !S.ctx[a.dataset.k]; a.classList.toggle('on', S.ctx[a.dataset.k]); a.setAttribute('aria-pressed', S.ctx[a.dataset.k]); break;
      case 'destino': { const q = $('#q'), v = (q?.value || '').trim(); await Lib.load();
        if (await vistaPrevia(prepararEnvio(v || '(tu consulta)'), { puedeEnviar: !!v })) { const f = q.closest('form'); if (f.dataset.donde === 'inicio') await irAChatNuevo(); await sendChat(v, { revisado: true }); }
        break; }
      case 'ver-envio': { const m = activeChat(S.exp).mensajes[+a.closest('[data-i]')?.dataset.i]; if (m) verEnvio(m); break; }
      case 'envio-cerrar': cerrarEnvio(false); $('#q')?.focus(); break;
      case 'envio-enviar': cerrarEnvio(true); break;
      case 'menu-pick': await elegirMenu(+a.dataset.i); break;
      case 'new-exp': nuevoExpediente(); break;
      case 'nueva-tabla': nuevaTablaVentana(); break;
      case 'open-tabla': abrirTabla(id); break;
      case 'nt-cerrar': cerrarNT(); break;
      case 'nt-plantilla': S.nt.plantilla = a.dataset.k; pintarNT(); $(`#velo-nt [data-k="${a.dataset.k}"]`)?.focus(); break;
      case 'nt-ver': if (S.nt) await crearTabla({ siempre: true }); break;
      case 'nt-crear': await crearTabla(); break;
      case 'celda': S.fuenteDoc = { docId: a.dataset.doc, colId: a.dataset.col }; S.fichaModo = 'fuente-doc'; abrirFicha(); renderFicha(); layout(); pintarTabla(); break;
      case 'celda-editar': await editarCelda(); break;
      case 'tabla-fila': { const t = tablaActual(); if (t && !S.revision) await revisarTabla(t, t.columnas, [a.dataset.doc]); renderFicha(); break; }
      case 'tabla-detener': S.revision?.ctrl.abort(); break;
      case 'tabla-continuar': { const t = tablaActual(); if (t && !S.revision) revisarTabla(t, t.columnas, t.filas.filter(f => f.estado !== 'lista').map(f => f.docId)); break; }
      case 'tabla-movs': await agregarMovs(); break;
      case 'tabla-proponer': await proponerDeTabla(); break;
      case 'tabla-col': columnaVentana(); break;
      case 'col-cerrar': cerrarColumna(); break;
      case 'col-tipo': $$('#velo-col .seg button').forEach(x => { x.classList.toggle('on', x === a); x.setAttribute('aria-checked', x === a); }); break;
      case 'col-crear': await crearColumna(); break;
      case 'tabla-copiar': await copiarTabla(); break;
      case 'tabla-csv': exportarTabla(); break;
      case 'tabla-menu': await tablaMenu(); break;
      case 'tabla-borrar': await borrarTabla(); break;
      case 'ne-cerrar': cerrarNE(); break;
      case 'ne-otro': leerNE(); Object.assign(S.ne, { estado: 'formulario', archivo: null, enc: null, error: '' }); pintarNE(); break;
      case 'ne-agregar': leerNE(); S.ne.partes.push({ nombre: '', rol: S.ne.partes.length ? 'Demandado' : 'Demandante', doc: '', cli: !S.ne.partes.length }); pintarNE(); $$('#velo-ne .pt [data-pt=nombre]').pop()?.focus(); break;
      case 'ne-quitar': leerNE(); S.ne.partes.splice(+a.dataset.i, 1); pintarNE(); break;
      case 'ne-cli': leerNE(); pintarNE(); break;
      case 'ne-crear': await crearNE(); break;
      case 'ne-resumir': await resumirOrigen(); break;
      case 'ne-ahora-no': S.exp.origen.ofrecer = false; await saveExp(); renderCentro(); aviso('Puedes pedírselo después desde la conversación'); break;
      case 'edit-exp': await expForm(S.exp); break;
      case 'del-exp': await deleteExp(); break;
      case 'load-sample': await loadSample(); break;
      case 'privacy': showPrivacy(); break;
      case 'privacy-settings': closeDialog(); await settingsView(); fillConsentLine(); break;
      case 'movs-all': S.movsAll = true; refreshExp(); break;
      case 'add-plazo': { const f = $('#nplazo-f').value, d = $('#nplazo-d').value.trim(); if (!f || !d) { toast('Indica la fecha y qué vence.', true); break; } S.exp.memoria.plazos.push({ id: uid(), fecha: f, desc: d, done: false }); await saveExp(); refreshExp(); break; }
      case 'toggle-plazo': { const p = S.exp.memoria.plazos.find(x => x.id === id); p.done = !p.done; await saveExp(); refreshExp(); break; }
      case 'del-plazo': S.exp.memoria.plazos = S.exp.memoria.plazos.filter(x => x.id !== id); await saveExp(); refreshExp(); break;
      case 'add-pend': { const v = $('#npend').value.trim(); if (!v) break; S.exp.memoria.pendientes.push({ id: uid(), text: v, done: false }); await saveExp(); refreshExp(); $('#npend')?.focus(); break; }
      case 'toggle-pend': { const p = S.exp.memoria.pendientes.find(x => x.id === id); p.done = !p.done; await saveExp(); refreshExp(); break; }
      case 'del-pend': S.exp.memoria.pendientes = S.exp.memoria.pendientes.filter(x => x.id !== id); await saveExp(); refreshExp(); break;
      case 'add-parte': { const n = $('#nparte-n').value.trim(); if (n.split(/\s+/).length < 2) { toast('Escribe nombres y apellidos completos para reemplazarlos bien.', true); break; } addParte(S.exp, n, $('#nparte-r').value, $('#nparte-d').value, $('#nparte-c').checked); await saveExp(); render(); break; }
      case 'toggle-cliente': { const p = S.exp.partes.find(x => x.id === id); p.esCliente = !p.esCliente; await saveExp(); render(); break; }
      case 'del-parte': { const ok = await askDialog({ title: 'Quitar parte', ok: 'Quitar', danger: true, body: '<p>Si la quitas, su nombre ya no se reemplazará antes de enviar al proveedor.</p>' }); if (!ok) break; S.exp.partes = S.exp.partes.filter(x => x.id !== id); await saveExp(); render(); break; }
      case 'add-mov': await movForm(); break;
      case 'paste-cej': await pasteCEJ(); break;
      case 'del-mov': S.exp.movimientos = S.exp.movimientos.filter(x => x.id !== id); await saveExp(); refreshExp(); break;
      case 'pick-file': $('#file-docs').click(); break;
      case 'view-doc': { const d = S.exp.docs.find(x => x.id === id); const t = S.docTexts[id] || ''; openDialog({ title: d.name, wide: true, body: `<p class="small muted">Texto extraído en tu equipo${t.length > 40000 ? ', primeros 40 000 caracteres' : ''}.</p><div class="payload">${esc(t.slice(0, 40000)) || 'Sin texto.'}</div>`, foot: `<button class="btn ghost danger" data-action="del-doc" data-id="${d.id}">Eliminar documento</button><button class="btn primary" data-action="dlg-close">Cerrar</button>` }); break; }
      case 'del-doc': { const d = S.exp.docs.find(x => x.id === id); const ok = await askDialog({ title: 'Eliminar documento', ok: 'Eliminar', danger: true, body: `<p>Se eliminará el texto de <strong>${esc(d.name)}</strong> de este equipo.</p>` }); if (!ok) break; await store.del('doc:' + id); delete S.docTexts[id]; S.exp.docs = S.exp.docs.filter(x => x.id !== id); await saveExp(); refreshExp(); break; }
      case 'quick': { const [, q, fill] = S.quick[+a.dataset.i] || []; if (!q) break; if (S.vista === 'inicio') await irAChatNuevo(); if (fill) { const t = $('#q'); t.value = q; t.focus(); t.setSelectionRange(q.length, q.length); } else await sendChat(q); break; }
      case 'stop': S.abort?.abort(); break;
      case 'propose-memory': await proposeMemory(a); break;
      case 'seguir-nueva': await seguirEnNueva(a); break;
      case 'revisar-cambios': revisarCambios(); break;
      case 'prop-si': case 'prop-no': propState(S.exp).sel[id] = a.dataset.action === 'prop-si'; renderFicha(); break;
      case 'prop-aplicar': await aplicarCambios(); break;
      case 'prop-descartar': await aplicarCambios(true); break;
      case 'plazo-confirmar': propState(S.exp).confirmar = id; renderFicha(); $('#cambios [data-action="plazo-si"]')?.focus(); break;
      case 'plazo-no': propState(S.exp).confirmar = null; renderFicha(); break;
      case 'plazo-si': await confirmarPlazo(id); break;
      case 'aviso-deshacer': { const f = avisoFn; avisoFn = null; $('#aviso')?.remove(); clearTimeout(avisoT); if (f) await f(); break; }
      case 'seguir-aqui': { const c = activeChat(S.exp); S.seguirAqui[c.id] = nivelContexto(S.exp); $('.larga')?.remove(); break; }
      case 'open-settings': await settingsView(); fillConsentLine(); break;
      case 'close-settings': closeSettings(); break;
      case 'save-provider': Object.assign(S.settings, pickCfg(S.draftCfg)); await saveSettings(); toast(isReady(S.settings) ? 'Proveedor guardado.' : 'Guardado. Falta la key o el modelo para usar el agente.', !isReady(S.settings)); break;
      case 'lock-now': lockNow(); break;
      case 'reconsent-accept': await acceptReconsent(); break;
      case 'update-how': showUpdateHow(); break;
      case 'normas-install': await installNormas(); break;
      case 'normas-remove': await confirmRemoveNormas(); break;
      case 'normas-changes': await showNormasChanges(); break;
      case 'ver-articulo':   // en la conversación o el inicio, la cita abre la Ficha en modo Fuente; en Ajustes, una ventana
        if (fichaVisible() && !a.closest('#dlg')) { S.fuente = { norma: a.dataset.norma, n: a.dataset.n }; S.fichaModo = 'fuente'; abrirFicha(); renderFicha(); layout(); $('#fcuerpo').scrollTop = 0; }
        else showArticle(a.dataset.norma, a.dataset.n);
        break;
      case 'update-later': S.updateHidden = true; $('.update-bar')?.remove(); toast('Te lo recordaremos la próxima vez que abras Folio.'); break;
      case 'check-update': await checkUpdateNow(); break;
      case 'reconsent-decline': lockNow('Folio quedó bloqueado. Para usarlo debes aceptar los avisos vigentes.'); break;
      case 'change-pass': await changePassFlow(); break;
      case 'export-backup': await exportBackup(); break;
      case 'import-backup': $('#file-backup').click(); break;
      case 'export-audit': exportAudit(); break;
      case 'wipe-all': await wipeAll(); break;
    }
  } catch (e) { fail(e); }
});
document.addEventListener('change', async ev => {
  const t = ev.target;
  try {
    if (t.dataset.onbCheck !== undefined) { S.onb.checks[t.dataset.onbCheck] = t.checked; updateOnbNav(); }
    else if (t.id === 'envio-revisar') { S.settings.review = t.checked; await saveSettings(); }
    else if (t.hasAttribute('data-reconsent-check')) { const b = $('[data-action="reconsent-accept"]'); if (b) b.disabled = !t.checked; }
    else if (t.hasAttribute('data-onb-pseudo')) S.onb.pseudo = t.checked;
    else if (t.hasAttribute('data-onb-normas')) S.onb.normas = t.checked;
    else if (t.dataset.pf) {
      const cfg = curCfg(); const k = t.dataset.pf;
      cfg[k] = t.type === 'checkbox' ? t.checked : t.value;
      if (k === 'provider') { cfg.baseUrl = ''; cfg.model = ''; $('#pf-block').innerHTML = providerFieldsHTML(cfg); }
    }
    else if (t.dataset.bind && S.exp) { setPath(S.exp, t.dataset.bind, t.value); saveSoon(); }
    else if (t.dataset.setting) {
      const k = t.dataset.setting; S.settings[k] = t.type === 'checkbox' ? t.checked : (k === 'autoLockMin' || k === 'contextoMax' ? +t.value : t.value);
      await saveSettings(); if (k === 'theme') applyTheme(); toast('Ajuste guardado.');
    }
    else if (t.id === 'file-docs') { const f = [...t.files]; t.value = ''; await addFiles(f); }
    else if (t.id === 'ne-file') { const f = t.files[0]; t.value = ''; await archivoNE(f); }
    else if (t.dataset.ntDoc && S.nt) { if (t.checked) S.nt.sel.add(t.dataset.ntDoc); else S.nt.sel.delete(t.dataset.ntDoc); pintarNT(); $(`#velo-nt [data-nt-doc="${t.dataset.ntDoc}"]`)?.focus(); }
    else if (t.id === 'file-backup') { const f = t.files[0]; t.value = ''; if (f) await importBackup(f); }
  } catch (e) { fail(e); }
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'q' && S.exp) { actualizarMenu(t); return; }
  if (t.dataset.onbField) { S.onb[t.dataset.onbField] = t.value; updateOnbNav(); }
  else if (t.dataset.pf && t.type !== 'checkbox' && t.tagName !== 'SELECT') curCfg()[t.dataset.pf] = t.value;
  else if (t.hasAttribute('data-search')) { S.filter = t.value; const l = $('#exps'); if (l) l.innerHTML = expsHTML(); }
  else if (t.dataset.bind && S.exp) {
    setPath(S.exp, t.dataset.bind, t.value); saveSoon();
    if (t.tagName === 'TEXTAREA') autosize(t);
  }
});
document.addEventListener('submit', async ev => {
  const f = ev.target.closest('[data-form]'); if (!f) return; ev.preventDefault();
  if (f.dataset.form === 'unlock') await doUnlock(f.pass.value);
  if (f.dataset.form === 'chat') { const v = $('#q').value; if (!v.trim() || S.sending) return; if (f.dataset.donde === 'inicio') await irAChatNuevo(); await sendChat(v); }
});
document.addEventListener('keydown', ev => {
  const t = ev.target;
  if (t.id === 'q' && !ev.isComposing && teclaMenu(ev)) { ev.preventDefault(); return; }
  if (t.id === 'q' && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); t.closest('form')?.requestSubmit(); }
  if (t.classList?.contains('dropzone') && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); $('#file-docs').click(); }
  if (ev.key === 'Enter' && (t.id === 'npend' || t.id === 'nplazo-d' || t.id === 'nparte-n' || t.id === 'nparte-d')) { ev.preventDefault(); $(`[data-action="${t.id === 'npend' ? 'add-pend' : t.id === 'nplazo-d' ? 'add-plazo' : 'add-parte'}"]`)?.click(); }
  // Ctrl K: buscar expediente · Esc: cierra la barra o la hoja de la ficha en el celular
  if (envioPend && ev.key === 'Escape') { ev.preventDefault(); cerrarEnvio(false); $('#q')?.focus(); return; }
  // F6: el foco no sale de la vista previa mientras está abierta (Tab y Shift+Tab giran dentro)
  if (S.ne && ev.key === 'Escape') { ev.preventDefault(); cerrarNE(); return; }
  if ($('#velo-col') && !envioPend && ev.key === 'Escape') { ev.preventDefault(); cerrarColumna(); return; }
  if (S.nt && !envioPend && ev.key === 'Escape') { ev.preventDefault(); cerrarNT(); return; }
  if (S.ne && t.hasAttribute?.('data-ne-zona') && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); $('#ne-file').click(); return; }
  const velo = envioPend ? '#velo-envio' : S.ne ? '#velo-ne' : $('#velo-col') ? '#velo-col' : S.nt ? '#velo-nt' : '';
  if (velo && ev.key === 'Tab') {
    const f = $$(`${velo} button:not([disabled]), ${velo} input:not([hidden]), ${velo} select, ${velo} summary, ${velo} [tabindex="0"]`).filter(x => x.offsetParent);
    const i = f.indexOf(document.activeElement), sig = ev.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i === f.length - 1 ? 0 : i + 1);
    if (f.length) { ev.preventDefault(); f[sig].focus(); } return;
  }
  // F6: Esc cancela la confirmación de un plazo en la caja de cambios
  if (ev.key === 'Escape' && S.prop.confirmar && t.closest?.('#cambios')) { ev.preventDefault(); S.prop.confirmar = null; renderFicha(); $('#cambios [data-action="plazo-confirmar"]')?.focus(); return; }
  if (S.screen !== 'app' || $('#dlg').open) return;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
    ev.preventDefault();
    if (MQ_MOVIL.matches) S.sideOpen = true; else if ($('#v6')?.classList.contains('riel')) S.ficha = 'cerrada';
    layout(); $('#q-exp')?.focus(); $('#q-exp')?.select();
  } else if (ev.key === 'Escape' && (S.sideOpen || S.fichaMovil)) { ev.preventDefault(); S.sideOpen = false; S.fichaMovil = false; layout(); }
});
window.addEventListener('resize', () => { if (S.screen === 'app') layout(); });
document.addEventListener('dragover', ev => { const z = ev.target.closest?.('[data-ne-zona], .dropzone, [data-drop]'); if (z) { ev.preventDefault(); z.classList.add('over'); } });
document.addEventListener('dragleave', ev => { const z = ev.target.closest?.('[data-ne-zona], .dropzone, [data-drop]'); if (z) z.classList.remove('over'); });
document.addEventListener('drop', ev => { const z = ev.target.closest?.('[data-ne-zona], .dropzone, [data-drop]'); if (!z) return; ev.preventDefault(); z.classList.remove('over');
  if (z.hasAttribute('data-ne-zona')) { archivoNE(ev.dataTransfer.files[0]).catch(fail); return; } addFiles([...ev.dataTransfer.files]).catch(fail); });
window.addEventListener('beforeunload', () => { if (S.exp && Vault.key) saveExp(); });

/* ============================================================
   Inicio
   ============================================================ */
$('#dlg').addEventListener('cancel', () => settleDlg(false));
(async function boot() {
  render();
  if (!window.crypto?.subtle || !window.indexedDB) { S.screen = 'error'; S.bootError = 'Este navegador no permite el almacenamiento cifrado local que Folio necesita. Abre el archivo con Chrome, Edge o Firefox actualizados.'; return render(); }
  try { await DB.open(); } catch { S.screen = 'error'; S.bootError = 'El navegador bloqueó el almacenamiento local. Si estás en modo incógnito, abre Folio en una ventana normal.'; return render(); }
  const meta = await DB.get('vault');
  if (meta) { S.screen = 'lock'; S.stampPress = true; } else { S.screen = 'onb'; S.onb = newOnb(); }
  render();
})();
