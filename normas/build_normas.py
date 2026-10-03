"""Arma el paquete de la biblioteca legal de Folio (épica E8).

Uso (mantenedor):
    python normas/build_normas.py                 # normas/catalogo.json + normas/fuentes/ -> docs/normas/
    python normas/build_normas.py --strict        # falla si hay artículos duplicados o vacíos

Entrada por norma (ver normas/README.md):
    normas/fuentes/<ID>.txt o <ID>.docx   texto descargado del SPIJ ("Descargar Word") o de El Peruano
    normas/ajustes/<ID>.json              opcional: correcciones manuales y cambios que aún no rigen

Salida:
    docs/normas/<ID>.json.gz + docs/normas/manifest.json (con sha256 de cada archivo)

Solo se publica el texto de las normas y datos de hecho sobre sus modificaciones (D. Leg. 822, art. 9 b y d).
Nunca se copian concordancias, sumillas ni notas propias del SPIJ.
"""
import argparse, datetime as dt, gzip, hashlib, io, json, re, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
MESES = {m: i + 1 for i, m in enumerate("enero febrero marzo abril mayo junio julio agosto setiembre octubre noviembre diciembre".split())}
MESES["septiembre"] = 9

NUM = r"(\d+(?:\s*[-–]?\s*[A-ZÑ](?![A-Za-záéíóúñÑ]))?|[IVXL]+(?![A-Za-z]))"
ART = re.compile(r'^\s*(["“])?\s*(?i:art[íi]culo)\s+' + NUM + r'\s*[°º]?\s*(?:\.\s*-?|-|–|—|:)\s*(.*)$')          # Artículo 106.- Texto
ART3 = re.compile(r'^\s*(["“])?\s*(?i:art[íi]culo)\s+' + NUM + r'\s+([A-ZÁÉÍÓÚÑ][^.]{2,160}?)\s*\.\s*["”]?\s*(\(\*+\))*\s*$')   # Artículo 139 Título del artículo.
ART4 = re.compile(r'^\s*(?i:art[íi]culo)\s+(\d+(?:-[A-ZÑ])?)\s+([A-ZÁÉÍÓÚÑ][^.]{2,120})\.\s+([A-ZÁÉÍÓÚÑ].+)$')
ART2 = re.compile(r'^\s*(["“])?\s*(?i:art[íi]culo)\s+' + NUM + r'\s+([A-ZÁÉÍÓÚÑ].{1,200}?)\s*\.\s*-\s*(.*)$')           # Artículo 1 Acción penal.- Texto


def match_art(line: str):
    """Devuelve (entrecomillado, número, título, cuerpo) o None. Ignora referencias sueltas como 'Artículo 69 inciso 2'."""
    m = ART.match(line)
    if m:
        q, n, rest = m.group(1), m.group(2), m.group(3).strip()
        tit = ""
        mm = re.match(r"^([^.]{2,140}?)\s*\.\s*-\s*(.*)$", rest)      # "Feminicidio.- El que…"
        if mm and not re.search(r"\d", mm.group(1)): tit, rest = mm.group(1), mm.group(2)
    else:
        m = ART2.match(line)
        if m:
            q, n, tit, rest = m.group(1), m.group(2), m.group(3).strip(), m.group(4).strip()
        else:
            m = ART3.match(line)
            if not m: return None
            q, n, tit, rest = m.group(1), m.group(2), m.group(3).strip(), (m.group(4) or "").strip()
    n = re.sub(r"\s*[-–]?\s*([A-ZÑ])$", r"-\1", re.sub(r"\s+", " ", n.strip()).upper()) if re.match(r"\d", n) else n.upper()
    return bool(q), n, unquote(tit), rest.strip()
SKIPHDR = re.compile(r"^\s*(?:[A-Z]\s)?(NOTA SPIJ|CONCORDANCIAS?|JURISPRUDENCIA|PROCESOS CONSTITUCIONALES|DOCTRINA|NOTA DE ACLARACI|FE DE ERRATAS)", re.I)
DISPHDR = re.compile(r"^(?:[ÚU]NICA\s+)?DISPOSICI[OÓ]N(?:ES)?\s+[A-ZÁÉÍÓÚ ,Y]{4,80}$")
ORD = re.compile(r"^((?:D[ÉE]CIM[OA]\s*)?(?:PRIMER[OA]?|SEGUND[OA]|TERCER[OA]?|CUART[OA]|QUINT[OA]|SEXT[OA]|S[ÉE]PTIM[OA]|S[ÉE]TIM[OA]|OCTAV[OA]|NOVEN[OA])|D[ÉE]CIM[OA]|UND[ÉE]CIM[OA]|DUOD[ÉE]CIM[OA]|VIG[ÉE]SIM[OA](?:\s+[A-ZÁÉÍÓÚ]+)?|[ÚU]NIC[OA])\s*(?:\.\s*-?|-|–|:)\s*(.*)$", re.I)
WORDJUNK = re.compile(r"^(Normal|false|true|X-NONE|ES-PE|EN-US)$")
ENDTXT = re.compile(r"^(POR TANTO|Mando se publique|Dado en la Casa de Gobierno|Comun[íi]quese al se[ñn]or Presidente|En Lima, a los)", re.I)


def disp_abbr(head: str) -> str:
    """'DISPOSICIONES FINALES Y TRANSITORIAS' -> 'DFT'; 'DISPOSICIONES COMPLEMENTARIAS FINALES' -> 'DCF'."""
    w = [x for x in re.sub(r"[^A-ZÁÉÍÓÚ ]", " ", head.upper()).split() if x not in ("Y", "DE", "LA", "LAS", "UNICA", "ÚNICA")]
    return "".join(x[0] for x in w).replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O").replace("Ú", "U")


