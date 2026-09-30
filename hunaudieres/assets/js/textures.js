/* Hunaudières Matériaux — textures de matériaux générées en canvas.
   Utilisées à la fois par la scène 3D et par les vignettes produits. */
(function () {
  "use strict";

  // Générateur pseudo-aléatoire déterministe : mêmes textures à chaque chargement
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function canvas(size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    return c;
  }

  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

  // Dessine une forme à la fois à sa place et sur les bords opposés (texture raccordable)
  function wrapped(size, x, y, r, draw) {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const px = x + dx * size, py = y + dy * size;
      if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue;
      draw(px, py);
    }
  }

  function pebble(ctx, x, y, rx, ry, rot, base, rand) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    // ombre portée
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(rx * .12, ry * .18, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(-rx * .35, -ry * .4, 0, 0, 0, Math.max(rx, ry) * 1.1);
    g.addColorStop(0, hsl(base[0], base[1], Math.min(96, base[2] + 14)));
    g.addColorStop(.55, hsl(base[0], base[1], base[2]));
    g.addColorStop(1, hsl(base[0], base[1], Math.max(8, base[2] - 18)));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    // grain de la pierre
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(${rand() < .5 ? "0,0,0" : "255,255,255"},${.06 + rand() * .08})`;
      ctx.beginPath();
      ctx.arc((rand() - .5) * rx, (rand() - .5) * ry, 1 + rand() * rx * .2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function speckle(ctx, size, n, rand, dark = .12, light = .1) {
    for (let i = 0; i < n; i++) {
      const d = rand() < .5;
      ctx.fillStyle = d ? `rgba(0,0,0,${rand() * dark})` : `rgba(255,255,255,${rand() * light})`;
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
    }
  }

  const makers = {
    // Gravier clair concassé
    gravel(size = 512) {
      const c = canvas(size), x = c.getContext("2d"), r = rng(11);
      x.fillStyle = hsl(36, 20, 62); x.fillRect(0, 0, size, size);
      const n = size * size / 55;
      for (let i = 0; i < n; i++) {
        const px = r() * size, py = r() * size, rad = 2 + r() * 5;
        const tone = r();
        const base = tone < .6 ? [36, 18 + r() * 12, 60 + r() * 22] : tone < .85 ? [30, 6, 48 + r() * 25] : [20, 22, 55 + r() * 15];
        wrapped(size, px, py, rad * 1.3, (a, b) => pebble(x, a, b, rad, rad * (.6 + r() * .35), r() * 3, base, r));
      }
      return c;
    },

    // Galets ronds (gris/blanc) pour les gabions
    gabion(size = 512) {
      const c = canvas(size), x = c.getContext("2d"), r = rng(23);
      x.fillStyle = "#26241f"; x.fillRect(0, 0, size, size);
      const n = size * size / 900;
      for (let i = 0; i < n; i++) {
        const px = r() * size, py = r() * size, rad = 12 + r() * 20;
        const base = r() < .5 ? [40, 8, 55 + r() * 20] : r() < .6 ? [30, 14, 42 + r() * 20] : [210, 5, 60 + r() * 15];
        wrapped(size, px, py, rad * 1.3, (a, b) => pebble(x, a, b, rad, rad * (.55 + r() * .35), r() * 3, base, r));
      }
      // grillage galvanisé
      const step = size / 5;
      x.lineWidth = Math.max(2, size / 220);
      for (let i = 0; i <= 5; i++) {
        for (const [col, off] of [["rgba(0,0,0,.45)", 1.5], ["rgba(215,220,222,.9)", 0]]) {
          x.strokeStyle = col;
          x.beginPath(); x.moveTo(i * step + off, 0); x.lineTo(i * step + off, size); x.stroke();
          x.beginPath(); x.moveTo(0, i * step + off); x.lineTo(size, i * step + off); x.stroke();
        }
      }
      return c;
    },

    // Grandes dalles grès/pierre claire en pose décalée
    pavers(size = 512) {
      const c = canvas(size), x = c.getContext("2d"), r = rng(37);
      x.fillStyle = "#8e8779"; x.fillRect(0, 0, size, size);
      const rows = 4, h = size / rows, joint = Math.max(2, size / 170);
      for (let j = 0; j < rows; j++) {
        const w = size / 2, off = (j % 2) * w / 2;
        for (let i = -1; i < 3; i++) {
          const px = i * w + off, l = 78 + r() * 8;
          x.fillStyle = hsl(38, 12 + r() * 6, l);
          x.fillRect(px + joint, j * h + joint, w - joint * 2, h - joint * 2);
          const g = x.createLinearGradient(px, j * h, px + w, j * h + h);
          g.addColorStop(0, "rgba(255,255,255,.12)"); g.addColorStop(1, "rgba(0,0,0,.06)");
          x.fillStyle = g; x.fillRect(px + joint, j * h + joint, w - joint * 2, h - joint * 2);
        }
      }
      speckle(x, size, size * size / 18, r, .08, .12);
      return c;
    },

    // Dalle de pas japonais (pierre naturelle grise)
    slab(size = 256) {
      const c = canvas(size), x = c.getContext("2d"), r = rng(41);
      x.fillStyle = hsl(40, 6, 58); x.fillRect(0, 0, size, size);
      for (let i = 0; i < 40; i++) {
        x.fillStyle = `rgba(${r() < .5 ? "255,255,255" : "40,36,30"},${r() * .06})`;
        x.beginPath(); x.arc(r() * size, r() * size, 10 + r() * 60, 0, Math.PI * 2); x.fill();
      }
      speckle(x, size, size * size / 6, r, .14, .12);
      return c;
    },

    // Mur en pierres sèches
    drystone(size = 512) {
      const c = canvas(size), x = c.getContext("2d"), r = rng(53);
      x.fillStyle = "#3b342b"; x.fillRect(0, 0, size, size);
      let y = 0;
      while (y < size) {
        const h = 22 + r() * 30;
        let px = -r() * 60;
        while (px < size) {
          const w = 40 + r() * 90, l = 55 + r() * 22;
          x.fillStyle = hsl(34 + r() * 10, 14 + r() * 12, l);
          x.beginPath();
          const inset = 2 + r() * 2;
          x.roundRect ? x.roundRect(px + inset, y + inset, w - inset * 2, h - inset * 2, 6 + r() * 6)
                      : x.rect(px + inset, y + inset, w - inset * 2, h - inset * 2);
          x.fill();
          const g = x.createLinearGradient(0, y, 0, y + h);
          g.addColorStop(0, "rgba(255,255,255,.14)"); g.addColorStop(1, "rgba(0,0,0,.18)");
          x.fillStyle = g; x.fill();
          px += w;
        }
        y += h;
      }
      speckle(x, size, size * size / 10, r, .12, .1);
      return c;
    },

    // Feuillage dense (haies, massifs)
    leaves(size = 512, hue = 88) {
      const c = canvas(size), x = c.getContext("2d"), r = rng(67 + hue);
      x.fillStyle = hsl(hue, 40, 16); x.fillRect(0, 0, size, size);
      const n = size * size / 45;
      for (let i = 0; i < n; i++) {
        const px = r() * size, py = r() * size, rad = 3 + r() * 6, rot = r() * Math.PI;
        const l = 18 + r() * 30;
        x.fillStyle = hsl(hue + (r() - .5) * 18, 35 + r() * 25, l);
        wrapped(size, px, py, rad, (a, b) => {
          x.beginPath(); x.ellipse(a, b, rad, rad * .45, rot, 0, Math.PI * 2); x.fill();
        });
      }
      return c;
    },

    // Pelouse
    lawn(size = 512) {
      const c = canvas(size), x = c.getContext("2d"), r = rng(71);
      x.fillStyle = hsl(84, 45, 30); x.fillRect(0, 0, size, size);
      for (let i = 0; i < 60; i++) {
        x.fillStyle = hsl(80 + r() * 14, 40 + r() * 20, 24 + r() * 14, .25);
        const px = r() * size, py = r() * size, rad = 20 + r() * 80;
        wrapped(size, px, py, rad, (a, b) => { x.beginPath(); x.arc(a, b, rad, 0, Math.PI * 2); x.fill(); });
      }
      for (let i = 0; i < size * size / 4; i++) {
        x.strokeStyle = hsl(78 + r() * 18, 45 + r() * 20, 22 + r() * 26, .7);
        const px = r() * size, py = r() * size;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - .5) * 3, py - 3 - r() * 5); x.stroke();
      }
      return c;
    },

    // Traverses en bois
    wood(size = 512) {
      const c = canvas(size), x = c.getContext("2d"), r = rng(83);
      x.fillStyle = "#5a4130"; x.fillRect(0, 0, size, size);
      for (let i = 0; i < 220; i++) {
        const py = r() * size;
        x.strokeStyle = hsl(24 + r() * 8, 25 + r() * 15, 18 + r() * 22, .5);
        x.lineWidth = 1 + r() * 3;
        x.beginPath(); x.moveTo(0, py);
        for (let px = 0; px <= size; px += 32) x.lineTo(px, py + Math.sin(px * .02 + i) * 2);
        x.stroke();
      }
      speckle(x, size, size * size / 12, r, .15, .06);
      return c;
    },

    // Terre / paillage
    mulch(size = 512) {
      const c = canvas(size), x = c.getContext("2d"), r = rng(97);
      x.fillStyle = "#3a2618"; x.fillRect(0, 0, size, size);
      for (let i = 0; i < size * size / 30; i++) {
        const px = r() * size, py = r() * size, w = 3 + r() * 10, rot = r() * Math.PI;
        x.fillStyle = hsl(22 + r() * 12, 35 + r() * 20, 14 + r() * 26);
        wrapped(size, px, py, w, (a, b) => {
          x.save(); x.translate(a, b); x.rotate(rot); x.fillRect(-w / 2, -1.2, w, 2.4); x.restore();
        });
      }
      return c;
    },

    // Bordure béton/pierre
    edging(size = 256) {
      const c = canvas(size), x = c.getContext("2d"), r = rng(101);
      x.fillStyle = hsl(30, 4, 34); x.fillRect(0, 0, size, size);
      speckle(x, size, size * size / 4, r, .2, .1);
      return c;
    },
  };

  const cache = {};
  window.HMTex = {
    get(name, size) {
      const key = name + (size || "");
      if (!cache[key]) cache[key] = makers[name](size);
      return cache[key];
    },
    names: Object.keys(makers),
  };
})();
