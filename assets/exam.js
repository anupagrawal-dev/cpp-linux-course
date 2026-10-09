/* Answer boxes on the exam sheet and the question bank: autosave, progress, download/load answers, question navigator.
   Each page has its own store (data-store on .qpage), so practice never fills in the exam.
   Answers are keyed by the question's stable id (data-id, e.g. "pointers-03"), not its number, so adding questions
   never moves answers. Stores written before that (keyed by number) are migrated once with window.LEGACY_QNUMS,
   a frozen number->id map; the old store is left untouched as a backup. */
(function () {
  "use strict";
  var pageEl = document.querySelector(".qpage[data-store]");
  var KEY = (pageEl && pageEl.getAttribute("data-store")) || "course.exam.v2";
  var LEGACY_KEY = pageEl && pageEl.getAttribute("data-legacy-store");
  var LEGACY = window.LEGACY_QNUMS || {};
  var boxes = [].slice.call(document.querySelectorAll("textarea.ansinput"));
  var total = boxes.length;
  function filled(b) { return b.value.trim() !== ""; }
  function progress() {
    var n = boxes.filter(filled).length;
    var el = document.getElementById("prog"); if (el) el.textContent = "Answered " + n + " / " + total;
    var bar = document.getElementById("prog-bar"); if (bar) bar.style.width = (total ? Math.round(100 * n / total) : 0) + "%";
    var pb = document.querySelector(".exam-bar"); if (pb) pb.setAttribute("aria-valuenow", String(n));
    boxes.forEach(function (b) {
      b.classList.toggle("has-text", filled(b));
      var a = document.querySelector('#qnav a[data-n="' + b.dataset.n + '"]'); if (a) a.classList.toggle("answered", filled(b));
    });
    document.dispatchEvent(new CustomEvent("answers:changed"));
  }
  function save() {
    var data = {};
    boxes.forEach(function (b) { if (filled(b)) data[b.dataset.id] = b.value; });
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  function migrate() {
    // one time: copy a number-keyed store into the id-keyed one
    try {
      if (!LEGACY_KEY || localStorage.getItem(KEY) !== null) return;
      var old = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null"), out = {}, n = 0;
      if (!old) return;
      Object.keys(old).forEach(function (num) { var id = LEGACY[num]; if (id && old[num]) { out[id] = old[num]; n++; } });
      localStorage.setItem(KEY, JSON.stringify(out));
    } catch (e) {}
  }
  function load() {
    var data = {};
    migrate();
    try { data = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    boxes.forEach(function (b) { if (data[b.dataset.id] !== undefined) b.value = data[b.dataset.id]; });
    progress();
  }
  boxes.forEach(function (b) { b.addEventListener("input", function () { save(); progress(); }); });
  function pad(n) { return n < 10 ? "0" + n : n; }
  function download() {
    var d = new Date(), stamp = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    var n = boxes.filter(filled).length;
    var out = "# Anup — Exam Answers (" + stamp + ")\n\nAnswered: " + n + " / " + total + "\n\n";
    boxes.forEach(function (b) {
      out += "<!--Q" + b.dataset.n + "|" + b.dataset.topic + "|id=" + b.dataset.id + "-->\n";
      out += "**Q" + b.dataset.n + ". " + b.dataset.q + "**\n\nMy answer:\n" + (b.value.trim() || "(blank)") + "\n\n---\n\n";
    });
    var blob = new Blob([out], { type: "text/markdown" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "anup-exam-answers-" + stamp + ".md";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  function imp(file) {
    var r = new FileReader();
    r.onload = function () {
      // marker: <!--Q12|topic|id=pointers-03-->; files saved before ids existed have no id, so their number is mapped
      var parts = r.result.split(/<!--Q(\d+)\|[^>|]*(?:\|id=([\w-]+))?-->/);
      for (var i = 1; i < parts.length; i += 3) {
        var id = parts[i + 1] || LEGACY[parts[i]], block = parts[i + 2] || "", idx = block.indexOf("My answer:");
        var ans = idx >= 0 ? block.slice(idx + 10) : "";
        ans = ans.replace(/\n---\s*$/, "").trim(); if (ans === "(blank)") ans = "";
        var box = id && document.querySelector('textarea.ansinput[data-id="' + id + '"]'); if (box) box.value = ans;
      }
      save(); progress(); alert("Answers loaded from file.");
    };
    r.readAsText(file);
  }
  var dl = document.getElementById("btn-download"); if (dl) dl.onclick = download;
  var cl = document.getElementById("btn-clear");
  if (cl) cl.onclick = function () { if (confirm("Clear ALL your typed answers?")) { boxes.forEach(function (b) { b.value = ""; }); save(); progress(); } };
  var fi = document.getElementById("file-import"); if (fi) fi.onchange = function (e) { if (e.target.files[0]) imp(e.target.files[0]); e.target.value = ""; };
  var nx = document.getElementById("btn-next");
  if (nx) nx.onclick = function () {
    var b = boxes.filter(function (x) { return !filled(x); })[0];
    if (!b) { alert("Every question has an answer."); return; }
    var card = b.closest(".qcard") || b, target = card.querySelector(".opt input") || b;   // option questions keep their box hidden
    card.scrollIntoView({ block: "center" }); target.focus({ preventScroll: true });
  };
  load();
})();
