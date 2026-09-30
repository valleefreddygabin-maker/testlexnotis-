"""Photos produits : un gros plan réaliste par famille de matériaux."""
import sys, math, random, time
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import lib

args = dict(a.split("=") for a in sys.argv[sys.argv.index("--") + 1:]) if "--" in sys.argv else {}
P = args.get("p", "gravel")
W, H = int(args.get("w", 480)), int(args.get("h", 600))
S = int(args.get("s", 32))
OUT = args.get("out", f"p_{P}.png")
t0 = time.time()
lib.reset()
rnd = random.Random(21)

m_soil = lib.mat_simple("soil", (0.08, 0.06, 0.045), 0.95, bump=0.4, bscale=80)
m_blade = lib.mat_leaf("blade", (0.06, 0.13, 0.02), (0.22, 0.36, 0.06), trans=0.35)
base = lib.plane("base", 3, 3, mat=m_soil, subdiv=40)

def layer(z=0.0):
    return lib.plane("layer", 3, 3, loc=(0, 0, z), mat=m_soil)

def gravel_bed(ob, colors, density, smin, smax, flat=0.55, sharp=True, n=12, name="g", amp=0.3):
    m = lib.mat_stone(name + "m", *colors, scale=50 if sharp else 8, bump=0.35 if sharp else 0.15, rough=(0.55, 0.85) if sharp else (0.35, 0.6), spots=sharp)
    c = lib.hidden_collection(name.upper())
    lib.rock_set(name, n, m, c, size=1.0, flat=flat, amp=amp, sharp=sharp)
    lib.gn_scatter(ob, c, density, smin, smax, seed=len(name), tilt=0.5, name=name)
    return m

cam_default = dict(loc=(0, -0.55, 0.42), target=(0, 0.05, 0.0), lens=60, fstop=3.2, focus=None)
cam = cam_default
sun = dict(elev=24, azim=140)

if P == "gravel":            # gravier concassé beige
    gravel_bed(base, ((0.42, 0.36, 0.28), (0.72, 0.65, 0.54), (0.30, 0.28, 0.26)), 26000, 0.005, 0.011)
    gravel_bed(layer(0.004), ((0.42, 0.36, 0.28), (0.72, 0.65, 0.54), (0.30, 0.28, 0.26)), 9000, 0.004, 0.008, name="g2")
elif P == "galets":          # galets roulés blancs/gris
    gravel_bed(base, ((0.45, 0.44, 0.42), (0.86, 0.84, 0.80), (0.62, 0.58, 0.52)), 900, 0.018, 0.034, flat=0.6, sharp=False, amp=0.12)
    gravel_bed(layer(0.01), ((0.45, 0.44, 0.42), (0.86, 0.84, 0.80), (0.62, 0.58, 0.52)), 1400, 0.012, 0.022, flat=0.6, sharp=False, amp=0.12, name="g2")
elif P == "pas":             # pas japonais sur gravier, bord de pelouse
    gravel_bed(base, ((0.36, 0.30, 0.23), (0.62, 0.55, 0.45), (0.24, 0.22, 0.21)), 20000, 0.005, 0.010)
    m = lib.mat_stone("slab", (0.15, 0.15, 0.15), (0.40, 0.37, 0.33), (0.25, 0.23, 0.21), scale=3, bump=1.0, rough=(0.7, 0.95))
    lib.slab("s1", 0.58, 0.38, 0.05, (0.02, 0.05, 0.022), rot=0.08, mat=m)
    lib.slab("s2", 0.56, 0.36, 0.05, (-0.05, 0.72, 0.022), rot=-0.05, mat=m)
    cam = dict(loc=(0.25, -0.75, 0.55), target=(0, 0.2, 0.0), lens=50, fstop=4.0, focus=0.95)
elif P == "dallage":         # grandes dalles, lumière rasante
    m = lib.mat_stone("pave", (0.50, 0.47, 0.42), (0.62, 0.59, 0.53), scale=3, bump=0.3, rough=(0.5, 0.8))
    for i in range(-3, 3):
        for j in range(-2, 5):
            lib.slab(f"p{i}{j}", 0.595, 0.595, 0.03, (i * 0.6 + 0.3 + (0.3 if j % 2 else 0), j * 0.6, 0.015), mat=m, bevel=0.004, rough_edge=0.0012, seed=i * 9 + j)
    sun = dict(elev=12, azim=160)
    cam = dict(loc=(0.35, -0.8, 0.5), target=(0, 0.6, 0.0), lens=45, fstop=4.0, focus=1.1)
