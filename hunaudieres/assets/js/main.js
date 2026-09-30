/* Hunaudières Matériaux — interactions de la page */
(function () {
  "use strict";
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const fmt = (n, d = 1) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

  if (!window.THREE) document.documentElement.classList.add("no-webgl");

  /* ---------- Menu ---------- */
  const header = document.querySelector("[data-header]");
  const burger = document.querySelector("[data-burger]");
  const menu = document.querySelector("[data-menu]");
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Le jardin : progression du défilement ---------- */
  const journey = document.querySelector("[data-journey]");
  const sticky = journey.querySelector(".journey-sticky");
  const chapters = [...journey.querySelectorAll("[data-chapter]")];
  const rail = [...journey.querySelectorAll("[data-rail]")];
  const meters = journey.querySelector("[data-meters]");
  const cue = journey.querySelector("[data-cue]");
  const WALK = 48; // longueur approximative du trajet, en mètres
  const FADE = .035;

  function onScroll() {
    const vh = window.innerHeight;
    const r = journey.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - vh));

    header.classList.toggle("is-solid", r.bottom < 80);
    if (window.HMGarden) window.HMGarden.setProgress(p);

    chapters.forEach((c) => {
      const from = +c.dataset.from, to = +c.dataset.to;
      const fin = from <= 0 ? 1 : clamp((p - from) / FADE);
      const fout = to >= 1 ? 1 : clamp((to - p) / FADE);
      const o = Math.min(fin, fout);
      c.style.setProperty("--o", o.toFixed(3));
      c.classList.toggle("is-on", o > .5);
    });

    let active = 0;
    rail.forEach((li, i) => { if (p >= +li.dataset.rail - .06) active = i; });
    rail.forEach((li, i) => li.classList.toggle("is-on", i === active));

    meters.textContent = fmt(p * WALK, 1);
    sticky.style.setProperty("--wo", (p > .02 && p < .13) || (p > .27 && p < .9) ? 1 : 0);
    cue.classList.toggle("is-hidden", p > .02);
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- Vignettes matériaux ---------- */
  if (window.HMTex) {
    document.querySelectorAll("[data-swatch]").forEach((cv) => {
      const src = window.HMTex.get(cv.dataset.swatch);
      const w = 480, h = 600;
      cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d");
      const pat = ctx.createPattern(src, "repeat");
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
      // lumière rasante pour donner du relief
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "rgba(255,240,210,.18)");
      g.addColorStop(1, "rgba(0,0,0,.22)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    document.querySelectorAll("[data-swatch-bg]").forEach((el) => {
      el.style.backgroundImage = `url(${window.HMTex.get(el.dataset.swatchBg).toDataURL("image/jpeg", .85)})`;
    });
  }

  /* ---------- Apparitions ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: .1 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- Calcul des quantités ---------- */
  const form = document.querySelector("[data-calc]");
  if (form) {
    const mat = form.querySelector("#calc-mat");
    const l = form.querySelector("#calc-l"), w = form.querySelector("#calc-w"), t = form.querySelector("#calc-t");
    const out = {
      thick: form.querySelector("[data-thick-out]"),
      area: form.querySelector("[data-res-area]"),
      vol: form.querySelector("[data-res-vol]"),
      weight: form.querySelector("[data-res-weight]"),
    };
    const num = (el) => Math.max(0, parseFloat(String(el.value).replace(",", ".")) || 0);
    const update = () => {
      const area = num(l) * num(w), vol = area * num(t) / 100, wt = vol * parseFloat(mat.value);
      out.thick.textContent = `${t.value} cm`;
      out.area.textContent = fmt(area, 1);
      out.vol.textContent = fmt(vol, 2);
      out.weight.textContent = fmt(wt, 2);
    };
    mat.addEventListener("change", () => { t.value = mat.selectedOptions[0].dataset.thick; update(); });
    form.addEventListener("input", update);
    form.addEventListener("submit", (e) => e.preventDefault());
    update();
  }

  /* ---------- Divers ---------- */
  document.querySelectorAll("[data-todo-link]").forEach((a) => a.addEventListener("click", (e) => {
    if (a.getAttribute("href") === "#") e.preventDefault();
  }));
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
