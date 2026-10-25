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
    "Kerberos": {"D777": {"Kerberos_TPB-E01_D777_2026-02-01_1200.dat": [7, 20], "Klant Dupont – Motor schéma.vsdx": [900, 10]}},
    "ESC-param": {}},
  "Algemeen": {"Firmware": {"ctrl_v2.mot": [100, 5], "readme.txt": [3, 1000]}, "~$lock.docx": [1, 1], "Thumbs.db": [1, 1]},
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
def setq(pg, **kw):
    for k in ["family", "submodel", "dossier", "customer"]: pg.fill("#" + k, kw.get(k, ""))
    pg.fill("#ftype", kw.get("ftype", "Alle")); pg.press("#ftype", "Enter"); pg.wait_for_timeout(250)
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
    ok("pc: index share name + date + count", written["share"] == "ESC_Share" and written["generated"][:4] == "2026" and written["count"] == 8)
    ok("pc: skips ~$, Thumbs.db, old index", not any("~$" in x or "Thumbs" in x or x == "looky-index.json" for x in paths))
    e = paths["projecten/Kentaur/D12345/Kentaur_FTS-E01_D12345_2026-01-05_0900.PRD"]
    ok("pc: family/submodel/dossier from ESC_tool name", (e.get("family"), e.get("submodel"), e.get("dossier"), e["ext"]) == ("Kentaur", "FTS-E01", "D12345", ".prd"))
    e = paths["projecten/Kentaur/D12345/Schuifdeur handleiding Janssens.PDF"]
    ok("pc: family/dossier from folder projecten/<F>/<D>", (e.get("family"), e.get("dossier"), e.get("submodel")) == ("Kentaur", "D12345", None))
    e = paths["Algemeen/Firmware/ctrl_v2.mot"]; ok("pc: tolerant for unknown structure", "family" not in e and e["size"] == 100)
    ok("pc: index info row", "ESC_Share: 8 bestanden" in pg.inner_text("#idxList"))
    P = lambda x: pg.evaluate("p=>LK.parse(p)", x)
    ok("parse: generic projecten-like (ESA names)", P("Projecten/Revolving/E555/sub/plan.pdf") == {"family": "Revolving", "dossier": "E555"})
    ok("parse: no container -> top-level folder", P("Klanten/Peeters/2024/x.pdf") == {"family": "Peeters", "dossier": "2024"} and P("Algemeen/Firmware/a.mot") == {})
    ok("parse: ESA name scheme", P("projets/Revolving/E9/Revolving_KTV-4_E9_2026-03-01_0800.xml") == {"family": "Revolving", "dossier": "E9", "submodel": "KTV-4"})
    ok("parse: file directly in projecten/<F>", P("projecten/Argus/x.pdf") == {"family": "Argus"})
    ok("pc: all results newest first", names(pg)[:2] == ["readme.txt", "ctrl_v2.mot"][::-1] or names(pg)[0] == "ctrl_v2.mot")
    lm = pg.evaluate("Array.from(document.querySelectorAll('#res .rm')).map(x=>x.textContent)")
    ok("pc: result has date+size", "/2026" in lm[0] and "B" in lm[0])
    # combobox family list
    pg.click("#family"); items = pg.eval_on_selector_all("#family ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("pc: family combobox lists ESC_tool families", items[:3] == ["Kerberos", "Kentaur", "Charon"] and len(items) == 8)
    pg.click("#family ~ .cbl li:nth-child(2)"); pg.wait_for_timeout(250)
    ok("pc: pick family Kentaur -> filtered", set(names(pg)) == {"Kentaur_FTS-E01_D12345_2026-01-02_1030.xml", "Kentaur_FTS-E01_D12345_2026-01-05_0900.PRD", "Kentaur_FTS-E01_D12345_info.pdf", "Schuifdeur handleiding Janssens.PDF"})
    pg.click("#submodel"); subs = pg.eval_on_selector_all("#submodel ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("pc: sub-model list filtered by family (15 Kentaur)", len(subs) == 15 and "FTS-E01" in subs and "TPB-E01" not in subs)
    pg.keyboard.type("fts-e0"); subs2 = pg.eval_on_selector_all("#submodel ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("pc: typing filters sub-model list", subs2 and all(s.startswith("FTS-E0") for s in subs2))
    pg.keyboard.press("ArrowDown"); pg.keyboard.press("Enter")
    ok("pc: keyboard pick from list", pg.input_value("#submodel") == subs2[0])
    setq(pg, family="Kentaur", submodel="FTS-E01"); ok("pc: submodel filter", len(names(pg)) == 3)
    setq(pg, family="kentaur", submodel="fts-e01", ftype="Parameter/Firmware")
    ok("pc: free input case-insensitive + Param filter (.PRD,.xml)", sorted(names(pg)) == ["Kentaur_FTS-E01_D12345_2026-01-02_1030.xml", "Kentaur_FTS-E01_D12345_2026-01-05_0900.PRD"])
    ok("pc: newest first", names(pg)[0].endswith(".PRD"))
    setq(pg, ftype="Office"); ok("pc: Office filter (.PDF .pdf .vsdx .txt .xml excluded)", set(names(pg)) == {"Kentaur_FTS-E01_D12345_info.pdf", "Schuifdeur handleiding Janssens.PDF", "Klant Dupont – Motor schéma.vsdx", "readme.txt"})
    setq(pg, ftype="mot"); ok("pc: free typed extension", names(pg) == ["ctrl_v2.mot"])
    setq(pg, dossier="d777"); ok("pc: dossier free input", len(names(pg)) == 2)
    pg.fill("#family", "Kerberos"); pg.click("#dossier"); dl = pg.eval_on_selector_all("#dossier ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("pc: dossier list from index, filtered by family", dl == ["D777"])
    setq(pg, customer="porte"); ok("glossary: porte -> Schuifdeur (deur)", "Schuifdeur handleiding Janssens.PDF" in names(pg))
    setq(pg, customer="sliding door"); ok("glossary: 'sliding door' -> Schuifdeur", names(pg) == ["Schuifdeur handleiding Janssens.PDF"])
    setq(pg, customer="Tür manual"); ok("glossary: 'Tür manual' -> deur + handleiding", names(pg) == ["Schuifdeur handleiding Janssens.PDF"])
    setq(pg, customer="moteur schema dupont"); ok("glossary+accents: moteur schema -> Motor schéma", names(pg) == ["Klant Dupont – Motor schéma.vsdx"])
    setq(pg, customer="JANSSENS"); ok("customer free text case-insensitive", names(pg) == ["Schuifdeur handleiding Janssens.PDF"])
    setq(pg, customer="xyzzy"); ok("no results message", "Geen resultaten" in pg.inner_text("#count"))
    setq(pg, customer="janssens"); pg.click("#res .open"); pg.wait_for_timeout(200)
    ok("pc: open file via handle", pg.evaluate("__opened") == "projecten/Kentaur/D12345/Schuifdeur handleiding Janssens.PDF")
    pg.click("#res .dl"); pg.wait_for_timeout(200); ok("pc: download button works", pg.evaluate("__opened").endswith("Janssens.PDF"))
    # language memory
    pg.click("#lang button[data-l=fr]"); ok("lang: FR labels", "Mettre à jour l'index" in pg.inner_text("#btnUpdate") and pg.input_value("#ftype") == "Tous")
    pg.evaluate("sessionStorage.setItem('perm','prompt')"); pg.reload(); pg.wait_for_selector("body[data-ready='1']")
    ok("lang: FR remembered after reload", pg.evaluate("document.documentElement.lang") == "fr" and "Famille" in pg.inner_text("#f"))
    ok("pc: index cached in IndexedDB after reload", "ESC_Share : 8 fichiers" in pg.inner_text("#idxList"))
    ok("pc: permission prompt -> one-click renew button", "Autoriser l'accès : ESC_Share" in pg.inner_text(".idx .upd"))
    pg.evaluate("__root.c.Algemeen.c['nieuw.docx']={kind:'file',name:'nieuw.docx',data:'abc',mt:Date.now(),getFile:__root.c.Algemeen.c.Firmware.c['readme.txt'].getFile}")
    pg.click(".idx .upd"); pg.wait_for_timeout(500)
    ok("pc: renew asks permission + rescans", "request" in pg.evaluate("__log") and "ESC_Share : 9 fichiers" in pg.inner_text("#idxList"))
    pg.click("#help button") if False else pg.click("#btnHelp"); ok("help FR", "iPhone / iPad" in pg.inner_text("#helpBody") and "Charger l'index" in pg.inner_text("#helpBody"))
    pg.click("#helpClose"); pg.click("#lang button[data-l=nl]"); pg.click("#btnHelp"); ok("help NL", "Index laden" in pg.inner_text("#helpBody")); pg.click("#helpClose")
    pg.screenshot(path="/workspace/looky_pc.png", full_page=True); ctx.close()
    tmp = tempfile.mkdtemp(); f1 = os.path.join(tmp, "looky-index.json"); f2 = os.path.join(tmp, "esa", "looky-index.json"); os.makedirs(os.path.dirname(f2))
    json.dump(written, open(f1, "w")); json.dump(ESA, open(f2, "w")); bad = os.path.join(tmp, "bad.json"); open(bad, "w").write("{\"x\":1}")
    # ---------------- iPhone ----------------
    ctx = b.new_context(service_workers="block", **VP["iphone"]); pg = ctx.new_page(); pg.add_init_script(NOFS)
    pg.goto(URL); pg.wait_for_selector("body[data-ready='1']")
    ok("iphone: no update button (no FS Access)", not pg.is_visible("#btnUpdate") and pg.is_visible("#btnLoad"))
    pg.set_input_files("#file", bad); pg.wait_for_timeout(300); ok("iphone: invalid file rejected", "geen geldig" in pg.inner_text("#msg"))
    pg.set_input_files("#file", [f1, f2]); pg.wait_for_function("document.querySelectorAll('.idx').length==2")
    ok("iphone: ESC + ESA indexes loaded via file input, dates shown", "ESA_Share: 3 bestanden – index van 20/10/2026" in pg.inner_text("#idxList") and "ESC_Share: 8" in pg.inner_text("#idxList"))
    setq(pg, customer="sliding door"); ok("iphone: search across ESC+ESA (glossary)", set(names(pg)) == {"Schuifdeur handleiding Janssens.PDF", "Porte coulissante manuel.pdf"})
    setq(pg, ftype="Parameter/Firmware", customer="peeters"); ok("iphone: .eep in param group", names(pg) == ["param.eep"])
    ok("iphone: no open button, copy button", pg.locator("#res .open").count() == 0 and pg.locator("#res .cp").count() == 1)
    pg.click("#res .cp"); ok("iphone: copy path", pg.evaluate("__copied") == "ESA_Share/Klanten/Peeters/param.eep")
    pg.uncheck(".idx[data-share=ESA_Share] input"); setq(pg, customer="sliding door"); ok("iphone: disable ESA index", names(pg) == ["Schuifdeur handleiding Janssens.PDF"])
    pg.check(".idx[data-share=ESA_Share] input"); pg.click("#family"); fl = pg.eval_on_selector_all("#family ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("iphone: family combobox learns ESA family from index", "Revolving" in fl and "Kentaur" in fl)
    pg.click("#family ~ .cbl li[data-v=Revolving]"); pg.click("#submodel"); sl = pg.eval_on_selector_all("#submodel ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("iphone: sub-model combobox learns KTV-4 for Revolving", sl == ["KTV-4"])
    setq(pg, family="Revolving", dossier="e555"); ok("iphone: learned family + dossier search", names(pg) == ["Revolving_KTV-4_E555_2026-03-01_0800.xml"])
    pg.uncheck(".idx[data-share=ESA_Share] input"); pg.click("#customer"); pg.click("#family"); fl = pg.eval_on_selector_all("#family ~ .cbl li b", "e=>e.map(x=>x.textContent)")
    ok("iphone: learned values disappear when ESA index disabled", "Revolving" not in fl)
    pg.keyboard.press("Escape"); pg.tap("#family"); ok("iphone: combobox list opens on tap", pg.is_visible("#family ~ .cbl"))
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
