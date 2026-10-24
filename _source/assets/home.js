/*
 * Latryn homepage motion.
 * Scroll is the timeline: GSAP ScrollTrigger (bundled in assets/vendor) drives every
 * scroll-linked transition, Lenis (started in site.js) supplies the inertial glide.
 * Reduced motion or a missing library = everything renders in its final state.
 */
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  var motion = !reduce && G && ST;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function scrollToY(y) {
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }

  /* ---------- text helpers ---------- */
  function wrapWords(el, cls) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n, out = [];
    while ((n = walker.nextNode())) { if (!n.parentNode.closest("svg")) nodes.push(n); }
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement("span"); w.className = cls;
        if (cls === "wd") { var inner = document.createElement("span"); inner.textContent = part; w.appendChild(inner); out.push(inner); }
        else { w.textContent = part; out.push(w); }
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return out;
  }
  function wrapChars(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n, out = [];
    while ((n = walker.nextNode())) { if (!n.parentNode.closest("svg")) nodes.push(n); }
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (word) {
        if (!word) return;
        if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(word)); return; }
        var w = document.createElement("span"); w.style.display = "inline-block"; w.style.whiteSpace = "nowrap";
        word.split("").forEach(function (c) { var s = document.createElement("span"); s.className = "ch"; s.textContent = c; w.appendChild(s); out.push(s); });
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return out;
  }

  /* ---------- hero: the seal and sign sequence (signature moment) ---------- */
  var task = $("#tilt"), gates = $$(".gate", task), stamp = $("#stamp"), heroDot = $("#heroDot"), timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function runSeal(first) {
    timers.forEach(clearTimeout); timers = [];
    if (!motion) { task.classList.add("typed", "run", "ended"); gates.forEach(function (g) { g.classList.add("done"); }); stamp.classList.add("on"); heroDot.classList.add("on"); return; }
    task.classList.remove("typed", "run", "ended"); gates.forEach(function (g) { g.classList.remove("done"); }); stamp.classList.remove("on");
    void task.offsetWidth;
    var t0 = first ? 1500 : 150;
    later(function () { task.classList.add("typed"); }, t0);
    later(function () { task.classList.add("run"); }, t0 + 950);
    gates.forEach(function (g, i) { later(function () { g.classList.add("done"); }, t0 + 1200 + i * 420); });
    later(function () { stamp.classList.add("on"); heroDot.classList.add("on"); }, t0 + 1200 + 3 * 420 + 250);
    later(function () { task.classList.add("ended"); }, t0 + 1200 + 3 * 420 + 900);
  }
  $("#replay").addEventListener("click", function () { runSeal(false); });

  /* ---------- static content built once ---------- */
  var CAP = ["Egocentric video", "Benchmark authoring", "Hand and object annotation", "SFT data", "RLHF and preference data", "Agent environments"];
  var CAP2 = ["MCP and tool use", "Docker and terminal tasks", "Red teaming", "Head-mounted capture", "Rubric design", "Action segmentation", "Technical QA"];
  function fillRow(el, items) { items.concat(items, items).forEach(function (t) { var s = document.createElement("span"); s.textContent = t; el.appendChild(s); }); }
  fillRow($("#rowA"), CAP); fillRow($("#rowB"), CAP2);

  /* demos in the practice cards: run only while their card is in view */
  setInterval(function () {
    var p = $("#pref"); if (p && p.closest(".in")) { var d = p.children; d[0].classList.toggle("pick"); d[1].classList.toggle("pick"); }
  }, 1700);
  var vi = 0;
  setInterval(function () {
    var v = $("#verdict"); if (!v || !v.closest(".in")) return;
    v.children[vi].classList.remove("on"); vi = (vi + 1) % 3; v.children[vi].classList.add("on");
  }, 2000);

  /* ---------- FAQ as a conversation ---------- */
  var msgs = $("#msgs"), qbtns = $$(".qbtn");
  function bubble(cls, text) { var m = document.createElement("div"); m.className = "msg " + cls + (motion ? " pop" : ""); m.textContent = text; msgs.appendChild(m); return m; }
  var faqTimer;
  qbtns.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.getAttribute("aria-pressed") === "true") return;
      clearTimeout(faqTimer);
      qbtns.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      var old = $(".typing", msgs); if (old) old.remove();
      while (msgs.children.length > 2) msgs.removeChild(msgs.firstChild);
      bubble("me", b.querySelector(".qt").textContent);
      if (!motion) { bubble("us", b.getAttribute("data-a")); return; }
      var t = document.createElement("div"); t.className = "typing"; t.setAttribute("aria-hidden", "true"); t.innerHTML = "<i></i><i></i><i></i>"; msgs.appendChild(t);
      faqTimer = setTimeout(function () { t.remove(); bubble("us", b.getAttribute("data-a")); }, 750);
    });
  });

  /* ---------- page chrome: progress line, nav, floating CTA ---------- */
  var bar = $(".progress"), nav = $("#nav"), fab = $("#fab"), contact = $("#contact"), foot = $("footer"), last = 0, tick = false;
  var links = $$('.nav-links a[href^="#"]').map(function (a) { return [a, document.getElementById(a.getAttribute("href").slice(1))]; });
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
    nav.classList.toggle("scrolled", y > 10);
    nav.classList.toggle("hide", y > last + 2 && y > 500);
    if (y < last - 2) nav.classList.remove("hide");
    last = y;
    var nearEnd = contact.getBoundingClientRect().top < innerHeight * .85 || foot.getBoundingClientRect().top < innerHeight;
    fab.classList.toggle("on", y > innerHeight * 1.1 && !nearEnd);
    var cur = null;
    links.forEach(function (l) { if (l[1] && l[1].getBoundingClientRect().top < innerHeight * .4) cur = l[0]; });
    links.forEach(function (l) { l[0].classList.toggle("active", l[0] === cur); });
    tick = false;
  }
  addEventListener("scroll", function () { if (!tick) { requestAnimationFrame(onScroll); tick = true; } }, { passive: true });
  onScroll();

  /* ---------- egocentric viewfinder: four layers, one per step ---------- */
  var egoVf = $("#egoVf"), egoBtns = $$("#egoSteps button"), egoPinST = null, egoTime = $("#egoTime");
  function egoStage(n) {
    egoVf.setAttribute("data-stage", n);
    egoBtns.forEach(function (b, i) { b.classList.toggle("on", i < n && i === n - 1); b.setAttribute("aria-pressed", i === n - 1 ? "true" : "false"); });
  }
  egoBtns.forEach(function (b, i) {
    b.addEventListener("click", function () {
      if (egoPinST) scrollToY(egoPinST.start + (egoPinST.end - egoPinST.start) * (i + .5) / egoBtns.length);
      else egoStage(i + 1);
    });
  });
  egoStage(4);
  if (motion) { var secs = 12; setInterval(function () { if (egoVf.getBoundingClientRect().bottom < 0 || egoVf.getBoundingClientRect().top > innerHeight) return; secs++; egoTime.textContent = "00:00:" + (secs % 60 < 10 ? "0" : "") + (secs % 60); }, 1000); }

  /* ---------- no motion: final states, done ---------- */
  if (!motion) {
    $$(".dot").forEach(function (d) { d.classList.add("on"); });
    $$(".pc").forEach(function (c) { c.classList.add("in"); });
    runSeal(true);
    return;
  }

  G.registerPlugin(ST);
  var EXPO = "expo.out";

  /* hero intro: headline letters rise out of a blur, the swash draws under "verify" */
  var chars = wrapChars($("#heroH1"));
  var swash = $("#swash"), len = swash.getTotalLength();
  G.set(swash, { strokeDasharray: len, strokeDashoffset: len });
  var intro = G.timeline({ defaults: { ease: EXPO } });
  intro.from(chars, { yPercent: 120, rotate: 10, opacity: 0, filter: "blur(10px)", duration: 1.1, stagger: .028 }, .1)
       .to(swash, { strokeDashoffset: 0, duration: .9, ease: "power2.inOut" }, .85)
       .from("[data-hero]", { y: 28, opacity: 0, duration: 1, stagger: .09 }, .45)
       .from("#cardZone", { y: 140, opacity: 0, duration: 1.4 }, .55)
       .from(".float", { scale: .5, opacity: 0, duration: .8, stagger: .14, ease: "back.out(2)" }, 1.4);
  runSeal(true);

  /* hero copy drifts up and dims as the card takes over */
  G.to("#heroCopy", { y: -90, opacity: .15, scale: .96, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 20%", scrub: true } });
  /* card stands up from a tilt and lands on the edge of the dark stage */
  G.fromTo("#tilt", { rotateX: 16, scale: .9 }, { rotateX: 0, scale: 1, ease: "none", scrollTrigger: { trigger: "#cardZone", start: "top 95%", end: "center 50%", scrub: true } });
  $$(".float").forEach(function (f, i) {
    G.to(f, { y: [-110, -40, -150][i], ease: "none", scrollTrigger: { trigger: "#cardZone", start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* dark and green panels open from rounded inset to full bleed, then close as they leave */
  var darkTriggers = [];
  $$(".panel").forEach(function (p) {
    G.fromTo(p, { "--xa": 1 }, { "--xa": 0, ease: "none", scrollTrigger: { trigger: p, start: "top 95%", end: "top 30%", scrub: true } });
    G.fromTo(p, { "--xb": 0 }, { "--xb": 1, ease: "none", immediateRender: false, scrollTrigger: { trigger: p, start: "bottom 80%", end: "bottom 15%", scrub: true } });
    darkTriggers.push(ST.create({ trigger: p, start: "top 70px", end: "bottom 70px", onToggle: function () {
      nav.classList.toggle("dark", darkTriggers.some(function (t) { return t.isActive; }));
    } }));
  });

  /* statement: words light up one by one as you read down */
  var sWords = wrapWords($("#statement"), "sw-word");
  G.fromTo(sWords, { opacity: .14 }, { opacity: 1, stagger: .1, ease: "none", scrollTrigger: { trigger: "#statement", start: "top 78%", end: "bottom 42%", scrub: true } });
  /* capability rows slide in opposite directions with the scroll */
  G.fromTo("#rowA", { xPercent: 0 }, { xPercent: -22, ease: "none", scrollTrigger: { trigger: ".rows", start: "top bottom", end: "bottom top", scrub: true } });
  G.fromTo("#rowB", { xPercent: -22 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: ".rows", start: "top bottom", end: "bottom top", scrub: true } });

  /* section headings rise word by word from a mask; the ember full stop stamps last */
  $$("main h2").forEach(function (h) {
    if (h.id === "qTitle") return;
    var w = wrapWords(h, "wd"), dot = $(".dot", h);
    $$(".wd", h).forEach(function (s) { s.style.cssText = "display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.1em;margin-bottom:-.1em"; });
    G.from(w, { yPercent: 110, duration: 1.1, stagger: .055, ease: EXPO, scrollTrigger: { trigger: h, start: "top 86%" },
      onComplete: function () { if (dot) dot.classList.add("on"); } });
  });
  $$(".eyebrow").forEach(function (e) {
    if (e.closest(".hero")) return;
    G.from(e, { opacity: 0, x: -14, duration: .8, ease: EXPO, scrollTrigger: { trigger: e, start: "top 90%" } });
  });

  /* how it works: five steps intro circles light in turn */
  G.from(".nums span", { scale: .4, opacity: 0, duration: .7, stagger: .08, ease: "back.out(2)", scrollTrigger: { trigger: ".nums", start: "top 85%" } });

  var mm = G.matchMedia();
  var hiw = $("#hiw"), steps = $$(".hs"), dots = $("#dots");

  /* ===== desktop: pinned scenes ===== */
  mm.add("(min-width: 901px)", function () {
    /* --- how it works pins; scrolling advances the five steps --- */
    hiw.classList.add("pinned");
    dots.innerHTML = "";
    var dotBtns = [], lines = [];
    steps.forEach(function (s, i) {
      if (i) { var l = document.createElement("span"); l.className = "ln"; l.innerHTML = "<i></i>"; dots.appendChild(l); lines.push(l.firstChild); }
      var b = document.createElement("button"); b.type = "button"; b.textContent = "0" + (i + 1); b.setAttribute("aria-label", "Step " + (i + 1));
      dots.appendChild(b); dotBtns.push(b);
    });
    var cur = -1;
    function show(i, dir) {
      if (i === cur) return;
      var prev = steps[cur], next = steps[i];
      if (prev) {
        G.killTweensOf(prev.querySelectorAll("*"));
        G.to(prev.querySelectorAll("h3 .ln>span"), { yPercent: -110 * dir, duration: .45, ease: "power3.in", stagger: .04 });
        G.to(prev.querySelectorAll(".k,p"), { opacity: 0, y: -20 * dir, duration: .35, ease: "power2.in" });
        G.to(prev.querySelector(".device"), { opacity: 0, y: -70 * dir, rotate: -5 * dir, scale: .94, duration: .45, ease: "power3.in",
          onComplete: function (el) { prev.classList.remove("cur"); } });
      }
      steps.forEach(function (s, j) { if (j !== i && s !== prev) s.classList.remove("cur"); });
      next.classList.add("cur");
      var d = prev ? .3 : 0;
      G.fromTo(next.querySelectorAll("h3 .ln>span"), { yPercent: 115 * dir }, { yPercent: 0, duration: 1, ease: EXPO, stagger: .08, delay: d });
      G.fromTo(next.querySelectorAll(".k,p"), { opacity: 0, y: 26 * dir }, { opacity: 1, y: 0, duration: .9, ease: EXPO, stagger: .08, delay: d + .1 });
      G.fromTo(next.querySelector(".device"), { opacity: 0, y: 90 * dir, rotate: 6 * dir, scale: .92 }, { opacity: 1, y: 0, rotate: 0, scale: 1, duration: 1.1, ease: EXPO, delay: d });
      G.fromTo(next.querySelectorAll(".device .dv-row,.device .dv-grid,.device .dv-cta,.device .dv-tag"), { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: .7, ease: EXPO, stagger: .06, delay: d + .25 });
      dotBtns.forEach(function (b, j) { b.classList.toggle("on", j <= i); b.setAttribute("aria-current", j === i ? "step" : "false"); });
      cur = i;
    }
    var pinST = ST.create({
      trigger: hiw, start: "top top", end: function () { return "+=" + innerHeight * (steps.length - 1) * 0.9; },
      pin: true, anticipatePin: 1,
      onUpdate: function (self) {
        var p = self.progress * (steps.length - 1), i = Math.min(steps.length - 1, Math.floor(p + .5));
        lines.forEach(function (l, j) { l.style.transform = "scaleX(" + Math.max(0, Math.min(1, p - j)) + ")"; });
        show(i, self.direction >= 0 ? 1 : -1);
      }
    });
    show(0, 1);
    dotBtns.forEach(function (b, i) {
      b.addEventListener("click", function () { scrollToY(pinST.start + (pinST.end - pinST.start) * (i / (steps.length - 1)) + 2); });
    });

    /* --- egocentric: the section pins and the viewfinder gains a layer per step --- */
    $("#egocentric").classList.add("pinned");
    egoStage(1);
    egoPinST = ST.create({ trigger: "#egoPin", start: "top top", end: function () { return "+=" + innerHeight * 2.4; }, pin: true, anticipatePin: 1,
      onUpdate: function (self) { egoStage(Math.min(4, Math.floor(self.progress * 4) + 1)); } });
    G.fromTo("#egoVf", { rotate: 3, scale: .9, y: 60 }, { rotate: 0, scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: "#egocentric", start: "top bottom", end: "top top", scrub: true } });

    /* --- practices: the section pins and the cards travel sideways --- */
    var track = $("#hzTrack");
    function dist() { return Math.max(0, track.scrollWidth - innerWidth); }
    var hz = G.to(track, { x: function () { return -dist(); }, ease: "none",
      scrollTrigger: { trigger: "#hzPin", start: "top top", end: function () { return "+=" + dist(); }, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
    $$(".pc", track).forEach(function (c, i) {
      ST.create({ trigger: c, containerAnimation: hz, start: "left 80%", onEnter: function () { c.classList.add("in"); } });
      if (i) G.fromTo(c, { rotate: 4, scale: .9, opacity: .5 }, { rotate: 0, scale: 1, opacity: 1, ease: "none",
        scrollTrigger: { trigger: c, containerAnimation: hz, start: "left right", end: "left 45%", scrub: true } });
    });
    ST.create({ trigger: track, start: "top 75%", onEnter: function () { track.children[0].classList.add("in"); } });

    /* --- audiences: cards stack; the one underneath sinks back --- */
    var cards = $$(".scard");
    cards.forEach(function (c, i) {
      if (i === cards.length - 1) return;
      G.to(c, { scale: .9 - (cards.length - 2 - i) * .03, filter: "brightness(.72)", ease: "none",
        scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top 140px", scrub: true } });
    });

    /* --- quality gates float in tilted and settle as you scroll --- */
    G.fromTo(".gcard", { y: function (i) { return [180, 300, 220][i]; }, x: function (i) { return [-60, 0, 60][i]; }, rotate: function (i) { return [-9, 5, 11][i]; } },
      { y: 0, x: 0, rotate: 0, ease: "none", scrollTrigger: { trigger: "#gates", start: "top bottom", end: "center 58%", scrub: 1 } });

    return function () { egoPinST = null; $("#egocentric").classList.remove("pinned"); egoStage(4); hiw.classList.remove("pinned"); steps.forEach(function (s) { s.classList.remove("cur"); }); dots.innerHTML = ""; };
  });

  /* ===== phones and small tablets: same story, no pinning ===== */
  mm.add("(max-width: 900px)", function () {
    egoStage(1);
    egoBtns.forEach(function (b, i) { ST.create({ trigger: b, start: "top 70%", onEnter: function () { egoStage(Math.max(+egoVf.getAttribute("data-stage"), i + 1)); } }); });
    G.from("#egoVf", { y: 60, rotate: 3, opacity: 0, duration: 1.1, ease: EXPO, scrollTrigger: { trigger: "#egoVf", start: "top 90%" } });
    steps.forEach(function (s) {
      G.from(s.querySelectorAll("h3 .ln>span"), { yPercent: 110, duration: 1, ease: EXPO, stagger: .08, scrollTrigger: { trigger: s, start: "top 80%" } });
      G.from(s.querySelector(".device"), { y: 60, rotate: 4, opacity: 0, duration: 1, ease: EXPO, scrollTrigger: { trigger: s.querySelector(".device"), start: "top 88%" } });
    });
    $$(".pc").forEach(function (c) {
      ST.create({ trigger: c, start: "top 75%", onEnter: function () { c.classList.add("in"); } });
      G.from(c, { y: 60, opacity: 0, duration: 1, ease: EXPO, scrollTrigger: { trigger: c, start: "top 90%" } });
    });
    G.from(".gcard", { y: 80, rotate: function (i) { return [-6, 4, 7][i]; }, opacity: 0, duration: 1, ease: EXPO, stagger: .1, scrollTrigger: { trigger: "#gates", start: "top 85%" } });
  });

  /* quality title: grey-to-ink as it reaches the middle */
  var qWords = wrapWords($("#qTitle"), "sw-word");
  G.fromTo(qWords, { opacity: .12 }, { opacity: 1, stagger: .1, ease: "none", scrollTrigger: { trigger: "#qTitle", start: "top 85%", end: "bottom 50%", scrub: true,
    onLeave: function () { $("#qTitle .dot").classList.add("on"); } } });
  ST.create({ trigger: "#qTitle", start: "bottom 50%", onEnter: function () { $("#qTitle .dot").classList.add("on"); } });

  /* comparison: rows slide in, then each Latryn row is stamped */
  G.from("#cmp tbody tr", { x: -30, opacity: 0, duration: .8, stagger: .08, ease: EXPO, scrollTrigger: { trigger: "#cmp", start: "top 80%" } });
  G.from("#cmp .us-in .sq", { scale: 2, opacity: 0, duration: .38, stagger: .15, delay: .5, ease: "power2.out", scrollTrigger: { trigger: "#cmp", start: "top 80%" } });

  /* task library: files list like terminal output, then the verifier line types */
  var ftl = G.timeline({ scrollTrigger: { trigger: "#files", start: "top 78%" } });
  ftl.from("#files", { y: 80, rotate: 3, opacity: 0, duration: 1.1, ease: EXPO })
     .from("#files .row", { opacity: 0, x: -12, duration: .4, stagger: .08 }, .4)
     .fromTo("#files .verify", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: .9, ease: "steps(34)" }, "+=.1");

  /* careers, blog, FAQ */
  G.from(".role", { x: 70, opacity: 0, duration: 1, stagger: .1, ease: EXPO, scrollTrigger: { trigger: ".role", start: "top 85%" } });
  G.from(".tags span", { y: 14, opacity: 0, duration: .5, stagger: .03, ease: EXPO, scrollTrigger: { trigger: ".tags", start: "top 90%" } });
  G.from(".post", { y: 110, rotate: function (i) { return [-4, 2, 5][i]; }, opacity: 0, duration: 1.2, stagger: .12, ease: EXPO, scrollTrigger: { trigger: "#posts", start: "top 85%" } });
  G.from(".qbtn", { x: -30, opacity: 0, duration: .7, stagger: .06, ease: EXPO, scrollTrigger: { trigger: "#qlist", start: "top 85%" } });
  G.from(".chat", { y: 90, rotate: 2, opacity: 0, duration: 1.2, ease: EXPO, scrollTrigger: { trigger: ".chat", start: "top 88%" } });
  G.from("#contact-form", { opacity: 0, duration: 1.1, ease: EXPO, scrollTrigger: { trigger: "#contact-form", start: "top 92%" } });

  /* footer: the wordmark rises letter by letter with the last stretch of scroll */
  var big = $("#bigword svg");
  if (big) {
    var glyphs = $$("path, rect", big).map(function (p) {
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.setAttribute("class", "glyph");
      p.parentNode.insertBefore(g, p); g.appendChild(p); return g;
    });
    G.from(glyphs, { y: 900, opacity: 0, stagger: .08, ease: "none", scrollTrigger: { trigger: "#bigword", start: "top bottom", end: "bottom bottom", scrub: true } });
  }

  /* everything measured after fonts settle */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  addEventListener("load", function () { ST.refresh(); });
})();
