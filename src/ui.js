/* ============================================================
   Folio MVP · interfaz
   ============================================================ */
const S = {
  screen: 'boot', bootError: '', onb: null, settings: null, draftCfg: null, index: [], exp: null, docTexts: {},
  tab: 'memoria', view: 'exp', sideOpen: false, sending: false, abort: null, audit: [], lastSend: null,
  stampPress: false, lastActive: Date.now(), filter: '', consent: null, updateHidden: false
};
const root = () => $('#root');
// Logo: el mismo del sitio web (ícono de documento + "folio" + insignia Beta)
const BRAND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h9l5 5V20a.5.5 0 0 1-.5.5h-13A.5.5 0 0 1 5 20z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3.5V8.5h5M8.5 12.5h7M8.5 16h4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>folio<span class="badge">Beta</span>';

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
      <div class="node you"><h3>Tu equipo</h3><ul><li>Expedientes y memoria del caso</li><li>Documentos y conversaciones</li><li>Tu API key</li></ul><p class="small muted" style="margin:.5em 0 0">Todo cifrado con tu contraseña.</p></div>
      <div class="arrow"><svg viewBox="0 0 64 20" aria-hidden="true"><path d="M2 10h56m-8-7 8 7-8 7" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Solo los fragmentos que la consulta necesita, con los nombres reemplazados</span></div>
      <div class="node"><h3>Tu proveedor de IA</h3><ul><li>OpenAI, Anthropic u OpenRouter, con tu propia cuenta</li><li>O un servidor propio en tu oficina</li></ul></div>
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
    <label class="check"><input type="checkbox" data-onb-normas ${o.normas ? 'checked' : ''}><span><strong>Descargar la biblioteca legal peruana (recomendado)</strong><br><span class="small muted">Textos vigentes de la Constitución, los códigos y leyes principales, para que el agente cite normas peruanas actualizadas y Folio verifique sus citas. Unos 2 MB desde el sitio público del proyecto; las búsquedas se hacen en tu equipo.</span></span></label>
    <div class="note"><p>Tu key se guarda cifrada en este equipo y solo se usa para llamar al proveedor directamente desde aquí.</p></div>`;
}
function renderOnb() {
  const o = S.onb; const last = o.step === ONB_STEPS.length - 1;
  root().innerHTML = `<div class="onb">
    <aside>
      <div class="brand">${BRAND}</div>
      <ol class="steps" aria-label="Pasos de configuración">${ONB_STEPS.map((s, i) => `<li class="${i < o.step ? 'done' : i === o.step ? 'now' : ''}" ${i === o.step ? 'aria-current="step"' : ''}>${esc(s)}</li>`).join('')}</ol>
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
  if (S.sending && S.abort) S.abort.abort();
  Vault.lock(); Object.assign(S, { settings: null, draftCfg: null, index: [], exp: null, docTexts: {}, audit: [], lastSend: null, consent: null, updateHidden: false, screen: 'lock', view: 'exp' });
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
  if (last) await openExp(last.id, true); else { S.exp = null; render(); }
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
  const s = { id: e.id, numero: e.numero, titulo: caratulaTitle(e), materia: e.materia, ejemplo: !!e.ejemplo, updatedAt: e.updatedAt, plazos: e.memoria.plazos.filter(p => !p.done).map(p => ({ fecha: p.fecha, desc: p.desc })) };
  const i = S.index.findIndex(x => x.id === e.id); if (i >= 0) S.index[i] = s; else S.index.unshift(s);
}
let saveT = null;
function saveSoon() { clearTimeout(saveT); saveT = setTimeout(() => saveExp().catch(fail), 350); }
async function saveExp() {
  clearTimeout(saveT); const e = S.exp; if (!e || !Vault.key) return;
  e.updatedAt = new Date().toISOString();
  await store.put('exp:' + e.id, e); upsertIndex(e); await store.put('index', S.index);
  renderSideParts();
}
async function saveSettings() { await store.put('settings', S.settings); }
async function addAudit(entry) { S.audit.unshift(entry); S.audit = S.audit.slice(0, 500); await store.put('audit', S.audit); }