LABEL = re.compile(r"^\s*(?:[A-Z]\s)?(JURISPRUDENCIA(?:\s+[A-ZÁÉÍÓÚ ]+)?|PROCESOS CONSTITUCIONALES|DOCTRINA|NOTA DE ACLARACI[ÓO]N.*)\s*$")
CONCREF = re.compile(r"^(Leyes?\b|Ley N|D\.?\s?S\.?\b|D\.?\s?Leg|D\.?\s?L\.?\b|D\.?\s?U\.?\b|R\.\s?\w|Res\.|Resoluci[óo]n|Arts?\.|Directiva|Acuerdo|Casaci[óo]n|Exp\.|Decreto|Reglamento|C[óo]digo|C\.\s?[A-Z]|Constituci[óo]n|Convenci[óo]n|STC|Pleno|Sentencia|Oficio|Protocolo|Lineamientos?|Texto [ÚU]nico|TUO|Ordenanza|Circular|Pacto|Declaraci[óo]n|Estatuto|Opini[óo]n)", re.I)
HEAD_TC = re.compile(r"^(Libro|Secci[óo]n|T[íi]tulo|Subt[íi]tulo|Cap[íi]tulo|Subcap[íi]tulo)\s+([IVXLC]+|\d+|[ÚU]nico|Preliminar|Primer[oa]?|Segund[oa]|Tercer[oa]?|Cuart[oa]|Quint[oa]|Sext[oa]|S[ée]ptim[oa]|S[ée]tim[oa]|Octav[oa]|Noven[oa]|D[ée]cim[oa])\.?$")
NOTE_NUM = re.compile(r"^\s*\((\d{1,2})\)\s*(Art[íi]culo|P[áa]rrafo|Inciso|Numeral|Literal|Texto|De conformidad|Confrontar|Disposici[óo]n|Ep[íi]grafe|Extremo|Sumilla|Cap[íi]tulo|Subcap[íi]tulo|T[íi]tulo|Secci[óo]n|Vigencia|Denominaci[óo]n|Rectificad|Derogad|Modificad|Incorporad|Sustituid)", re.I)


def is_num_note(l: str) -> bool:
    return bool(NOTE_NUM.match(l) or (re.match(r"^\s*\(\d{1,2}\)\s*[A-ZÁÉÍÓÚ]", l) and re.search(r"publicad[oa]|Ley N|Decreto (Legislativo|Supremo|de Urgencia|Ley)|Resoluci[óo]n", l)))


def normalize_numbered_notes(lines):
    """Estilo antiguo del SPIJ: notas '(1) Artículo modificado…' y marcas '…años.(1)'. Se convierten al estilo (*).
    Un '(n)' al final de una línea solo es marca si en las 6 líneas siguientes hay una nota que empieza con '(n)'
    (así no se confunde con 'cuatro (4) años')."""
    out = list(lines)
    for i, l in enumerate(out):
        if is_num_note(l):
            out[i] = re.sub(r"^\s*\(\d{1,2}\)", "(*)", l, count=1)
            continue
        m = re.search(r'((?:\s?\(\d{1,2}\))+)\s*["”»]?\s*\.?\s*$', l)
        if not m: continue
        nums = re.findall(r"\((\d{1,2})\)", m.group(1))
        ahead = [x for x in lines[i + 1:i + 7]]
        if nums and all(any(re.match(rf"^\s*\({n}\)\s", x) and is_num_note(x) for x in ahead) for n in nums):
            out[i] = l[:m.start(1)] + "(*)" * len(nums) + l[m.end(1):]
    return out


FULLMOD = re.compile(r"^\s*\(\*+\)\s*Art[íi]culo\s+(modificad|sustituid|incorporad)", re.I)
HEAD = re.compile(r"^\s*(LIBRO|SECCI[ÓO]N|T[ÍI]TULO|SUBT[ÍI]TULO|CAP[ÍI]TULO|SUBCAP[ÍI]TULO)\b(.*)$")
NOTE = re.compile(r"^\s*\(\*+\)")
CONCORD = re.compile(r"^\s*(CONCORDANCIAS?|JURISPRUDENCIA|PROCESOS CONSTITUCIONALES)\s*:?\s*$", re.I)
MOD = re.compile(r"(modificad[oa]|incorporad[oa]|sustituid[oa]|derogad[oa]|rectificad[oa])\s+por\s+.{0,120}?((?:Ley|Decreto Legislativo|Decreto de Urgencia|Decreto Supremo|Resoluci[óo]n)\s[^,;]{0,60}?N[°º.]*\s*[\w-]+)", re.I)
FECHA = re.compile(r"publicad[oa]\s+el\s+(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s+(?:de\s+)?(\d{4})|publicad[oa]\s+el\s+(\d{1,2})/(\d{1,2})/(\d{4})", re.I)


def read_source(path: Path) -> str:
    if path.suffix.lower() == ".docx":
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        root = ET.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
        out = []
        for p in root.iter(f"{{{ns['w']}}}p"):
            parts = []
            for el in p.iter():
                tag = el.tag.split("}")[-1]
                if tag == "t" and el.text: parts.append(el.text)
                elif tag == "tab": parts.append("\t")
                elif tag in ("br", "cr"): parts.append("\n")
            out.append("".join(parts))
        return "\n".join(out)
    raw = path.read_bytes()
    if raw.lstrip()[:5].lower() in (b"<html", b"<!doc"):   # el SPIJ exporta HTML con extensión .doc
        import html as H
        t = raw.decode("utf-8", errors="replace")
        t = re.sub(r"(?is)<(script|style|head)\b.*?</\1>", "", t)
        t = re.sub(r"(?i)<br\s*/?>|</(p|div|li|tr|h\d)>", "\n", t)
        t = re.sub(r"<[^>]+>", "", t)
        return "\n".join(re.sub(r"[ \t\u00a0]+", " ", H.unescape(l)).strip() for l in t.splitlines())
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try: return raw.decode(enc)
        except UnicodeDecodeError: continue
    raise SystemExit(f"No se pudo leer {path}")


def iso(d, m, y):
    try: return dt.date(int(y), int(m), int(d)).isoformat()
    except ValueError: return ""


