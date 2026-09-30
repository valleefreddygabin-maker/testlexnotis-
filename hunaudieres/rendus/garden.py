"""Le jardin : une allée en pas japonais sur gravier, pelouse, buis, muret en gabions,
terrasse en dallage et haie au fond. Plusieurs cadrages sont rendus depuis la même scène."""
import sys, math, random, time
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import lib

args = dict(a.split("=") for a in sys.argv[sys.argv.index("--") + 1:]) if "--" in sys.argv else {}
SHOT = args.get("shot", "allee")
W, H = int(args.get("w", 640)), int(args.get("h", 360))
SAMPLES = int(args.get("s", 32))
Q = float(args.get("q", 0.3))       # densité (herbe, gravier) : 1 = finale
OUT = args.get("out", f"{SHOT}.png")

t0 = time.time()
lib.reset()
rnd = random.Random(4)

# Tracé de l'allée : légère courbe
def path_x(y):
    return 0.35 * math.sin(y * 0.28)

PATH_W = 0.62   # demi-largeur de la bande de gravier

# ---------------------------------------------------------------- matériaux
m_gravel = lib.mat_stone("gravel", (0.36, 0.30, 0.23), (0.62, 0.55, 0.45), (0.24, 0.22, 0.21), scale=60, bump=0.3)
m_slab = lib.mat_stone("slab", (0.15, 0.15, 0.15), (0.40, 0.37, 0.33), (0.25, 0.23, 0.21), scale=3, bump=1.0, rough=(0.7, 0.95))
m_soil = lib.mat_simple("soil", (0.07, 0.05, 0.035), 0.95, bump=0.4, bscale=80)
m_grass_blade = lib.mat_leaf('blade', (0.06, 0.13, 0.02), (0.22, 0.36, 0.06), trans=0.35)
m_leaf = lib.mat_leaf("boxleaf", (0.05, 0.13, 0.02), (0.16, 0.30, 0.05), trans=0.25)
m_leaf2 = lib.mat_leaf("treeleaf", (0.10, 0.20, 0.03), (0.32, 0.42, 0.10), trans=0.4)
m_core = lib.mat_simple("core", (0.02, 0.04, 0.01), 0.9)
m_wire = lib.mat_simple("wire", (0.75, 0.76, 0.76), 0.35, metal=1.0)
m_gab = lib.mat_stone("gabstone", (0.22, 0.21, 0.20), (0.56, 0.52, 0.45), (0.42, 0.34, 0.25), scale=7, bump=0.7)
m_pave = lib.mat_stone("pave", (0.50, 0.47, 0.42), (0.60, 0.57, 0.51), scale=3, bump=0.25, rough=(0.55, 0.8))
m_edge = lib.mat_simple("edge", (0.12, 0.11, 0.10), 0.45, metal=0.6, bump=0.1)
m_bark = lib.mat_simple("bark", (0.12, 0.09, 0.07), 0.9, bump=0.8, bscale=30)
m_pot = lib.mat_stone("pot", (0.28, 0.27, 0.26), (0.33, 0.32, 0.30), scale=4, bump=0.2, spots=False)

# ---------------------------------------------------------------- collections d'instances
c_gravel = lib.hidden_collection("GRAVEL")
lib.rock_set("gr", 10, m_gravel, c_gravel, size=1.0, flat=0.55, amp=0.3)
c_gab = lib.hidden_collection("GABROCKS")
lib.rock_set("gb", 14, m_gab, c_gab, size=1.0, flat=0.7, amp=0.34, sharp=True, subd=3)
c_leaf = lib.hidden_collection("LEAVES")
lf = bpy.data.objects.new("leaf", lib.leaf_mesh("leafm", 0.011, 0.018)); lf.data.materials.append(m_leaf); c_leaf.objects.link(lf)
c_leaf2 = lib.hidden_collection("LEAVES2")
lf2 = bpy.data.objects.new("leaf2", lib.leaf_mesh("leafm2", 0.03, 0.055)); lf2.data.materials.append(m_leaf2); c_leaf2.objects.link(lf2)