async function openExp(id, silent) {
  try {
    const e = await store.get('exp:' + id); if (!e) throw new FolioError('No se encontró el expediente.');
    S.exp = e; S.docTexts = {}; S.view = 'exp'; S.sideOpen = false;
    if (S.tab === 'agente' && window.innerWidth > 1180) S.tab = 'memoria';
    for (const d of e.docs) { const r = await store.get('doc:' + d.id); if (r) S.docTexts[d.id] = r.text; }
    if (S.settings.lastExp !== id) { S.settings.lastExp = id; saveSettings(); }
    render();
  } catch (e) { if (!silent) fail(e); S.exp = null; render(); }
}
function blankExp(f) {
  return { id: uid(), numero: f.numero || '', materia: f.materia || '', especialidad: f.especialidad || '', organo: f.organo || '', distrito: f.distrito || '', estado: f.estado || '',
    partes: [], nextTok: 1, memoria: { resumen: '', hechos: '', estrategia: '', pendientes: [], plazos: [] }, movimientos: [], chat: [], docs: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
function addParte(e, nombre, rol, doc, esCliente) { e.partes.push({ id: uid(), tok: `PERSONA_${e.nextTok++}`, nombre: nombre.trim(), rol, doc: (doc || '').trim(), esCliente: !!esCliente }); }

/* ---------- Sello ---------- */
function stampHTML() {
  const s = S.settings; let sub = 'Nada enviado en esta sesión';
  if (s && s.provider === 'custom') sub = 'IA en tu servidor propio';
  else if (S.lastSend) sub = `Último envío a ${provLabel(S.lastSend.provider)}, ${rel(S.lastSend.at)}${S.lastSend.pseudo ? ', con datos reemplazados' : ''}`;
  return `<div class="stamp ${S.stampPress ? 'press' : ''}" role="status" title="Tus expedientes se guardan cifrados en este equipo. Folio no tiene servidores."><b>Guardado solo en este equipo</b><span>${esc(sub)}</span></div>`;
}
function updateStamp() { const sl = $('.stamp-slot'); if (sl) sl.innerHTML = stampHTML(); }
setInterval(() => { if (S.screen === 'app' && S.lastSend) updateStamp(); }, 60000);

/* ---------- Barra lateral ---------- */
function deadlineChip(fecha, done) {
  if (done) return `<span class="chip ok">Cumplido</span>`;
  const d = daysUntil(fecha);
  if (d < 0) return `<span class="chip due">Vencido</span>`;
  if (d === 0) return `<span class="chip due">Hoy</span>`;
  if (d <= 3) return `<span class="chip soon">En ${d} día${d > 1 ? 's' : ''}</span>`;
  return `<span class="chip">En ${d} días</span>`;
}
function deadlinesHTML() {
  const all = []; S.index.forEach(x => (x.plazos || []).forEach(p => all.push({ ...p, id: x.id, numero: x.numero })));
  all.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const next = all.filter(p => daysUntil(p.fecha) <= 14).slice(0, 6);
  if (!next.length) return `<p class="tiny muted" style="margin:0">Sin plazos en los próximos 14 días.</p>`;
  return `<ul class="deadlines">${next.map(p => { const d = daysUntil(p.fecha); const color = d < 0 || d === 0 ? 'var(--danger)' : d <= 3 ? 'var(--warn)' : 'var(--ink)';
    return `<li><button data-action="open-exp" data-id="${p.id}"><span class="d" style="color:${color}">${esc(fmtDate(p.fecha).slice(0, 5))}</span><span><strong>${esc(p.desc)}</strong><br><span class="muted mono">${esc(p.numero || 's/n')}</span></span></button></li>`; }).join('')}</ul>`;
}
function listHTML() {
  const f = norm(S.filter);
  const items = S.index.filter(x => !f || norm(`${x.numero} ${x.titulo} ${x.materia}`).includes(f));
  if (!S.index.length) return `<li style="padding:1rem .5rem" class="small muted">Aún no tienes expedientes.</li>`;
  if (!items.length) return `<li style="padding:1rem .5rem" class="small muted">Ningún expediente coincide con “${esc(S.filter)}”.</li>`;
  return items.map(x => { const next = (x.plazos || []).map(p => p.fecha).sort()[0];
    return `<li><button data-action="open-exp" data-id="${x.id}" aria-current="${S.exp?.id === x.id && S.view === 'exp'}"><span class="num">${esc(x.numero || 'Sin número')}</span><span class="tit">${esc(x.titulo)}</span><span class="meta">${esc(x.materia || '')}${next ? ' ' + deadlineChip(next) : ''}${x.ejemplo ? ' <span class="chip">Ejemplo</span>' : ''}</span></button></li>`; }).join('');
}
function sidebarHTML() {
  return `<aside class="side" aria-label="Expedientes">
    <div class="side-top"><div class="brand">${BRAND}</div><button class="btn primary sm" data-action="new-exp">Nuevo expediente</button></div>
    <div class="search"><label class="sr-only" for="q-exp">Buscar expediente</label><input id="q-exp" class="input" data-search placeholder="Buscar por número o parte" value="${esc(S.filter)}"></div>
    <div class="side-section"><h2>Próximos plazos</h2><div id="deadlines">${deadlinesHTML()}</div></div>
    <ul class="explist" id="explist">${listHTML()}</ul>
    <div class="side-bottom"><button class="btn ghost sm" data-action="open-settings">Ajustes</button><button class="btn ghost sm" data-action="lock-now">Bloquear</button></div>
  </aside>`;
}
function renderSideParts() { const l = $('#explist'); if (l) l.innerHTML = listHTML(); const d = $('#deadlines'); if (d) d.innerHTML = deadlinesHTML(); }

/* ---------- Estructura principal ---------- */
function renderApp() {
  const main = S.view === 'settings' ? settingsHTML() : S.exp ? expHTML() : emptyHTML();
  root().innerHTML = `<div class="app ${S.sideOpen ? 'side-open' : ''}">
    <div class="scrim" data-action="close-side"></div>
    ${sidebarHTML()}
    <div class="main">
      <div class="topbar"><button class="btn ghost sm" data-action="open-side">☰ Expedientes</button><div class="brand" style="font-size:1.1rem">${BRAND}</div></div>
      ${updateBarHTML()}
      ${main}
    </div></div>`;
  S.stampPress = false;
  scrollMsgs();
}
/* ---------- Biblioteca legal peruana (E8) ---------- */
function libStatusHTML() {
  if (!Lib.installed()) return `<button class="libstat off" data-action="open-settings" title="Descarga la biblioteca legal para que el agente cite normas peruanas vigentes">Sin biblioteca legal</button>`;
  const age = Lib.ageDays(); const cls = age >= NORMAS_STALE_WARN ? 'warn' : '';
  return `<span class="libstat ${cls}" title="${age >= NORMAS_STALE_WARN ? `La biblioteca tiene ${age} días sin actualizarse: puede no incluir cambios recientes.` : 'Textos de normas peruanas en tu equipo'}">Normas al ${esc(fmtDate(Lib.manifest.actualizadoAl))}</span>`;
}
const CITA = { vigente: ['ok', '✓', 'Vigente en tu biblioteca'], porRegir: ['warn', '⚠', 'Tiene un cambio que aún no rige'], textoDistinto: ['warn', '⚠', 'La cita textual no coincide con el texto vigente'],
  derogado: ['bad', '✗', 'Derogado'], reubicado: ['warn', '⚠', 'Artículo reubicado y renumerado: cita el número actual'], noEncontrado: ['bad', '✗', 'No existe en tu biblioteca'], fuera: ['info', '○', 'No está en tu biblioteca: verifícala en el SPIJ'], extranjera: ['bad', '🌐', 'Norma de otro país'] };
function citasHTML(m) {
  const c = m.citas; if (!c) return '';
  const chips = c.items.map(it => {
    const [cls, ico, tip] = CITA[it.estado] || CITA.fuera;
    const extra = it.estado === 'vigente' && it.modificado ? ` · modificado ${fmtDate(it.modificado)}` : '';
    const title = esc(tip + (it.modificado ? `. Última modificación: ${fmtDate(it.modificado)}` : ''));
    return it.norma && !it.norma.startsWith('fuera:') && it.estado !== 'noEncontrado'
      ? `<button class="cite ${cls}" data-action="ver-articulo" data-norma="${esc(it.norma)}" data-n="${esc(it.n)}" title="${title}">${ico} ${esc(it.label)}${esc(extra)}</button>`
      : `<span class="cite ${cls}" title="${title}">${ico} ${esc(it.label)}</span>`;
  }).join('');
  const used = m.meta?.normas?.length ? `Consultó ${m.meta.normas.length} artículo${m.meta.normas.length === 1 ? '' : 's'} de tu biblioteca (textos al ${esc(fmtDate(c.corte))}).` : `Biblioteca legal al ${esc(fmtDate(c.corte))}.`;
  const stale = c.age >= NORMAS_STALE_ALERT ? `<p class="cites-warn">⚠ Tu biblioteca legal tiene ${c.age} días sin actualizarse: puede no incluir cambios recientes.</p>` : '';
  return `<div class="cites">${chips ? `<div class="cites-row">${chips}</div>` : ''}<p class="cites-note">${used} Verifica cada artículo en la fuente oficial antes de usarlo.</p>${stale}</div>`;
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
  if (!Lib.installed()) return `${head}<p class="hint">Textos vigentes de la Constitución, los códigos y las leyes principales. Con ella, el agente cita normas peruanas actualizadas y Folio verifica cada cita. Unos 2 MB desde el sitio público del proyecto; las búsquedas se hacen en tu equipo.</p>
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
function refreshNormasUI() { const sec = $('#normas-section'); if (sec) sec.innerHTML = normasSettingsHTML(); if (S.exp && S.view !== 'settings') renderAgent(); }
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
    <p class="lead">Cada expediente tiene su propia memoria: partes, plazos, movimientos, documentos y estrategia. El agente la lee antes de responder, así no repites el contexto en cada consulta.</p>
    ${!isReady(S.settings) ? `<div class="note warn"><p>Aún no conectas un proveedor de IA. Puedes registrar expedientes igual y conectarlo cuando quieras.</p><button class="btn sm" data-action="open-settings">Conectar proveedor</button></div>` : ''}
    <div class="row"><button class="btn primary" data-action="new-exp">Crear expediente</button><button class="btn" data-action="load-sample">Probar con un expediente de ejemplo</button></div>
    <p class="tiny muted" style="margin-top:1rem">El ejemplo usa datos ficticios.</p></div>`;
}
function expHTML() {
  const e = S.exp; const cli = e.partes.filter(p => p.esCliente), con = e.partes.filter(p => !p.esCliente);
  const nm = arr => arr.map(p => esc(p.nombre)).join(', ');
  const tabs = [['memoria', 'Memoria del caso'], ['movimientos', `Movimientos (${e.movimientos.length})`], ['documentos', `Documentos (${e.docs.length})`], ['agente', 'Agente']];
  return `<header class="caratula">
      <div>
        <div class="expnum">${esc(e.numero || 'Sin número')} ${e.ejemplo ? '<span class="chip">Ejemplo ficticio</span>' : ''}<button class="btn ghost sm" data-action="edit-exp">Editar datos</button></div>
        <div class="partes"><strong>${nm(cli) || 'Tu cliente'}</strong><span class="vs">contra</span><strong>${nm(con) || 'Contraparte'}</strong></div>
        <div class="org">${esc([e.materia, e.organo, e.distrito].filter(Boolean).join(', ') || 'Completa materia y órgano jurisdiccional en Editar datos.')}</div>
      </div>
      <div class="stamp-slot">${stampHTML()}</div>
      <nav class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${k === 'agente' ? 'agent-tab' : ''}" aria-selected="${S.tab === k}" data-action="tab" data-tab="${k}">${esc(l)}</button>`).join('')}</nav>
    </header>
    <div class="work ${S.tab === 'agente' ? 'show-agent' : ''}" id="work">
      <section class="pane" id="pane" role="tabpanel">${paneHTML()}</section>
      <aside class="agent" id="agent" aria-label="Agente del expediente">${agentHTML()}</aside>
    </div>`;
}
function renderPane() { const p = $('#pane'); if (p) p.innerHTML = paneHTML(); }
function paneHTML() { const t = S.tab === 'agente' ? 'memoria' : S.tab; return t === 'movimientos' ? movsHTML() : t === 'documentos' ? docsHTML() : memHTML(); }

/* ---------- Memoria ---------- */
function memHTML() {
  const e = S.exp, m = e.memoria;
  const plazos = [...m.plazos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return `<div class="memgrid">
    <div class="sheet span"><div class="sheet-head"><h3>Situación actual</h3><span class="tiny muted">El agente lee esta memoria en cada consulta</span></div>
      <label class="field"><span>Estado procesal</span><input class="input" data-bind="estado" value="${esc(e.estado)}" placeholder="Ej.: demanda admitida, pendiente audiencia única"></label>
      <label class="field" style="margin:0"><span>Resumen del caso</span><textarea class="textarea" data-bind="memoria.resumen" rows="3" placeholder="Qué se pide, a favor de quién y por qué">${esc(m.resumen)}</textarea></label></div>
    <div class="sheet"><h3>Plazos</h3><p class="hint">Registra la fecha de vencimiento que confirmaste con la resolución y tu notificación SINOE.</p>
      <ul class="list">${plazos.map(p => `<li><input type="checkbox" aria-label="Marcar cumplido" data-action="toggle-plazo" data-id="${p.id}" ${p.done ? 'checked' : ''}><span><span class="date">${esc(fmtDate(p.fecha))}</span> ${deadlineChip(p.fecha, p.done)}<br><span class="${p.done ? 'done' : ''}">${esc(p.desc)}</span></span><button class="iconbtn" aria-label="Eliminar plazo" data-action="del-plazo" data-id="${p.id}">✕</button></li>`).join('') || '<li class="small muted" style="display:block">Sin plazos registrados.</li>'}</ul>
      <div class="addrow"><input class="input mono" type="date" id="nplazo-f" style="flex:0 0 10.5em" aria-label="Fecha de vencimiento"><input class="input" id="nplazo-d" placeholder="Qué vence" aria-label="Descripción del plazo"><button class="btn sm" data-action="add-plazo">Agregar</button></div></div>
    <div class="sheet"><h3>Pendientes</h3><p class="hint">Tareas del caso para ti o tu equipo.</p>
      <ul class="list">${m.pendientes.map(p => `<li><input type="checkbox" aria-label="Marcar hecho" data-action="toggle-pend" data-id="${p.id}" ${p.done ? 'checked' : ''}><span class="${p.done ? 'done' : ''}">${esc(p.text)}</span><button class="iconbtn" aria-label="Eliminar pendiente" data-action="del-pend" data-id="${p.id}">✕</button></li>`).join('') || '<li class="small muted" style="display:block">Sin pendientes.</li>'}</ul>
      <div class="addrow"><input class="input" id="npend" placeholder="Nuevo pendiente" aria-label="Nuevo pendiente"><button class="btn sm" data-action="add-pend">Agregar</button></div></div>
    <div class="sheet span"><div class="sheet-head"><h3>Partes y datos que se reemplazan</h3><span class="tiny muted">${S.settings.pseudo ? 'Reemplazo activado' : 'Reemplazo desactivado en Ajustes'}</span></div>
      <p class="hint">Antes de enviar al proveedor, Folio cambia estos nombres y documentos por el marcador de la última columna.</p>
      <div class="table-wrap"><table class="partes-table"><thead><tr><th>Nombre completo</th><th>Rol</th><th>Documento</th><th>Cliente</th><th>Se envía como</th><th></th></tr></thead><tbody>
      ${e.partes.map(p => `<tr><td>${esc(p.nombre)}</td><td>${esc(p.rol)}</td><td class="mono">${esc(p.doc || '—')}</td><td><input type="checkbox" aria-label="Es mi cliente" data-action="toggle-cliente" data-id="${p.id}" ${p.esCliente ? 'checked' : ''}></td><td><span class="tok">[${esc(p.tok)}]</span></td><td><button class="iconbtn" aria-label="Eliminar parte" data-action="del-parte" data-id="${p.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="6" class="small muted">Agrega las partes para que el agente las identifique sin ver sus datos reales.</td></tr>'}
      </tbody></table></div>
      <div class="addrow" style="flex-wrap:wrap"><input class="input" id="nparte-n" placeholder="Nombres y apellidos" style="flex:2 1 14em" aria-label="Nombre de la parte"><select class="select" id="nparte-r" style="flex:1 1 9em" aria-label="Rol">${['Demandante', 'Demandado', 'Agraviado(a)', 'Imputado(a)', 'Tercero', 'Testigo', 'Otro'].map(r => `<option>${r}</option>`).join('')}</select><input class="input mono" id="nparte-d" placeholder="DNI o RUC" style="flex:1 1 8em" aria-label="Documento"><label class="row small" style="flex:0 0 auto"><input type="checkbox" id="nparte-c"> Mi cliente</label><button class="btn sm" data-action="add-parte">Agregar</button></div></div>
    <div class="sheet"><h3>Hechos clave</h3><textarea class="textarea" data-bind="memoria.hechos" rows="6" placeholder="Hechos relevantes y fechas">${esc(m.hechos)}</textarea></div>
    <div class="sheet"><h3>Estrategia</h3><textarea class="textarea" data-bind="memoria.estrategia" rows="6" placeholder="Tu teoría del caso y próximos pasos">${esc(m.estrategia)}</textarea></div>
  </div>`;
}

/* ---------- Movimientos ---------- */
function movsHTML() {
  const movs = [...S.exp.movimientos].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  return `<div class="sheet"><div class="sheet-head"><h3>Movimientos del expediente</h3><div class="row"><button class="btn sm" data-action="paste-cej">Pegar desde el CEJ</button><button class="btn primary sm" data-action="add-mov">Agregar movimiento</button></div></div>
    <p class="hint">Copia el seguimiento del expediente desde la consulta del CEJ y pégalo: el agente lo ordena. Folio no se conecta al CEJ por ti.</p>
    ${movs.length ? `<ol class="timeline" reversed>${movs.map(v => `<li><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="when">${esc(fmtDate(v.fecha))}</span><button class="iconbtn" aria-label="Eliminar movimiento" data-action="del-mov" data-id="${v.id}">✕</button></div><div class="acto">${esc(v.acto)}</div>${v.sumilla ? `<div class="sum">${esc(v.sumilla)}</div>` : ''}</li>`).join('')}</ol>` : '<p class="small muted">Sin movimientos. Agrega el primero o pega el seguimiento del CEJ.</p>'}</div>`;
}

/* ---------- Documentos ---------- */
function docsHTML() {
  const e = S.exp;
  return `<div class="dropzone" data-action="pick-file" tabindex="0" role="button" aria-label="Agregar documentos"><strong>Arrastra aquí PDF, Word (.docx) o texto (.txt), o haz clic para elegir.</strong><br><span class="small">El texto se extrae en tu equipo y se guarda cifrado. El archivo original no se copia.</span></div>
    <div class="note" style="margin-bottom:1rem"><p>Los PDF escaneados como imagen no tienen texto que leer; esta versión no hace reconocimiento óptico (OCR).</p></div>
    ${e.docs.length ? `<div class="docs">${e.docs.map(d => `<article class="doc"><span class="folio" title="${d.pages || '?'} páginas">${d.type === 'pdf' ? 'Fs.' : '≈'} ${d.pages || '?'}</span><span class="name">${esc(d.name)}</span><span class="tiny muted">${(d.chars || 0).toLocaleString('es-PE')} caracteres, agregado el ${esc(fmtDate(d.addedAt))}</span>${d.scanned ? '<span class="chip soon">Parece escaneado</span>' : ''}<div class="actions"><button class="btn sm" data-action="view-doc" data-id="${d.id}">Ver texto</button><button class="btn ghost sm" data-action="del-doc" data-id="${d.id}">Eliminar</button></div></article>`).join('')}</div>` : '<p class="small muted">Sin documentos. Agrega la demanda, resoluciones o escritos clave para que el agente pueda citarlos.</p>'}`;
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
      await saveExp(); if (S.tab === 'documentos') renderPane(); updateTabs();
      toast(r.scanned ? `${f.name}: casi no tiene texto. Puede ser un escaneo.` : `${f.name} agregado.`, !!r.scanned);
    } catch (err) { fail(err); }
  }
}
function updateTabs() { const e = S.exp; if (!e) return; const t = $$('.tabs button'); if (t.length >= 3) { t[1].textContent = `Movimientos (${e.movimientos.length})`; t[2].textContent = `Documentos (${e.docs.length})`; } }