def parse_note(line: str):
    """Extrae solo hechos de una nota: qué norma modificó o derogó y cuándo se publicó."""
    m = MOD.search(line)
    if not m: return None
    f = FECHA.search(line); pub = ""
    if f:
        pub = iso(f.group(1), MESES.get(f.group(2).lower().replace("í", "i"), 0), f.group(3)) if f.group(1) else iso(f.group(4), f.group(5), f.group(6))
    vig = (dt.date.fromisoformat(pub) + dt.timedelta(days=1)).isoformat() if pub else ""  # Constitución, art. 109
    norma = re.sub(r"\s+", " ", m.group(2)).replace("N°", "N.°").replace("Nº", "N.°")
    return {"tipo": m.group(1).lower()[:-1], "norma": norma, "publicada": pub, "vigenteDesde": vig}


ROMANO = re.compile(r"^[IVXLCDM]+$", re.I)
ORDINAL = {"PRIMERO", "SEGUNDO", "TERCERO", "CUARTO", "QUINTO", "SEXTO", "SÉTIMO", "SEPTIMO", "OCTAVO", "NOVENO", "DÉCIMO", "DECIMO", "PRELIMINAR", "ÚNICO", "UNICO"}


def head_fmt(line: str) -> str:
    """'LIBRO III' -> 'Libro III'; 'DERECHO DE FAMILIA' -> 'Derecho de familia' (sentence case, romanos intactos)."""
    out = []
    for i, w in enumerate(line.split()):
        if ROMANO.match(w) and i > 0: out.append(w.upper())
        elif i == 0 or (w.upper() in ORDINAL and i == 1): out.append(w.capitalize())
        else: out.append(w.lower())
    return " ".join(out)


def unquote(line: str) -> str:
    line = re.sub(r"\(\*+\)|RECTIFICADO POR FE DE ERRATAS", "", line).strip()
    return line.strip('"“”').strip()


MARK = "(*)"   # el SPIJ pone (*) al final de la línea que una nota posterior modifica o deroga


def keep_mark(line: str) -> str:
    """Quita comillas y la fe de erratas, pero conserva la marca (*) para saber dónde aplicar la siguiente nota."""
    line = re.sub(r"\s*\(\*+\)\s*RECTIFICADO POR FE DE ERRATAS", "", line)
    line = re.sub(r"(?<=\S)\s*NOTA SPIJ\b\s*", " ", line).replace(" ,", ",")   # "contracautela NOTA SPIJ, cuando…"
    marks = len(re.findall(r"\(\*+\)", line))
    line = re.sub(r"\(\*+\)", "", line).strip()
    line = re.sub(r'^["“”]+\s*', "", line)
    line = re.sub(r'\s*["“”]+\s*(\.?)\s*$', r"\1", line).strip()
    return (line + (" " + MARK) * marks) if marks and line else line


def announces(note: str) -> bool:
    """La nota anuncia un texto nuevo a continuación (termina en ':' o en 'de la siguiente manera', etc.)."""
    t = re.sub(r"(\(\*+\)|NOTA SPIJ)", "", note).strip()
    return t.endswith(":") or bool(re.search(r"(siguientes?\s+(manera|t[ée]rminos|texto)|como sigue|el siguiente|lo siguiente)\s*:?\s*\.?$", t, re.I))


def unmark(line: str) -> str:
    """Una nota consume una sola marca de la línea."""
    return line.replace(" " + MARK, "", 1)


def plain(line: str) -> str:
    return line.replace(MARK, "").strip()


ITEM = re.compile(r"^((?:\d+(?:\.\d+)*)|[a-zñ]|[IVX]+)\s*(?:[.)]|\.-|\s-)\s*")
IDENT_NOTE = re.compile(r"(?:inciso|numeral|literal|apartado|sub ?numeral)\s+(\d+(?:\.\d+)*|[a-zñ])\b", re.I)
ORDN = {"primer": 0, "segundo": 1, "tercer": 2, "cuarto": 3, "quinto": 4, "sexto": 5, "septimo": 6, "séptimo": 6, "octavo": 7}
PARR_NOTE = re.compile(r"(primer|segundo|tercer|cuarto|quinto|sexto|s[eé]ptimo|octavo|[úu]ltimo)\s+p[áa]rrafo", re.I)


def item_id(line: str):
    m = ITEM.match(plain(line)); return m.group(1).lower() if m else None


def sim(a: str, b: str) -> float:
    A = set(re.findall(r"\w{4,}", plain(a).lower())); B = set(re.findall(r"\w{4,}", plain(b).lower()))
    return len(A & B) / max(1, min(len(A), len(B)))


def seg_label(seg: str) -> str:
    w = re.sub(r"[“”\"(*)]", " ", seg).split()
    if len(w) < 2: return seg.lower()
    tr = str.maketrans("áéíóú", "aeiou")
    return (w[0].lower().translate(tr).replace("sub", "sub") + " " + w[1].lower().translate(tr))


def path_labels(ubic: str):
    return [seg_label(x) for x in ubic.split(" · ") if x]


def sumilla_like(line: str) -> bool:
    return (0 < len(line) < 90 and not re.search(r"\d", line) and not line.endswith((".", ":", ";", ","))
            and line.upper() != line and not line.startswith(("(", '"')) and not SKIPHDR.match(line))


