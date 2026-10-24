/*
 * Latryn site config + shared behaviour.
 * EDIT THIS BLOCK ONCE: every CTA on every page reads from it.
 * Leave a value as "" and the link that uses it falls back gracefully
 * (social links hide, "Book a call" opens the contact form instead).
 */
window.LATRYN = {
  email: "hello@YOUR-DOMAIN.com",        // receives "Scope a program", "Book a call" and general enquiries
  careersEmail: "careers@YOUR-DOMAIN.com", // receives "Join the Lattice" applications
  bookingUrl: "",                          // e.g. a Cal.com or Calendly link; empty = use the contact form
  social: {
    linkedin: "",                          // e.g. https://www.linkedin.com/company/latryn
    x: "",                                 // e.g. https://x.com/latryn
    youtube: ""                            // e.g. https://www.youtube.com/@latryn
  }
};

(function () {
  var C = window.LATRYN;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- smooth, inertial scrolling (Lenis, bundled in assets/vendor) ----------
     Native scroll position is still used, so sticky sections, scroll events and the
     keyboard all keep working. Touch devices keep their own native momentum. */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    window.__lenis = lenis;
    if (window.gsap && window.ScrollTrigger) {
      /* homepage: one clock for smooth scroll and every scroll-linked animation */
      window.gsap.registerPlugin(window.ScrollTrigger);
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
    }
  }
  var NAV_OFFSET = -96;
  function scrollToEl(el, center) {
    var off = center ? -Math.max(80, (innerHeight - el.offsetHeight) / 2) : NAV_OFFSET;
    var y = el.getBoundingClientRect().top + window.scrollY + off;
    if (lenis) lenis.scrollTo(y, { duration: 1.3, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }
  window.__scrollToEl = scrollToEl;
  /* same-page anchor links glide too */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute("data-cta") || a.getAttribute("href").length < 2) return;
    var el = document.getElementById(a.getAttribute("href").slice(1));
    if (!el) return;
    e.preventDefault();
    scrollToEl(el, false);
    history.replaceState(null, "", a.getAttribute("href"));
  });

  /* ---------- social + booking links ---------- */
  document.querySelectorAll("[data-social]").forEach(function (a) {
    var url = C.social[a.getAttribute("data-social")];
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; }
    else { a.hidden = true; }
  });
  document.querySelectorAll("[data-book]").forEach(function (a) {
    if (C.bookingUrl) { a.href = C.bookingUrl; a.target = "_blank"; a.rel = "noopener"; }
  });
  document.querySelectorAll("[data-email]").forEach(function (a) {
    var key = a.getAttribute("data-email") === "careers" ? C.careersEmail : C.email;
    a.href = "mailto:" + key; if (!a.textContent.trim()) a.textContent = key;
  });

  /* ---------- prefill forms from CTA clicks or URL params ---------- */
  /* motion answers the action: every field a CTA changed flashes once, so the visitor sees what was filled in */
  function prefill(form, data, flash) {
    if (!form) return;
    Object.keys(data).forEach(function (k) {
      var f = form.elements[k];
      if (f && data[k] && f.value !== data[k]) {
        f.value = data[k];
        if (flash && !reduce) { f.classList.remove("changed"); void f.offsetWidth; setTimeout(function () { f.classList.add("changed"); }, 650); }
      }
    });
  }
  var contact = document.getElementById("contact-form");
  var apply = document.getElementById("apply-form");
  document.querySelectorAll("[data-cta]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var t = a.getAttribute("data-cta");
      if (t === "apply") prefill(apply, { role: a.getAttribute("data-role") }, true);
      else prefill(contact, { type: t, audience: a.getAttribute("data-audience") }, true);
      var target = t === "apply" ? apply : contact;
      if (target && !(a.hasAttribute("data-book") && C.bookingUrl)) {
        e.preventDefault();
        scrollToEl(target, true);
        history.replaceState(null, "", "#" + target.id);
        setTimeout(function () { var f = target.querySelector("input,select,textarea"); if (f) f.focus({ preventScroll: true }); }, reduce ? 0 : 1300);
      }
    });
  });
  var params = new URLSearchParams(location.search);
  if (params.get("type") || params.get("audience")) prefill(contact, { type: params.get("type"), audience: params.get("audience") });
  if (params.get("role")) prefill(apply, { role: params.get("role") });

  /* ---------- forms compose an email (no backend needed) ---------- */
  function wire(form, to, subjectFn) {
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var fd = new FormData(form), lines = [];
      fd.forEach(function (v, k) { if (v) lines.push(k.charAt(0).toUpperCase() + k.slice(1) + ": " + v); });
      var href = "mailto:" + to + "?subject=" + encodeURIComponent(subjectFn(fd)) + "&body=" + encodeURIComponent(lines.join("\n") + "\n\nSent from the Latryn website");
      window.location.href = href;
      var ok = form.querySelector(".form-ok");
      if (ok) { ok.hidden = false; ok.querySelector("a").href = href; }
      var btn = form.querySelector("button[type=submit]");
      if (btn && !btn.dataset.label) {
        btn.dataset.label = btn.innerHTML;
        btn.classList.add("sent"); btn.textContent = "Email ready to send";
        setTimeout(function () { btn.innerHTML = btn.dataset.label; btn.classList.remove("sent"); delete btn.dataset.label; }, 4000);
      }
    });
  }
  wire(contact, C.email, function (fd) { return (fd.get("type") || "Enquiry") + " | " + (fd.get("company") || fd.get("name")); });
  wire(apply, C.careersEmail, function (fd) { return "Lattice application | " + fd.get("role") + " | " + fd.get("name"); });

  /* ---------- inner pages (the homepage runs its own motion) ---------- */
  if (document.body.getAttribute("data-page") === "home") return;

  /* heading stamp: the page title's ember square lands on load, later headings as they enter view */
  var h1dot = document.querySelector("h1 .dot");
  if (h1dot) setTimeout(function () { h1dot.classList.add("on"); }, reduce ? 0 : 380);
  if ("IntersectionObserver" in window) {
    var dio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.querySelector(".dot").classList.add("on"); dio.unobserve(e.target); } });
    }, { threshold: .6 });
    document.querySelectorAll("h2").forEach(function (h) { if (h.querySelector(".dot")) dio.observe(h); });
  } else {
    document.querySelectorAll(".dot").forEach(function (d) { d.classList.add("on"); });
  }

  /* citations: following a [n] link highlights the reference it points to */
  function flashRef(id) {
    var el = document.getElementById(id); if (!el) return;
    var li = el.closest("li") || el; li.classList.remove("flash"); void li.offsetWidth; li.classList.add("flash");
  }
  document.querySelectorAll('.prose sup a[href^="#ref-"]').forEach(function (a) {
    a.addEventListener("click", function () { flashRef(a.getAttribute("href").slice(1)); });
  });
  if (/^#ref-\d+$/.test(location.hash)) flashRef(location.hash.slice(1));
  var bar = document.querySelector(".progress"), nav = document.getElementById("nav"), last = 0, tick = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
    if (nav) { nav.classList.toggle("scrolled", y > 10); nav.classList.toggle("hide", y > last && y > 400); }
    last = y; tick = false;
  }
  addEventListener("scroll", function () { if (!tick) { requestAnimationFrame(onScroll); tick = true; } }, { passive: true });
  onScroll();
})();