elif P == "pierres":         # muret en pierres sèches
    m = lib.mat_stone("dry", (0.35, 0.30, 0.24), (0.66, 0.60, 0.50), (0.50, 0.44, 0.36), scale=5, bump=0.8)
    c = lib.hidden_collection("DRY")
    obs = lib.rock_set("d", 12, m, c, size=1.0, flat=1.0, amp=0.16, sharp=True)
    back = lib.slab("back", 1.9, 0.12, 0.8, (0, 0.26, 0.4), mat=lib.mat_simple("mortar", (0.12, 0.1, 0.08), 0.95), bevel=0.0, rough_edge=0)
    z = 0.03; k = 0
    while z < 0.75:
        h = rnd.uniform(0.045, 0.08); x = -0.9 + rnd.uniform(0, 0.08)
        while x < 0.9:
            w = rnd.uniform(0.12, 0.26)
            ob = bpy.data.objects.new(f"s{k}", rnd.choice(obs).data); lib.link(ob); k += 1
            ob.scale = (w / 2 * 1.05, 0.12, h / 2 * 1.08)
            ob.location = (x + w / 2, 0.15 + rnd.uniform(-.01, .01), z + h / 2)
            ob.rotation_euler = (rnd.uniform(-.05, .05), rnd.uniform(-.05, .05), rnd.uniform(-.06, .06))
            x += w * 0.97
        z += h * 0.95
    sun = dict(elev=30, azim=120)
    cam = dict(loc=(0.3, -0.85, 0.42), target=(0, 0.15, 0.36), lens=50, fstop=4.5, focus=None)
elif P == "bois":            # traverses empilées
    m, nt, p = lib._mat("wood")
    n = nt.nodes; L = nt.links
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (0.35, 4, 4)
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    wave = n.new("ShaderNodeTexWave"); wave.wave_type = "BANDS"; wave.bands_direction = "X"; wave.inputs["Scale"].default_value = 3; wave.inputs["Distortion"].default_value = 9; wave.inputs["Detail"].default_value = 8; wave.inputs["Detail Scale"].default_value = 2
    L.new(mp.outputs["Vector"], wave.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.10, 0.065, 0.04, 1); ramp.color_ramp.elements[1].color = (0.30, 0.20, 0.12, 1)
    L.new(wave.outputs["Fac"], ramp.inputs["Fac"]); L.new(ramp.outputs[0], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.85
    bn = n.new("ShaderNodeBump"); bn.inputs["Strength"].default_value = 0.25
    L.new(wave.outputs["Fac"], bn.inputs["Height"]); L.new(bn.outputs[0], p.inputs["Normal"])
    for row in range(3):
        for i in range(3):
            lib.slab(f"w{row}{i}", 1.6, 0.22, 0.13, (rnd.uniform(-.05, .05), i * 0.235 - 0.1 + (0.11 if row % 2 else 0), 0.065 + row * 0.13),
                     rot=rnd.uniform(-.02, .02), mat=m, bevel=0.012, rough_edge=0.004, seed=row * 3 + i)
    cam = dict(loc=(1.35, -1.15, 0.85), target=(0.15, 0.1, 0.2), lens=50, fstop=5.6, focus=None)
elif P == "bordures":        # bordure acier entre gravier et pelouse
    edge = lib.plane("edgebed", 3, 1.5, loc=(0, -0.75, 0.001))
    gravel_bed(edge, ((0.36, 0.30, 0.23), (0.62, 0.55, 0.45), (0.24, 0.22, 0.21)), 20000, 0.005, 0.010)
    lawn = lib.plane("lawn", 3, 1.5, loc=(0, 0.75, 0.0))
    c = lib.blade_collection("BL", m_blade, n=10, seed=3)
    lib.gn_scatter(lawn, c, 36000, 0.8, 1.3, seed=3, tilt=0.3, name="lawn")
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.0, 0.01))
    st = bpy.context.active_object; st.scale = (3, 0.004, 0.09); bpy.ops.object.transform_apply(scale=True)
    st.data.materials.append(lib.mat_simple("corten", (0.22, 0.08, 0.03), 0.7, metal=0.3, bump=0.4, bscale=60))
    cam = dict(loc=(0.3, -0.7, 0.35), target=(0, 0.15, 0.0), lens=50, fstop=3.2, focus=0.75)
elif P == "paillage":        # écorces de pin
    import bmesh
    m = lib.mat_stone("bark", (0.10, 0.05, 0.025), (0.32, 0.17, 0.08), (0.20, 0.10, 0.05), scale=30, bump=0.8, rough=(0.7, 0.95), spots=False)
    c = lib.hidden_collection("CHIPS")
    for i in range(10):
        me = lib.rock_mesh(f"chip{i}", 1.0, seed=300 + i, flat=0.18, amp=0.35, sharp=True)
        me.materials.append(m)
        c.objects.link(bpy.data.objects.new(f"chip{i}", me))
    lib.gn_scatter(base, c, 6000, 0.012, 0.028, seed=8, tilt=0.5, name="chips")
    lib.gn_scatter(layer(0.006), c, 3000, 0.01, 0.022, seed=9, tilt=0.6, name="chips2")

lib.sky_and_sun(elev=sun["elev"], azim=sun["azim"], strength=0.45, sun_strength=4.8)
lib.camera(**cam)
print(f"scene {time.time() - t0:.1f}s", flush=True)
t1 = time.time()
lib.render(OUT, W, H, S, exposure=float(args.get("exp", -1.1)))
print(f"render {P} {time.time() - t1:.1f}s", flush=True)