def parse(text: str):
    """Lee el formato del SPIJ: cada artículo trae su texto original y, debajo, cada modificación como
    '(*) Artículo modificado por … cuyo texto es el siguiente:' + '"Artículo N.- …"'. Se conserva la última versión.
    Los cambios parciales (un inciso, numeral o párrafo) se aplican sobre la línea que el SPIJ marcó con (*);
    cada cambio queda registrado en a["cambios"] para el reporte de verificación."""
    lines = [l.strip().replace("\u00a0", " ") for l in text.splitlines()]
    lines = [l for l in lines if l]
    merged, k = [], 0
    while k < len(lines):
        if re.fullmatch(r"\d{1,3}|[a-z]", lines[k]) and k + 2 < len(lines) and re.fullmatch(r"[.)]-?", lines[k + 1]):
            merged.append(f"{lines[k]}{lines[k + 1]} {lines[k + 2]}"); k += 3; continue
        if re.fullmatch(r"\d{1,3}\s*[.)]-?|[a-z]\s*[.)]", lines[k]) and k + 1 < len(lines) and not ITEM.match(lines[k + 1]) and not NOTE.match(lines[k + 1]):
            merged.append(f"{lines[k]} {lines[k + 1]}"); k += 2; continue
        merged.append(lines[k]); k += 1
    lines = normalize_numbered_notes(merged)
    order = ["LIBRO", "SECCION", "TITULO", "SUBTITULO", "CAPITULO", "SUBCAPITULO"]
    arts, ctx, cur, skip, pending_head, prev = [], {}, None, False, None, ""
    expect = None  # None | "full" | "partial"
    frag, frag_note = None, None
    frag_soft = False   # fragmento abierto por una nota "De conformidad…": se cancela si no sigue texto entre comillas
    disp = None  # abreviatura de la sección de disposiciones en curso ("DFT", "DCF"…)
    last_num = None  # último número de artículo leído, para detectar citas de otras normas
    junk = False     # dentro de un bloque de restos de Word
    derog_secs = set()   # capítulos o subcapítulos derogados completos
    last_head = None     # último encabezado leído (para "(*) DEROGADO" justo debajo de un capítulo)

    def last_mark():
        for i in range(len(cur["lineas"]) - 1, -1, -1):
            if MARK in cur["lineas"][i]: return i
        return None

    def block_start(i, ident):
        """Inicio del bloque (inciso de varias líneas) que termina en la línea i."""
        if ident is None: return i
        for k in range(i, -1, -1):
            if item_id(cur["lineas"][k]) == ident: return k
        return i

    def log(nota, modo, ok, detalle=""):
        cur["cambios"].append({"nota": nota[:240], "modo": modo, "ok": ok, "detalle": detalle})

    def apply_partial_derog(note_line):
        i = last_mark(); ident = (IDENT_NOTE.search(note_line) or [None, None])[1]
        ident = ident.lower() if ident else None
        pm = PARR_NOTE.search(note_line) or re.search(r"p[áa]rrafo\s+(primer|segundo|tercer|cuarto|quinto|sexto|s[eé]ptimo|octavo|[úu]ltimo)", note_line, re.I)
        if i is None and pm:
            w = pm.group(1).lower().replace("ú", "u"); k = len(cur["lineas"]) - 1 if w == "ultimo" else ORDN.get(w)
            if k is not None and k < len(cur["lineas"]):
                del cur["lineas"][k]
                log(note_line, "derogación por número de párrafo (el SPIJ no marcó la línea)", True, f"párrafo {k + 1}"); return
        if i is None: log(note_line, "derogación sin marca", False, "no se encontró la línea marcada con (*)"); return
        st = block_start(i, ident or item_id(cur["lineas"][i]))
        idt = item_id(cur["lineas"][st])
        cur["lineas"][st:i + 1] = [f"{idt}. (Derogado)" if idt and re.match(r"\d", idt) else f"{idt}) (Derogado)" if idt else ""]
        log(note_line, "derogación sobre la línea marcada", True, f"bloque {st}-{i}")

    def close_frag():
        nonlocal frag, frag_note, frag_soft
        if frag is not None and not frag and frag_soft: frag = None; frag_soft = False; return   # nota informativa sin texto nuevo
        if cur is None or frag is None: frag = None; return
        body = [keep_mark(x) for x in frag]; body = [x for x in body if plain(x)]
        note_line, frag = frag_note, None
        if not body:
            if re.search(r"\(\*+\)\s*(Denominaci[óo]n|Subt[íi]tulo|T[íi]tulo|Ep[íi]grafe|Sumilla)\b", note_line, re.I):
                log(note_line, "nueva denominación aplicada al encabezado de la sección", True); return
            log(note_line, "fragmento vacío", False); return
        if re.search(r"\(\*+\)\s*(Ep[íi]grafe|Sumilla|Denominaci[óo]n|Subt[íi]tulo|T[íi]tulo)\b", note_line, re.I):
            nuevo = plain(body[0]); ma = match_art(nuevo)
            if ma: nuevo = ma[2] or plain(keep_mark(ma[3]))
            if re.search(r"\(\*+\)\s*(Ep[íi]grafe|Sumilla)", note_line, re.I) or ma:
                cur["titulo"] = re.sub(r"\s*\.?\s*-?\s*$", "", nuevo).strip()
                log(note_line, "cambio de título del artículo", True)
            else:
                log(note_line, "cambio de denominación de una sección (no altera el texto del artículo)", True)
            i = last_mark()
            if i is not None: cur["lineas"][i] = unmark(cur["lineas"][i])
            return
        ma = match_art(plain(body[0]))
        if ma and ma[1] == cur["n"]:   # el fragmento repite el encabezado: "Artículo 44.- Capacidad de ejercicio restringida"
            tit, rest = ma[2], keep_mark(ma[3]) if ma[3] else ""
            if not tit and rest and len(plain(rest)) <= 100 and not plain(rest).endswith((".", ":", ";")) and not re.search(r"\d", rest): tit, rest = plain(rest), ""
            if tit: cur["titulo"] = tit
            body = ([rest] if rest else []) + body[1:]
            if not body: log(note_line, "cambio de título del artículo", True); return
        incorp = bool(re.search(r"incorporad", note_line, re.I))
        ident = (IDENT_NOTE.search(note_line) or [None, None])[1]
        ident = (ident.lower() if ident else None) or item_id(body[0])
        i = last_mark()
        if incorp:
            # incorporación: va después de la línea marcada o del ítem anterior; si no, al final
            pos = (i + 1) if i is not None else len(cur["lineas"])
            if i is not None: cur["lineas"][i] = unmark(cur["lineas"][i])
            cur["lineas"][pos:pos] = body
            log(note_line, "incorporación" + (" tras la línea marcada" if i is not None else " al final"), True); return
        if i is not None:
            st = block_start(i, ident)
            old = " ".join(plain(x) for x in cur["lineas"][st:i + 1])
            score = sim(old, " ".join(body))
            cur["lineas"][st:i + 1] = body
            log(note_line, "reemplazo de la línea marcada", score >= 0.25 or len(old) < 40, f"similitud con el texto anterior {score:.2f}"); return
        if ident:
            for k, l in enumerate(cur["lineas"]):
                if item_id(l) == ident:
                    j = k + 1
                    while j < len(cur["lineas"]) and item_id(cur["lineas"][j]) is None: j += 1
                    cur["lineas"][k:j] = body
                    log(note_line, "reemplazo por número de inciso (sin marca)", True); return
        best = max(range(len(cur["lineas"])), key=lambda k: sim(cur["lineas"][k], " ".join(body)), default=None)
        if best is not None and sim(cur["lineas"][best], " ".join(body)) >= 0.5:
            cur["lineas"][best:best + 1] = body
            log(note_line, "reemplazo por similitud (sin marca)", True, f"línea {best}"); return
        cur["lineas"].extend(body)
        log(note_line, "agregado al final (no se encontró qué reemplazar)", False)

    def new_art(n, titulo, body, ubic):
        return {"n": n, "titulo": titulo, "ubicacion": ubic, "lineas": [body] if body else [], "historial": [], "derogado": False, "cambios": [], "reubicadoEn": None}

    head_idx = -9
    for idx, line in enumerate(lines):
        if re.match(r"^(FE DE ERRATAS|CUADRO DE MODIFICACIONES)\b", line): close_frag(); cur = None; skip = True; continue   # anexos del SPIJ: no son texto vigente
        if WORDJUNK.match(line) or re.fullmatch(r"[.\-–—_*•]+", line) or (junk and re.fullmatch(r"\d{1,3}", line)):
            junk = True; continue   # restos del exportador de Word ("Normal", "0", "21", "false"…) y signos sueltos
        junk = False
        if arts and ENDTXT.match(line): close_frag(); cur = None; skip = True; continue   # fórmula de promulgación
        if arts and DISPHDR.match(line) and line.upper() == line:
            close_frag(); disp = disp_abbr(line); disp_title = head_fmt(line); cur = None; skip = False; expect = None; continue
        if disp:
            om = ORD.match(line)
            if om and not NOTE.match(line):
                close_frag()
                cur = new_art(f"{disp}-{om.group(1).upper().replace(' ', '')}", f"{om.group(1).capitalize()} {disp_title.lower()}", keep_mark(om.group(2)), disp_title)
                arts.append(cur); skip = False; expect = None; continue
        m = match_art(line)
        if not m and last_num is not None and (m4 := ART4.match(line)) and last_num < int(re.match(r"\d+", m4.group(1)).group()) <= last_num + 3:
            m = (False, m4.group(1), m4.group(2).strip(), m4.group(3).strip())   # "Artículo 309 Trámite de la apelación… Las apelaciones…"
        if m and disp:
            # Dentro de una sección de disposiciones, "Artículo …" suele ser texto citado de otra norma.
            # Solo vuelve al articulado si es un artículo sin comillas que continúa la numeración (o un Título Preliminar).
            maxn = max((int(re.match(r"\d+", a["n"]).group()) for a in arts if re.match(r"\d", a["n"])), default=0)
            num = int(re.match(r"\d+", m[1]).group()) if re.match(r"\d", m[1]) else None
            if not m[0] and (num is None or num <= maxn + 30): disp = None
            else: m = None
        if m and re.match(r"\d", m[1]) and last_num is not None and int(re.match(r"\d+", m[1]).group()) > last_num + 100:
            m = None   # "Artículo 2011" dentro del Código Procesal Civil: es un artículo del Código Civil citado
        if m and m[0] and frag is not None and not frag and frag_soft and cur and m[1] == cur["n"]:
            frag = None; frag_soft = False   # "De conformidad… se modifica…" seguido del artículo completo: es una versión nueva
        if m and m[0] and frag is None and (cur is None or m[1] != cur["n"]):  # artículo incorporado por una ley
            m = (False,) + m[1:]
        if m and not m[0] and cur and frag is None and m[1] == cur["n"]:
            m = (True,) + m[1:]   # "Artículo 425.- …" repetido tras una nota: versión nueva del mismo artículo
            if not m[2] and sumilla_like(re.sub(r'^["“”«]+\s*', "", prev)):
                m = m[:2] + (re.sub(r'^["“”«]+\s*', "", prev),) + m[3:]
        if m and (not m[0] or (cur and frag is None and m[1] == cur["n"])):
            close_frag()
            quoted, n, titulo, body = m
            body = keep_mark(body) if body else body
            if not titulo and body and len(plain(body)) <= 100 and not plain(body).endswith((".", ":", ";")) and not re.search(r"\d", body): titulo, body = plain(body), ""
            if quoted:  # nueva versión completa del mismo artículo
                cur["lineas"] = [body] if body else []
                if titulo: cur["titulo"] = titulo
                expect = None; skip = False; continue
            if not titulo and sumilla_like(prev):
                titulo = prev
                if cur and cur["lineas"] and plain(cur["lineas"][-1]) == prev: cur["lineas"].pop()
            cur = new_art(n, titulo, body, " · ".join(v for k, v in sorted(ctx.items(), key=lambda kv: order.index(kv[0]))))
            arts.append(cur); skip = False; expect = None; prev = line
            if re.match(r"\d", n): last_num = int(re.match(r"\d+", n).group())
            continue
        prev = line
        hq = re.sub(r'^["“”«»]+\s*', "", line).rstrip('"“”«» ')   # encabezados incorporados entre comillas
        if HEAD_TC.match(hq) or (HEAD.match(hq) and hq.upper() == hq): line = hq.upper() if HEAD_TC.match(hq) else hq   # "Capítulo VII" se trata como "CAPÍTULO VII"
        h = HEAD.match(line)
        if h and line.upper() == line:
            close_frag()
            key = re.sub("[ÓÍ]", lambda x: {"Ó": "O", "Í": "I"}[x.group()], h.group(1).upper())
            lvl = order.index(key)
            for k in (order if "PRELIMINAR" in line else order[lvl:]): ctx.pop(k, None)
            ctx[key] = head_fmt(line); pending_head = key; skip = False; last_head = key; head_idx = idx; continue
        if pending_head and len(line) < 160 and not NOTE.match(line) and not ITEM.match(line) and (line.upper() == line or (not line.endswith((".", ":", ";")) and len(line) < 110)):
            ctx[pending_head] += " " + head_fmt(line); pending_head = None; head_idx = idx; continue
        pending_head = None
        if LABEL.match(line): continue   # etiqueta-enlace del SPIJ (jurisprudencia, procesos constitucionales): no corta el texto
        if SKIPHDR.match(line) or re.match(r"^\(VER .*PARTE", line, re.I): close_frag(); skip = "concord" if re.match(r"^\s*(CONCORDANCIA|NOTA SPIJ)", line, re.I) else True; continue
        if cur is None: continue
        if not skip and re.fullmatch(r'["“”]?\s*(\(\*+\)\s*)+["“”]?\s*\.?', line):
            # marca suelta en su propia línea: se aplica a la línea anterior (del fragmento en curso o del artículo)
            tgt = frag if frag is not None and frag else cur["lineas"]
            if tgt and MARK not in tgt[-1] and "(*" not in tgt[-1]: tgt[-1] = tgt[-1] + " (*)" if tgt is frag else tgt[-1] + " " + MARK
            if frag is not None and frag: close_frag()
            continue
        sec = re.match(r"^\s*\(\*+\)\s*(Sub\s?cap[íi]tulo|Cap[íi]tulo|T[íi]tulo|Secci[óo]n)\s+([\w-]+)\s+derogad", line, re.I)
        gen = re.match(r"^\s*\(\*+\)\s*DEROGAD[OA]\b", line)
        if sec or (gen and last_head and idx == head_idx + 1):
            close_frag()
            if sec:
                want = re.sub(r"\s+", "", sec.group(1).lower()).replace("í", "i") + " " + sec.group(2).lower()
                seg = next((x for x in (cur["ubicacion"].split(" · ") if cur else []) if re.sub(r"\s+", "", x.split(" ")[0].lower()).replace("í", "i") + " " + (x.split(" ") + [""])[1].lower() == want), None)
                if not seg and cur: seg = next((x for x in cur["ubicacion"].split(" · ") if x.lower().startswith(sec.group(1).lower().split()[0][:6])), None)
            else:
                seg = ctx.get(last_head)
            if seg:
                labels = path_labels(cur["ubicacion"]) if cur and seg in cur["ubicacion"] else None
                if labels is not None:
                    derog_secs.add(tuple(labels[:labels.index(seg_label(seg)) + 1]))
                    log(line, "derogación de la sección completa", True, seg)
                else:
                    derog_secs.add(tuple(path_labels(" · ".join(v for k2, v in sorted(ctx.items(), key=lambda kv: order.index(kv[0])) if order.index(k2) <= order.index(last_head)))))
            continue
        mreu = re.search(r"reubica(?:d[oa]|r)\s+y\s+renumera(?:d[oa]|r).*?por el art[íi]culo\s+(\d+(?:\s*[-–]\s*[A-ZÑ])?)", line, re.I) if NOTE.match(line) else None
        dest = re.sub(r"\s*[-–]\s*", "-", mreu.group(1)).upper() if mreu else None
        if mreu and cur is not None and dest != cur["n"]:
            cur["reubicadoEn"] = dest
            log(line, "artículo reubicado y renumerado", True, f"ahora es el artículo {cur['reubicadoEn']}")
        if NOTE.match(line):
            close_frag(); skip = False
            if re.match(r"^\s*\(\*+\)\s*(De conformidad|Confrontar|Se precisa|Prec[íi]sase|De acuerdo con|Mediante)", line, re.I):
                i = last_mark()
                if i is not None: cur["lineas"][i] = unmark(cur["lineas"][i])   # la nota informativa también consume su marca
                if re.search(r"se (dispuso la )?modific|modificaci[óo]n del (numeral|inciso|literal|p[áa]rrafo)", line, re.I):
                    frag = []; frag_note = line; frag_soft = True   # si sigue un texto entre comillas, es una modificación
                continue   # ocupa una sola línea: el texto que sigue sí es del artículo
            note = parse_note(line)
            if note:
                full_derog = note["tipo"].startswith("derogad") and re.match(r"^\s*\(\*+\)\s*(Art[íi]culo|Disposici[óo]n)\s+derogad", line, re.I)
                if full_derog: cur["derogado"] = True
                cur["historial"].append({k: v for k, v in note.items() if k != "tipo" and v})
                if FULLMOD.match(line) or re.search(r"redactad[oa]\s+el\s+art[íi]culo|el\s+art[íi]culo\s+(?:queda|quedar[áa])\s+redactado", line, re.I):
                    expect = "full" if announces(line) else None
                    if not announces(line):  # incorporado: el texto ya vino antes de la nota
                        i = last_mark()
                        if i is not None: cur["lineas"][i] = unmark(cur["lineas"][i])
                elif note["tipo"].startswith("derogad") and not full_derog: apply_partial_derog(line)
                elif announces(line): expect = "partial"; frag = []; frag_note = line
                else:
                    i = last_mark()   # p. ej., "Numeral incorporado por…" después del texto: ya está en su lugar
                    if i is not None:
                        cur["lineas"][i] = unmark(cur["lineas"][i])
                        idt = item_id(cur["lineas"][i])   # un inciso derogado que una ley restituye: sale el "(Derogado)"
                        if idt:   # solo dentro de la misma lista (sin otra introducción terminada en ":" de por medio)
                            def same_list(k2):
                                lo, hi = sorted((k2, i))
                                return not any(plain(x).rstrip().endswith(":") for x in cur["lineas"][lo + 1:hi])
                            cur["lineas"] = [l for k2, l in enumerate(cur["lineas"]) if not (k2 != i and item_id(l) == idt and "(Derogado)" in l and same_list(k2))]
                    log(line, "nota sin texto nuevo (el texto ya figura arriba)", True)
            continue
        if skip == "concord" and not CONCREF.match(line) and (ITEM.match(line) or (len(line) > 90 and not line[0].islower() and not line.endswith(")"))): skip = False   # terminó la lista de concordancias
        if skip: continue
        if frag is not None and frag_soft and not frag and not re.match(r'^\s*["“]', line):
            frag = None; frag_soft = False   # no venía texto nuevo: la línea es del artículo
        if frag is not None:
            frag_soft = False
            frag.append(line)
            if re.search(r'["”]\s*(\(\*+\))*\s*\.?$', line) and any(plain(keep_mark(x)) for x in frag): close_frag()
            continue
        if expect == "full": continue  # texto entre la nota y la nueva versión
        cur["lineas"].append(keep_mark(line))
    close_frag()

    # El cuerpo empieza en el primer "Artículo I" (Título Preliminar) o, si no hay, en el primer "Artículo 1":
    # así se descartan notas e índices previos. Si un número se repite, gana la primera aparición.
    start = next((i for i, a in enumerate(arts) if a["n"] == "I"), None)
    if start is None: start = next((i for i, a in enumerate(arts) if a["n"] == "1"), 0)
    for a in arts:
        al = path_labels(a["ubicacion"])
        if any(sec and tuple(al[:len(sec)]) == sec for sec in derog_secs):
            a["derogado"] = True
            a["cambios"] = [c for c in a["cambios"] if c["ok"]] + [{"nota": "", "modo": "sección derogada completa", "ok": True, "detalle": ""}]
    by = {}
    for a in arts[start:]: by.setdefault(a["n"], a)
    out = []
    for a in by.values():
        texto = "\n".join(plain(l) for l in a.pop("lineas") if plain(l)).strip()
        texto = re.sub(r"\s*\(\*+\)\s*(RECTIFICADO POR FE DE ERRATAS)?", "", texto).replace("RECTIFICADO POR FE DE ERRATAS", "").strip()
        if re.match(r"^[A-Z]+-", a["n"]) and (om := ORD.match(texto)) and om.group(2): texto = om.group(2) + texto[om.end():]
        if not texto and a["titulo"] and not a["derogado"]: texto, a["titulo"] = a["titulo"], ""
        a["historial"].sort(key=lambda h: h.get("publicada") or "")   # el SPIJ no siempre las lista en orden
        last = a["historial"][-1] if a["historial"] else None
        art = {"n": a["n"], "titulo": re.sub(r"\s*\.?\s*-?\s*$", "", a["titulo"]).strip(), "ubicacion": a["ubicacion"], "texto": texto,
               "derogado": a["derogado"] or bool(re.match(r"^\(?derogad[oa]\)?\.?$", texto.strip(), re.I))}
        if last and last.get("vigenteDesde"): art["vigenteDesde"] = last["vigenteDesde"]
        if a["historial"]: art["historial"] = a["historial"]
        if a.get("reubicadoEn"): art["reubicadoEn"] = a["reubicadoEn"]
        if a["cambios"]: art["_cambios"] = a["cambios"]
        out.append(art)
    return out


