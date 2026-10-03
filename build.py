"""Ensambla Folio en un solo archivo HTML: python build.py  ->  dist/folio.html"""
import base64
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
JS_ORDER = ["config.js", "core.js", "normas.js", "legal.js", "ui.js"]  # el orden importa


def data_uri(name, mime):
    return f"data:{mime};base64," + base64.b64encode((SRC / "img" / name).read_bytes()).decode()


# Logo dentro del HTML (funciona sin internet): variante clara y oscura según el tema (ver process/specs/rediseno-ux-v0.5.md §3.4)
logo_css = (
    "/* Logo de Folio: generado por build.py desde src/img */\n"
    f":root{{--logo-claro:url({data_uri('logo-claro.webp', 'image/webp')});--logo-oscuro:url({data_uri('logo-oscuro.webp', 'image/webp')});--logo:var(--logo-claro)}}\n"
    "@media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]){--logo:var(--logo-oscuro)}}\n"
    ":root[data-theme=\"dark\"]{--logo:var(--logo-oscuro)}\n"
)

shell = (SRC / "shell.html").read_text(encoding="utf-8")
CSS_ORDER = ["fonts.css", "styles.css"]  # tipografías incluidas (sin Google Fonts) + estilos
css = "\n".join((SRC / f).read_text(encoding="utf-8") for f in CSS_ORDER) + "\n" + logo_css
js = "\n".join((SRC / f).read_text(encoding="utf-8") for f in JS_ORDER)

out = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js).replace("__ICON__", data_uri("icono.png", "image/png"))
(ROOT / "dist").mkdir(exist_ok=True)
(ROOT / "dist" / "folio.html").write_text(out, encoding="utf-8")
print(f"dist/folio.html generado ({len(out) // 1024} KB)")
