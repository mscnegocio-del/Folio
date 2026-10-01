"""Ensambla Folio en un solo archivo HTML: python build.py  ->  dist/folio.html"""
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
JS_ORDER = ["config.js", "core.js", "legal.js", "ui.js"]  # el orden importa

shell = (SRC / "shell.html").read_text(encoding="utf-8")
css = (SRC / "styles.css").read_text(encoding="utf-8")
js = "\n".join((SRC / f).read_text(encoding="utf-8") for f in JS_ORDER)

out = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
(ROOT / "dist").mkdir(exist_ok=True)
(ROOT / "dist" / "folio.html").write_text(out, encoding="utf-8")
print(f"dist/folio.html generado ({len(out) // 1024} KB)")