def apply_ajustes(arts, path: Path):
    """Correcciones del mantenedor: {"122-B": {"texto": "...", "vigenteDesde": "...", "proximo": {"norma","vigenteDesde","texto"}}}"""
    if not path.exists(): return 0
    aj = json.loads(path.read_text(encoding="utf-8")); by = {a["n"]: a for a in arts}
    for n, cambios in aj.items():
        if n.startswith("_"): continue
        if n not in by: by[n] = {"n": n, "titulo": "", "ubicacion": "", "texto": "", "derogado": False}; arts.append(by[n])
        by[n].update(cambios)
    return len([k for k in aj if not k.startswith("_")])


def quality(arts):
    issues = []
    seen = {}
    for a in arts:
        seen[a["n"]] = seen.get(a["n"], 0) + 1
        if not a["texto"] and not a["derogado"]: issues.append(f"artículo {a['n']} sin texto")
    issues += [f"artículo {n} repetido {c} veces" for n, c in seen.items() if c > 1]
    nums = sorted({int(re.match(r"\d+", a["n"]).group()) for a in arts if re.match(r"\d", a["n"])})
    gaps = [i for i in range(nums[0], nums[-1] + 1) if i not in set(nums)] if nums else []
    return issues, gaps


def verify(arts, ajustados, revisados=None):
    """Clasifica cada artículo con cambios parciales: ok, corregido a mano (ajuste) o pendiente."""
    res = []
    for a in arts:
        cambios = a.get("_cambios") or []
        dup, seg = set(), []
        for l in a["texto"].split("\n"):
            m = re.match(r"^(\d+)\s*(?:[.)]|\.-)\s", l)
            if m:
                if m.group(1) in seg: dup.add(m.group(1))
                seg.append(m.group(1))
            elif l.rstrip().endswith(":") or (seg and len(l) > 0 and not l[0].isdigit() and seg[-1] != "1" and False):
                seg = []
        dup = sorted(dup, key=int)
        if not cambios and not dup: continue
        fallas = [c for c in cambios if not c["ok"]] + ([{"nota": "", "modo": "numeración repetida", "ok": False, "detalle": f"incisos {dup}"}] if dup else [])
        revisados = revisados or {}
        estado = "ajuste" if a["n"] in ajustados else ("ok" if not fallas else ("verificado" if a["n"] in revisados else "pendiente"))
        res.append({"n": a["n"], "estado": estado, "cambios": cambios, "fallas": fallas, "motivo": revisados.get(a["n"], "")})
    return res


