/* Hunaudières Matériaux — interactions de la page */
(function () {
  "use strict";
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const fmt = (n, d = 1) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });


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

  /* ---------- Le jardin : on entre dans l'image au défilement ----------
     Chaque scène zoome vers son point focal ; la suivante s'ouvre comme une
     fenêtre à cet endroit, puis s'agrandit jusqu'au plein écran. */
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const journey = document.querySelector("[data-journey]");
  const sticky = journey.querySelector(".journey-sticky");
  const scenes = [...journey.querySelectorAll("[data-scene]")].map((el) => {
    const [fx, fy] = el.dataset.focal.split(" ");
    el.style.setProperty("--fx", fx);
    el.style.setProperty("--fy", fy);
    return { el, fx, fy, zoom: +el.dataset.zoom };
  });
  const chapters = [...journey.querySelectorAll("[data-chapter]")];
  const rail = [...journey.querySelectorAll("[data-rail]")];
  const cue = journey.querySelector("[data-cue]");
  const FADE = .035;
  const EXPAND = .1;                       // le cadre de départ s'ouvre jusqu'au plein écran
  const BOUNDS = [EXPAND, .34, .58, .82, 1]; // chaque scène occupe [BOUNDS[k], BOUNDS[k + 1]]
  const ENTER = .08;                       // durée d'ouverture de la scène suivante
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t;

  let target = 0, current = 0, raf = 0;

  function paint(p) {
    sticky.style.setProperty("--expand", ease(clamp(p / EXPAND)).toFixed(4));

    scenes.forEach((sc, k) => {
      const a = BOUNDS[k], b = BOUNDS[k + 1];
      let scale = 1, opacity = 1, radius = 0, origin = `${sc.fx} ${sc.fy}`;
      if (k > 0 && p < a) {
        // ouverture : la scène sort du point focal de la précédente
        const t = clamp((p - (a - ENTER)) / ENTER);
        const prev = scenes[k - 1];
        origin = `${prev.fx} ${prev.fy}`;
        scale = .22 + .78 * ease(t);
        opacity = clamp(t * 4);
        radius = (1 - t) * 40;
        if (t <= 0) opacity = 0;
      } else {
        // zoom vers le point focal
        const t = clamp((p - a) / (b - a));
        scale = 1 + (sc.zoom - 1) * easeIn(t);
      }
      const hidden = k < scenes.length - 1 && p >= BOUNDS[k + 1] + .002;
      sc.el.style.opacity = hidden ? 0 : opacity.toFixed(3);
      sc.el.style.transformOrigin = origin;
      sc.el.style.transform = `scale(${scale.toFixed(4)})`;
      sc.el.style.borderRadius = `${radius.toFixed(1)}px`;
    });

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
    sticky.style.setProperty("--wo", p > .1 && p < .9 ? 1 : 0);
    cue.classList.toggle("is-hidden", p > .02);
  }

  function tick() {
    current += (target - current) * .14;
    if (Math.abs(target - current) < .0004) current = target;
    paint(current);
    raf = current !== target ? requestAnimationFrame(tick) : 0;
  }

  function onScroll() {
    const vh = window.innerHeight;
    const r = journey.getBoundingClientRect();
    target = clamp(-r.top / (r.height - vh));
    header.classList.toggle("is-solid", r.bottom < 80);
    if (reduced) { current = target; paint(current); return; }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
  current = target; paint(current);

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
