/* ============================================================
   Folio MVP · núcleo
   Todo corre en el navegador. No hay servidor de Folio.
   ============================================================ */
const APP = { name: 'Folio', version: '0.7.0', policyVersion: '2026-10-18 (borrador)' };
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
const DEFAULT_SETTINGS = { provider: 'openrouter', baseUrl: '', apiKey: '', model: '', zdr: true, pseudo: true, review: true, autoLockMin: 15, theme: 'auto', lastExp: null, updateCheck: true, updateLastCheck: 0, updateKnown: null, legalPlanner: true, normasAuto: true, normasLastCheck: 0, contextoMax: 60000 };
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

/* ---------- Conversaciones y cambios de la memoria (v0.6 · F1; spec rediseno-chat-v0.6.md §7 y §10) ---------- */
const HISTORIAL_MAX = 300, PROPUESTAS_MAX = 200;
function newChat(deChat) { const t = new Date().toISOString(); return { id: uid(), titulo: '', createdAt: t, updatedAt: t, mensajes: [], ...(deChat ? { deChat } : {}) }; }
// Migra un expediente de versiones anteriores (un solo `chat`) al formato con varias conversaciones. Devuelve true si cambió algo.
function normalizeExp(e) {
  let cambio = false;
  if (!Array.isArray(e.chats)) {
    const viejo = Array.isArray(e.chat) ? e.chat : [], c = newChat();
    if (viejo.length) Object.assign(c, { titulo: 'Conversación anterior', createdAt: viejo[0].at || e.createdAt || c.createdAt, updatedAt: viejo[viejo.length - 1].at || e.updatedAt || c.updatedAt, mensajes: viejo });
    e.chats = [c]; cambio = true;
  }
  if ('chat' in e) { delete e.chat; cambio = true; }
  if (!e.chats.length) { e.chats.push(newChat()); cambio = true; }
  if (!e.chats.some(c => c.id === e.chatActivo)) { e.chatActivo = e.chats[0].id; cambio = true; }
  const m = e.memoria;
  if (!Array.isArray(m.propuestas)) { m.propuestas = []; cambio = true; }
  if (!Array.isArray(m.historial)) { m.historial = []; cambio = true; }
  if (!('ultimaVisita' in e)) { e.ultimaVisita = null; cambio = true; }
  return cambio;
}
function activeChat(e) { return e.chats.find(c => c.id === e.chatActivo) || e.chats[0]; }
// Título local con las primeras palabras de la primera pregunta: nada sale del equipo para titular
function autoTitle(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim(); if (t.length <= 60) return t;
  const cut = t.slice(0, 60), sp = cut.lastIndexOf(' ');
  return (sp > 30 ? cut.slice(0, sp) : cut) + '…';
}
// Propuestas del agente para la memoria. `seccion`: estado, resumen, hechos, estrategia, pend o plazo
function addProposals(e, items, chatId) {
  const at = new Date().toISOString(), m = e.memoria;
  const props = items.map(it => ({ id: uid(), at, chatId: chatId || null, seccion: it.k, tipo: it.k === 'plazo' ? 'plazo' : it.k === 'estado' ? 'cambia' : 'nuevo',
    antes: it.k === 'estado' ? (e.estado || '') : null, despues: it.v, ...(it.fecha ? { fecha: it.fecha } : {}), estado: 'pendiente' }));
  m.propuestas.push(...props);
  if (m.propuestas.length > PROPUESTAS_MAX) m.propuestas = m.propuestas.slice(-PROPUESTAS_MAX);
  return props;
}
// Aplica un cambio aprobado por el abogado y lo anota en el historial para poder deshacerlo.
// En hechos, resumen y estrategia el agente solo agrega texto: se guarda lo agregado, no la sección entera (el expediente no crece)
function applyMemoryChange(e, it, chatId) {
  const m = e.memoria, h = { id: uid(), at: new Date().toISOString(), seccion: it.k, chatId: chatId || null };
  if (it.k === 'estado') { h.antes = e.estado || ''; e.estado = it.v; h.despues = it.v; }
  else if (it.k === 'pend' || it.k === 'plazo') {
    const p = it.k === 'pend' ? { id: uid(), text: it.v, done: false } : { id: uid(), fecha: it.fecha, desc: it.v, done: false };
    (it.k === 'pend' ? m.pendientes : m.plazos).push(p);
    Object.assign(h, { itemId: p.id, antes: null, despues: it.k === 'pend' ? it.v : `${it.fecha} · ${it.v}` });
  } else { m[it.k] = (m[it.k] ? m[it.k].trimEnd() + '\n' : '') + it.v; Object.assign(h, { antes: null, despues: it.v }); }
  m.historial.unshift(h);
  if (m.historial.length > HISTORIAL_MAX) m.historial.length = HISTORIAL_MAX;
  return h;
}
// Deshace un cambio del historial. Si el abogado lo editó después, no pisa su texto y devuelve false
function undoMemoryChange(e, histId) {
  const m = e.memoria, h = m.historial.find(x => x.id === histId);
  if (!h || h.deshecho) return false;
  if (h.seccion === 'pend' || h.seccion === 'plazo') {
    const k = h.seccion === 'pend' ? 'pendientes' : 'plazos', n = m[k].length;
    m[k] = m[k].filter(x => x.id !== h.itemId); if (m[k].length === n) return false;
  } else if (h.seccion === 'estado') { if ((e.estado || '') !== h.despues) return false; e.estado = h.antes; }
  else { const t = m[h.seccion] || ''; if (!t.endsWith(h.despues)) return false; m[h.seccion] = t.slice(0, t.length - h.despues.length).replace(/\n$/, ''); }
  h.deshecho = true; return true;
}

