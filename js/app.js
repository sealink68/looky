/* app.js – UI wiring: language, indexes (build on PC / load on iOS), search form, results. */
"use strict";
(function (LK) {
  var C = LK.CFG, $ = function (id) { return document.getElementById(id); };
  var lang = LK.pref("lang") === "fr" ? "fr" : "nl", IX = {}, HANDLES = {}, FS = typeof window.showDirectoryPicker === "function";
  function t(k, a) { var s = LK.T[lang][k] || k; return a ? s.replace(/\{(\w+)\}/g, function (_, x) { return a[x] != null ? a[x] : ""; }) : s; }
  LK.t = t;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtDate(v) { var d = new Date(v); return isNaN(d) ? "?" : pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function fmtSize(b) { return b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB"; }
  function msg(s, err) { var m = $("msg"); m.textContent = s || ""; m.className = err ? "msg err" : "msg"; }

  /* ---------- language ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-t]").forEach(function (e) { e.textContent = t(e.dataset.t); });
    document.querySelectorAll("[data-ph]").forEach(function (e) { e.placeholder = t(e.dataset.ph); });
    document.querySelectorAll("#lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.l === lang)); });
    var h = $("helpBody"); h.innerHTML = "";
    t("helpTxt").forEach(function (l) { var e = document.createElement(l.indexOf("## ") === 0 ? "h3" : "p"); e.textContent = l.replace(/^## /, ""); h.appendChild(e); });
    renderIdx(); if ($("res").dataset.done) run();
  }

  /* ---------- indexes ---------- */
  function active() { return Object.keys(IX).filter(function (s) { return LK.pref("off." + s) !== "1"; }).map(function (s) { return IX[s]; }); }
  async function permOk(h, ask) {
    if (!h || !h.queryPermission) return false;
    var o = { mode: "readwrite" };
    if (await h.queryPermission(o) === "granted") return true;
    return ask ? (await h.requestPermission(o)) === "granted" : false;
  }
  async function renderIdx() {
    var box = $("idxList"); box.innerHTML = "";
    var shares = Object.keys(IX).sort();
    $("idxNone").hidden = shares.length > 0;
    for (var s of shares) {
      var ix = IX[s], row = document.createElement("div"); row.className = "idx"; row.dataset.share = s;
      var lab = document.createElement("label"), cb = document.createElement("input"), sp = document.createElement("span");
      cb.type = "checkbox"; cb.checked = LK.pref("off." + s) !== "1"; cb.title = t("idxUse");
      cb.addEventListener("change", (function (s, cb) { return function () { LK.pref("off." + s, cb.checked ? "0" : "1"); refreshLists(); run(); }; })(s, cb));
      sp.textContent = t("idxInfo", { s: s, n: ix.count != null ? ix.count : ix.entries.length, d: fmtDate(ix.generated) });
      if (Date.now() - new Date(ix.generated) > 30 * 864e5) { sp.textContent += " – " + t("idxOld"); sp.className = "old"; }
      lab.appendChild(cb); lab.appendChild(sp); row.appendChild(lab);
      var h = HANDLES[s];
      if (FS && h) {
        var b = document.createElement("button"); b.type = "button"; b.className = "sm upd";
        var ok = await permOk(h, false);
        b.textContent = ok ? "🔄" : t("idxRenew", { s: s }); b.title = t("idxUpdate");
        b.addEventListener("click", (function (h) { return function () { build(h); }; })(h));
        row.appendChild(b);
      }
      var d = document.createElement("button"); d.type = "button"; d.className = "sm del"; d.textContent = "✕"; d.title = t("idxDel");
      d.addEventListener("click", (function (s) { return async function () { delete IX[s]; await LK.idbDel("ix:" + s); renderIdx(); refreshLists(); run(); }; })(s));
      row.appendChild(d); box.appendChild(row);
    }
  }
  async function store(ix) {
    ix.entries.forEach(function (e) { delete e._h; delete e._g; });
    IX[ix.share] = ix; await LK.idbSet("ix:" + ix.share, ix);
    renderIdx(); refreshLists(); run();
  }
  async function build(h) {
    try {
      if (!h) { if (!FS) { msg(t("noFs"), true); return; } h = await window.showDirectoryPicker({ id: "looky", mode: "readwrite" }); }
      if (!(await permOk(h, true))) { msg(t("idxErr", { e: "permission" }), true); return; }
      HANDLES[h.name] = h; await LK.hSet(h.name, h);
      msg(t("idxBusy", { n: 0 }));
      var ix = await LK.scan(h, function (n) { msg(t("idxBusy", { n: n })); });
      var sum = { s: h.name, f: C.INDEX, n: ix.count, k: ix.skipped || 0 };
      try { await LK.writeIndex(h, ix); msg(t("idxDone", sum)); }
      catch (e) { msg(t("idxWriteErr", { e: e.message || e }) + " " + t("idxSum", sum), true); }
      await store(ix);
    } catch (e) { if (e && e.name === "AbortError") return; msg(t("idxErr", { e: (e && e.message) || e }), true); }
  }
  function loadFiles(files) {
    Array.prototype.forEach.call(files, function (f) {
      f.text().then(function (txt) {
        var o; try { o = JSON.parse(txt); } catch (e) { o = null; }
        if (!LK.validIndex(o)) { msg(t("idxBad"), true); return; }
        o.count = o.entries.length;
        return store(o).then(function () { msg(t("idxLoaded", { s: o.share, n: o.count, d: fmtDate(o.generated) })); });
      });
    });
  }

  /* ---------- form ---------- */
  /* Dropdowns list only families/sub-models present in the active indexes. Typing a name that is not listed still searches. */
  function canonFamily(name) {
    var k = LK.key(name), hit = null;
    Object.keys(LK.MODELS).forEach(function (f) { if (LK.key(f) === k) hit = f; });
    return hit || name;
  }
  function canonSub(fam, name) {
    var k = LK.key(name), cf = canonFamily(fam || ""), hit = null;
    (LK.MODELS[cf] || []).forEach(function (m) { if (LK.key(m.id) === k) hit = m.id; });
    if (hit) return hit;
    Object.keys(LK.MODELS).forEach(function (f) { LK.MODELS[f].forEach(function (m) { if (!hit && LK.key(m.id) === k) hit = m.id; }); });
    return hit || name;
  }
  function famItems() {
    var G = LK.FAMILY_GROUP || {}, order = Object.keys(LK.MODELS), gl = {}, seen = {}, list = [];
    (LK.GROUPS || []).forEach(function (g, i) { gl[g.id] = { i: i, l: g[lang] || g.nl }; });
    active().forEach(function (ix) { ix.entries.forEach(function (e) {
      if (!e.family) return;
      var f = canonFamily(e.family);
      if (seen[LK.key(f)]) return;
      seen[LK.key(f)] = 1; list.push(f);
    }); });
    list.sort(function (a, b) {
      var ga = (gl[G[a] || "other"] || { i: 99 }).i, gb = (gl[G[b] || "other"] || { i: 99 }).i;
      if (ga !== gb) return ga - gb;
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia < 0) ia = 999; if (ib < 0) ib = 999;
      return ia - ib || (a < b ? -1 : 1);
    });
    return list.map(function (f) { return { v: f, l: (gl[G[f] || "other"] || {}).l || "" }; });
  }
  function subItems() {
    var f = LK.key($("family").value), seen = {}, out = [];
    active().forEach(function (ix) { ix.entries.forEach(function (e) {
      if (!e.submodel) return;
      var cf = canonFamily(e.family || "");
      if (f && LK.key(cf) !== f) return;
      var id = canonSub(cf, e.submodel), sk = LK.key(cf) + "|" + LK.key(id);
      if (seen[sk]) return;
      seen[sk] = 1;
      var desc = "";
      (LK.MODELS[cf] || []).some(function (m) { if (m.id === id && m.desc) { desc = m.desc[lang] || ""; return true; } });
      out.push({ v: id, l: (f ? "" : cf + (desc ? " – " : "")) + desc });
    }); });
    out.sort(function (a, b) { return a.v < b.v ? -1 : 1; });
    return out;
  }
  var DOS = [];
  function refreshLists() { // dossier numbers seen in the active indexes (filtered by family)
    var seen = {}, f = LK.key($("family").value); DOS = [];
    active().forEach(function (ix) { ix.entries.forEach(function (e) {
      if (e.dossier && !seen[e.dossier] && (!f || LK.key(e.family) === f)) { seen[e.dossier] = 1; DOS.push({ v: e.dossier, l: e.family || "" }); }
    }); });
    DOS.sort(function (a, b) { return a.v < b.v ? -1 : 1; });
  }
  function allExts() {
    var s = [], seen = {};
    LK.EXT.param.concat(LK.EXT.office).forEach(function (x) { x = x.toLowerCase(); if (!seen[x]) { seen[x] = 1; s.push(x); } });
    return s;
  }
  function selectedExts() {
    var all = document.querySelectorAll("#extBoxes input"), on = [];
    Array.prototype.forEach.call(all, function (b) { if (b.checked) on.push(b.value); });
    if (!on.length || on.length === all.length) return null;
    return on;
  }
  function syncQuick() {
    var on = [], all = allExts();
    document.querySelectorAll("#extBoxes input").forEach(function (b) { if (b.checked) on.push(b.value); });
    function same(list) { return list.length === on.length && list.every(function (x) { return on.indexOf(x) >= 0; }); }
    $("extAll").setAttribute("aria-pressed", String(on.length === all.length));
    $("extParam").setAttribute("aria-pressed", String(same(LK.EXT.param)));
    $("extOffice").setAttribute("aria-pressed", String(same(LK.EXT.office)));
  }
  function setExts(list) {
    var allow = list ? list.map(function (x) { return x.toLowerCase(); }) : null;
    document.querySelectorAll("#extBoxes input").forEach(function (b) { b.checked = !allow || allow.indexOf(b.value) >= 0; });
    syncQuick();
  }
  function buildExt() {
    var box = $("extBoxes"); box.innerHTML = "";
    allExts().forEach(function (x) {
      var lab = document.createElement("label"), cb = document.createElement("input");
      cb.type = "checkbox"; cb.value = x; cb.checked = true;
      cb.addEventListener("change", function () { syncQuick(); run(); });
      lab.appendChild(cb); lab.appendChild(document.createTextNode(x));
      box.appendChild(lab);
    });
    syncQuick();
  }
  function applyModelExt(sub) {
    var exts = LK.modelExt(sub, $("family").value);
    if (exts) setExts(exts);
  }
  var timer = 0;
  function later() { clearTimeout(timer); timer = setTimeout(run, 150); }
  function q() { return { family: $("family").value, submodel: $("submodel").value, dossier: $("dossier").value, customer: $("customer").value, exts: selectedExts() }; }
  function run() {
    var res = $("res"), list = active(), qq = q();
    res.dataset.done = "1"; res.innerHTML = "";
    if (!list.length) { $("count").textContent = ""; return; }
    var r = LK.search(list, qq), max = C.MAX_RESULTS;
    $("count").textContent = r.length > max ? t("resultsMax", { n: r.length, m: max }) : r.length ? t("results", { n: r.length }) : t("noRes");
    r.slice(0, max).forEach(function (e) {
      var li = document.createElement("li"); li.className = "r";
      li.innerHTML = '<div class="rn"></div><div class="rp"></div><div class="rm"></div><div class="ra"></div>';
      li.children[0].textContent = e.name;
      li.children[1].textContent = e.share + "/" + e.path;
      li.children[2].textContent = fmtDate(e.lastModified) + " · " + fmtSize(e.size || 0) + [e.family, e.submodel, e.dossier].filter(Boolean).map(function (x) { return " · " + x; }).join("");
      var a = li.children[3];
      if (FS && HANDLES[e.share]) {
        a.appendChild(btn(t("open"), "open", function () { openFile(e, false); }));
        a.appendChild(btn(t("download"), "dl", function () { openFile(e, true); }));
      }
      var od = LK.oneDriveUrl(e.share, e.path);
      if (od) { var l = document.createElement("a"); l.className = "sm od"; l.href = od; l.target = "_blank"; l.rel = "noopener"; l.textContent = t("onedrive"); a.appendChild(l); }
      a.appendChild(btn(t("copy"), "cp", function (b) { copy(e.share + "/" + e.path, b); }));
      res.appendChild(li);
    });
  }
  function btn(txt, cls, fn) { var b = document.createElement("button"); b.type = "button"; b.className = "sm " + cls; b.textContent = txt; b.addEventListener("click", function () { fn(b); }); return b; }
  function copy(s, b) {
    var done = function () { var o = b.textContent; b.textContent = t("copied"); setTimeout(function () { b.textContent = o; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(done, fallback); else fallback();
    function fallback() { var ta = document.createElement("textarea"); ta.value = s; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (x) {} ta.remove(); done(); }
    window.__copied = s;
  }
  async function openFile(e, dl) {
    try {
      var h = HANDLES[e.share]; if (!(await permOk(h, true))) return;
      var seg = e.path.split("/"), d = h;
      for (var i = 0; i < seg.length - 1; i++) d = await d.getDirectoryHandle(seg[i]);
      var f = await (await d.getFileHandle(seg[seg.length - 1])).getFile(), url = URL.createObjectURL(f);
      window.__opened = e.path;
      if (dl) { var a = document.createElement("a"); a.href = url; a.download = e.name; document.body.appendChild(a); a.click(); a.remove(); }
      else window.open(url, "_blank");
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    } catch (x) { msg(t("notFound"), true); }
  }

  /* ---------- init ---------- */
  async function init() {
    document.querySelectorAll("#lang button").forEach(function (b) { b.addEventListener("click", function () { lang = b.dataset.l; LK.pref("lang", lang); applyLang(); }); });
    $("btnUpdate").hidden = !FS;
    $("btnUpdate").addEventListener("click", function () { build(null); });
    $("btnLoad").addEventListener("click", function () { $("file").click(); });
    $("file").addEventListener("change", function () { loadFiles(this.files); this.value = ""; });
    $("btnHelp").addEventListener("click", function () { $("help").hidden = false; });
    $("helpClose").addEventListener("click", function () { $("help").hidden = true; });
    buildExt();
    $("clear").addEventListener("click", function () { ["family", "submodel", "dossier", "customer"].forEach(function (i) { $(i).value = ""; }); setExts(null); refreshLists(); run(); });
    $("f").addEventListener("submit", function (e) { e.preventDefault(); document.activeElement && document.activeElement.blur(); run(); });
    $("extAll").addEventListener("click", function () { setExts(null); run(); });
    $("extParam").addEventListener("click", function () { setExts(LK.EXT.param); run(); });
    $("extOffice").addEventListener("click", function () { setExts(LK.EXT.office); run(); });
    LK.combo($("family"), famItems, function (v, typing) { if (!typing) { $("submodel").value = ""; setExts(null); } refreshLists(); later(); });
    LK.combo($("submodel"), subItems, function (v, typing) {
      var exts = LK.modelExt(v, $("family").value);
      if (exts && (!typing || LK.key(v) === LK.key(canonSub($("family").value, v)))) applyModelExt(v);
      later();
    });
    LK.combo($("dossier"), function () { return DOS; }, later);
    LK.combo($("customer"), function () { return []; }, later);
    function net() { $("off").hidden = navigator.onLine; }
    window.addEventListener("online", net); window.addEventListener("offline", net); net();
    try {
      var keys = await LK.idbKeys();
      for (var k of keys) {
        if (k.indexOf("ix:") === 0) { var o = await LK.idbGet(k); if (LK.validIndex(o)) IX[o.share] = o; }
      }
    } catch (e) {}
    for (var s of C.SHARES.concat(Object.keys(IX))) { try { var h = await LK.hGet(s); if (h) HANDLES[s] = h; } catch (e) {} }
    refreshLists(); applyLang(); run();
    document.body.dataset.ready = "1";
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  document.addEventListener("DOMContentLoaded", init);
})(window.LK);
