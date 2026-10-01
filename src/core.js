/* ============================================================
   Folio MVP · núcleo
   Todo corre en el navegador. No hay servidor de Folio.
   ============================================================ */
const APP = { name: 'Folio', version: '0.4.0', policyVersion: '2026-10-01 r2 (borrador)' };
const ITER = 310000;
const te = new TextEncoder(), td = new TextDecoder();
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
class FolioError extends Error {}

function b64(u8) { let s = ''; const CH = 0x8000; for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); }
function unb64(str) { const bin = atob(str); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }

function todayISO() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function addDaysISO(n) { const d = new Date(); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function fmtDate(iso) { if (!iso) return 's/f'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
function daysUntil(iso) { const a = new Date(todayISO() + 'T00:00:00'); const b = new Date(iso + 'T00:00:00'); return Math.round((b - a) / 86400000); }
function rel(ts) { const s = Math.round((Date.now() - ts) / 1000); if (s < 60) return 'hace un momento'; const m = Math.round(s / 60); if (m < 60) return `hace ${m} min`; const h = Math.round(m / 60); return `hace ${h} h`; }
function fmtDateTime(iso) { const d = new Date(iso); return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }); }
function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

/* ---------- IndexedDB ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      let r; try { r = indexedDB.open('folio-mvp', 1); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  st(mode) { return this.db.transaction('kv', mode).objectStore('kv'); },
  rq(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  get(k) { return this.rq(this.st('readonly').get(k)); },
  put(k, v) { return this.rq(this.st('readwrite').put(v, k)); },
  del(k) { return this.rq(this.st('readwrite').delete(k)); },
  keys() { return this.rq(this.st('readonly').getAllKeys()); },
  clear() { return this.rq(this.st('readwrite').clear()); },
  putMany(entries) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction('kv', 'readwrite'); const s = tx.objectStore('kv');
      for (const [k, v] of entries) s.put(v, k);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  }
};

/* ---------- Bóveda cifrada ---------- */
const Vault = {
  key: null,
  async derive(pass, salt, iter) {
    const base = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  },
  async encWith(key, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj))));
    return { iv: b64(iv), ct: b64(ct) };
  },
  async decWith(key, rec) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, key, unb64(rec.ct));
    return JSON.parse(td.decode(pt));
  },
  async create(pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.derive(pass, salt, ITER);
    const check = await this.encWith(key, { ok: 'folio' });
    await DB.put('vault', { v: 1, salt: b64(salt), iter: ITER, check, createdAt: new Date().toISOString() });
    this.key = key;
  },
  async unlock(pass) {
    const meta = await DB.get('vault');
    if (!meta) throw new FolioError('No hay una bóveda en este navegador.');
    const key = await this.derive(pass, unb64(meta.salt), meta.iter);
    try { const c = await this.decWith(key, meta.check); if (c.ok !== 'folio') throw 0; }
    catch { throw new FolioError('La contraseña no coincide con esta bóveda.'); }
    this.key = key;
  },
  async changePass(cur, nw) {
    const meta = await DB.get('vault');
    const oldKey = await this.derive(cur, unb64(meta.salt), meta.iter);
    try { await this.decWith(oldKey, meta.check); } catch { throw new FolioError('La contraseña actual no es correcta.'); }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const newKey = await this.derive(nw, salt, ITER);
    const keys = (await DB.keys()).filter(k => k !== 'vault' && k !== 'consent');
    const out = [];
    for (const k of keys) { const obj = await this.decWith(oldKey, await DB.get(k)); out.push([k, await this.encWith(newKey, obj)]); }
    out.push(['vault', { ...meta, salt: b64(salt), iter: ITER, check: await this.encWith(newKey, { ok: 'folio' }) }]);
    await DB.putMany(out);
    this.key = newKey;
  },
  lock() { this.key = null; }
};
const store = {
  async get(k) { const r = await DB.get(k); return r ? Vault.decWith(Vault.key, r) : null; },
  async put(k, o) { await DB.put(k, await Vault.encWith(Vault.key, o)); },
  del(k) { return DB.del(k); }
};

