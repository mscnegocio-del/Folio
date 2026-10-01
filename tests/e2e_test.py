"""Prueba end-to-end de Folio con un proveedor de IA simulado.

Uso:
    pip install playwright && playwright install chromium
    python build.py
    python tests/e2e_test.py

No necesita internet: las llamadas a OpenRouter se simulan y las fuentes/CDN se bloquean.
"""
import datetime as dt
import json
import shutil
import subprocess
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "dist" / "folio.html").as_uri()
SHOTS = Path(__file__).resolve().parent / "shots"
SHOTS.mkdir(exist_ok=True)
PASS = "Litigio-Seguro-2026"
REAL_DATA = ["Rosa Elena", "Huamán", "HUAMÁN", "45879632", "41236598", "964 123 456", "rosa.quispe", "Los Pinos"]
sent, errors, failures, font_requests, update_requests, normas_requests = [], [], [], [], [], []

# Biblioteca legal (E8): paquetes de prueba armados con el conversor real a partir de textos FICTICIOS
FIX = ROOT / "tests" / "fixtures" / "normas"
NORMAS_URL = "https://mscnegocio-del.github.io/Folio/normas/"
def build_normas(src, out):
    shutil.rmtree(out, ignore_errors=True)
    subprocess.run([sys.executable, str(ROOT / "normas" / "build_normas.py"), "--catalogo", str(src / "catalogo.json"), "--fuentes", str(src / "fuentes"),
                    "--ajustes", str(src / "ajustes"), "--out", str(out), "--strict"], check=True, capture_output=True)
build_normas(FIX, SHOTS / "normas" / "v1")
SRC2 = SHOTS / "normas" / "src2"; shutil.rmtree(SRC2, ignore_errors=True); shutil.copytree(FIX, SRC2)
cc = (SRC2 / "fuentes" / "CC.txt").read_text(encoding="utf-8")
(SRC2 / "fuentes" / "CC.txt").write_text(cc.replace("los alimentos se regulan", "los alimentos se regulan con el nuevo criterio de prueba").replace("Los alimentos se regulan", "Los alimentos se fijan"), encoding="utf-8")
(SRC2 / "catalogo.json").write_text((SRC2 / "catalogo.json").read_text(encoding="utf-8").replace("2026-09-28", "2026-09-30"), encoding="utf-8")
build_normas(SRC2, SHOTS / "normas" / "v2")
NORMAS = {"dir": SHOTS / "normas" / "v1"}


def check(cond, msg):
    print(("OK   " if cond else "FAIL ") + msg)
    if not cond:
        failures.append(msg)


def handle(route, request):
    url = request.url
    if url.startswith(NORMAS_URL):
        normas_requests.append({"method": request.method, "body": request.post_data})
        f = NORMAS["dir"] / url[len(NORMAS_URL):].split("?")[0]
        if not f.exists():
            return route.fulfill(status=404, body="")
        return route.fulfill(status=200, headers={"content-type": "application/json" if f.suffix == ".json" else "application/gzip", "access-control-allow-origin": "*"}, body=f.read_bytes())
    if "fonts.g" in url:
        font_requests.append(url)
    if any(h in url for h in ["fonts.g", "jsdelivr", "cdnjs"]):
        return route.abort()
    if url.endswith("/chat/completions"):
        body = json.loads(request.post_data or "{}")
        sent.append(body)
        text = " ".join(m["content"] for m in body["messages"])
        if not body.get("stream"):
            content = "OK"
            if "buscador de normas" in text:
                content = json.dumps({"citas": [{"norma": "CC", "articulo": "481"}], "terminos": ["alimentos"]})
            if "módulo de memoria" in text:
                content = json.dumps({"estado": "MOCK-ESTADO", "hechos_agregar": "MOCK-HECHO [PERSONA_2] alega ingresos menores.",
                                      "pendientes_nuevos": ["MOCK-PEND"], "plazos_nuevos": []})
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps({"choices": [{"message": {"content": content}}]}))
        chunks = ["**MOCK.** [PERSONA_1] demanda alimentos contra [PERSONA_2].\n\n", "- Verifica plazos con tu SINOE.\n",
                  "- Según el artículo 481 del Código Civil, el juez regula los alimentos.\n- El artículo 472 del Código Civil dice: \"Se entiende por alimentos lo indispensable para el sustento y la vivienda digna del menor en todo momento del proceso\".\n",
                  "- Revisa el artículo 108-B del Código Penal y el artículo 999 del Código Civil.\n- No apliques el Código Civil español ni la Ley N° 12345.\n"]
        sse = "".join("data: " + json.dumps({"choices": [{"delta": {"content": c}}]}) + "\n\n" for c in chunks) + "data: [DONE]\n\n"
        return route.fulfill(status=200, headers={"content-type": "text/event-stream"}, body=sse)
    if "api.github.com" in url and url.endswith("/releases/latest"):
        update_requests.append({"method": request.method, "body": request.post_data})
        return route.fulfill(status=200, content_type="application/json", body=json.dumps({
            "tag_name": "v9.9.9", "html_url": "https://github.com/mscnegocio-del/Folio/releases/tag/v9.9.9", "published_at": "2026-10-01T00:00:00Z",
            "assets": [{"name": "folio.html", "browser_download_url": "https://github.com/mscnegocio-del/Folio/releases/download/v9.9.9/folio.html"}]}))
    if url.endswith("/models"):
        return route.fulfill(status=200, content_type="application/json",
                             body=json.dumps({"data": [{"id": "anthropic/claude-sonnet-5.5"}, {"id": "x/free-model:free"}]}))
    return route.continue_()