# ---------------------------------------------------------------- sol et pelouse
Y0, Y1 = -3, 9.2
ground = lib.plane("ground", 14, Y1 - Y0 + 2, loc=(0, (Y0 + Y1) / 2, 0), mat=m_soil, subdiv=120)
def lawn_w(x, y):
    if y > Y1 or y < Y0 - 0.5:
        return 0
    d = abs(x - path_x(y)) - (PATH_W + 0.06)
    return max(0.0, min(1.0, d / 0.05))
vg = lib.vgroup_from(ground, "lawn", lawn_w)
c_blades = lib.blade_collection('BLADES', m_grass_blade, n=10, seed=3)
lib.gn_scatter(ground, c_blades, 30000 * Q, 0.8, 1.3, seed=3, mask=vg, tilt=0.3, name='lawn')

# ---------------------------------------------------------------- allée : gravier + pas japonais + bordures
gp = lib.plane("gravelbed", 1, 1, subdiv=0)
# bande de gravier construite le long de la courbe
import bmesh
bm = bmesh.new()
rows = []
N = 90
for i in range(N + 1):
    y = Y0 - 0.5 + (Y1 + 0.3 - (Y0 - 0.5)) * i / N
    cx = path_x(y)
    rows.append([bm.verts.new((cx + PATH_W * s, y, 0.005)) for s in (-1, -0.5, 0, 0.5, 1)])
for i in range(N):
    for j in range(4):
        bm.faces.new((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]))
bm.to_mesh(gp.data); bm.free()
gp.data.materials.append(lib.mat_simple("gravelbase", (0.12, 0.10, 0.08), 0.95))
area = 2 * PATH_W * (Y1 - Y0 + 0.8)
lib.gn_scatter(gp, c_gravel, 22000 * max(Q, 0.35), 0.005, 0.010, seed=5, tilt=0.4, name='gravel')

y = Y0 + 0.2
k = 0
while y < 7.6:
    cx = path_x(y)
    lib.slab(f"slab{k}", rnd.uniform(0.52, 0.6), rnd.uniform(0.34, 0.4), 0.05,
             (cx + rnd.uniform(-.04, .04), y, 0.022), rot=math.atan(0.35 * 0.28 * math.cos(y * .28)) + rnd.uniform(-.06, .06),
             mat=m_slab, seed=k)
    y += 0.62 + rnd.uniform(-.03, .03)
    k += 1

# bordures acier de chaque côté (bande fine qui suit la courbe)
for side in (-1, 1):
    bm = bmesh.new()
    prev = None
    for i in range(N + 1):
        yy = Y0 - 0.5 + (Y1 - (Y0 - 0.5)) * i / N
        x = path_x(yy) + side * PATH_W
        a = bm.verts.new((x, yy, -0.02)); b = bm.verts.new((x, yy, 0.03))
        if prev:
            bm.faces.new((prev[0], a, b, prev[1]))
        prev = (a, b)
    me = bpy.data.meshes.new(f"edge{side}"); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(f"edge{side}", me); lib.link(ob)
    sol = ob.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.005
    me.materials.append(m_edge)

# ---------------------------------------------------------------- buis le long de l'allée
for i, yy in enumerate([0.8, 2.6, 4.4, 6.2]):
    for side in (-1, 1):
        r = rnd.uniform(0.26, 0.33)
        lib.foliage_ball(f"box{i}{side}", (path_x(yy) + side * (PATH_W + 0.55), yy + rnd.uniform(-.2, .2), r * 0.85), r,
                         c_leaf, int(9000 * r * r / 0.09 * max(Q, 0.5)), leaf_size=1.0, seed=i * 7 + side, core_mat=m_core)