/* ============================================================
   Agente
   ============================================================ */
const QUICK = [['Resume el expediente', 'Resume el expediente en pocas líneas: qué se discute, en qué etapa está y qué viene.'],
  ['Plazos y qué preparar', '¿Qué plazos tengo registrados y qué debería preparar para cada uno?'],
  ['Riesgos del caso', 'Identifica los puntos débiles y riesgos de mi posición, y cómo mitigarlos.'],
  ['Borrador de escrito', 'Prepara un borrador de escrito para: ']];
function msgHTML(m, i) {
  if (m.role === 'user') return `<div class="msg user">${esc(m.content)}</div>`;
  if (m.role === 'error') return `<div class="msg error" role="alert">${esc(m.content)}</div>`;
  const meta = m.meta ? `Enviado a ${esc(provLabel(m.meta.provider))} (${esc(m.meta.model)})${m.meta.pseudo ? `, ${m.meta.replaced} dato${m.meta.replaced === 1 ? '' : 's'} reemplazado${m.meta.replaced === 1 ? '' : 's'}` : ', sin reemplazo de datos'}` : '';
  return `<div class="msg assistant">${md(m.content)}${citasHTML(m)}<div class="foot"><span>${meta}</span><button class="btn ghost sm" data-action="copy-msg" data-i="${i}">Copiar</button></div></div>`;
}
function agentHTML() {
  const e = S.exp, s = S.settings, ready = isReady(s);
  const abroad = PROVIDERS[s.provider]?.abroad;
  const line = !ready ? '' : abroad
    ? `<span class="dot ${s.pseudo ? '' : 'off'}"></span>${s.pseudo ? 'Se envía a ' + esc(provLabel(s.provider)) + ' con datos reemplazados' : 'Se envía a ' + esc(provLabel(s.provider)) + ' sin reemplazar datos'}`
    : `<span class="dot"></span>Se envía a tu servidor propio`;
  return `<div class="agent-head"><div><h2>Agente del expediente</h2><div class="prov">${ready ? esc(provLabel(s.provider)) + ', ' + esc(s.model) : 'Sin proveedor conectado'}</div>${libStatusHTML()}</div>
      <div class="row"><button class="btn sm" data-action="propose-memory" ${e.chat.some(m => m.role === 'assistant') && ready ? '' : 'disabled'} title="El agente propone cambios a la memoria del caso; tú decides cuáles aplicar">Actualizar memoria</button>${e.chat.length ? '<button class="btn ghost sm" data-action="clear-chat">Limpiar</button>' : ''}</div></div>
    <div class="msgs" id="msgs">${e.chat.length ? e.chat.map(msgHTML).join('') : `<div class="empty-agent"><p>Pregunta sobre este expediente. El agente ya conoce su memoria, movimientos y documentos.</p></div>`}</div>
    ${ready ? `<div class="quick">${QUICK.map(([l], i) => `<button data-action="quick" data-i="${i}">${esc(l)}</button>`).join('')}</div>
    <form class="composer" data-form="chat"><label class="sr-only" for="q">Tu consulta</label><textarea id="q" class="textarea" rows="2" placeholder="Escribe tu consulta. Enter envía, Mayús+Enter salta de línea." ${S.sending ? 'disabled' : ''}></textarea>
      <div class="row"><span class="privacy-line">${line}</span>${S.sending ? '<button class="btn" type="button" data-action="stop">Detener</button>' : '<button class="btn primary" type="submit">Enviar</button>'}</div></form>`
    : `<div class="composer"><div class="note warn"><p>Conecta tu proveedor de IA para conversar con el agente.</p><button class="btn sm" data-action="open-settings">Conectar proveedor</button></div></div>`}`;
}
function renderAgent() { const a = $('#agent'); if (a) { a.innerHTML = agentHTML(); scrollMsgs(); } }
function scrollMsgs() { const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight; }