def write_report(path: Path, report):
    L = ["# Reporte de verificación de cambios parciales", "",
         "Cada artículo que una ley modificó en parte (inciso, numeral o párrafo) se verificó contra la marca (*) del SPIJ.",
         "Estados: **ok** (cambio aplicado sobre la línea marcada), **verificado** (revisado a mano contra el SPIJ: correcto), **ajuste** (corregido a mano en `normas/ajustes/` con el texto oficial), **pendiente**.", ""]
    for n, ver in report:
        c = {e: sum(1 for v in ver if v["estado"] == e) for e in ("ok", "verificado", "ajuste", "pendiente")}
        L += [f"## {n['titulo']} ({n['id']})", "", f"{len(ver)} artículos con cambios parciales · ok {c['ok']} · verificado {c['verificado']} · ajuste {c['ajuste']} · pendiente {c['pendiente']}", ""]
        for v in [v for v in ver if v["estado"] != "ok"]:
            L.append(f"- **Art. {v['n']}** · {v['estado']}" + (f" — {v['motivo']}" if v.get("motivo") else ""))
            for f in v["fallas"]: L.append(f"  - {f['modo']}{(': ' + f['detalle']) if f.get('detalle') else ''}{(' — ' + f['nota']) if f.get('nota') else ''}")
        L.append("")
    path.write_text("\n".join(L), encoding="utf-8")