def onboarding(pg, with_provider=True):
    pg.goto(URL); pg.wait_for_selector(".onb")
    pg.click("[data-action=onb-next]")
    for k in ["resp", "verify", "policy"]:
        pg.check(f"[data-onb-check={k}]")
    pg.click("[data-action=onb-next]"); pg.check("[data-onb-check=transfer]"); pg.click("[data-action=onb-next]")
    pg.fill("[data-onb-field=pass]", PASS); pg.fill("[data-onb-field=pass2]", PASS); pg.check("[data-onb-check=norecovery]")
    pg.click("[data-action=onb-next]")
    if with_provider:
        pg.fill("[data-pf=apiKey]", "sk-or-v1-test"); pg.click(".preset >> nth=0")
        pg.click("[data-action=test-conn]"); pg.wait_for_timeout(400)
        check("Conexión correcta" in pg.inner_text("#conn-result"), "prueba de conexión")
        pg.click("[data-action=onb-finish]:not([data-skip])")
    else:
        pg.click("[data-action=onb-finish][data-skip]")
    pg.wait_for_selector(".empty", timeout=15000)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e))); pg.route("**/*", handle)
    onboarding(pg)
    pg.wait_for_function("Lib.installed()", timeout=15000)
    check(True, "biblioteca legal instalada desde la bienvenida (recomendada)")
    pg.click("[data-action=load-sample]"); pg.wait_for_selector(".caratula"); pg.wait_for_timeout(500)
    check("Normas al 28/09/2026" in pg.inner_text(".agent-head"), "biblioteca: fecha de corte visible en el agente")
    pg.screenshot(path=str(SHOTS / "01-expediente.png"))

    pg.click(".quick button >> nth=0"); pg.wait_for_selector(".payload")
    check("Búsqueda de normas" in pg.inner_text("#dlg"), "biblioteca: la revisión previa muestra la búsqueda de normas")
    pg.click("[data-dlg=yes]")
    pg.wait_for_selector(".msg.assistant .foot", timeout=10000)
    payload = json.dumps(sent[-1], ensure_ascii=False)
    leaks = [x for x in REAL_DATA if x in payload]
    check(not leaks, f"sin datos reales en el envío {leaks if leaks else ''}")
    check(sent[-1].get("provider") == {"zdr": True, "data_collection": "deny"}, "ZDR activo en OpenRouter")
    check(sent[-1].get("reasoning") == {"effort": "low"}, "razonamiento bajo en OpenRouter")
    check("Rosa Elena Quispe Rojas" in pg.inner_text("#msgs"), "respuesta restaurada con datos reales en pantalla")
    planner = json.dumps(sent[-2], ensure_ascii=False)
    check("buscador de normas" in planner and not [x for x in REAL_DATA if x in planner], "biblioteca: búsqueda de normas sin datos reales")
    check("NORMAS PERUANAS" in payload and "Los alimentos se regulan por el juez" in payload and "Se entiende por alimentos" in payload, "biblioteca: artículos del plan y de la búsqueda local en el envío")
    check("Esta línea es una concordancia" not in payload, "biblioteca: sin concordancias del SPIJ")
    cites = pg.inner_text(".msg.assistant .cites")
    check("✓ Art. 481 CC" in cites, "citas: artículo vigente verificado")
    check(pg.locator(".cite.warn", has_text="472").count() == 1, "citas: cita textual distinta marcada")
    check(pg.locator(".cite.warn", has_text="108-B").count() == 1, "citas: cambio que aún no rige marcado")
    check(pg.locator(".cite.bad", has_text="999").count() == 1, "citas: artículo inexistente marcado")
    check(pg.locator(".cite.bad", has_text="español").count() == 1, "citas: norma extranjera marcada")
    check(pg.locator(".cite.info", has_text="12345").count() == 1, "citas: norma fuera de la biblioteca marcada")
    pg.locator(".msg.assistant .cites").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "08-citas.png"))
    pg.click(".cite.ok >> nth=0"); pg.wait_for_selector("#dlg .payload")
    check("Los alimentos se regulan" in pg.inner_text("#dlg") and "fuente oficial" in pg.inner_text("#dlg"), "citas: ver artículo con enlace a la fuente oficial")
    pg.click("#dlg [data-action=dlg-close]")
    check(normas_requests and all(r["method"] == "GET" and not r["body"] for r in normas_requests), "biblioteca: descargas GET sin datos del abogado")

    pg.click("[data-action=propose-memory]"); pg.wait_for_selector(".payload"); pg.click("[data-dlg=yes]")
    pg.wait_for_selector("[data-prop]", timeout=10000); pg.click("[data-dlg=yes]"); pg.wait_for_timeout(500)
    check(pg.input_value("[data-bind=estado]") == "MOCK-ESTADO", "actualizar memoria aplica cambios aprobados")
    check("Julio César Huamán Torres" in pg.input_value('[data-bind="memoria.hechos"]'), "memoria restaurada con nombres reales")

    pg.click("[data-action=open-settings]"); pg.wait_for_timeout(300)
    pg.click(".settings [data-action=show-keyguide]"); pg.wait_for_timeout(200)
    check(pg.query_selector("details.guide[open]") is not None, "guía de keys abre la sección del proveedor")
    pg.click("[data-action=dlg-close]")
    NORMAS["dir"] = SHOTS / "normas" / "v2"
    pg.click("#normas-section [data-action=normas-install]")
    pg.wait_for_selector(".toast:has-text('cambió')", timeout=15000)
    check("Normas al 30/09/2026" in pg.inner_text("#normas-section"), "biblioteca: actualización incremental con nueva fecha de corte")
    pg.click("#normas-section [data-action=normas-changes]"); pg.wait_for_selector("#dlg table")
    check("481" in pg.inner_text("#dlg") and "Modificado" in pg.inner_text("#dlg"), "biblioteca: lista de artículos que cambiaron")
    pg.click("#dlg [data-action=dlg-close]")
    old = (dt.date.today() - dt.timedelta(days=40)).isoformat()
    pg.evaluate("async(d)=>{const m=await NDB.get('manifest');m.actualizadoAl=d;await NDB.put('manifest',m);Lib.reset();await Lib.load();refreshNormasUI()}", old)
    check(pg.query_selector("#normas-section .libstat.warn") is not None and "días sin actualizarse" in pg.inner_text("#normas-section"), "biblioteca: aviso de atraso a los 14+ días")
    pg.screenshot(path=str(SHOTS / "07-biblioteca.png"))

    pg.click(".side [data-action=lock-now]"); pg.wait_for_selector(".lock")
    pg.fill("input[name=pass]", "clave-incorrecta"); pg.click("[data-form=unlock] button"); pg.wait_for_timeout(1500)
    check("no coincide" in pg.inner_text("#lock-err"), "contraseña incorrecta rechazada")
    pg.fill("input[name=pass]", PASS); pg.click("[data-form=unlock] button"); pg.wait_for_selector(".caratula", timeout=15000)
    check(pg.locator(".msg").count() >= 2, "datos persisten tras desbloquear")
    raw = pg.evaluate("async()=>{let o='';for(const k of await DB.keys())o+=JSON.stringify(await DB.get(k));return o}")
    check(not any(x in raw for x in ["Rosa", "45879632", "sk-or-v1-test"]), "IndexedDB sin texto plano ni key")
    with pg.expect_download() as dl:
        pg.click(".side [data-action=open-settings]"); pg.wait_for_timeout(200); pg.click("[data-action=export-backup]")
    data = json.load(open(dl.value.path()))
    check(data.get("format") == "folio-respaldo" and "vault" in data["records"], "copia de seguridad válida")
    ctx.close()

    # T-201: si cambió la versión de los avisos, se piden de nuevo al desbloquear
    r = b.new_context(viewport={"width": 1280, "height": 860}); rp = r.new_page()
    rp.on("pageerror", lambda e: errors.append("re-aceptación: " + str(e))); rp.route("**/*", handle)
    onboarding(rp, with_provider=False)
    rp.evaluate("async()=>{const c=await DB.get('consent');c.policyVersion='2026-09-30 (borrador)';await DB.put('consent',c)}")
    rp.click(".side [data-action=lock-now]"); rp.wait_for_selector(".lock")
    rp.fill("input[name=pass]", PASS); rp.click("[data-form=unlock] button"); rp.wait_for_selector(".reconsent", timeout=15000)
    check(rp.is_disabled("[data-action=reconsent-accept]"), "re-aceptación: botón bloqueado sin marcar la casilla")
    check("Google Fonts" in rp.inner_text(".changes"), "re-aceptación: muestra qué cambió")
    rp.screenshot(path=str(SHOTS / "05-reaceptacion.png"))
    rp.click("[data-action=reconsent-decline]"); rp.wait_for_selector(".lock")
    rp.fill("input[name=pass]", PASS); rp.click("[data-form=unlock] button"); rp.wait_for_selector(".reconsent", timeout=15000)
    check(True, "re-aceptación: rechazar bloquea y se vuelve a pedir")
    rp.check("[data-reconsent-check]"); rp.click("[data-action=reconsent-accept]"); rp.wait_for_selector(".empty", timeout=15000)
    c = rp.evaluate("async()=>{const c=await DB.get('consent');return {v:c.policyVersion,cur:APP.policyVersion,h:(c.history||[]).length}}")
    check(c["v"] == c["cur"] and c["h"] == 1, "re-aceptación: guarda la versión vigente y el historial")
    rp.click(".side [data-action=lock-now]"); rp.wait_for_selector(".lock")
    rp.fill("input[name=pass]", PASS); rp.click("[data-form=unlock] button"); rp.wait_for_selector(".empty", timeout=15000)
    check(rp.query_selector(".reconsent") is None, "re-aceptación: no se vuelve a pedir tras aceptar")
    r.close()

    # Aviso de nueva versión: no bloquea, explica cómo actualizar y se puede posponer
    u = b.new_context(viewport={"width": 1280, "height": 860}); up = u.new_page()
    up.on("pageerror", lambda e: errors.append("actualización: " + str(e))); up.route("**/*", handle)
    onboarding(up, with_provider=False); up.wait_for_selector(".update-bar", timeout=10000)
    check("9.9.9" in up.inner_text(".update-bar"), "actualización: aviso de nueva versión visible")
    check(all(r["method"] == "GET" and not r["body"] for r in update_requests), "actualización: consulta GET sin datos")
    up.click("[data-action=load-sample]"); up.wait_for_selector(".caratula")
    check(up.query_selector(".update-bar") is not None, "actualización: se puede seguir trabajando con el aviso")
    up.click("[data-action=update-how]"); up.wait_for_selector(".update-steps")
    check(up.get_attribute(".update-steps a.btn", "href").endswith("/v9.9.9/folio.html"), "actualización: enlace de descarga al archivo nuevo")
    up.screenshot(path=str(SHOTS / "06-actualizar.png")); up.click("[data-action=dlg-close]")
    up.click("[data-action=update-later]"); up.wait_for_timeout(200)
    check(up.query_selector(".update-bar") is None, "actualización: 'Más tarde' oculta el aviso")
    n = len(update_requests)
    up.click(".side [data-action=lock-now]"); up.wait_for_selector(".lock")
    up.fill("input[name=pass]", PASS); up.click("[data-form=unlock] button"); up.wait_for_selector(".caratula", timeout=15000); up.wait_for_timeout(400)
    check(len(update_requests) == n and up.query_selector(".update-bar") is not None, "actualización: no repite la consulta en 12 h y recuerda el aviso")
    u.close()

    m = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); mp = m.new_page()
    mp.on("pageerror", lambda e: errors.append("móvil: " + str(e))); mp.route("**/*", handle)
    onboarding(mp, with_provider=False)
    mp.click("[data-action=load-sample]"); mp.wait_for_selector(".caratula"); mp.wait_for_timeout(400)
    sw = mp.evaluate('document.querySelector("#pane").scrollWidth'); cw = mp.evaluate('document.querySelector("#pane").clientWidth')
    check(sw <= cw + 1, "móvil sin desborde horizontal")
    mp.screenshot(path=str(SHOTS / "02-movil.png")); m.close()

    d = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme="dark"); dp = d.new_page(); dp.route("**/*", handle)
    onboarding(dp, with_provider=False); dp.screenshot(path=str(SHOTS / "03-oscuro.png"))
    dp.click("[data-action=load-sample]"); dp.wait_for_selector(".caratula"); dp.wait_for_timeout(500)
    dp.screenshot(path=str(SHOTS / "04-oscuro-expediente.png"))
    b.close()

check(not font_requests, "sin solicitudes a Google Fonts (tipografías incluidas)")
check(not errors, f"sin errores de JavaScript {errors if errors else ''}")
print(f"\n{'TODO OK' if not failures else str(len(failures)) + ' FALLAS'}")
sys.exit(1 if failures else 0)
