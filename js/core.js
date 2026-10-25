/* core.js – pure logic: normalising, glossary expansion, path parsing, scanning a share, searching. */
"use strict";
(function (LK) {
  var C = LK.CFG;
  LK.norm = function (s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ß/g, "ss");
  };
  LK.ext = function (name) { var m = /(\.[^.\\/]+)$/.exec(name || ""); return m ? m[1].toLowerCase() : ""; };

  /* glossary lookup: normalised word -> list of normalised variants */
  var GL = null;
  function gl() {
    if (GL) return GL; GL = {};
    LK.GLOSSARY.forEach(function (row) {
      var n = row.map(LK.norm);
      n.forEach(function (w) { var a = GL[w] || []; n.forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); GL[w] = a; });
    });
    return GL;
  }
  /* "porte coulissante klant" -> [[variants of "porte coulissante"], [variants of "klant"]]; multi-word glossary terms first */
  LK.terms = function (text) {
    var t = LK.norm(text).replace(/[_\-.\\/,;]+/g, " ").replace(/\s+/g, " ").trim(), g = gl(), out = [];
    if (!t) return out;
    Object.keys(g).filter(function (k) { return k.indexOf(" ") > 0; }).sort(function (a, b) { return b.length - a.length; })
      .forEach(function (k) { var i = (" " + t + " ").indexOf(" " + k + " "); if (i >= 0) { out.push(g[k]); t = (t.slice(0, i) + " " + t.slice(i + k.length)).trim(); } });
    t.split(" ").filter(Boolean).forEach(function (w) { out.push(g[w] ? g[w] : [w]); });
    return out.map(function (vs) { // also match glued forms ("sliding door" ~ "sliding_door"/"slidingdoor")
      var r = []; vs.forEach(function (v) { r.push(v); if (v.indexOf(" ") > 0) { r.push(v.replace(/ /g, "_")); r.push(v.replace(/ /g, "")); r.push(v.replace(/ /g, "-")); } });
      return r;
    });
  };

  /* known families/submodels, normalised */
  var FAM = {}, SUB = {}, SUBS = [];
  function sp(s) { return LK.norm(s).replace(/[\/_\-\s.]+/g, " ").trim(); } // "ES_200-T" -> "es 200 t"
  function key(s) { return sp(s).replace(/ /g, ""); } // "ES 200" / "es-200" / "ES200" -> "es200"
  LK.sp = sp; LK.key = key;
  Object.keys(LK.MODELS).forEach(function (f) {
    FAM[LK.norm(f)] = FAM[sp(f)] = FAM[key(f)] = f;
    LK.MODELS[f].forEach(function (m) {
      var o = { f: f, id: m.id }; SUB[LK.norm(m.id)] = SUB[sp(m.id)] = SUB[key(m.id)] = o;
      SUBS.push({ k: " " + sp(m.id) + " ", g: " " + key(m.id) + " ", o: o });
    });
  });
  SUBS.sort(function (a, b) { return b.k.length - a.k.length; }); // longest first: "TS 92 XEA" before "TS 92"
  /* whole-word match, also ignoring spaces/dashes/underscores ("ES 200" = "ES200" = "es-200") */
  function hasPhrase(path, phrase) {
    var want = sp(phrase).split(" ").filter(Boolean);
    if (!want.length) return false;
    var parts = sp(path).split(" ").filter(Boolean), g = want.join(""), w = want.length, i, j, ok;
    for (i = 0; i + w <= parts.length; i++) {
      ok = true;
      for (j = 0; j < w; j++) if (parts[i + j] !== want[j]) { ok = false; break; }
      if (ok) return true;
    }
    for (i = 0; i < parts.length; i++) if (parts[i] === g) return true;
    for (w = 2; w <= 4; w++) for (i = 0; i + w <= parts.length; i++) if (parts.slice(i, i + w).join("") === g) return true;
    return false;
  }
  function word(h, q) { return hasPhrase(String(h).trim(), q); }
  LK.word = word; LK.hasPhrase = hasPhrase;
  function famOf(s) { return FAM[key(s)] || FAM[sp(s)] || FAM[LK.norm(s)] || null; }
  function subOf(s, fam) {
    var k = key(s), i, fallback = null;
    for (i = 0; i < SUBS.length; i++) {
      var o = SUBS[i].o;
      if (key(o.id) !== k) continue;
      if (fam && key(o.f) === key(fam)) return o;
      if (!fallback) fallback = o;
    }
    return fam ? null : fallback;
  }
  /* defaults for a chosen sub-model; family disambiguates "Family/Model" keys */
  LK.modelExt = function (sub, fam) {
    var map = LK.MODEL_EXT || {}, keys = Object.keys(map), i, loose = null, specific = [];
    for (i = 0; i < keys.length; i++) {
      var parts = keys[i].split("/"), ms = parts.length > 1 ? parts[1] : parts[0], fs = parts.length > 1 ? parts[0] : "";
      if (key(ms) !== key(sub)) continue;
      if (fs) specific.push({ f: fs, v: map[keys[i]] }); else loose = map[keys[i]];
    }
    if (fam) for (i = 0; i < specific.length; i++) if (key(specific[i].f) === key(fam)) return specific[i].v;
    return loose || (specific.length === 1 ? specific[0].v : null);
  };
  var NAME_RE = /^(.+?)_(.+)_([^_]+)_(\d{4}-\d\d-\d\d_\d{4})(\.[^.]+)?$/; // ESC_tool: <Family>_<SubModel>_<Dossier>_<stamp>.<ext>
  var INFO_RE = /^(.+?)_(.+)_([^_]+)_info\.pdf$/i;

  /* derive {family, submodel, dossier} from path segments + file name; tolerant for unknown structures (ESA_Share) */
  /* derive {family, submodel, dossier} generically (ESC_Share and ESA_Share, other names):
     container = first folder named like "projecten" (C.CONTAINERS), else the top-level folder;
     family = folder under the container, dossier = next folder (only when the file lies inside a dossier folder).
     File names <Family>_<SubModel>_<Dossier>_<stamp>.<ext> (ESC_tool scheme) refine/override sub-model + dossier. */
  LK.parse = function (path) {
    var seg = path.split("/"), name = seg[seg.length - 1], dirs = seg.length - 1, r = {}, i, m, c = -1;
    for (i = 0; i < dirs; i++) if (C.CONTAINERS.indexOf(LK.norm(seg[i])) >= 0) { c = i; break; }
    var named = c >= 0;
    if (!named && dirs >= 3) c = 0; // no projecten-like folder: the top-level folder plays that role
    if (c >= 0 && dirs >= c + 2 && (named || dirs >= c + 3)) {
      r.family = famOf(seg[c + 1]) || seg[c + 1];
      if (dirs >= c + 3) {
        var subFolder = subOf(seg[c + 2], r.family) || (!r.family ? subOf(seg[c + 2]) : null);
        if (subFolder) {
          r.submodel = subFolder.id; if (!famOf(seg[c + 1])) r.family = subFolder.f;
          else r.family = famOf(seg[c + 1]) || r.family;
          if (dirs >= c + 4) r.dossier = seg[c + 3];
        } else r.dossier = seg[c + 2];
      }
    }
    m = NAME_RE.exec(name) || INFO_RE.exec(name);
    if (m && (famOf(m[1]) || (r.family && key(r.family) === key(m[1])))) {
      r.family = famOf(m[1]) || r.family;
      r.submodel = (subOf(m[2], r.family) || subOf(m[2]) || {}).id || m[2];
      if (!r.dossier) r.dossier = m[3];
    }
    if (!r.family) for (i = 0; i < dirs; i++) if (famOf(seg[i])) { r.family = famOf(seg[i]); break; }
    if (!r.submodel) { // known sub-model as whole words ("ES 200", "ES_200", "es200", "TPB M04")
      for (i = 0; i < SUBS.length; i++) {
        var x = SUBS[i];
        if (hasPhrase(path, x.o.id) && (!r.family || key(x.o.f) === key(r.family))) { r.submodel = x.o.id; if (!r.family) r.family = x.o.f; break; }
      }
    }
    return r;
  };

  /* OneDrive moves files while a 7 GB share is syncing; those calls reject and must not abort the walk. */
  function skipErr(e) {
    var n = e && e.name;
    return n === "NotFoundError" || n === "NotReadableError" || n === "NotAllowedError" || n === "SecurityError";
  }
  function skipName(name) { return !name || C.SKIP.test(name); }

  /* recursive scan of a directory handle -> index object. Missing/locked/temp entries are counted in skipped. */
  LK.scan = async function (root, progress) {
    var entries = [], n = 0, skipped = 0;
    async function walk(dir, pre) {
      var it;
      try { it = dir.values(); }
      catch (e) { if (skipErr(e)) { skipped++; return; } throw e; }
      while (true) {
        var step;
        try { step = await it.next(); }
        catch (e) { if (skipErr(e)) { skipped++; return; } throw e; }
        if (step.done) return;
        var ent = step.value;
        try {
          if (!ent || skipName(ent.name)) { skipped++; continue; }
          var p = pre ? pre + "/" + ent.name : ent.name;
          if (ent.kind === "directory") { await walk(ent, p); continue; }
          if (!pre && ent.name === C.INDEX) continue; // rewritten below; not a skipped user file
          var f = null;
          if (typeof ent.getFile === "function") {
            try { f = await ent.getFile(); }
            catch (e) { if (skipErr(e)) { skipped++; continue; } throw e; }
          }
          if (!f) { skipped++; continue; }
          var o = { path: p, name: ent.name, ext: LK.ext(ent.name), size: f.size, lastModified: f.lastModified }, d = LK.parse(p);
          if (d.family) o.family = d.family; if (d.submodel) o.submodel = d.submodel; if (d.dossier) o.dossier = d.dossier;
          entries.push(o);
          if (progress && ++n % 200 === 0) progress(n);
        } catch (e) { if (skipErr(e)) { skipped++; continue; } throw e; }
      }
    }
    await walk(root, "");
    entries.sort(function (a, b) { return b.lastModified - a.lastModified; });
    return { app: "looky", version: 1, share: root.name, generated: new Date().toISOString(), count: entries.length, skipped: skipped, entries: entries };
  };
  LK.writeIndex = async function (root, idx) {
    var fh = await root.getFileHandle(C.INDEX, { create: true }), w = await fh.createWritable();
    await w.write(JSON.stringify(idx)); await w.close();
  };
  LK.validIndex = function (o) { return o && o.app === "looky" && Array.isArray(o.entries) && typeof o.share === "string"; };

  /* OneDrive web link: base of the share + each path segment encodeURIComponent'd; null when the share is unknown */
  LK.oneDriveUrl = function (share, path) {
    var k = function (x) { return LK.norm(x).replace(/[\s_\-]+/g, "_"); }, m = C.ONEDRIVE || {}, base = null;
    Object.keys(m).forEach(function (s) { if (k(s) === k(share)) base = m[s]; });
    if (!base || !path) return null;
    return base.replace(/\/+$/, "") + "/" + String(path).split("/").filter(Boolean).map(encodeURIComponent).join("/");
  };

  /* file-type filter text -> list of extensions or null (= all) */
  LK.typeExts = function (v) {
    var n = LK.norm(v).trim(), T = LK.T;
    if (!n || n === "*" || ["nl", "fr"].some(function (l) { return LK.norm(T[l].tAll) === n; })) return null;
    if (["nl", "fr"].some(function (l) { return LK.norm(T[l].tParam) === n; }) || n === "param" || n === "parameter" || n === "firmware") return LK.EXT.param;
    if (n === "office" || ["nl", "fr"].some(function (l) { return LK.norm(T[l].tOffice) === n; })) return LK.EXT.office;
    return n.split(/[\s,;]+/).filter(Boolean).map(function (x) { return x.charAt(0) === "." ? x : "." + x; });
  };

  /* q = {family, submodel, dossier, customer, type|exts}; indexes = [index]; returns entries (with .share) newest first.
     exts null/omitted = every extension. Family and sub-model ignore case, spaces, dashes and underscores. */
  LK.search = function (indexes, q) {
    var fam = q.family || "", sub = q.submodel || "", dos = LK.norm(q.dossier).trim(),
      terms = LK.terms(q.customer), exts = q.exts != null ? q.exts : LK.typeExts(q.type || ""), out = [];
    indexes.forEach(function (ix) {
      ix.entries.forEach(function (e) {
        if (exts && exts.indexOf((e.ext || LK.ext(e.name)).toLowerCase()) < 0) return;
        var hay = e._h || (e._h = LK.norm(e.path)), hayGlued = e._g || (e._g = hay.replace(/[\s_\-]+/g, ""));
        if (fam && key(e.family) !== key(fam) && !hasPhrase(e.path, fam)) return;
        if (sub && key(e.submodel) !== key(sub) && !hasPhrase(e.path, sub)) return;
        if (dos && LK.norm(e.dossier).indexOf(dos) < 0 && hay.indexOf(dos) < 0) return;
        for (var i = 0; i < terms.length; i++) if (!terms[i].some(function (v) { return hay.indexOf(v) >= 0 || hayGlued.indexOf(v) >= 0; })) return;
        out.push(Object.assign({ share: ix.share }, e));
      });
    });
    out.sort(function (a, b) { return b.lastModified - a.lastModified; });
    return out;
  };
})(window.LK);