/* ---------- Proveedores de IA (BYOK) ---------- */
const PROVIDERS = {
  openrouter: { label: 'OpenRouter', base: 'https://openrouter.ai/api/v1', kind: 'openai', keyHint: 'sk-or-v1-…', keyUrl: 'https://openrouter.ai/settings/keys', abroad: true,
    note: 'Una sola key para modelos de varios proveedores. Permite exigir que solo respondan proveedores sin retención de datos.' },
  openai: { label: 'OpenAI', base: 'https://api.openai.com/v1', kind: 'openai', keyHint: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys', abroad: true,
    note: 'API de OpenAI con tu cuenta de platform.openai.com. Una suscripción a ChatGPT Plus no sirve aquí.' },
  anthropic: { label: 'Anthropic (Claude)', base: 'https://api.anthropic.com/v1', kind: 'anthropic', keyHint: 'sk-ant-…', keyUrl: 'https://platform.claude.com', abroad: true,
    note: 'API de Claude con tu cuenta de platform.claude.com. Una suscripción a Claude Pro no sirve aquí.' },
  custom: { label: 'Servidor propio (lo configura un técnico)', base: '', kind: 'openai', keyHint: 'solo si tu servidor la pide', keyUrl: null, abroad: false,
    note: 'Un modelo instalado en una computadora de tu oficina. Nada sale de tu red. Un técnico lo instala y te indica la dirección.' }
};
/* Modelos sugeridos en OpenRouter (verifica nombres y precios en cada versión) */
const OR_RECOMMENDED = [
  { id: 'anthropic/claude-sonnet-5.5', name: 'Claude Sonnet 5.5', tag: 'Recomendado' },
  { id: 'openai/gpt-6.1-sol', name: 'GPT-6.1 Sol', tag: 'Recomendado' },
  { id: 'google/gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Rápido' },
  { id: 'deepseek/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', tag: 'Económico' }
];
const DEFAULT_SETTINGS = { provider: 'openrouter', baseUrl: '', apiKey: '', model: '', zdr: true, pseudo: true, review: true, autoLockMin: 15, theme: 'auto', lastExp: null, updateCheck: true, updateLastCheck: 0, updateKnown: null, legalPlanner: true, normasAuto: true, normasLastCheck: 0 };
/* ---------- Aviso de nuevas versiones ----------
   Una consulta GET pública a GitHub (sin datos del abogado ni de expedientes). Declarada en la política, sección 9.
   Se desactiva en Ajustes → Actualizaciones. */
