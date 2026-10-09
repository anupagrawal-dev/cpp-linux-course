/* Shared behaviour for every page. No dependencies. Everything stays in this browser (localStorage). */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var BASE = root.getAttribute("data-root") || "";
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function store(get, key, val) {
    try { if (get) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) {}
    return null;
  }

  /* ---------------- theme ---------------- */
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    $$("[data-theme-set]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-theme-set") === t)); });
  }
  applyTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");
  $$("[data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () { var t = b.getAttribute("data-theme-set"); applyTheme(t); store(false, "course.theme", t); });
  });

  function enableSmooth() { setTimeout(function () { root.classList.add("smooth"); }, 50); }
  if (doc.readyState === "complete") enableSmooth(); else window.addEventListener("load", enableSmooth);

  /* ---------------- sidebar drawer (mobile) ---------------- */
  var menuBtn = $("#menu-btn"), scrim = $("#scrim");
  function menu(open) {
    doc.body.classList.toggle("menu-open", open);
    if (menuBtn) menuBtn.setAttribute("aria-expanded", String(open));
    if (scrim) scrim.hidden = !open;
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { menu(!doc.body.classList.contains("menu-open")); });
  if (scrim) scrim.addEventListener("click", function () { menu(false); });
  var cur = $(".sb-link.is-current");
  if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: "center" }); } catch (e) {} }

  /* ---------------- progress (lessons completed) ---------------- */
  var PKEY = "course.progress.v1";
  function getProg() { var d = {}; try { d = JSON.parse(store(true, PKEY) || "{}"); } catch (e) {} if (!d.lessons) d.lessons = {}; return d; }
  function setDone(slug, on) { var d = getProg(); if (on) d.lessons[slug] = 1; else delete d.lessons[slug]; store(false, PKEY, JSON.stringify(d)); }
  function paintProgress() {
    var d = getProg().lessons;
    $$("a[data-slug]").forEach(function (a) { a.classList.toggle("done", !!d[a.getAttribute("data-slug")]); });
    $$("[data-cat-slugs]").forEach(function (el) {
      var s = el.getAttribute("data-cat-slugs").split(" "), n = s.filter(function (x) { return d[x]; }).length;
      el.textContent = n + "/" + s.length;
    });
    var page = $(".lesson[data-slug]");
    if (page) {
      var on = !!d[page.getAttribute("data-slug")];
      $$(".mark-done").forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(on));
        $(".md-text", btn).textContent = on ? "Completed" : "Mark complete";
      });
    }
    var ot = $("#otp-text");
    if (ot) {
      var os = ot.getAttribute("data-cat-slugs").split(" "), on2 = os.filter(function (x) { return d[x]; }).length;
      ot.textContent = on2 + " of " + os.length + " lessons complete";
      $("#otp-bar").style.width = Math.round(100 * on2 / os.length) + "%";
    }
    // course home
    var mods = $$(".module");
    if (mods.length) {
      var total = 0, done = 0, nextHref = null, nextTitle = null;
      mods.forEach(function (m) {
        var slugs = m.getAttribute("data-slugs").split(" "), hrefs = m.getAttribute("data-hrefs").split(" "), titles = m.getAttribute("data-titles").split("|");
        var n = 0, first = -1;
        slugs.forEach(function (s, i) { if (d[s]) n++; else if (first < 0) first = i; });
        total += slugs.length; done += n;
        $(".bar > span", m).style.width = Math.round(100 * n / slugs.length) + "%";
        $(".module-progress-text", m).textContent = n + " of " + slugs.length + " complete";
        var go = $(".module-go", m);
        go.textContent = n === 0 ? "Start →" : (first < 0 ? "Review →" : "Continue →");
        go.setAttribute("href", first < 0 ? go.getAttribute("data-default-href") : hrefs[first]);
        if (first >= 0 && nextHref === null) { nextHref = hrefs[first]; nextTitle = titles[first]; }
      });
      var ov = $("#overall"), cont = $("#continue"), pct = Math.round(100 * done / total);
      var ring = $("#ring"); if (ring) ring.style.setProperty("--p", pct);
      var rp = $("#ring-pct"); if (rp) rp.textContent = pct + "%";
      var sub = $("#overall-sub");
      if (done > 0) {
        ov.hidden = false;
        $("#overall-bar").style.width = pct + "%";
        $("#overall-text").textContent = done + " of " + total + " lessons complete";
        if (sub) sub.textContent = nextHref ? "Up next: " + nextTitle : "Every lesson is complete. Time to revise.";
        if (nextHref) { cont.setAttribute("href", nextHref); cont.textContent = "Continue course →"; }
      } else {
        ov.hidden = true;
        $("#overall-text").textContent = "Not started yet";
        if (sub) sub.textContent = "Mark lessons complete to track progress here.";
      }
    }
  }
  $$(".mark-done").forEach(function (mark) {
    mark.addEventListener("click", function () {
      var slug = $(".lesson[data-slug]").getAttribute("data-slug");
      setDone(slug, mark.getAttribute("aria-pressed") !== "true"); paintProgress();
    });
  });

  /* ---------------- reading progress + "on this page" scroll-spy (lessons) ---------------- */
  var readbar = $("#readbar"), lessonEl = $(".lesson"), otpLinks = $$(".otp a");
  var targets = otpLinks.map(function (a) { return doc.getElementById(a.getAttribute("href").slice(1)); });
  var ticking = false;
  function onScroll() {
    ticking = false;
    if (readbar && lessonEl) {
      var r = lessonEl.getBoundingClientRect(), span = r.height - window.innerHeight;
      readbar.style.width = (span > 0 ? Math.min(100, Math.max(0, 100 * -r.top / span)) : 100) + "%";
    }
    if (otpLinks.length) {
      var cur = 0, line = 120;
      targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= line) cur = i; });
      if (window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 4) cur = targets.length - 1;
      otpLinks.forEach(function (a, i) { a.classList.toggle("is-active", i === cur); });
    }
  }
  if (lessonEl) {
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    window.addEventListener("resize", onScroll); onScroll();
  }
  paintProgress();
  window.addEventListener("storage", paintProgress);

  /* ---------------- copy buttons ---------------- */
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".copy");
    if (!b) return;
    var code = $("pre", b.closest("figure")).innerText.replace(/\n$/, "");
    function ok() { b.textContent = "Copied"; b.classList.add("copied"); setTimeout(function () { b.textContent = "Copy"; b.classList.remove("copied"); }, 1500); }
    function fallback() {
      var ta = doc.createElement("textarea"); ta.value = code; ta.style.position = "fixed"; ta.style.opacity = "0"; doc.body.appendChild(ta); ta.select();
      try { doc.execCommand("copy"); ok(); } catch (er) { b.textContent = "Press Ctrl+C"; } doc.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(ok, fallback); else fallback();
  });

  /* ---------------- question bank: module filter ---------------- */
  var pills = $$(".qfilter .pill");
  pills.forEach(function (p) {
    p.addEventListener("click", function () {
      var cat = p.getAttribute("data-cat");
      pills.forEach(function (x) { x.classList.toggle("is-active", x === p); });
      $$(".qcat-block").forEach(function (b) { b.hidden = !(cat === "all" || b.getAttribute("data-cat") === cat); });
    });
  });
  // a deep link into a filtered-out module (e.g. from search or a lesson) must still show its target
  function revealHash() {
    var h = location.hash.slice(1); if (!h) return;
    var t = doc.getElementById(h); if (!t) return;
    var blk = t.closest(".qcat-block");
    if (blk && blk.hidden) { var all = $('.qfilter .pill[data-cat="all"]'); if (all) all.click(); t.scrollIntoView(); }
  }
  window.addEventListener("hashchange", revealHash); revealHash();

  /* ---------------- search ---------------- */
  var IDX = window.SEARCH_INDEX || [], overlay = null, input = null, list = null, active = -1, shown = [], lastFocus = null;
  function norm(s) { return (s || "").toLowerCase(); }
  function score(it, terms) {
    var t = norm(it.t), c = norm(it.c), x = norm(it.x), s = 0;
    for (var i = 0; i < terms.length; i++) {
      var w = terms[i], hit = 0;
      if (t.indexOf(w) === 0) hit = 12; else if (t.indexOf(w) > 0) hit = 8;
      else if (c.indexOf(w) >= 0) hit = 4; else if (x.indexOf(w) >= 0) hit = 2;
      if (!hit) return 0; s += hit;
    }
    return s + (it.k === "lesson" ? 1 : 0);
  }
  function run(q) {
    var terms = norm(q).split(/\s+/).filter(Boolean); shown = [];
    if (terms.length) {
      shown = IDX.map(function (it) { return { it: it, s: score(it, terms) }; })
        .filter(function (r) { return r.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 14).map(function (r) { return r.it; });
    }
    list.innerHTML = "";
    if (!terms.length) { list.innerHTML = '<div class="sr-empty">Type to search lessons, concepts and questions.</div>'; active = -1; return; }
    if (!shown.length) { list.innerHTML = '<div class="sr-empty">No matches for “' + q.replace(/[<>&]/g, "") + '”.</div>'; active = -1; return; }
    shown.forEach(function (it, i) {
      var a = doc.createElement("a"); a.className = "sr-item"; a.href = BASE + it.u; a.setAttribute("data-i", i);
      var t = doc.createElement("span"); t.className = "sr-title"; t.textContent = it.t;
      var m = doc.createElement("span"); m.className = "sr-meta";
      var k = doc.createElement("span"); k.className = "sr-kind"; k.textContent = it.k; m.appendChild(k); m.appendChild(doc.createTextNode(it.c));
      a.appendChild(t); a.appendChild(m); list.appendChild(a);
    });
    setActive(0);
  }
  function setActive(i) {
    var items = $$(".sr-item", list); if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach(function (el, k) { el.classList.toggle("is-active", k === active); });
    items[active].scrollIntoView({ block: "nearest" });
  }
  function openSearch() {
    if (overlay) return; lastFocus = doc.activeElement;
    overlay = doc.createElement("div"); overlay.className = "search-overlay"; overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-modal", "true"); overlay.setAttribute("aria-label", "Search");
    overlay.innerHTML = '<div class="search-box"><input class="search-input" type="search" placeholder="Search topics, concepts, questions…" aria-label="Search" autocomplete="off">' +
      '<div class="search-results" role="listbox"></div><div class="search-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div></div>';
    doc.body.appendChild(overlay);
    input = $(".search-input", overlay); list = $(".search-results", overlay);
    input.addEventListener("input", function () { run(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") { var a = $$(".sr-item", list)[active]; if (a) { e.preventDefault(); location.href = a.href; closeSearch(); } }
    });
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) closeSearch(); });
    list.addEventListener("click", function () { closeSearch(); });
    run(""); input.focus();
  }
  function closeSearch() {
    if (!overlay) return; doc.body.removeChild(overlay); overlay = input = list = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  var sb = $("#open-search"); if (sb) sb.addEventListener("click", openSearch);

  /* ---------------- keyboard ---------------- */
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (overlay) closeSearch(); else if (doc.body.classList.contains("menu-open")) menu(false); return; }
    var t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    if (typing || e.ctrlKey || e.metaKey || e.altKey || overlay) return;
    if (e.key === "/") { e.preventDefault(); openSearch(); }
    else if (e.key === "ArrowLeft") { var p = $('.pager-bottom a[rel="prev"]'); if (p) location.href = p.href; }
    else if (e.key === "ArrowRight") { var n = $('.pager-bottom a[rel="next"]'); if (n) location.href = n.href; }
  });
})();
