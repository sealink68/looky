/* combo.js – combobox: free text input + own dropdown list (works on iOS, unlike <datalist>). */
"use strict";
(function (LK) {
  /* el = <input>; getItems() -> [{v: value, l: label?}]; onPick(v) */
  LK.combo = function (el, getItems, onPick) {
    var wrap = el.parentNode, ul = document.createElement("ul"), act = -1;
    ul.className = "cbl"; ul.setAttribute("role", "listbox"); ul.hidden = true; wrap.appendChild(ul);
    el.setAttribute("role", "combobox"); el.setAttribute("autocomplete", "off"); el.setAttribute("aria-expanded", "false");
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "cbb"; btn.tabIndex = -1; btn.textContent = "▾";
    btn.setAttribute("aria-label", "▾"); wrap.appendChild(btn);
    function render(all) {
      var q = LK.norm(el.value).trim(), qk = LK.key ? LK.key(el.value) : "", items = getItems().filter(function (it) {
        if (all || !q) return true;
        if (LK.norm(it.v).indexOf(q) >= 0 || LK.norm(it.l || "").indexOf(q) >= 0) return true;
        return !!(qk && ((LK.key(it.v).indexOf(qk) >= 0) || (it.l && LK.key(it.l).indexOf(qk) >= 0)));
      });
      ul.innerHTML = ""; act = -1;
      items.slice(0, 200).forEach(function (it) {
        var li = document.createElement("li"); li.setAttribute("role", "option"); li.dataset.v = it.v;
        li.innerHTML = "<b></b>" + (it.l ? "<small></small>" : ""); li.firstChild.textContent = it.v; if (it.l) li.lastChild.textContent = it.l;
        li.addEventListener("mousedown", function (e) { e.preventDefault(); pick(it.v); });
        ul.appendChild(li);
      });
      ul.hidden = !items.length; el.setAttribute("aria-expanded", String(!ul.hidden));
    }
    function hide() { ul.hidden = true; el.setAttribute("aria-expanded", "false"); }
    function pick(v) { el.value = v; hide(); if (onPick) onPick(v); }
    el.addEventListener("focus", function () { render(true); });
    el.addEventListener("click", function () { if (ul.hidden) render(true); }); // already focused (iOS tap again)
    el.addEventListener("input", function () { render(false); if (onPick) onPick(el.value, true); });
    el.addEventListener("blur", function () { setTimeout(hide, 120); });
    btn.addEventListener("mousedown", function (e) { e.preventDefault(); if (ul.hidden) { el.focus(); render(true); } else hide(); });
    el.addEventListener("keydown", function (e) {
      var li = ul.children;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (ul.hidden) render(true); if (!li.length) return;
        act = (act + (e.key === "ArrowDown" ? 1 : -1) + li.length) % li.length;
        Array.prototype.forEach.call(li, function (x, i) { x.classList.toggle("act", i === act); });
        li[act].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && !ul.hidden && act >= 0) { e.preventDefault(); pick(li[act].dataset.v); }
      else if (e.key === "Escape") hide();
    });
    return { refresh: function () { if (!ul.hidden) render(false); } };
  };
})(window.LK);
