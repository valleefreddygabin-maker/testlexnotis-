/* LexNotis — interactions (sans dépendance) */
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- En-tête ---------- */
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.getElementById("nav");
  let lastY = 0;

  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Accroche : le visuel s’étend au défilement ---------- */
  const hero = document.querySelector("[data-hero]");

  /* ---------- Méthode ---------- */
  const methodBar = document.querySelector("[data-method-bar]");
  const steps = [...document.querySelectorAll("[data-step]")];
  const methodSection = document.getElementById("methode");

  /* ---------- Parallaxe ---------- */
  const parallax = [...document.querySelectorAll("[data-parallax]")];

  /* ---------- Manifeste : mots révélés un à un ---------- */
  const words = document.querySelector("[data-words]");
  let wordEls = [];
  if (words) {
    words.innerHTML = words.textContent.trim().split(/\s+/)
      .map((w) => `<span class="w">${w}</span>`).join(" ");
    wordEls = [...words.querySelectorAll(".w")];
  }

  const onScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;

    header.classList.toggle("is-scrolled", y > 40);
    header.classList.toggle("is-hidden", y > lastY && y > vh * 2.4 && !nav.classList.contains("is-open"));
    lastY = y;

    if (reduced) return;

    if (hero) {
      const r = hero.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh) / 0.85);
      hero.style.setProperty("--p", p.toFixed(4));
    }

    if (wordEls.length) {
      const r = words.getBoundingClientRect();
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      const n = Math.round(p * wordEls.length);
      wordEls.forEach((w, i) => w.classList.toggle("on", i < n));
    }

    if (methodSection) {
      const r = methodSection.getBoundingClientRect();
      methodBar.style.setProperty("--mp", clamp((vh * 0.6 - r.top) / r.height).toFixed(3));
      steps.forEach((s) => {
        const sr = s.getBoundingClientRect();
        s.classList.toggle("is-active", sr.top < vh * 0.6 && sr.bottom > vh * 0.3);
      });
    }

    parallax.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.setProperty("--py", `${(p * -60).toFixed(1)}px`);
    });
  };

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- Apparitions ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- Réalisations : glisser pour faire défiler ---------- */
  const track = document.querySelector("[data-drag]");
  if (track) {
    let down = false, startX = 0, startScroll = 0, moved = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; startX = e.clientX; startScroll = track.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add("is-dragging"); }
      track.scrollLeft = startScroll - dx;
    });
    window.addEventListener("pointerup", () => { down = false; track.classList.remove("is-dragging"); });
    track.addEventListener("click", (e) => { if (moved) e.preventDefault(); }, true);
  }

  /* ---------- Lien de rendez-vous pas encore renseigné ---------- */
  document.querySelectorAll("[data-todo-link]").forEach((a) => {
    if (a.getAttribute("href") === "#") {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        console.warn("LexNotis : lien de prise de rendez-vous à renseigner dans index.html");
      });
    }
  });

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Visuel de l’accroche : champ de lignes fluides ---------- */
  const canvas = document.querySelector("[data-flow]");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr, lines, t = 0, visible = true;
    const palette = ["#c9713a", "#e0a071", "#efebe3", "#8fa39a"];

    const noise = (x, y, z) =>
      Math.sin(x * 1.7 + z) * Math.cos(y * 1.3 - z * 0.7) +
      Math.sin((x + y) * 0.8 + z * 0.5) * 0.6;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp(w / 14, 40, 110));
      lines = Array.from({ length: count }, (_, i) => ({
        y0: (i / count) * h * 1.3 - h * 0.15,
        color: palette[i % 7 === 0 ? 2 : i % 5 === 0 ? 3 : i % 2],
        alpha: 0.12 + Math.random() * 0.35,
        width: Math.random() < 0.08 ? 1.6 : 0.8,
      }));
    };

    const draw = () => {
      // fond : lueur chaude sur nuit
      const g = ctx.createRadialGradient(w * 0.68, h * 0.62, 0, w * 0.68, h * 0.62, Math.max(w, h) * 0.75);
      g.addColorStop(0, "#5a2c14");
      g.addColorStop(0.35, "#27160d");
      g.addColorStop(1, "#0d0e10");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const step = Math.max(8, w / 120);
      lines.forEach((l) => {
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += step) {
          const nx = x / w, ny = l.y0 / h;
          const d = noise(nx * 2.2, ny * 3, t) * 38 + noise(nx * 5, ny * 2, t * 1.4) * 10;
          const pull = Math.exp(-Math.pow((nx - 0.68) * 2.4, 2)) * Math.sin(ny * 6 + t) * 46;
          const y = l.y0 + d + pull;
          x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = l.color;
        ctx.globalAlpha = l.alpha;
        ctx.lineWidth = l.width;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      if (visible) { t += 0.0035; draw(); }
      requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    if (reduced) draw(); else loop();
  }
})();