function highlightTokens(s) { return esc(s).replace(/\[(?:PERSONA|DOC|CORREO|RUC|TELEFONO|DNI|DIRECCION)_\d+\]/g, t => `<mark>${t}</mark>`); }
async function reviewPayload(system, messages, P, kind, plannerText = null, withNormas = false) {
  if (!S.settings.review) return true;
  const s = S.settings;
  let instr = system, data = '';
  const cut = system.indexOf('\n\nFECHA DE HOY:');
  if (cut >= 0) { instr = system.slice(0, cut); data = system.slice(cut + 2); }
  const convo = messages.map(m => `[${m.role === 'user' ? 'Abogado' : 'Agente'}]\n${m.content}`).join('\n\n');
  const r = await askDialog({ title: 'Revisa lo que se enviará', wide: true, ok: 'Enviar', collect: d => ({ skip: $('#rv-skip', d).checked }),
    body: `<p>Este es el texto exacto que saldrá de tu equipo hacia <strong>${esc(provLabel(s.provider))}</strong> (${esc(s.model)})${PROVIDERS[s.provider]?.abroad ? ', con servidores fuera del Perú' : ''}. ${P.enabled ? `Se reemplazaron <strong>${P.count()}</strong> datos personales; aparecen resaltados.` : '<strong>El reemplazo de datos está desactivado.</strong>'}</p>
      ${P.enabled ? '<p class="small muted">Revisa si queda algún nombre, apodo o dato que identifique a alguien. Si lo ves, cancela y agrégalo como parte en la memoria.</p>' : ''}
      ${plannerText ? `<p class="payload-label">1. Búsqueda de normas (consulta corta previa)</p><div class="payload">${highlightTokens(plannerText)}</div>` : ''}
      <p class="payload-label">${plannerText ? '2. ' : ''}Consulta y datos del caso</p>
      <div class="payload">${highlightTokens(convo + (data ? '\n\n' + data : ''))}</div>
      ${withNormas ? '<p class="small muted" style="margin-top:.5rem">Al final se agregarán los artículos encontrados en tu biblioteca legal: textos públicos de normas peruanas, sin datos del caso.</p>' : ''}
      <details class="instr"><summary>Instrucciones fijas de Folio para el modelo (no contienen datos del caso)</summary><div class="payload">${highlightTokens(instr)}</div></details>
      <label class="row small" style="margin-top:.8rem"><input type="checkbox" id="rv-skip"> No volver a mostrar antes de cada envío (puedes reactivarlo en Ajustes)</label>` });
  if (!r) return false;
  if (r.skip) { S.settings.review = false; await saveSettings(); }
  return true;
}
function historyFor(e) {
  const h = e.chat.filter(m => m.role === 'user' || m.role === 'assistant').slice(-8).map(m => ({ role: m.role, content: m.content }));
  while (h.length && h[0].role !== 'user') h.shift();
  const out = []; for (const m of h) { if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n\n' + m.content; else out.push({ ...m }); }
  return out;
}
async function sendChat(text) {
  const e = S.exp, s = S.settings; text = text.trim(); if (!text || S.sending) return;
  const P = makePseudo(e, s.pseudo);
  const ctx = buildContext(e, S.docTexts, text);
  await Lib.load(); const lib = Lib.installed();
  const usePlanner = lib && s.legalPlanner !== false;
  const plannerSystem = PLANNER_PROMPT + normasCatalogText();
  const plannerUser = usePlanner ? P.apply(`Especialidad: ${e.especialidad || 'sin indicar'}\nMateria: ${e.materia || 'sin indicar'}\nEstado procesal: ${e.estado || 'sin indicar'}\n\nConsulta del abogado:\n${text}`) : '';
  const system0 = P.apply(SYSTEM_PROMPT + (lib ? LEGAL_RULES : '') + '\n\n' + ctx.text);
  const hist = historyFor(e).map(m => ({ role: m.role, content: P.apply(m.content) }));
  let messages = [...hist, { role: 'user', content: P.apply(text) }];
  if (messages.length >= 2 && messages[messages.length - 2].role === 'user') { const last = messages.pop(); messages[messages.length - 1].content += '\n\n' + last.content; }
  if (!(await reviewPayload(system0, messages, P, 'chat', usePlanner ? plannerUser : null, lib))) return;
  e.chat.push({ role: 'user', content: text, at: new Date().toISOString() });
  S.sending = true; S.abort = new AbortController(); renderAgent();
  const box = $('#msgs'); box.insertAdjacentHTML('beforeend', `<div class="msg assistant" id="streaming"><span class="typing" aria-label="El agente está escribiendo"><i></i><i></i><i></i></span></div>`); scrollMsgs();
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
    const full = await llm({ cfg: s, system, messages, stream: true, maxTokens: 6000, signal: S.abort.signal, onDelta: t => { pending = t; requestAnimationFrame(() => { if (pending == null) return; const el = $('#streaming'); if (el) { el.innerHTML = md(P.restore(pending)); scrollMsgs(); } pending = null; }); } });
    const content = P.restore(full).trim() || '(El modelo no devolvió texto.)';
    e.chat.push({ role: 'assistant', content, at: new Date().toISOString(), meta: { provider: s.provider, model: s.model, pseudo: P.enabled, replaced: P.count(), normas: arts.map(({ id, a }) => id + ' ' + a.n) }, citas: checkCitations(content) });
    await logSend('Consulta', chars, P);
  } catch (err) {
    if (err.name === 'AbortError') e.chat.push({ role: 'error', content: 'Detuviste la respuesta.' });
    else e.chat.push({ role: 'error', content: err instanceof FolioError ? err.message : 'Error inesperado: ' + err.message });
  } finally { S.sending = false; S.abort = null; await saveExp().catch(fail); renderAgent(); updateStamp(); $('#q')?.focus(); }
}
async function logSend(kind, chars, P) {
  const s = S.settings; S.lastSend = { at: Date.now(), provider: s.provider, pseudo: P.enabled };
  await addAudit({ at: new Date().toISOString(), kind, provider: s.provider, model: s.model, exp: S.exp?.numero || 's/n', chars, pseudo: P.enabled, replaced: P.count(), local: !PROVIDERS[s.provider]?.abroad });
}

