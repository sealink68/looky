"""Looky Playwright tests: PC (FS Access mock), iPhone + iPad (no FS Access, file input), offline, language.
Run: /workspace/pwenv/bin/python tools/pwtest/test.py"""
import json, os, sys, threading, http.server, functools, subprocess, tempfile
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MOCK = os.path.join(ROOT, "tools/pwtest/mock.js")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:8766/index.html"
res = []
def ok(n, c): res.append((n, bool(c))); print(("PASS " if c else "FAIL ") + n)
ok("sw.js precache up to date", subprocess.run([sys.executable, os.path.join(ROOT, "tools/gen_precache.py"), "--check"]).returncode == 0)
TREE = {"ESC_Share": {
  "projecten": {
    "Kentaur": {"D12345": {"Kentaur_FTS-E01_D12345_2026-01-02_1030.xml": [10, 300], "Kentaur_FTS-E01_D12345_2026-01-05_0900.PRD": [12, 100],
                           "Kentaur_FTS-E01_D12345_info.pdf": [2000, 200], "Schuifdeur handleiding Janssens.PDF": [5000, 50]}},
    "Kerberos": {"D777": {"Kerberos_TPB-E01_D777_2026-02-01_1200.dat": [7, 20], "Klant Dupont – Motor schéma.vsdx": [900, 10]},
                 "TPB-M04": {"D900": {"config.kmc": [20, 4000], "params.eep": [15, 4100], "handleiding.pdf": [100, 4200], "extra.xml": [8, 4300]}}},
    "Gallenschütz": {"ETS21": {"board.pdf": [30, 4400]}},
    "ESC-param": {}},
  "Algemeen": {"Firmware": {"ctrl_v2.mot": [100, 5], "readme.txt": [3, 1000]}, "~$lock.docx": [1, 1], "Thumbs.db": [1, 1],
               "notes.tmp": [1, 1], "upload.bin.tmp.driveupload": [2, 1], "download.bin.tmp.drivedownload": [2, 1], "desktop.ini": [1, 1],
               "vanished.pdf": [4, 10, "NotFoundError"], "locked.docx": [4, 10, "NotReadableError"], "denied.xlsx": [4, 10, "NotAllowedError"]},
  "gone-dir": {"__throw": "NotFoundError"},
  "looky-index.json": [5, 9999]}}
ESA = {"app": "looky", "version": 1, "share": "ESA_Share", "generated": "2026-10-20T08:00:00Z", "count": 3, "entries": [
  {"path": "Klanten/Peeters/Porte coulissante manuel.pdf", "name": "Porte coulissante manuel.pdf", "ext": ".pdf", "size": 1000, "lastModified": 1790000000000},
  {"path": "Projecten/Revolving/E555/Revolving_KTV-4_E555_2026-03-01_0800.xml", "name": "Revolving_KTV-4_E555_2026-03-01_0800.xml", "ext": ".xml", "size": 5, "lastModified": 1760000000000, "family": "Revolving", "submodel": "KTV-4", "dossier": "E555"},
  {"path": "Klanten/Peeters/param.eep", "name": "param.eep", "ext": ".eep", "size": 10, "lastModified": 1700000000000}]}
VP = {"pc": dict(viewport={"width": 1366, "height": 800}),
      "iphone": dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=3,
                     user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"),
      "ipad": dict(viewport={"width": 820, "height": 1180}, is_mobile=True, has_touch=True, device_scale_factor=2,
                   user_agent="Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")}
NOFS = "delete window.showDirectoryPicker; window.open=function(){};"
def names(pg): return pg.eval_on_selector_all("#res .rn", "e=>e.map(x=>x.textContent)")
def set_exts(pg, ft):
    if ft in ("Alle", "Tous", "all", "", None): pg.click("#extAll"); return
    if ft in ("Parameter/Firmware", "param"): pg.click("#extParam"); return
    if ft == "Office": pg.click("#extOffice"); return
    want = [("." + x if not str(x).startswith(".") else x) for x in str(ft).replace(" ", "").split(",") if x]
    for b in pg.query_selector_all("#extBoxes input"):
        if b.is_checked() != (b.get_attribute("value") in want): b.click()