const UPDATE_EVERY_MS = 12 * 3600 * 1000;
function cmpVersion(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0), pb = String(b).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0) ? 1 : -1;
  return 0;
}
async function fetchLatestRelease() {
  const m = /github\.com\/([^/]+)\/([^/#?]+)/.exec(OWNER.repo || ''); if (!m) return null;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://api.github.com/repos/${m[1]}/${m[2].replace(/\.git$/, '')}/releases/latest`, { headers: { accept: 'application/vnd.github+json' }, credentials: 'omit', cache: 'no-store', signal: ctl.signal });
    if (!r.ok) return null;
    const j = await r.json(); if (!j.tag_name) return null;
    const asset = (j.assets || []).find(a => /\.html$/i.test(a.name));
    return { version: String(j.tag_name).replace(/^v/, ''), page: j.html_url, file: asset ? asset.browser_download_url : j.html_url, publishedAt: j.published_at || '' };
  } catch { return null; } finally { clearTimeout(t); }
}
const provLabel = k => (PROVIDERS[k] || PROVIDERS.custom).label;
function baseOf(cfg) { const p = PROVIDERS[cfg.provider] || PROVIDERS.custom; return ((cfg.provider === 'custom' || cfg.provider === 'ollama') ? (cfg.baseUrl || p.base) : p.base).replace(/\/+$/, ''); }
function isReady(cfg) { if (!cfg || !cfg.model) return false; if (cfg.provider === 'custom') return !!cfg.baseUrl; return !!cfg.apiKey; }

function headersFor(cfg) {
  if (PROVIDERS[cfg.provider]?.kind === 'anthropic') {
    return { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
  }
  const h = { 'content-type': 'application/json' };
  if (cfg.apiKey) h.authorization = 'Bearer ' + cfg.apiKey;
  return h;
}
async function checkRes(res, cfg) {
  if (res.ok) return;
  let detail = '';
  try { const t = await res.text(); const j = JSON.parse(t); detail = j.error?.message || j.message || t; } catch { /* sin detalle */ }
  detail = String(detail || '').slice(0, 220);
  const who = provLabel(cfg.provider);
  if (res.status === 401 || res.status === 403) throw new FolioError(`${who} rechazó la key (código ${res.status}). Revísala en Ajustes.`);
  if (res.status === 402) throw new FolioError(`Tu cuenta de ${who} no tiene crédito suficiente.`);
  if (res.status === 404 && /data policy|zdr|retention/i.test(detail)) throw new FolioError(`Ese modelo no tiene proveedores sin retención de datos en ${who}. Elige otro modelo o desactiva esa opción en Ajustes.`);
  if (res.status === 404) throw new FolioError(`${who} no encontró el modelo o la dirección. Revisa el modelo en Ajustes.${detail ? ' Detalle: ' + detail : ''}`);
  if (res.status === 429) throw new FolioError(`${who} indica límite de uso alcanzado. Espera un momento o revisa tu plan.`);
  throw new FolioError(`${who} respondió con error ${res.status}.${detail ? ' Detalle: ' + detail : ''}`);
}
async function safeFetch(url, opts, cfg) {
  try { return await fetch(url, opts); }
  catch (e) {
    if (e.name === 'AbortError') throw e;
    const raw = String((e && e.message) || e);
    const who = provLabel(cfg.provider); let host = ''; try { host = new URL(url).host; } catch { /* sin host */ }
    let hint;
    if (/ISO-8859-1|Invalid value|not a valid HTTP header/i.test(raw)) hint = 'La API key tiene un carácter no válido (por ejemplo un espacio o salto de línea al pegarla). Vuelve a copiarla completa.';
    else if (navigator.onLine === false) hint = 'Tu equipo indica que no hay conexión a internet.';
    else if (cfg.provider === 'custom') hint = 'Verifica que el servidor propio esté encendido y que la dirección sea correcta. Si el problema continúa, consulta con quien lo instaló.';
    else hint = `Tu equipo tiene internet, pero la conexión con ${host || 'el servicio'} fue bloqueada. Causas comunes: firewall o proxy de la red (frecuente en redes institucionales), antivirus o una extensión del navegador (bloqueador de anuncios). Prueba abrir https://${host || 'el servicio'} en otra pestaña, desde otra red (por ejemplo, datos del celular) o con las extensiones desactivadas.`;
    throw new FolioError(`No se pudo conectar con ${who}. ${hint} Detalle técnico: ${raw}`);
  }
}
async function readSSE(res, pick, onDelta) {
  const reader = res.body.getReader(); let buf = '', full = '';
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += td.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim(); if (!data || data === '[DONE]') continue;
      let evt; try { evt = JSON.parse(data); } catch { continue; }
      if (evt.error) throw new FolioError('El proveedor interrumpió la respuesta: ' + String(evt.error.message || evt.error).slice(0, 200));
      const t = pick(evt); if (t) { full += t; onDelta && onDelta(full); }
    }
  }
  return full;
}
async function llm({ cfg, system, messages, stream = false, onDelta, maxTokens = 2000, signal }) {
  if (!isReady(cfg)) throw new FolioError('Conecta tu proveedor de IA en Ajustes para usar el agente.');
  const kind = PROVIDERS[cfg.provider]?.kind || 'openai';
  if (kind === 'anthropic') {
    const body = { model: cfg.model, max_tokens: maxTokens, system, messages, stream };
    const res = await safeFetch(baseOf(cfg) + '/messages', { method: 'POST', headers: headersFor(cfg), body: JSON.stringify(body), signal }, cfg);
    await checkRes(res, cfg);
    if (!stream) { const j = await res.json(); return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join(''); }
    return readSSE(res, e => (e.type === 'content_block_delta' && e.delta?.type === 'text_delta') ? e.delta.text : '', onDelta);
  }
  const body = { model: cfg.model, messages: [{ role: 'system', content: system }, ...messages], stream };
  if (cfg.provider === 'openrouter' || cfg.provider === 'custom') body.max_tokens = maxTokens;
  if (cfg.provider === 'openrouter') body.reasoning = { effort: 'low' };
  if (cfg.provider === 'openrouter' && cfg.zdr) body.provider = { zdr: true, data_collection: 'deny' };
  const res = await safeFetch(baseOf(cfg) + '/chat/completions', { method: 'POST', headers: headersFor(cfg), body: JSON.stringify(body), signal }, cfg);
  await checkRes(res, cfg);
  if (!stream) { const j = await res.json(); return j.choices?.[0]?.message?.content || ''; }
  return readSSE(res, e => e.choices?.[0]?.delta?.content || '', onDelta);
}
async function listModels(cfg) {
  if (!cfg.apiKey && cfg.provider !== 'openrouter' && cfg.provider !== 'custom') throw new FolioError('Ingresa tu API key primero.');
  if (cfg.provider === 'custom' && !cfg.baseUrl) throw new FolioError('Ingresa la dirección de la API primero.');
  const res = await safeFetch(baseOf(cfg) + '/models', cfg.provider === 'openrouter' ? {} : { headers: headersFor(cfg) }, cfg);
  await checkRes(res, cfg);
  const j = await res.json();
  let ids = (j.data || j.models || []).map(m => m.id || m.name).filter(Boolean);
  if (cfg.provider === 'openrouter') {
    ids = ids.filter(id => !/:free$|:batch$|^~|image|audio|lyria|embed|safety|guard/i.test(id));
    const top = OR_RECOMMENDED.map(r => r.id).filter(r => ids.includes(r));
    return [...top, ...ids.filter(i => !top.includes(i)).sort()];
  }
  return ids.sort();
}

