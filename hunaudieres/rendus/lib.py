"""Bibliothèque de scènes Blender (Cycles) pour les visuels Hunaudières Matériaux."""
import bpy, bmesh, math, random
from mathutils import Vector, Euler, Matrix

R = random.Random(7)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 3
    sc.cycles.glossy_bounces = 2
    sc.cycles.transmission_bounces = 4
    sc.cycles.transparent_max_bounces = 6
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.render.image_settings.file_format = "PNG"
    sc.render.film_transparent = False
    return sc


def render(path, w, h, samples, exposure=0.0):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.cycles.samples = samples
    sc.view_settings.exposure = exposure
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ------------------------------------------------------------------ lumière
def sky_and_sun(elev=22, azim=200, strength=1.0, sun_strength=4.5, sun_color=(1.0, 0.86, 0.68), haze=1.0):
    w = bpy.data.worlds.new("World")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_disc = False
    sky.sun_elevation = math.radians(elev)
    sky.sun_rotation = math.radians(azim)
    sky.air_density = 1.0
    sky.dust_density = haze
    sky.ozone_density = 1.0
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(sky.outputs[0], bg.inputs[0])
    nt.links.new(bg.outputs[0], out.inputs[0])

    ld = bpy.data.lights.new("Sun", "SUN")
    ld.energy = sun_strength
    ld.angle = math.radians(0.8)
    ld.color = sun_color
    sun = bpy.data.objects.new("Sun", ld)
    bpy.context.collection.objects.link(sun)
    e, a = math.radians(elev), math.radians(azim)
    to_sun = Vector((math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e)))
    sun.rotation_euler = (-to_sun).to_track_quat("-Z", "Y").to_euler()
    # le ciel Nishita place le soleil à l'azimut mesuré depuis +Y dans le sens horaire
    sky.sun_rotation = math.atan2(to_sun.x, to_sun.y)
    return sun


# ------------------------------------------------------------------ caméra
def camera(loc, target, lens=35, fstop=4.0, focus=None, sensor=36):
    cd = bpy.data.cameras.new("Cam")
    cd.lens = lens
    cd.sensor_width = sensor
    cam = bpy.data.objects.new("Cam", cd)
    bpy.context.collection.objects.link(cam)
    cam.location = loc
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = fstop
    cd.dof.focus_distance = focus if focus else d.length
    bpy.context.scene.camera = cam
    return cam


# ------------------------------------------------------------------ matériaux
def _mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt, nt.nodes["Principled BSDF"]