def gz(data: bytes) -> bytes:
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode="wb", mtime=0, compresslevel=9) as f: f.write(data)
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--catalogo", default=str(ROOT / "normas" / "catalogo.json"))
    ap.add_argument("--fuentes", default=str(ROOT / "normas" / "fuentes"))
    ap.add_argument("--ajustes", default=str(ROOT / "normas" / "ajustes"))
    ap.add_argument("--out", default=str(ROOT / "docs" / "normas"))
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--reporte", default="", help="ruta del reporte de verificación en Markdown")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    cat = json.loads(Path(a.catalogo).read_text(encoding="utf-8"))
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    prev = json.loads((out / "manifest.json").read_text(encoding="utf-8")) if (out / "manifest.json").exists() else None
    normas, fatal, report = [], False, []
    for n in cat["normas"]:
        # una norma puede venir en partes: CP.doc, CP-2.doc, CP-3.doc… (el SPIJ divide el Código Penal)
        def part(suffix):
            return next((p for p in (Path(a.fuentes) / f"{n['id']}{suffix}{ext}" for ext in (".docx", ".doc", ".html", ".txt")) if p.exists()), None)
        parts = [p for p in [part("")] + [part(f"-{i}") for i in range(2, 10)] if p]
        src = parts[0] if parts else None
        if not src:
            print(f"·  {n['id']:6} {n['titulo']}: sin fuente todavía (se omite)"); continue
        arts, seen_n = [], set()
        for src_part in parts:  # cada parte se lee por separado; si un artículo se repite, gana la primera parte
            for art in parse(read_source(src_part)):
                if art["n"] not in seen_n: seen_n.add(art["n"]); arts.append(art)
        aj_path = Path(a.ajustes) / f"{n['id']}.json"
        nadj = apply_ajustes(arts, aj_path)
        ajustados = {k for k in (json.loads(aj_path.read_text(encoding="utf-8")) if aj_path.exists() else {}) if not k.startswith("_")}
        issues, gaps = quality(arts)
        rev_path = Path(a.ajustes).parent / "revision" / f"{n['id']}.json"
        revisados = {k: v for k, v in (json.loads(rev_path.read_text(encoding="utf-8")) if rev_path.exists() else {}).items() if not k.startswith("_")}
        ver = verify(arts, ajustados, revisados)
        report.append((n, ver))
        pend = [v["n"] for v in ver if v["estado"] == "pendiente"]
        if pend: issues.append(f"{len(pend)} artículos con cambios parciales sin verificar: {pend[:15]}{'…' if len(pend) > 15 else ''}")
        for art in arts: art.pop("_cambios", None)
        data = {"id": n["id"], "titulo": n["titulo"], "corto": n.get("corto", n["id"]), "base": n.get("base", ""), "fuenteOficial": n.get("fuenteOficial", ""),
                "actualizadoAl": n["actualizadoAl"], "articulos": arts}
        blob = gz(json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        (out / f"{n['id']}.json.gz").write_bytes(blob)
        normas.append({k: n[k] for k in ("id", "titulo", "corto", "alias", "materias", "fuenteOficial", "actualizadoAl", "parcial") if k in n} |
                      {"archivo": f"{n['id']}.json.gz", "sha256": hashlib.sha256(blob).hexdigest(), "bytes": len(blob), "articulos": len(arts)})
        print(f"✓  {n['id']:6} {len(arts):5} artículos · {len(blob) // 1024} KB · ajustes: {nadj}" + (f" · saltos de numeración: {gaps[:12]}{'…' if len(gaps) > 12 else ''}" if gaps else ""))
        for i in issues: print(f"   ⚠ {i}")
        if issues and a.strict: fatal = True
    if a.reporte: write_report(Path(a.reporte), report)
    if fatal: raise SystemExit("Hay problemas de calidad (--strict). Revisa las fuentes o los ajustes.")
    same = prev and [(x["id"], x["sha256"]) for x in prev.get("normas", [])] == [(x["id"], x["sha256"]) for x in normas] and prev.get("actualizadoAl") == cat["actualizadoAl"]
    manifest = {"formato": "folio-normas", "version": (prev or {}).get("version", 0) + (0 if same else 1), "actualizadoAl": cat["actualizadoAl"], "normas": normas}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nmanifest.json · versión {manifest['version']} · corte {manifest['actualizadoAl']} · {len(normas)} normas → {out}")


if __name__ == "__main__":
    main()
