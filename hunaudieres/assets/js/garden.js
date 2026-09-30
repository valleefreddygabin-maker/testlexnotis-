/* Hunaudières Matériaux — le jardin en 3D.
   Le défilement fait avancer la caméra : on passe l'arche de la haie,
   on suit l'allée en pas japonais et on arrive sur la terrasse. */
(function () {
  "use strict";

  const canvasEl = document.querySelector("[data-garden]");
  if (!canvasEl || !window.THREE) return;

  const T = window.THREE;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    document.documentElement.classList.add("no-webgl");
    return;
  }

  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 700;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 1.75));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  const FOG = new T.Color("#d6e2e6");
  scene.fog = new T.Fog(FOG, 28, 150);

  const camera = new T.PerspectiveCamera(45, 1, 0.1, 900);

  /* ---------- Outils ---------- */
  const rand = (() => { let s = 1234567; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296); })();
  const R = (a, b) => a + rand() * (b - a);

  function hash(x, y, z) {
    const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t;
    const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
    return l(
      l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
      l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
  }

  const texCache = {};
  function tex(name, repeatX = 1, repeatY = repeatX, color = true) {
    const key = name + repeatX + "x" + repeatY + color;
    if (texCache[key]) return texCache[key];
    const t = new T.CanvasTexture(window.HMTex.get(name));
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (color) t.encoding = T.sRGBEncoding;
    return (texCache[key] = t);
  }
  const mat = (opts) => new T.MeshStandardMaterial(Object.assign({ roughness: .9, metalness: 0 }, opts));

  function shadow(mesh, cast = true, receive = true) {
    mesh.castShadow = cast; mesh.receiveShadow = receive; return mesh;
  }

  // Volume organique (buisson, haie taillée, couronne d'arbre) : sphère poussée vers
  // un cube arrondi, puis bosselée avec du bruit.
  function blob({ sx = 1, sy = 1, sz = 1, square = 0, amp = .12, freq = 1.6, seg = 40, seed = 0 } = {}) {
    const g = new T.SphereGeometry(1, seg, Math.round(seg * .7));
    const p = g.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = v.clone();
      if (square) {
        v.set(Math.sign(v.x) * Math.pow(Math.abs(v.x), 1 - square),
              Math.sign(v.y) * Math.pow(Math.abs(v.y), 1 - square),
              Math.sign(v.z) * Math.pow(Math.abs(v.z), 1 - square));
      }
      v.multiply(new T.Vector3(sx, sy, sz));
      const d = noise3(n.x * freq + seed, n.y * freq, n.z * freq) * amp
              + noise3(n.x * freq * 3.1 + seed, n.y * freq * 3.1, n.z * freq * 3.1) * amp * .4;
      v.addScaledVector(n, d * Math.max(sx, sy, sz) * .5 + d * .4);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }

  /* ---------- Lumière ---------- */
  const hemi = new T.HemisphereLight("#d4e6ff", "#5b6b3a", .75);
  scene.add(hemi);
  const sun = new T.DirectionalLight("#ffe0b0", 2.3);
  sun.position.set(16, 26, 22);
  sun.target.position.set(0, 0, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isSmall ? 1024 : 2048, isSmall ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 34, bottom: -30, near: 1, far: 110 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  /* ---------- Ciel ---------- */
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float uTime;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
      void main(){
        float y = clamp(vDir.y, -0.2, 1.0);
        vec3 top = vec3(0.16, 0.42, 0.82);
        vec3 mid = vec3(0.42, 0.66, 0.92);
        vec3 hor = vec3(0.90, 0.92, 0.90);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.10, y));
        col = mix(col, top, smoothstep(0.08, 0.45, y));
        // nuages de beau temps
        vec2 uv = vDir.xz / max(vDir.y + 0.15, 0.08) * 1.4 + vec2(uTime * 0.004, 0.0);
        float c = smoothstep(0.62, 0.92, fbm(uv));
        col = mix(col, vec3(1.0, 0.99, 0.96), c * smoothstep(0.02, 0.25, y) * 0.85);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`,
  });
  scene.add(new T.Mesh(new T.SphereGeometry(500, 32, 16), skyMat));

  /* ---------- Tracé de l'allée ---------- */
  const pathCurve = new T.CatmullRomCurve3([
    new T.Vector3(0, 0, 26), new T.Vector3(0, 0, 14), new T.Vector3(0, 0, 7),
    new T.Vector3(1.1, 0, 0), new T.Vector3(-1.2, 0, -8), new T.Vector3(0.9, 0, -16),
    new T.Vector3(0, 0, -24), new T.Vector3(0, 0, -30.5),
  ], false, "catmullrom", .5);
  const PATH_N = 400;
  const pathPts = pathCurve.getSpacedPoints(PATH_N);
  // x de l'allée pour un z donné (l'allée avance toujours vers -z)
  function pathX(z) {
    for (let i = 1; i < pathPts.length; i++) {
      const a = pathPts[i - 1], b = pathPts[i];
      if (z <= a.z && z >= b.z) return a.x + (b.x - a.x) * ((z - a.z) / (b.z - a.z || 1));
    }
    return 0;
  }
  const distToPath = (x, z) => (z > 26 || z < -30.5) ? 99 : Math.abs(x - pathX(z));

  /* ---------- Sol ---------- */
  const lawnTex = tex("lawn", 50, 50);
  const ground = shadow(new T.Mesh(new T.PlaneGeometry(260, 260, 1, 1),
    mat({ map: lawnTex, color: "#b9c79a" })), false, true);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Bande de gravier le long de l'allée
  {
    const W = 0.95, pos = [], uv = [], idx = [];
    let dist = 0;
    const pts = pathCurve.getSpacedPoints(300);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], t = pathCurve.getTangentAt(i / (pts.length - 1));
      const n = new T.Vector3(t.z, 0, -t.x).normalize();
      if (i > 0) dist += p.distanceTo(pts[i - 1]);
      pos.push(p.x + n.x * W, .015, p.z + n.z * W, p.x - n.x * W, .015, p.z - n.z * W);
      uv.push(0, dist / 1.9, 1, dist / 1.9);
      if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const gt = tex("gravel", 1, 1);
    const gravelMat = mat({ map: gt, bumpMap: tex("gravel", 1, 1, false), bumpScale: .025, color: "#f4efe6" });
    scene.add(shadow(new T.Mesh(g, gravelMat), false, true));
  }

  // Pas japonais
  {
    const slabGeo = new T.BoxGeometry(.9, .07, .52, 1, 1, 1);
    const slabMat = mat({ map: tex("slab"), bumpMap: tex("slab", 1, 1, false), bumpScale: .01, roughness: .82 });
    const len = pathCurve.getLength(), step = .78, count = Math.floor(len / step);
    const inst = shadow(new T.InstancedMesh(slabGeo, slabMat, count));
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3();
    for (let i = 0; i < count; i++) {
      const u = (i + .5) / count, p = pathCurve.getPointAt(u), t = pathCurve.getTangentAt(u);
      e.set(0, Math.atan2(t.x, t.z) + R(-.08, .08), 0);
      q.setFromEuler(e);
      s.set(R(.92, 1.08), 1, R(.9, 1.1));
      m.compose(new T.Vector3(p.x + R(-.05, .05), .035, p.z), q, s);
      inst.setMatrixAt(i, m);
    }
    scene.add(inst);
  }

  // Bordures de part et d'autre de l'allée (dans le jardin)
  {
    const geo = new T.BoxGeometry(.1, .12, .5);
    const bm = mat({ map: tex("edging"), roughness: .95 });
    const pts = [];
    const len = pathCurve.getLength();
    for (let d = 0; d < len; d += .52) {
      const u = d / len, p = pathCurve.getPointAt(u);
      if (p.z > 6.2) continue;
      const t = pathCurve.getTangentAt(u), n = new T.Vector3(t.z, 0, -t.x).normalize();
      pts.push([p, t, n]);
    }
    const inst = shadow(new T.InstancedMesh(geo, bm, pts.length * 2));
    const m = new T.Matrix4(), q = new T.Quaternion();
    let k = 0;
    pts.forEach(([p, t, n]) => {
      q.setFromEuler(new T.Euler(0, Math.atan2(t.x, t.z), 0));
      for (const side of [1, -1]) {
        m.compose(new T.Vector3(p.x + n.x * 1.0 * side, .04, p.z + n.z * 1.0 * side), q, new T.Vector3(1, 1, 1));
        inst.setMatrixAt(k++, m);
      }
    });
    scene.add(inst);
  }

  /* ---------- Haie d'entrée avec arche ---------- */
  const hedgeMat = mat({ map: tex("leaves", .45, .45), bumpMap: tex("leaves", .45, .45, false), bumpScale: .08, color: "#c9d9b0" });
  {
    const W = 16, H = 4.6, aw = 1.45, ah = 2.7;
    const s = new T.Shape();
    s.moveTo(-W, 0); s.lineTo(-aw, 0); s.lineTo(-aw, ah);
    s.absarc(0, ah, aw, Math.PI, 0, true);
    s.lineTo(aw, 0); s.lineTo(W, 0); s.lineTo(W, H); s.lineTo(-W, H); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: true, bevelThickness: .18, bevelSize: .18, bevelSegments: 3, curveSegments: 32 });
    const hedge = shadow(new T.Mesh(g, hedgeMat));
    hedge.position.set(0, 0, 6.4);
    scene.add(hedge);

    // silhouette feuillue sur le dessus et autour de l'arche
    const lump = blob({ amp: .25, seg: 18 });
    const tops = [];
    for (let x = -W; x <= W; x += .55) tops.push([x, H + R(-.05, .12), R(6.3, 7.8), R(.35, .55)]);
    for (let a = 0; a <= Math.PI; a += .16) tops.push([Math.cos(a) * (aw + .08), ah + Math.sin(a) * (aw + .08), R(6.4, 7.7), R(.2, .32)]);
    const inst = shadow(new T.InstancedMesh(lump, hedgeMat, tops.length));
    const m = new T.Matrix4();
    tops.forEach(([x, y, z, r], i) => {
      m.compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(R(0, 3), R(0, 3), 0)), new T.Vector3(r, r * .8, r));
      inst.setMatrixAt(i, m);
    });
    scene.add(inst);
  }

  // Haies latérales qui ferment le jardin
  [-14.5, 14.5].forEach((x) => {
    const h = shadow(new T.Mesh(blob({ sx: .8, sy: 1.8, sz: 19, square: .75, amp: .1, seg: 48, seed: x }), hedgeMat));
    h.position.set(x, 1.6, -12);
    scene.add(h);
  });

  /* ---------- Végétaux ---------- */
  const trunkMat = mat({ color: "#5d4a3a", roughness: 1 });
  const greens = {
    cypress: mat({ color: "#35512a", map: tex("leaves", 2, 4), roughness: .95 }),
    fresh: mat({ color: "#7aa33b", map: tex("leaves", 2, 2), roughness: .9 }),
    olive: mat({ color: "#a3ae84", map: tex("leaves", 2, 2), roughness: .9 }),
    bush: mat({ color: "#5d8a36", map: tex("leaves", 2, 2), roughness: .9 }),
    boxwood: mat({ color: "#4f7a2c", map: tex("leaves", 3, 3), roughness: .9 }),
  };

  function cypress(x, z, h = 6) {
    const g = new T.Group();
    const c = shadow(new T.Mesh(blob({ sx: .55, sy: h / 2, sz: .55, amp: .1, freq: 2.4, seg: 28, seed: x * 3 + z }), greens.cypress));
    c.position.y = h / 2 + .2;
    g.add(c);
    g.position.set(x, 0, z);
    scene.add(g);
  }

  function tree(x, z, { h = 2.6, r = 1.5, kind = "fresh" } = {}) {
    const g = new T.Group();
    const trunk = shadow(new T.Mesh(new T.CylinderGeometry(.09, .15, h, 8), trunkMat));
    trunk.position.y = h / 2;
    g.add(trunk);
    const n = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const rr = r * R(.55, .8);
      const c = shadow(new T.Mesh(blob({ amp: .22, seg: 24, seed: x + i * 7 + z }), greens[kind]));
      c.scale.setScalar(rr);
      c.position.set(R(-.5, .5) * r, h + R(-.1, .5) * r, R(-.5, .5) * r);
      g.add(c);
    }
    g.position.set(x, 0, z);
    g.rotation.y = R(0, 6);
    scene.add(g);
  }

  const flowerGeo = blob({ amp: .5, seg: 14, freq: 4 });
  function hydrangea(x, z, s = 1, tint = "#f3f1ea") {
    const g = new T.Group();
    const b = shadow(new T.Mesh(blob({ amp: .2, seg: 20, seed: x + z }), greens.bush));
    b.scale.set(.7 * s, .5 * s, .7 * s);
    b.position.y = .35 * s;
    g.add(b);
    const fm = mat({ color: tint, roughness: .75, map: tex("leaves", 1, 1), emissive: tint, emissiveIntensity: .08 });
    const count = Math.round(16 * s);
    for (let i = 0; i < count; i++) {
      const a = R(0, Math.PI * 2), rr = Math.sqrt(rand()) * .55 * s;
      const f = shadow(new T.Mesh(flowerGeo, fm), true, false);
      f.scale.setScalar(R(.09, .13) * s);
      f.position.set(Math.cos(a) * rr, (.52 + R(0, .2) - rr * .35) * s, Math.sin(a) * rr);
      g.add(f);
    }
    g.position.set(x, 0, z);
    scene.add(g);
  }

  function boxball(x, z, r = .45) {
    const b = shadow(new T.Mesh(blob({ amp: .1, seg: 22, seed: x - z }), greens.boxwood));
    b.scale.setScalar(r);
    b.position.set(x, r * .85, z);
    scene.add(b);
  }

  // Entrée : cyprès qui encadrent l'arche
  cypress(-2.6, 7.6, 6.8); cypress(2.6, 7.6, 6.8);
  cypress(-9, 8, 5.5); cypress(9.5, 8, 5.8);
  boxball(-1.9, 9, .5); boxball(1.9, 9, .5);
  for (let i = 0; i < 6; i++) { hydrangea(R(-12, -4), R(8.6, 10.5), R(.9, 1.2)); hydrangea(R(4, 12), R(8.6, 10.5), R(.9, 1.2)); }

  // Dans le jardin
  cypress(-12.5, -3, 6.5); cypress(-12.5, -12, 6.5); cypress(12.6, -20, 6.8); cypress(-12.8, -26, 6.2);
  tree(5.5, 1.5, { kind: "fresh", h: 2.4, r: 1.6 });
  tree(-6.5, -4, { kind: "olive", h: 2.1, r: 1.7 });
  tree(7.5, -12, { kind: "fresh", h: 2.8, r: 1.9 });
  tree(-7, -20, { kind: "fresh", h: 2.6, r: 1.7 });
  tree(9, -27, { kind: "olive", h: 2.2, r: 1.6 });
  for (let i = 0; i < 14; i++) {
    const z = R(-24, 4), side = rand() < .5 ? -1 : 1, x = pathX(z) + side * R(1.6, 3.2);
    if (Math.abs(x) < 13) hydrangea(x, z, R(.8, 1.15), rand() < .25 ? "#dfe6f4" : "#f3f1ea");
  }
  for (let i = 0; i < 10; i++) {
    const z = R(-26, 5), side = rand() < .5 ? -1 : 1;
    boxball(pathX(z) + side * R(1.25, 1.6), z, R(.3, .45));
  }

  /* ---------- Gabions ---------- */
  {
    const gm = mat({ map: tex("gabion", 1, 1), bumpMap: tex("gabion", 1, 1, false), bumpScale: .06, roughness: .85 });
    function gabion(x, z, len, h, rotY) {
      const g = new T.Group();
      const geo = new T.BoxGeometry(len, h, .55);
      // UV en mètres pour garder des galets à la bonne taille
      const uv = geo.attributes.uv, pos = geo.attributes.position, nrm = geo.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        const ax = Math.abs(nrm.getX(i)) > .5, ay = Math.abs(nrm.getY(i)) > .5;
        const a = ax ? pos.getZ(i) : pos.getX(i), b = ay ? pos.getZ(i) : pos.getY(i);
        uv.setXY(i, a / 1.1, b / 1.1);
      }
      const box = shadow(new T.Mesh(geo, gm));
      g.add(box);
      g.position.set(x, h / 2, z);
      g.rotation.y = rotY;
      scene.add(g);
    }
    // muret en gabions de chaque côté, en quinconce
    gabion(pathX(-9) - 2.4, -9, 3.6, 1.05, .12);
    gabion(pathX(-9.5) + 2.6, -10.2, 3, .8, -.18);
    gabion(-5.6, 3.2, 4, .9, .05);
    // massifs derrière les gabions
    hydrangea(pathX(-9) - 2.5, -10.3, 1.1); hydrangea(pathX(-9) - 1.3, -10.1, .9);
    hydrangea(pathX(-10) + 2.8, -11.4, 1.05);
  }

  /* ---------- Bac en traverses de bois ---------- */
  {
    const wm = mat({ map: tex("wood", 1, .5), roughness: .95 });
    const bx = pathX(-16.5) + 2.6, bz = -16.5, W = 2.8, D = 1.4, h = .2;
    for (let row = 0; row < 3; row++) {
      const y = h / 2 + row * h;
      [[0, D / 2, W, .2], [0, -D / 2, W, .2]].forEach(([dx, dz, w, d]) => {
        const s = shadow(new T.Mesh(new T.BoxGeometry(w, h * .96, d), wm));
        s.position.set(bx + dx, y, bz + dz); scene.add(s);
      });
      [[W / 2 - .1, 0], [-W / 2 + .1, 0]].forEach(([dx, dz]) => {
        const s = shadow(new T.Mesh(new T.BoxGeometry(.2, h * .96, D - .2), wm));
        s.position.set(bx + dx, y, bz + dz); scene.add(s);
      });
    }
    const soil = shadow(new T.Mesh(new T.BoxGeometry(W - .4, .05, D - .4), mat({ map: tex("mulch", 1, .5) })), false, true);
    soil.position.set(bx, .56, bz); scene.add(soil);
    [-0.8, 0, .8].forEach((dx, i) => { const b = shadow(new T.Mesh(blob({ amp: .3, seg: 16, seed: i }), greens[i === 1 ? "olive" : "bush"])); b.scale.set(.42, .35, .38); b.position.set(bx + dx, .8, bz); scene.add(b); });
    // traverses posées à plat, en marches, de l'autre côté
    const sx = pathX(-19) - 2.4;
    for (let i = 0; i < 4; i++) {
      const s = shadow(new T.Mesh(new T.BoxGeometry(2.2, .14, .26), wm));
      s.position.set(sx, .07, -18 - i * .55); s.rotation.y = .1; scene.add(s);
    }
  }

  /* ---------- Terrasse ---------- */
  {
    const tz = -35.5, TW = 15, TD = 10, TH = .45;
    const pt = tex("pavers", TW / 2.4, TD / 2.4);
    const sideMat = mat({ map: tex("drystone", TW / 3, .3), roughness: .95 });
    const topMat = mat({ map: pt, roughness: .75 });
    const deck = shadow(new T.Mesh(new T.BoxGeometry(TW, TH, TD), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]));
    deck.position.set(0, TH / 2, tz);
    scene.add(deck);
    // deux marches
    [[.15, -30.2, 3.4, .5], [.3, -30.6, 3.4, .45]].forEach(([h, z, w, d]) => {
      const st = shadow(new T.Mesh(new T.BoxGeometry(w, h, d), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]));
      st.position.set(0, h / 2, z); scene.add(st);
    });
    // mur en pierres sèches au fond et pilier à droite
    const ws = mat({ map: tex("drystone", 5, .5), bumpMap: tex("drystone", 5, .5, false), bumpScale: .05, roughness: .95 });
    const wall = shadow(new T.Mesh(new T.BoxGeometry(TW, 1.1, .5), ws));
    wall.position.set(0, TH + .55, tz - TD / 2 + .25); scene.add(wall);
    const pillarMat = mat({ map: tex("drystone", .6, 1.2), bumpMap: tex("drystone", .6, 1.2, false), bumpScale: .05 });
    const pillar = shadow(new T.Mesh(new T.BoxGeometry(1.6, 3, 1.6), pillarMat));
    pillar.position.set(TW / 2 - .8, TH + 1.5, tz - 1); scene.add(pillar);

    // salon d'extérieur
    const fabric = mat({ color: "#d9d4c9", roughness: 1 });
    const frame = mat({ color: "#6f675c", roughness: .8 });
    const lx = 2.6, lz = tz - 1.5, y0 = TH;
    const addBox = (w, h, d, x, y, z, m) => { const b = shadow(new T.Mesh(new T.BoxGeometry(w, h, d), m)); b.position.set(x, y, z); scene.add(b); return b; };
    addBox(3.4, .35, 1, lx, y0 + .2, lz, frame);
    addBox(3.3, .18, .9, lx, y0 + .46, lz + .02, fabric);
    addBox(3.4, .55, .25, lx, y0 + .6, lz - .4, fabric);
    addBox(1, .35, 2.2, lx + 1.2, y0 + .2, lz + 1.6, frame);
    addBox(.9, .18, 2.1, lx + 1.2, y0 + .46, lz + 1.6, fabric);
    addBox(1.3, .32, .8, lx - .4, y0 + .16, lz + 1.4, mat({ color: "#8b7a64", roughness: .6 }));
    // table et chaises
    addBox(2, .06, .95, -3, y0 + .75, tz, mat({ color: "#e7e2d8", roughness: .5 }));
    addBox(.08, .72, .08, -3.9, y0 + .36, tz + .4, frame); addBox(.08, .72, .08, -2.1, y0 + .36, tz + .4, frame);
    addBox(.08, .72, .08, -3.9, y0 + .36, tz - .4, frame); addBox(.08, .72, .08, -2.1, y0 + .36, tz - .4, frame);
    for (let i = 0; i < 3; i++) {
      for (const s of [1, -1]) {
        addBox(.5, .06, .5, -3.6 + i * .6, y0 + .45, tz + s * .85, frame);
        addBox(.5, .5, .06, -3.6 + i * .6, y0 + .72, tz + s * 1.08, frame);
      }
    }
    // parasol
    const pole = shadow(new T.Mesh(new T.CylinderGeometry(.04, .04, 2.6, 8), frame));
    pole.position.set(lx - .2, y0 + 1.3, lz + .6); scene.add(pole);
    const canopy = shadow(new T.Mesh(new T.ConeGeometry(2, .55, 8, 1, true), mat({ color: "#e9e1d0", side: T.DoubleSide, roughness: 1 })));
    canopy.position.set(lx - .2, y0 + 2.55, lz + .6); scene.add(canopy);
    // grandes jardinières
    [[-6.2, tz + 3.5], [-6.2, tz - 3], [5.6, tz + 3.8]].forEach(([x, z]) => {
      addBox(.9, .8, .9, x, y0 + .4, z, mat({ color: "#4a4843", roughness: .7 }));
      const c = shadow(new T.Mesh(blob({ amp: .15, seg: 20, seed: x }), greens.boxwood));
      c.scale.setScalar(.5); c.position.set(x, y0 + 1.15, z); scene.add(c);
    });
    tree(-5, tz - 3.2, { kind: "olive", h: 2.4, r: 1.3 });
  }

  /* ---------- Paysage lointain ---------- */
  {
    const hillMat = mat({ color: "#6f8a58", roughness: 1 });
    const farMat = mat({ color: "#8aa08a", roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const h = shadow(new T.Mesh(blob({ amp: .15, seg: 24, seed: i * 13 }), i % 2 ? hillMat : farMat), false, false);
      h.scale.set(R(30, 55), R(8, 16), R(18, 30));
      h.position.set(-110 + i * 28 + R(-8, 8), -2, R(-110, -150));
      scene.add(h);
    }
    // rideau d'arbres derrière le jardin
    const g = blob({ amp: .25, seg: 14 });
    const n = 80, inst = new T.InstancedMesh(g, greens.fresh, n);
    const m = new T.Matrix4();
    for (let i = 0; i < n; i++) {
      const s = R(1.6, 3.2);
      m.compose(new T.Vector3(R(-45, 45), s * .9, R(-44, -60)), new T.Quaternion(), new T.Vector3(s, s * 1.2, s));
      inst.setMatrixAt(i, m);
    }
    inst.castShadow = false;
    scene.add(inst);
    for (let i = 0; i < 16; i++) cypress(R(-40, 40), R(-45, -58), R(6, 9));
  }

  /* ---------- Herbe animée par le vent ---------- */
  const windUniforms = { uTime: { value: 0 } };
  {
    const bladeGeo = new T.BufferGeometry();
    const w = .026, h = 1;
    bladeGeo.setAttribute("position", new T.Float32BufferAttribute([
      -w, 0, 0, w, 0, 0, -w * .7, h * .4, 0, w * .7, h * .4, 0, -w * .35, h * .75, 0, w * .35, h * .75, 0, 0, h, 0,
    ], 3));
    bladeGeo.setAttribute("color", new T.Float32BufferAttribute([
      .35, .45, .2, .35, .45, .2, .6, .72, .32, .6, .72, .32, .8, .9, .45, .8, .9, .45, .95, 1, .6,
    ], 3));
    bladeGeo.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]);
    bladeGeo.computeVertexNormals();

    const grassMat = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .85 });
    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windUniforms.uTime;
      shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           vec3 ip = instanceMatrix[3].xyz;
           float sway = sin(uTime * 1.6 + ip.x * .45 + ip.z * .3) * .6 + sin(uTime * 3.1 + ip.x * 1.7) * .25;
           transformed.x += sway * .18 * position.y * position.y;
           transformed.z += cos(uTime * 1.2 + ip.z * .5) * .08 * position.y * position.y;
         #endif`);
      // normale orientée vers le haut : éclairage doux et homogène
      shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", "vec3 objectNormal = vec3(0.0, 1.0, 0.0);");
    };

    const count = isSmall ? 34000 : 95000;
    const grass = new T.InstancedMesh(bladeGeo, grassMat, count);
    grass.receiveShadow = false;
    grass.frustumCulled = false;
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), col = new T.Color();
    let k = 0, guard = 0;
    while (k < count && guard++ < count * 6) {
      const outside = rand() < .18;
      const x = outside ? R(-16, 16) : R(-13.8, 13.8);
      const z = outside ? R(8.3, 24) : R(-30.3, 5.8);
      if (distToPath(x, z) < 1.12) continue;
      if (outside && Math.abs(x) < 1.2) continue;
      const hh = R(.14, .34) * (Math.abs(x) > 10 ? 1.5 : 1);
      e.set(R(-.25, .25), R(0, Math.PI), R(-.25, .25));
      q.setFromEuler(e);
      m.compose(new T.Vector3(x, 0, z), q, new T.Vector3(R(.8, 1.3), hh, 1));
      grass.setMatrixAt(k, m);
      col.setHSL(R(.2, .26), R(.45, .6), R(.36, .5));
      grass.setColorAt(k, col);
      k++;
    }
    grass.count = k;
    scene.add(grass);
  }

  /* ---------- Pollen en suspension ---------- */
  const pollen = (() => {
    const n = isSmall ? 160 : 320, pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = R(-10, 10); pos[i * 3 + 1] = R(.3, 3.5); pos[i * 3 + 2] = R(-32, 16);
      seed[i] = R(0, 100);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new T.BufferAttribute(seed, 1));
    const m = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uTime: windUniforms.uTime, uScale: { value: 1 } },
      vertexShader: `attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA;
        void main(){ vec3 p = position;
          p.x += sin(uTime*.3 + aSeed) * .8; p.y += sin(uTime*.5 + aSeed*1.7) * .35; p.z += cos(uTime*.25 + aSeed) * .6;
          vec4 mv = modelViewMatrix * vec4(p,1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * (18.0 / -mv.z); vA = .45 + .55 * sin(uTime*1.3 + aSeed*3.0); }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard;
        gl_FragColor = vec4(1.0, .93, .72, smoothstep(.5, .0, d) * .55 * vA); }`,
    });
    const pts = new T.Points(g, m);
    pts.frustumCulled = false;
    scene.add(pts);
    return m;
  })();

  /* ---------- Trajet de la caméra ---------- */
  const camCurve = new T.CatmullRomCurve3([
    new T.Vector3(0, 1.85, 19), new T.Vector3(0, 1.75, 13), new T.Vector3(0, 1.62, 7.2),
    new T.Vector3(.8, 1.6, 0), new T.Vector3(-.9, 1.6, -8), new T.Vector3(.6, 1.62, -16),
    new T.Vector3(0, 1.75, -23), new T.Vector3(-1.1, 2.25, -28.8),
  ], false, "catmullrom", .5);
  const lookCurve = new T.CatmullRomCurve3([
    new T.Vector3(0, 1.75, 6), new T.Vector3(0, 1.45, 2), new T.Vector3(.9, 1.2, -4),
    new T.Vector3(-.8, 1.1, -11), new T.Vector3(.6, 1.1, -19), new T.Vector3(0, 1.1, -27),
    new T.Vector3(1, 1.2, -34), new T.Vector3(2.4, 1.1, -37.5),
  ], false, "catmullrom", .5);

  let target = 0, current = 0, pointerX = 0, pointerY = 0, px = 0, py = 0;
  const camPos = new T.Vector3(), lookAt = new T.Vector3();

  window.HMGarden = {
    setProgress(p) { target = Math.min(1, Math.max(0, p)); },
  };
  window.addEventListener("pointermove", (e) => {
    pointerX = (e.clientX / window.innerWidth - .5) * 2;
    pointerY = (e.clientY / window.innerHeight - .5) * 2;
  }, { passive: true });

  /* ---------- Taille ---------- */
  function resize() {
    const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < .8 ? 62 : w / h < 1.2 ? 54 : 45;
    camera.updateProjectionMatrix();
    pollen.uniforms.uScale.value = h / 700 * renderer.getPixelRatio();
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- Boucle ---------- */
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvasEl);
  const clock = new T.Clock();

  function frame() {
    const dt = Math.min(clock.getDelta(), .05);
    if (visible) {
      current += (target - current) * (1 - Math.pow(.0009, dt));
      if (Math.abs(target - current) < 1e-5) current = target;
      windUniforms.uTime.value += reduced ? 0 : dt;
      skyMat.uniforms.uTime.value = windUniforms.uTime.value;

      px += (pointerX - px) * dt * 2; py += (pointerY - py) * dt * 2;
      const t = current;
      camCurve.getPointAt(t, camPos);
      lookCurve.getPointAt(t, lookAt);
      // léger mouvement de respiration + parallaxe à la souris
      const breathe = reduced ? 0 : Math.sin(windUniforms.uTime.value * .6) * .03;
      camera.position.set(camPos.x + px * .25, camPos.y + breathe - py * .1, camPos.z);
      lookAt.x += px * .4; lookAt.y -= py * .15;
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }

  // premier rendu, puis on signale que la scène est prête
  renderer.compile(scene, camera);
  requestAnimationFrame(() => {
    frame();
    document.documentElement.classList.add("garden-ready");
  });
})();