# ---------------------------------------------------------------- muret en gabions + terrasse
GY = 8.3
gw, gh, gd = 4.2, 0.9, 0.5
def gabion(cx, cy, w, h, d, name):
    # grillage : grille soudée (maille 10 cm)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, h / 2))
    cage = bpy.context.active_object; cage.name = name + "cage"
    cage.scale = (w, d, h); bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete(type="ONLY_FACE")
    bpy.ops.object.mode_set(mode="OBJECT")
    # remplacer par des arêtes de grille : on subdivise un cube plein puis wireframe
    bpy.data.objects.remove(cage)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, h / 2))
    cage = bpy.context.active_object; cage.name = name + "cage"
    cage.scale = (w, d, h); bpy.ops.object.transform_apply(scale=True)
    import bmesh as bmm
    bmx = bmm.new(); bmx.from_mesh(cage.data)
    for axis, size in ((0, w), (1, d), (2, h)):
        n = max(1, int(round(size / 0.1)))
        for i in range(1, n):
            co = -size / 2 + size * i / n
            geom = bmx.verts[:] + bmx.edges[:] + bmx.faces[:]
            plane_no = [0, 0, 0]; plane_no[axis] = 1
            plane_co = [cx, cy, h / 2]; plane_co[axis] = [cx, cy, h / 2][axis] + co
            bmm.ops.bisect_plane(bmx, geom=geom, plane_co=plane_co, plane_no=plane_no)
    bmx.to_mesh(cage.data); bmx.free()
    wf = cage.modifiers.new("w", "WIREFRAME"); wf.thickness = 0.005; wf.use_even_offset = False
    cage.data.materials.append(m_wire)
    # pierres : empilement en grille avec jitter
    import random as _r
    rr = _r.Random(hash(name) % 999)
    s = 0.085
    k = 0
    gobs = list(c_gab.objects)
    z = s * 0.6
    while z < h - s * 0.4:
        xx = -w / 2 + s * 0.8
        while xx < w / 2 - s * 0.6:
            for dy in (-d / 2 + s * 0.8, 0, d / 2 - s * 0.8):
                src = rr.choice(gobs)
                ob = bpy.data.objects.new(f"{name}r{k}", src.data)
                sc = s * rr.uniform(0.7, 1.35)
                ob.scale = (sc * rr.uniform(.9, 1.2), sc, sc * rr.uniform(.8, 1.05))
                ob.location = (cx + xx + rr.uniform(-.035, .035), cy + dy + rr.uniform(-.02, .02), z + rr.uniform(-.025, .025))
                ob.rotation_euler = (rr.uniform(-.9, .9), rr.uniform(-.9, .9), rr.uniform(0, 6.3))
                lib.link(ob)
                k += 1
            xx += s * rr.uniform(1.2, 1.6)
        z += s * 1.05
gabion(-2.6, GY, gw, gh, gd, "gabL")
gabion(2.6, GY, gw, gh, gd, "gabR")

# terrasse en dallage derrière (légèrement surélevée)
TY0 = GY + 0.4
for i in range(-9, 9):
    for j in range(0, 6):
        lib.slab(f"pv{i}_{j}", 0.795, 0.595, 0.04, (i * 0.8 + 0.4 + (0.4 if j % 2 else 0), TY0 + j * 0.6 + 0.3, 0.2),
                 mat=m_pave, bevel=0.004, rough_edge=0.0015, seed=i * 10 + j)
lib.slab("deck", 14.6, 3.8, 0.18, (0, TY0 + 1.8, 0.09), mat=lib.mat_simple("deckbase", (0.3, 0.29, 0.27), 0.9), bevel=0.01, rough_edge=0)
# marches d'accès dans l'axe de l'allée
lib.slab("step", 1.1, 0.4, 0.12, (0, GY, 0.06), mat=m_pave, bevel=0.006, rough_edge=0.002)

# pots + oliviers stylisés sur la terrasse
for px in (-1.6, 1.6):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=0.6, location=(px, TY0 + 1.0, 0.52))
    pot = bpy.context.active_object; pot.data.materials.append(m_pot)
    b = pot.modifiers.new("b", "BEVEL"); b.width = 0.02; b.segments = 3
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=1.3, location=(px, TY0 + 1.0, 1.35))
    tr = bpy.context.active_object; tr.data.materials.append(m_bark)
    for c in range(4):
        lib.foliage_ball(f"olive{px}{c}", (px + rnd.uniform(-.3, .3), TY0 + 1.0 + rnd.uniform(-.25, .25), 2.0 + rnd.uniform(-.1, .35)),
                         rnd.uniform(0.3, 0.42), c_leaf2, int(2600 * max(Q, 0.5)), leaf_size=1.0, seed=c + int(px * 10), core_mat=m_core)