/* ---------- La memoria se actualiza con tu aprobación ---------- */
async function proposeMemory() {
  const e = S.exp, s = S.settings; const P = makePseudo(e, s.pseudo);
  const convo = e.chat.filter(m => m.role !== 'error').slice(-8).map(m => `${m.role === 'user' ? 'ABOGADO' : 'AGENTE'}: ${m.content}`).join('\n\n');
  const system = `Eres el módulo de memoria de Folio. Propón cambios a la memoria de un expediente judicial peruano a partir de la conversación reciente. Devuelve SOLO un objeto JSON válido, sin texto adicional, con esta forma:
{"estado": string|null, "resumen_agregar": string|null, "hechos_agregar": string|null, "estrategia_agregar": string|null, "pendientes_nuevos": [string], "plazos_nuevos": [{"fecha": "AAAA-MM-DD", "descripcion": string}]}
Incluye solo información nueva que aparezca de forma explícita en la conversación. No inventes fechas: un plazo nuevo solo se propone si la conversación menciona una fecha concreta. Usa null o listas vacías si no hay nada. Conserva los marcadores como [PERSONA_1] tal cual.`;
  const user = P.apply(`FECHA DE HOY: ${todayISO()}\n\nMEMORIA ACTUAL:\n${memoryText(e)}\n\nCONVERSACIÓN RECIENTE:\n${convo}`);
  if (!(await reviewPayload(system, [{ role: 'user', content: user }], P, 'memoria'))) return;
  const btn = $('[data-action="propose-memory"]'); if (btn) { btn.disabled = true; btn.textContent = 'Analizando…'; }
  try {
    const out = await llm({ cfg: s, system, messages: [{ role: 'user', content: user }], maxTokens: 4000 });
    await logSend('Actualizar memoria', system.length + user.length, P);
    const j = parseJSONLoose(out); const R = v => typeof v === 'string' ? P.restore(v).trim() : '';
    const items = [];
    if (R(j.estado)) items.push({ k: 'estado', label: 'Nuevo estado procesal', v: R(j.estado) });
    if (R(j.resumen_agregar)) items.push({ k: 'resumen', label: 'Agregar al resumen', v: R(j.resumen_agregar) });
    if (R(j.hechos_agregar)) items.push({ k: 'hechos', label: 'Agregar a hechos clave', v: R(j.hechos_agregar) });
    if (R(j.estrategia_agregar)) items.push({ k: 'estrategia', label: 'Agregar a la estrategia', v: R(j.estrategia_agregar) });
    (j.pendientes_nuevos || []).map(R).filter(Boolean).forEach(v => items.push({ k: 'pend', label: 'Nuevo pendiente', v }));
    (j.plazos_nuevos || []).filter(p => p && /^\d{4}-\d{2}-\d{2}$/.test(p.fecha || '') && R(p.descripcion)).forEach(p => items.push({ k: 'plazo', label: `Nuevo plazo, ${fmtDate(p.fecha)}`, v: R(p.descripcion), fecha: p.fecha }));
    if (!items.length) { toast('El agente no encontró información nueva para la memoria.'); return; }
    const sel = await askDialog({ title: 'Cambios propuestos a la memoria', ok: 'Aplicar seleccionados', wide: true,
      collect: d => $$('[data-prop]', d).filter(c => c.checked).map(c => +c.dataset.prop),
      body: `<p>Marca lo que quieres guardar. Nada cambia sin tu aprobación.</p><ul class="proposal">${items.map((it, i) => `<li><label class="check"><input type="checkbox" data-prop="${i}" ${it.k === 'plazo' ? '' : 'checked'}><span><strong>${esc(it.label)}</strong><br>${esc(it.v)}${it.k === 'plazo' ? '<br><span class="small" style="color:var(--warn)">Verifica esta fecha con la resolución y tu notificación antes de aceptarla.</span>' : ''}</span></label></li>`).join('')}</ul>` });
    if (!sel || !sel.length) return;
    const m = e.memoria;
    for (const i of sel) { const it = items[i];
      if (it.k === 'estado') e.estado = it.v;
      else if (it.k === 'pend') m.pendientes.push({ id: uid(), text: it.v, done: false });
      else if (it.k === 'plazo') m.plazos.push({ id: uid(), fecha: it.fecha, desc: it.v, done: false });
      else m[it.k] = (m[it.k] ? m[it.k].trimEnd() + '\n' : '') + it.v; }
    await saveExp(); renderPane(); toast(`Memoria actualizada: ${sel.length} cambio${sel.length > 1 ? 's' : ''}.`);
  } catch (err) { fail(err); } finally { renderAgent(); updateStamp(); }
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
    await logSend('Ordenar movimientos', system.length + user.length, P); updateStamp();
    const list = (parseJSONLoose(out).movimientos || []).map(v => ({ fecha: /^\d{4}-\d{2}-\d{2}$/.test(v.fecha || '') ? v.fecha : '', acto: P.restore(String(v.acto || '')).trim(), sumilla: P.restore(String(v.sumilla || '')).trim() })).filter(v => v.acto);
    if (!list.length) { toast('No se encontraron movimientos en el texto.', true); return; }
    const sel = await askDialog({ title: `${list.length} movimientos encontrados`, ok: 'Agregar seleccionados', wide: true,
      collect: d => $$('[data-mv]', d).filter(c => c.checked).map(c => +c.dataset.mv),
      body: `<p>Revisa cada movimiento contra el CEJ antes de agregarlo.</p><ul class="proposal">${list.map((v, i) => `<li><label class="check"><input type="checkbox" data-mv="${i}" checked><span><span class="mono"><strong>${esc(fmtDate(v.fecha))}</strong></span> ${esc(v.acto)}<br><span class="small muted">${esc(v.sumilla)}</span></span></label></li>`).join('')}</ul>` });
    if (!sel || !sel.length) return;
    sel.forEach(i => e.movimientos.push({ id: uid(), ...list[i] }));
    await saveExp(); renderPane(); updateTabs(); toast(`${sel.length} movimientos agregados.`);
  } catch (err) { fail(err); }
}