// Propuestas (v0.6 · F5): aplicar una aprobada y volverla a "pendiente" (deshacer). Si el abogado editó la sección después, no se deshace
function aplicarPropuesta(e, pr) {
  const h = applyMemoryChange(e, { k: pr.seccion, v: pr.despues, fecha: pr.fecha }, pr.chatId);
  Object.assign(pr, { estado: 'aplicada', histId: h.id }); return h;
}
function revertirPropuesta(e, pr) {
  if (pr.estado === 'aplicada' && !undoMemoryChange(e, pr.histId)) return false;
  pr.estado = 'pendiente'; delete pr.histId; return true;
}

/* ---------- Encabezado de resoluciones, cédulas y carátulas (E11, spec nuevo-expediente-desde-resolucion.md) ----------
   Se lee en el equipo, con reglas, sin IA ni red (D-48). Lo dudoso se deja vacío antes que mal llenado. */
const ENC_ROLES = [   // etiqueta (sin tildes, en minúsculas) → rol de la parte
  [/^(co)?demandantes?$|^accionantes?$|^solicitantes?$|^recurrentes?$/, 'Demandante'],
  [/^(co)?demandad[oa]s?$|^emplazad[oa]s?$/, 'Demandado'],
  [/^imputad[oa]s?$|^acusad[oa]s?$|^investigad[oa]s?$|^procesad[oa]s?$|^sentenciad[oa]s?$|^denunciad[oa]s?$/, 'Imputado(a)'],
  [/^agraviad[oa]s?$|^victimas?$|^denunciantes?$/, 'Agraviado(a)'],
  [/^menor(es)?( alimentistas?)?$|^alimentistas?$|^beneficiari[oa]s?$/, 'Menor alimentista'],
  [/^terceros?( civilmente responsables?)?$|^litisconsortes?$/, 'Tercero']
];
const ENC_CAMPOS = { expediente: 'numero', 'n expediente': 'numero', 'exp': 'numero', 'nro de expediente': 'numero', materia: 'materia', delito: 'materia', 'delitos': 'materia',
  juez: 'juez', jueza: 'juez', 'juez(a)': 'juez', 'juez a': 'juez', 'magistrado': 'juez', especialista: 'especialista', 'especialista legal': 'especialista', 'especialista judicial': 'especialista',
  secretario: 'especialista', secretaria: 'especialista', 'secretario(a)': 'especialista', 'secretario judicial': 'especialista' };
