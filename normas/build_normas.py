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

ART = re.compile(r"^\s*Art[íi]culo\s+(\d+(?:\s*[-–]\s*[A-Z])?)\s*[°º]?\s*\.?\s*[-–—.:]+\s*(.*)$", re.I)
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


def parse(text: str):
    arts, ctx, cur, skip, pending_head = [], {}, None, False, None
    order = ["LIBRO", "SECCION", "TITULO", "SUBTITULO", "CAPITULO", "SUBCAPITULO"]
    for raw in text.splitlines():
        line = raw.strip().replace(" ", " ")
        if not line: continue
        m = ART.match(line)
        if m:
            skip = False
            n = re.sub(r"\s*[-–]\s*", "-", m.group(1).upper())
            rest = m.group(2).strip()
            titulo, body = ("", rest)
            if rest and len(rest) <= 100 and not rest.endswith((".", ":", ";")): titulo, body = rest, ""
            cur = {"n": n, "titulo": titulo, "ubicacion": " · ".join(v for k, v in sorted(ctx.items(), key=lambda kv: order.index(kv[0]))),
                   "lineas": [body] if body else [], "historial": [], "derogado": False}
            arts.append(cur); continue
        h = HEAD.match(line)
        if h and line.upper() == line:
            key = re.sub("[ÓÍ]", lambda x: {"Ó": "O", "Í": "I"}[x.group()], h.group(1).upper())
            lvl = order.index(key)
            for k in order[lvl:]: ctx.pop(k, None)
            ctx[key] = head_fmt(line); pending_head = key; skip = False; continue
        if pending_head and line.upper() == line and len(line) < 160 and not NOTE.match(line):
            ctx[pending_head] += " " + head_fmt(line); pending_head = None; continue
        pending_head = None
        if CONCORD.match(line): skip = True; continue
        if cur is None or skip: continue
        if NOTE.match(line):
            note = parse_note(line)
            if note:
                if note["tipo"].startswith("derogad"): cur["derogado"] = True
                cur["historial"].append({k: v for k, v in note.items() if k != "tipo" and v})
            continue
        cur["lineas"].append(re.sub(r"\(\*+\)", "", line).strip())
    out = []
    for a in arts:
        texto = "\n".join(l for l in a.pop("lineas") if l).strip()
        if not texto and a["titulo"] and not a["derogado"]: texto, a["titulo"] = a["titulo"], ""
        last = a["historial"][-1] if a["historial"] else None
        art = {"n": a["n"], "titulo": a["titulo"], "ubicacion": a["ubicacion"], "texto": texto, "derogado": a["derogado"] or texto.lower().startswith("derogado")}
        if last and last.get("vigenteDesde"): art["vigenteDesde"] = last["vigenteDesde"]
        if a["historial"]: art["historial"] = a["historial"]
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
    nums = sorted({int(re.match(r"\d+", a["n"]).group()) for a in arts})
    gaps = [i for i in range(nums[0], nums[-1] + 1) if i not in set(nums)] if nums else []
    return issues, gaps


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
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    cat = json.loads(Path(a.catalogo).read_text(encoding="utf-8"))
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    prev = json.loads((out / "manifest.json").read_text(encoding="utf-8")) if (out / "manifest.json").exists() else None
    normas, fatal = [], False
    for n in cat["normas"]:
        src = next((p for p in (Path(a.fuentes) / f"{n['id']}{ext}" for ext in (".docx", ".txt")) if p.exists()), None)
        if not src:
            print(f"·  {n['id']:6} {n['titulo']}: sin fuente todavía (se omite)"); continue
        arts = parse(read_source(src))
        nadj = apply_ajustes(arts, Path(a.ajustes) / f"{n['id']}.json")
        issues, gaps = quality(arts)
        data = {"id": n["id"], "titulo": n["titulo"], "corto": n.get("corto", n["id"]), "base": n.get("base", ""), "fuenteOficial": n.get("fuenteOficial", ""),
                "actualizadoAl": n["actualizadoAl"], "articulos": arts}
        blob = gz(json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        (out / f"{n['id']}.json.gz").write_bytes(blob)
        normas.append({k: n[k] for k in ("id", "titulo", "corto", "alias", "materias", "fuenteOficial", "actualizadoAl") if k in n} |
                      {"archivo": f"{n['id']}.json.gz", "sha256": hashlib.sha256(blob).hexdigest(), "bytes": len(blob), "articulos": len(arts)})
        print(f"✓  {n['id']:6} {len(arts):5} artículos · {len(blob) // 1024} KB · ajustes: {nadj}" + (f" · saltos de numeración: {gaps[:12]}{'…' if len(gaps) > 12 else ''}" if gaps else ""))
        for i in issues: print(f"   ⚠ {i}")
        if issues and a.strict: fatal = True
    if fatal: raise SystemExit("Hay problemas de calidad (--strict). Revisa las fuentes o los ajustes.")
    same = prev and [(x["id"], x["sha256"]) for x in prev.get("normas", [])] == [(x["id"], x["sha256"]) for x in normas] and prev.get("actualizadoAl") == cat["actualizadoAl"]
    manifest = {"formato": "folio-normas", "version": (prev or {}).get("version", 0) + (0 if same else 1), "actualizadoAl": cat["actualizadoAl"], "normas": normas}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nmanifest.json · versión {manifest['version']} · corte {manifest['actualizadoAl']} · {len(normas)} normas → {out}")


if __name__ == "__main__":
    main()
