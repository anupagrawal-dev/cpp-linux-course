/* Compare mode for the question bank and the exam sheet.
   Questions are grouped in sets (.qset: one per topic in the bank, one for the whole exam). The model answers sit in
   <template class="model"> and stay hidden until the set is compared. Then, by question type (data-type on .qcard):
     short          your answer and the model answer side by side; you mark it Correct / Partly / Missed
     output         your output vs the expected output, auto-checked (exact match, trailing spaces ignored);
                    you can override the mark, e.g. when the output is right but formatted differently. The override
                    is saved with the answer it was given for (course.overrides.v1), so it survives reloads and
                    re-compares until you change that answer
     mcq/multi/tf   auto-scored; the options show what was right and wrong
   Marks are stored by the question's stable id (data-qid on .qcard) in localStorage, ready for weak-area tracking.
   Option inputs write their choice ("B" or "A, C") into the hidden textarea.ansinput, so saving works as for text. */
(function () {
  "use strict";
  var doc = document, MKEY = "course.marks.v1", OKEY = "course.overrides.v1";
  var CHOICE = { mcq: 1, multi: 1, tf: 1 };
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function getMarks() { try { return JSON.parse(localStorage.getItem(MKEY) || "{}"); } catch (e) { return {}; } }
  function setMark(id, v) {
    var m = getMarks(); if (v) m[id] = v; else delete m[id];
    try { localStorage.setItem(MKEY, JSON.stringify(m)); } catch (e) {}
  }
  // your own mark on an output question, remembered with the answer it was given for: { questionId: normalizedAnswer }
  function getOverrides() { try { return JSON.parse(localStorage.getItem(OKEY) || "{}"); } catch (e) { return {}; } }
  function setOverride(id, ans) {
    var o = getOverrides(); if (ans === null) delete o[id]; else o[id] = ans;
    try { localStorage.setItem(OKEY, JSON.stringify(o)); } catch (e) {}
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function keys(v) { return (v || "").split(/[\s,]+/).filter(Boolean).sort(); }
  function normOut(v) { return (v || "").replace(/\r\n?/g, "\n").split("\n").map(function (l) { return l.replace(/\s+$/, ""); }).join("\n").trim(); }

  function cards(set) { return $$(".qcard", set).filter(function (c) { return !c.hidden; }); }   // practice hides all but the chosen ones
  function box(card) { return card.querySelector("textarea.ansinput"); }
  function finish(set) { return set.querySelector(".set-finish"); }
  function qtype(card) { return card.getAttribute("data-type") || "short"; }

  /* ---------- option inputs <-> hidden answer box ---------- */
  function syncOptions(card) {
    var picked = keys(box(card).value);
    $$(".opt input", card).forEach(function (i) { i.checked = picked.indexOf(i.value) >= 0; });
  }
  doc.addEventListener("change", function (e) {
    var inp = e.target; if (!inp.closest || !inp.closest(".opts")) return;
    var card = inp.closest(".qcard"), b = box(card);
    b.value = $$(".opt input", card).filter(function (i) { return i.checked; }).map(function (i) { return i.value; }).join(", ");
    b.dispatchEvent(new Event("input", { bubbles: true }));   // exam.js saves and updates progress on input
  });

  /* ---------- score line ---------- */
  function refresh(set) {
    var cs = cards(set), answered = cs.filter(function (c) { return box(c).value.trim() !== ""; }).length;
    var f = finish(set); if (!f) return;
    f.querySelector(".sf-count").textContent = answered + " / " + cs.length + " answered";
    var sc = f.querySelector(".sf-score");
    if (set.classList.contains("is-comparing")) {
      var marks = getMarks(), y = 0, p = 0, n = 0;
      cs.forEach(function (c) { var v = marks[c.getAttribute("data-qid")]; if (v === "y") y++; else if (v === "p") p++; else if (v === "n") n++; });
      var marked = y + p + n;
      sc.hidden = false;
      sc.textContent = marked ? "Score " + (y + p / 2) + " / " + cs.length + "  ·  " + y + " correct, " + p + " partly, " + n + " missed" +
        (marked < cs.length ? "  ·  " + (cs.length - marked) + " not marked yet" : "") : "Mark each answer below to see your score.";
    } else { sc.hidden = true; }
    set.dispatchEvent(new CustomEvent("marks:changed", { bubbles: true }));   // mock.js keeps its result in step
  }

  /* ---------- building the comparison for one card ---------- */
  var SELFMARK = '<div class="selfmark" role="group" aria-label="How did you do?"><span class="sm-label">How did you do?</span>' +
    '<button type="button" data-v="y" aria-pressed="false">&#10003; Correct</button>' +
    '<button type="button" data-v="p" aria-pressed="false">&#189; Partly</button>' +
    '<button type="button" data-v="n" aria-pressed="false">&#10007; Missed</button></div>';
  function modelCol(title) {
    return '<div class="cmp-col model"><div class="cmp-h"><span aria-hidden="true">&#9670;</span> ' + title + '</div><div class="cmp-body ans-body"></div></div>';
  }
  function paintMark(card, mk) {
    $$(".selfmark button", card).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === mk)); });
    card.setAttribute("data-mark", mk || "");
  }

  function buildCompare(card) {
    var old = card.querySelector(".cmp"); if (old) old.parentNode.removeChild(old);
    var t = qtype(card), id = card.getAttribute("data-qid"), v = box(card).value.trim();
    var cmp = doc.createElement("div"); cmp.className = "cmp cmp-" + t;
    var mk;
    if (CHOICE[t]) {
      var picked = keys(v), correct = keys(card.getAttribute("data-correct"));
      var ok = picked.length > 0 && picked.join() === correct.join();
      mk = ok ? "y" : "n";
      $$(".opt", card).forEach(function (o) {
        var k = o.getAttribute("data-key"), isC = correct.indexOf(k) >= 0, isP = picked.indexOf(k) >= 0;
        o.classList.toggle("is-correct", isC); o.classList.toggle("is-wrong", isP && !isC); o.classList.toggle("is-missed", isC && !isP);
        o.querySelector("input").disabled = true;
      });
      var res = ok ? "&#10003; Correct" + (correct.length > 1 ? " — all of " + correct.join(", ") : "")
        : "&#10007; " + (picked.length ? "You chose " + picked.join(", ") : "No answer") + "  ·  correct: " + correct.join(", ");
      cmp.innerHTML = '<div class="auto-result ' + (ok ? "ok" : "bad") + '">' + res + '</div>' + modelCol("Explanation");
    } else if (t === "output") {
      var exp = card.getAttribute("data-expected"), match = v !== "" && normOut(v) === normOut(exp);
      // a mark you set yourself wins as long as the answer is still the one you marked; otherwise auto-check
      // (exact match -> correct, else missed) and forget the stale override.
      var own = getOverrides()[id] === normOut(v);
      if (own) mk = getMarks()[id];
      else { mk = match ? "y" : "n"; setOverride(id, null); }
      cmp.innerHTML = '<div class="auto-result ' + (match ? "ok" : "bad") + '">' +
        (match ? "&#10003; Matches the expected output" : (v ? "&#10007; Doesn't match the expected output exactly. If yours is right but formatted differently, mark it yourself below." : "&#10007; No answer")) + '</div>' +
        '<div class="cmp-grid"><div class="cmp-col mine"><div class="cmp-h">Your output</div><pre class="out' + (v ? "" : " is-empty") + '">' + esc(v || "(no answer)") + '</pre></div>' +
        '<div class="cmp-col model"><div class="cmp-h"><span aria-hidden="true">&#9670;</span> Expected output</div><pre class="out">' + esc(exp) + '</pre></div></div>' +
        '<div class="cmp-explain">' + modelCol("Explanation") + '</div>' + SELFMARK;
    } else {
      mk = getMarks()[id];
      cmp.innerHTML = '<div class="cmp-grid"><div class="cmp-col mine"><div class="cmp-h">Your answer</div><div class="cmp-body"></div></div>' +
        modelCol("Model answer") + '</div>' + SELFMARK;
      var mine = cmp.querySelector(".mine .cmp-body");
      mine.textContent = v || "(no answer)"; mine.classList.toggle("is-empty", !v);
    }
    cmp.querySelector(".ans-body").appendChild(card.querySelector("template.model").content.cloneNode(true));
    card.appendChild(cmp);
    if (CHOICE[t] || t === "output") setMark(id, mk);
    paintMark(card, mk);
  }

  function unpaint(card) {
    $$(".opt", card).forEach(function (o) {
      o.classList.remove("is-correct", "is-wrong", "is-missed"); o.querySelector("input").disabled = false;
    });
  }

  function compare(set, opts) {
    var cs = cards(set), blank = cs.filter(function (c) { return box(c).value.trim() === ""; }).length;
    if (blank && !(opts && opts.noConfirm) && !confirm(blank + " of " + cs.length + " questions have no answer yet.\nCompare anyway?")) return;
    cs.forEach(buildCompare);
    set.classList.add("is-comparing");
    var f = finish(set);
    f.querySelector(".js-compare").hidden = true; f.querySelector(".js-edit").hidden = false;
    var top = set.getAttribute("data-set") === "exam" ? cs[0] : (doc.getElementById(set.getAttribute("data-set")) || cs[0]);
    if (top && !(opts && opts.noScroll)) top.scrollIntoView({ block: "start" });
    refresh(set); syncFinishBtn();
  }

  function edit(set) {
    set.classList.remove("is-comparing");
    cards(set).forEach(unpaint);
    var f = finish(set);
    f.querySelector(".js-compare").hidden = false; f.querySelector(".js-edit").hidden = true;
    var c = cards(set)[0];
    if (c) { c.scrollIntoView({ block: "start" }); var first = c.querySelector(".opt input") || box(c); first.focus({ preventScroll: true }); }
    refresh(set); syncFinishBtn();
  }

  // the exam bar has its own Finish button that mirrors the set's state
  var finishBtn = doc.getElementById("btn-finish");
  function examSet() { return doc.querySelector('.qset[data-set="exam"]'); }
  function syncFinishBtn() {
    if (!finishBtn) return;
    var on = examSet() && examSet().classList.contains("is-comparing");
    finishBtn.textContent = on ? "Edit my answers" : "Finish & compare";
  }
  if (finishBtn) finishBtn.addEventListener("click", function () {
    var s = examSet(); if (!s) return;
    if (s.classList.contains("is-comparing")) edit(s); else compare(s);
  });

  doc.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    var cbtn = t.closest(".js-compare"), ebtn = t.closest(".js-edit"), mbtn = t.closest(".selfmark button");
    if (cbtn) compare(cbtn.closest(".qset"));
    else if (ebtn) edit(ebtn.closest(".qset"));
    else if (mbtn) {
      var card = mbtn.closest(".qcard"), id = card.getAttribute("data-qid"), v = mbtn.getAttribute("data-v");
      var cur = getMarks()[id], next = cur === v ? null : v;            // clicking the active mark again clears it
      setMark(id, next);
      if (qtype(card) === "output") setOverride(id, normOut(box(card).value));  // your mark now overrides the auto-check
      paintMark(card, next);
      refresh(card.closest(".qset"));
    }
  });

  // keep options, counts and an open comparison in step with typing, loading and clearing answers
  doc.addEventListener("answers:changed", function () {
    $$(".qcard .opts").forEach(function (o) { syncOptions(o.closest(".qcard")); });
    $$(".qset").forEach(function (s) {
      if (s.classList.contains("is-comparing")) cards(s).forEach(buildCompare);
      refresh(s);
    });
  });
  $$(".qcard .opts").forEach(function (o) { syncOptions(o.closest(".qcard")); });
  $$(".qset").forEach(refresh);
  window.CourseCompare = { compare: compare, refresh: refresh };   // used by mock.js
})();