def mat_stone(name, c1, c2, c3=None, rough=(0.65, 0.9), bump=0.35, scale=18, spots=True):
    """Pierre : couleur variée par instance + grain fin + bosses."""
    m, nt, p = _mat(name)
    n = nt.nodes
    L = nt.links
    info = n.new("ShaderNodeObjectInfo")
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*c1, 1)
    ramp.color_ramp.elements[1].color = (*c2, 1)
    if c3:
        e = ramp.color_ramp.elements.new(0.5)
        e.color = (*c3, 1)
    L.new(info.outputs["Random"], ramp.inputs["Fac"])
    tc = n.new("ShaderNodeTexCoord")
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 12
    noise.inputs["Roughness"].default_value = 0.65
    L.new(tc.outputs["Object"], noise.inputs["Vector"])
    mix = n.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "OVERLAY"
    mix.inputs[0].default_value = 0.55
    L.new(ramp.outputs[0], mix.inputs[6])
    L.new(noise.outputs["Fac"], mix.inputs[7])
    col = mix.outputs[2]
    if spots:
        vor = n.new("ShaderNodeTexVoronoi")
        vor.inputs["Scale"].default_value = scale * 6
        L.new(tc.outputs["Object"], vor.inputs["Vector"])
        sp = n.new("ShaderNodeMath"); sp.operation = "GREATER_THAN"; sp.inputs[1].default_value = 0.93
        L.new(vor.outputs["Distance"], sp.inputs[0])
        mix2 = n.new("ShaderNodeMix"); mix2.data_type = "RGBA"; mix2.blend_type = "MULTIPLY"
        L.new(sp.outputs[0], mix2.inputs[0])
        L.new(col, mix2.inputs[6])
        mix2.inputs[7].default_value = (0.35, 0.33, 0.3, 1)
        col = mix2.outputs[2]
    L.new(col, p.inputs["Base Color"])
    rr = n.new("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value = rough[0]
    rr.inputs["To Max"].default_value = rough[1]
    L.new(noise.outputs["Fac"], rr.inputs["Value"])
    L.new(rr.outputs[0], p.inputs["Roughness"])
    bn = n.new("ShaderNodeBump")
    bn.inputs["Strength"].default_value = bump
    bn.inputs["Distance"].default_value = 0.004
    n2 = n.new("ShaderNodeTexNoise")
    n2.inputs["Scale"].default_value = scale * 8
    n2.inputs["Detail"].default_value = 8
    L.new(tc.outputs["Object"], n2.inputs["Vector"])
    L.new(n2.outputs["Fac"], bn.inputs["Height"])
    L.new(bn.outputs[0], p.inputs["Normal"])
    return m


def mat_simple(name, color, rough=0.8, metal=0.0, bump=0.0, bscale=40):
    m, nt, p = _mat(name)
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if bump:
        n = nt.nodes
        tc = n.new("ShaderNodeTexCoord")
        no = n.new("ShaderNodeTexNoise"); no.inputs["Scale"].default_value = bscale; no.inputs["Detail"].default_value = 10
        nt.links.new(tc.outputs["Object"], no.inputs["Vector"])
        bn = n.new("ShaderNodeBump"); bn.inputs["Strength"].default_value = bump
        nt.links.new(no.outputs["Fac"], bn.inputs["Height"])
        nt.links.new(bn.outputs[0], p.inputs["Normal"])
    return m


def mat_leaf(name, c1, c2, trans=0.35):
    """Feuille / brin d'herbe : variation de teinte, translucidité (contre-jour)."""
    m, nt, p = _mat(name)
    n = nt.nodes; L = nt.links
    info = n.new("ShaderNodeObjectInfo")
    hair = n.new("ShaderNodeHairInfo")
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*c1, 1)
    ramp.color_ramp.elements[1].color = (*c2, 1)
    add = n.new("ShaderNodeMath"); add.operation = "ADD"
    L.new(info.outputs["Random"], add.inputs[0])
    L.new(hair.outputs["Random"], add.inputs[1])
    fr = n.new("ShaderNodeMath"); fr.operation = "FRACT"
    L.new(add.outputs[0], fr.inputs[0])
    L.new(fr.outputs[0], ramp.inputs["Fac"])
    L.new(ramp.outputs[0], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.45
    p.inputs["Specular IOR Level"].default_value = 0.4
    # translucidité : mélange avec un BSDF translucide
    tr = n.new("ShaderNodeBsdfTranslucent")
    L.new(ramp.outputs[0], tr.inputs["Color"])
    mix = n.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = trans
    out = n["Material Output"]
    L.new(p.outputs[0], mix.inputs[1])
    L.new(tr.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs["Surface"])
    return m


def mat_grass_hair(name):
    """Herbe en courbes : racine sombre, pointe claire, variation par brin."""
    m, nt, p = _mat(name)
    n = nt.nodes; L = nt.links
    hair = n.new("ShaderNodeHairInfo")
    r1 = n.new("ShaderNodeValToRGB")
    r1.color_ramp.elements[0].color = (0.03, 0.06, 0.012, 1)
    r1.color_ramp.elements[1].color = (0.20, 0.34, 0.06, 1)
    L.new(hair.outputs["Intercept"], r1.inputs["Fac"])
    r2 = n.new("ShaderNodeValToRGB")
    r2.color_ramp.elements[0].color = (0.55, 0.62, 0.32, 1)
    r2.color_ramp.elements[1].color = (1.25, 1.1, 0.8, 1)
    L.new(hair.outputs["Random"], r2.inputs["Fac"])
    mul = n.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1
    L.new(r1.outputs[0], mul.inputs[6]); L.new(r2.outputs[0], mul.inputs[7])
    L.new(mul.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.5
    tr = n.new("ShaderNodeBsdfTranslucent")
    L.new(mul.outputs[2], tr.inputs["Color"])
    mix = n.new("ShaderNodeMixShader"); mix.inputs[0].default_value = 0.3
    L.new(p.outputs[0], mix.inputs[1]); L.new(tr.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], n["Material Output"].inputs["Surface"])
    return m


# ------------------------------------------------------------------ géométrie
def link(ob, coll=None):
    (coll or bpy.context.collection).objects.link(ob)
    return ob


def hidden_collection(name):
    """Collection source d'instances : non liée à la scène (donc invisible) mais instanciable."""
    return bpy.data.collections.new(name)


def rock_mesh(name, size=1.0, seed=0, flat=0.6, subd=3, amp=0.28, sharp=True):
    """Caillou : icosphère aplatie, déformée par du bruit, arêtes adoucies."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subd, radius=size)
    rr = random.Random(seed)
    ox, oy, oz = rr.random() * 100, rr.random() * 100, rr.random() * 100
    import mathutils.noise as mn
    sx, sy, sz = 1 + rr.uniform(-.25, .35), 1 + rr.uniform(-.3, .2), flat * rr.uniform(.75, 1.2)
    for v in bm.verts:
        p = v.co.normalized()
        d = mn.noise(Vector((p.x * 1.4 + ox, p.y * 1.4 + oy, p.z * 1.4 + oz))) * amp
        d += mn.noise(Vector((p.x * 4 + ox, p.y * 4 + oy, p.z * 4 + oz))) * amp * .25
        if sharp:
            # facettes de pierre concassée
            d -= abs(mn.noise(Vector((p.x * 2.2 + oz, p.y * 2.2 + ox, p.z * 2.2 + oy)))) * amp * .8
        v.co = Vector((p.x * sx, p.y * sy, p.z * sz)) * size * (1 + d)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for f in me.polygons:
        f.use_smooth = True
    return me


def rock_set(prefix, n, mat, coll, size=1.0, flat=0.6, amp=0.28, sharp=True, subd=3):
    obs = []
    for i in range(n):
        me = rock_mesh(f"{prefix}{i}", size, seed=hash(prefix) % 1000 + i, flat=flat, amp=amp, sharp=sharp, subd=subd)
        me.materials.append(mat)
        ob = bpy.data.objects.new(f"{prefix}{i}", me)
        coll.objects.link(ob)
        obs.append(ob)
    return obs


def plane(name, sx, sy, loc=(0, 0, 0), mat=None, subdiv=0):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (sx, sy, 1)
    bpy.ops.object.transform_apply(scale=True)
    if subdiv:
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.subdivide(number_cuts=subdiv)
        bpy.ops.object.mode_set(mode="OBJECT")
    if mat:
        ob.data.materials.append(mat)
    return ob


def scatter(emitter, coll, count, size, size_rand=0.5, seed=1, name="scatter", vgroup=None, align_random=1.0):
    """Répartit une collection d'objets à la surface d'un maillage (particules instanciées)."""
    ps = emitter.modifiers.new(name, "PARTICLE_SYSTEM").particle_system
    s = ps.settings
    s.type = "HAIR"
    s.use_advanced_hair = True
    s.count = count
    s.hair_length = 1
    s.normal_factor = 1.0
    s.render_type = "COLLECTION"
    s.instance_collection = coll
    s.use_collection_pick_random = True
    s.particle_size = size
    s.size_random = size_rand
    s.use_rotations = True
    s.rotation_mode = "OB_Z"
    s.rotation_factor_random = align_random
    s.phase_factor_random = 2.0
    s.use_rotation_instance = False
    s.emit_from = "FACE"
    s.distribution = "RAND"
    s.use_even_distribution = True
    ps.seed = seed
    if vgroup:
        ps.vertex_group_density = vgroup
    emitter.show_instancer_for_render = True
    return ps


def grass(emitter, count, length=0.08, children=40, mat=None, seed=3, vgroup=None, radius=0.0022, clump=0.35):
    if mat:
        emitter.data.materials.append(mat)
        idx = len(emitter.data.materials)
    ps = emitter.modifiers.new("grass", "PARTICLE_SYSTEM").particle_system
    s = ps.settings
    s.type = "HAIR"
    s.use_advanced_hair = False
    s.count = count
    s.hair_length = length
    s.hair_step = 5
    s.display_step = 3
    s.render_step = 4
    s.child_type = "INTERPOLATED"
    s.child_percent = 10
    s.rendered_child_count = children
    s.child_length = 1.0
    s.child_length_threshold = 0.25
    s.child_radius = 0.06
    s.clump_factor = clump
    s.roughness_1 = 0.04
    s.roughness_1_size = 0.6
    s.roughness_endpoint = 0.03
    s.roughness_2 = 0.02
    s.use_parent_particles = True
    s.factor_random = 0.25
    s.normal_factor = length
    s.tangent_factor = length * 0.12
    s.tangent_phase = 1.0
    s.brownian_factor = 0.02
    s.root_radius = 1.0
    s.tip_radius = 0.0
    s.radius_scale = radius
    s.shape = -0.3
    s.emit_from = "FACE"
    s.use_even_distribution = True
    if mat:
        s.material = idx
    ps.seed = seed
    if vgroup:
        ps.vertex_group_density = vgroup
        ps.vertex_group_length = vgroup
    emitter.show_instancer_for_render = True
    return ps


def vgroup_from(ob, name, fn):
    """Groupe de sommets pondéré par fn(x, y) -> 0..1."""
    vg = ob.vertex_groups.new(name=name)
    for v in ob.data.vertices:
        w = fn(v.co.x, v.co.y)
        if w > 0:
            vg.add([v.index], min(1, w), "REPLACE")
    return name


def leaf_mesh(name, w=0.012, l=0.02):
    """Petite feuille ovale légèrement pliée."""
    bm = bmesh.new()
    pts = []
    for i in range(9):
        t = i / 8
        y = t * l
        x = math.sin(t * math.pi) * w * 0.5
        pts.append((x, y))
    verts_l = [bm.verts.new((-x, y, abs(x) * 0.4)) for x, y in pts]
    verts_r = [bm.verts.new((x, y, abs(x) * 0.4)) for x, y in pts]
    mid = [bm.verts.new((0, y, 0)) for _, y in pts]
    for i in range(8):
        bm.faces.new((mid[i], mid[i + 1], verts_r[i + 1], verts_r[i]))
        bm.faces.new((verts_l[i], verts_l[i + 1], mid[i + 1], mid[i]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for f in me.polygons:
        f.use_smooth = True
    return me


def foliage_ball(name, loc, radius, leaf_coll, count, squash=1.0, leaf_size=1.0, seed=0, core_mat=None):
    """Buis / arbuste : sphère bosselée couverte de feuilles."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=radius, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (1, 1, squash)
    d = ob.modifiers.new("d", "DISPLACE")
    t = bpy.data.textures.new(name + "t", "CLOUDS")
    t.noise_scale = radius * 0.6
    d.texture = t
    d.strength = radius * 0.18
    bpy.ops.object.modifier_apply(modifier="d")
    bpy.ops.object.transform_apply(scale=True)
    if core_mat:
        ob.data.materials.append(core_mat)
    area = 4 * math.pi * radius * radius * max(squash, 0.5)
    gn_scatter(ob, leaf_coll, count / area, leaf_size * 0.7, leaf_size * 1.2, seed=seed, tilt=0.9, align_normal=True, name="leaves")
    return ob


def slab(name, sx, sy, sz, loc, rot=0, mat=None, bevel=0.012, rough_edge=0.006, seed=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (sx, sy, sz)
    ob.rotation_euler.z = rot
    bpy.ops.object.transform_apply(scale=True)
    b = ob.modifiers.new("b", "BEVEL"); b.width = bevel; b.segments = 3
    s = ob.modifiers.new("s", "SUBSURF"); s.levels = 3; s.render_levels = 3; s.subdivision_type = "SIMPLE"
    if rough_edge:
        d = ob.modifiers.new("d", "DISPLACE")
        t = bpy.data.textures.new(name + "t", "CLOUDS"); t.noise_scale = 0.05; t.noise_depth = 3
        d.texture = t; d.strength = rough_edge; d.texture_coords = "GLOBAL"
    for f in ob.data.polygons:
        f.use_smooth = True
    if mat:
        ob.data.materials.append(mat)
    return ob


# ------------------------------------------------------------------ Geometry Nodes
def gn_scatter(ob, coll, density, smin, smax, seed=0, mask=None, tilt=0.3, align_normal=False, keep_base=True, name="scatter"):
    """Répartit les objets d'une collection sur la surface de `ob`.
    density : instances par m² ; mask : nom d'un groupe de sommets (0..1) qui module la densité."""
    ng = bpy.data.node_groups.new(name, "GeometryNodeTree")
    ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N, L = ng.nodes, ng.links
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    dist = N.new("GeometryNodeDistributePointsOnFaces")
    dist.distribute_method = "RANDOM"
    dist.inputs["Seed"].default_value = seed
    L.new(gi.outputs[0], dist.inputs["Mesh"])
    if mask:
        na = N.new("GeometryNodeInputNamedAttribute"); na.data_type = "FLOAT"; na.inputs["Name"].default_value = mask
        mul = N.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = density
        L.new(na.outputs["Attribute"], mul.inputs[0])
        L.new(mul.outputs[0], dist.inputs["Density"])
    else:
        dist.inputs["Density"].default_value = density
    ci = N.new("GeometryNodeCollectionInfo")
    ci.inputs["Collection"].default_value = coll
    ci.inputs["Separate Children"].default_value = True
    ci.inputs["Reset Children"].default_value = True
    iop = N.new("GeometryNodeInstanceOnPoints")
    iop.inputs["Pick Instance"].default_value = True
    L.new(dist.outputs["Points"], iop.inputs["Points"])
    L.new(ci.outputs[0], iop.inputs["Instance"])
    ri = N.new("FunctionNodeRandomValue"); ri.data_type = "INT"
    ri.inputs[4].default_value = 0; ri.inputs[5].default_value = 997
    ri.inputs[8].default_value = seed + 11
    L.new(ri.outputs[2], iop.inputs["Instance Index"])
    rv = N.new("FunctionNodeRandomValue"); rv.data_type = "FLOAT_VECTOR"
    rv.inputs[0].default_value = (-tilt, -tilt, 0)
    rv.inputs[1].default_value = (tilt, tilt, 6.2832)
    rv.inputs[8].default_value = seed + 23
    e2r = N.new("FunctionNodeEulerToRotation")
    L.new(rv.outputs[0], e2r.inputs["Euler"])
    if align_normal:
        rr = N.new("FunctionNodeRotateRotation")
        L.new(dist.outputs["Rotation"], rr.inputs["Rotation"])
        L.new(e2r.outputs["Rotation"], rr.inputs["Rotate By"])
        L.new(rr.outputs["Rotation"], iop.inputs["Rotation"])
    else:
        L.new(e2r.outputs["Rotation"], iop.inputs["Rotation"])
    rs = N.new("FunctionNodeRandomValue"); rs.data_type = "FLOAT"
    rs.inputs[2].default_value = smin; rs.inputs[3].default_value = smax
    rs.inputs[8].default_value = seed + 37
    L.new(rs.outputs[1], iop.inputs["Scale"])
    if keep_base:
        j = N.new("GeometryNodeJoinGeometry")
        L.new(gi.outputs[0], j.inputs[0]); L.new(iop.outputs[0], j.inputs[0])
        L.new(j.outputs[0], go.inputs[0])
    else:
        L.new(iop.outputs[0], go.inputs[0])
    mod = ob.modifiers.new(name, "NODES")
    mod.node_group = ng
    return mod


def blade_mesh(name, h, w, bend, seed):
    """Brin d'herbe : ruban effilé, courbé, légèrement vrillé (origine à la base)."""
    rr = random.Random(seed)
    bm = bmesh.new()
    seg = 7
    left, right = [], []
    twist = rr.uniform(-.6, .6)
    for i in range(seg + 1):
        t = i / seg
        y = bend * t * t * h           # courbure vers l'avant
        z = h * t * (1 - 0.25 * bend * t)
        half = w * 0.5 * (1 - t ** 1.6) + 0.0002
        a = twist * t
        cx, cy = math.cos(a) * half, math.sin(a) * half
        left.append(bm.verts.new((-cx, y - cy, z)))
        right.append(bm.verts.new((cx, y + cy, z + half * 0.3)))
    for i in range(seg):
        bm.faces.new((left[i], right[i], right[i + 1], left[i + 1]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for f in me.polygons:
        f.use_smooth = True
    return me


def blade_collection(name, mat, n=8, h=(0.045, 0.09), w=(0.0025, 0.004), seed=0):
    c = hidden_collection(name)
    rr = random.Random(seed)
    for i in range(n):
        me = blade_mesh(f"{name}{i}", rr.uniform(*h), rr.uniform(*w), rr.uniform(0.15, 0.6), seed + i)
        me.materials.append(mat)
        c.objects.link(bpy.data.objects.new(f"{name}{i}", me))
    return c
