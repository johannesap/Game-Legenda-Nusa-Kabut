// The map: height field, regions, liquids (water / lava / frozen ice), ground colors, scenery with
// colliders, settlements and treasure chests. Pure functions first, then the builder.
//   center: Mist Village; inner ring: meadow (SE half) and pine forest (NW half) with a big lake
//   outer ring by direction: east desert, south deathwood, west magma (volcano + dragon), north tundra
//   mountain ridges separate the outer regions (with passes); past the frontier the land drops into the open sea,
//   with the Diamond Island (data.js ISLE) across a strait in the south-west; four rivers run through the water lands
(function () {
  const T = THREE, P = Math.PI, hyp = Math.hypot;
  const TR = window.Terrain = { HALF: 1240, WATER: -1.6, LAVA: -0.9, springs: [], warps: [], gears: [], smoke: [], barriers: [] };
  // the realms' great castles that are not settlements: the dragon's on the realm's highest peak, the demon lord's on the
  // mountain at the back of its realm (the bosses in data.js LAIRS wait at the same points). r: the flattened plateau
  const KEEPS = TR.KEEPS = { dragon: { x: -442, z: 442, r: 54, R: 30 }, demon: { x: 0, z: 668, r: 74, R: 42 }, dgate: { x: 40, z: -70, r: 16, R: 5 } }; // dgate: the dungeon's gate near the village
  // the dungeon hall, out of reach past the world's edge: inside its walls you stand on its floor
  const DUN = TR.DUNGEON = { x: 1150, z: 1150, w: 64, d: 88, y: 140 };
  TR.dungeonAt = (x, z) => Math.abs(x - DUN.x) < DUN.w / 2 && Math.abs(z - DUN.z) < DUN.d / 2;
  TR.keepAt = (x, z, m) => Object.values(KEEPS).some(k => hyp(x - k.x, z - k.z) < k.r + (m || 0));
  const smooth = TR.smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const rng = TR.rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // procedural surface textures: grey canvases that multiply a material's colour; clones carry their own repeat
  const TEXC = {};
  const tex = TR.tex = (key, rx, ry) => {
    const k = key + ':' + rx + ':' + ry; if (TEXC[k]) return TEXC[k];
    if (!TEXC[key]) { const n = key === 'grain' ? 256 : 128, cv = document.createElement('canvas'); cv.width = cv.height = n; DRAW[key](cv.getContext('2d'), n, rng(n + key.length));
      const t = TEXC[key] = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; }
    const t = TEXC[k] = TEXC[key].clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return t;
  };
  const grey = v => 'rgb(' + v + ',' + v + ',' + v + ')';
  const DRAW = {
    grain(c, n, R) { // soil and grass speckle
      c.fillStyle = grey(228); c.fillRect(0, 0, n, n);
      for (let i = 0; i < 50; i++) { c.globalAlpha = 0.25; c.fillStyle = grey(205 + R() * 50 | 0); c.beginPath(); c.arc(R() * n, R() * n, 6 + R() * 18, 0, 7); c.fill(); }
      for (let i = 0; i < 3200; i++) { c.globalAlpha = 0.55; c.fillStyle = grey(185 + R() * 70 | 0); c.fillRect(R() * n, R() * n, 1 + R() * 2, 1 + R() * 3); }
      c.globalAlpha = 1;
    },
    planks(c, n, R) { // horizontal boards with seams and grain
      c.fillStyle = grey(236); c.fillRect(0, 0, n, n);
      for (let y = 0; y < n; y += 16) {
        c.fillStyle = grey(222 + R() * 26 | 0); c.fillRect(0, y, n, 15);
        for (let i = 0; i < 6; i++) { c.fillStyle = grey(205 + R() * 30 | 0); c.fillRect(0, y + 2 + R() * 11, n, 1); }
        c.fillStyle = grey(160); c.fillRect(0, y + 15, n, 1); c.fillRect(R() * n | 0, y, 2, 15);
      }
    },
    stone(c, n, R) { // brick courses with mortar
      c.fillStyle = grey(175); c.fillRect(0, 0, n, n);
      for (let row = 0, y = 0; y < n; y += 16, row++) for (let x = (row % 2) * -16; x < n; x += 32) {
        c.fillStyle = grey(215 + R() * 40 | 0); c.fillRect(x + 1, y + 1, 30, 14);
        c.fillStyle = grey(200 + R() * 30 | 0); for (let i = 0; i < 8; i++) c.fillRect(x + 2 + R() * 26, y + 2 + R() * 10, 2, 2);
      }
    },
    plaster(c, n, R) { // smooth render with faint stains
      c.fillStyle = grey(240); c.fillRect(0, 0, n, n);
      for (let i = 0; i < 30; i++) { c.globalAlpha = 0.2; c.fillStyle = grey(215 + R() * 35 | 0); c.beginPath(); c.arc(R() * n, R() * n, 4 + R() * 16, 0, 7); c.fill(); }
      for (let i = 0; i < 900; i++) { c.globalAlpha = 0.35; c.fillStyle = grey(200 + R() * 55 | 0); c.fillRect(R() * n, R() * n, 1, 1); }
      c.globalAlpha = 1;
    },
    tiles(c, n, R) { // overlapping roof tiles, darker at each lower edge
      for (let row = 0, y = 0; y < n; y += 12, row++) {
        for (let x = (row % 2) * -8; x < n; x += 16) {
          const g = c.createLinearGradient(0, y, 0, y + 12), v = 205 + R() * 45 | 0;
          g.addColorStop(0, grey(v)); g.addColorStop(1, grey(v - 70)); c.fillStyle = g; c.fillRect(x, y, 15, 12);
        }
      }
    },
    waves(c, n, R) { // normal map of a few crossing swells (integer wave numbers keep it seamless)
      const ws = []; for (let i = 0; i < 7; i++) ws.push([(R() * 7 | 0) - 3 || 1, (R() * 7 | 0) - 3 || 2, R() * 6.28, 0.4 + R()]);
      const h = (x, y) => ws.reduce((s, [fx, fy, ph, a]) => s + a * Math.sin((fx * x + fy * y) / n * P * 2 + ph), 0), img = c.createImageData(n, n);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const dx = (h(x + 1, y) - h(x - 1, y)) * 2.5, dy = (h(x, y + 1) - h(x, y - 1)) * 2.5, l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
        img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    }
  };
  // several primitives baked into one geometry (for instanced scenery): [geometry, x, y, z]
  const merge = parts => {
    const pos = [], nor = [];
    for (const [g0, x, y, z] of parts) { const g = g0.index ? g0.toNonIndexed() : g0; g.translate(x, y, z); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
    const out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); return out;
  };
  // a soft, slightly lumpy ball of leaves (smooth normals from the centre)
  const blob = r => {
    const g = new T.IcosahedronGeometry(r, 1), p = g.attributes.position, nm = g.attributes.normal, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + 0.1 * Math.sin(v.x * 5.1) * Math.sin(v.y * 4.3 + v.z * 3.7); p.setXYZ(i, v.x * k, v.y * k, v.z * k); v.normalize(); nm.setXYZ(i, v.x, v.y, v.z); }
    return g;
  };
  const S2 = Math.SQRT1_2, LAKE = TR.LAKE = { x: -78, z: 78, a: 45, b: 120, ux: -S2, uz: S2, vx: -S2, vz: -S2 }, VOLCANO = TR.VOLCANO = { x: -380, z: 20 };
  // 1 on the shore of the long lake, below 1 inside (half-widths: 45 m across, 120 m along)
  const lakeD = (x, z) => { const dx = x - LAKE.x, dz = z - LAKE.z; return hyp((dx * LAKE.ux + dz * LAKE.uz) / LAKE.a, (dx * LAKE.vx + dz * LAKE.vz) / LAKE.b); };
  // rivers, source to mouth: channels cut to a bed under the water line so the world's water fills them. They only cross
  // lands whose liquid is water (never lava, ice or cloud) and keep clear of settlements, castles and lairs
  const RIVERS = [
    { w: 8, pts: [[200, -120], [275, -55], [350, -15], [420, 0], [480, 0], [560, 25], [650, 35], [730, 25], [790, 0], [880, 45], [990, 105], [1090, 140], [1260, 165]] }, // east to the sea
    { w: 7, pts: [[480, 500], [430, 440], [345, 345], [270, 350], [200, 355], [130, 345], [60, 345], [-15, 305], [-40, 220], [-40, 140]] }, // beast hills to the lake
    { w: 8, pts: [[-530, -30], [-640, -40], [-740, 10], [-810, 62], [-900, 85], [-1010, 115], [-1110, 135], [-1260, 150]] }, // giants' land, a gorge, the marsh, the sea
    { w: 6, pts: [[395, -390], [470, -340], [560, -250], [640, -150], [700, -50], [730, 25]] } // the elves' stream, into the east river
  ].map(rv => { // segments with their running length from the source, and a box so far points skip the river fast
    const segs = [], xs = rv.pts.map(p => p[0]), zs = rv.pts.map(p => p[1]), m = rv.w + 30; let s = 0;
    for (let i = 1; i < rv.pts.length; i++) { const [px, pz] = rv.pts[i - 1], dx = rv.pts[i][0] - px, dz = rv.pts[i][1] - pz, l = hyp(dx, dz); segs.push([px, pz, dx, dz, l, s]); s += l; }
    return { w: rv.w, segs, x0: Math.min(...xs) - m, x1: Math.max(...xs) + m, z0: Math.min(...zs) - m, z1: Math.max(...zs) + m };
  });
  const carve = (x, z, h) => {
    const mx = x + 8 * Math.sin(z * 0.023), mz = z + 8 * Math.sin(x * 0.019); // gentle meanders
    for (const rv of RIVERS) {
      if (mx < rv.x0 || mx > rv.x1 || mz < rv.z0 || mz > rv.z1) continue;
      let d = 1e9, at = 0;
      for (const [px, pz, dx, dz, l, s] of rv.segs) { const t = Math.max(0, Math.min(1, ((mx - px) * dx + (mz - pz) * dz) / (l * l))), e = hyp(mx - px - dx * t, mz - pz - dz * t); if (e < d) { d = e; at = s + t * l; } }
      const w = rv.w * (0.35 + 0.65 * smooth(0, 120, at)), k = smooth(w + 10, w * 0.5, d); // a narrow spring widening downstream; 10 m banks
      if (k > 0) h += (Math.min(h, -3.4) - h) * k;
    }
    return h;
  };
  // two piers on the lake, each with a ship moored at its end (x1, z1)
  TR.DOCKS = [
    { id: 'harbor', name: { id: 'Dermaga Pelabuhan', en: 'Harbor Pier' }, x0: 13, z0: 140.7, x1: -14.4, z1: 141.6 },
    { id: 'grove', name: { id: 'Dermaga Rimba', en: 'Forest Pier' }, x0: -115, z0: -12, x1: -141.6, z1: 14.4 }
  ];
  TR.PLACES = []; // doors you can enter: guild hall, castle
  TR.LAIRS = []; TR.TOWERS = []; TR.mills = [];
  // ---- the eight realms beyond the mountain ring (r ≈ 455–525), one per 45° slice starting east ----
  const realmOf = TR.realmOf = (x, z) => REALMS[(Math.round(Math.atan2(z, x) / (P / 4)) + 8) % 8];
  const angDist = (a, step, off) => { const k = (((a - off) % step) + step) % step; return Math.min(k, step - k); };
  // the ring of mountains, with a pass into each realm
  const ringW = (x, z) => { const r = hyp(x, z); if (r < 430 || r > 528) return 0; return smooth(430, 462, r) * smooth(528, 494, r) * (1 - smooth(0.15, 0.05, angDist(Math.atan2(z, x), P / 4, 0))); };
  // ridges between neighbouring realms, with low passes
  const realmRidge = (x, z) => { const r = hyp(x, z); if (r < 520) return 0; return smooth(0.1, 0.02, angDist(Math.atan2(z, x), P / 4, P / 8)) * smooth(520, 590, r) * (0.35 + 0.65 * Math.abs(Math.sin(r * 0.017))); };
  const REALM_H = {
    human: (x, z) => 1.2 * Math.sin(x * 0.03) * Math.cos(z * 0.025) + 0.8 * Math.sin(x * 0.07 + z * 0.05) + 1.2,
    beast: (x, z) => 1.5 * Math.sin(x * 0.02 + z * 0.03) + 7 * smooth(0.55, 0.8, Math.sin(x * 0.013) * Math.sin(z * 0.017)) + 0.6, // savanna with mesas
    elf: (x, z) => 2.5 * Math.sin(x * 0.045) * Math.cos(z * 0.04) + 1.2 * Math.sin(x * 0.09 + z * 0.08) + 0.8,
    giant: (x, z) => 4.5 * Math.sin(x * 0.02) * Math.cos(z * 0.018) + 3 * Math.sin(z * 0.05) + 3,
    dwarf: (x, z) => 11 * Math.abs(Math.sin(x * 0.03) * Math.sin(z * 0.027)) + 3, // canyons between high plateaus
    angel: (x, z) => 2 + 4.5 * Math.sin(x * 0.03) * Math.sin(z * 0.033), // highlands above a sea of clouds
    dragon: (x, z) => 11 * Math.abs(Math.sin(x * 0.03) * Math.sin(z * 0.028)) + 7 * smooth(0.5, 0.95, Math.sin(x * 0.02) * Math.cos(z * 0.022)) + 2.5 * Math.sin(x * 0.09 + z * 0.07) - 0.5, // crags and ridges
    demon: (x, z) => 3 * Math.abs(Math.sin(x * 0.06) * Math.cos(z * 0.05)) + 2.4 * Math.sin(x * 0.11) * Math.sin(z * 0.09) - 0.4
  };
  const REALM_LIQ = { dragon: 'lava', demon: 'lava', angel: 'cloud' };
  // ---- the frontier beyond the old world edge (r ≈ 800–1180): five lands, one per 72° slice starting east ----
  const frontierOf = TR.frontierOf = (x, z) => FRONTIER[(Math.round(Math.atan2(z, x) / (P * 2 / 5)) + 5) % 5];
  // ridges between neighbouring frontier lands, with low passes
  const frontRidge = (x, z) => { const r = hyp(x, z); if (r < 810) return 0; return smooth(0.09, 0.02, angDist(Math.atan2(z, x), P * 2 / 5, P / 5)) * smooth(810, 870, r) * (0.35 + 0.65 * Math.abs(Math.sin(r * 0.015))); };
  // the old world edge: a mountain ring between the realms and the frontier, with a pass into each land
  const edgeW = (x, z) => { const r = hyp(x, z); if (r < 735 || r > 835) return 0; return smooth(735, 765, r) * smooth(835, 805, r) * (1 - smooth(0.11, 0.04, angDist(Math.atan2(z, x), P * 2 / 5, 0))); };
  const FRONT_H = {
    storm: (x, z) => 2.5 * Math.sin(x * 0.03) * Math.cos(z * 0.027) + 10 * smooth(0.72, 0.97, Math.sin(x * 0.021) * Math.cos(z * 0.019)) + 2, // plains with rock spires
    glass: (x, z) => 2.8 * Math.sin(x * 0.04 + 2 * Math.sin(z * 0.017)) + 1.2 * Math.sin(z * 0.08) + 1.6, // dunes
    marsh: (x, z) => 1.4 * Math.sin(x * 0.06) * Math.cos(z * 0.05) + 0.8 * Math.sin(x * 0.13 + z * 0.11) - 0.4, // low bog with pools
    crystal: (x, z) => 5 * Math.sin(x * 0.025) * Math.sin(z * 0.03) + 2 * Math.abs(Math.sin(x * 0.07 + z * 0.06)) + 3.5, // rolling hills
    void: (x, z) => 7 * Math.abs(Math.sin(x * 0.04) * Math.cos(z * 0.035)) + 2.5 * Math.sin(x * 0.1 + z * 0.08) - 0.2 // broken ground over void pits
  };
  const FRONT_LIQ = { crystal: 'ice', void: 'lava' };

  const sectorOf = (x, z) => { const a = Math.atan2(z, x); return a > -P / 4 && a <= P / 4 ? 'desert' : a > P / 4 && a <= 3 * P / 4 ? 'death' : a > -3 * P / 4 && a <= -P / 4 ? 'ice' : 'magma'; };
  // mountain ridges along the borders between outer regions; low passes around r ≈ 300
  const ridgeW = (x, z) => {
    const r = hyp(x, z); if (r < 150) return 0;
    const a = Math.atan2(z, x), k = ((a + P / 4) % (P / 2) + P / 2) % (P / 2), e = Math.min(k, P / 2 - k);
    return smooth(0.2, 0.02, e) * smooth(150, 230, r) * (0.3 + 0.7 * Math.abs(Math.sin(r * 0.021)));
  };

  const rawHeight = (x, z) => {
    const r = hyp(x, z);
    let h = (3 * Math.sin(x * 0.03) * Math.cos(z * 0.035) + 1.6 * Math.sin(x * 0.071 + z * 0.052) + 0.6 * Math.sin(z * 0.13)) * smooth(22, 48, r);
    const o = smooth(165, 215, r);
    if (o > 0) {
      const s = sectorOf(x, z); let add;
      if (s === 'desert') add = 2.2 * Math.sin(x * 0.045 + 2 * Math.sin(z * 0.018)) + 1.2 * Math.sin(z * 0.09) + 1.2; // dunes
      else if (s === 'ice') add = 3 * Math.abs(Math.sin(x * 0.04) * Math.cos(z * 0.05)) + 1.2;
      else if (s === 'magma') { const dv = hyp(x - VOLCANO.x, z - VOLCANO.z); add = 0.2 + 2.4 * Math.sin(x * 0.05) * Math.sin(z * 0.061) + 30 * smooth(80, 10, dv) - 13 * smooth(13, 5, dv); }
      else add = -0.3 + 1.3 * Math.sin(x * 0.08) * Math.cos(z * 0.07); // low, swampy deathwood
      h = h * (1 - o) + (h * 0.4 + add) * o;
      h += ridgeW(x, z) * (16 + 6 * Math.sin(x * 0.05 + z * 0.04)) * smooth(500, 462, r);
    }
    const o2 = smooth(495, 560, r);
    if (o2 > 0) h = h * (1 - o2) + (h * 0.25 + REALM_H[realmOf(x, z)](x, z)) * o2 + realmRidge(x, z) * smooth(810, 780, r) * (14 + 5 * Math.sin(x * 0.04 + z * 0.05));
    const dk = hyp(x - KEEPS.dragon.x, z - KEEPS.dragon.z), dm = hyp(x - KEEPS.demon.x, z - KEEPS.demon.z);
    if (dk < 240) h += 46 * Math.pow(smooth(240, 0, dk), 1.3); // the dragon realm's great peak
    if (dm < 160) h += 26 * smooth(160, 60, dm); // the demon castle's mountain
    h += ringW(x, z) * (24 + 6 * Math.sin(x * 0.05 + z * 0.04));
    h -= 10 * smooth(1, 0.35, lakeD(x, z));
    // a dry bank where the middle's water would touch the outer ring's lava or ice (r 172), and the lava a realm's water (r 490)
    const sc = sectorOf(x, z), bank = sc === 'magma' || sc === 'ice' ? Math.max(smooth(154, 164, r) * smooth(190, 180, r), sc === 'magma' ? smooth(474, 484, r) * smooth(506, 496, r) : 0) : 0;
    if (bank > 0) h += (Math.max(h, 0.6) - h) * bank;
    const o3 = smooth(800, 850, r); // the frontier lands
    if (o3 > 0) h = h * (1 - o3) + (h * 0.2 + FRONT_H[frontierOf(x, z)](x, z)) * o3 + frontRidge(x, z) * (15 + 5 * Math.sin(x * 0.03 + z * 0.04));
    h += edgeW(x, z) * (26 + 6 * Math.sin(x * 0.05 + z * 0.04)); // the old edge of the world, now with passes
    // a dry bank where a frontier land's own lava or ice would touch the sea (r 1150), then the coast drops into the deep
    if (r > 1120 && FRONT_LIQ[frontierOf(x, z)]) h += (Math.max(h, 0.6) - h) * smooth(1120, 1132, r) * smooth(1175, 1163, r);
    h -= 30 * smooth(1160, 1225, r);
    const di = hyp(x - ISLE.x, z - ISLE.z), ik = smooth(ISLE.r + 40, ISLE.r - 20, di); // the Diamond Island: low shores, a hill in the middle
    if (ik > 0) h = h * (1 - ik) + (2.4 + 1.8 * Math.sin(x * 0.05) * Math.cos(z * 0.045) + 10 * smooth(62, 8, di)) * ik;
    return carve(x, z, h);
  };
  // settlements are flattened to the land's own height at their center (a mountain fort stays up high)
  const FLATS = TOWNS.concat(Object.values(KEEPS)); // settlements and castle plateaus are levelled
  TR.height = (x, z) => {
    let h = rawHeight(x, z);
    for (const tw of FLATS) {
      // walled towns and castles: the ground follows the castle's level out past the wall, then ramps back down (or up)
      const d = hyp(x - tw.x, z - tw.z), f = tw.walls || tw.build || tw.city ? smooth(tw.r * 1.25 + 14, tw.r + 2, d) : smooth(tw.r, tw.r * 0.6, d);
      if (f > 0) { if (tw.base == null) tw.base = Math.max(0.3, rawHeight(tw.x, tw.z)); h = h * (1 - f) + tw.base * f; }
    }
    return h;
  };
  // what fills the low ground: water, lava in the magma region, frozen water in the tundra
  TR.liquid = (x, z) => { const r = hyp(x, z); if (r < 172 || r >= 1150) return 'water'; if (r >= 800) return FRONT_LIQ[frontierOf(x, z)] || 'water'; if (r >= 490) return REALM_LIQ[realmOf(x, z)] || 'water'; const s = sectorOf(x, z); return s === 'magma' ? 'lava' : s === 'ice' ? 'ice' : 'water'; };
  TR.liquidY = k => k === 'lava' ? TR.LAVA : k === 'ice' || k === 'cloud' ? TR.WATER + 0.08 : TR.WATER;
  // where feet rest: on the ground or on top of the water/lava/ice surface
  // the floating castle of the angel realm (set up in TR.build): inside its deck circle you stand high above the ground
  TR.SKY = null;
  TR.skyAt = (x, z) => !!TR.SKY && hyp(x - TR.SKY.x, z - TR.SKY.z) < TR.SKY.r;
  TR.ground = (x, z) => TR.skyAt(x, z) ? TR.SKY.y : TR.dungeonAt(x, z) ? DUN.y : Math.max(TR.height(x, z), TR.liquidY(TR.liquid(x, z)));
  TR.townAt = (x, z, margin) => TOWNS.find(tw => hyp(x - tw.x, z - tw.z) < tw.r + (margin || 0)) || null;
  TR.biomeAt = (x, z, under) => { // under: the region a settlement stands in, instead of 'town'
    if (!under && TR.townAt(x, z)) return 'town';
    const h = TR.height(x, z);
    if (h < TR.WATER - 0.3 && TR.liquid(x, z) === 'water') return 'water';
    const r = hyp(x, z);
    if (r < 175) return x + z < 0 ? 'forest' : 'meadow';
    if (ringW(x, z) > 0.4) return 'mountain';
    if (edgeW(x, z) > 0.4) return 'mountain';
    if (TR.isleAt(x, z)) return 'diamond';
    if (r >= 800) return frontRidge(x, z) > 0.5 ? 'mountain' : frontierOf(x, z);
    if (r >= 500) return realmRidge(x, z) > 0.5 ? 'mountain' : realmOf(x, z);
    if (ridgeW(x, z) > 0.45 || h > 12) return 'mountain';
    return sectorOf(x, z);
  };
  TR.isleAt = (x, z, m) => hyp(x - ISLE.x, z - ISLE.z) < ISLE.r + (m || 0);
  // the level an area needs: the centre is free, the inner ring Lv 10, the realms in pairs up to Lv 50, the frontier lands
  // (and the sea off their coasts) one by one up to Lv 100, the Diamond Island's waters Lv 100; the open sea past r 1400 or
  // the map's square edge is closed (that keeps swimmers well away from the dungeon hall; the hall itself counts as open)
  TR.isleZone = (x, z) => TR.isleAt(x, z, 50);
  TR.areaLevel = (x, z) => {
    if (TR.dungeonAt(x, z)) return 1;
    if (TR.isleZone(x, z)) return AREA_LV.diamond;
    const r = hyp(x, z);
    if (r > 1400 || Math.max(Math.abs(x), Math.abs(z)) > TR.HALF - 15) return Infinity;
    return r < 200 ? 1 : r < 492 ? AREA_LV.inner : r < 800 ? AREA_LV[realmOf(x, z)] : AREA_LV[frontierOf(x, z)];
  };

  const COL = Object.fromEntries(Object.entries({ meadow: 0x78a862, forest: 0x4f7f45, desert: 0xd9b77a, ice: 0xe4edf2, magma: 0x3a3030, death: 0x4b4652,
    rock: 0x8a8478, snow: 0xf2f6f8, sand: 0xcfbf8a, mud: 0x3a3a34, ember: 0x7a2e18, town: 0x86b86d, ash: 0x4a4040, grave: 0x5a5660,
    human: 0x8fb860, farm1: 0xc8b060, farm2: 0x6a8a3a, beast: 0xc8b070, elf: 0x5fbf8a, giant: 0x5a8a4a, dwarf: 0x7a6a5a, angel: 0xeef0f4, gold: 0xe8d8a0, dragon: 0x3a2a26, demon: 0x4a1c1c, cloud: 0xf4f6fa, storm: 0x6a8a5a, glass: 0xece0c4, marsh: 0x46583a, crystal: 0x8a7ab8, void: 0x2e2038, diamond: 0xd6eef8 }).map(([k, v]) => [k, new T.Color(v)]));
  const TCOL = [COL.town, COL.town, COL.desert, COL.ice, COL.forest, COL.rock, COL.ash, COL.grave, COL.town,
    COL.town, COL.beast, COL.demon, COL.dragon, COL.giant, COL.dwarf, COL.angel, COL.elf], rc = new T.Color();
  function groundColor(x, z, y, c) {
    const r = hyp(x, z), o = smooth(165, 215, r), o2 = smooth(495, 560, r), s = sectorOf(x, z), liq = TR.liquid(x, z);
    c.copy(x + z < 0 ? COL.forest : COL.meadow).lerp(COL[s], o);
    if (o2 > 0) {
      const rl = realmOf(x, z); rc.copy(COL[rl]);
      if (rl === 'human') rc.lerp(Math.sin(x * 0.12) * Math.sin(z * 0.09) > 0.2 ? COL.farm1 : COL.farm2, 0.45); // patchwork of fields
      if (rl === 'angel') rc.lerp(COL.gold, 0.12 * (Math.sin(x * 0.05 + z * 0.04) + 1));
      c.lerp(rc, o2);
    }
    const o3 = smooth(800, 850, r), fl = o3 > 0 ? frontierOf(x, z) : null; if (fl) c.lerp(COL[fl], o3);
    const ik = smooth(ISLE.r + 10, ISLE.r - 20, hyp(x - ISLE.x, z - ISLE.z)); if (ik > 0) c.lerp(COL.diamond, ik);
    const rw = Math.max(ridgeW(x, z) * smooth(500, 462, r), ringW(x, z), realmRidge(x, z) * smooth(810, 780, r), edgeW(x, z), frontRidge(x, z)); if (rw > 0.2) c.lerp(COL.rock, Math.min(1, (rw - 0.2) * 2));
    if (y > 13) c.lerp(fl === 'void' || !fl && o2 > 0.5 && (realmOf(x, z) === 'dragon' || realmOf(x, z) === 'demon') ? COL.ash : COL.snow, smooth(13, 17, y));
    for (const k of Object.values(KEEPS)) { const f = smooth(k.R + 6, k.R - 2, hyp(x - k.x, z - k.z)); if (f > 0) c.lerp(COL.ash, f * 0.85); }
    if (liq === 'lava' && y < TR.LAVA + 0.8) c.lerp(COL.ember, 0.85);
    else if (y < TR.WATER + 0.4) c.copy(liq === 'cloud' ? COL.cloud : s === 'death' && o > 0.5 && o2 < 0.5 ? COL.mud : liq === 'ice' ? COL.ice : COL.sand);
    for (const tw of TOWNS) { const f = smooth(tw.r, tw.r * 0.6, hyp(x - tw.x, z - tw.z)); if (f > 0) c.lerp(TCOL[tw.style] || COL.town, f * 0.85); }
    const n = Math.sin(x * 0.045 + Math.sin(z * 0.031) * 2.1) * Math.sin(z * 0.052 + Math.sin(x * 0.027) * 1.7); // meadow-sized patches
    c.offsetHSL(n * 0.012, n * 0.05, n * 0.035 + Math.sin(x * 1.7 + z * 2.3) * 0.015);
  }

  // ---------- colliders: circles in an 8 m grid ----------
  const grid = new Map(), CELL = 8;
  TR.addCol = (x, z, r) => { const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL); (grid.get(k) || grid.set(k, []).get(k)).push([x, z, r]); };
  // push a position (Vector3) out of anything solid; sliding falls out of this naturally
  TR.collide = (pos, rad) => {
    const cx = Math.floor(pos.x / CELL), cz = Math.floor(pos.z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const list = grid.get((cx + i) + ',' + (cz + j)); if (!list) continue;
      for (const [x, z, r] of list) { const dx = pos.x - x, dz = pos.z - z, d = hyp(dx, dz), m = r + rad; if (d < m && d > 1e-4) { pos.x = x + dx / d * m; pos.z = z + dz / d * m; } }
    }
  };

  // ---------- builder ----------
  const M = () => window.Models;
  TR.build = function (scene, quality) {
    const sky = TOWNS.find(tw => tw.sky); // the deck ends under the castle wall, so nobody walks up from the ground or off the edge
    if (sky) TR.SKY = { x: sky.x, z: sky.z, r: sky.r - 1, y: TR.height(sky.x, sky.z) + 62 }; // the wall (r - 2) blocks both sides of this edge
    const q = quality === 'low' ? 0.45 : 1, segs = quality === 'low' ? 300 : 520;
    TR.LAIRS = LAIRS.map(l => ENEMIES[l.type].water ? { ...l } : { ...l, ...dry(l.x, l.z, 20) });
    TR.TOWERS = [[185, 0], [0, 185], [-185, 0], [0, -185]].concat(REALMS.map((_, i) => [Math.cos(i * P / 4 + 0.06) * 476, Math.sin(i * P / 4 + 0.06) * 476])).map(([x, z]) => dry(x, z, 16)); // watchtowers at region entrances and realm passes
    const geo = new T.PlaneGeometry(2 * TR.HALF, 2 * TR.HALF, segs, segs); geo.rotateX(-P / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = TR.height(x, z);
      pos.setY(i, y); groundColor(x, z, y, c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.computeVertexNormals();
    const nor = geo.attributes.normal; // steep slopes show bare rock
    for (let i = 0; i < pos.count; i++) {
      const k = smooth(0.88, 0.66, nor.getY(i)); if (k <= 0 || pos.getY(i) < TR.WATER + 0.5 || TR.townAt(pos.getX(i), pos.getZ(i))) continue;
      for (let j = 0; j < 3; j++) col[i * 3 + j] += ([COL.rock.r, COL.rock.g, COL.rock.b][j] * 0.9 - col[i * 3 + j]) * k;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const terrain = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, map: tex('grain', 300, 300) })); terrain.userData.flat = true; scene.add(terrain);
    // liquids: water everywhere, lava and ice wedges over the outer magma and tundra regions
    const flat = (g, m, y) => { g.rotateX(-P / 2); const o = new T.Mesh(g, m); o.position.y = y; o.userData.flat = true; scene.add(o); return o; };
    TR.waveTex = tex('waves', 470, 470); // water: glossy, with drifting ripples that catch the sun
    const SEA = 2 * TR.HALF + 2400; // the open sea runs on past the fog in every direction, over a dark floor
    flat(new T.PlaneGeometry(SEA, SEA), M().mat(0x1e3a48), -30);
    flat(new T.PlaneGeometry(SEA, SEA), new T.MeshPhongMaterial({ color: 0x2c6e9e, specular: 0xcfe4ff, shininess: 70, transparent: true, opacity: 0.82, normalMap: TR.waveTex, normalScale: new T.Vector2(0.5, 0.5) }), TR.WATER);
    TR.lavaMat = new T.MeshBasicMaterial({ color: 0xff5a1a });
    flat(new T.RingGeometry(172, 490, 48, 1, 3 * P / 4, P / 2), TR.lavaMat, TR.LAVA);
    flat(new T.RingGeometry(172, 490, 48, 1, P / 4, P / 2), M().mat(0xcfe8f2, { transparent: true, opacity: 0.92 }), TR.WATER + 0.08);
    // realm wedges (ring angle θ runs opposite to the map angle): lava for dragons and demons, a cloud sea for angels
    const cloudMat = M().mat(0xf4f6fa, { transparent: true, opacity: 0.96 });
    REALMS.forEach((rl, i) => { const lq = REALM_LIQ[rl]; if (lq) flat(new T.RingGeometry(490, 800, 24, 1, -(i * P / 4) - P / 8, P / 4), lq === 'lava' ? TR.lavaMat : cloudMat, TR.liquidY(lq)); });
    const iceMat = M().mat(0xcfe8f2, { transparent: true, opacity: 0.92 }), voidMat = new T.MeshBasicMaterial({ color: 0x7a2aef }); // the void pits glow and burn like lava
    FRONTIER.forEach((fl, k) => { const lq = FRONT_LIQ[fl]; if (lq) flat(new T.RingGeometry(800, 1150, 30, 1, -(k * P * 2 / 5) - P / 5, P * 2 / 5), lq === 'lava' ? voidMat : iceMat, TR.liquidY(lq)); });
    const crater = flat(new T.CircleGeometry(9, 20), TR.lavaMat, TR.height(VOLCANO.x, VOLCANO.z) + 0.4); crater.position.x = VOLCANO.x; crater.position.z = VOLCANO.z;
    scenery(scene, q); towns(scene); realmCastles(scene); docks(scene); lairMarks(scene); barriers(scene); dungeonGate(scene); dungeonHall(scene); diamondIsle(scene); skyIsles(scene, q);
    TR.TOWERS.forEach(tw => { tower(scene, tw.x, tw.z, TR.height(tw.x, tw.z), 2.6, 14, 0x9a948a, 0x8a2a1a); flag(scene, tw.x, TR.height(tw.x, tw.z) + 19.5, tw.z); });
    return { terrain, chests: chests(scene).concat(TR.skyChests) };
  };

  // nearest dry spot (not water, lava or a settlement) around (x, z)
  function dry(x0, z0, townGap) {
    for (let r = 0; r < 80; r += 3) for (let k = 0; k < (r ? 12 : 1); k++) {
      const x = x0 + Math.cos(k / 12 * P * 2) * r, z = z0 + Math.sin(k / 12 * P * 2) * r;
      if (TR.height(x, z) > TR.liquidY(TR.liquid(x, z)) + 0.5 && !TR.townAt(x, z, townGap)) return { x, z };
    }
    return { x: x0, z: z0 };
  }
  // instanced scenery in 200 m tiles, so tiles out of sight are skipped (TR.cull, every frame) instead of drawing the whole world
  TR.chunks = [];
  function inst(scene, geo, material, list, place, colorOf) {
    if (!list.length) return;
    const d = new T.Object3D(), tiles = new Map();
    list.forEach(it => {
      d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); place(d, it); d.updateMatrix();
      const k = Math.floor(d.position.x / 200) + ',' + Math.floor(d.position.z / 200);
      if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push([d.matrix.clone(), colorOf ? colorOf(it).clone() : null, d.position.clone()]);
    });
    for (const items of tiles.values()) {
      const m = new T.InstancedMesh(geo, material, items.length), c = new T.Vector3();
      items.forEach(([mx, col, pos], i) => { m.setMatrixAt(i, mx); if (col) m.setColorAt(i, col); c.add(pos); });
      c.divideScalar(items.length); const radius = items.reduce((r, it) => Math.max(r, it[2].distanceTo(c)), 0) + 25;
      m.frustumCulled = false; scene.add(m); TR.chunks.push({ mesh: m, center: c, radius });
    }
  }
  const frustum = new T.Frustum(), pm = new T.Matrix4(), sph = new T.Sphere();
  TR.cull = (cam, focus) => { // tiles near the hero always stay (their shadows reach into view)
    pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    for (const t of TR.chunks) {
      sph.center.copy(t.center); sph.radius = t.radius;
      t.mesh.visible = Math.hypot(t.center.x - focus.x, t.center.z - focus.z) < t.radius + 60 || t.center.distanceTo(cam.position) < cam.far + t.radius && frustum.intersectsSphere(sph);
    }
  };
  function scenery(scene, q) {
    const R = rng(7), S = { pine: [], round: [], snowpine: [], dead: [], cactus: [], rock: [], icecrys: [], firecrys: [], grave: [],
      elftree: [], shroom: [], hay: [], windmill: [], acacia: [], tallgrass: [], totem: [], giantpine: [], boulder: [], bluecrys: [], mine: [], pillar: [], cloudpuff: [], goldorb: [], bone: [], spike: [], portal: [], tuft: [], diamond: [] };
    for (let i = 0; i < 106000 * q; i++) { // same density as before over the bigger world
      const x = (R() - 0.5) * 2360, z = (R() - 0.5) * 2360, roll = R(), s = 0.7 + R() * 0.8, rot = R() * 6.28;
      const b = TR.biomeAt(x, z);
      if (b === 'town' || b === 'water' || TR.townAt(x, z, 6) || TR.keepAt(x, z, 4)) continue;
      const y = TR.height(x, z);
      if (y < TR.liquidY(TR.liquid(x, z)) + 0.15 || TR.LAIRS.some(l => hyp(x - l.x, z - l.z) < 15) || TR.TOWERS.some(t => hyp(x - t.x, z - t.z) < 6) || TR.DOCKS.some(d => hyp(x - d.x0, z - d.z0) < 9)) continue;
      const put = k => S[k].push({ x, y, z, s, rot, b });
      if (b === 'forest') roll < 0.5 ? put('pine') : roll < 0.62 ? put('round') : roll < 0.66 ? put('rock') : roll < 0.85 && put('tuft');
      else if (b === 'meadow') roll < 0.05 ? put('pine') : roll < 0.15 ? put('round') : roll < 0.18 ? put('rock') : roll < 0.6 && put('tuft');
      else if (b === 'mountain') roll < 0.2 ? put('rock') : roll < 0.25 && put('pine');
      else if (b === 'desert') roll < 0.06 ? put('cactus') : roll < 0.11 && put('rock');
      else if (b === 'ice') roll < 0.22 ? put('snowpine') : roll < 0.28 && put('icecrys');
      else if (b === 'magma') roll < 0.12 ? put('rock') : roll < 0.2 && put('firecrys');
      else if (b === 'death') roll < 0.4 ? put('dead') : roll < 0.48 && put('grave');
      else if (b === 'elf') roll < 0.28 ? put('elftree') : roll < 0.36 ? put('shroom') : roll < 0.4 ? put('round') : roll < 0.6 && put('tuft');
      else if (b === 'human') roll < 0.035 ? put('round') : roll < 0.055 ? put('hay') : roll < 0.0565 ? put('windmill') : roll < 0.3 && put('tuft');
      else if (b === 'beast') roll < 0.04 ? put('acacia') : roll < 0.2 ? put('tallgrass') : roll < 0.204 && put('totem');
      else if (b === 'giant') roll < 0.07 ? put('giantpine') : roll < 0.1 ? put('boulder') : roll < 0.3 && put('tuft');
      else if (b === 'dwarf') roll < 0.1 ? put('rock') : roll < 0.14 ? put('bluecrys') : roll < 0.1425 && put('mine');
      else if (b === 'angel') roll < 0.05 ? put('pillar') : roll < 0.09 ? put('cloudpuff') : roll < 0.11 && put('goldorb');
      else if (b === 'dragon') roll < 0.08 ? put('rock') : roll < 0.11 ? put('bone') : roll < 0.15 && put('firecrys');
      else if (b === 'demon') roll < 0.12 ? put('spike') : roll < 0.16 ? put('firecrys') : roll < 0.1625 && put('portal');
      else if (b === 'storm') roll < 0.03 ? put('round') : roll < 0.22 ? put('tallgrass') : roll < 0.26 ? put('boulder') : roll < 0.29 && put('rock');
      else if (b === 'glass') roll < 0.05 ? put('icecrys') : roll < 0.09 ? put('rock') : roll < 0.105 && put('cactus');
      else if (b === 'marsh') roll < 0.12 ? put('dead') : roll < 0.2 ? put('shroom') : roll < 0.42 ? put('tallgrass') : roll < 0.47 && put('round');
      else if (b === 'crystal') roll < 0.1 ? put('bluecrys') : roll < 0.2 ? put('elftree') : roll < 0.26 && put('icecrys');
      else if (b === 'diamond') roll < 0.07 ? put('diamond') : roll < 0.12 ? put('icecrys') : roll < 0.15 ? put('bluecrys') : roll < 0.17 && put('rock');
      else if (b === 'void') roll < 0.1 ? put('spike') : roll < 0.14 ? put('firecrys') : roll < 0.143 ? put('portal') : roll < 0.18 && put('rock');
    }
    const mat = M().mat, lam = (c, e) => mat(c, Object.assign({ flatShading: true }, e));
    const trunk = (d, t, h) => { d.position.set(t.x, t.y + h * t.s / 2, t.z); d.scale.setScalar(t.s); d.rotation.y = t.rot; };
    const crownAt = (d, t, y) => { d.position.set(t.x, t.y + y * t.s, t.z); d.scale.setScalar(t.s); d.rotation.y = t.rot; };
    const tint = new T.Color(), vary = t => tint.setRGB(0.84 + (t.rot * 3.7 % 1) * 0.3, 0.86 + (t.s * 5.3 % 1) * 0.26, 0.82 + (t.rot * 9.1 % 1) * 0.28);
    const pineG = merge([[new T.ConeGeometry(1.75, 2.4, 9), 0, -1, 0], [new T.ConeGeometry(1.4, 2.1, 9), 0, 0.15, 0], [new T.ConeGeometry(0.95, 1.8, 9), 0, 1.2, 0]]);
    const roundG = merge([[blob(1.45), 0, 0, 0], [blob(1.1), 0.85, 0.35, 0.3], [blob(1), -0.75, 0.45, -0.35], [blob(0.9), 0.1, 1, 0.1]]);
    inst(scene, new T.CylinderGeometry(0.22, 0.38, 2, 7), mat(0x6b4a2a, { map: tex('grain', 1, 2) }), S.pine.concat(S.round, S.snowpine), (d, t) => trunk(d, t, 2));
    inst(scene, pineG, mat(0x2f6b3a), S.pine, (d, t) => crownAt(d, t, 3.5), vary);
    inst(scene, roundG, mat(0x4f8f3a), S.round, (d, t) => crownAt(d, t, 3.2), vary);
    inst(scene, pineG, mat(0xd6e8ee), S.snowpine, (d, t) => crownAt(d, t, 3.5));
    const tuftG = merge([0, 2.1, 4.2].map(a => { const c = new T.ConeGeometry(0.07, 0.75, 3); c.translate(0, 0.37, 0); c.rotateZ(0.35); c.rotateY(a); return [c, 0, 0, 0]; }));
    inst(scene, tuftG, mat(0x5f8f3a), S.tuft, (d, t) => { d.position.set(t.x, t.y - 0.05, t.z); d.scale.setScalar(0.7 + t.s * 0.5); d.rotation.y = t.rot; }, t => tint.setRGB(0.85 + (t.rot % 1) * 0.3, 0.9 + (t.s % 0.3), t.b === 'elf' ? 1.2 : 0.8));
    inst(scene, new T.CylinderGeometry(0.16, 0.3, 3.2, 5), mat(0x2b2420), S.dead, (d, t) => trunk(d, t, 3.2));
    inst(scene, new T.ConeGeometry(1.1, 2.4, 3), lam(0x2e2a30), S.dead, (d, t) => { crownAt(d, t, 3.6); d.rotation.set(0.3, t.rot, 0.2); });
    inst(scene, new T.BoxGeometry(0.7, 1, 0.2), mat(0x7a7a80), S.grave, (d, t) => { d.position.set(t.x, t.y + 0.4, t.z); d.rotation.set(0.1, t.rot, 0.05); });
    inst(scene, new T.CylinderGeometry(0.35, 0.4, 2.6, 7), mat(0x4f8a3a), S.cactus, (d, t) => trunk(d, t, 2.6));
    inst(scene, new T.CylinderGeometry(0.2, 0.2, 1.1, 6), mat(0x4f8a3a), S.cactus, (d, t) => { d.position.set(t.x + Math.cos(t.rot) * 0.45 * t.s, t.y + 1.6 * t.s, t.z + Math.sin(t.rot) * 0.45 * t.s); d.scale.setScalar(t.s); });
    const basic = c => new T.MeshBasicMaterial({ color: c });
    // elven trees with pale bark and glowing mushrooms
    inst(scene, new T.CylinderGeometry(0.3, 0.45, 5, 7), mat(0xe8e0d0), S.elftree, (d, t) => trunk(d, t, 5));
    inst(scene, roundG, mat(0x3fcf9a), S.elftree, (d, t) => { crownAt(d, t, 6); d.scale.multiplyScalar(1.6); }, vary);
    inst(scene, new T.CylinderGeometry(0.08, 0.12, 0.6, 6), mat(0xf0f0e0), S.shroom, (d, t) => trunk(d, t, 0.6));
    inst(scene, new T.SphereGeometry(0.35, 10, 6, 0, P * 2, 0, P / 2), basic(0x7fffe0), S.shroom, (d, t) => crownAt(d, t, 0.58));
    // human farmland: haystacks and windmills
    inst(scene, new T.ConeGeometry(1.2, 1.8, 10), lam(0xd8b860), S.hay, (d, t) => crownAt(d, t, 0.9));
    // savanna: flat-topped acacias, tall grass and totems
    inst(scene, new T.CylinderGeometry(0.22, 0.32, 3.4, 6), mat(0x6a4a2a), S.acacia, (d, t) => trunk(d, t, 3.4));
    inst(scene, merge([[blob(1.6), 0, 0, 0], [blob(1.4), 1.6, 0.1, 0.4], [blob(1.4), -1.5, 0.05, -0.3], [blob(1.2), 0.2, 0.1, -1.5], [blob(1.2), -0.1, 0.1, 1.5]]), mat(0x6a8a3a), S.acacia, (d, t) => { crownAt(d, t, 3.8); d.scale.y *= 0.4; }, vary);
    inst(scene, new T.ConeGeometry(0.22, 1.5, 4), lam(0xb8b060), S.tallgrass, (d, t) => { crownAt(d, t, 0.7); d.rotation.set(0.15, t.rot, 0.1); });
    inst(scene, new T.BoxGeometry(0.55, 3.2, 0.55), lam(0x8a3a2a), S.totem, (d, t) => { d.position.set(t.x, t.y + 1.6, t.z); d.rotation.y = t.rot; });
    inst(scene, new T.BoxGeometry(1.4, 0.5, 0.6), lam(0xd8a040), S.totem, (d, t) => { d.position.set(t.x, t.y + 3, t.z); d.rotation.y = t.rot; });
    // giants' land: huge pines and boulders
    inst(scene, new T.CylinderGeometry(0.25, 0.35, 2, 6), mat(0x5a3e22), S.giantpine, (d, t) => { trunk(d, t, 2); d.scale.multiplyScalar(2.6); d.position.y = t.y + t.s * 2.6; });
    inst(scene, pineG, mat(0x2a5a32), S.giantpine, (d, t) => { crownAt(d, t, 3.5 * 2.6); d.scale.multiplyScalar(2.6); }, vary);
    inst(scene, new T.DodecahedronGeometry(1, 1), lam(0x7a8070, { map: tex('grain', 1, 1) }), S.boulder, (d, t) => { d.position.set(t.x, t.y + t.s, t.z); d.scale.setScalar(2.4 + t.s * 2); d.rotation.set(t.rot, t.rot * 2, 0); });
    // dwarven holds: glowing ore crystals
    inst(scene, new T.OctahedronGeometry(0.7), basic(0x6fd0ff), S.bluecrys, (d, t) => { d.position.set(t.x, t.y + t.s * 0.7, t.z); d.scale.set(t.s, t.s * 1.7, t.s); d.rotation.set(0.15, t.rot, 0.1); });
    // angelic heights: marble columns, cloud puffs and floating golden lights
    inst(scene, new T.CylinderGeometry(0.55, 0.65, 1, 12), mat(0xf4f2ec), S.pillar, (d, t) => { const hh = 3 + t.s * 4; d.position.set(t.x, t.y + hh / 2, t.z); d.scale.set(1, hh, 1); });
    inst(scene, new T.SphereGeometry(1, 10, 8), mat(0xffffff, { transparent: true, opacity: 0.9 }), S.cloudpuff, (d, t) => { d.position.set(t.x, t.y + 0.4, t.z); d.scale.set(1.6 * t.s, 0.8 * t.s, 1.3 * t.s); });
    inst(scene, new T.SphereGeometry(0.3, 10, 8), basic(0xffe080), S.goldorb, (d, t) => { d.position.set(t.x, t.y + 2 + t.s, t.z); });
    // dragon realm: giant rib bones
    inst(scene, new T.TorusGeometry(2.2, 0.2, 6, 12, P), mat(0xe8e0cc), S.bone, (d, t) => { d.position.set(t.x, t.y - 0.2, t.z); d.rotation.set(0, t.rot, 0); d.scale.setScalar(t.s); });
    // demon realm: obsidian spikes
    inst(scene, new T.ConeGeometry(0.7, 4, 5), lam(0x2a1a2a), S.spike, (d, t) => { crownAt(d, t, 1.8); d.rotation.set(0.12, t.rot, 0.08); });
    // one-off landmarks: windmills (sails turn), mine entrances, demon portals
    const { box, add } = M();
    for (const t of S.windmill) {
      add(scene, new T.Mesh(new T.CylinderGeometry(1.6, 2.2, 9, 10), mat(0xe8dcc0)), t.x, t.y + 4.5, t.z);
      add(scene, new T.Mesh(new T.ConeGeometry(2, 2.4, 10), lam(0x7a3a1a)), t.x, t.y + 10.2, t.z);
      const hub = new T.Group(); hub.position.set(t.x + Math.sin(t.rot) * 2, t.y + 8, t.z + Math.cos(t.rot) * 2); hub.rotation.y = t.rot; scene.add(hub);
      const sails = new T.Group(); hub.add(sails);
      for (let k = 0; k < 4; k++) { const arm = new T.Group(); arm.rotation.z = k * P / 2; sails.add(arm); add(arm, box(0.9, 4.6, 0.08, 0xf4ecd8), 0, 2.6, 0); }
      TR.mills.push(sails); TR.addCol(t.x, t.z, 2.4);
    }
    for (const t of S.mine) {
      const g = new T.Group(); g.position.set(t.x, t.y, t.z); g.rotation.y = t.rot; scene.add(g);
      [-1.6, 1.6].forEach(x => add(g, box(0.6, 3.2, 0.6, 0x5a3e2a), x, 1.6, 0)); add(g, box(4, 0.6, 0.7, 0x5a3e2a), 0, 3.3, 0);
      add(g, box(2.6, 2.8, 0.1, 0x0a0806), 0, 1.4, -0.2); add(g, box(0.4, 0.4, 0.4, basic(0xffb050)), 1.6, 3.8, 0.3);
      TR.addCol(t.x, t.z, 2);
    }
    for (const t of S.portal) {
      const g = new T.Group(); g.position.set(t.x, t.y + 3, t.z); g.rotation.y = t.rot; scene.add(g);
      add(g, new T.Mesh(new T.TorusGeometry(2.2, 0.3, 8, 24), lam(0x2a1a2a)), 0, 0, 0);
      add(g, new T.Mesh(new T.CircleGeometry(2, 24), new T.MeshBasicMaterial({ color: 0xa02aff, transparent: true, opacity: 0.6, side: T.DoubleSide })), 0, 0, 0);
      TR.addCol(t.x, t.z, 1.6);
    }
    const rockCol = { storm: new T.Color(0x6a6a70), glass: new T.Color(0xd8c8a0), marsh: new T.Color(0x4a5040), crystal: new T.Color(0x9a8ac8), void: new T.Color(0x2a1a2a), magma: new T.Color(0x2a2224), desert: new T.Color(0xb08a5a), ice: new T.Color(0xb8c8d0), dwarf: new T.Color(0x7a6a5a), dragon: new T.Color(0x2a2020) }, grey = new T.Color(0x8a8a84);
    inst(scene, new T.DodecahedronGeometry(1, 1), lam(0xffffff, { map: tex('grain', 1, 1) }), S.rock, (d, t) => { d.position.set(t.x, t.y, t.z); d.scale.set(0.6 + t.s, 0.5 + t.s * 0.5, 0.6 + t.s * 0.9); d.rotation.set(t.rot, t.rot * 2, 0); }, t => rockCol[t.b] || grey);
    inst(scene, new T.OctahedronGeometry(0.9), mat(0x9fe0ff, { transparent: true, opacity: 0.85 }), S.icecrys, (d, t) => { d.position.set(t.x, t.y + t.s, t.z); d.scale.set(t.s, t.s * 2, t.s); d.rotation.y = t.rot; });
    inst(scene, new T.OctahedronGeometry(1), mat(0xeefcff, { emissive: 0x2a5868, transparent: true, opacity: 0.88 }), S.diamond, (d, t) => { const k = t.s * 1.7; d.position.set(t.x, t.y + k * 1.2, t.z); d.scale.set(k, k * 1.5, k); d.rotation.set(0.12, t.rot, 0.08); });
    inst(scene, new T.OctahedronGeometry(0.8), new T.MeshBasicMaterial({ color: 0xff7a2a }), S.firecrys, (d, t) => { d.position.set(t.x, t.y + t.s * 0.8, t.z); d.scale.set(t.s, t.s * 1.8, t.s); d.rotation.set(0.2, t.rot, 0.1); });
    // solid scenery
    for (const t of S.pine.concat(S.round, S.snowpine, S.dead, S.cactus)) TR.addCol(t.x, t.z, 0.45 * t.s);
    for (const t of S.rock) TR.addCol(t.x, t.z, 0.6 + t.s * 0.75);
    for (const t of S.icecrys.concat(S.firecrys, S.grave, S.bluecrys, S.totem, S.spike)) TR.addCol(t.x, t.z, 0.5 * t.s);
    for (const t of S.diamond) TR.addCol(t.x, t.z, 1.2 * t.s);
    for (const t of S.elftree.concat(S.acacia, S.pillar)) TR.addCol(t.x, t.z, 0.6 * t.s);
    for (const t of S.giantpine) TR.addCol(t.x, t.z, 1.2 * t.s);
    for (const t of S.boulder) TR.addCol(t.x, t.z, 2.2 + t.s * 1.8);
    for (const t of S.hay) TR.addCol(t.x, t.z, 0.9 * t.s);
  }

  const STYLES = [
    { wall: [0xe2d4b5, 0xd6c3a0, 0xcbb38f], roof: [0xa0432f, 0x3f5f8a, 0x6d4a8a] },
    { wall: [0x9a7a55, 0x8a6a48], roof: [0x3f6a8a, 0x2f5a7a], tex: 'planks' },
    { wall: [0xe0c890, 0xd8bc80], roof: [0xc8a870], flat: true },
    { wall: [0x6a4a32, 0x5a3e2a], roof: [0xf0f4f8], tex: 'planks' },
    { wall: [0x7a5a3a, 0x6a4a2e], roof: [0x3f6a3a, 0x4f7a3a], tex: 'planks' },
    { wall: [0x9a9a96, 0x8a8a86], roof: [0x4a5058], tex: 'stone' },
    { wall: [0x3a3434, 0x2e2828], roof: [0x8a2a1a, 0x6a1a10], tex: 'stone' },
    { wall: [0x5a5560, 0x4a4650], roof: [0x4a3a5a, 0x3a2e4a], tex: 'stone' },
    { wall: [0xe2d4b5], roof: [0xa0432f] }, // 8: the capital (built by capital())
    { wall: [0xe8dcc0, 0xd8c8a8], roof: [0x7a3a1a, 0x5a2a12] },                  // 9 human: timber houses
    { wall: [0xa8844a, 0x9a7a40], roof: [0xd8c070], hut: true },                 // 10 beast: round huts with straw roofs
    { wall: [0x2a1a1e, 0x3a1e22], roof: [0x6a1a3a, 0x4a0a2a], spire: true, tex: 'stone' },     // 11 demon: obsidian with spiked roofs
    { wall: [0x4a2a24, 0x3a2420], roof: [0xa02a1a], spire: true, tex: 'stone' },               // 12 dragon: dark stone, red spires
    { wall: [0x8a6a48, 0x7a5a3a], roof: [0x4a6a3a, 0x5a4a2a], scale: 1.8, tex: 'planks' },      // 13 giant: oversized halls
    { wall: [0x8a8078, 0x7a7068], roof: [0x5a5048], flat: true, chimney: true, tex: 'stone' }, // 14 dwarf: squat stone with forge chimneys
    { wall: [0xf4f2ec, 0xe8e4dc], roof: [0xe8c060], dome: true },                // 15 angel: white marble, golden domes
    { wall: [0xf0ece0, 0xe4e0d4], roof: [0x3fae8a, 0x2f9a7a], spire: true }      // 16 elf: pale walls, teal spires
  ];
  const lit = () => new T.MeshBasicMaterial({ color: 0xffd27a });
  // a small house facing (fx, fz)
  function house(scene, st, i, x, z, y0, fx, fz) {
    const { mat, box, add } = M(), h = new T.Group(), sc = st.scale || 1, wall = st.wall[i % st.wall.length], roof = st.roof[i % st.roof.length];
    const wallM = mat(wall, { map: tex(st.tex || 'plaster', 1, 1) }), roofM = mat(roof, { map: tex('tiles', 3, 2) });
    if (st.hut) {
      add(h, new T.Mesh(new T.CylinderGeometry(2.4, 2.6, 2.6, 12), mat(wall, { map: tex('planks', 3, 1) })), 0, 1.3);
      add(h, new T.Mesh(new T.ConeGeometry(3.2, 2.8, 12), mat(roof, { map: tex('tiles', 4, 2) })), 0, 4);
    } else {
      add(h, box(5.3, 0.45, 4.7, mat(0x7a746a, { map: tex('stone', 2, 1) })), 0, 0.22); // stone footing
      add(h, box(5, 3.2, 4.4, wallM), 0, 1.6);
      if (st.flat) { add(h, box(5.4, 0.4, 4.8, roof), 0, 3.4); if (!st.chimney) add(h, new T.Mesh(new T.SphereGeometry(1.2, 12, 8, 0, P * 2, 0, P / 2), mat(0xf0e0b0)), 0, 3.6); }
      else if (st.dome) { add(h, new T.Mesh(new T.SphereGeometry(2.3, 16, 10, 0, P * 2, 0, P / 2), mat(roof, { emissive: 0x3a2a00 })), 0, 3.2); [-2.2, 2.2].forEach(dx => add(h, new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 3.2, 10), mat(0xffffff)), dx, 1.6, 2.4)); }
      else if (st.spire) add(h, new T.Mesh(new T.ConeGeometry(3.6, 5, 6), mat(roof, { flatShading: true, map: tex('tiles', 4, 3) })), 0, 5.7);
      else { // gable: a wall-coloured triangle under two overhanging roof slopes
        const gg = new T.CylinderGeometry(2.54, 2.54, 5, 3, 1, false, P / 2); gg.rotateZ(P / 2); gg.scale(1, 0.42, 1);
        add(h, new T.Mesh(gg, wallM), 0, 3.2 + 0.53);
        [-1, 1].forEach(s => { const r = add(h, box(5.7, 0.2, 3.05, roofM), 0, 4.08, s * 1.12); r.rotation.x = s * 0.63; });
      }
      if (st.chimney) { add(h, box(0.8, 2, 0.8, 0x5a5048), 1.6, 4.2, -1); add(h, box(0.5, 0.3, 0.5, new T.MeshBasicMaterial({ color: 0xff8a2a })), 1.6, 5.3, -1); }
    }
    add(h, box(1, 1.8, 0.1, mat(0x5b3a1e, { map: tex('planks', 1, 1) })), 0, 0.9, st.hut ? 2.48 : 2.21);
    if (!st.hut) [-1.5, 1.5].forEach(x => { add(h, box(1, 1, 0.08, 0x3a2a1a), x, 2, 2.2); add(h, box(0.8, 0.8, 0.1, lit()), x, 2, 2.21); add(h, box(1.1, 0.1, 0.25, 0x6a5a4a), x, 1.45, 2.27); }); // framed windows with sills
    h.scale.setScalar(sc); h.position.set(x, y0, z); h.lookAt(fx, y0, fz); scene.add(h);
    TR.addCol(x, z, 3.3 * sc);
  }
  // round stone tower with a battlement ring and a cone roof
  // local = placed inside a group (no ground lookup, the group's own colliders cover it)
  function tower(scene, x, z, y0, r, h, color, roof, local) {
    const { mat, add } = M(), y = local ? y0 : Math.max(y0, TR.height(x, z));
    add(scene, new T.Mesh(new T.CylinderGeometry(r, r * 1.1, h, 12), mat(color, { map: tex('stone', 3, Math.round(h / 3)) })), x, y + h / 2, z);
    add(scene, new T.Mesh(new T.CylinderGeometry(r * 1.18, r * 1.18, 1.1, 12), mat(color, { map: tex('stone', 3, 1) })), x, y + h + 0.55, z);
    add(scene, new T.Mesh(new T.ConeGeometry(r * 1.3, r * 1.7, 12), mat(roof, { flatShading: true, map: tex('tiles', 4, 2) })), x, y + h + 1.1 + r * 0.85, z);
    add(scene, new T.Mesh(new T.BoxGeometry(0.7, 1.2, 0.15), lit()), x, y + h * 0.7, z + r * 1.02);
    if (!local) TR.addCol(x, z, r + 0.3);
  }
  function flag(scene, x, y, z) {
    const { mat, add } = M();
    add(scene, new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 3, 6), mat(0x4a3a2a)), x, y, z);
    add(scene, new T.Mesh(new T.PlaneGeometry(1.6, 1), mat(0xc0302a, { side: T.DoubleSide })), x + 0.8, y + 1, z);
  }
  // ring wall with gate gaps (angles) and towers (angles)
  function wallRing(scene, cx, cz, y0, R, gates, towerAs, color, roof) {
    const { mat, box, add } = M(), segs = Math.max(12, Math.round(P * 2 * R / 7)), len = P * 2 * R / segs, stone = mat(color, { map: tex('stone', 2, 2) }), merl = [];
    const gap = a => gates.some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 4.5 / R);
    for (let i = 0; i < segs; i++) {
      const a = (i + 0.5) / segs * P * 2; if (gap(a)) continue;
      const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R, y = Math.max(y0, TR.height(x, z)), tx = -Math.sin(a), tz = Math.cos(a);
      add(scene, box(len + 0.5, 6, 1.8, stone), x, y + 3, z).rotation.y = -a - P / 2;
      for (let k = -1; k <= 1; k++) merl.push([x + tx * k * len / 3, y + 6.5, z + tz * k * len / 3, -a - P / 2]);
      for (let s = -len / 2; s <= len / 2; s += 2.4) TR.addCol(x + tx * s, z + tz * s, 1.3);
    }
    inst(scene, new T.BoxGeometry(1.2, 1, 1.9), stone, merl, (d, m) => { d.position.set(m[0], m[1], m[2]); d.rotation.y = m[3]; });
    for (const g of gates) add(scene, box(10, 1.6, 2, stone), cx + Math.cos(g) * R, y0 + 6.6, cz + Math.sin(g) * R).rotation.y = -g - P / 2; // arch over each gate
    for (const a of towerAs) tower(scene, cx + Math.cos(a) * R, cz + Math.sin(a) * R, y0, 3, 10, color, roof);
  }
  // collision circles covering a w×d rectangle placed by an object's transform
  function colRect(obj, w, d, r) {
    obj.updateMatrixWorld(true); const v = new T.Vector3();
    for (let x = -w / 2 + r; x <= w / 2 - r + 0.01; x += r * 1.4) for (let z = -d / 2 + r; z <= d / 2 - r + 0.01; z += r * 1.4) { v.set(x, 0, z); obj.localToWorld(v); TR.addCol(v.x, v.z, r); }
  }

  // the capital: walls, eight towers, two gates, a castle, the adventurers' guild, market and houses
  function capital(scene, tw) {
    const { mat, box, add } = M(), cx = tw.x, cz = tw.z, y0 = TR.height(cx, cz), stone = 0xc8c0b0, blue = 0x3f5f9a;
    const flatOn = (g, y) => { g.rotateX(-P / 2); return g; };
    add(scene, new T.Mesh(flatOn(new T.CircleGeometry(20, 36)), mat(0xb0a898)), cx, y0 + 0.04, cz);
    [[0, 20, 54], [P, 20, 54], [-P / 2, 20, 27]].forEach(([a, r0, r1]) => { // cobbled roads to the gates and the castle
      const road = add(scene, new T.Mesh(flatOn(new T.PlaneGeometry(6, r1 - r0)), mat(0xa09888)), cx + Math.cos(a) * (r0 + r1) / 2, y0 + 0.035, cz + Math.sin(a) * (r0 + r1) / 2);
      road.rotation.y = P / 2 - a;
    });
    wallRing(scene, cx, cz, y0, 54, [0, P], [P / 4, 3 * P / 4, -P / 4, -3 * P / 4, P / 2, -P / 2, 0.21, -0.21, P - 0.21, P + 0.21], stone, blue);
    // castle on the north side, its door facing the plaza
    const k = new T.Group(); k.position.set(cx, y0, cz - 35); scene.add(k);
    const stoneM = mat(stone, { map: tex('stone', 4, 3) });
    add(k, box(22, 12, 14, stoneM), 0, 6);
    add(k, box(8, 9, 3, stoneM), 0, 4.5, 7.5);
    add(k, box(3.6, 5, 0.2, 0x4a2a14), 0, 2.5, 9.05);
    add(k, box(9, 22, 9, stoneM), 0, 11, -1);
    add(k, new T.Mesh(new T.ConeGeometry(7.2, 6, 4), mat(blue, { flatShading: true })), 0, 25, -1).rotation.y = P / 4;
    [[-11, -7], [11, -7], [-11, 7], [11, 7]].forEach(([x, z]) => tower(k, x, z, 0, 2.6, 17, stone, blue, true));
    [-6, 6].forEach(x => { add(k, new T.Mesh(new T.PlaneGeometry(2, 5), mat(0xb02a2a, { side: T.DoubleSide })), x, 8, 7.05); add(k, box(2, 0.3, 0.05, 0xe0b040), x, 7, 7.1); });
    const mk = []; for (let x = -10.5; x <= 10.5; x += 2) mk.push([x, 12.5, 7], [x, 12.5, -7]); for (let z = -6; z <= 6; z += 2) mk.push([-11, 12.5, z], [11, 12.5, z]);
    mk.forEach(([x, y, z]) => add(k, box(1, 1, 1, stone), x, y, z));
    flag(k, 0, 29.5, -1);
    colRect(k, 27, 20, 2.4); // hall, keep and corner towers
    TR.PLACES.push({ kind: 'castle', x: cx, z: cz - 35 + 11.5 });
    // the adventurers' guild hall, west of the plaza
    const g = new T.Group(); g.position.set(cx - 30, y0, cz + 10); g.lookAt(cx, y0, cz); scene.add(g);
    add(g, box(14.4, 1.2, 10.4, 0x9a9a92), 0, 0.6);
    add(g, box(14, 6, 10, mat(0x8a6a48, { map: tex('planks', 2, 2) })), 0, 4);
    [-1, 1].forEach(s => { const r = add(g, box(14.8, 0.35, 6.6, mat(0x6a3a2a, { map: tex('tiles', 5, 2) })), 0, 8.6, s * 2.5); r.rotation.x = s * 0.6; });
    add(g, box(2.6, 3.8, 0.2, 0x4a2a14), 0, 1.9, 5.1);
    add(g, box(5.4, 1.8, 0.25, 0x5a3a20), 0, 6.1, 5.2);
    [-0.7, 0.7].forEach(r => add(g, box(0.22, 1.9, 0.08, 0xd8dce0), 0, 6.1, 5.36).rotation.z = r); // crossed swords
    add(g, new T.Mesh(new T.CircleGeometry(0.55, 16), mat(0xb02a2a)), 0, 6.1, 5.42);
    [-5.5, 5.5].forEach(x => add(g, new T.Mesh(new T.PlaneGeometry(1.6, 3.6), mat(0x2f4f8a, { side: T.DoubleSide })), x, 4.4, 5.06));
    [-4, -2, 2, 4].forEach(x => add(g, box(1, 1.2, 0.1, lit()), x, 4.6, 5.06));
    colRect(g, 14.4, 10.4, 2.2);
    const door = new T.Vector3(0, 0, 7.5); g.localToWorld(door); TR.PLACES.push({ kind: 'guild', x: door.x, z: door.z });
    // market stalls around the fountain
    [0xb03a2a, 0x2f5f9a, 0xd0a030, 0x3f8a4a].forEach((c, i) => {
      const a = P / 4 + i * P / 2, st = new T.Group(); st.position.set(cx + Math.cos(a) * 13, y0, cz + Math.sin(a) * 13); st.lookAt(cx, y0, cz); scene.add(st);
      [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]].forEach(([x, z]) => add(st, box(0.15, 2.4, 0.15, 0x5a3e2a), x, 1.2, z));
      add(st, box(3.4, 0.2, 2.4, c), 0, 2.5); add(st, box(3, 0.9, 1, 0x8a6a48), 0, 0.45, 0.6);
      [-0.8, 0, 0.8].forEach((x, j) => add(st, box(0.5, 0.35, 0.5, [0xe05030, 0xf0d050, 0x60a040][j]), x, 1.07, 0.6));
      TR.addCol(st.position.x, st.position.z, 1.8);
    });
    // street lamps (glowing lanterns, no extra lights)
    for (let i = 0; i < 8; i++) { const a = i / 8 * P * 2 + P / 8, x = cx + Math.cos(a) * 22, z = cz + Math.sin(a) * 22;
      add(scene, new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 3.6, 6), mat(0x2a2a2a)), x, y0 + 1.8, z); add(scene, new T.Mesh(new T.SphereGeometry(0.32, 10, 8), lit()), x, y0 + 3.7, z); }
    // houses on the ring between the plaza and the walls, leaving the gates, the castle and the guild clear
    const st = STYLES[0], guildA = Math.atan2(10, -30), clear = (a, b, w) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < w;
    let i = 0;
    for (const r of [38, 46]) for (let j = 0; j < (r === 38 ? 16 : 20); j++) {
      const a = j / (r === 38 ? 16 : 20) * P * 2 + (r === 46 ? 0.16 : 0);
      if (clear(a, 0, 0.32) || clear(a, P, 0.32) || clear(a, -P / 2, r === 38 ? 0.7 : 0.55) || clear(a, guildA, 0.42)) continue;
      house(scene, st, i++, cx + Math.cos(a) * r, cz + Math.sin(a) * r, y0, cx, cz);
    }
  }

  // teleport stone: an obelisk with a floating crystal; travellers arrive between it and the fountain
  function warpStone(scene, tw, a, y0) {
    const { mat, add } = M(), x = tw.x + Math.cos(a) * 8, z = tw.z + Math.sin(a) * 8, g = new T.Group(); g.position.set(x, y0, z); scene.add(g);
    add(g, new T.Mesh(new T.CylinderGeometry(1.7, 1.9, 0.35, 8), mat(0x8a8494)), 0, 0.17);
    add(g, new T.Mesh(new T.CylinderGeometry(0.35, 0.7, 3.6, 4), mat(0x4a4660, { flatShading: true })), 0, 2.1).rotation.y = P / 4;
    add(g, new T.Mesh(new T.TorusGeometry(1.45, 0.07, 6, 32), mat(0x7fe0ff, { emissive: 0x3aa0ff })), 0, 0.4).rotation.x = P / 2;
    const gem = add(g, new T.Mesh(new T.OctahedronGeometry(0.55), mat(0x9ff0ff, { emissive: 0x2a9fff, emissiveIntensity: 1.2, flatShading: true })), 0, 4.6);
    TR.warps.push({ gem, town: tw, ax: tw.x + Math.cos(a) * 5, az: tw.z + Math.sin(a) * 5 });
    TR.PLACES.push({ kind: 'warp', x, z });
    TR.addCol(x, z, 1.3);
  }

  // Seraphel: a marble castle on a cloud-wrapped island floating over the angel realm. Its wall ring keeps you from
  // walking up (or off); a gate of light on the ground lifts you up and one on the deck sets you down.
  function skyCastle(scene, tw, y0) {
    const { mat, box, add } = M(), cx = tw.x, cz = tw.z, R = tw.r, l = hyp(cx, cz), ux = -cx / l, uz = -cz / l; // u: toward the world centre
    const marble = 0xf4f1e8, gold = 0xe8c060, goldM = mat(gold, { emissive: 0x4a3400 }), marbleM = mat(marble, { map: tex('plaster', 2, 2) });
    // the island: a tiled deck on an upside-down crag
    add(scene, new T.Mesh(new T.CylinderGeometry(R + 2, R + 1, 2.4, 48), mat(0xe8e2d4, { map: tex('stone', 14, 1) })), cx, y0 - 1.2, cz);
    add(scene, new T.Mesh(new T.CircleGeometry(R + 2, 48), mat(0xece6d8, { map: tex('stone', 18, 18) })), cx, y0 + 0.02, cz).rotation.x = -P / 2;
    add(scene, new T.Mesh(new T.ConeGeometry(R + 1, R * 0.8, 18), mat(0xb0a898, { flatShading: true, emissive: 0x302c26, map: tex('grain', 4, 4) })), cx, y0 - 2.4 - R * 0.4, cz).rotation.x = P;
    // clouds hugging the rim and drifting under the rock
    const R2 = rng(77), puffs = [];
    for (let i = 0; i < R * 1.6; i++) {
      const a = R2() * P * 2, below = i < R * 0.55, rr = below ? R2() * R : R - 4 + R2() * 20;
      const px = cx + Math.cos(a) * rr, py = y0 - (below ? 14 + R2() * R * 0.55 : 1 + R2() * 6), pz = cz + Math.sin(a) * rr, s = 3 + R2() * 7;
      for (let j = 0; j < 4; j++) puffs.push([px + (R2() - 0.5) * s * 1.6, py + (R2() - 0.3) * s * 0.5, pz + (R2() - 0.5) * s * 1.6, s * (0.6 + R2() * 0.5)]); // a cluster of balls per cloud
    }
    inst(scene, new T.SphereGeometry(1, 14, 10), mat(0xffffff, { transparent: true, opacity: 0.93 }), puffs, (d, p) => { d.position.set(p[0], p[1], p[2]); d.scale.set(p[3], p[3] * 0.75, p[3]); });
    // marble wall with golden-roofed towers round the edge
    wallRing(scene, cx, cz, y0, R - 2, [], [...Array(10).keys()].map(i => i * P / 5 + P / 10), marble, gold);
    // the keep, across the courtyard from the gate: portico, tall rotunda, golden dome, spire and a floating halo
    const ks = R / 42, k = new T.Group(); k.position.set(cx - ux * R * 0.52, y0, cz - uz * R * 0.52); k.lookAt(cx, y0, cz); k.scale.setScalar(ks); scene.add(k); // the biggest keep of all
    add(k, box(22, 12, 14, marbleM), 0, 6);
    add(k, box(5, 7, 0.3, goldM), 0, 3.5, 7.1);
    [-7, -3.5, 3.5, 7].forEach(x => add(k, box(1.2, 2.6, 0.1, lit()), x, 8, 7.06));
    for (let x = -10; x <= 10; x += 4) add(k, new T.Mesh(new T.CylinderGeometry(0.5, 0.6, 10, 14), marbleM), x, 5, 9);
    add(k, box(23, 1, 3.4, marbleM), 0, 10.5, 9);
    add(k, new T.Mesh(new T.CylinderGeometry(5, 6, 22, 24), marbleM), 0, 22, -1);
    add(k, new T.Mesh(new T.SphereGeometry(5.6, 24, 14, 0, P * 2, 0, P / 2), goldM), 0, 33, -1);
    add(k, new T.Mesh(new T.ConeGeometry(0.8, 8, 12), goldM), 0, 41, -1);
    add(k, new T.Mesh(new T.TorusGeometry(3, 0.25, 8, 40), new T.MeshBasicMaterial({ color: 0xffe9a0 })), 0, 46, -1).rotation.x = P / 2;
    [[-11, -7], [11, -7], [-11, 7], [11, 7]].forEach(([x, z]) => tower(k, x, z, 0, 2.6, 18, marble, gold, true));
    const kp = new T.Object3D(); kp.position.copy(k.position); kp.quaternion.copy(k.quaternion); colRect(kp, 26 * ks, 22 * ks, 2.4 * ks); // colliders at full size
    // domed pavilions round the courtyard
    const base = Math.atan2(uz, ux);
    [P / 4, P / 2, 3 * P / 4, -P / 4, -P / 2, -3 * P / 4].forEach(da => {
      const a = base + da, px = cx + Math.cos(a) * R * 0.62, pz = cz + Math.sin(a) * R * 0.62;
      for (let i = 0; i < 6; i++) { const b = i / 6 * P * 2; add(scene, new T.Mesh(new T.CylinderGeometry(0.35, 0.4, 5, 12), marbleM), px + Math.cos(b) * 3, y0 + 2.5, pz + Math.sin(b) * 3); }
      add(scene, new T.Mesh(new T.CylinderGeometry(3.4, 3.6, 0.4, 24), marbleM), px, y0 + 0.2, pz);
      add(scene, new T.Mesh(new T.CylinderGeometry(3.6, 3.6, 0.5, 24), marbleM), px, y0 + 5.2, pz);
      add(scene, new T.Mesh(new T.SphereGeometry(3.5, 24, 12, 0, P * 2, 0, P / 2), goldM), px, y0 + 5.4, pz);
      TR.addCol(px, pz, 3.6);
    });
    // gates of light: a golden ring standing in a marble dais
    const gate = (x, y, z, kind) => {
      const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = Math.atan2(ux, uz); scene.add(g);
      add(g, new T.Mesh(new T.CylinderGeometry(2.2, 2.4, 0.4, 28), marbleM), 0, 0.2);
      add(g, new T.Mesh(new T.TorusGeometry(2.6, 0.22, 8, 40), goldM), 0, 2.9);
      add(g, new T.Mesh(new T.CircleGeometry(2.4, 32), new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false })), 0, 2.9);
      TR.PLACES.push({ kind, x, z });
    };
    const gx = cx + ux * (R + 12), gz = cz + uz * (R + 12), gy = TR.height(gx, gz), dx = cx + ux * (R - 9), dz = cz + uz * (R - 9);
    gate(gx, gy, gz, 'skyup'); gate(dx, y0, dz, 'skydown');
    const beam = add(scene, new T.Mesh(new T.CylinderGeometry(1.6, 1.6, y0 - gy, 20, 1, true), new T.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending })), gx, gy + (y0 - gy) / 2, gz);
    beam.userData.flat = true; // a column of light, no shadow
    const look = Math.atan2(ux, uz); // arrive facing the castle with the camera behind you
    TR.SKYGATES = { top: { x: cx + ux * (R - 13), z: cz + uz * (R - 13), look }, bottom: { x: cx + ux * (R + 17), z: cz + uz * (R + 17), look } };
  }

  // ---------- realm castles ----------
  // a great walled castle: ring wall with a gatehouse toward the world centre, round towers, and a keep with corner towers
  // across the courtyard. Walls and keep reach below ground so slopes never show a gap. Returns the keep and the layout.
  function fortress(scene, o) {
    const { mat, box, add } = M(), l = hyp(o.x, o.z), ux = -o.x / l, uz = -o.z / l, gate = Math.atan2(uz, ux), s = o.scale || 1, y0 = o.y, R = o.R;
    const stoneM = mat(o.stone, { map: tex('stone', 2, 2) }), H = 7 * s, Tk = 2 * s, merl = [], towersAt = [];
    const segs = Math.max(16, Math.round(P * 2 * R / (7 * s))), len = P * 2 * R / segs;
    for (let i = 0; i < segs; i++) {
      const a = (i + 0.5) / segs * P * 2; if (Math.abs(Math.atan2(Math.sin(a - gate), Math.cos(a - gate))) < 5.5 * s / R) continue;
      const x = o.x + Math.cos(a) * R, z = o.z + Math.sin(a) * R, y = Math.max(y0, TR.height(x, z)), tx = -Math.sin(a), tz = Math.cos(a);
      add(scene, box(len + 0.6 * s, H + 6, Tk, stoneM), x, y + H / 2 - 3, z).rotation.y = -a - P / 2;
      for (let k = -1; k <= 1; k++) merl.push([x + tx * k * len / 3, y + H + 0.5 * s, z + tz * k * len / 3, -a - P / 2]);
      for (let q = -len / 2; q <= len / 2; q += 1.4 * Tk) TR.addCol(x + tx * q, z + tz * q, Tk * 0.75);
    }
    inst(scene, new T.BoxGeometry(1.2 * s, s, Tk * 1.05), stoneM, merl, (d, m) => { d.position.set(m[0], m[1], m[2]); d.rotation.y = m[3]; });
    [-1, 1].forEach(k => { const a = gate + k * 6.8 * s / R; tower(scene, o.x + Math.cos(a) * R, o.z + Math.sin(a) * R, y0, 3.2 * s, H * 1.6, o.stone, o.roof); });
    add(scene, box(14 * s, 2.2 * s, Tk * 1.3, stoneM), o.x + Math.cos(gate) * R, y0 + H * 1.1, o.z + Math.sin(gate) * R).rotation.y = -gate - P / 2;
    for (let i = 1; i < o.towers; i++) { const a = gate + i / o.towers * P * 2, x = o.x + Math.cos(a) * R, z = o.z + Math.sin(a) * R; towersAt.push([x, z, a]); tower(scene, x, z, y0, 3 * s, H * 1.5, o.stone, o.roof); }
    // the keep at the back of the courtyard, facing the gate
    const k = new T.Group(); k.position.set(o.x - ux * R * 0.55, y0, o.z - uz * R * 0.55); k.lookAt(o.x, y0, o.z); scene.add(k);
    const kw = 22 * s, kd = 14 * s, kh = 12 * s;
    add(k, box(kw, kh + 6, kd, stoneM), 0, kh / 2 - 3);
    add(k, box(4.5 * s, 6.5 * s, 0.4, mat(o.door || 0x3a2414)), 0, 3.25 * s, kd / 2 + 0.2);
    [-0.32, -0.16, 0.16, 0.32].forEach(f => add(k, box(1.1 * s, 2.4 * s, 0.1, o.glow ? new T.MeshBasicMaterial({ color: o.glow }) : lit()), f * kw, kh * 0.62, kd / 2 + 0.06));
    add(k, new T.Mesh(new T.CylinderGeometry(5 * s, 5.8 * s, 24 * s, 18), stoneM), 0, 12 * s, -kd * 0.12);
    add(k, new T.Mesh(new T.ConeGeometry(6.6 * s, 10 * s, 18), mat(o.roof, { flatShading: true, map: tex('tiles', 5, 3) })), 0, 29 * s, -kd * 0.12);
    [[-kw / 2, -kd / 2], [kw / 2, -kd / 2], [-kw / 2, kd / 2], [kw / 2, kd / 2]].forEach(([x, z]) => tower(k, x, z, 0, 2.7 * s, 17 * s, o.stone, o.roof, true));
    flag(k, 0, 35 * s, -kd * 0.12);
    colRect(k, kw + 3 * s, kd + 3 * s, 2.4 * s);
    return { k, kw, kd, kh, ux, uz, gate, towersAt, s };
  }
  const brazier = (scene, x, z, y, col) => { const { mat, add } = M(); add(scene, new T.Mesh(new T.CylinderGeometry(0.35, 0.5, 2.4, 10), mat(0x2a2424)), x, y + 1.2, z); add(scene, new T.Mesh(new T.CylinderGeometry(0.8, 0.5, 0.5, 12), mat(0x3a3030)), x, y + 2.5, z); add(scene, new T.Mesh(new T.SphereGeometry(0.55, 12, 8), new T.MeshBasicMaterial({ color: col || 0xff7a2a })), x, y + 2.9, z); TR.addCol(x, z, 0.7); };
  // smoke that rises from a chimney (animated in world.js)
  const smokeAt = (scene, x, y, z) => { const puffs = []; for (let i = 0; i < 5; i++) { const m = new T.Mesh(new T.SphereGeometry(1, 10, 8), new T.MeshLambertMaterial({ color: 0x5a5a5e, transparent: true, opacity: 0.5, depthWrite: false })); m.userData.flat = true; scene.add(m); puffs.push(m); } TR.smoke.push({ x, y, z, puffs }); };
  // a bronze gear wheel facing +z (spun in world.js)
  function gear(r, teeth) {
    const { mat, box, add } = M(), g = new T.Group(), bronze = mat(0xc08a3a, { emissive: 0x2a1800 }), iron = mat(0x3a3a42);
    add(g, new T.Mesh(new T.TorusGeometry(r * 0.88, r * 0.14, 8, 32), bronze));
    add(g, new T.Mesh(new T.CylinderGeometry(r * 0.22, r * 0.22, r * 0.4, 16), iron)).rotation.x = P / 2;
    for (let i = 0; i < 3; i++) add(g, box(r * 1.7, r * 0.12, r * 0.12, bronze)).rotation.z = i * P / 3;
    for (let i = 0; i < teeth; i++) { const a = i / teeth * P * 2; add(g, box(r * 0.22, r * 0.2, r * 0.26, bronze), Math.cos(a) * r * 1.06, Math.sin(a) * r * 1.06, 0).rotation.z = a; }
    return g;
  }
  // Durak, the dwarves' forge: an iron castle full of turning gears, smokestacks, pipes and glowing furnaces
  function machineCity(scene, tw, y0) {
    const f = fortress(scene, { x: tw.x, z: tw.z, y: y0, R: tw.r - 4, scale: 1.25, towers: 6, stone: 0x5a5a64, roof: 0xb07a3a, door: 0x8a6a2a, glow: 0xffa040 });
    const { mat, box, add } = M(), iron = mat(0x3e3e46, { map: tex('stone', 1, 3) }), copper = mat(0xb87333, { emissive: 0x2a1200 }), k = f.k, v = new T.Vector3();
    const big = gear(5, 18); big.position.set(-3, f.kh + 4.5, f.kd / 2 + 0.8); k.add(big); TR.gears.push({ m: big, s: 0.0005 });
    const small = gear(3, 11); small.position.set(5.3, f.kh + 1.6, f.kd / 2 + 1.1); k.add(small); TR.gears.push({ m: small, s: -0.00082 });
    [[-8, -3], [0, -5], [8, -3]].forEach(([x, z]) => {
      add(k, new T.Mesh(new T.CylinderGeometry(1.1, 1.4, 16, 14), iron), x, f.kh + 8, z);
      add(k, new T.Mesh(new T.TorusGeometry(1.15, 0.25, 6, 16), copper), x, f.kh + 16, z).rotation.x = P / 2;
      k.updateMatrixWorld(true); v.set(x, f.kh + 17, z); k.localToWorld(v); smokeAt(scene, v.x, v.y, v.z);
    });
    [-1, 1].forEach(sd => { const p = add(k, new T.Mesh(new T.CylinderGeometry(0.6, 0.6, f.kw * 0.9, 12), copper), 0, f.kh * 0.35 + sd * 1.6, f.kd / 2 + 0.7); p.rotation.z = P / 2; }); // pipes along the front
    for (const [x, z, a] of f.towersAt) { const g = gear(1.7, 10); g.position.set(x + Math.cos(a) * 4.1, y0 + 9, z + Math.sin(a) * 4.1); g.rotation.y = P / 2 - a; scene.add(g); TR.gears.push({ m: g, s: 0.0011 * (Math.round(a * 10) % 2 ? 1 : -1) }); }
    // forges round the courtyard: squat iron halls with a glowing furnace mouth and a smoking chimney
    [0.9, 2, -0.9, -2].forEach(da => {
      const a = f.gate + da, x = tw.x + Math.cos(a) * tw.r * 0.5, z = tw.z + Math.sin(a) * tw.r * 0.5, g = new T.Group(); g.position.set(x, y0, z); g.lookAt(tw.x, y0, tw.z); scene.add(g);
      add(g, box(8, 4.5, 6, iron), 0, 2.25); add(g, box(8.6, 0.5, 6.6, copper), 0, 4.75);
      add(g, box(2.6, 2, 0.2, new T.MeshBasicMaterial({ color: 0xff7a1a })), 0, 1.2, 3.05);
      add(g, new T.Mesh(new T.CylinderGeometry(0.7, 0.9, 6, 12), iron), 2.4, 7, -1.4);
      const wg = gear(1.4, 9); wg.position.set(-2.6, 3, 3.2); g.add(wg); TR.gears.push({ m: wg, s: 0.0014 });
      g.updateMatrixWorld(true); v.set(2.4, 10.2, -1.4); g.localToWorld(v); smokeAt(scene, v.x, v.y, v.z);
      colRect(g, 9, 7, 1.8);
    });
  }
  // Lirien, the elves' forest kingdom: a palace grown into a giant tree, a ring of great trees with treehouses, lanterns
  function elfKingdom(scene, tw, y0) {
    const { mat, add } = M(), cx = tw.x, cz = tw.z, R = tw.r, l = hyp(cx, cz), ux = -cx / l, uz = -cz / l, gateA = Math.atan2(uz, ux);
    const bark = mat(0xc8b8a0, { map: tex('grain', 1, 4) }), leaf = mat(0x3fcf9a), leaf2 = mat(0x2fae7a), wood = mat(0xe8dcc0, { map: tex('planks', 2, 1) });
    const glowL = new T.MeshBasicMaterial({ color: 0xbfffe8 }), pod = mat(0xf2eee2), cap = mat(0x3fae8a);
    const crown = (g, y, r) => [[0, 0, 0, 1], [0.75, 0.2, 0.3, 0.75], [-0.65, 0.3, -0.4, 0.72], [0.1, 0.6, 0.1, 0.62], [-0.2, -0.1, 0.75, 0.6], [0.3, 0.05, -0.75, 0.62]]
      .forEach(([x, yy, z, s], i) => add(g, new T.Mesh(blob(r * s), i % 2 ? leaf2 : leaf), x * r, y + yy * r, z * r));
    const house = (g, x, y, z, r) => { add(g, new T.Mesh(new T.CylinderGeometry(r + 1.4, r + 1.4, 0.45, 22), wood), x, y, z); add(g, new T.Mesh(new T.SphereGeometry(r, 18, 12, 0, P * 2, 0, P / 2), pod), x, y + 0.2, z); add(g, new T.Mesh(new T.ConeGeometry(r * 1.1, r * 0.9, 18), cap), x, y + r + 0.5, z); add(g, new T.Mesh(new T.SphereGeometry(0.28, 10, 8), glowL), x + r + 1, y - 0.7, z); };
    // the great tree palace at the back
    const gt = new T.Group(); gt.position.set(cx - ux * R * 0.5, y0, cz - uz * R * 0.5); scene.add(gt);
    add(gt, new T.Mesh(new T.CylinderGeometry(4.2, 7, 46, 20), bark), 0, 23);
    for (let i = 0; i < 7; i++) { const a = i / 7 * P * 2, root = add(gt, new T.Mesh(new T.ConeGeometry(2.2, 10, 8), bark), Math.cos(a) * 6.4, 2.2, Math.sin(a) * 6.4); root.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1); }
    crown(gt, 50, 15); crown(gt, 36, 9);
    [8, 16, 24, 31].forEach((y, i) => { const a = i * 1.75; house(gt, Math.cos(a) * 9, y, Math.sin(a) * 9, 2.8); });
    TR.addCol(gt.position.x, gt.position.z, 8.5);
    // great trees round the kingdom, half of them with a treehouse
    for (let i = 0; i < 12; i++) {
      const a = gateA + (i + 0.5) / 12 * P * 2, x = cx + Math.cos(a) * (R - 3), z = cz + Math.sin(a) * (R - 3), g = new T.Group(); g.position.set(x, TR.height(x, z), z); scene.add(g);
      add(g, new T.Mesh(new T.CylinderGeometry(1.5, 2.6, 28, 14), bark), 0, 14); crown(g, 29, 7);
      if (i % 2 === 0) house(g, 0, 12, 0, 2.2);
      TR.addCol(x, z, 2.9);
    }
    // the gate: a living arch of bark over the path in
    const arch = add(scene, new T.Mesh(new T.TorusGeometry(6.5, 0.9, 10, 28, P), bark), cx + ux * (R - 3), y0, cz + uz * (R - 3)); arch.rotation.y = Math.atan2(ux, uz) + P / 2;
    for (let i = 1; i < 5; i++) { const t = i / 5, x = cx + ux * (R - 3) * t, z = cz + uz * (R - 3) * t; [-1, 1].forEach(sd => { const px = x - uz * sd * 4, pz = z + ux * sd * 4; add(scene, new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 2.8, 6), wood), px, y0 + 1.4, pz); add(scene, new T.Mesh(new T.SphereGeometry(0.3, 10, 8), glowL), px, y0 + 2.9, pz); }); }
  }
  // the dragon's castle on the great peak and the demon lord's on the mountain at the back of its realm
  function realmCastles(scene) {
    const { mat, add } = M();
    const d = KEEPS.dragon, dy = TR.height(d.x, d.z);
    const fd = fortress(scene, { x: d.x, z: d.z, y: dy, R: d.R, scale: 1.3, towers: 6, stone: 0x3a2c28, roof: 0xa02a1a, door: 0x1a1010, glow: 0xff6a2a });
    for (let i = 0; i < 5; i++) { const t = (i + 1) * 9, x = d.x + fd.ux * (d.R + t), z = d.z + fd.uz * (d.R + t), b = add(scene, new T.Mesh(new T.TorusGeometry(5, 0.45, 8, 20, P), mat(0xe8dcc0)), x, TR.height(x, z) - 0.4, z); b.rotation.y = Math.atan2(fd.ux, fd.uz) + P / 2; } // giant ribs along the climb
    for (let i = 0; i < 6; i++) { const a = fd.gate + (i - 2.5) * 0.45, x = d.x + Math.cos(a) * d.R * 0.55, z = d.z + Math.sin(a) * d.R * 0.55; brazier(scene, x, z, dy, 0xff6a1a); }
    const m = KEEPS.demon, my = TR.height(m.x, m.z);
    const fm = fortress(scene, { x: m.x, z: m.z, y: my, R: m.R, scale: 1.6, towers: 10, stone: 0x2a1c20, roof: 0x6a1a2a, door: 0x1a0808, glow: 0xff3a2a });
    const obsidian = mat(0x1a1218, { flatShading: true });
    for (let i = 0; i < 30; i++) { const a = i / 30 * P * 2; if (Math.abs(Math.atan2(Math.sin(a - fm.gate), Math.cos(a - fm.gate))) < 0.3) continue; const x = m.x + Math.cos(a) * (m.R + 6), z = m.z + Math.sin(a) * (m.R + 6), sp = add(scene, new T.Mesh(new T.ConeGeometry(1.2, 9 + (i % 3) * 3, 6), obsidian), x, TR.height(x, z) + 4, z); sp.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); TR.addCol(x, z, 1.1); }
    for (let i = 0; i < 8; i++) { const a = fm.gate + (i - 3.5) * 0.36, x = m.x + Math.cos(a) * m.R * 0.6, z = m.z + Math.sin(a) * m.R * 0.6; brazier(scene, x, z, my, 0xff3a1a); }
    [-1, 1].forEach(sd => add(fm.k, new T.Mesh(new T.PlaneGeometry(3.4, 9), mat(0x8a1010, { side: T.DoubleSide })), sd * fm.kw * 0.42, fm.kh * 0.55, fm.kd / 2 + 0.3)); // banners
    const glow = new T.PointLight(0xff4a2a, 1.3, 70); glow.position.set(m.x, my + 8, m.z); scene.add(glow);
  }

  // ---------- walls of light where an area still needs a higher level (world.js shows them only while that is true) ----------
  TR.barrierMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: { time: { value: 0 } },
    vertexShader: 'varying float vD; varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float time; varying float vD; varying vec3 vW; void main() { float b = 0.5 + 0.5 * sin(vW.y * 1.3 - time * 2.5); float s = 0.6 + 0.4 * sin((vW.x + vW.z) * 1.7 + time * 1.5);'
      + ' float a = (0.1 + 0.35 * b * s) * (1.0 - smoothstep(18.0, 60.0, vW.y)) * (1.0 - smoothstep(60.0, 170.0, vD)); gl_FragColor = vec4(vec3(0.45, 0.8, 1.0) * (0.7 + 0.6 * b), a); }' });
  function barriers(scene) {
    const wall = (g, x, z, ry, need) => { const m = new T.Mesh(g, TR.barrierMat); m.position.set(x, 20, z); m.rotation.y = ry; m.renderOrder = 3; m.userData.flat = true; scene.add(m); TR.barriers.push({ m, need }); };
    const arc = (r, a0, a1, need) => wall(new T.CylinderGeometry(r, r, 80, Math.max(12, Math.round((a1 - a0) * r / 5)), 1, true, P / 2 - a1, a1 - a0), 0, 0, 0, need);
    const radial = (a, r0, r1, need) => wall(new T.PlaneGeometry(r1 - r0, 80), Math.cos(a) * (r0 + r1) / 2, Math.sin(a) * (r0 + r1) / 2, -a, need);
    arc(200, 0, P * 2, AREA_LV.inner);
    REALMS.forEach((rl, i) => { const a = i * P / 4, nb = REALMS[(i + 1) % 8]; arc(492, a - P / 8, a + P / 8, AREA_LV[rl]); if (AREA_LV[nb] !== AREA_LV[rl]) radial(a + P / 8, 492, 800, Math.max(AREA_LV[rl], AREA_LV[nb])); });
    FRONTIER.forEach((fl, k) => { const a = k * P * 2 / 5, nb = FRONTIER[(k + 1) % 5]; arc(800, a - P / 5, a + P / 5, AREA_LV[fl]); const b = a + P / 5; radial(b, 800, Math.min(1400, (TR.HALF - 15) / Math.max(Math.abs(Math.cos(b)), Math.abs(Math.sin(b)))), Math.max(AREA_LV[fl], AREA_LV[nb])); });
    wall(new T.CylinderGeometry(ISLE.r + 50, ISLE.r + 50, 80, 72, 1, true), ISLE.x, ISLE.z, 0, AREA_LV.diamond);
  }
  // floating islands high over the land: grassy tops on upturned crags with trees or crystals, some pouring a waterfall that
  // thins to mist in mid-air. They never move, so each kind of part is merged into one mesh
  function skyIsles(scene, q) {
    const R = rng(41), { mat, add } = M(), parts = { rock: [], grass: [], trunk: [], crown: [], crys: [] }, spots = [];
    TR.SKYISLES = []; TR.skyChests = []; // tops a flyer can land on (world.js), and the chest waiting on each
    const cv = document.createElement('canvas'), c = cv.getContext('2d'); cv.width = 32; cv.height = 128; // falling streaks, fading out downward
    for (let x = 0; x < 32; x++) { const v = 205 + R() * 50 | 0, g = c.createLinearGradient(0, 0, 0, 128); c.globalAlpha = Math.min(1, 0.25 + Math.min(x, 31 - x) / 5);
      g.addColorStop(0, 'rgba(' + v + ',' + v + ',255,0.9)'); g.addColorStop(0.5, 'rgba(' + v + ',' + v + ',255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, 0, 1, 128); }
    const fall = new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), color: 0xd8f2ff, transparent: true, depthWrite: false, side: T.DoubleSide, fog: false });
    for (let i = 0; spots.length < (q < 1 ? 10 : 18) && i < 600; i++) {
      const a = R() * P * 2, d = 110 + R() * 1000, x = Math.cos(a) * d, z = Math.sin(a) * d, r = 7 + R() * 11;
      if (spots.some(s => hyp(s[0] - x, s[1] - z) < 170) || TR.SKY && hyp(x - TR.SKY.x, z - TR.SKY.z) < 190) continue; // spread out, clear of the sky castle
      spots.push([x, z]);
      const y = Math.max(0, TR.height(x, z)) + 70 + R() * 45;
      TR.SKYISLES.push({ x, z, r, top: y + 1.2 }); TR.skyChests.push(chestAt(scene, x + r * 0.35, y + 1.2, z - r * 0.2, 's' + spots.length));
      parts.grass.push([new T.CylinderGeometry(r, r * 0.9, 2.4, 12), x, y, z]);
      parts.rock.push([new T.ConeGeometry(r * 0.92, r * 1.6, 9).rotateX(P), x, y - 1.2 - r * 0.8, z]);
      for (let k = 0; k < 2; k++) { const b = R() * P * 2, rr = r * (0.4 + R() * 0.3), s = 1.5 + R() * 2; parts.rock.push([new T.ConeGeometry(s, s * 3, 7).rotateX(P), x + Math.cos(b) * rr, y - 2 - s * 1.5 - r * 0.3, z + Math.sin(b) * rr]); }
      const crystal = R() < 0.3;
      for (let k = 0, n = 1 + Math.floor(r / 5); k < n; k++) {
        const b = R() * P * 2, rr = R() * r * 0.65, tx = x + Math.cos(b) * rr, tz = z + Math.sin(b) * rr;
        if (crystal) parts.crys.push([new T.OctahedronGeometry(1 + R()).scale(1, 2, 1), tx, y + 3, tz]);
        else { parts.trunk.push([new T.CylinderGeometry(0.3, 0.45, 3, 7), tx, y + 2.6, tz]); parts.crown.push([blob(1.6 + R() * 0.8), tx, y + 5, tz]); }
      }
      if (R() < 0.55) { const b = R() * P * 2, w = add(scene, new T.Mesh(new T.PlaneGeometry(2.6, 60), fall), x + Math.cos(b) * (r - 0.3), y - 29.2, z + Math.sin(b) * (r - 0.3)); w.rotation.y = P / 2 - b; w.userData.flat = true; } // over the rim
    }
    [['rock', 0x8a7f74], ['grass', 0x5f9f48], ['trunk', 0x6b4a2a], ['crown', 0x4f8f3a], ['crys', 0x9fe8ff]].forEach(([k, col]) => {
      if (parts[k].length) add(scene, new T.Mesh(merge(parts[k]), k === 'crys' ? mat(col, { emissive: 0x2a6a8a, transparent: true, opacity: 0.9, fog: false }) : mat(col, { flatShading: true, fog: false }))); // the haze would wash them out to pale ghosts
    });
  }
  // the Diamond Island's landmark: a great diamond standing on its point on the hilltop, seen from the far shore
  function diamondIsle(scene) {
    const { mat, add } = M(), y = TR.height(ISLE.x, ISLE.z);
    add(scene, new T.Mesh(new T.OctahedronGeometry(7), mat(0xeafcff, { emissive: 0x3a7a8a, flatShading: true, transparent: true, opacity: 0.9 })), ISLE.x, y + 10, ISLE.z).scale.y = 1.5;
    TR.addCol(ISLE.x, ISLE.z, 5.5);
  }
  // ---------- the dungeon: a gate near the village, and the hall it leads to ----------
  function dungeonGate(scene) {
    const { mat, box, add } = M(), k = KEEPS.dgate, y = TR.height(k.x, k.z), stone = mat(0x6a6470, { map: tex('stone', 2, 2) }), g = new T.Group(), v = new T.Vector3();
    g.position.set(k.x, y, k.z); g.lookAt(0, y, 0); scene.add(g); // facing the village
    [-1, 1].forEach(s => { add(g, box(1.8, 8, 1.8, stone), s * 3.4, 4, 0); add(g, new T.Mesh(new T.SphereGeometry(0.4, 10, 8), new T.MeshBasicMaterial({ color: 0xc07aff })), s * 3.4, 8.5, 0); });
    add(g, box(9, 1.5, 2, stone), 0, 8.2, 0); add(g, box(9.4, 0.5, 4, stone), 0, 0.25, 0.6);
    add(g, new T.Mesh(new T.PlaneGeometry(5, 7.4), new T.MeshBasicMaterial({ color: 0x5a2a9a, transparent: true, opacity: 0.8, side: T.DoubleSide })), 0, 3.9, 0);
    g.updateMatrixWorld(true); [-1, 1].forEach(s => { v.set(s * 3.4, 0, 0); g.localToWorld(v); TR.addCol(v.x, v.z, 1.3); });
    v.set(0, 0, 5); g.localToWorld(v); DUN.gate = { x: v.x, z: v.z, look: Math.atan2(-k.x, -k.z) + Math.PI }; // where you come back out, facing away from the gate
    TR.PLACES.push({ kind: 'dungeon', x: k.x, z: k.z });
  }
  // a long vaulted hall of dark stone with pillars and torches; the way out at the south end, the way down at the north
  function dungeonHall(world) {
    const scene = DUN.hall = new T.Group(); world.add(scene); // shown only while the hero is inside (world.js)
    const { mat, box, add } = M(), D = DUN, stone = mat(0x4a4450, { map: tex('stone', 6, 2) }), torch = new T.MeshBasicMaterial({ color: 0xff9a3a });
    add(scene, box(D.w + 4, 2, D.d + 4, mat(0x3a3640, { map: tex('stone', 10, 14) })), D.x, D.y - 1, D.z);
    add(scene, box(D.w + 4, 1.5, D.d + 4, mat(0x2a2630)), D.x, D.y + 16.75, D.z);
    [-1, 1].forEach(s => { add(scene, box(D.w + 4, 17, 2, stone), D.x, D.y + 8, D.z + s * (D.d / 2 + 1)); add(scene, box(2, 17, D.d + 4, stone), D.x + s * (D.w / 2 + 1), D.y + 8, D.z); });
    for (let q = -D.d / 2; q <= D.d / 2; q += 2.2) [-1, 1].forEach(s => TR.addCol(D.x + s * (D.w / 2 + 0.6), D.z + q, 1.2));
    for (let q = -D.w / 2; q <= D.w / 2; q += 2.2) [-1, 1].forEach(s => TR.addCol(D.x + q, D.z + s * (D.d / 2 + 0.6), 1.2));
    for (let z = -D.d / 2 + 12; z < D.d / 2 - 8; z += 14) [-1, 1].forEach(s => {
      const x = D.x + s * (D.w / 2 - 9);
      add(scene, new T.Mesh(new T.CylinderGeometry(1.2, 1.5, 16, 12), stone), x, D.y + 8, D.z + z); TR.addCol(x, D.z + z, 1.7);
      add(scene, new T.Mesh(new T.SphereGeometry(0.42, 10, 8), torch), x - s * 1.6, D.y + 5, D.z + z);
    });
    [-1, 1].forEach(s => { const l = new T.PointLight(0xff9a4a, 1.3, 70); l.position.set(D.x, D.y + 11, D.z + s * D.d / 4); world.add(l); }); // lights stay on, so materials never recompile
    const portal = (z, col) => { const g = new T.Group(); g.position.set(D.x, D.y, z); scene.add(g); add(g, new T.Mesh(new T.TorusGeometry(2.7, 0.32, 8, 32), mat(0x6a6070)), 0, 3.1); add(g, new T.Mesh(new T.CircleGeometry(2.5, 32), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.65, side: T.DoubleSide })), 0, 3.1); return g; };
    portal(D.z + D.d / 2 - 2.5, 0x6fb8ff); TR.PLACES.push({ kind: 'dexit', x: D.x, z: D.z + D.d / 2 - 3 });
    D.next = portal(D.z - D.d / 2 + 2.5, 0xb06cff); D.next.visible = false; TR.PLACES.push({ kind: 'dnext', x: D.x, z: D.z - D.d / 2 + 3 });
    D.start = { x: D.x, z: D.z + D.d / 2 - 22 }; // far enough in that the camera behind you stays inside the hall
  }

  function towns(scene) {
    const { mat, box, add } = M();
    for (const tw of TOWNS) {
      const st = STYLES[tw.style] || STYLES[0], y0 = tw.sky ? TR.SKY.y : TR.height(tw.x, tw.z);
      if (tw.city) capital(scene, tw);
      if (tw.sky) skyCastle(scene, tw, y0);
      if (tw.build === 'giant') fortress(scene, { x: tw.x, z: tw.z, y: y0, R: tw.r - 4, scale: 2.2, towers: 8, stone: 0x8a7a68, roof: 0x4a6a3a });
      if (tw.build === 'machine') machineCity(scene, tw, y0);
      if (tw.build === 'elf') elfKingdom(scene, tw, y0);
      for (let i = 0; i < tw.houses; i++) {
        const a = i / tw.houses * P * 2 + 0.3;
        house(scene, st, i, tw.x + Math.cos(a) * tw.r * 0.55, tw.z + Math.sin(a) * tw.r * 0.55, y0, tw.x, tw.z);
      }
      if (tw.walls) { const g = Math.atan2(-tw.z, -tw.x); wallRing(scene, tw.x, tw.z, y0, tw.r - 2, [g], [g + P / 4, g - P / 4, g + 3 * P / 4, g - 3 * P / 4], st.wall[0], st.roof[0]); }
      add(scene, new T.Mesh(new T.CylinderGeometry(3.2, 3.6, 0.8, 20), mat(tw.style === 3 ? 0xd8e0e6 : 0xb9b2a4)), tw.x, y0 + 0.4, tw.z);
      const spring = add(scene, new T.Mesh(new T.CylinderGeometry(2.8, 2.8, 0.2, 20), new T.MeshPhongMaterial({ color: 0x3f9fd0, emissive: 0x0e4a66, specular: 0xffffff, shininess: 90, normalMap: tex('waves', 1, 1) })), tw.x, y0 + 0.75, tw.z);
      TR.springs.push({ mesh: spring, x: tw.x, z: tw.z, town: tw });
      warpStone(scene, tw, tw.houses ? 0.3 + P / tw.houses : P / 2, y0); // south of the capital's fountain, else in the gap between the first two houses
      const pl = new T.PointLight(0xffd59a, 1.1, 30); pl.position.set(tw.x, y0 + 4, tw.z); scene.add(pl);
      TR.addCol(tw.x, tw.z, 3.4);
    }
  }

  // wooden piers out into the lake; the ship waits at the far end
  function docks(scene) {
    const { mat, box, add } = M();
    for (const d of TR.DOCKS) {
      const dx = d.x1 - d.x0, dz = d.z1 - d.z0, len = hyp(dx, dz) - 3.5, pier = new T.Group();
      d.ang = Math.atan2(dx, dz);
      for (let s = 0, n = 0; s < len; s += 2.1, n++) {
        add(pier, box(2.6, 0.25, 2, 0x8a6a48), 0, 0, s);
        if (n % 2 === 0) [-1.2, 1.2].forEach(x => add(pier, new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 3, 6), mat(0x5a3e2a)), x, -1.2, s));
      }
      pier.position.set(d.x0, TR.WATER + 0.45, d.z0); pier.rotation.y = d.ang; scene.add(pier);
      const lamp = add(scene, new T.Mesh(new T.SphereGeometry(0.3, 10, 8), lit()), d.x0 + Math.sin(d.ang) * len, TR.WATER + 2.4, d.z0 + Math.cos(d.ang) * len);
    }
  }
  // boss lairs: a ring of standing stones around a glowing rune circle
  function lairMarks(scene) {
    const { mat, add } = M();
    for (const l of TR.LAIRS) {
      if (ENEMIES[l.type].water) continue;
      const rune = add(scene, new T.Mesh(new T.RingGeometry(5, 6.2, 32), new T.MeshBasicMaterial({ color: 0xb06cff, transparent: true, opacity: 0.7, side: T.DoubleSide })), l.x, TR.height(l.x, l.z) + 0.12, l.z);
      rune.rotation.x = -P / 2;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * P * 2, x = l.x + Math.cos(a) * 10, z = l.z + Math.sin(a) * 10;
        add(scene, new T.Mesh(new T.BoxGeometry(1.1, 3.2, 0.7), mat(0x6a6670, { flatShading: true })), x, TR.height(x, z) + 1.4, z).rotation.y = -a;
        TR.addCol(x, z, 0.8);
      }
    }
  }

  const chestAt = (scene, x, y, z, id) => { const { box, add } = M(), c = new T.Group(); add(c, box(1.2, 0.8, 0.8, 0x8b5a2b), 0, 0.4); add(c, box(1.25, 0.25, 0.85, 0xc9a13b), 0, 0.9); c.position.set(x, y, z); c.userData.id = id; scene.add(c); return c; };
  function chests(scene) {
    const R = rng(99), list = [];
    for (let i = 0; list.length < 200 && i < 24000; i++) {
      const x = (R() - 0.5) * 2320, z = (R() - 0.5) * 2320, b = TR.biomeAt(x, z);
      if (hyp(x, z) > 1160) continue;
      if (b === 'town' || b === 'water' || TR.keepAt(x, z)) continue;
      const y = TR.height(x, z);
      if (y < TR.liquidY(TR.liquid(x, z)) + 0.2 || y > 18) continue;
      list.push(chestAt(scene, x, y, z, 'c' + list.length));
    }
    return list;
  }
})();