/* ============================================================
   Formularios de expediente y movimiento
   ============================================================ */
const ESPECIALIDADES = ['Civil', 'Familia', 'Penal', 'Laboral', 'Contencioso administrativo', 'Constitucional', 'Comercial', 'Otra'];
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
    S.exp = ne; S.docTexts = {}; S.tab = 'memoria'; S.view = 'exp'; S.sideOpen = false;
    await saveExp(); S.settings.lastExp = ne.id; await saveSettings(); render(); toast('Expediente creado.');
  } else {
    Object.assign(S.exp, { numero: r.numero, materia: r.materia, especialidad: r.especialidad, organo: r.organo, distrito: r.distrito, estado: r.estado });
    await saveExp(); render(); toast('Datos guardados.');
  }
}
async function deleteExp() {
  const e = S.exp; closeDialog();
  const ok = await askDialog({ title: 'Eliminar expediente', ok: 'Eliminar definitivamente', danger: true, body: `<p>Se eliminará <strong class="mono">${esc(e.numero || 'este expediente')}</strong> con su memoria, movimientos, documentos y conversaciones de este equipo. No se puede deshacer.</p>` });
  if (!ok) return;
  for (const d of e.docs) await store.del('doc:' + d.id);
  await store.del('exp:' + e.id); S.index = S.index.filter(x => x.id !== e.id); await store.put('index', S.index);
  S.exp = null; S.settings.lastExp = null; await saveSettings(); render(); toast('Expediente eliminado.');
}
async function movForm() {
  const r = await askDialog({ title: 'Agregar movimiento', ok: 'Agregar',
    collect: d => { const f = { fecha: $('#mv-f', d).value, acto: $('#mv-a', d).value.trim(), sumilla: $('#mv-s', d).value.trim() }; if (!f.acto) { $('#mv-err', d).textContent = 'Indica el acto, por ejemplo Resolución 2.'; return null; } return f; },
    body: `<div class="grid2"><label class="field"><span>Fecha</span><input class="input mono" type="date" id="mv-f" value="${todayISO()}"></label><label class="field"><span>Acto</span><input class="input" id="mv-a" placeholder="Ej.: Resolución 2, Escrito, Audiencia"></label></div>
      <label class="field"><span>Sumilla</span><textarea class="textarea" id="mv-s" rows="3" placeholder="Qué se resolvió o presentó"></textarea></label><p id="mv-err" class="small" style="color:var(--danger)" role="alert"></p>` });
  if (!r) return;
  S.exp.movimientos.push({ id: uid(), ...r }); await saveExp(); renderPane(); updateTabs(); toast('Movimiento agregado.');
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
  S.tab = 'memoria'; S.view = 'exp';
  await saveExp(); S.settings.lastExp = e.id; await saveSettings(); render(); toast('Expediente de ejemplo cargado. Todos sus datos son ficticios.');
}