/* ---------- Seudonimización ---------- */
const ACC = { a: '[aáàäâ]', e: '[eéèëê]', i: '[iíìïî]', o: '[oóòöô]', u: '[uúùüû]', n: '[nñ]' };
function fuzzy(s) { return escRe(norm(s)).replace(/[aeioun]/g, c => ACC[c]).replace(/\s+/g, '[\\s,]+'); }
function nameVariants(name, sharedSurnames) {
  const w = name.trim().split(/\s+/).filter(Boolean); const v = new Set([w.join(' ')]);
  if (w.length >= 3) {
    const ap = w.slice(-2), no = w.slice(0, -2);
    v.add([...ap, ...no].join(' '));
    v.add([no[0], ap[0]].join(' '));
    const apj = ap.join(' ');
    if (!sharedSurnames.has(norm(apj))) v.add(apj);
  } else if (w.length === 2) v.add([w[1], w[0]].join(' '));
  return [...v].filter(x => x.length >= 4);
}
const GENERIC = [
  { re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, kind: 'CORREO' },
  { re: /(?<!\d)(?:10|15|16|17|20)\d{9}(?!\d)/g, kind: 'RUC' },
  { re: /(?<![\d-])9\d{2}[ -]?\d{3}[ -]?\d{3}(?![\d-])/g, kind: 'TELEFONO' },
  { re: /(?<![\d-])\d{8}(?![\d-])/g, kind: 'DNI' },
  { re: /(?<![\p{L}])(?:Av\.|Avenida|Jr\.|Jirón|Jiron|Calle|Psje\.|Pasaje|Mz\.|Manzana)\s+[^,;\n()]{3,60}/giu, kind: 'DIRECCION' }
];
function makePseudo(exp, enabled) {
  const map = {}; const pairs = []; const counters = {}; const seen = new Map(); let replaced = 0;
  if (enabled) {
    const count = new Map();
    for (const p of exp.partes) { const w = (p.nombre || '').trim().split(/\s+/); if (w.length >= 3) { const k = norm(w.slice(-2).join(' ')); count.set(k, (count.get(k) || 0) + 1); } }
    const shared = new Set([...count].filter(([, n]) => n > 1).map(([k]) => k));
    for (const p of exp.partes) {
      const nm = (p.nombre || '').trim(); if (!nm) continue;
      const tok = `[${p.tok}]`; map[tok] = nm;
      for (const v of nameVariants(nm, shared)) pairs.push({ re: new RegExp(`(?<![\\p{L}])${fuzzy(v)}(?![\\p{L}])`, 'giu'), tok, len: v.length });
      const doc = (p.doc || '').trim();
      if (doc) { const dt = `[${p.tok.replace('PERSONA', 'DOC')}]`; map[dt] = doc; pairs.push({ re: new RegExp(`(?<![\\w])${escRe(doc)}(?![\\w])`, 'g'), tok: dt, len: 99 }); }
    }
    pairs.sort((a, b) => b.len - a.len);
  }
  function apply(text) {
    if (!enabled || !text) return text || '';
    let t = String(text);
    for (const pr of pairs) t = t.replace(pr.re, () => { replaced++; return pr.tok; });
    for (const g of GENERIC) {
      t = t.replace(g.re, m => {
        const key = g.kind + '|' + m.trim(); let tok = seen.get(key);
        if (!tok) { counters[g.kind] = (counters[g.kind] || 0) + 1; tok = `[${g.kind}_${counters[g.kind]}]`; seen.set(key, tok); map[tok] = m.trim(); }
        replaced++; return tok;
      });
    }
    return t;
  }
  function restore(text) {
    if (!enabled || !text) return text || '';
    return String(text).replace(/\[(?:PERSONA|DOC|CORREO|RUC|TELEFONO|DNI|DIRECCION)_\d+\]/g, m => map[m] ?? m);
  }
  return { enabled, apply, restore, count: () => replaced, map };
}

