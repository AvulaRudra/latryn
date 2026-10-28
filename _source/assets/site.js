/*
 * Latryn site config + shared behaviour.
 * EDIT THIS BLOCK ONCE: every CTA on every page reads from it.
 * Leave a value as "" and the link that uses it falls back gracefully
 * (social links hide, "Book a call" opens the contact form instead).
 */
window.LATRYN = {
  email: "contact@latryn.com",            // receives "Scope a program", "Book a call" and general enquiries
  careersEmail: "contact@latryn.com",     // receives "Join the Lattice" applications
  applyEndpoint: "",                       // Google Apps Script web app URL (see apps-script/README.md); empty = email fallback
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
      prefill(contact, { type: t, audience: a.getAttribute("data-audience") }, true);
      var target = contact;
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

  /* ---------- Lattice application (apply.html): validates, then posts to the Apps Script endpoint ---------- */
  if (apply) (function () {
    var MAX = 10 * 1024 * 1024, EXT = /\.(pdf|docx?)$/i;
    var fileIn = apply.elements.resume, drop = document.getElementById("drop"), dropT = document.getElementById("drop-t");
    var dropDefault = dropT.innerHTML, msg = document.getElementById("apply-msg"), btn = document.getElementById("apply-submit");
    var required = ["firstName", "lastName", "email", "phone", "qualification", "stream", "specialization", "availability"];
    var NAMES = { firstName: "your first name", lastName: "your last name", email: "your email", phone: "your phone number", qualification: "a qualification", stream: "a stream", specialization: "a specialization", availability: "your availability" };

    function box(el) { return el.closest(".fld"); }
    function setErr(el, text) {
      var f = box(el); f.classList.toggle("bad", !!text); f.querySelector(".err").textContent = text || "";
      if (text) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
    }
    function checkField(name) {
      var el = apply.elements[name], v = (el.value || "").trim(), err = "";
      if (!v) err = (el.tagName === "SELECT" ? "Choose " : "Enter ") + NAMES[name] + ".";
      else if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) err = "Enter a valid email, like you@example.com.";
      else if (name === "phone" && !/^[0-9]{10}$/.test(v)) err = "Enter a 10 digit phone number, numbers only.";
      setErr(el, err); return !err;
    }
    function checkPortfolio() {
      var el = apply.elements.portfolio, v = el.value.trim(), ok = !v || /^https?:\/\/\S+\.\S+/i.test(v);
      setErr(el, ok ? "" : "Enter a full link starting with https://"); return ok;
    }
    var workGroup = apply.querySelector('[data-group="work"]');
    function checkWork() {
      var ok = apply.querySelectorAll('input[name="work"]:checked').length > 0;
      workGroup.classList.toggle("bad", !ok); workGroup.querySelector(".err").textContent = ok ? "" : "Choose at least one type of work.";
      return ok;
    }
    function checkFile() {
      var f = fileIn.files[0], err = "";
      if (!f) err = "Upload your resume.";
      else if (!EXT.test(f.name)) err = "Upload a PDF or Word document (.pdf, .doc, .docx).";
      else if (f.size > MAX) err = "That file is over 10 MB. Upload a smaller version.";
      setErr(fileIn, err); return !err;
    }

    /* progress: share of required answers filled, plus which sections are complete */
    var meterBar = document.getElementById("meter-bar"), meterN = document.getElementById("meter-n");
    var sections = [["sec-about", ["firstName", "lastName", "email", "phone"]], ["sec-edu", ["qualification", "stream", "specialization"]], ["sec-work", ["work", "availability"]], ["sec-resume", ["resume"]]];
    function filled(name) {
      if (name === "work") return apply.querySelectorAll('input[name="work"]:checked').length > 0;
      if (name === "resume") return fileIn.files.length > 0;
      return !!apply.elements[name].value.trim();
    }
    function progress() {
      var all = required.concat(["work", "resume"]), n = all.filter(filled).length, pct = Math.round(n / all.length * 100);
      if (meterBar) meterBar.style.transform = "scaleX(" + n / all.length + ")";
      if (meterN) meterN.textContent = pct + "%";
      sections.forEach(function (s) {
        var a = document.querySelector('#steps-nav a[href="#' + s[0] + '"]');
        if (a) a.classList.toggle("done", s[1].every(filled));
      });
    }
    /* the step list follows the section being filled in */
    var stepLinks = document.querySelectorAll("#steps-nav a");
    function markStep(id) { stepLinks.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + id); }); }
    apply.addEventListener("focusin", function (e) { var fs = e.target.closest("fieldset"); if (fs) markStep(fs.id); });
    if ("IntersectionObserver" in window) {
      var sio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) markStep(e.target.id); }); }, { rootMargin: "-40% 0px -55% 0px" });
      apply.querySelectorAll("fieldset").forEach(function (f) { sio.observe(f); });
    }

    apply.addEventListener("input", progress);
    apply.addEventListener("change", function (e) {
      var n = e.target.name;
      if (n === "work") checkWork(); else if (n === "resume") showFile(); else if (required.indexOf(n) > -1 && box(e.target).classList.contains("bad")) checkField(n);
      progress();
    });
    /* validate a field when the visitor leaves it, not while they type */
    apply.addEventListener("focusout", function (e) {
      var n = e.target.name;
      if (required.indexOf(n) > -1 && e.target.value) checkField(n);
      if (n === "portfolio") checkPortfolio();
    });
    apply.elements.phone.addEventListener("input", function () { var v = this.value.replace(/\D/g, "").slice(0, 10); if (v !== this.value) this.value = v; });

    function showFile() {
      var f = fileIn.files[0];
      drop.classList.toggle("has", !!f);
      dropT.innerHTML = f ? "<b></b> " + (f.size < 1048576 ? Math.max(1, Math.round(f.size / 1024)) + " KB" : (f.size / 1048576).toFixed(1) + " MB") + " · <u>change</u>" : dropDefault;
      if (f) dropT.querySelector("b").textContent = f.name;
      checkFile();
    }
    ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) {
      e.preventDefault();
      if (e.dataTransfer.files.length) { fileIn.files = e.dataTransfer.files; showFile(); progress(); }
    });

    if (params.get("role")) apply.elements.role.value = params.get("role");

    function readFile(f) {
      return new Promise(function (res, rej) {
        var r = new FileReader();
        r.onload = function () { res(String(r.result).split(",")[1]); };
        r.onerror = function () { rej(new Error("We couldn't read that file. Try choosing it again.")); };
        r.readAsDataURL(f);
      });
    }
    function busy(on) {
      btn.disabled = on;
      if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Sending application'; }
      else if (btn.dataset.label) { btn.innerHTML = btn.dataset.label; delete btn.dataset.label; }
    }
    function fail(text) { msg.textContent = text; msg.hidden = false; }
    function done(data) {
      document.getElementById("done-name").textContent = data.firstName;
      document.getElementById("done-email").textContent = data.email;
      var d = document.getElementById("apply-done"); apply.hidden = true; d.hidden = false;
      document.querySelector(".apply-side").hidden = true;
      scrollToEl(document.querySelector(".page-hero"), false);
      d.focus({ preventScroll: true });
    }

    apply.addEventListener("submit", function (e) {
      e.preventDefault(); msg.hidden = true;
      var ok = required.map(checkField).concat([checkWork(), checkPortfolio(), checkFile()]);
      if (ok.indexOf(false) > -1) {
        var first = apply.querySelector(".fld.bad");
        scrollToEl(first, true);
        var f = first.querySelector("input,select"); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, reduce ? 0 : 700);
        return;
      }
      var el = apply.elements, file = fileIn.files[0];
      var data = {
        firstName: el.firstName.value.trim(), lastName: el.lastName.value.trim(), email: el.email.value.trim(), phone: el.phone.value.trim(),
        qualification: el.qualification.value, stream: el.stream.value, specialization: el.specialization.value,
        work: [].map.call(apply.querySelectorAll('input[name="work"]:checked'), function (c) { return c.value; }),
        availability: el.availability.value, portfolio: el.portfolio.value.trim(), role: el.role.value, website: el.website.value
      };
      if (!C.applyEndpoint) {
        /* no backend configured yet: compose an email instead (the resume has to be attached by hand) */
        var lines = ["First name: " + data.firstName, "Last name: " + data.lastName, "Email: " + data.email, "Phone: " + data.phone,
          "Qualification: " + data.qualification, "Stream: " + data.stream, "Specialization: " + data.specialization,
          "Type of work: " + data.work.join(", "), "Availability: " + data.availability, "Portfolio: " + (data.portfolio || "none")];
        window.location.href = "mailto:" + C.careersEmail + "?subject=" + encodeURIComponent("Lattice application | " + data.firstName + " " + data.lastName) +
          "&body=" + encodeURIComponent(lines.join("\n") + "\n\nPlease attach your resume (" + file.name + ") before sending.");
        fail("Your email app should open with your answers. Attach your resume before you send it.");
        return;
      }
      busy(true);
      readFile(file).then(function (b64) {
        data.resume = { name: file.name, type: file.type || "application/octet-stream", data: b64 };
        /* text/plain keeps this a simple request, so the browser skips the CORS preflight Apps Script can't answer */
        return fetch(C.applyEndpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
      }).then(function (r) { return r.json(); }).then(function (res) {
        busy(false);
        if (res && res.ok) done(data);
        else fail((res && res.error) || "Something went wrong. Please try again.");
      }).catch(function (err) {
        busy(false);
        fail((err && /read that file/.test(err.message) ? err.message : "We couldn't send your application. Check your connection and try again.") + " If it keeps failing, email " + C.careersEmail + ".");
      });
    });
    progress();
  })();

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
