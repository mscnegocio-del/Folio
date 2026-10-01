"""Prueba end-to-end de Folio con un proveedor de IA simulado.

Uso:
    pip install playwright && playwright install chromium
    python build.py
    python tests/e2e_test.py

No necesita internet: las llamadas a OpenRouter se simulan y las fuentes/CDN se bloquean.
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "dist" / "folio.html").as_uri()
SHOTS = Path(__file__).resolve().parent / "shots"
SHOTS.mkdir(exist_ok=True)
PASS = "Litigio-Seguro-2026"
REAL_DATA = ["Rosa Elena", "Huamán", "HUAMÁN", "45879632", "41236598", "964 123 456", "rosa.quispe", "Los Pinos"]
sent, errors, failures, font_requests = [], [], [], []


def check(cond, msg):
    print(("OK   " if cond else "FAIL ") + msg)
    if not cond:
        failures.append(msg)


def handle(route, request):
    url = request.url
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
            if "módulo de memoria" in text:
                content = json.dumps({"estado": "MOCK-ESTADO", "hechos_agregar": "MOCK-HECHO [PERSONA_2] alega ingresos menores.",
                                      "pendientes_nuevos": ["MOCK-PEND"], "plazos_nuevos": []})
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps({"choices": [{"message": {"content": content}}]}))
        chunks = ["**MOCK.** [PERSONA_1] demanda alimentos contra [PERSONA_2].\n\n", "- Verifica plazos con tu SINOE.\n"]
        sse = "".join("data: " + json.dumps({"choices": [{"delta": {"content": c}}]}) + "\n\n" for c in chunks) + "data: [DONE]\n\n"
        return route.fulfill(status=200, headers={"content-type": "text/event-stream"}, body=sse)
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
    pg.click("[data-action=load-sample]"); pg.wait_for_selector(".caratula"); pg.wait_for_timeout(500)
    pg.screenshot(path=str(SHOTS / "01-expediente.png"))

    pg.click(".quick button >> nth=0"); pg.wait_for_selector(".payload"); pg.click("[data-dlg=yes]")
    pg.wait_for_selector(".msg.assistant .foot", timeout=10000)
    payload = json.dumps(sent[-1], ensure_ascii=False)
    leaks = [x for x in REAL_DATA if x in payload]
    check(not leaks, f"sin datos reales en el envío {leaks if leaks else ''}")
    check(sent[-1].get("provider") == {"zdr": True, "data_collection": "deny"}, "ZDR activo en OpenRouter")
    check(sent[-1].get("reasoning") == {"effort": "low"}, "razonamiento bajo en OpenRouter")
    check("Rosa Elena Quispe Rojas" in pg.inner_text("#msgs"), "respuesta restaurada con datos reales en pantalla")

    pg.click("[data-action=propose-memory]"); pg.wait_for_selector(".payload"); pg.click("[data-dlg=yes]")
    pg.wait_for_selector("[data-prop]", timeout=10000); pg.click("[data-dlg=yes]"); pg.wait_for_timeout(500)
    check(pg.input_value("[data-bind=estado]") == "MOCK-ESTADO", "actualizar memoria aplica cambios aprobados")
    check("Julio César Huamán Torres" in pg.input_value('[data-bind="memoria.hechos"]'), "memoria restaurada con nombres reales")

    pg.click("[data-action=open-settings]"); pg.wait_for_timeout(300)
    pg.click(".settings [data-action=show-keyguide]"); pg.wait_for_timeout(200)
    check(pg.query_selector("details.guide[open]") is not None, "guía de keys abre la sección del proveedor")
    pg.click("[data-action=dlg-close]")

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
