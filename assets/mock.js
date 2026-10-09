/* Mock exams: the mocks index and each timed mock page.
   Per mock, localStorage keeps:
     course.mock.<id>.state   { start: ms, submitted: ms|null }   the clock survives reloads; submitted = locked
     course.mock.<id>.v1      typed answers (exam.js, via data-store on .qpage)
     course.mock.attempts.v1  { <id>: [ { at, secs, total, y, p, n, pct } ] }   newest last; the latest one is
                              kept in step while you mark the written answers after submitting
   Marks themselves live in the shared course.marks.v1 (compare.js), so a mock also feeds the Progress page.
   On submit the old marks of this mock's written questions are cleared, so you mark this attempt fresh. */
(function () {
  "use strict";
  var doc = document, AKEY = "course.mock.attempts.v1", MKEY = "course.marks.v1";
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clock(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(s / 60)) + ":" + pad(s % 60); }
  function dur(secs) { var m = Math.floor(secs / 60), s = secs % 60; return m + " min " + pad(s) + " s"; }
  function $(id) { return doc.getElementById(id); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  /* ---------------- mocks index ---------------- */
  $$("[data-mock-stats]").forEach(function (el) {
    var id = el.getAttribute("data-mock-stats"), list = (get(AKEY, {})[id] || []), st = get("course.mock." + id + ".state", {});
    var go = el.parentNode.querySelector(".mock-go");
    if (st.start && !st.submitted) { el.innerHTML = "<b>In progress</b>"; go.textContent = "Resume →"; return; }
    if (!list.length) return;
    var best = Math.max.apply(null, list.map(function (a) { return a.pct; })), last = list[list.length - 1];
    el.innerHTML = list.length + " attempt" + (list.length > 1 ? "s" : "") + " &middot; last <b>" + last.pct + "%</b> &middot; best <b>" + best + "%</b>";
    go.textContent = "Open →";
  });

  /* ---------------- one mock ---------------- */
  var page = doc.querySelector(".mock-page");
  if (!page) return;
  var id = page.getAttribute("data-mock"), LIMIT = +page.getAttribute("data-minutes") * 60000;
  var SKEY = "course.mock." + id + ".state", set = doc.querySelector('.qset[data-set="mock"]');
  var cards = $$(".qcard", set), timerId = null;
  function state() { return get(SKEY, {}); }
  function filled(c) { return c.querySelector("textarea.ansinput").value.trim() !== ""; }

  function show(mode) {
    $("mock-intro").hidden = mode !== "intro";
    $("mockbar").hidden = mode !== "running";
    $("mock-body").hidden = mode === "intro";
    $("mock-result").hidden = mode !== "done";
    page.classList.toggle("is-running", mode === "running");
    page.classList.toggle("is-done", mode === "done");
  }

  function tick() {
    var st = state(), left = st.start + LIMIT - Date.now(), t = $("mock-timer");
    t.textContent = clock(left);
    t.classList.toggle("warn", left <= 5 * 60000); t.classList.toggle("danger", left <= 60000);
    if (left <= 0) submit(true, st.start + LIMIT);
  }
  function run() {
    show("running"); tick();
    clearInterval(timerId); timerId = setInterval(tick, 1000);
  }

  function submit(auto, at) {
    var st = state(); if (st.submitted) return;
    if (!auto) {
      var blank = cards.filter(function (c) { return !filled(c); }).length;
      if (!confirm((blank ? blank + " of " + cards.length + " questions have no answer.\n" : "") + "Submit the mock now? You can't change answers afterwards.")) return;
    }
    clearInterval(timerId);
    st.submitted = Math.min(at || Date.now(), st.start + LIMIT); put(SKEY, st);
    // written questions get marked fresh for this attempt (auto-scored ones are re-marked by compare.js)
    var marks = get(MKEY, {});
    cards.forEach(function (c) { if ((c.getAttribute("data-type") || "short") === "short") delete marks[c.getAttribute("data-qid")]; });
    put(MKEY, marks);
    var all = get(AKEY, {}); (all[id] = all[id] || []).push({ at: st.submitted, secs: Math.round((st.submitted - st.start) / 1000), total: cards.length, y: 0, p: 0, n: 0, pct: 0 });
    put(AKEY, all);
    if (auto) alert("Time is up. Your answers have been submitted.");
    done(true);
  }

  function result() {
    var st = state(), marks = get(MKEY, {}), r = { y: 0, p: 0, n: 0, autoN: 0, autoY: 0, wr: 0, wrMarked: 0 };
    cards.forEach(function (c) {
      var v = marks[c.getAttribute("data-qid")], auto = (c.getAttribute("data-type") || "short") !== "short";
      if (v === "y") r.y++; else if (v === "p") r.p++; else if (v === "n") r.n++;
      if (auto) { r.autoN++; if (v === "y") r.autoY++; } else { r.wr++; if (v) r.wrMarked++; }
    });
    var score = r.y + r.p / 2, pct = Math.round(100 * score / cards.length), secs = Math.round((st.submitted - st.start) / 1000);
    $("mr-score").textContent = score + " / " + cards.length;
    $("mr-pct").textContent = pct + "%";
    $("mr-time").textContent = "Time: " + dur(secs) + " of " + LIMIT / 60000 + " min";
    $("mr-auto").textContent = r.autoN ? "Auto-scored: " + r.autoY + " / " + r.autoN + " correct" : "";
    $("mr-written").textContent = r.wr ? (r.wrMarked < r.wr ? "Written: " + (r.wr - r.wrMarked) + " of " + r.wr + " still to mark below" : "Written: all " + r.wr + " marked") : "";
    $("mock-result").classList.toggle("needs-marking", r.wrMarked < r.wr);
    // keep the latest attempt in step with the marks
    var all = get(AKEY, {}), list = all[id] || [], last = list[list.length - 1];
    if (last && last.at === st.submitted) { last.y = r.y; last.p = r.p; last.n = r.n; last.pct = pct; put(AKEY, all); }
  }

  function done(fresh) {
    show("done");
    window.CourseCompare.compare(set, { noConfirm: true, noScroll: true });
    result();
    if (fresh) $("mock-result").scrollIntoView({ block: "start" });
  }

  set.addEventListener("marks:changed", function () { if (state().submitted) result(); });
  $("mock-start").addEventListener("click", function () { put(SKEY, { start: Date.now(), submitted: null }); run(); window.scrollTo(0, 0); });
  $("mock-submit").addEventListener("click", function () { submit(false); });
  $("mock-retake").addEventListener("click", function () {
    if (!confirm("Retake this mock? Your answers on this page are cleared and the clock restarts. Past attempts are kept.")) return;
    drop(SKEY); drop(page.getAttribute("data-store"));
    location.reload();
  });

  var st0 = state();
  if (!st0.start) show("intro");
  else if (!st0.submitted) { if (st0.start + LIMIT <= Date.now()) submit(true, st0.start + LIMIT); else run(); }
  else done(false);
})();
