/* Progress page and weak-spot practice.
   Both read the marks saved by compare.js (localStorage "course.marks.v1": { questionId: "y" | "p" | "n" })
   and the question index window.QMETA (topics in learning order; per id: number, topic, text, type).
   Score: Correct 1, Partly 1/2, Missed 0, averaged over the questions you have marked.
   Practice: Missed first, then Partly, in learning order, at most PRACTICE_MAX; ?topic=<slug> limits it to one topic.
   This file runs before exam.js / compare.js on the practice page, so the chosen cards are visible when they start. */
(function () {
  "use strict";
  var M = window.QMETA, doc = document;
  if (!M) return;
  var PRACTICE_MAX = M.max || 20, MKEY = "course.marks.v1";   // round size comes from sitegen.PRACTICE_MAX
  function getMarks() { try { return JSON.parse(localStorage.getItem(MKEY) || "{}"); } catch (e) { return {}; } }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var topicBySlug = {}; M.topics.forEach(function (t) { topicBySlug[t.s] = t; });

  function tally(ids, marks) {
    var r = { total: ids.length, y: 0, p: 0, n: 0 };
    ids.forEach(function (id) { var v = marks[id]; if (v === "y") r.y++; else if (v === "p") r.p++; else if (v === "n") r.n++; });
    r.marked = r.y + r.p + r.n;
    r.pct = r.marked ? Math.round(100 * (r.y + r.p / 2) / r.marked) : null;
    return r;
  }
  // questions to revisit: Missed first, then Partly; learning order inside each group
  function weakIds(marks, slug) {
    var miss = [], part = [];
    M.topics.forEach(function (t) {
      if (slug && t.s !== slug) return;
      t.ids.forEach(function (id) { if (marks[id] === "n") miss.push(id); else if (marks[id] === "p") part.push(id); });
    });
    return miss.concat(part);
  }
  function level(pct) { return pct === null ? "none" : pct >= 80 ? "good" : pct >= 50 ? "mid" : "low"; }
  function bar(pct) { return '<div class="bar pg-bar ' + level(pct) + '"><span style="width:' + (pct || 0) + '%"></span></div>'; }

  /* ---------------- progress page ---------------- */
  function renderProgress() {
    var marks = getMarks(), all = [];
    M.topics.forEach(function (t) { all = all.concat(t.ids); });
    var o = tally(all, marks), weak = weakIds(marks);
    doc.getElementById("pg-empty").hidden = o.marked > 0;
    doc.getElementById("pg-stats").innerHTML =
      '<div><b>' + (o.pct === null ? "–" : o.pct + "%") + '</b><span>Score</span></div>' +
      '<div><b>' + o.marked + ' <small>/ ' + o.total + '</small></b><span>Questions marked</span></div>' +
      '<div class="st-y"><b>' + o.y + '</b><span>Correct</span></div>' +
      '<div class="st-p"><b>' + o.p + '</b><span>Partly</span></div>' +
      '<div class="st-n"><b>' + o.n + '</b><span>Missed</span></div>';

    doc.getElementById("pg-modules").innerHTML = M.cats.map(function (c) {
      var ids = []; M.topics.forEach(function (t) { if (t.c === c) ids = ids.concat(t.ids); });
      var r = tally(ids, marks);
      return '<div class="pg-module"><div class="pg-row-top"><b>' + esc(c) + '</b><span class="pg-pct ' + level(r.pct) + '">' +
        (r.pct === null ? "not started" : r.pct + "%") + '</span></div>' + bar(r.pct) +
        '<div class="pg-meta">' + r.marked + ' of ' + r.total + ' marked</div></div>';
    }).join("");

    var rows = M.topics.map(function (t) { var r = tally(t.ids, marks); r.t = t; r.weak = weakIds(marks, t.s).length; return r; });
    var started = rows.filter(function (r) { return r.marked; }).sort(function (a, b) { return a.pct - b.pct || b.n - a.n || a.t.o - b.t.o; });
    var fresh = rows.filter(function (r) { return !r.marked; });
    doc.getElementById("pg-topics").innerHTML = started.concat(fresh).map(function (r) {
      var t = r.t;
      return '<div class="pg-topic" data-slug="' + t.s + '"><div class="pg-row-top"><a href="master-question-sheet.html#' + t.s + '"><span class="pg-num">' + pad(t.o) + '</span> ' + esc(t.t) + '</a>' +
        '<span class="pg-pct ' + level(r.pct) + '">' + (r.pct === null ? "not started" : r.pct + "%") + '</span></div>' + bar(r.pct) +
        '<div class="pg-meta"><span>' + r.marked + ' / ' + r.total + ' marked</span>' +
        (r.marked ? '<span>' + r.y + ' correct · ' + r.p + ' partly · ' + r.n + ' missed</span>' : '') +
        (r.weak ? '<a class="pg-practice" href="practice.html?topic=' + t.s + '">Practice ' + r.weak + ' &rarr;</a>' : '') + '</div></div>';
    }).join("");

    doc.getElementById("pg-weak").innerHTML = weak.length ? '<ol class="pg-weak-list">' + weak.map(function (id) {
      var q = M.q[id], t = topicBySlug[q.s], v = marks[id];
      return '<li><span class="pg-badge ' + (v === "n" ? "n" : "p") + '">' + (v === "n" ? "Missed" : "Partly") + '</span>' +
        '<a href="master-question-sheet.html#q' + q.n + '">Q' + q.n + '. ' + esc(q.q) + '</a><span class="pg-from">' + pad(t.o) + ' ' + esc(t.t) + '</span></li>';
    }).join("") + '</ol>' : '<p class="pg-none">' + (o.marked ? "Nothing to revisit: every marked question is correct." : "Nothing yet.") + '</p>';

    var pb = doc.getElementById("pg-practice");
    pb.classList.toggle("is-disabled", !weak.length);
    pb.setAttribute("aria-disabled", String(!weak.length));
    pb.textContent = weak.length ? "Practice my weak spots (" + Math.min(weak.length, PRACTICE_MAX) + ") →" : "No weak spots to practice";
  }

  if (doc.getElementById("pg-topics")) {
    renderProgress();
    doc.getElementById("pg-practice").addEventListener("click", function (e) { if (this.getAttribute("aria-disabled") === "true") e.preventDefault(); });
    doc.getElementById("pg-reset").addEventListener("click", function () {
      if (!confirm("Reset ALL your Correct / Partly / Missed marks?\nYour typed answers are kept.")) return;
      try { localStorage.removeItem(MKEY); localStorage.removeItem("course.overrides.v1"); } catch (e) {}
      renderProgress();
    });
    window.addEventListener("storage", renderProgress);
    window.addEventListener("pageshow", function (e) { if (e.persisted) renderProgress(); });
  }

  /* ---------------- weak-spot practice page ---------------- */
  var set = doc.querySelector('.qset[data-set="practice"]');
  if (set) {
    var slug = (location.search.match(/[?&]topic=([\w-]+)/) || [])[1];
    if (slug && !topicBySlug[slug]) slug = null;
    var ids = weakIds(getMarks(), slug).slice(0, PRACTICE_MAX), show = {};
    ids.forEach(function (id) { show[id] = 1; });
    var byId = {};
    Array.prototype.forEach.call(set.querySelectorAll(".qcard"), function (c) { c.hidden = !show[c.getAttribute("data-qid")]; byId[c.getAttribute("data-qid")] = c; });
    // put the chosen cards first, in priority order (Missed, then Partly)
    ids.slice().reverse().forEach(function (id) { if (byId[id]) set.insertBefore(byId[id], set.firstChild); });
    if (slug) doc.getElementById("pr-scope").textContent = pad(topicBySlug[slug].o) + " " + topicBySlug[slug].t;
    var empty = doc.getElementById("pr-empty");
    if (!ids.length) {
      empty.hidden = false; set.hidden = true;
      empty.innerHTML = Object.keys(getMarks()).length
        ? "<b>No weak spots" + (slug ? " in this topic" : "") + ".</b> Every question you marked is correct. <a href=\"progress.html\">Back to progress</a>"
        : "<b>Nothing to practice yet.</b> Answer and mark some questions in the <a href=\"master-question-sheet.html\">question bank</a> first.";
    }
    // a fresh round: forget the answers typed on this page (marks stay), then pick the weak questions again
    doc.getElementById("pr-new").addEventListener("click", function () {
      if (!confirm("Start a new round? Answers typed on this page are cleared; your marks stay.")) return;
      try { localStorage.removeItem(doc.querySelector(".qpage").getAttribute("data-store")); } catch (e) {}
      location.reload();
    });
  }
})();
