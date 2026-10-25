/* store.js – tiny IndexedDB key/value store (indexes + directory handles) and localStorage prefs. */
"use strict";
(function (LK) {
  var dbp;
  function db() {
    if (!dbp) dbp = new Promise(function (res, rej) {
      var r = indexedDB.open("looky", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) { return new Promise(function (res, rej) {
      var t = d.transaction("kv", mode), q = fn(t.objectStore("kv"));
      t.oncomplete = function () { res(q && q.result); }; t.onerror = t.onabort = function () { rej(t.error); };
    }); });
  }
  LK.idbGet = function (k) { return tx("readonly", function (s) { return s.get(k); }); };
  LK.idbSet = function (k, v) { return tx("readwrite", function (s) { return s.put(v, k); }); };
  LK.idbDel = function (k) { return tx("readwrite", function (s) { return s.delete(k); }); };
  LK.idbKeys = function () { return tx("readonly", function (s) { return s.getAllKeys(); }); };
  /* handles go through these so tests can replace them (mock handles are not structured-cloneable) */
  LK.hGet = window.__hGet || function (share) { return LK.idbGet("h:" + share); };
  LK.hSet = window.__hSet || function (share, h) { return LK.idbSet("h:" + share, h); };
  LK.pref = function (k, v) {
    try { if (v === undefined) return localStorage.getItem("looky." + k); localStorage.setItem("looky." + k, v); } catch (e) { return null; }
  };
})(window.LK);
