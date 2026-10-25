/* File System Access mock (same idea as ESC_tool/tools/pwtest/mock.js). Tree from sessionStorage 'mocktree':
   {"ESC_Share": {"projecten": {"Kentaur": {...}}, "a.pdf": [size, minutesAgo]}} */
(function () {
  var perm = sessionStorage.getItem("perm") || "granted";
  window.__log = [];
  function nf() { return Promise.reject(Object.assign(new Error("nf"), { name: "NotFoundError" })); }
  function Dir(name) { this.kind = "directory"; this.name = name; this.c = {}; }
  function Fil(name, data, mt) { this.kind = "file"; this.name = name; this.data = data; this.mt = mt; }
  Dir.prototype.getDirectoryHandle = function (n) { var e = this.c[n]; return e && e.kind === "directory" ? Promise.resolve(e) : nf(); };
  Dir.prototype.getFileHandle = function (n, o) { var e = this.c[n]; if (!e) { if (!(o && o.create)) return nf(); e = this.c[n] = new Fil(n, "", Date.now()); } return Promise.resolve(e); };
  Dir.prototype.values = async function* () {
    if (this.err) throw Object.assign(new Error("A requested file or directory could not be found at the time an operation was processed."), { name: this.err });
    for (var k in this.c) yield this.c[k];
  };
  Dir.prototype.queryPermission = function () { return Promise.resolve(perm); };
  Dir.prototype.requestPermission = function () { window.__log.push("request"); perm = "granted"; sessionStorage.setItem("perm", "granted"); return Promise.resolve("granted"); };
  Fil.prototype.getFile = function () {
    if (this.err) return Promise.reject(Object.assign(new Error("A requested file or directory could not be found at the time an operation was processed."), { name: this.err }));
    return Promise.resolve(new File([this.data], this.name, { lastModified: this.mt }));
  };
  Fil.prototype.createWritable = function () { var s = this; return Promise.resolve({ write: function (d) { s.data = d; s.mt = Date.now(); window.__log.push("write " + s.name); return Promise.resolve(); }, close: function () { return Promise.resolve(); } }); };
  function build(name, spec) {
    var d = new Dir(name);
    if (spec && typeof spec.__throw === "string") { d.err = spec.__throw; return d; }
    Object.keys(spec).forEach(function (k) {
      var v = spec[k];
      if (Array.isArray(v)) { var f = new Fil(k, "x".repeat(Math.max(0, v[0] | 0)), Date.now() - (v[1] || 0) * 60000); if (v[2]) f.err = v[2]; d.c[k] = f; }
      else d.c[k] = build(k, v);
    });
    return d;
  }
  var tree = JSON.parse(sessionStorage.getItem("mocktree") || "{}"), rn = Object.keys(tree)[0] || "ESC_Share";
  var root = window.__root = build(rn, tree[rn] || {});
  window.showDirectoryPicker = function () { window.__log.push("picker"); return Promise.resolve(root); };
  window.__hGet = function (s) { return Promise.resolve(sessionStorage.getItem("picked") === s ? root : undefined); };
  window.__hSet = function (s) { sessionStorage.setItem("picked", s); return Promise.resolve(); };
  window.open = function (u) { window.__log.push("open " + u.slice(0, 5)); };
})();
