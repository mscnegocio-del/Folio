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
            if "seguirá en una nueva" in text:
                content = json.dumps({"resumen_conversacion": "MOCK-RESUMEN: [PERSONA_1] pidió el esquema de absolución; falta el perito.",
                                      "pendientes_nuevos": ["MOCK-PEND-F4"], "plazos_nuevos": []})
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps({"choices": [{"message": {"content": content}}]}))
        if "borrador de escrito" in body["messages"][-1]["content"]:
            chunks = ["SUMILLA: Absuelvo traslado y ofrezco medios probatorios\n\n", "SEÑOR JUEZ DEL JUZGADO DE PAZ LETRADO:\n\n",
                      "[PERSONA_1], en el proceso seguido contra [PERSONA_2], digo:\n\n", "## I. Petitorio\n", "Solicito [precisar el monto de la pensión].\n"]
            sse = "".join("data: " + json.dumps({"choices": [{"delta": {"content": c}}]}) + "\n\n" for c in chunks) + "data: [DONE]\n\n"
            return route.fulfill(status=200, headers={"content-type": "text/event-stream"}, body=sse)
        chunks = ["**MOCK.** [PERSONA_1] demanda alimentos contra [PERSONA_2].\n\n", "- Verifica plazos con tu SINOE.\n",
                  "- Según el artículo 481 del Código Civil, el juez regula los alimentos.\n- El artículo 472 del Código Civil dice: \"Se entiende por alimentos lo indispensable para el sustento y la vivienda digna del menor en todo momento del proceso\".\n",
                  "- Revisa el artículo 108-B del Código Penal, el artículo 296 del Código Penal y el artículo 999 del Código Civil.\n- No apliques el Código Civil español ni la Ley N° 12345.\n"]
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
    pg.click("[data-action=load-sample]"); pg.wait_for_selector(".inicio"); pg.wait_for_timeout(500)
    # v0.6 · F2: tres zonas; el expediente abre en su Inicio con la Ficha al lado
    v6 = lambda k: pg.get_attribute("#v6", "data-" + k)
    check(v6("vista") == "inicio" and v6("ficha") == "abierta" and "riel" not in pg.get_attribute("#v6", "class"), "tres zonas: el expediente abre en Inicio con la ficha abierta (1440 px)")
    check(pg.inner_text("#cab .titulo") == "Inicio del expediente" and "00845-2026-0-1501-JP-FC-01" in pg.inner_text("#cab .miga"), "encabezado de una línea con el número del expediente")
    check(pg.inner_text(".inicio h1") == "Alimentos" and "(tu cliente)" in pg.inner_text(".inicio .imeta"), "inicio: carátula, cliente y estado en una línea")
    check(pg.locator(".barra .exp.on + .convs .conv.nueva").count() == 1, "barra: el expediente activo despliega «+ Nueva conversación»")
    check("Próximo plazo" in pg.text_content(".ficha") and pg.locator(".ficha .plazo").count() == 1 and "[PERSONA_1]" in pg.inner_text(".ficha"), "ficha: estado, próximo plazo y partes con su marcador")
    check(pg.inner_text(".inicio .atajo >> nth=0").startswith("Preparar:") and pg.locator(".inicio .atajo", has_text="/pegar-cej").count() == 1, "inicio: atajos según el caso y /pegar-cej")
    check(pg.locator(".caja .cchip.on", has_text="Biblioteca").count() == 1 and "OpenRouter" in pg.inner_text(".caja .destino"), "caja: chips de contexto y píldora de destino")
    check(pg.query_selector(".privacy-pill") is None and "Cifrado en este equipo" in pg.inner_text(".barra .pie"), "privacidad una sola vez en el pie de la barra")
    pg.screenshot(path=str(SHOTS / "01-expediente.png"))
    pg.click(".pie [data-action=privacy]"); pg.wait_for_selector("#dlg .checks")
    check("cifrado" in pg.inner_text("#dlg") and "OpenRouter" in pg.inner_text("#dlg"), "privacidad: ventana con el detalle del expediente")
    pg.click("#dlg [data-action=dlg-close]")

    pg.click(".inicio .atajo >> nth=0"); pg.wait_for_selector("#velo-envio .envio")
    prev = pg.inner_text("#velo-envio")
    check("BÚSQUEDA DE NORMAS" in prev and "=== PREGUNTA ===" in prev and "[PERSONA_1]" in prev and "Rosa Elena" not in pg.inner_text("#velo-envio .envio"), "vista previa: texto exacto con marcadores, búsqueda de normas y pregunta")
    check("Modelo de terceros: Claude Sonnet 5.5 de Anthropic, vía OpenRouter, con tu cuenta" in prev and pg.is_checked("#envio-revisar"), "vista previa: modelo de terceros y «Revisar siempre antes de enviar»")
    pg.click("#velo-envio .reemp summary >> nth=0"); check("Rosa Elena Quispe Rojas" in pg.inner_text("#velo-envio .reemp >> nth=0"), "vista previa: los reemplazos solo los ves tú")
    pg.screenshot(path=str(SHOTS / "20-vista-previa.png"))
    pg.click("[data-action=envio-enviar]")
    pg.wait_for_selector(".resp .recibo", timeout=10000)
    check(v6("vista") == "chat" and pg.locator("#hilo .yo").count() == 1, "inicio: el atajo abre una conversación nueva")
    payload = json.dumps(sent[-1], ensure_ascii=False)
    leaks = [x for x in REAL_DATA if x in payload]
    check(not leaks, f"sin datos reales en el envío {leaks if leaks else ''}")
    check(sent[-1].get("provider") == {"zdr": True, "data_collection": "deny"}, "ZDR activo en OpenRouter")
    check(sent[-1].get("reasoning") == {"effort": "low"}, "razonamiento bajo en OpenRouter")
    check("Rosa Elena Quispe Rojas" in pg.inner_text("#hilo"), "respuesta restaurada con datos reales en pantalla")
    planner = json.dumps(sent[-2], ensure_ascii=False)
    check("buscador de normas" in planner and not [x for x in REAL_DATA if x in planner], "biblioteca: búsqueda de normas sin datos reales")
    check("NORMAS PERUANAS" in payload and "Los alimentos se regulan por el juez" in payload and "Se entiende por alimentos" in payload, "biblioteca: artículos del plan y de la búsqueda local en el envío")
    check("Esta línea es una concordancia" not in payload, "biblioteca: sin concordancias del SPIJ")
    titulo = pg.inner_text("#cab .titulo")
    check(titulo.startswith("Ayúdame a preparar") and pg.inner_text(".barra .conv.on") == titulo, "conversación: título local en el encabezado y en la barra")
    recibo = pg.inner_text(".resp .recibo")
    check("Enviado a OpenRouter con tu cuenta · Claude Sonnet 5.5 ·" in recibo and "datos reemplazados" in recibo, "recibo bajo la respuesta: destino, modelo de terceros y datos reemplazados")
    leyo = pg.inner_text(".resp .leyo")
    check(leyo.startswith("Leyó la memoria") and "artículo" in leyo and pg.is_hidden(".resp .leyo-lista"), "«Leyó la memoria…» sobre la respuesta")
    pg.click(".resp .leyo"); check(pg.is_visible(".resp .leyo-lista") and "Biblioteca:" in pg.inner_text(".resp .leyo-lista"), "«Leyó…» se despliega con cada fuente")
    check(pg.locator(".resp .verif", has_text="Folio no calcula plazos").count() == 1, "bloque ámbar: Folio no calcula plazos")
    ok = ".resp .cita:not(.warn):not(.bad):not(.info)"
    check(pg.locator(".resp li .cita:not(.warn):not(.bad):not(.info)", has_text="Art. 481 CC").count() == 1 and "✓ vigente" in pg.text_content(f"{ok} >> nth=0"), "citas en línea: artículo vigente en su párrafo")
    check(pg.locator(".cita.warn", has_text="472").count() == 1, "citas: cita textual distinta marcada")
    check(pg.locator(".cita.warn", has_text="108-B").count() == 1, "citas: cambio que aún no rige marcado")
    check(pg.locator(".cita.bad", has_text="999").count() == 1, "citas: artículo inexistente marcado")
    check(pg.locator(".cita.bad", has_text="español").count() == 1, "citas: norma extranjera marcada")
    check(pg.locator(".cita.info", has_text="12345").count() == 1, "citas: norma fuera de la biblioteca marcada")
    check(pg.locator(".cita.info", has_text="296").count() == 1 and pg.locator(".cita.bad", has_text="296").count() == 0, "citas: artículo de una norma incompleta no se marca como inexistente")
    pg.screenshot(path=str(SHOTS / "08-citas.png"))
    pg.click(f"{ok} >> nth=0"); pg.wait_for_selector(".ficha .fuente .texto-ley")
    fuente = pg.inner_text(".ficha .fuente")
    check(v6("modo") == "fuente" and "Los alimentos se regulan" in fuente and "no es una edición oficial" in fuente and "fuente oficial" in fuente, "cita → Ficha en modo Fuente con texto, vigencia y enlace oficial")
    pg.screenshot(path=str(SHOTS / "14-fuente.png"))
    pg.click(".ficha [data-action=ficha-volver]"); check(v6("modo") == "ficha" and pg.locator(".ficha .ftabs").count() == 1, "fuente: volver a la ficha")
    check(normas_requests and all(r["method"] == "GET" and not r["body"] for r in normas_requests), "biblioteca: descargas GET sin datos del abogado")

    # v0.6 · F3: "Ver lo que se envió", chips que definen qué sale, @ para citar, / para acciones
    pg.click(".resp .recibo [data-action=ver-envio]"); pg.wait_for_selector("#velo-envio")
    ve = pg.inner_text("#velo-envio")
    check("Lo que se envió a OpenRouter" in ve and "=== PREGUNTA ===" in ve and "Art. 481 CC" in ve and pg.query_selector("[data-action=envio-enviar]") is None, "«Ver lo que se envió»: texto guardado con las normas enviadas")
    pg.keyboard.press("Escape"); check(pg.query_selector("#velo-envio") is None, "vista previa: Esc la cierra")
    pg.click(".cchip[data-k=biblioteca]"); pg.click(".cchip[data-k=memoria]")
    check(pg.locator(".cchip.on").count() == 1, "chips: se desactivan memoria y biblioteca")
    pg.click(".caja .destino"); pg.wait_for_selector("#velo-envio")
    check(pg.is_disabled("[data-action=envio-enviar]"), "píldora de destino: vista previa sin consulta escrita no deja enviar")
    pv = pg.inner_text("#velo-envio .envio")
    check("NORMAS" not in pv and "no compartió la memoria" in pv and "Resumen del caso" not in pv, "chips: sin memoria ni biblioteca, la vista previa no las incluye")
    pg.click("#velo-envio [data-action=envio-cerrar] >> nth=0")
    pg.fill("#q", ""); pg.type("#q", "Revisa @Dem")
    check(pg.is_visible("#menu-caja") and "Demanda de alimentos (ejemplo).txt" in pg.inner_text("#menu-caja"), "@: menú para citar documentos y movimientos")
    pg.keyboard.press("Enter"); val = pg.input_value("#q")
    check("@«Demanda de alimentos (ejemplo).txt»" in val and pg.is_hidden("#menu-caja"), "@: Enter inserta la cita del documento")
    pg.click(".cchip[data-k=docs]")
    n0 = len(sent); pg.focus("#q"); pg.keyboard.press("End"); pg.keyboard.press("Enter"); pg.wait_for_selector("#velo-envio"); pg.click("[data-action=envio-enviar]")
    pg.wait_for_function(f"document.querySelectorAll('#hilo .resp .recibo').length >= 2", timeout=10000)
    body = json.dumps(sent[-1], ensure_ascii=False)
    check(len(sent) == n0 + 1 and "NORMAS PERUANAS" not in body and "buscador de normas" not in json.dumps(sent[n0:], ensure_ascii=False), "chips: sin biblioteca no hay búsqueda de normas ni artículos")
    check("Demanda de alimentos (ejemplo).txt" in body and "PETITORIO" in body and "Resumen del caso" not in body, "@: el documento citado va aunque los documentos estén desactivados; la memoria no")
    ly = pg.locator("#hilo .resp").last.locator(".leyo").text_content()
    check(ly.startswith("Leyó") and "la memoria" not in ly and "1 documento" in ly, "«Leyó…» refleja lo que se envió")
    for k in ["memoria", "docs", "biblioteca"]: pg.click(f".cchip[data-k={k}]")
    pg.fill("#q", "/"); pg.dispatch_event("#q", "input")
    check(pg.locator("#menu-caja button").count() == 4 and "verificar plazos y normas" in pg.inner_text("#menu-caja .t"), "/: acciones con nombre jurídico y recordatorio")
    pg.type("#q", "prep"); pg.keyboard.press("Enter")
    check(pg.input_value("#q").startswith("Prepara los puntos para la audiencia") and "verificar los plazos" in pg.input_value("#q"), "/: la acción llena la consulta con su recordatorio de verificar")
    pg.fill("#q", "")
    pg.click(".caja .destino"); pg.wait_for_selector("#envio-revisar"); pg.uncheck("#envio-revisar"); pg.click("#velo-envio [data-action=envio-cerrar] >> nth=0")
    check(pg.evaluate("S.settings.review") is False, "«Revisar siempre antes de enviar» se cambia desde la vista previa")
    pg.evaluate("S.settings.review=true;saveSettings()")
    pg.click(".prop [data-action=propose-memory]"); pg.wait_for_selector("#velo-envio .envio"); pg.click("[data-action=envio-enviar]")
    pg.wait_for_selector("[data-prop]", timeout=10000); pg.click("[data-dlg=yes]"); pg.wait_for_timeout(500)
    check("MOCK-ESTADO" in pg.inner_text(".ficha .fest"), "la ficha muestra el nuevo estado procesal")
    pg.click(".ficha [data-action=vista-memoria]"); pg.wait_for_selector("[data-bind=estado]")
    check(v6("vista") == "memoria" and pg.input_value("[data-bind=estado]") == "MOCK-ESTADO", "actualizar memoria aplica cambios aprobados (memoria completa)")
    check("Julio César Huamán Torres" in pg.input_value('[data-bind="memoria.hechos"]'), "memoria restaurada con nombres reales")
    pg.screenshot(path=str(SHOTS / "13-memoria.png"))
    pg.click("[data-action=vista-volver]"); check(v6("vista") == "chat", "memoria completa: volver a la conversación")

    # v0.6 · F1: conversaciones por expediente, propuestas e historial de la memoria, última visita
    d = pg.evaluate("""async()=>{const e=await store.get('exp:'+S.exp.id),c=e.chats.find(x=>x.id===e.chatActivo);
      return {chats:e.chats.filter(x=>x.mensajes.length).length,tieneChat:'chat' in e,titulo:c.titulo,msgs:c.mensajes.length,hist:e.memoria.historial.map(h=>h.seccion+':'+(h.chatId===c.id)),
              props:e.memoria.propuestas.map(p=>p.estado),visita:!!e.ultimaVisita,frags:c.mensajes.find(m=>m.meta).meta.frags}}""")
    check(d["chats"] == 1 and not d["tieneChat"] and d["msgs"] >= 2, "conversaciones: los mensajes viven en la conversación activa")
    check(len(d["titulo"]) > 0 and isinstance(d["frags"], list), "conversaciones: título local y documentos leídos guardados")
    check(sorted(d["hist"]) == ["estado:true", "hechos:true", "pend:true"], "memoria: historial de cambios aprobados con su conversación de origen")
    check(d["props"] == ["aplicada"] * 3 and d["visita"], "memoria: propuestas marcadas como aplicadas y visita registrada")
    u = pg.evaluate("""()=>{const e=structuredClone(S.exp),m=e.memoria,h=m.historial.find(x=>x.seccion==='pend'),n=m.pendientes.length;
      const ok1=undoMemoryChange(e,h.id)&&m.pendientes.length===n-1&&!undoMemoryChange(e,h.id);
      const h2=applyMemoryChange(e,{k:'hechos',v:'Hecho de prueba'},null);const ok2=undoMemoryChange(e,h2.id)&&!m.hechos.includes('Hecho de prueba');
      const h3=applyMemoryChange(e,{k:'estrategia',v:'Línea nueva'},null);m.estrategia+=' (editado por el abogado)';const ok3=!undoMemoryChange(e,h3.id);
      return ok1&&ok2&&ok3}""")
    check(u, "memoria: deshacer revierte el cambio y no pisa lo que el abogado editó después")
    orig = pg.evaluate("S.exp.id")
    m = pg.evaluate("""async()=>{const e=structuredClone(S.exp);e.id='legado-1';e.chat=e.chats.find(c=>c.mensajes.length).mensajes;
      ['chats','chatActivo','ultimaVisita'].forEach(k=>delete e[k]);delete e.memoria.historial;delete e.memoria.propuestas;e.updatedAt='2026-01-01T00:00:00.000Z';
      await store.put('exp:legado-1',e);S.index.push({id:'legado-1',numero:'LEGADO',titulo:'Legado',materia:'',ejemplo:false,updatedAt:e.updatedAt,plazos:[]});await store.put('index',S.index);
      await openExp('legado-1');const x=await store.get('exp:legado-1'),p1=x.ultimaVisita;S.exp=null;await openExp('legado-1');
      return {chats:x.chats.length,titulo:x.chats[0].titulo,n:x.chats[0].mensajes.length,tieneChat:'chat' in x,hist:Array.isArray(x.memoria.historial)&&Array.isArray(x.memoria.propuestas),
              activo:x.chatActivo===x.chats[0].id,upd:x.updatedAt,previa:S.visitaPrevia===p1&&!!p1}}""")
    check(m["chats"] == 1 and m["titulo"] == "Conversación anterior" and m["n"] >= 2 and not m["tieneChat"] and m["activo"] and m["hist"],
          "migración: el chat de versiones anteriores pasa a «Conversación anterior»")
    check(m["upd"] == "2026-01-01T00:00:00.000Z" and m["previa"], "migración: abrir no cambia la fecha de modificación y recuerda la visita anterior")
    check(pg.locator(".lista-conv .lc", has_text="Conversación anterior").count() == 1 and pg.locator(".inicio .nov").count() == 1, "migración: la conversación anterior aparece en el Inicio, con «Desde tu última visita»")
    pg.click(".lista-conv .lc >> nth=0"); check(pg.locator("#hilo .resp").count() >= 1, "migración: la conversación anterior se abre en el hilo")
    pg.evaluate("""async(id)=>{await store.del('exp:legado-1');S.index=S.index.filter(x=>x.id!=='legado-1');await store.put('index',S.index);await openExp(id)}""", orig)

    # Ficha: pestañas Documentos y Movimientos como listas simples
    pg.click(".ficha [data-tab=movs]"); check(pg.locator(".ficha .li").count() == 4 and "4" in pg.inner_text(".ficha [data-tab=movs]"), "ficha: movimientos en lista")
    pg.click(".ficha [data-tab=docs]"); check(pg.locator(".ficha .li").count() == 1 and pg.locator(".ficha [data-action=pick-file]").count() == 1, "ficha: documentos en lista")
    pg.click(".ficha [data-tab=ficha]")

    # Conversación nueva: "El agente parte de", borrador al lado y guardado como documento
    pg.click(".barra .conv.nueva"); pg.wait_for_selector("#hilo .ya")
    check(v6("vista") == "chat" and pg.inner_text("#cab .titulo") == "Nueva conversación" and pg.inner_text(".barra .conv.on") == "Nueva conversación", "nueva conversación: «El agente parte de» y entrada activa en la barra")
    pg.screenshot(path=str(SHOTS / "15-nueva.png"))
    pg.fill("#q", "Prepara un borrador de escrito para absolver el traslado"); pg.keyboard.press("Enter")
    pg.wait_for_selector("#velo-envio"); pg.click("[data-action=envio-enviar]"); pg.wait_for_selector(".resp .borr", timeout=10000)
    check(pg.locator(".resp .verif").count() == 0, "sin bloque de plazos cuando la respuesta no habla de plazos")
    pg.click(".resp .borr [data-action=abrir-borrador]"); pg.wait_for_selector(".ficha .escrito")
    check(v6("modo") == "borrador" and pg.locator(".escrito .hueco").count() == 1 and pg.locator(".escrito .sum").count() == 1, "borrador: se abre al lado con huecos resaltados")
    pg.wait_for_timeout(400); w = pg.evaluate("getComputedStyle(document.querySelector('#ficha')).width")
    check(w == "520px", f"borrador: la ficha se ensancha a 520 px ({w})")
    pg.screenshot(path=str(SHOTS / "16-borrador.png"))
    pg.click("[data-action=borr-guardar]"); pg.wait_for_timeout(300)
    check(pg.evaluate("S.exp.docs.length") == 2 and pg.is_disabled("[data-action=borr-guardar]"), "borrador: «Guardar como documento» lo agrega al expediente")
    pg.set_viewport_size({"width": 1366, "height": 860}); pg.wait_for_timeout(300)
    check("riel" in pg.get_attribute("#v6", "class"), "riel: en modo Borrador bajo 1440 px la barra pasa a íconos")
    pg.click(".ficha [data-action=ficha-volver]"); pg.wait_for_timeout(100)
    check("riel" not in pg.get_attribute("#v6", "class"), "riel: con la ficha normal a 1366 px vuelve la barra completa")
    pg.set_viewport_size({"width": 1200, "height": 860}); pg.wait_for_timeout(300)
    check("riel" in pg.get_attribute("#v6", "class"), "riel: con la ficha abierta bajo 1280 px")
    pg.screenshot(path=str(SHOTS / "17-riel.png"))
    pg.click("#cab [data-action=toggle-ficha]"); pg.wait_for_timeout(300)
    check(v6("ficha") == "cerrada" and "riel" not in pg.get_attribute("#v6", "class"), "ficha plegable: al cerrarla vuelve la barra completa")
    pg.click("#cab [data-action=toggle-ficha]"); pg.set_viewport_size({"width": 1440, "height": 900}); pg.wait_for_timeout(200)

    # ⋯ de la conversación: renombrar
    pg.click("#cab [data-action=chat-menu]"); pg.fill("#cv-t", "Escrito de absolución"); pg.click("[data-dlg=yes]"); pg.wait_for_timeout(200)
    check(pg.inner_text("#cab .titulo") == "Escrito de absolución" and pg.locator(".barra .conv", has_text="Escrito de absolución").count() == 1, "conversación: renombrar desde ⋯")

    # Hoy: fechas registradas y plazos propuestos por confirmar en todos los expedientes
    pg.evaluate("""async()=>{const e=S.exp;addProposals(e,[{k:'plazo',v:'Absolver el traslado',fecha:'2026-12-01'}],activeChat(e).id);await saveExp()}""")
    pg.click(".barra .nav-hoy"); pg.wait_for_selector(".hoy")
    check(v6("vista") == "hoy" and pg.locator(".hoy .grupo", has_text="Fechas que registraste").locator(".fila-hoy").count() == 2, "hoy: fechas registradas de los próximos días")
    check(pg.locator(".hoy .grupo", has_text="Plazos por confirmar").count() == 1 and "Folio no calcula plazos" in pg.inner_text(".hoy .nota"), "hoy: plazos propuestos por confirmar y aviso de que Folio no calcula plazos")
    check(pg.inner_text(".barra .nav-hoy .cnt") == "3" and pg.get_attribute("#v6", "data-vista") == "hoy", "hoy: contador en la barra")
    pg.screenshot(path=str(SHOTS / "18-hoy.png"))
    pg.click(".hoy .grupo:has-text('Plazos por confirmar') .fila-hoy"); pg.wait_for_selector("#hilo")
    check(v6("vista") == "chat" and v6("ficha") == "abierta" and pg.inner_text("#cab .titulo") == "Escrito de absolución", "hoy: «Revisar» abre la conversación de origen con la ficha")

    # F4 · ventana de contexto: nada bajo 70 %, línea tranquila, ámbar desde 90 %, "Seguir en una nueva" con resumen
    check(pg.locator(".larga").count() == 0 and pg.evaluate("usoContexto(S.exp)") < 70, "contexto: bajo el 70 % no se muestra nada")
    def presupuesto_para(pct):
        pg.evaluate("p=>{const u=usoContexto(S.exp)*S.settings.contextoMax/100;S.settings.contextoMax=Math.round(u*100/p);renderCentro()}", pct)
    presupuesto_para(80)
    u = pg.evaluate("usoContexto(S.exp)")
    check(pg.locator(".larga:not(.alta)").count() == 1 and pg.locator(".larga .pb.tinta", has_text="Seguir en una nueva").count() == 1 and "Esta conversación ya es larga" in pg.inner_text(".larga"), f"contexto: línea tranquila desde el 70 % ({u} %)")
    check(pg.get_attribute("#cab [data-action=chat-menu]", "title") == f"Contexto usado: {u} % del presupuesto de esta conversación", "contexto: el porcentaje está en el menú ⋯")
    pg.screenshot(path=str(SHOTS / "19-larga.png"))
    pg.click(".larga [data-action=seguir-aqui]"); check(pg.locator(".larga").count() == 0, "contexto: «Seguir aquí» oculta la línea")
    presupuesto_para(95)
    check(pg.locator(".larga.alta").count() == 1 and pg.locator(".larga .pb.prim", has_text="Seguir en una nueva").count() == 1, "contexto: al 90 % la línea vuelve en ámbar con «Seguir en una nueva» como acción principal")
    pg.screenshot(path=str(SHOTS / "20-limite.png"))
    presupuesto_para(400)
    t = pg.evaluate("textoEnvio(prepararEnvio('Consulta de prueba'))")
    check("no caben en el presupuesto" in t and pg.evaluate("prepararEnvio('x').fuera") == 2, "contexto: al pasar el 100 % van los mensajes que caben y la vista previa dice cuántos quedaron fuera")
    presupuesto_para(95)
    n_sent = len(sent); prev_id = pg.evaluate("activeChat(S.exp).id")
    pg.click(".larga [data-action=seguir-nueva]"); pg.wait_for_selector("#velo-envio")
    check(not any(x in pg.inner_text("#velo-envio .envio") for x in REAL_DATA) and "[PERSONA_1]" in pg.inner_text("#velo-envio .envio"), "seguir en una nueva: revisión previa seudonimizada")
    pg.click("[data-action=envio-enviar]"); pg.wait_for_selector("#dlg .proposal", timeout=10000)
    check(len(sent) == n_sent + 1 and not any(x in json.dumps(sent[-1], ensure_ascii=False) for x in REAL_DATA), "seguir en una nueva: una sola consulta, sin datos reales")
    pg.click("[data-dlg=yes]"); pg.wait_for_selector("#hilo .continua", timeout=10000)
    f4 = pg.evaluate("""p=>{const e=S.exp,c=activeChat(e),prev=e.chats.find(x=>x.id===p);return {deChat:c.deChat===p,vacia:!c.mensajes.length,resumen:prev.resumen||'',
      pend:e.memoria.pendientes.some(x=>x.text==='MOCK-PEND-F4'),sys:prepararEnvio('¿Qué falta?').system0}}""", prev_id)
    check(f4["deChat"] and f4["vacia"] and "Rosa Elena" in f4["resumen"] and "Escrito de absolución" in pg.inner_text("#hilo .continua"), "seguir en una nueva: se abre una conversación que continúa la anterior, con el resumen guardado")
    check("MOCK-RESUMEN" in pg.inner_text("#hilo .ya") and f4["pend"], "seguir en una nueva: «El agente parte de» muestra el resumen y la memoria aplicó lo aprobado")
    check("RESUMEN DE LA CONVERSACIÓN ANTERIOR" in f4["sys"] and "[PERSONA_1] pidió" in f4["sys"] and "Rosa" not in f4["sys"], "seguir en una nueva: el resumen va al agente en la conversación nueva, seudonimizado")
    pg.screenshot(path=str(SHOTS / "21-sigue.png"))
    pg.evaluate("async()=>{S.settings.contextoMax=60000;await saveSettings()}")

    pg.click(".pie [data-action=open-settings]"); pg.wait_for_selector(".settings")
    check(v6("vista") == "ajustes" and pg.inner_text("#cab .titulo") == "Ajustes", "ajustes en la zona central")
    check(pg.locator("select[data-setting=contextoMax] option[selected]").get_attribute("value") == "60000", "ajustes: presupuesto de contexto (60 000 recomendado)")
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
    pg.click(".settings [data-action=close-settings]"); check(v6("vista") == "chat", "ajustes: volver a donde estabas")

    pg.click(".pie [data-action=lock-now]"); pg.wait_for_selector(".lock")
    pg.fill("input[name=pass]", "clave-incorrecta"); pg.click("[data-form=unlock] button"); pg.wait_for_timeout(1500)
    check("no coincide" in pg.inner_text("#lock-err"), "contraseña incorrecta rechazada")
    pg.fill("input[name=pass]", PASS); pg.click("[data-form=unlock] button"); pg.wait_for_selector(".inicio", timeout=15000)
    check(pg.locator(".lista-conv .lc").count() == 2, "datos persisten tras desbloquear")
    pg.keyboard.press("Control+k"); check(pg.evaluate("document.activeElement.id") == "q-exp", "Ctrl K enfoca el buscador de expedientes")
    pg.keyboard.type("no-existe"); check("Ningún expediente coincide" in pg.inner_text(".barra .exps"), "buscador filtra la lista de expedientes")
    pg.fill("#q-exp", "")
    raw = pg.evaluate("async()=>{let o='';for(const k of await DB.keys())o+=JSON.stringify(await DB.get(k));return o}")
    check(not any(x in raw for x in ["Rosa", "45879632", "sk-or-v1-test"]), "IndexedDB sin texto plano ni key")
    with pg.expect_download() as dl:
        pg.click(".pie [data-action=open-settings]"); pg.wait_for_timeout(200); pg.click("[data-action=export-backup]")
    data = json.load(open(dl.value.path()))
    check(data.get("format") == "folio-respaldo" and "vault" in data["records"], "copia de seguridad válida")
    ctx.close()

    # T-201: si cambió la versión de los avisos, se piden de nuevo al desbloquear
    r = b.new_context(viewport={"width": 1280, "height": 860}); rp = r.new_page()
    rp.on("pageerror", lambda e: errors.append("re-aceptación: " + str(e))); rp.route("**/*", handle)
    onboarding(rp, with_provider=False)
    rp.evaluate("async()=>{const c=await DB.get('consent');c.policyVersion='2026-09-30 (borrador)';await DB.put('consent',c)}")
    rp.click(".pie [data-action=lock-now]"); rp.wait_for_selector(".lock")
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
    rp.click(".pie [data-action=lock-now]"); rp.wait_for_selector(".lock")
    rp.fill("input[name=pass]", PASS); rp.click("[data-form=unlock] button"); rp.wait_for_selector(".empty", timeout=15000)
    check(rp.query_selector(".reconsent") is None, "re-aceptación: no se vuelve a pedir tras aceptar")
    r.close()

    # Aviso de nueva versión: no bloquea, explica cómo actualizar y se puede posponer
    u = b.new_context(viewport={"width": 1280, "height": 860}); up = u.new_page()
    up.on("pageerror", lambda e: errors.append("actualización: " + str(e))); up.route("**/*", handle)
    onboarding(up, with_provider=False); up.wait_for_selector(".update-bar", timeout=10000)
    check("9.9.9" in up.inner_text(".update-bar"), "actualización: aviso de nueva versión visible")
    check(all(r["method"] == "GET" and not r["body"] for r in update_requests), "actualización: consulta GET sin datos")
    up.click("[data-action=load-sample]"); up.wait_for_selector(".inicio")
    check(up.query_selector(".update-bar") is not None, "actualización: se puede seguir trabajando con el aviso")
    up.click("[data-action=update-how]"); up.wait_for_selector(".update-steps")
    check(up.get_attribute(".update-steps a.btn", "href").endswith("/v9.9.9/folio.html"), "actualización: enlace de descarga al archivo nuevo")
    up.screenshot(path=str(SHOTS / "06-actualizar.png")); up.click("[data-action=dlg-close]")
    up.click("[data-action=update-later]"); up.wait_for_timeout(200)
    check(up.query_selector(".update-bar") is None, "actualización: 'Más tarde' oculta el aviso")
    n = len(update_requests)
    up.click(".pie [data-action=lock-now]"); up.wait_for_selector(".lock")
    up.fill("input[name=pass]", PASS); up.click("[data-form=unlock] button"); up.wait_for_selector(".inicio", timeout=15000); up.wait_for_timeout(400)
    check(len(update_requests) == n and up.query_selector(".update-bar") is not None, "actualización: no repite la consulta en 12 h y recuerda el aviso")
    u.close()

    m = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); mp = m.new_page()
    mp.on("pageerror", lambda e: errors.append("móvil: " + str(e))); mp.route("**/*", handle)
    onboarding(mp, with_provider=False)
    mp.click("[data-action=load-sample]"); mp.wait_for_selector(".inicio"); mp.wait_for_timeout(400)
    nowrap = lambda: mp.evaluate("document.documentElement.scrollWidth <= innerWidth && document.querySelector('#scroll').scrollWidth <= document.querySelector('#scroll').clientWidth + 1")
    check(nowrap(), "móvil sin desborde horizontal")
    check(mp.locator(".barra").bounding_box()["x"] < -200 and mp.is_visible("#cab [data-action=toggle-side]"), "móvil: una sola columna, la barra se abre con ☰")
    check("Conecta tu proveedor" in mp.inner_text(".inicio .sin-prov"), "móvil: sin proveedor, la caja invita a conectarlo")
    mp.screenshot(path=str(SHOTS / "02-movil.png"))
    mp.click("#cab [data-action=toggle-side]"); mp.wait_for_timeout(300)
    check(mp.locator(".barra").bounding_box()["x"] >= 0 and mp.is_visible(".velo-m"), "móvil: ☰ abre los expedientes con velo")
    mp.click(".velo-m", position={"x": 360, "y": 400}); mp.wait_for_timeout(300)
    check(mp.get_attribute("#v6", "data-side") == "cerrado", "móvil: tocar fuera cierra los expedientes")
    mp.click("#cab [data-action=toggle-ficha]"); mp.wait_for_timeout(350)
    box = mp.locator(".ficha").bounding_box()
    check("ficha-movil" in mp.get_attribute("#v6", "class") and box and box["y"] < 200 and box["width"] >= 389, "móvil: la ficha se abre como hoja")
    mp.screenshot(path=str(SHOTS / "11-ficha-movil.png"))
    mp.keyboard.press("Escape"); mp.wait_for_timeout(300)
    check("ficha-movil" not in mp.get_attribute("#v6", "class"), "móvil: Esc cierra la hoja de la ficha")
    mp.click("#cab [data-action=toggle-ficha]"); mp.wait_for_timeout(300); mp.click(".ficha [data-action=vista-memoria]"); mp.wait_for_timeout(200)
    check(nowrap(), "móvil sin desborde en la memoria completa")
    m.close()

    d = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme="dark"); dp = d.new_page(); dp.route("**/*", handle)
    dp.on("pageerror", lambda e: errors.append("oscuro: " + str(e)))
    onboarding(dp, with_provider=False); dp.screenshot(path=str(SHOTS / "03-oscuro.png"))
    dp.click("[data-action=load-sample]"); dp.wait_for_selector(".inicio"); dp.wait_for_timeout(400)
    dp.screenshot(path=str(SHOTS / "04-oscuro-expediente.png"))
    dp.click(".barra .nav-hoy"); dp.wait_for_timeout(200); dp.screenshot(path=str(SHOTS / "19-oscuro-hoy.png"))
    dp.click(".secc [data-action=new-exp]"); dp.fill("#dlg [name=numero]", "01234-2026-0-1501-JR-CI-01"); dp.click("[data-dlg=yes]"); dp.wait_for_selector(".inicio")
    check("Todavía no conversas" in dp.inner_text(".inicio") and dp.locator(".barra .exp").count() == 2, "expediente nuevo: abre en su Inicio y aparece en la barra")
    dp.screenshot(path=str(SHOTS / "12-oscuro-nuevo.png"))
    b.close()

check(not font_requests, "sin solicitudes a Google Fonts (tipografías incluidas)")
check(not errors, f"sin errores de JavaScript {errors if errors else ''}")
print(f"\n{'TODO OK' if not failures else str(len(failures)) + ' FALLAS'}")
sys.exit(1 if failures else 0)
