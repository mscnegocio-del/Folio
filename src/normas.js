'use strict';
/* ============================================================
   Folio · biblioteca legal peruana (épica E8)
   Spec: process/specs/biblioteca-legal-peru.md
   - Paquete estático publicado en GitHub Pages del repo (docs/normas/), armado con normas/build_normas.py.
   - Se guarda en una base IndexedDB aparte, SIN cifrar: son textos públicos (D. Leg. 822, art. 9 b)
     y no contienen datos del abogado. La búsqueda es local; ninguna consulta sale hacia el paquete.
   ============================================================ */
const NORMAS_STALE_WARN = 14, NORMAS_STALE_ALERT = 30;   // días sin actualizar
const NORMAS_MAX_ARTS = 8, NORMAS_MAX_CHARS = 14000;    // tope del bloque que se envía al modelo

function normasBase() {
  const m = /github\.com\/([^/]+)\/([^/#?]+)/.exec(OWNER.repo || '');
  return m ? `https://${m[1].toLowerCase()}.github.io/${m[2].replace(/\.git$/, '')}/normas/` : null;
}

const NDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve();
    return new Promise((res, rej) => {
      let r; try { r = indexedDB.open('folio-normas', 1); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  st(mode) { return this.db.transaction('kv', mode).objectStore('kv'); },
  rq(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async get(k) { await this.open(); return this.rq(this.st('readonly').get(k)); },
  async put(k, v) { await this.open(); return this.rq(this.st('readwrite').put(v, k)); },
  async clear() { await this.open(); return this.rq(this.st('readwrite').clear()); }
};

/* ---------- Texto: normalización y raíces simples ---------- */
const NSTOP = new Set('para como pero sobre entre cuando tambien donde quien desde todo durante todos contra otros ante ellos esto antes algunos unos otro otras otra tanto estos mucho quienes nada muchos cual poco ella estar estas algunas algo este esta estan esos esas eso sera seria puede pueden debe deben hacer tiene tienen articulo articulos codigo segun caso favor dime quiero necesito cual cuales tengo hacer sobre aplica aplicable norma normas ley leyes'.split(' '));
function nstem(w) { return w.length > 6 ? w.slice(0, 6) : w.replace(/(es|s)$/, ''); }
function ntokens(s) { return norm(s).split(/[^a-z0-9ñ]+/).filter(w => w.length > 2 && !NSTOP.has(w)).map(nstem); }
function artKey(n) { return String(n).toUpperCase().replace(/\s+/g, '').replace(/[°º]/g, '').replace(/^0+(?=\d)/, ''); }

/* ---------- Biblioteca en memoria ---------- */
const Lib = {
  manifest: null, normas: {}, index: null, loaded: false,
  async load() {
    if (this.loaded) return this;
    try {
      this.manifest = await NDB.get('manifest') || null;
      this.normas = {};
      for (const n of this.manifest?.normas || []) {
        const d = await NDB.get('norma:' + n.id); if (!d) continue;
        d.byN = new Map(d.articulos.map(a => [artKey(a.n), a]));
        this.normas[n.id] = d;
      }
    } catch { this.manifest = null; this.normas = {}; }
    this.index = null; this.loaded = true;
    return this;
  },
  reset() { this.manifest = null; this.normas = {}; this.index = null; this.loaded = false; },
  installed() { return !!this.manifest && Object.keys(this.normas).length > 0; },
  ageDays() { return this.manifest?.actualizadoAl ? -daysUntil(this.manifest.actualizadoAl) : null; },
  meta(id) { return (this.manifest?.normas || []).find(n => n.id === id) || null; },
  article(id, n) { return this.normas[id]?.byN.get(artKey(n)) || null; },
  /* Índice BM25 de todos los artículos (se arma la primera vez que se busca). */
  buildIndex() {
    const docs = [], post = new Map(); let total = 0;
    for (const [id, d] of Object.entries(this.normas)) {
      for (const a of d.articulos) {
        if (a.derogado) continue;
        const toks = ntokens(`${a.titulo || ''} ${a.titulo || ''} ${a.texto}`);
        const tf = new Map(); toks.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
        const di = docs.length; docs.push({ id, n: a.n, len: toks.length }); total += toks.length;
        for (const [t, f] of tf) { if (!post.has(t)) post.set(t, []); post.get(t).push([di, f]); }
      }
    }
    this.index = { docs, post, avg: total / Math.max(1, docs.length) };
  },
  search(q, { k = 6, prefer = [] } = {}) {
    if (!this.installed()) return [];
    if (!this.index) this.buildIndex();
    const { docs, post, avg } = this.index, N = docs.length, K1 = 1.2, B = 0.75;
    const scores = new Map();
    for (const t of new Set(ntokens(q))) {
      const p = post.get(t); if (!p) continue;
      const idf = Math.log(1 + (N - p.length + 0.5) / (p.length + 0.5));
      for (const [di, f] of p) scores.set(di, (scores.get(di) || 0) + idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * docs[di].len / avg)));
    }
    return [...scores].map(([di, s]) => ({ ...docs[di], score: s * (prefer.includes(docs[di].id) ? 1.4 : 1) }))
      .sort((a, b) => b.score - a.score).slice(0, k).filter(r => r.score > 1);
  }
};

/* ---------- Descarga y actualización del paquete ---------- */
async function sha256Hex(buf) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function gunzipJSON(buf) {
  if (typeof DecompressionStream === 'undefined') throw new FolioError('Tu navegador no puede abrir la biblioteca legal. Actualízalo a una versión reciente.');
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
async function fetchNormas(path) {
  const base = normasBase(); if (!base) throw new FolioError('Folio no tiene configurada la dirección de la biblioteca legal.');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 60000);
  try {
    const r = await fetch(base + path, { credentials: 'omit', cache: 'no-store', signal: ctl.signal });
    if (r.status === 404) throw new FolioError('La biblioteca legal todavía no está publicada. Inténtalo más adelante.');
    if (!r.ok) throw new FolioError(`No se pudo descargar la biblioteca legal (error ${r.status}).`);
    return r;
  } catch (e) {
    if (e instanceof FolioError) throw e;
    throw new FolioError('No se pudo conectar para descargar la biblioteca legal. Revisa tu conexión; si estás en una red institucional, puede estar bloqueada.');
  } finally { clearTimeout(t); }
}
/* Descarga solo las normas cuyo sha256 cambió. Devuelve un resumen de cambios por artículo. */
async function updateNormas(onProgress) {
  const man = await (await fetchNormas('manifest.json')).json();
  if (man.formato !== 'folio-normas' || !Array.isArray(man.normas)) throw new FolioError('El paquete de normas descargado no es válido.');
  const old = await NDB.get('manifest');
  const oldSha = Object.fromEntries((old?.normas || []).map(n => [n.id, n.sha256]));
  const changes = []; let i = 0;
  for (const n of man.normas) {
    i++; if (oldSha[n.id] === n.sha256 && await NDB.get('norma:' + n.id)) continue;
    onProgress?.(`Descargando ${n.titulo} (${i} de ${man.normas.length})…`);
    const buf = await (await fetchNormas(n.archivo)).arrayBuffer();
    if (await sha256Hex(buf) !== n.sha256) throw new FolioError(`El archivo de ${n.titulo} no pasó la verificación de integridad. No se instaló.`);
    const data = await gunzipJSON(buf);
    const prev = await NDB.get('norma:' + n.id);
    if (prev) {
      const pm = new Map(prev.articulos.map(a => [artKey(a.n), a]));
      for (const a of data.articulos) {
        const p = pm.get(artKey(a.n));
        if (!p) changes.push({ norma: n.id, n: a.n, tipo: 'nuevo' });
        else if (a.derogado && !p.derogado) changes.push({ norma: n.id, n: a.n, tipo: 'derogado' });
        else if (p.texto !== a.texto || JSON.stringify(p.proximo || null) !== JSON.stringify(a.proximo || null)) changes.push({ norma: n.id, n: a.n, tipo: 'modificado' });
      }
    }
    await NDB.put('norma:' + n.id, data);
  }
  await NDB.put('manifest', man);
  if (changes.length) {
    const log = await NDB.get('changes') || [];
    const at = new Date().toISOString();
    await NDB.put('changes', [...changes.map(c => ({ ...c, at, corte: man.actualizadoAl })), ...log].slice(0, 200));
  }
  Lib.reset(); await Lib.load();
  return { firstInstall: !old, changes, manifest: man };
}
async function removeNormas() { await NDB.clear(); Lib.reset(); await Lib.load(); }

/* ---------- Citas: reconocer "artículo 122-B del Código Penal" ---------- */
function citeText(s) {
  return norm(s).replace(/\bn\s*(?:ro|um)?\s*[.°º]\s*/g, ' ').replace(/[“”«»]/g, '"').replace(/\s+/g, ' ');
}
function aliasRe() {
  const list = [];
  for (const n of Lib.manifest?.normas || []) for (const a of [n.titulo, n.corto, ...(n.alias || [])]) if (a) list.push([citeText(a).trim(), n.id]);
  list.sort((a, b) => b[0].length - a[0].length);
  return { list, re: list.length ? new RegExp(list.map(([a]) => escRe(a).replace(/ /g, '\\s+')).join('|'), 'g') : null };
}
function idForAlias(list, s) { const t = s.replace(/\s+/g, ' '); return (list.find(([a]) => a === t) || [])[1] || null; }
const ART_LIST = '((?:\\d+(?:\\s*-\\s*[a-z])?(?:\\s*[°º])?(?:\\s*(?:,|y|e|o)\\s*)?)+)';
function findCitations(text) {
  const t = citeText(text); const out = []; const seen = new Set();
  const add = (id, n, raw) => { const key = id + ':' + (n ? artKey(n) : ''); if (!seen.has(key)) { seen.add(key); out.push({ norma: id, n: n ? artKey(n) : null, raw }); } };
  const { list, re } = aliasRe();
  if (re) {
    const a = new RegExp(`\\bart(?:iculo|\\.)?s?\\s*${ART_LIST}\\s*(?:,?\\s*(?:inciso|numeral|literal|parrafo)s?\\s*[\\w.]+\\s*,?\\s*)?(?:del|de la|de)\\s+(?:la\\s+|el\\s+)?(?:texto unico ordenado de la\\s+|tuo de la\\s+)?(${re.source})`, 'g');
    for (const m of t.matchAll(a)) { const id = idForAlias(list, m[2]); if (id) for (const n of m[1].match(/\d+(?:\s*-\s*[a-z])?/g) || []) add(id, n.replace(/\s+/g, ''), m[0]); }
    const b = new RegExp(`(${re.source})\\s*,?\\s*(?:en\\s+su\\s+)?art(?:iculo|\\.)?s?\\s*${ART_LIST}`, 'g');
    for (const m of t.matchAll(b)) { const id = idForAlias(list, m[1]); if (id) for (const n of m[2].match(/\d+(?:\s*-\s*[a-z])?/g) || []) add(id, n.replace(/\s+/g, ''), m[0]); }
  }
  // Leyes y decretos peruanos que no están en la biblioteca
  for (const m of t.matchAll(/\b(ley|decreto legislativo|decreto supremo|decreto de urgencia)\s+(\d{3,5}(?:-\d{4}-[a-z]+)?)\b/g)) {
    const raw = `${m[1]} ${m[2]}`;
    if (!list.some(([a]) => a.includes(m[2]))) add('fuera:' + raw, null, raw);
  }
  return out;
}
const FOREIGN = [/codigo civil (?:espanol|de espana|argentino|chileno|mexicano|colombiano|frances|aleman|italiano|federal)/, /codigo penal (?:espanol|de espana|argentino|chileno|mexicano|colombiano|federal)/,
  /codigo civil y comercial de la nacion/, /ley de enjuiciamiento (?:civil|criminal)/, /codigo nacional de procedimientos penales/, /\bboletin oficial del estado\b|\bboe\b/, /\bu\.?\s?s\.?\s?c\.?\b|\bunited states code\b/, /\bbgb\b|\bcode civil\b/];
// norm() conserva la longitud de un texto en NFC, así que el índice sirve para mostrar el texto original con tildes.
function findForeign(text) {
  const src = String(text).normalize('NFC'), t = norm(src);
  return FOREIGN.map(re => { const m = re.exec(t); return m ? src.substr(m.index, m[0].length) : null; }).filter(Boolean);
}
function quotesIn(text) { return [...String(text).matchAll(/["“«]([^"”»]{40,600})["”»]/g)].map(m => m[1]); }
function overlap(a, b) { const A = ntokens(a), Bs = new Set(ntokens(b)); return A.length ? A.filter(x => Bs.has(x)).length / A.length : 0; }

/* Verificador local de citas sobre una respuesta del agente. */
function checkCitations(answer) {
  if (!Lib.installed()) return null;
  const items = [];
  const quotes = quotesIn(answer);
  for (const c of findCitations(answer)) {
    if (c.norma.startsWith('fuera:')) { items.push({ estado: 'fuera', label: c.norma.slice(6).replace(/^\w/, x => x.toUpperCase()) }); continue; }
    const meta = Lib.meta(c.norma); const corto = meta?.corto || c.norma;
    if (!c.n) continue;
    const a = Lib.article(c.norma, c.n);
    if (!a && meta?.parcial) { items.push({ estado: 'fuera', label: `Art. ${c.n} ${corto} (${meta.parcial})` }); continue; }
    if (!a) { items.push({ estado: 'noEncontrado', norma: c.norma, n: c.n, label: `Art. ${c.n} ${corto}` }); continue; }
    let estado = a.derogado ? 'derogado' : a.proximo ? 'porRegir' : 'vigente';
    if (estado === 'vigente' && quotes.length) {
      const best = Math.max(...quotes.map(q => norm(a.texto).replace(/\s+/g, ' ').includes(norm(q).replace(/\s+/g, ' ')) ? 1 : overlap(q, a.texto)));
      if (best > 0.35 && best < 0.97) estado = 'textoDistinto';
    }
    const last = (a.historial || []).slice(-1)[0];
    items.push({ estado, norma: c.norma, n: a.n, label: `Art. ${a.n} ${corto}`, modificado: last?.vigenteDesde || last?.publicada || '' });
  }
  for (const f of findForeign(answer)) items.push({ estado: 'extranjera', label: f.replace(/^\w/, x => x.toUpperCase()) });
  return { items, corte: Lib.manifest.actualizadoAl, age: Lib.ageDays() };
}

/* ---------- Contexto para el modelo ---------- */
const MATERIA_NORMAS = { Civil: ['CC', 'CPC'], Familia: ['CC', 'CPC', 'CNA', 'L30364'], Penal: ['CP', 'NCPP', 'L30364'], Laboral: ['NLPT', 'CPC'], 'Contencioso administrativo': ['LPAG', 'CPC'], Constitucional: ['CONST', 'NCPCO'], Comercial: ['CC', 'CPC'] };
function preferredNormas(e) { return MATERIA_NORMAS[e?.especialidad] || []; }
function normasCatalogText() { return (Lib.manifest?.normas || []).map(n => `${n.id}: ${n.titulo}`).join('\n'); }
/* Junta los artículos: citas explícitas (pregunta y memoria) + plan del modelo + búsqueda por palabras. */
function gatherArticles(e, question, plan) {
  if (!Lib.installed()) return [];
  const want = [], seen = new Set();
  const push = (id, n, why) => { const a = Lib.article(id, n); const k = id + ':' + artKey(n); if (a && !seen.has(k)) { seen.add(k); want.push({ id, a, why }); } };
  for (const c of findCitations(question)) if (c.n && !c.norma.startsWith('fuera:')) push(c.norma, c.n, 'citado');
  for (const c of plan?.citas || []) if (c && c.norma && c.articulo) push(String(c.norma).toUpperCase(), String(c.articulo), 'plan');
  const memo = [e?.memoria?.estrategia, e?.memoria?.hechos].filter(Boolean).join('\n');
  for (const c of findCitations(memo)) if (c.n && !c.norma.startsWith('fuera:')) push(c.norma, c.n, 'memoria');
  const q = [question, ...(plan?.terminos || [])].join(' ');
  for (const r of Lib.search(q, { k: 6, prefer: preferredNormas(e) })) push(r.id, r.n, 'busqueda');
  const out = []; let chars = 0;
  for (const w of want) { const len = w.a.texto.length + 200; if (out.length >= NORMAS_MAX_ARTS || chars + len > NORMAS_MAX_CHARS) continue; out.push(w); chars += len; }
  return out;
}
function normasBlock(arts) {
  if (!Lib.installed()) return '';
  const corte = fmtDate(Lib.manifest.actualizadoAl);
  const parciales = (Lib.manifest.normas || []).filter(n => n.parcial && Lib.normas[n.id]).map(n => `${n.titulo}: ${n.parcial}`);
  const head = `\n\n=== NORMAS PERUANAS (biblioteca legal de Folio, textos al ${corte}) ===\nTextos oficiales de normas peruanas (SPIJ / diario oficial El Peruano). Para citar artículos usa solo estos textos.${parciales.length ? `\nNormas incompletas en la biblioteca (lo que falte, dilo y sugiere verificarlo en el SPIJ): ${parciales.join('; ')}.` : ''}`;
  if (!arts.length) return head + '\n(No se encontraron artículos para esta consulta en la biblioteca. Si necesitas una norma, dilo y sugiere verificarla en el SPIJ.)';
  return head + '\n' + arts.map(({ id, a }) => {
    const m = Lib.meta(id); const last = (a.historial || []).slice(-1)[0];
    const lines = [`--- ${m?.titulo || id}, artículo ${a.n}${a.titulo ? ' (' + a.titulo + ')' : ''}${a.ubicacion ? ' · ' + a.ubicacion : ''} ---`];
    lines.push(a.derogado ? 'ESTADO: DEROGADO.' : `Vigente${a.vigenteDesde ? ' desde ' + a.vigenteDesde : ''}.${last ? ` Última modificación: ${last.norma}${last.publicada ? ', publicada el ' + last.publicada : ''}.` : ''}`);
    lines.push(a.texto);
    if (a.proximo) lines.push(`CAMBIO QUE AÚN NO RIGE (regirá desde ${a.proximo.vigenteDesde}, ${a.proximo.norma}):\n${a.proximo.texto}`);
    return lines.join('\n');
  }).join('\n\n');
}
const LEGAL_RULES = `
Reglas sobre normas (tienes una biblioteca legal peruana en el bloque NORMAS PERUANAS):
7. Para citar artículos usa solo los textos de ese bloque y cítalos así: "artículo 122-B del Código Penal". No completes artículos de memoria.
8. Si la norma que necesitas no está en el bloque, dilo y sugiere verificarla en el SPIJ.
9. Responde con legislación peruana. No cites leyes de otros países salvo que el abogado lo pida, y en ese caso indícalo expresamente.
10. Si un artículo tiene un cambio que aún no rige, menciona ambos textos y desde cuándo rige el nuevo.
11. Cuando tu respuesta dependa de una norma, menciona la fecha de los textos de la biblioteca.`;
const PLANNER_PROMPT = `Eres el buscador de normas de Folio, un asistente para abogados en el Perú. No respondes la consulta: solo indicas qué normas peruanas habría que leer para responderla.
Devuelve SOLO un objeto JSON, sin texto adicional, con esta forma:
{"citas":[{"norma":"ID","articulo":"122-B"}],"terminos":["palabra o frase"]}
- "citas": hasta 6 artículos concretos, usando solo los ID de la lista de normas disponibles. Si no estás seguro del número, no lo pongas.
- "terminos": hasta 6 términos jurídicos para buscar en el texto de las normas.
Normas disponibles:
`;