/* ---------- Recuperación de fragmentos (local) ---------- */
const STOP = new Set('para como pero sobre entre cuando tambien donde quien desde todo durante todos contra otros ante ellos esto antes algunos unos otro otras otra tanto estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros cuales este esta estan esos esas eso sera seria puede pueden debe deben hacer tiene tienen expediente caso favor dime quiero necesito'.split(' '));
function terms(q) { return [...new Set(norm(q).split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP.has(w)))]; }
function chunkText(text) {
  const out = []; let cur = '';
  for (const p of String(text).split(/\n{2,}/)) {
    if (cur && (cur.length + p.length) > 1400) { out.push(cur); cur = cur.slice(-180) + '\n\n' + p; }
    else cur = cur ? cur + '\n\n' + p : p;
  }
  if (cur.trim()) out.push(cur);
  return out.flatMap(c => c.length > 2200 ? (c.match(/[\s\S]{1,1800}/g) || []) : [c]);
}
function retrieve(exp, docTexts, q, k = 4) {
  const ts = terms(q); const cands = [];
  for (const d of exp.docs) {
    const text = docTexts[d.id]; if (!text) continue;
    chunkText(text).forEach((c, i) => {
      const n = norm(c); let score = 0;
      for (const t of ts) { let ix = n.indexOf(t); while (ix >= 0) { score++; ix = n.indexOf(t, ix + t.length); } }
      cands.push({ name: d.name, text: c, score, i });
    });
  }
  let top = cands.filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
  if (!top.length) top = cands.filter(c => c.i === 0).slice(0, 2);
  return top;
}