/* ============================================================
   Ajustes
   ============================================================ */
async function settingsView() { S.view = 'settings'; S.draftCfg = { ...pickCfg(S.settings) }; S.sideOpen = false; render(); }
function settingsHTML() {
  const s = S.settings;
  return `<div class="settings"><div class="wrap">
    <div class="row" style="justify-content:space-between;margin-bottom:1rem"><h1 style="margin:0">Ajustes</h1><button class="btn" data-action="close-settings">Volver a expedientes</button></div>
    <section class="sheet"><div class="sheet-head"><h3>Proveedor de IA</h3><button class="btn sm" data-action="show-keyguide">Guía para obtener tu key</button></div><p class="hint">Usas tu propia cuenta. La key se guarda cifrada en este equipo.</p><div id="pf-block">${providerFieldsHTML(S.draftCfg)}</div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" data-action="save-provider">Guardar proveedor</button></div></section>
    <section class="sheet"><h3>Privacidad de cada consulta</h3>
      <label class="switch" style="margin:.6rem 0 1rem"><input type="checkbox" data-setting="pseudo" ${s.pseudo ? 'checked' : ''}><span><strong>Reemplazar datos personales antes de enviar</strong><br><span class="small muted">Nombres y documentos de las partes, DNI, RUC, teléfonos, correos y direcciones.</span></span></label>
      <label class="switch" style="margin-bottom:1rem"><input type="checkbox" data-setting="review" ${s.review ? 'checked' : ''}><span><strong>Revisar el texto antes de cada envío</strong><br><span class="small muted">Muestra exactamente lo que saldrá de tu equipo y te pide confirmar.</span></span></label>
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
      case 'open-side': S.sideOpen = true; $('.app')?.classList.add('side-open'); break;
      case 'close-side': S.sideOpen = false; $('.app')?.classList.remove('side-open'); break;
      case 'open-exp': await openExp(id); break;
      case 'new-exp': await expForm(null); break;
      case 'edit-exp': await expForm(S.exp); break;
      case 'del-exp': await deleteExp(); break;
      case 'load-sample': await loadSample(); break;
      case 'tab': S.tab = a.dataset.tab; $$('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === S.tab)); $('#work')?.classList.toggle('show-agent', S.tab === 'agente'); renderPane(); if (S.tab === 'agente') scrollMsgs(); break;
      case 'add-plazo': { const f = $('#nplazo-f').value, d = $('#nplazo-d').value.trim(); if (!f || !d) { toast('Indica la fecha y qué vence.', true); break; } S.exp.memoria.plazos.push({ id: uid(), fecha: f, desc: d, done: false }); await saveExp(); renderPane(); break; }
      case 'toggle-plazo': { const p = S.exp.memoria.plazos.find(x => x.id === id); p.done = !p.done; await saveExp(); renderPane(); break; }
      case 'del-plazo': S.exp.memoria.plazos = S.exp.memoria.plazos.filter(x => x.id !== id); await saveExp(); renderPane(); break;
      case 'add-pend': { const v = $('#npend').value.trim(); if (!v) break; S.exp.memoria.pendientes.push({ id: uid(), text: v, done: false }); await saveExp(); renderPane(); $('#npend')?.focus(); break; }
      case 'toggle-pend': { const p = S.exp.memoria.pendientes.find(x => x.id === id); p.done = !p.done; await saveExp(); renderPane(); break; }
      case 'del-pend': S.exp.memoria.pendientes = S.exp.memoria.pendientes.filter(x => x.id !== id); await saveExp(); renderPane(); break;
      case 'add-parte': { const n = $('#nparte-n').value.trim(); if (n.split(/\s+/).length < 2) { toast('Escribe nombres y apellidos completos para reemplazarlos bien.', true); break; } addParte(S.exp, n, $('#nparte-r').value, $('#nparte-d').value, $('#nparte-c').checked); await saveExp(); render(); break; }
      case 'toggle-cliente': { const p = S.exp.partes.find(x => x.id === id); p.esCliente = !p.esCliente; await saveExp(); render(); break; }
      case 'del-parte': { const ok = await askDialog({ title: 'Quitar parte', ok: 'Quitar', danger: true, body: '<p>Si la quitas, su nombre ya no se reemplazará antes de enviar al proveedor.</p>' }); if (!ok) break; S.exp.partes = S.exp.partes.filter(x => x.id !== id); await saveExp(); render(); break; }
      case 'add-mov': await movForm(); break;
      case 'paste-cej': await pasteCEJ(); break;
      case 'del-mov': S.exp.movimientos = S.exp.movimientos.filter(x => x.id !== id); await saveExp(); renderPane(); updateTabs(); break;
      case 'pick-file': $('#file-docs').click(); break;
      case 'view-doc': { const d = S.exp.docs.find(x => x.id === id); const t = S.docTexts[id] || ''; openDialog({ title: d.name, wide: true, body: `<p class="small muted">Texto extraído en tu equipo${t.length > 40000 ? ', primeros 40 000 caracteres' : ''}.</p><div class="payload">${esc(t.slice(0, 40000)) || 'Sin texto.'}</div>`, foot: '<button class="btn primary" data-action="dlg-close">Cerrar</button>' }); break; }
      case 'del-doc': { const d = S.exp.docs.find(x => x.id === id); const ok = await askDialog({ title: 'Eliminar documento', ok: 'Eliminar', danger: true, body: `<p>Se eliminará el texto de <strong>${esc(d.name)}</strong> de este equipo.</p>` }); if (!ok) break; await store.del('doc:' + id); delete S.docTexts[id]; S.exp.docs = S.exp.docs.filter(x => x.id !== id); await saveExp(); renderPane(); updateTabs(); break; }
      case 'quick': { const q = QUICK[+a.dataset.i][1]; if (+a.dataset.i === 3) { const t = $('#q'); t.value = q; t.focus(); t.setSelectionRange(q.length, q.length); } else await sendChat(q); break; }
      case 'stop': S.abort?.abort(); break;
      case 'copy-msg': await navigator.clipboard.writeText(S.exp.chat[+a.dataset.i].content); toast('Respuesta copiada.'); break;
      case 'clear-chat': { const ok = await askDialog({ title: 'Limpiar conversación', ok: 'Limpiar', body: '<p>Se borra la conversación de este expediente. La memoria del caso se mantiene.</p>' }); if (!ok) break; S.exp.chat = []; await saveExp(); renderAgent(); break; }
      case 'propose-memory': await proposeMemory(); break;
      case 'open-settings': await settingsView(); fillConsentLine(); break;
      case 'close-settings': S.view = 'exp'; render(); break;
      case 'save-provider': Object.assign(S.settings, pickCfg(S.draftCfg)); await saveSettings(); toast(isReady(S.settings) ? 'Proveedor guardado.' : 'Guardado. Falta la key o el modelo para usar el agente.', !isReady(S.settings)); break;
      case 'lock-now': lockNow(); break;
      case 'reconsent-accept': await acceptReconsent(); break;
      case 'update-how': showUpdateHow(); break;
      case 'normas-install': await installNormas(); break;
      case 'normas-remove': await confirmRemoveNormas(); break;
      case 'normas-changes': await showNormasChanges(); break;
      case 'ver-articulo': showArticle(a.dataset.norma, a.dataset.n); break;
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
      const k = t.dataset.setting; S.settings[k] = t.type === 'checkbox' ? t.checked : (k === 'autoLockMin' ? +t.value : t.value);
      await saveSettings(); if (k === 'theme') applyTheme(); toast('Ajuste guardado.');
    }
    else if (t.id === 'file-docs') { const f = [...t.files]; t.value = ''; await addFiles(f); }
    else if (t.id === 'file-backup') { const f = t.files[0]; t.value = ''; if (f) await importBackup(f); }
  } catch (e) { fail(e); }
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.dataset.onbField) { S.onb[t.dataset.onbField] = t.value; updateOnbNav(); }
  else if (t.dataset.pf && t.type !== 'checkbox' && t.tagName !== 'SELECT') curCfg()[t.dataset.pf] = t.value;
  else if (t.hasAttribute('data-search')) { S.filter = t.value; const l = $('#explist'); if (l) l.innerHTML = listHTML(); }
  else if (t.dataset.bind && S.exp) { setPath(S.exp, t.dataset.bind, t.value); saveSoon(); }
});
document.addEventListener('submit', async ev => {
  const f = ev.target.closest('[data-form]'); if (!f) return; ev.preventDefault();
  if (f.dataset.form === 'unlock') await doUnlock(f.pass.value);
  if (f.dataset.form === 'chat') { const v = $('#q').value; if (!v.trim()) return; await sendChat(v); }
});
document.addEventListener('keydown', ev => {
  const t = ev.target;
  if (t.id === 'q' && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); t.closest('form')?.requestSubmit(); }
  if (t.classList?.contains('dropzone') && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); $('#file-docs').click(); }
  if (ev.key === 'Enter' && (t.id === 'npend' || t.id === 'nplazo-d' || t.id === 'nparte-n' || t.id === 'nparte-d')) { ev.preventDefault(); $(`[data-action="${t.id === 'npend' ? 'add-pend' : t.id === 'nplazo-d' ? 'add-plazo' : 'add-parte'}"]`)?.click(); }
});
document.addEventListener('dragover', ev => { const z = ev.target.closest?.('.dropzone'); if (z) { ev.preventDefault(); z.classList.add('over'); } });
document.addEventListener('dragleave', ev => { const z = ev.target.closest?.('.dropzone'); if (z) z.classList.remove('over'); });
document.addEventListener('drop', ev => { const z = ev.target.closest?.('.dropzone'); if (!z) return; ev.preventDefault(); z.classList.remove('over'); addFiles([...ev.dataTransfer.files]).catch(fail); });
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