# ---------------------------------------------------------------- haie et arbres au fond
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, TY0 + 4.2, 1.15))
hedge = bpy.context.active_object; hedge.name = "hedge"
hedge.scale = (26, 0.9, 2.3); bpy.ops.object.transform_apply(scale=True)
bv = hedge.modifiers.new("b", "BEVEL"); bv.width = 0.2; bv.segments = 4
bpy.ops.object.modifier_apply(modifier="b")
sub = hedge.modifiers.new("s", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
bpy.ops.object.modifier_apply(modifier="s")
dsp = hedge.modifiers.new("d", "DISPLACE"); tx = bpy.data.textures.new("ht", "CLOUDS"); tx.noise_scale = 0.4; dsp.texture = tx; dsp.strength = 0.12
bpy.ops.object.modifier_apply(modifier="d")
hedge.data.materials.append(m_core)
lib.gn_scatter(hedge, c_leaf, 9000 * max(Q, 0.4), 1.0, 1.6, seed=9, tilt=0.9, align_normal=True, name='hedge')

def tree(name, x, y, h, spread, leaves, seed):
    rr = random.Random(seed)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1 + h * 0.012, depth=h * 0.7, location=(x, y, h * 0.35))
    bpy.context.active_object.data.materials.append(m_bark)
    for c in range(rr.randint(6, 9)):
        a = rr.uniform(0, 6.28); d = rr.uniform(0, spread * 0.55)
        r = spread * rr.uniform(0.32, 0.5)
        lib.foliage_ball(f"{name}c{c}", (x + math.cos(a) * d, y + math.sin(a) * d * 0.7, h * rr.uniform(0.62, 0.95)), r,
                         c_leaf2, int(leaves * r * r), squash=rr.uniform(0.7, 0.95), leaf_size=1.6, seed=seed * 13 + c, core_mat=m_core)

# arbres derrière la haie, plus ou moins loin
for i in range(6):
    tree(f"t{i}", -7.5 + i * 3 + rnd.uniform(-.8, .8), TY0 + 7 + rnd.uniform(0, 4), rnd.uniform(5.5, 8), rnd.uniform(3, 4.2), 5200 * max(Q, 0.4), 60 + i)
# rideau lointain (bosquets), très flou
for i in range(10):
    tree(f"f{i}", -30 + i * 6.5 + rnd.uniform(-2, 2), TY0 + 26 + rnd.uniform(0, 10), rnd.uniform(8, 12), rnd.uniform(5, 7), 1800 * max(Q, 0.4), 90 + i)
# cyprès qui encadrent la terrasse
for cx in (-5.2, 5.2):
    lib.foliage_ball(f"cyp{cx}", (cx, TY0 + 3.3, 2.6), 0.55, c_leaf, int(26000 * max(Q, 0.4)), squash=4.6, leaf_size=1.1, seed=int(cx * 3) + 200, core_mat=m_core)

# ---------------------------------------------------------------- lumière et caméras
lib.sky_and_sun(elev=float(args.get("elev", 17)), azim=float(args.get("azim", 150)), strength=0.45, sun_strength=4.8)

SHOTS = {
    # plan large : on entre dans l'allée
    "allee":   dict(loc=(-0.55, -2.9, 0.62), target=(0.35, 6, 0.55), lens=32, fstop=4.0, focus=3.6),
    # pas japonais de près, gravier net
    "pas":     dict(loc=(0.55, 1.2, 0.55), target=(0.05, 3.2, 0.0), lens=45, fstop=2.8, focus=2.1),
    # gabions : vue rasante
    "gabions": dict(loc=(-0.45, 6.2, 0.62), target=(-2.4, GY - 0.25, 0.45), lens=40, fstop=4.0, focus=None),
    # terrasse : arrivée
    "terrasse": dict(loc=(0.75, 5.6, 1.45), target=(-0.2, TY0 + 1.6, 0.75), lens=28, fstop=6.3, focus=4.6),
}
cam = lib.camera(**SHOTS[SHOT])

print(f"scene built in {time.time() - t0:.1f}s", flush=True)
t1 = time.time()
lib.render(OUT, W, H, SAMPLES, exposure=float(args.get("exp", -0.35)))
print(f"render {W}x{H} s={SAMPLES} in {time.time() - t1:.1f}s -> {OUT}", flush=True)