/* ---------- Contexto del expediente (la "memoria") ---------- */
function plazoState(p) { if (p.done) return 'cumplido'; const d = daysUntil(p.fecha); return d < 0 ? `vencido hace ${-d} día(s)` : d === 0 ? 'vence hoy' : `vence en ${d} día(s)`; }
function memoryText(e) {
  const m = e.memoria, L = [];
  L.push(`Expediente: ${e.numero || '(sin número)'}`);
  if (e.materia) L.push(`Materia: ${e.materia}`);
  if (e.especialidad) L.push(`Especialidad: ${e.especialidad}`);
  if (e.organo) L.push(`Órgano jurisdiccional: ${e.organo}`);
  if (e.distrito) L.push(`Distrito judicial: ${e.distrito}`);
  if (e.estado) L.push(`Estado procesal: ${e.estado}`);
  if (e.partes.length) { L.push('Partes:'); e.partes.forEach(p => L.push(`- ${p.nombre} (${p.rol}${p.esCliente ? ', cliente del abogado' : ''})${p.doc ? `, documento ${p.doc}` : ''}`)); }
  if (m.resumen) L.push(`Resumen del caso:\n${m.resumen}`);
  if (m.hechos) L.push(`Hechos clave:\n${m.hechos}`);
  if (m.estrategia) L.push(`Estrategia del abogado:\n${m.estrategia}`);
  const pend = m.pendientes.filter(p => !p.done); if (pend.length) { L.push('Pendientes:'); pend.forEach(p => L.push(`- ${p.text}`)); }
  if (m.plazos.length) { L.push('Plazos registrados por el abogado:'); [...m.plazos].sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(p => L.push(`- ${p.fecha}: ${p.desc} (${plazoState(p)})`)); }
  const movs = [...e.movimientos].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 20);
  if (movs.length) { L.push('Movimientos (más recientes primero):'); movs.forEach(v => L.push(`- ${v.fecha || 's/f'}: ${v.acto}${v.sumilla ? '. ' + v.sumilla : ''}`)); }
  if (e.docs.length) { L.push('Documentos cargados:'); e.docs.forEach(d => L.push(`- ${d.name}${d.pages ? ` (${d.pages} págs.)` : ''}`)); }
  return L.join('\n');
}
const SYSTEM_PROMPT = `Eres Folio, asistente de un abogado litigante en el Perú. Trabajas con la memoria del expediente y los fragmentos de documentos que se te entregan.
Reglas:
1. Distingue lo que consta en el expediente de tu análisis. Si algo no está en el contexto, dilo.
2. No inventes números de casación, sentencias, plenos, artículos ni plazos. Si citas una norma, hazlo solo si estás seguro e indica que el abogado debe verificar su texto y vigencia.
3. Los plazos procesales los confirma el abogado con la resolución y la fecha de notificación en su casilla SINOE. No afirmes que un plazo venció o vence sin esa base.
4. Los datos personales pueden estar reemplazados por marcadores como [PERSONA_1], [DOC_1] o [DNI_1]. Úsalos tal cual y no intentes adivinar los datos reales.
5. Responde en español del Perú, claro y directo, con viñetas cuando ayude. Si preparas un borrador de escrito, usa la estructura habitual peruana (sumilla, destinatario, datos del expediente, petitorio, fundamentos, medios probatorios si corresponde, anexos) y deja entre corchetes lo que el abogado debe completar.
6. Todo lo que produces es un borrador de apoyo. La decisión y la firma son del abogado.`;
function buildContext(e, docTexts, q) {
  const frags = retrieve(e, docTexts, q, 4);
  let t = `FECHA DE HOY: ${todayISO()}\n\n=== MEMORIA DEL EXPEDIENTE ===\n${memoryText(e)}`;
  if (frags.length) t += `\n\n=== FRAGMENTOS DE DOCUMENTOS (texto extraído en el equipo del abogado) ===\n` + frags.map(f => `--- ${f.name} ---\n${f.text}`).join('\n\n');
  return { text: t, frags };
}
function parseJSONLoose(s) {
  let t = String(s || '').replace(/```(?:json)?/gi, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new FolioError('El modelo no devolvió un resultado ordenado. Intenta de nuevo o con otro modelo.');
  try { return JSON.parse(t.slice(a, b + 1)); } catch { throw new FolioError('El modelo devolvió un resultado incompleto. Intenta de nuevo.'); }
}

/* ---------- Markdown mínimo y seguro ---------- */
function md(src) {
  const lines = esc(src).split('\n'); let html = '', ul = false, ol = false;
  const inline = s => s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>');
  const close = () => { if (ul) { html += '</ul>'; ul = false; } if (ol) { html += '</ol>'; ol = false; } };
  for (const raw of lines) {
    const l = raw.trimEnd(); let m;
    if ((m = l.match(/^#{1,6}\s+(.*)$/))) { close(); html += `<h4>${inline(m[1])}</h4>`; }
    else if ((m = l.match(/^\s*[-*•]\s+(.*)$/))) { if (ol) { html += '</ol>'; ol = false; } if (!ul) { html += '<ul>'; ul = true; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)$/))) { if (ul) { html += '</ul>'; ul = false; } if (!ol) { html += '<ol>'; ol = true; } html += `<li>${inline(m[1])}</li>`; }
    else if (!l.trim()) close();
    else { close(); html += `<p>${inline(l)}</p>`; }
  }
  close(); return html;
}

/* ---------- Lectura local de documentos ---------- */
const LIBS = {
  pdf: ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'],
  pdfw: ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'],
  mammoth: ['https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js']
};
const loaded = {};
function loadScript(urls) {
  const key = urls[0]; if (loaded[key]) return loaded[key];
  loaded[key] = (async () => {
    for (const u of urls) {
      const ok = await new Promise(res => { const s = document.createElement('script'); s.src = u; s.async = true; s.referrerPolicy = 'no-referrer'; s.onload = () => res(true); s.onerror = () => { s.remove(); res(false); }; document.head.appendChild(s); });
      if (ok) return true;
    }
    delete loaded[key];
    throw new FolioError('No se pudo descargar el lector de documentos. Revisa tu conexión a internet o pega el texto manualmente.');
  })();
  return loaded[key];
}
async function extractText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md')) { const text = await file.text(); return { text, pages: Math.max(1, Math.ceil(text.length / 3000)), type: 'txt', exact: false }; }
  if (name.endsWith('.pdf')) {
    await loadScript(LIBS.pdfw); await loadScript(LIBS.pdf);
    const lib = window.pdfjsLib; if (!lib) throw new FolioError('El lector de PDF no se cargó correctamente.');
    lib.GlobalWorkerOptions.workerSrc = LIBS.pdfw[0];
    const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i); const tc = await pg.getTextContent();
      pages.push(`[Pág. ${i}]\n` + tc.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join('').trim());
    }
    const text = pages.join('\n\n');
    return { text, pages: pdf.numPages, type: 'pdf', exact: true, scanned: text.replace(/\[Pág\. \d+\]/g, '').trim().length < pdf.numPages * 40 };
  }
  if (name.endsWith('.docx')) {
    await loadScript(LIBS.mammoth);
    const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { text: r.value, pages: Math.max(1, Math.ceil(r.value.length / 3000)), type: 'docx', exact: false };
  }
  throw new FolioError('Formato no compatible. Usa PDF, Word (.docx) o texto (.txt).');
}