const ENC_ESPECIALIDAD = { FC: 'Familia', FA: 'Familia', FT: 'Familia', FP: 'Familia', PE: 'Penal', CI: 'Civil', CO: 'Comercial', LA: 'Laboral', CA: 'Contencioso administrativo', DC: 'Constitucional' };
const ENC_NUM = /\b(\d{5}-\d{4}-\d{1,2}-\d{4}-[A-Z]{2}-[A-Z]{2}-\d{2})\b/;
const ENC_ENTIDAD = /\b(ministerio|fiscal|procurad|municipalidad|gobierno|banco|caja|empresa|s\.?\s?a\.?\s?c?\.?$|s\.?r\.?l\.?|e\.?i\.?r\.?l\.?|sociedad|asociacion|cooperativa|estado|sunat|essalud|onp|universidad|instituto|corporacion|compania|inversiones|servicios)\b/i;
const ENC_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const ENC_NUMS = { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, 'treinta y uno': 31, 'treinta y un': 31, primero: 1, un: 1 };
const ENC_ORD = { primera: 1, segunda: 2, tercera: 3, cuarta: 4, quinta: 5, sexta: 6, septima: 7, setima: 7, octava: 8, novena: 9, decima: 10 };
// "QUISPE ROJAS ROSA ELENA" o "QUISPE ROJAS, ROSA ELENA" → "Rosa Elena Quispe Rojas"; razones sociales y entidades se dejan en su orden
function encNombre(s) {
  let t = String(s || '').replace(/\s+/g, ' ').trim().replace(/^[\s:.,;-]+|[\s,;:-]+$/g, '');
  if (/^(\p{L}\.\s?){1,4}$/u.test(t)) return t.toUpperCase();   // iniciales de un menor: A. H. Q.
  t = t.replace(/(\p{L}{2,})\.$/u, '$1');
  if (!t) return '';
  const cap = x => x.toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (m, a, l) => a + l.toUpperCase())
    .replace(/\s(De|Del|Y|E)(?=\s)/g, m => m.toLowerCase()).replace(/\s(de|del) (La|Las|Los)(?=\s)/g, (m, a, b) => ` ${a} ${b.toLowerCase()}`)
    .replace(/\b(S\.?\s?A\.?\s?[AC]?\.?|S\.?R\.?L\.?|E\.?I\.?R\.?L\.?)$/i, m => m.toUpperCase());
  if (encEntidad(t) || /\d/.test(t)) return /[a-z]/.test(t) ? t : cap(t);
  if (t.includes(',')) { const [ap, no] = t.split(',', 2); t = `${no.trim()} ${ap.trim()}`; }
  else { const w = t.split(' '); if (w.length >= 3 && t === t.toUpperCase()) t = [...w.slice(2), ...w.slice(0, 2)].join(' '); }
  return t === t.toUpperCase() ? cap(t) : t;
}
const encEntidad = t => ENC_ENTIDAD.test(norm(t)) || /\bS\.?\s?A\.?\s?[AC]?\.?$/i.test(t);
const encFrase = s => { const t = String(s || '').replace(/\s+/g, ' ').trim().replace(/[.;]+$/, ''); return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t; };
const encTitulo = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, l) => a + l.toUpperCase()).replace(/\s(De|Del|La|Las|Los|Y|En)(?=\s)/g, m => m.toLowerCase()).replace(/(\d)°?\s/, '$1.° ');
function encFecha(t) {
  let m = t.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/);
  encFecha.raw = m ? m[0] : '';
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const n = norm(t);
  m = n.match(/\b(\d{1,2}|[a-z]+(?: y uno| y un)?) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre) (?:de|del)? ?(\d{4}|dos mil [a-z ]+?)(?=[\s.,;-]|$)/);
  if (!m) return '';
  const d = /^\d+$/.test(m[1]) ? +m[1] : ENC_NUMS[m[1]], mes = m[2] === 'septiembre' ? 9 : ENC_MESES.indexOf(m[2]) + 1;
  let y = /^\d+$/.test(m[3]) ? +m[3] : 2000 + (ENC_NUMS[m[3].replace(/^dos mil ?/, '').trim()] || 0);
  if (!d || !mes || y < 1990 || y > 2100) return '';
  encFecha.raw = t.slice(m.index, m.index + m[0].length);   // norm() conserva la longitud: se resalta el texto original
  return `${y}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function leerEncabezado(texto) {
  const out = { numero: '', materia: '', especialidad: '', distrito: '', organo: '', juez: '', especialista: '', partes: [], resolucion: null, detectado: [], marcas: [] };
  const lineas = String(texto || '').replace(/\r/g, '').split('\n').slice(0, 80).map(l => l.replace(/[\t ]+/g, ' ').replace(/ {2,}/g, ' ').trim());
  const vistos = new Set(), etiqueta = /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ.°º()\/ ]{1,38}?)\s*:\s*(.*)$/;
  let ultimo = null;   // para nombres que siguen en la línea de abajo
  for (const l of lineas) {
    const m = l.match(etiqueta);
    if (!m) { if (ultimo && l && l === l.toUpperCase() && !/[:]/.test(l) && l.length < 60 && /\p{L}/u.test(l) && !/^(RESOLUCI|AUTO|SENTENCIA|DECRETO|VISTOS|CEDULA|CÉDULA)/i.test(l)) { ultimo.push(l); out.marcas.push(l); } else ultimo = null; continue; }
    const k = norm(m[1]).replace(/[.°º]/g, '').replace(/\s+/g, ' ').trim(), v = m[2].trim();
    const campo = ENC_CAMPOS[k] || ENC_CAMPOS[k.replace(/^n(ro)? /, 'n ')];
    const rol = ENC_ROLES.find(([re]) => re.test(k))?.[1];
    ultimo = null;
    if ((campo || rol) && v) out.marcas.push(v);
    if (campo && !out[campo] && v) { out[campo] = v; ultimo = campo === 'juez' || campo === 'especialista' ? (out['_' + campo] = [v]) : null; continue; }
    if (rol && v) { const lista = [v]; out.partes.push({ rol, lista }); ultimo = lista; }
  }
  for (const c of ['juez', 'especialista']) if (out['_' + c]) { out[c] = encNombre(out['_' + c].join(' ')); delete out['_' + c]; }
  const num = (out.numero.match(ENC_NUM) || String(texto).slice(0, 4000).match(ENC_NUM) || [])[1] || '';
  out.numero = num;
  out.materia = encFrase(out.materia);
  // Partes: varias por rol separadas por ";" o " Y "; sin repetir
  out.partes = out.partes.flatMap(({ rol, lista }) => lista.join(' ').split(/\s*;\s*/).flatMap(n => encEntidad(n) ? [n] : n.split(/\s+Y\s+(?=[A-ZÁÉÍÓÚÑ]{2})/)).map(n => ({ nombre: encNombre(n), rol })))
    .filter(p => p.nombre && p.nombre.length > 2 && !vistos.has(norm(p.nombre)) && vistos.add(norm(p.nombre)));
  // Juzgado y corte: primeras líneas sin etiqueta
  for (const l of lineas.slice(0, 25)) {
    const c = l.match(/CORTE SUPERIOR DE JUSTICIA (?:DE(?:L)?\s+)?([A-ZÁÉÍÓÚÑ ]{3,40}?)\s*(?:[-–—]|SEDE|$)/i);
    if (c && !out.distrito) { out.distrito = encTitulo(c[1]); out.marcas.push(c[1].trim()); }
    const o = l.match(/^(?:\d+\s*[°º]?\s*)?(?:(?:PRIMER|SEGUND|TERCER|CUART|QUINT|SEXT|S[EÉ]PTIM|OCTAV|NOVEN|D[EÉ]CIM)[OA]?\s+)?(JUZGADO|SALA)\b[^:]{3,90}$/i);
    if (o && !out.organo && !/CORTE SUPERIOR/i.test(l)) { out.organo = encTitulo(l).replace(/^(\d+)\.?°?\s*/, '$1.° '); out.marcas.push(l); }
  }
  // Organo dentro de una etiqueta (cédulas: "JUZGADO : 2° JUZGADO DE FAMILIA…")
  if (!out.organo) for (const l of lineas) { const m = l.match(/^(?:JUZGADO|ÓRGANO JURISDICCIONAL|ORGANO JURISDICCIONAL|DEPENDENCIA)\s*:\s*(.{5,90})$/i); if (m) { out.organo = encTitulo(m[1]).replace(/^(\d+)\.?°?\s*/, '$1.° '); out.marcas.push(m[1]); break; } }
  if (num) out.especialidad = ENC_ESPECIALIDAD[num.split('-')[5]] || '';
  // Resolución: número (cifra o palabra) y fecha
  const cab = lineas.join('\n'), r = cab.match(/RESOLUCI[OÓ]N\s+(?:N(?:[UÚ]MERO|RO\.?|°|º|\.)?\s*)?(\d{1,3}|[A-ZÁÉÍÓÚÑ]+(?:\s+Y\s+[A-ZÁÉÍÓÚÑ]+)?)\b/i);
  if (r) {
    const w = norm(r[1]), n = /^\d+$/.test(w) ? +w : ENC_NUMS[w] || ENC_ORD[w] || null;
    const ix = cab.indexOf(r[0]), fecha = encFecha(cab.slice(ix, ix + 400)) || encFecha(cab);
    if (n) { out.resolucion = { acto: `Resolución ${n}`, fecha }; out.marcas.push(r[0]); if (encFecha.raw) out.marcas.push(encFecha.raw); }
  }
  out.detectado = ['numero', 'materia', 'especialidad', 'distrito', 'organo', 'juez', 'especialista'].filter(k => out[k]);
  return out;
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
  if (e.juez) L.push(`Juez: ${e.juez}`);
  if (e.especialista) L.push(`Especialista: ${e.especialista}`);
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
// o.memoria / o.docs: lo que el abogado deja leer al agente (chips de la caja, v0.6 · F3).
// o.citados: documentos y movimientos citados con @ (van aunque los documentos estén desactivados: el abogado los pidió).
function buildContext(e, docTexts, q, o = {}) {
  const { memoria = true, docs = true, citados = { docs: [], movs: [] }, previo = null } = o;
  const frags = [], seen = new Set(), add = f => { const k = f.name + '|' + f.text.slice(0, 80); if (!seen.has(k)) { seen.add(k); frags.push(f); } };
  if (citados.docs.length) retrieve({ ...e, docs: e.docs.filter(d => citados.docs.includes(d.id)) }, docTexts, q, 2 * citados.docs.length).forEach(add);
  if (docs) retrieve(e, docTexts, q, 4).forEach(add);
  let t = `FECHA DE HOY: ${todayISO()}\n\n=== MEMORIA DEL EXPEDIENTE ===\n${memoria ? memoryText(e) : '(En esta consulta el abogado no compartió la memoria del expediente.)'}`;
  // Conversación que continúa otra (v0.6 · F4): el resumen guardado reemplaza a los mensajes anteriores
  if (previo?.resumen) t += `\n\n=== RESUMEN DE LA CONVERSACIÓN ANTERIOR («${previo.titulo || 'Conversación anterior'}») ===\n${previo.resumen}`;
  const movs = e.movimientos.filter(v => citados.movs.includes(v.id));
  if (movs.length) t += `\n\n=== MOVIMIENTOS CITADOS POR EL ABOGADO ===\n` + movs.map(v => `- ${v.fecha || 's/f'}: ${v.acto}${v.sumilla ? '. ' + v.sumilla : ''}`).join('\n');
  if (frags.length) t += `\n\n=== FRAGMENTOS DE DOCUMENTOS (texto extraído en el equipo del abogado) ===\n` + frags.slice(0, 6).map(f => `--- ${f.name} ---\n${f.text}`).join('\n\n');
  return { text: t, frags: frags.slice(0, 6) };
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
