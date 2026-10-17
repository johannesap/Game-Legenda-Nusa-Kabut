// 3D open world: scene, day/night sky, hero movement (walls, water walking, jumping), roaming monsters,
// camera and input, and the battle stage. The map itself lives in terrain.js, models in models.js.
(function () {
  const T = THREE, TR = Terrain, P = Math.PI, hyp = Math.hypot, smooth = TR.smooth;
  const W = window.World = { paused: true, grace: 0, onEncounter: null, onChest: null, onSpring: null, onStep: null, onArea: null, onBurn: null, enemies: [] };
  W.height = TR.height; W.ground = TR.ground;
  W.buildHero = Models.hero; W.buildEnemy = Models.enemy;
  const animateWalk = W.animateWalk = Models.walk;
  const clampW = v => Math.max(-TR.HALF, Math.min(TR.HALF, v));
  // deep water means swimming (body at the surface, slower, no jumping); shallower water is waded through
  W.stance = (x, z) => {
    if (TR.skyAt(x, z)) return { y: TR.SKY.y, swim: false };
    if (TR.dungeonAt(x, z)) return { y: TR.DUNGEON.y, swim: false };
    const h = TR.height(x, z), liq = TR.liquid(x, z);
    return liq === 'water' && h < TR.WATER - 1.25 ? { y: TR.WATER, swim: true } : { y: Math.max(h, TR.liquidY(liq)), swim: false };
  };
  W.swimY = (st, moving) => st.y + (moving ? -0.45 : -1.75); // crawl flat at the surface, or tread water head-up
  W.swimPose = function (g, moving, dt) {
    const u = g.userData; u.t += dt * (moving ? 7 : 3);
    g.rotation.order = 'YXZ'; g.rotation.x = moving ? 1.3 : 0.15;
    if (moving) { u.arms[0].rotation.x = -(u.t % (P * 2)); u.arms[1].rotation.x = -((u.t + P) % (P * 2)); const k = Math.sin(u.t * 3) * 0.35; u.legs[0].rotation.x = k; u.legs[1].rotation.x = -k; }
    else { const k = Math.sin(u.t) * 0.4; u.arms[0].rotation.x = -0.7 + k; u.arms[1].rotation.x = -0.7 - k; u.legs[0].rotation.x = k * 0.5; u.legs[1].rotation.x = -k * 0.5; }
  };

  // ---------- game clock: one real second is one game minute, the same for every player ----------
  W.clock = () => {
    const mins = (Date.now() / 1000) % 1440, h = Math.floor(mins / 60);
    const phase = h < 5 ? 'night' : h < 7 ? 'dawn' : h < 11 ? 'morning' : h < 15 ? 'noon' : h < 18 ? 'afternoon' : h < 19 ? 'dusk' : 'night';
    return { mins, h, m: Math.floor(mins % 60), phase };
  };
  const SKY = [[0, 0x0a0f1e], [4.5, 0x111a33], [5.5, 0x5a4a78], [6.3, 0xf0a878], [7.5, 0xa8d4ef], [12, 0x8ec9f2], [15.5, 0xa6cfe6],
    [17.3, 0xf2b070], [18.3, 0xb85a78], [19.2, 0x2a2448], [20.2, 0x0e1426], [24, 0x0a0f1e]].map(([h, c]) => [h, new T.Color(c)]);
  const skyColor = (hr, out) => { for (let i = 1; i < SKY.length; i++) if (hr <= SKY[i][0]) return out.copy(SKY[i - 1][1]).lerp(SKY[i][1], (hr - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0])); return out.copy(SKY[0][1]); };

  // ---------- scene ----------
  let renderer, scene, cam, sun, hemi, terrain, player, chests = [], yaw = 0.6, pitch = 0.55, dist = 15, target = null, last = 0, snap = true, jumpH = 0, vy = 0, stuck = 0;
  let sky = null, maxEnemies = 24, lastArea = '', areaT = 0, swimming = false, rippleT = 0, lowQ = false, skyK = 1;
  const ripples = [], ships = [], npcs = [];
  let sailing = null, ctxT = 0, talkEl = null, talkNpc = null, talkUntil = 0;
  W.swimming = () => swimming;
  W.sailing = () => !!sailing;
  W.ships = ships; // where each ship is now (the minimap shows them)
  W.context = null; // what the action button does here: board / leave / guild / castle
  W.player = () => player;
  W.yaw = () => yaw; // camera heading, for the minimap
  W.anims = []; // per-frame callbacks (battle effects); return false to finish
  W.jump = () => { if (!W.paused && jumpH === 0 && !swimming) vy = 9; };
  const keys = {}, ray = new T.Raycaster();
  let inSpring = null;

  W.init = function (canvas, quality) {
    try { renderer = new T.WebGLRenderer({ canvas, antialias: quality !== 'low' }); } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'low' ? 1 : 1.5));
    scene = W._scene = new T.Scene();
    cam = W._cam = new T.PerspectiveCamera(55, 1, 0.3, 700);
    lowQ = quality === 'low'; Models.hq = !lowQ; skyK = lowQ ? 0.62 : 1;
    if (lowQ) cam.far = 320; // Saver: things past ~300 m are not drawn (the fog hides the edge; sky objects shrink to fit)
    prMax = pr = Math.min(devicePixelRatio || 1, lowQ ? 1 : 1.5);
    hemi = new T.HemisphereLight(0xffffff, 0x445533, 0.8); scene.add(hemi);
    sun = new T.DirectionalLight(0xfff2d8, 0.7); scene.add(sun, sun.target);
    if (!lowQ) { // soft sun shadows inside a box that follows the hero
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
      Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 10, far: 260 }); sun.shadow.camera.updateProjectionMatrix();
    }
    scene.background = new T.Color(0x8ec9f2); scene.fog = lowQ ? new T.Fog(0x8ec9f2, 50, 240) : new T.Fog(0x8ec9f2, 90, 320);
    const built = TR.build(scene, quality); terrain = built.terrain; chests = built.chests;
    if (!lowQ) scene.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = !o.userData.flat; } }); // ground and liquids only catch shadows
    sky = buildSky(); maxEnemies = lowQ ? 16 : 24;
    TR.DOCKS.forEach(d => { const m = Models.ship(); m.position.set(d.x1, TR.WATER, d.z1); m.rotation.y = d.ang; scene.add(m); ships.push({ mesh: m, heading: d.ang, speed: 0 }); });
    spawnPeople();
    addEventListener('resize', resize); resize();
    bindInput(canvas);
    requestAnimationFrame(loop);
    return true;
  };
  // during a battle the view is shifted so the fighters sit in the upper part, above the battle panel, and left of the skill column
  const stageView = () => { if (W.stage) cam.setViewOffset(innerWidth, innerHeight, Math.min(190, innerWidth * 0.38) / 2 + 8, innerHeight * 0.24, innerWidth, innerHeight); else cam.clearViewOffset(); };
  // adaptive resolution: every 2 s, drop the render scale if the frame rate sags under ~28 fps, raise it again above ~50
  let pr = 1, prMax = 1, prT = 0, prN = 0;
  function adapt(raw) {
    if (raw <= 0 || raw > 0.25) return; // a hidden tab or a hitch, not the real pace
    prT += raw; prN++; if (prT < 2) return;
    const fps = prN / prT, next = Math.max(lowQ ? 0.55 : 0.75, Math.min(prMax, fps < 28 ? pr - 0.15 : fps > 50 ? pr + 0.1 : pr));
    prT = prN = 0;
    if (Math.abs(next - pr) > 0.01) { pr = next; renderer.setPixelRatio(pr); resize(); }
  }
  W.renderScale = () => pr;
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); stageView(); }

  // sun, moon and stars ride with the camera so they always sit on the sky dome
  function buildSky() {
    const basic = (c, o) => new T.MeshBasicMaterial({ color: c, fog: false, transparent: o != null, opacity: o == null ? 1 : o, depthWrite: false });
    // sky dome: deep blue overhead fading to a hazy horizon that matches the fog
    const dome = new T.Mesh(new T.SphereGeometry(470, 24, 14), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false,
      uniforms: { top: { value: new T.Color() }, bottom: { value: new T.Color() } },
      vertexShader: 'varying float h; void main() { h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main() { gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.02, 0.6, h)), 1.0); }' }));
    dome.renderOrder = -2; dome.scale.setScalar(skyK); scene.add(dome);
    const sunM = new T.Mesh(new T.SphereGeometry(16, 20, 14), basic(0xfff4c8)), glow = new T.Mesh(new T.SphereGeometry(30, 20, 14), basic(0xffd890, 0.25));
    sunM.add(glow);
    const moon = new T.Mesh(new T.SphereGeometry(10, 18, 12), basic(0xe8eef8));
    [[3, 2, 9], [-4, -1, 9], [1, -4, 9.2]].forEach(([x, y, z]) => { const c = new T.Mesh(new T.CircleGeometry(1.6, 10), basic(0xc8d0de)); c.position.set(x, y, z); moon.add(c); });
    const R = TR.rng(3), n = 1800, pts = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = R() * P * 2, y = R() * 0.95 + 0.05, r = Math.sqrt(1 - y * y); pts[i * 3] = Math.cos(a) * r * 450; pts[i * 3 + 1] = y * 450; pts[i * 3 + 2] = Math.sin(a) * r * 450; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pts, 3));
    const stars = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
    [sunM, moon, stars].forEach(o => { o.renderOrder = -1; o.scale.setScalar(skyK); scene.add(o); });
    // clouds: puffy clusters drifting with the wind, wrapped around the player; lit by the sun so they color at dusk
    const cn = lowQ ? 16 : 30, clouds = [];
    const cloudMesh = new T.InstancedMesh(new T.IcosahedronGeometry(1, 2), new T.MeshLambertMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.9 }), cn * 5);
    for (let i = 0; i < cn; i++) {
      const c = { x: (R() - 0.5) * 920, z: (R() - 0.5) * 920, y: 85 + R() * 35, s: 4 + R() * 5, p: [] };
      for (let j = 0; j < 5; j++) c.p.push([(j - 2) * 1.6 + (R() - 0.5), (R() - 0.5) * 0.6, (R() - 0.5) * 1.4, 1.2 + R() * 1.1, 0.7 + R() * 0.4, 1 + R() * 0.6]);
      clouds.push(c);
    }
    scene.add(cloudMesh);
    // birds: a few flocks circling in V formation during the day
    const birdMat = new T.MeshLambertMaterial({ color: 0x2b2b30 }), body = new T.ConeGeometry(0.14, 0.7, 4), wingG = new T.BoxGeometry(0.9, 0.03, 0.3);
    wingG.translate(0.45, 0, 0); body.rotateX(P / 2);
    const flocks = [];
    for (let f = 0; f < (lowQ ? 2 : 4); f++) {
      const fl = { x: (R() - 0.5) * 160, z: (R() - 0.5) * 160, r: 18 + R() * 25, h: 18 + R() * 14, a: R() * P * 2, w: (0.2 + R() * 0.15) * (R() < 0.5 ? -1 : 1), birds: [] };
      for (let i = 0; i < 5; i++) {
        const b = new T.Group(), wl = new T.Mesh(wingG, birdMat), wr = new T.Mesh(wingG, birdMat);
        b.add(new T.Mesh(body, birdMat), wl, wr); wr.rotation.y = P;
        b.scale.setScalar(1.1);
        b.userData = { wl, wr, off: [(i % 2 ? -1 : 1) * Math.ceil(i / 2) * 1.4, (R() - 0.5) * 0.6, -Math.ceil(i / 2) * 1.2], ph: R() * 6 };
        scene.add(b); fl.birds.push(b);
      }
      flocks.push(fl);
    }
    return { dome, deep: new T.Color(0x2f62b0), ldir: new T.Vector3(), clouds, cloudMesh, flocks, sun: sunM, moon, stars, dir: new T.Vector3(), col: new T.Color(), warm: new T.Color(0xfff2d8), dusk: new T.Color(0xffa060), cold: new T.Color(0x9fb4ff), white: new T.Color(0xffffff), navy: new T.Color(0x5060a0) };
  }
  const dummy = new T.Object3D();
  function updateLife(dt, now, day) {
    const s = sky, p = player ? player.position : cam.position;
    s.clouds.forEach((c, i) => {
      c.x += 3 * dt; c.z += 1.2 * dt;
      if (c.x - p.x > 460) c.x -= 920; else if (c.x - p.x < -460) c.x += 920;
      if (c.z - p.z > 460) c.z -= 920; else if (c.z - p.z < -460) c.z += 920;
      c.p.forEach(([px, py, pz, sx, sy, sz], j) => {
        dummy.position.set(c.x + px * c.s, c.y + py * c.s, c.z + pz * c.s); dummy.scale.set(sx * c.s, sy * c.s, sz * c.s);
        dummy.updateMatrix(); s.cloudMesh.setMatrixAt(i * 5 + j, dummy.matrix);
      });
    });
    s.cloudMesh.instanceMatrix.needsUpdate = true;
    for (const fl of s.flocks) {
      fl.a += fl.w * dt;
      if (Math.hypot(fl.x - p.x, fl.z - p.z) > 140) { fl.x = p.x + (Math.random() - 0.5) * 160; fl.z = p.z + (Math.random() - 0.5) * 160; } // keep flocks around the player
      const cx = fl.x + Math.cos(fl.a) * fl.r, cz = fl.z + Math.sin(fl.a) * fl.r, dx = -Math.sin(fl.a) * Math.sign(fl.w), dz = Math.cos(fl.a) * Math.sign(fl.w), head = Math.atan2(dx, dz);
      for (const b of fl.birds) {
        const [ox, oy, oz] = b.userData.off, flap = Math.sin(now / 90 + b.userData.ph) * 0.7;
        b.visible = day > 0.3;
        b.position.set(cx + ox * Math.cos(head) + oz * Math.sin(head), TR.ground(cx, cz) + fl.h + oy, cz - ox * Math.sin(head) + oz * Math.cos(head));
        b.rotation.y = head; b.userData.wl.rotation.z = flap; b.userData.wr.rotation.z = -flap;
      }
    }
    // ripples behind a swimmer
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], k = (now - r.t0) / 900;
      if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); ripples.splice(i, 1); continue; }
      r.m.scale.setScalar(1 + k * 3); r.m.material.opacity = 0.6 * (1 - k);
    }
  }
  const rippleGeo = new T.RingGeometry(0.6, 0.8, 24); rippleGeo.rotateX(-P / 2);
  function ripple(x, z) {
    const m = new T.Mesh(rippleGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    m.position.set(x, TR.WATER + 0.03, z); scene.add(m); ripples.push({ m, t0: performance.now() });
  }
  function updateSky(now) {
    const ck = W.clock(), hr = ck.mins / 60, ang = (hr - 6) / 12 * P, s = sky, p = player ? player.position : cam.position;
    s.dir.set(Math.cos(ang), Math.sin(ang) * 0.45, 0.6).normalize(); // low arc (max ~37°) so sun and moon stay in view
    const day = smooth(-0.08, 0.18, s.dir.y), low = 1 - Math.abs(s.dir.y - 0.08) / 0.2; // low = sun near the horizon
    skyColor(hr, s.col);
    const top = s.dome.material.uniforms.top.value, bottom = s.dome.material.uniforms.bottom.value;
    bottom.copy(s.col).lerp(s.white, 0.16 * day); top.copy(s.col).lerp(s.deep, 0.5 * day).multiplyScalar(0.85);
    s.dome.position.copy(cam.position); scene.background.copy(bottom); scene.fog.color.copy(bottom);
    s.sun.position.copy(cam.position).addScaledVector(s.dir, 400 * skyK); s.sun.visible = s.dir.y > -0.15;
    s.moon.position.copy(cam.position).addScaledVector(s.dir, -400 * skyK); s.moon.lookAt(cam.position); s.moon.visible = s.dir.y < 0.15;
    s.stars.position.copy(cam.position); s.stars.rotation.y = ang * 0.15; s.stars.material.opacity = Math.pow(1 - day, 2); s.stars.visible = day < 0.97;
    s.ldir.copy(s.dir).multiplyScalar(day > 0.15 ? 1 : -1); s.ldir.y *= 1.8; s.ldir.normalize(); // light stands higher than the drawn sun so shadows stay readable
    sun.position.copy(p).addScaledVector(s.ldir, 120); sun.target.position.copy(p);
    sun.intensity = 0.14 + 0.56 * day;
    sun.color.copy(s.cold).lerp(s.warm, day); if (low > 0 && day > 0.05) sun.color.lerp(s.dusk, Math.min(1, low) * 0.7);
    hemi.intensity = 0.3 + 0.5 * day; hemi.color.copy(s.navy).lerp(s.white, day);
    TR.lavaMat.color.setHSL(0.04, 1, 0.5 + Math.sin(now / 400) * 0.05);
    TR.waveTex.offset.set(now * 0.000011, now * 0.000007); // ripples drift across the water
    TR.barrierMat.uniforms.time.value = now / 1000;
    for (const sp of TR.springs) sp.mesh.material.emissiveIntensity = 0.8 + Math.sin(now / 500) * 0.3;
    for (const m of TR.mills) m.rotation.z = now / 1600;
    for (const w of TR.warps) { w.gem.rotation.y = now / 700; w.gem.position.y = 4.6 + Math.sin(now / 600) * 0.2; }
    for (const g of TR.gears) g.m.rotation.z = now * g.s;
    for (const s of TR.smoke) s.puffs.forEach((m, i) => { const k = (now * 0.00022 + i / s.puffs.length) % 1; m.position.set(s.x + Math.sin(k * 4 + i) * k * 1.5, s.y + k * 11, s.z + k * 1.2); m.scale.setScalar(0.9 + k * 2.6); m.material.opacity = 0.5 * (1 - k); });
    return day;
  }

  W.setChests = opened => chests.forEach(c => { c.visible = !opened.includes(c.userData.id); });
  W.setHero = function (look, cls, pos) {
    const old = player && player.position.clone();
    if (player) scene.remove(player);
    player = W.buildHero(look, cls); scene.add(player);
    const p = pos || old || { x: 0, z: 6 }; player.position.set(clampW(p.x), TR.ground(p.x, p.z), clampW(p.z)); snap = true;
  };
  W.playerPos = () => player ? { x: +player.position.x.toFixed(1), z: +player.position.z.toFixed(1) } : { x: 0, z: 6 };
  W.frozenUntil = 0;
  W.stick = { x: 0, y: 0 };
  W.moveTo = v => { target = v ? new T.Vector3(v.x, 0, v.z) : null; }; // walk toward a point (null stops)
  W.warp = (x, z, look) => { if (!player) return; sailing = null; swimming = false; target = null; jumpH = vy = 0; player.position.set(x, TR.ground(x, z), z); if (look != null) yaw = look; snap = true; updateContext(); };
  W.toVillage = () => { if (player) { sailing = null; swimming = false; player.position.set(0, TR.ground(0, 6), 6); target = null; snap = true; } };

  // ---------- monsters ----------
  const bossBack = {};
  const pick = a => a[Math.random() * a.length | 0];
  const inWater = (x, z) => TR.liquid(x, z) === 'water' && TR.height(x, z) < TR.WATER - 0.3;
  const onLand = (x, z) => TR.height(x, z) >= TR.liquidY(TR.liquid(x, z)) - 0.05 && !TR.townAt(x, z, 4);
  const lvlNow = () => W.heroLvl ? W.heroLvl() : 1;
  W.open = (x, z) => TR.areaLevel(x, z) <= lvlNow();
  function spawn(type, x, z) {
    const d = ENEMIES[type], m = W.buildEnemy(type); m.position.set(x, TR.ground(x, z), z); scene.add(m);
    const e = { type, mesh: m, water: !!d.water, float: !!d.float, boss: !!d.boss, size: d.scale || 1, home: new T.Vector3(x, 0, z), goal: new T.Vector3(x, 0, z), wait: 0, ph: Math.random() * 6 };
    W.enemies.push(e); return e;
  }
  W.spawnAt = spawn; // the dungeon places its own monsters
  // new monsters appear 45–130 m away, picked from the region (or water) they land in
  function spawnNear() {
    const p = player.position, a = Math.random() * P * 2, d = 45 + Math.random() * 85, x = clampW(p.x + Math.cos(a) * d), z = clampW(p.z + Math.sin(a) * d);
    if (TR.townAt(x, z, 14) || TR.dungeonAt(x, z) || !W.open(x, z)) return; // nothing spawns behind a wall the hero can't pass yet
    if (inWater(x, z)) return spawn(pick(WATER_SPAWN(hyp(x, z))), x, z);
    const b = TR.biomeAt(x, z);
    if (onLand(x, z) && BIOMES[b] && BIOMES[b].spawn.length) { const ty = pick(BIOMES[b].spawn); spawn(BIOMES[b].realm && W.heroLvl ? realmFoe(ty, W.heroLvl()) : ty, x, z); }
  }
  W.removeEnemy = e => { scene.remove(e.mesh); W.enemies = W.enemies.filter(o => o !== e); if (e.boss) bossBack[e.type] = performance.now() + 600000; };

  // ---------- input ----------
  function bindInput(cv) {
    addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input,textarea,select')) return;
      if (e.key === ' ' && !W.paused) { e.preventDefault(); W.jump(); } // Space jumps instead of pressing a focused button
      if (e.key === 'Enter' && !W.paused && W.context) { e.preventDefault(); W.interact(); }
      keys[e.key.toLowerCase()] = true;
    });
    addEventListener('keyup', e => { if (e.key === ' ' && !W.paused && e.target.tagName === 'BUTTON') e.preventDefault(); keys[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    let down = null, pinch = 0, lastTap = 0;
    const pts = new Map();
    // in a battle these gestures orbit the fight instead of the hero
    const zoom = d => { if (W.stage) W.stage.orbit.dist = Math.min(45, Math.max(5, W.stage.orbit.dist + d)); else dist = Math.min(30, Math.max(8, dist + d)); };
    cv.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); pinch = 0; down = { t: performance.now(), lx: e.clientX, ly: e.clientY, moved: pts.size > 1 ? 99 : 0 }; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not an active pointer */ } });
    cv.addEventListener('pointermove', e => {
      if (!down || !pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoom((pinch - d) * 0.05); pinch = d; return; } // two fingers: zoom
      const dx = e.clientX - down.lx, dy = e.clientY - down.ly; down.lx = e.clientX; down.ly = e.clientY; down.moved += Math.abs(dx) + Math.abs(dy);
      if (W.stage) { const o = W.stage.orbit; o.yaw -= dx * 0.008; o.pitch = Math.min(1.35, Math.max(0.05, o.pitch + dy * 0.006)); }
      else { yaw -= dx * 0.008; pitch = Math.min(1.45, Math.max(-0.35, pitch + dy * 0.006)); }
    });
    const lift = e => {
      pts.delete(e.pointerId); pinch = 0;
      if (!down || pts.size) return;
      const tap = down.moved < 8 && performance.now() - down.t < 500;
      if (tap && W.stage) { if (performance.now() - lastTap < 350) Object.assign(W.stage.orbit, W.stage.home); lastTap = performance.now(); } // double-tap: default view
      else if (tap && !W.paused) {
        ray.setFromCamera({ x: e.clientX / innerWidth * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 }, cam);
        const foe = W.onPick && ray.intersectObjects(W.enemies.filter(en => !en.dead).map(en => en.mesh), true)[0]; // tapping a monster attacks it
        let o = foe && foe.object; while (o && !W.enemies.some(en => en.mesh === o)) o = o.parent;
        if (o) { W.onPick(W.enemies.find(en => en.mesh === o)); down = null; return; }
        const hit = ray.intersectObject(terrain)[0]; if (hit) target = hit.point.clone();
      }
      down = null;
    };
    cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift);
    cv.addEventListener('wheel', e => zoom(e.deltaY * 0.01), { passive: true });
  }

  // ---------- loop ----------
  const fwd = new T.Vector3(), mv = new T.Vector3();
  function loop(now) {
    requestAnimationFrame(loop);
    const raw = (now - last) / 1000 || 0, dt = Math.min(0.05, raw); last = now; adapt(raw);
    if (!player) { updateSky(now); renderer.render(scene, cam); return; }
    let moving = false;
    const p = player.position;
    if (!W.paused) {
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); mv.set(0, 0, 0);
      if (keys.w || keys.arrowup) mv.add(fwd); if (keys.s || keys.arrowdown) mv.sub(fwd);
      if (keys.d || keys.arrowright) mv.add(new T.Vector3(-fwd.z, 0, fwd.x)); if (keys.a || keys.arrowleft) mv.sub(new T.Vector3(-fwd.z, 0, fwd.x));
      const stick = W.stick, push = Math.hypot(stick.x, stick.y); // the on-screen analog stick (touch screens), relative to the camera like WASD
      if (push) mv.addScaledVector(fwd, -stick.y).add(new T.Vector3(-fwd.z * stick.x, 0, fwd.x * stick.x));
      if (keys.q) yaw += dt * 2; if (keys.e) yaw -= dt * 2;
      if (keys.r) pitch = Math.min(1.45, pitch + dt * 1.2); if (keys.f) pitch = Math.max(-0.35, pitch - dt * 1.2);
      if (now < W.frozenUntil) { mv.set(0, 0, 0); target = null; } // stunned
      if (mv.lengthSq()) target = null;
      else if (target) { mv.set(target.x - p.x, 0, target.z - p.z); if (mv.length() < (sailing ? 4 : 0.4)) target = null; }
      if (sailing) sail(dt, now);
      else if (mv.lengthSq() > 0.0001) {
        mv.normalize().multiplyScalar((swimming ? 5 : 9) * dt * (push ? Math.min(1, push) : 1)); // a half-pushed stick walks slower
        const x0 = p.x, z0 = p.z;
        p.x = clampW(p.x + mv.x); p.z = clampW(p.z + mv.z);
        TR.collide(p, 0.5); // trees, rocks, houses and fountains are solid; water is walkable
        if (!W.open(p.x, p.z) && W.open(x0, z0)) { const need = TR.areaLevel(p.x, p.z); p.x = x0; p.z = z0; target = null; W.onLocked && W.onLocked(need); } // a locked area: stay out (walking out of one is fine)
        const moved = hyp(p.x - x0, p.z - z0);
        if (W.onStep) W.onStep(moved);
        if (target && moved < (swimming ? 5 : 9) * dt * 0.25) { if ((stuck += dt) > 0.5) { target = null; stuck = 0; } } else stuck = 0;
        player.rotation.y = Math.atan2(mv.x, mv.z); moving = true;
      }
      if (!sailing) {
        const st = W.stance(p.x, p.z); swimming = st.swim;
        if (swimming) jumpH = vy = 0;
        else if (vy || jumpH) { vy -= 25 * dt; jumpH = Math.max(0, jumpH + vy * dt); if (!jumpH) vy = 0; }
        p.y = swimming ? W.swimY(st, moving) : st.y + jumpH;
        if (swimming && moving && (rippleT -= dt) < 0) { rippleT = 0.35; ripple(p.x, p.z); }
      }
      tickWorld(dt, now);
      if (W.onLive && !W.stage) W.onLive(dt, now);
    }
    if (!W.stage) {
      if (swimming && !sailing) W.swimPose(player, moving, dt);
      else { player.rotation.x = 0; animateWalk(player, moving && !jumpH, dt); }
      if (jumpH) { const u = player.userData; u.legs[0].rotation.x = 0.7; u.legs[1].rotation.x = -0.3; u.arms[0].rotation.x = u.arms[1].rotation.x = -2.4; }
    }
    // run effect callbacks; ones started during this pass (an impact spawning sparks) join the next pass,
    // and one failing callback is dropped instead of freezing the rest
    const running = W.anims; W.anims = [];
    const keep = running.filter(f => { try { return f(now) !== false; } catch (err) { console.error(err); return false; } });
    W.anims = keep.concat(W.anims);
    updateNpcs(dt, now);
    if (W.onFrame) W.onFrame(dt);
    const s = W.stage;
    if (s) {
      const o = s.orbit;
      if (keys.q) o.yaw += dt * 2; if (keys.e) o.yaw -= dt * 2;
      if (keys.r) o.pitch = Math.min(1.35, o.pitch + dt * 1.2); if (keys.f) o.pitch = Math.max(0.05, o.pitch - dt * 1.2);
      const h = Math.cos(o.pitch) * o.dist, cx = s.look.x + Math.sin(o.yaw) * h, cz = s.look.z + Math.cos(o.yaw) * h;
      cam.position.lerp(new T.Vector3(cx, Math.max(s.look.y + Math.sin(o.pitch) * o.dist, TR.ground(cx, cz) + 0.8), cz), 0.15);
      if (s.shakeUntil > now) { const k = s.shakeAmp * (s.shakeUntil - now) / 300; cam.position.x += (Math.random() - 0.5) * k; cam.position.y += (Math.random() - 0.5) * k; }
      cam.lookAt(s.look);
    }
    else {
      const gy = p.y - jumpH, horiz = dist * Math.cos(pitch), cx = p.x + Math.sin(yaw) * horiz, cz = p.z + Math.cos(yaw) * horiz;
      // keep the camera above the ground; a low pitch then looks up at the hero and sky
      cam.position.lerp(new T.Vector3(cx, Math.max(gy + dist * Math.sin(pitch), TR.ground(cx, cz) + 0.8), cz), snap ? 1 : 0.12); snap = false;
      const L = W.live; if (L && L.shakeUntil > now) { const k = L.shakeAmp * (L.shakeUntil - now) / 300; cam.position.x += (Math.random() - 0.5) * k; cam.position.y += (Math.random() - 0.5) * k; }
      cam.lookAt(p.x, gy + 1.5, p.z);
    }
    updateLife(dt, now, updateSky(now));
    cam.updateMatrixWorld(); TR.cull(cam, p);
    renderer.render(scene, cam);
  }

  function tickWorld(dt, now) {
    const p = player.position, safe = !!TR.townAt(p.x, p.z);
    // keep the area around the player populated; bosses guard their fixed lairs
    if (W.enemies.filter(e => !e.boss).length < maxEnemies) spawnNear();
    for (const l of TR.LAIRS) if (!W.enemies.some(e => e.type === l.type) && now > (bossBack[l.type] || 0)) spawn(l.type, l.x, l.z);
    for (const e of W.enemies.slice()) {
      const m = e.mesh, d = hyp(p.x - m.position.x, p.z - m.position.z);
      if (!e.boss && d > 150) { scene.remove(m); W.enemies.splice(W.enemies.indexOf(e), 1); continue; }
      if (e.dead) continue; // falling over; action.js removes it
      const can = e.water ? inWater : onLand, far = hyp(m.position.x - e.home.x, m.position.z - e.home.z), reach = (e.boss ? 3.2 : 1.3) + 0.45 * e.size;
      // real-time fights: a monster that sees you (or that you hit) comes after you until it strays too far from home
      if (d < (e.boss ? 14 : 10) && !safe && !sailing && now > W.grace && can(p.x, p.z) === can(m.position.x, m.position.z)) e.aggro = true;
      if (e.aggro && !e.dungeon && (far > (e.boss ? 24 : 45) || d > 40 || safe || sailing || now < W.grace)) { e.aggro = false; W.onLeash && W.onLeash(e); }
      const chase = e.aggro && !(e.stunUntil > now), close = chase && d < reach;
      let goal = e.goal, speed = e.water ? 2.8 : 2.2;
      if (chase) { goal = p; speed = e.water ? 6 : e.boss ? 4 : 5.5; }
      else if (e.boss) goal = e.home; // bosses walk back to their lair
      else if ((e.wait -= dt) < 0 && hyp(goal.x - m.position.x, goal.z - m.position.z) < 0.5) {
        e.wait = 1 + Math.random() * 3; e.goal.set(e.home.x + (Math.random() - 0.5) * 24, 0, e.home.z + (Math.random() - 0.5) * 24);
      }
      const dx = goal.x - m.position.x, dz = goal.z - m.position.z, l = hyp(dx, dz);
      if (chase || e.boss && d < 45) m.rotation.y = Math.atan2(p.x - m.position.x, p.z - m.position.z); // face you
      if (chase && W.onEnemy) W.onEnemy(e, d, reach, now);
      if (!close && (e.boss ? l > 1.5 : l > 0.3 && e.wait <= 0 || chase)) {
        const nx = m.position.x + dx / l * speed * dt, nz = m.position.z + dz / l * speed * dt;
        if (can(nx, nz) && (W.open(nx, nz) || !W.open(m.position.x, m.position.z))) { m.position.x = nx; m.position.z = nz; if (!e.water && !e.float) TR.collide(m.position, 0.6 * e.size); } else e.goal.copy(e.home);
        if (!chase) m.rotation.y = Math.atan2(dx, dz);
        if (m.userData.walker) animateWalk(m.userData.walker, true, dt);
      }
      if (m.userData.spin && !chase) m.rotation.y += dt * 0.4;
      const ground = TR.ground(m.position.x, m.position.z), bob = Math.sin(now / 300 + e.ph);
      m.position.y = ground + m.userData.yOff + (e.water ? bob * 0.12 : e.float ? bob * 0.3 : e.type === 'slime' ? Math.abs(bob) * 0.3 : 0);
    }
    for (const c of chests) if (c.visible && hyp(p.x - c.position.x, p.z - c.position.z) < 2) { c.visible = false; W.onChest && W.onChest(c.userData.id); }
    if ((ctxT -= dt) < 0) { ctxT = 0.25; updateContext(); }
    for (const n of npcs) if (n.role !== 'guard' && now > n.said && hyp(p.x - n.m.position.x, p.z - n.m.position.z) < 3.2) { talk(n, now); break; }
    const sp = TR.springs.find(s => hyp(p.x - s.x, p.z - s.z) < 4.6) || null;
    if (sp && sp !== inSpring && W.onSpring) W.onSpring(sp.town); inSpring = sp;
    if (!jumpH && TR.liquid(p.x, p.z) === 'lava' && TR.height(p.x, p.z) < TR.LAVA && W.onBurn) W.onBurn(dt);
    // announce a new region (water counts as the region around it)
    if ((areaT -= dt) < 0) {
      areaT = 0.5;
      const lv = lvlNow(); for (const b of TR.barriers) b.m.visible = lv < b.need;
      const tw = TR.townAt(p.x, p.z), b = TR.biomeAt(p.x, p.z), area = tw ? 'town:' + tw.id : b === 'water' ? lastArea : b;
      if (area && area !== lastArea) { lastArea = area; W.onArea && W.onArea(tw ? 'town' : b, tw); }
    }
  }

  // ---------- ships ----------
  const navigable = (x, z) => TR.liquid(x, z) === 'water' && TR.height(x, z) < TR.WATER - 0.8 && Math.abs(x) < TR.HALF && Math.abs(z) < TR.HALF;
  function sail(dt, now) {
    const s = sailing, m = s.mesh, p = player.position;
    if (mv.lengthSq() > 0.0001) {
      let d = Math.atan2(mv.x, mv.z) - s.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
      s.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, d)); s.speed = Math.min(14, s.speed + 8 * dt);
    } else s.speed = Math.max(0, s.speed - 6 * dt);
    const nx = m.position.x + Math.sin(s.heading) * s.speed * dt, nz = m.position.z + Math.cos(s.heading) * s.speed * dt;
    if (navigable(nx, nz) && W.open(nx, nz)) { if (W.onStep) W.onStep(s.speed * dt); m.position.x = nx; m.position.z = nz; } else { s.speed = 0; target = null; } // ran aground
    m.rotation.y = s.heading; m.position.y = TR.WATER + Math.sin(now / 600) * 0.08; m.rotation.z = Math.sin(now / 900) * 0.04;
    p.set(m.position.x - Math.sin(s.heading) * 0.8, m.position.y + m.userData.deck, m.position.z - Math.cos(s.heading) * 0.8);
    player.rotation.y = s.heading;
    if (s.speed > 3 && (rippleT -= dt) < 0) { rippleT = 0.22; ripple(m.position.x - Math.sin(s.heading) * 4.5, m.position.z - Math.cos(s.heading) * 4.5); }
  }
  // nearest dry ground beside the ship, to step off onto
  function landSpot() {
    const m = sailing.mesh;
    for (let r = 4; r <= 12; r += 2) for (let k = 0; k < 16; k++) {
      const a = k / 16 * P * 2, x = m.position.x + Math.cos(a) * r, z = m.position.z + Math.sin(a) * r;
      if (!W.stance(x, z).swim && TR.liquid(x, z) === 'water' && TR.height(x, z) > TR.WATER - 0.4) return { x, z };
    }
    return null;
  }
  function updateContext() {
    const p = player.position; let c = null;
    if (sailing) { if (landSpot()) c = { kind: 'leave' }; }
    else {
      const sh = ships.find(s => hyp(p.x - s.mesh.position.x, p.z - s.mesh.position.z) < 7);
      const pl = TR.PLACES.find(q => hyp(p.x - q.x, p.z - q.z) < 5);
      if (sh) c = { kind: 'board', ship: sh }; else if (pl) c = { kind: pl.kind };
    }
    const changed = (c && c.kind) !== (W.context && W.context.kind);
    W.context = c; if (changed && W.onContext) W.onContext(c);
  }
  W.interact = function () {
    const c = W.context; if (!c || W.paused) return;
    if (c.kind === 'board') { sailing = c.ship; sailing.speed = 0; target = null; swimming = false; jumpH = vy = 0; W.onSail && W.onSail(true); }
    else if (c.kind === 'leave') { const spot = landSpot(); if (!spot) return; sailing.speed = 0; sailing = null; player.position.set(spot.x, TR.ground(spot.x, spot.z), spot.z); snap = true; W.onSail && W.onSail(false); }
    else if (W.onPlace) W.onPlace(c.kind);
    updateContext();
  };

  // ---------- townsfolk: citizens stroll and chat, guards hold the gates ----------
  function npcSpot(tw) {
    const R = tw.city ? 42 : tw.r * 0.75, v = new T.Vector3();
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * P * 2, r = 5 + Math.random() * (R - 5), x = tw.x + Math.cos(a) * r, z = tw.z + Math.sin(a) * r;
      v.set(x, 0, z); TR.collide(v, 0.6); if (hyp(v.x - x, v.z - z) < 0.01) return { x, z };
    }
    return { x: tw.x + 6, z: tw.z };
  }
  function addNpc(tw, role, x, z, face) {
    const m = W.buildHero(role === 'guard' ? Models.guardLook() : Models.citizenLook(), role === 'guard' ? 'knight' : null);
    if (x == null) ({ x, z } = npcSpot(tw));
    m.position.set(x, TR.ground(x, z), z); m.rotation.y = face == null ? Math.random() * 6 : face; scene.add(m);
    npcs.push({ m, tw, role, goal: null, wait: Math.random() * 4, said: 0, talk: 0 });
  }
  function spawnPeople() {
    for (const tw of TOWNS) {
      for (let i = 0; i < (tw.city ? (lowQ ? 6 : 16) : lowQ ? 2 : 3); i++) addNpc(tw, 'citizen');
      const gates = tw.city ? [0, P] : tw.walls ? [Math.atan2(-tw.z, -tw.x)] : [], R = tw.city ? 50 : tw.r - 5;
      for (const g of gates) [-1, 1].forEach(s => addNpc(tw, 'guard', tw.x + Math.cos(g) * R - Math.sin(g) * s * 3.5, tw.z + Math.sin(g) * R + Math.cos(g) * s * 3.5, Math.atan2(Math.cos(g), Math.sin(g))));
      if (tw.city) [-3.5, 3.5].forEach(x => addNpc(tw, 'guard', tw.x + x, tw.z - 22.5, 0)); // castle door
    }
  }
  function updateNpcs(dt, now) {
    const p = player.position;
    for (const n of npcs) {
      const m = n.m, d = hyp(p.x - m.position.x, p.z - m.position.z);
      m.visible = d < 170; if (d > 120) continue;
      if (n.talk > now) { m.rotation.y = Math.atan2(p.x - m.position.x, p.z - m.position.z); animateWalk(m, false, dt); continue; }
      if (n.role === 'guard') continue;
      if (!n.goal) { if ((n.wait -= dt) < 0) n.goal = npcSpot(n.tw); animateWalk(m, false, dt); continue; }
      const dx = n.goal.x - m.position.x, dz = n.goal.z - m.position.z, l = hyp(dx, dz);
      if (l < 0.5) { n.goal = null; n.wait = 2 + Math.random() * 5; continue; }
      const x0 = m.position.x, z0 = m.position.z;
      m.position.x += dx / l * 1.4 * dt; m.position.z += dz / l * 1.4 * dt; TR.collide(m.position, 0.5);
      if (hyp(m.position.x - x0, m.position.z - z0) < 0.3 * dt) { n.goal = null; n.wait = 1; } // bumped into something
      m.position.y = TR.ground(m.position.x, m.position.z); m.rotation.y = Math.atan2(dx, dz); animateWalk(m, true, dt);
    }
    // speech bubble over whoever is talking
    if (talkEl) {
      if (talkUntil < now || !talkNpc || W.stage) talkEl.style.display = 'none';
      else {
        const v = talkNpc.m.position.clone(); v.y += 2.7 * talkNpc.m.scale.y; v.project(cam);
        talkEl.style.display = v.z < 1 ? '' : 'none'; talkEl.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; talkEl.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
      }
    }
  }
  function talk(n, now) {
    const text = W.npcLine ? W.npcLine(n.role, n.tw) : ''; if (!text) return;
    n.said = now + 12000; n.talk = now + 4500; talkNpc = n; talkUntil = now + 4500;
    if (!talkEl) {
      talkEl = document.createElement('div'); talkEl.className = 'tag'; talkEl.innerHTML = '<span class="bub"></span>';
      (document.getElementById('tags') || document.body).append(talkEl);
    }
    talkEl.firstChild.textContent = text;
  }

  // ---------- battle stage: heroes in a row facing the foe, camera from the side ----------
  // allies: [{key, mesh}] of other players' avatars joining this fight
  W.beginStage = function (foe, temp, allies) {
    allies = allies || [];
    const p = player.position, dir = new T.Vector3(foe.position.x - p.x, 0, foe.position.z - p.z);
    if (dir.lengthSq() < 0.01) dir.set(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
    dir.normalize();
    const size = new T.Box3().setFromObject(foe).getSize(new T.Vector3()), gap = 3.2 + Math.max(size.x, size.z) * 0.6;
    jumpH = vy = 0; target = null;
    if (!sailing) { const st = W.stance(p.x, p.z); p.y = st.swim ? st.y - 1.75 : st.y; }
    player.rotation.x = 0;
    const fx = p.x + dir.x * gap, fz = p.z + dir.z * gap;
    foe.position.set(fx, TR.ground(fx, fz) + (foe.userData.yOff || 0), fz);
    if (temp) scene.add(foe);
    const face = Math.atan2(dir.x, dir.z), side = new T.Vector3(-dir.z, 0, dir.x);
    player.rotation.y = face; foe.rotation.set(0, face + P, 0);
    animateWalk(player, false, 0);
    const actors = {
      me: { mesh: player, home: p.clone(), tall: 2.5 * player.scale.y, side: 'hero' },
      foe: { mesh: foe, home: foe.position.clone(), tall: Math.max(1.4, size.y), side: 'foe' }
    };
    allies.forEach((a, i) => {
      const x = p.x - dir.x * 2.2 * (i + 1) + side.x * (i % 2 ? -1.2 : 1.2), z = p.z - dir.z * 2.2 * (i + 1) + side.z * (i % 2 ? -1.2 : 1.2);
      const ast = W.stance(x, z); a.mesh.position.set(x, ast.swim ? ast.y - 1.75 : ast.y, z); a.mesh.rotation.set(0, face, 0);
      if (a.mesh.userData.legs) animateWalk(a.mesh, false, 0);
      actors[a.key] = { mesh: a.mesh, home: a.mesh.position.clone(), tall: 2.5 * a.mesh.scale.y, side: 'hero' };
    });
    const span = gap + 2.2 * allies.length, mid = p.clone().addScaledVector(dir, (gap - 2.2 * allies.length) / 2);
    // default view: three-quarters from behind the hero's shoulder, both sides in frame; the player can orbit from here
    const view = side.clone().multiplyScalar(Math.cos(0.65)).addScaledVector(dir, -Math.sin(0.65));
    const orbit = { yaw: Math.atan2(view.x, view.z), pitch: 0.38, dist: span * 1.15 + 6 };
    W.stage = { foe, temp, gap, dir, actors, orbit, home: { ...orbit }, look: mid.clone().setY(mid.y + 0.8) };
    stageView();
  };
  W.endStage = function () {
    const s = W.stage; if (!s) return;
    if (s.temp) scene.remove(s.foe);
    for (const k in s.actors) { const m = s.actors[k].mesh; m.rotation.x = m.rotation.z = 0; m.scale.y = m.scale.x; }
    if (window.FX) FX.clear();
    W.anims.length = 0; W.stage = null; snap = false; stageView();
  };

  // ---------- character-creation preview (own small renderer) ----------
  W.preview = function (canvas) {
    let r; try { r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return null; }
    const s = new T.Scene(), c = new T.PerspectiveCamera(35, 1, 0.1, 50), alive = { on: true };
    s.add(new T.HemisphereLight(0xffffff, 0x556655, 1)); const d = new T.DirectionalLight(0xffffff, 0.6); d.position.set(3, 5, 4); s.add(d);
    const ground = new T.Mesh(new T.CylinderGeometry(1.4, 1.5, 0.12, 40), Models.mat(0x5a5850, { map: Terrain.tex('stone', 3, 1) })); // stone pedestal
    ground.position.y = -0.05; s.add(ground);
    c.position.set(0, 1.7, 5.4); c.lookAt(0, 1.2, 0);
    let hero = null, ang = 0;
    (function spin() {
      if (!alive.on) return; requestAnimationFrame(spin);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && (canvas.width !== Math.round(w * r.getPixelRatio()))) { r.setSize(w, h, false); c.aspect = w / h; c.updateProjectionMatrix(); }
      if (hero) hero.rotation.y = (ang += 0.01);
      r.render(s, c);
    })();
    return {
      set(look, cls) { if (hero) s.remove(hero); hero = W.buildHero(look, cls); hero.rotation.y = ang; s.add(hero); },
      dispose() { alive.on = false; r.dispose(); r.forceContextLoss(); } // give the WebGL context back right away
    };
  };
})();