def setq(pg, **kw):
    if "q" in kw: text = kw["q"]
    else: text = " ".join(kw.get(k, "") for k in ("family", "submodel", "dossier", "customer") if kw.get(k))
    pg.fill("#q", text)
    pg.evaluate("() => { var u = document.querySelector('#q ~ .cbl'); if (u) u.hidden = true; }")
    pg.wait_for_timeout(220)
    if "ftype" in kw: set_exts(pg, kw["ftype"])
    elif not pg.evaluate("t => !!LK.modelExtFromQuery(t)", text):
        for b in pg.query_selector_all("#extBoxes input:checked"): b.click()
    pg.wait_for_timeout(250)
written = None
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True)
    # ---------------- PC ----------------
    ctx = b.new_context(service_workers="block", **VP["pc"]); pg = ctx.new_page()
    pg.add_init_script("if(!sessionStorage.getItem('mocktree'))sessionStorage.setItem('mocktree',%s);" % json.dumps(json.dumps(TREE)))
    pg.add_init_script(path=MOCK)
    pg.goto(URL); pg.wait_for_selector("body[data-ready='1']")
    ok("pc: default NL, update button visible", pg.is_visible("#btnUpdate") and "Index bijwerken" in pg.inner_text("#btnUpdate"))
    ok("pc: 'no index' hint", pg.is_visible("#idxNone"))
    pg.click("#btnUpdate"); pg.wait_for_selector(".idx")
    ok("pc: picker used + index written", "picker" in pg.evaluate("__log") and "write looky-index.json" in pg.evaluate("__log"))
    written = json.loads(pg.evaluate("__root.c['looky-index.json'].data"))
    paths = {e["path"]: e for e in written["entries"]}
    ok("pc: index share name + date + count", written["share"] == "ESC_Share" and written["generated"][:4] == "2026" and written["count"] == 13)
    ok("pc: skips ~$, Thumbs.db, old index", not any("~$" in x or "Thumbs" in x or x == "looky-index.json" for x in paths))
    ok("pc: skips OneDrive temps and entries that throw", written["skipped"] == 10 and not any(x.endswith(".tmp") or "drivedownload" in x or "driveupload" in x or x.endswith("desktop.ini") or "vanished.pdf" in x or x.endswith("locked.docx") or "denied.xlsx" in x or "gone-dir" in x for x in paths))
    ok("pc: summary after a partial scan", "13 bestanden geïndexeerd, 10 overgeslagen" in pg.inner_text("#msg") and "fichiers indexés" in pg.evaluate("LK.T.fr.idxDone") and "ignorés" in pg.evaluate("LK.T.fr.idxSum"))
    e = paths["projecten/Kerberos/TPB-M04/D900/config.kmc"]
    ok("pc: TPB-M04 folder stored as sub-model", (e.get("family"), e.get("submodel"), e.get("dossier"), e["ext"]) == ("Kerberos", "TPB-M04", "D900", ".kmc"))
    e = paths["projecten/Gallenschütz/ETS21/board.pdf"]
    ok("pc: Gallenschütz ETS21 stored", (e.get("family"), e.get("submodel")) == ("Gallenschütz", "ETS21"))
    e = paths["projecten/Kentaur/D12345/Kentaur_FTS-E01_D12345_2026-01-05_0900.PRD"]
    ok("pc: family/submodel/dossier from ESC_tool name", (e.get("family"), e.get("submodel"), e.get("dossier"), e["ext"]) == ("Kentaur", "FTS-E01", "D12345", ".prd"))
    e = paths["projecten/Kentaur/D12345/Schuifdeur handleiding Janssens.PDF"]
    ok("pc: family/dossier from folder projecten/<F>/<D>", (e.get("family"), e.get("dossier"), e.get("submodel")) == ("Kentaur", "D12345", None))
    e = paths["Algemeen/Firmware/ctrl_v2.mot"]; ok("pc: tolerant for unknown structure", "family" not in e and e["size"] == 100)
    ok("pc: index info row", "ESC_Share: 13 bestanden" in pg.inner_text("#idxList"))
    P = lambda x: pg.evaluate("p=>LK.parse(p)", x)
    ok("parse: generic projecten-like (ESA names)", P("Projecten/Revolving/E555/sub/plan.pdf") == {"family": "Revolving", "dossier": "E555"})
    ok("parse: no container -> top-level folder", P("Klanten/Peeters/2024/x.pdf") == {"family": "Peeters", "dossier": "2024"} and P("Algemeen/Firmware/a.mot") == {})
    ok("parse: ESA name scheme", P("projets/Revolving/E9/Revolving_KTV-4_E9_2026-03-01_0800.xml") == {"family": "Revolving", "dossier": "E9", "submodel": "KTV 4"})
    ok("parse: file directly in projecten/<F>", P("projecten/Argus/x.pdf") == {"family": "Argus"})
    ok("parse: multi-word sub-model ES 200 T from file name", P("projecten/ES 200/D9/plan ES_200_T.pdf") == {"family": "ES 200", "dossier": "D9", "submodel": "ES 200 T"})
    ok("parse: longest sub-model wins + glued form", P("Docs/TS92XEA manual.pdf") == {"family": "TS", "submodel": "TS 92 XEA"} or P("Docs/ts 92 xea manual.pdf") == {"family": "TS", "submodel": "TS 92 XEA"})
    ok("parse: no false sub-model inside words", P("Docs/costs.pdf") == {})
    ok("parse: TPB M04 = TPB-M04", P("projecten/Kerberos/D1/TPB M04 setup.eep") == {"family": "Kerberos", "dossier": "D1", "submodel": "TPB-M04"})
    ok("parse: es-200 = ES 200", P("projecten/es-200/D1/a.pdf")["family"] == "ES 200" and P("projecten/ES200/a.pdf")["family"] == "ES 200")
    ok("norm: search ignores spaces and dashes", pg.evaluate("""() => {
      var ix = {share:"t", entries:[{path:"projecten/ES 200/a.pdf", name:"a.pdf", ext:".pdf", family:"ES 200", submodel:"ES 200", size:1, lastModified:2},
        {path:"x.kmc", name:"x.kmc", ext:".kmc", family:"Kerberos", submodel:"TPB-M04", size:1, lastModified:1}]};
      return LK.search([ix], {family:"es200", submodel:"", dossier:"", customer:"", exts:null}).length === 1
        && LK.search([ix], {family:"", submodel:"TPB M04", dossier:"", customer:"", exts:[".kmc"]}).length === 1
        && LK.key("ES-200") === "es200" && LK.modelExt("tpb m04", "kerberos").join() === ".kmc,.eep";
    }"""))
    ok("title: glasses stand in for the o's", pg.get_attribute("h1.looky", "aria-label") == "Looky" and pg.locator("h1 .glasses circle").count() == 2 and "L" in pg.inner_text("h1.looky") and "ky" in pg.inner_text("h1.looky"))
    ok("pc: extensions off by default", pg.locator("#extBoxes input:checked").count() == 0)
    ok("pc: all results newest first", names(pg)[:2] == ["readme.txt", "ctrl_v2.mot"][::-1] or names(pg)[0] == "ctrl_v2.mot")
    lm = pg.evaluate("Array.from(document.querySelectorAll('#res .rm')).map(x=>x.textContent)")
    ok("pc: result has date+size", "/2026" in lm[0] and "B" in lm[0])
    # one search field: suggestions are families + models from the index
    pg.click("#q"); items = pg.eval_on_selector_all("#q ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("pc: suggestions list families found in the index", [x for x in items if x in ("Kerberos", "Kentaur", "Gallenschütz")] == ["Kerberos", "Kentaur", "Gallenschütz"])
    ok("pc: suggestions list models found in the index", "TPB-M04" in items and "FTS-E01" in items and "ETS21" in items and "ES PROLINE" not in items)
    gl = pg.eval_on_selector_all("#q ~ .cbl li", "e=>e.map(x=>x.dataset.v+'|'+(x.querySelector('small')||{}).textContent)")
    ok("pc: family suggestions show NL group label", "Kentaur|Toegangscontrole / sensorbarrières" in gl and "Gallenschütz|Toegangscontrole / sensorbarrières" in gl)
    pg.fill("#q", "sensor"); fl2 = pg.eval_on_selector_all("#q ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    pg.keyboard.press("Escape"); ok("pc: typing a group name filters suggestions", fl2 == ["Kerberos", "Kentaur", "Gallenschütz"])
    pg.fill("#q", ""); pg.click("#q"); pg.click("#q ~ .cbl li[data-v=Kentaur]"); pg.wait_for_timeout(250)
    ok("pc: pick family Kentaur -> filtered", set(names(pg)) == {"Kentaur_FTS-E01_D12345_2026-01-02_1030.xml", "Kentaur_FTS-E01_D12345_2026-01-05_0900.PRD", "Kentaur_FTS-E01_D12345_info.pdf", "Schuifdeur handleiding Janssens.PDF"})
    pg.fill("#q", "fts-e0"); subs2 = pg.eval_on_selector_all("#q ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("pc: typing filters model suggestions", subs2 and all(s.startswith("FTS-E0") for s in subs2))
    pg.keyboard.press("ArrowDown"); pg.keyboard.press("Enter")
    ok("pc: keyboard pick from list", pg.input_value("#q") == subs2[0])
    setq(pg, q="Kentaur FTS-E01"); ok("pc: multi-word family+model", len(names(pg)) == 3)
    setq(pg, q="kentaur fts-e01", ftype="Parameter/Firmware")
    ok("pc: free input case-insensitive + Param filter (.PRD,.xml)", sorted(names(pg)) == ["Kentaur_FTS-E01_D12345_2026-01-02_1030.xml", "Kentaur_FTS-E01_D12345_2026-01-05_0900.PRD"])
    ok("pc: newest first", names(pg)[0].endswith(".PRD"))
    setq(pg, ftype="Office"); ok("pc: Office filter (.PDF .pdf .vsdx .txt .xml excluded)", set(names(pg)) == {"Kentaur_FTS-E01_D12345_info.pdf", "Schuifdeur handleiding Janssens.PDF", "Klant Dupont – Motor schéma.vsdx", "readme.txt", "handleiding.pdf", "board.pdf"})
    setq(pg, ftype="mot"); ok("pc: free typed extension", names(pg) == ["ctrl_v2.mot"])
    setq(pg, q="TS"); ok("pc: family TS is whole-word (no match in FTS-E01)", names(pg) == [])
    setq(pg, q="d777"); ok("pc: dossier in the one search field", len(names(pg)) == 2)
    pg.fill("#q", "tpb"); subs = pg.eval_on_selector_all("#q ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("pc: Kerberos models suggested from the index", "TPB-E01" in subs and "TPB-M04" in subs and "FTS-E01" not in subs)
    pg.click("#q ~ .cbl li[data-v='TPB-M04']"); pg.wait_for_timeout(300)
    checked = pg.eval_on_selector_all("#extBoxes input:checked", "e=>e.map(x=>x.value).sort()")
    ok("pc: TPB-M04 auto-selects .kmc and .eep", checked == [".eep", ".kmc"])
    ok("pc: TPB-M04 lists matching files at once", set(names(pg)) == {"config.kmc", "params.eep"})
    pg.fill("#q", "tpb-m04 d900"); pg.wait_for_timeout(250); ok("pc: dossier narrows TPB-M04 live", set(names(pg)) == {"config.kmc", "params.eep"})
    pg.fill("#q", "tpb-m04 d900 config"); pg.wait_for_timeout(250); ok("pc: klant narrows TPB-M04 live", names(pg) == ["config.kmc"])
    pg.fill("#q", "tpb-m04 d900"); pg.evaluate("() => { var u = document.querySelector('#q ~ .cbl'); if (u) u.hidden = true; }"); pg.click("#extBoxes input[value='.pdf']"); pg.wait_for_timeout(200)
    ok("pc: user can add a tick after the model default", ".pdf" in pg.eval_on_selector_all("#extBoxes input:checked", "e=>e.map(x=>x.value)") and "handleiding.pdf" in names(pg) and "config.kmc" in names(pg))
    pg.fill("#q", "tpb m04"); pg.wait_for_timeout(300)
    ok("pc: typed TPB M04 matches TPB-M04 defaults", pg.eval_on_selector_all("#extBoxes input:checked", "e=>e.map(x=>x.value).sort()") == [".eep", ".kmc"])
    pg.fill("#q", "kentaur"); pg.evaluate("() => { var u = document.querySelector('#q ~ .cbl'); if (u) u.hidden = true; }"); pg.click("#extParam"); pg.click("#clear"); pg.wait_for_timeout(200)
    ok("pc: Wissen clears the query and unticks extensions", pg.input_value("#q") == "" and pg.locator("#extBoxes input:checked").count() == 0)
    setq(pg, customer="porte"); ok("glossary: porte -> Schuifdeur (deur)", "Schuifdeur handleiding Janssens.PDF" in names(pg))
    setq(pg, customer="sliding door"); ok("glossary: 'sliding door' -> Schuifdeur", names(pg) == ["Schuifdeur handleiding Janssens.PDF"])
    setq(pg, customer="Tür manual"); ok("glossary: 'Tür manual' -> deur + handleiding", names(pg) == ["Schuifdeur handleiding Janssens.PDF"])
    setq(pg, customer="moteur schema dupont"); ok("glossary+accents: moteur schema -> Motor schéma", names(pg) == ["Klant Dupont – Motor schéma.vsdx"])
    setq(pg, customer="JANSSENS"); ok("customer free text case-insensitive", names(pg) == ["Schuifdeur handleiding Janssens.PDF"])
    setq(pg, customer="xyzzy"); ok("no results message", "Geen resultaten" in pg.inner_text("#count"))
    setq(pg, customer="janssens"); pg.click("#res .open"); pg.wait_for_timeout(200)
    ok("pc: open file via handle", pg.evaluate("__opened") == "projecten/Kentaur/D12345/Schuifdeur handleiding Janssens.PDF")
    ok("pc: result has Open, Download, OneDrive and copy", all(pg.locator("#res li.r").first.locator(c).count() == 1 for c in [".open", ".dl", "a.od", ".cp"]))
    pg.click("#res .dl"); pg.wait_for_timeout(200); ok("pc: download button works", pg.evaluate("__opened").endswith("Janssens.PDF"))
    # language memory
    pg.click("#lang button[data-l=fr]"); ok("lang: FR labels", "Mettre à jour l'index" in pg.inner_text("#btnUpdate") and pg.inner_text("#extAll") == "Tous" and pg.inner_text("#clear") == "Réinitialiser")
    pg.evaluate("sessionStorage.setItem('perm','prompt')"); pg.reload(); pg.wait_for_selector("body[data-ready='1']")
    ok("lang: FR remembered after reload", pg.evaluate("document.documentElement.lang") == "fr" and "modèle" in pg.get_attribute("#q", "placeholder"))
    ok("pc: index cached in IndexedDB after reload", "ESC_Share : 13 fichiers" in pg.inner_text("#idxList"))
    ok("pc: permission prompt -> one-click renew button", "Autoriser l'accès : ESC_Share" in pg.inner_text(".idx .upd"))
    pg.evaluate("__root.c.Algemeen.c['nieuw.docx']={kind:'file',name:'nieuw.docx',data:'abc',mt:Date.now(),getFile:__root.c.Algemeen.c.Firmware.c['readme.txt'].getFile}")
    pg.click(".idx .upd"); pg.wait_for_timeout(500)
    ok("pc: renew asks permission + rescans", "request" in pg.evaluate("__log") and "ESC_Share : 14 fichiers" in pg.inner_text("#idxList"))
    pg.click("#help button") if False else pg.click("#btnHelp"); ok("help FR", "iPhone / iPad" in pg.inner_text("#helpBody") and "Charger l'index" in pg.inner_text("#helpBody") and "ignorés" in pg.inner_text("#helpBody"))
    pg.click("#helpClose"); pg.click("#lang button[data-l=nl]"); pg.click("#btnHelp"); ok("help NL", "Index laden" in pg.inner_text("#helpBody") and "overgeslagen" in pg.inner_text("#helpBody")); pg.click("#helpClose")
    pg.screenshot(path="/workspace/looky_pc.png", full_page=True); ctx.close()
    tmp = tempfile.mkdtemp(); f1 = os.path.join(tmp, "looky-index.json"); f2 = os.path.join(tmp, "esa", "looky-index.json"); os.makedirs(os.path.dirname(f2))
    json.dump(written, open(f1, "w")); json.dump(ESA, open(f2, "w")); bad = os.path.join(tmp, "bad.json"); open(bad, "w").write("{\"x\":1}")
    # ---------------- iPhone ----------------
    ctx = b.new_context(service_workers="block", **VP["iphone"]); pg = ctx.new_page(); pg.add_init_script(NOFS)
    pg.goto(URL); pg.wait_for_selector("body[data-ready='1']")
    ok("iphone: no update button (no FS Access)", not pg.is_visible("#btnUpdate") and pg.is_visible("#btnLoad"))
    pg.set_input_files("#file", bad); pg.wait_for_timeout(300); ok("iphone: invalid file rejected", "geen geldig" in pg.inner_text("#msg"))
    pg.set_input_files("#file", [f1, f2]); pg.wait_for_function("document.querySelectorAll('.idx').length==2")
    ok("iphone: ESC + ESA indexes loaded via file input, dates shown", "ESA_Share: 3 bestanden – index van 20/10/2026" in pg.inner_text("#idxList") and "ESC_Share: 13" in pg.inner_text("#idxList"))
    setq(pg, customer="sliding door"); ok("iphone: search across ESC+ESA (glossary)", set(names(pg)) == {"Schuifdeur handleiding Janssens.PDF", "Porte coulissante manuel.pdf"})
    setq(pg, ftype="Parameter/Firmware", customer="peeters"); ok("iphone: .eep in param group", names(pg) == ["param.eep"])
    ok("iphone: no open button, copy button", pg.locator("#res .open").count() == 0 and pg.locator("#res .cp").count() == 1)
    od = pg.get_attribute("#res a.od", "href"); ok("iphone: OneDrive link on result (_blank, noopener)", od == "https://dorma-my.sharepoint.com/personal/joachim_lust_dormakaba_com/Documents/ESA_Share/Klanten/Peeters/param.eep" and pg.get_attribute("#res a.od", "target") == "_blank" and pg.get_attribute("#res a.od", "rel") == "noopener" and pg.inner_text("#res a.od") == "Openen in OneDrive")
    U = lambda sh, p: pg.evaluate("a=>LK.oneDriveUrl(a[0],a[1])", [sh, p])
    ok("onedrive url: spaces/accents/#/% encoded per segment", U("ESC_Share", "projecten/Kentaur/D1/Klant Dupont – schéma #2 100%.pdf") == "https://dorma-my.sharepoint.com/personal/joachim_lust_dormakaba_com/Documents/ESC_Share/projecten/Kentaur/D1/Klant%20Dupont%20%E2%80%93%20sch%C3%A9ma%20%232%20100%25.pdf")
    ok("onedrive url: share name case/dash tolerant", U("esc-share", "a b/c.txt") == "https://dorma-my.sharepoint.com/personal/joachim_lust_dormakaba_com/Documents/ESC_Share/a%20b/c.txt" and U("ESA SHARE", "x") == "https://dorma-my.sharepoint.com/personal/joachim_lust_dormakaba_com/Documents/ESA_Share/x")
    ok("onedrive url: unknown share -> none", U("Other_Share", "x.pdf") is None)
    pg.click("#res .cp"); ok("iphone: copy path", pg.evaluate("__copied") == "ESA_Share/Klanten/Peeters/param.eep")
    pg.uncheck(".idx[data-share=ESA_Share] input"); setq(pg, customer="sliding door"); ok("iphone: disable ESA index", names(pg) == ["Schuifdeur handleiding Janssens.PDF"])
    pg.check(".idx[data-share=ESA_Share] input"); pg.click("#q"); fl = pg.eval_on_selector_all("#q ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("iphone: suggestions learn ESA family and model from index", "Revolving" in fl and "Kentaur" in fl and "KTV 4" in fl)
    setq(pg, q="Revolving e555"); ok("iphone: learned family + dossier search", names(pg) == ["Revolving_KTV-4_E555_2026-03-01_0800.xml"])
    pg.uncheck(".idx[data-share=ESA_Share] input"); pg.fill("#q", ""); pg.click("#q"); fl = pg.eval_on_selector_all("#q ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("iphone: learned values disappear when ESA index disabled", "Revolving" not in fl and "KTV 4" not in fl)
    pg.keyboard.press("Escape"); pg.tap("#q"); ok("iphone: suggestions open on tap", pg.is_visible("#q ~ .cbl"))
    w = pg.evaluate("document.documentElement.scrollWidth"); ok("iphone: no horizontal overflow", w <= 390)
    pg.reload(); pg.wait_for_selector("body[data-ready='1']"); ok("iphone: indexes + ESA off remembered", pg.locator(".idx").count() == 2 and not pg.is_checked(".idx[data-share=ESA_Share] input"))
    pg.screenshot(path="/workspace/looky_iphone.png", full_page=True); ctx.close()
    # ---------------- iPad + offline (service worker) ----------------
    ctx = b.new_context(**VP["ipad"]); pg = ctx.new_page(); pg.add_init_script(NOFS)
    pg.goto(URL); pg.wait_for_selector("body[data-ready='1']")
    pg.wait_for_function("navigator.serviceWorker.ready.then(()=>true)", timeout=10000); pg.reload(); pg.wait_for_function("!!navigator.serviceWorker.controller", timeout=10000)
    pg.set_input_files("#file", f2); pg.wait_for_selector(".idx")
    n = pg.evaluate("caches.keys().then(k=>caches.open(k[0])).then(c=>c.keys()).then(r=>r.length)"); ok("ipad: precache filled (%d)" % n, n >= 17)
    ctx.set_offline(True); pg.reload(); pg.wait_for_selector("body[data-ready='1']", timeout=10000)
    ok("ipad offline: app loads, Offline badge", pg.is_visible("#off"))
    ok("ipad offline: cached index available", "ESA_Share: 3" in pg.inner_text("#idxList"))
    setq(pg, customer="porte"); ok("ipad offline: search works", names(pg) == ["Porte coulissante manuel.pdf"])
    w = pg.evaluate("document.documentElement.scrollWidth"); ok("ipad: no horizontal overflow", w <= 820)
    pg.screenshot(path="/workspace/looky_ipad.png", full_page=True); ctx.close()
    b.close()
fail = [n for n, c in res if not c]
print("\n%d/%d passed" % (len(res) - len(fail), len(res))); sys.exit(1 if fail else 0)
