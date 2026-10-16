// Battle effects on the World stage (or in the open world during real-time fights): lunges, projectiles, bursts, heals, shields, floating numbers.
// Actors are keyed like World.stage.actors: 'me', 'foe', or another player's peer id. Impacts land within ~450 ms.
(function () {
  const T = THREE, FX = window.FX = {};
  // every temporary effect object is tracked so a battle that ends mid-animation leaves nothing behind
  const live = new Set();
  const add3 = o => { World._scene.add(o); live.add(o); };
  const rem3 = o => { World._scene.remove(o); live.delete(o); };
  FX.clear = () => { live.forEach(o => World._scene.remove(o)); live.clear(); };
  // the turn-based stage, or the open world during a real-time fight (action.js)
  const ctx = () => World.stage || World.live, actor = k => ctx() && ctx().actors[k];
  const mesh = k => actor(k) ? actor(k).mesh : null;
  const tall = k => actor(k) ? actor(k).tall : 2;
  const chest = k => { const m = mesh(k); return m.position.clone().setY(m.position.y + tall(k) * 0.55); };
  const top = k => { const m = mesh(k); return m.position.clone().setY(m.position.y + tall(k) + 0.3); };
  const glow = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o == null ? 0.9 : o, depthWrite: false });
  const light = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o == null ? 0.9 : o, depthWrite: false, blending: T.AdditiveBlending });
  const SPH = new T.SphereGeometry(1, 8, 6), OCT = new T.OctahedronGeometry(1), UP = new T.Vector3(0, 1, 0);
  const rnd = (a, b) => a + Math.random() * (b - a);
  // one short-lived particle on a shared geometry: drifts by vel (m/s), shrinks or grows, fades
  function particle(geo, color, pos, size, dur, vel, grow, soft) {
    const m = new T.Mesh(geo, soft ? glow(color, 0.8) : light(color, 0.95)); m.position.copy(pos); m.scale.setScalar(size); add3(m);
    const t0 = performance.now(); let last = t0;
    World.anims.push(now => {
      const q = Math.min(1, (now - t0) / dur), dt = (now - last) / 1000; last = now;
      if (vel) m.position.addScaledVector(vel, dt);
      m.scale.setScalar(size * (grow ? 1 + q * grow : 1 - q * 0.8)); m.material.opacity = (soft ? 0.8 : 0.95) * (1 - q);
      if (q >= 1) { rem3(m); m.material.dispose(); return false; }
    });
  }
  // where an actor stands on the stage (floating monsters hover above this)
  const feet = k => { const a = actor(k), off = a.mesh.userData.yOff > 0 ? a.mesh.userData.yOff : 0; return a.home.clone().setY(a.home.y - off + 0.06); };
  // a flat ring on the ground that widens and fades
  function groundRing(k, color, from, to, dur, width) {
    const r = new T.Mesh(new T.RingGeometry(0.85, 1, 40), light(color, 0.85)); r.rotation.x = -Math.PI / 2; r.position.copy(feet(k));
    temp(r, dur, (q, o) => { const s = from + (to - from) * ease(q); o.scale.set(s, s, 1); o.material.opacity = 0.85 * (1 - q); });
  }
  const ease = k => 1 - Math.pow(1 - k, 3);

  // run fn(k) for k 0→1 over dur ms; done() afterwards
  FX.anim = function (dur, fn, done) {
    const t0 = performance.now();
    World.anims.push(now => { const k = Math.min(1, (now - t0) / dur); fn(k); if (k >= 1) { done && done(); return false; } });
  };
  FX.later = (ms, fn) => setTimeout(() => ctx() && fn(), ms);
  function temp(obj, dur, fn) { add3(obj); FX.anim(dur, k => fn(k, obj), () => { rem3(obj); obj.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); }); }

  FX.number = function (k, text, cls) {
    if (!mesh(k)) return;
    const v = top(k).project(World._cam), el = document.createElement('div');
    el.className = 'fxnum ' + (cls || ''); el.textContent = text;
    el.style.left = ((v.x + 1) / 2 * innerWidth + (Math.random() - 0.5) * 30) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
    document.getElementById('fx').append(el); setTimeout(() => el.remove(), 1150);
  };

  // red flash + small knock-back away from the other side
  FX.flash = function (k, color) {
    const a = actor(k); if (!a) return;
    const m = a.mesh;
    // remember each material's own glow once, so shared materials and overlapping flashes (a hit plus poison) always restore it
    const mats = new Set(); m.traverse(o => { if (o.material && o.material.emissive) mats.add(o.material); });
    mats.forEach(mt => { if (mt.userData.glow == null) mt.userData.glow = mt.emissive.getHex(); mt.emissive.set(color || 0xff2a2a); });
    clearTimeout(m.userData.flashT); m.userData.flashT = setTimeout(() => mats.forEach(mt => mt.emissive.setHex(mt.userData.glow)), 170);
    if (!World.stage) return; // in the open world nobody gets pushed around
    const dir = World.stage.dir.clone().multiplyScalar(a.side === 'hero' ? -1 : 1);
    FX.anim(260, q => { const off = Math.sin(q * Math.PI) * 0.35; m.position.set(a.home.x + dir.x * off, m.position.y, a.home.z + dir.z * off); });
  };

  // step toward the target, swing, step back; onHit fires at the swing
  // opt: dash (fast, with afterimages), leap (jump in and slam), spin (whirl), twin (two slashes)
  FX.lunge = function (k, tk, onHit, color, opt) {
    const a = actor(k), b = actor(tk); if (!a || !b) { onHit && onHit(); return; }
    opt = opt || {};
    const m = a.mesh, dir = b.home.clone().sub(a.home).setY(0), reach = Math.max(0, dir.length() - 1.6); dir.normalize();
    const arms = m.userData.arms || (m.userData.walker && m.userData.walker.userData.arms), ry = m.rotation.y, dur = opt.dash ? 400 : opt.leap ? 680 : 520;
    let hit = false, ghost = 0;
    if (!World.stage) { // open world: swing where you stand
      FX.anim(380, q => {
        if (arms) arms[1].rotation.x = q < 0.5 ? -2.6 * (q / 0.5) : -2.6 + 3.2 * Math.min(1, (q - 0.5) / 0.15);
        if (!hit && q >= 0.5) { hit = true; if (color && tk !== k) { FX.slash(tk, color); if (opt.twin) setTimeout(() => FX.slash(tk, color, true), 110); } onHit && onHit(); }
      }, () => { if (arms) arms[1].rotation.x = 0; });
      return;
    }
    FX.anim(dur, q => {
      const d = Math.sin(q * Math.PI) * reach;
      m.position.set(a.home.x + dir.x * d, a.home.y + (opt.leap ? Math.sin(Math.min(1, q / 0.55) * Math.PI) * 2.8 : 0), a.home.z + dir.z * d);
      if (arms) arms[1].rotation.x = q < 0.5 ? -2.6 * (q / 0.5) : -2.6 + 3.2 * Math.min(1, (q - 0.5) / 0.15);
      if (opt.spin && q > 0.25 && q < 0.6) m.rotation.y = ry + (q - 0.25) / 0.35 * Math.PI * 2;
      if (opt.dash && q < 0.5 && ++ghost % 2 === 0) particle(SPH, color || 0xffffff, m.position.clone().setY(m.position.y + a.tall * 0.5), 0.5, 260, null, 0, true);
      if (!hit && q >= 0.55) {
        hit = true;
        if (color) { FX.slash(tk, color); if (opt.twin) setTimeout(() => FX.slash(tk, color, true), 110); }
        onHit && onHit();
      }
    }, () => { if (arms) arms[1].rotation.x = 0; m.rotation.y = ry; m.position.set(a.home.x, a.home.y, a.home.z); });
  };
  // a bright arc across the target
  FX.slash = function (k, color, back) {
    if (!mesh(k)) return;
    const arc = new T.Mesh(new T.TorusGeometry(1.2, 0.09, 6, 24, Math.PI * 0.9), light(color || 0xffffff));
    arc.position.copy(chest(k)); arc.lookAt(World._cam.position); const z0 = back ? 2.4 : -0.6;
    temp(arc, 280, (q, o) => { o.rotation.z = z0 + (back ? -1 : 1) * q * 1.6; o.material.opacity = 0.95 * (1 - q); o.scale.setScalar(0.8 + q * 0.6); });
  };

  // raise the casting hand with a glow
  FX.cast = function (k, color) {
    const m = mesh(k); if (!m) return;
    const arms = m.userData.arms;
    if (arms) FX.anim(420, q => { arms[1].rotation.x = -Math.sin(q * Math.PI) * 2.2; });
    const orb = new T.Mesh(new T.SphereGeometry(0.35, 12, 10), glow(color, 0.8));
    orb.position.copy(top(k));
    temp(orb, 420, (q, o) => { o.scale.setScalar(0.4 + q * 1.4); o.material.opacity = 0.8 * (1 - q); });
  };

  // trail colors by element (fire flickers between two)
  const TRAIL = { fire: [0xffd060, 0xff4a10], ice: [0xffffff, 0xbfefff], dark: [0x6a2aa0, 0x2a0a40], poison: [0x8fe04a, 0x4a8a2a], holy: [0xfff0b0, 0xffffff], arcane: null, bolt: [0xfff8a0, 0xffffff] };
  const trailOf = (elem, color) => (TRAIL[elem] || [color, color])[Math.random() < 0.5 ? 0 : 1];
  // projectile from k to tk. style: bolt | arrow | volley | meteor | wave | strike | spikes
  FX.bolt = function (k, tk, style, color, onHit, elem, opt) {
    if (!mesh(k) || !mesh(tk)) { onHit && onHit(); return; }
    opt = opt || {};
    if (style === 'volley') { for (let i = 0; i < 5; i++) setTimeout(() => FX.bolt(k, tk, 'arrow', color, i === 4 ? onHit : null, elem), i * 70); return; }
    if (style === 'meteor' && opt.count > 1) {
      for (let i = 0; i < opt.count; i++) setTimeout(() => FX.bolt(k, tk, 'meteor', color, i === opt.count - 1 ? onHit : () => FX.impact(tk, elem, color, false), elem, { off: i }), i * 140);
      return;
    }
    if (style === 'strike') return FX.strike(tk, elem, color, onHit);
    if (style === 'spikes') { FX.spikes(tk, color); setTimeout(() => onHit && onHit(), 260); return; }
    const off = opt.off ? new T.Vector3(rnd(-1.5, 1.5), 0, rnd(-1.5, 1.5)) : new T.Vector3();
    const a = style === 'meteor' ? top(tk).add(new T.Vector3(3, 11, 0)).add(off) : chest(k), b = chest(tk).add(off.multiplyScalar(0.3));
    let shot;
    if (style === 'arrow') { shot = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1.2, 5), light(color, 1)); shot.geometry.rotateX(Math.PI / 2); }
    else if (style === 'wave') { shot = new T.Mesh(new T.TorusGeometry(1.1, 0.12, 6, 20, Math.PI), light(color, 0.95)); }
    else if (elem === 'ice') { shot = new T.Mesh(new T.OctahedronGeometry(0.35), light(color, 1)); shot.scale.set(0.6, 0.6, 2.2); }
    else shot = new T.Mesh(new T.SphereGeometry(style === 'meteor' ? 0.8 : 0.34, 12, 10), light(color, 1));
    let tick = 0;
    temp(shot, style === 'meteor' ? 500 : 340, (q, o) => {
      o.position.lerpVectors(a, b, style === 'meteor' ? q * q : q);
      if (style !== 'meteor' && style !== 'wave') o.position.y += Math.sin(q * Math.PI) * (style === 'arrow' ? 0.6 : 0.9);
      if (style === 'arrow' || elem === 'ice') o.lookAt(b);
      else if (style === 'wave') { o.lookAt(b); o.rotateY(Math.PI / 2); o.rotateZ(Math.PI / 2); o.scale.setScalar(0.8 + q * 0.5); }
      else o.scale.setScalar(1 + Math.sin(q * 30) * 0.15);
      if (++tick % (style === 'meteor' ? 1 : 2) === 0) particle(SPH, trailOf(elem, color), o.position, style === 'meteor' ? rnd(0.25, 0.45) : rnd(0.1, 0.2), style === 'meteor' ? 420 : 300, new T.Vector3(rnd(-0.4, 0.4), rnd(0.2, 0.8), rnd(-0.4, 0.4)));
      if (q >= 1) onHit && onHit();
    });
  };

  // ---------- element impacts ----------
  FX.impact = function (k, elem, color, strong) {
    if (!mesh(k)) return;
    const E = {
      fire: () => FX.explode(k, color, strong), ice: () => FX.shards(k, color), bolt: () => { FX.lightning(k, color); FX.explode(k, color, false); },
      poison: () => FX.cloud(k, color), dark: () => FX.vortex(k, color), holy: () => { FX.pillar(k, color); FX.burst(k, color, 22); },
      quake: () => FX.quake(k, color), nature: () => FX.burst(k, color, 16), arcane: () => { groundRing(k, color, 0.5, 4, 600); FX.shards(k, color); },
      wind: () => { FX.slash(k, color); FX.slash(k, color, true); FX.burst(k, color, 10); }, arrow: () => FX.burst(k, color, 10), slash: () => FX.burst(k, color, 12)
    };
    (E[elem] || E.slash)();
    if (strong) FX.shake(0.4, 320);
  };
  // fireball blast: glowing core, sparks, smoke and a shockwave on the ground
  FX.explode = function (k, color, strong) {
    const c = chest(k), big = strong ? 3.2 : 2.2;
    const core = new T.Mesh(new T.SphereGeometry(1, 16, 12), light(color, 0.95)); core.position.copy(c);
    temp(core, 420, (q, o) => { o.scale.setScalar(0.3 + ease(q) * big); o.material.opacity = 0.95 * (1 - q); });
    const white = new T.Mesh(new T.SphereGeometry(1, 12, 10), light(0xffffff, 0.9)); white.position.copy(c);
    temp(white, 200, (q, o) => { o.scale.setScalar(0.2 + q * big * 0.5); o.material.opacity = 0.9 * (1 - q); });
    for (let i = 0; i < (strong ? 22 : 14); i++) particle(SPH, i % 2 ? 0xffd060 : color, c, rnd(0.1, 0.22), rnd(350, 600), new T.Vector3(rnd(-1, 1), rnd(-0.2, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(4, 9)));
    for (let i = 0; i < 6; i++) particle(SPH, 0x5a5a5a, c.clone().add(new T.Vector3(rnd(-0.6, 0.6), 0, rnd(-0.6, 0.6))), rnd(0.4, 0.7), 900, new T.Vector3(rnd(-0.4, 0.4), rnd(1, 2), rnd(-0.4, 0.4)), 1.2, true);
    groundRing(k, color, 0.6, strong ? 6 : 4, 520);
    if (strong) FX.flashScreen(color, 0.3);
    FX.shake(strong ? 0.45 : 0.18, 260);
  };
  // ice shards bursting out, frost ring on the ground
  FX.shards = function (k, color) {
    const c = chest(k);
    for (let i = 0; i < 12; i++) {
      const v = new T.Vector3(rnd(-1, 1), rnd(-0.3, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(3, 6)), m = new T.Mesh(OCT, light(i % 3 ? color : 0xffffff, 0.95));
      m.position.copy(c); m.scale.set(0.1, 0.1, 0.45); m.lookAt(c.clone().add(v)); add3(m);
      FX.anim(520, q => { m.position.copy(c).addScaledVector(v, ease(q) * 0.5); m.material.opacity = 0.95 * (1 - q); }, () => { rem3(m); m.material.dispose(); });
    }
    groundRing(k, 0xdff6ff, 0.5, 3.5, 600);
    FX.burst(k, 0xffffff, 10);
  };
  // jagged lightning bolt from the sky with a white flash
  FX.lightning = function (k, color) {
    const end = chest(k), pts = [end.clone().add(new T.Vector3(rnd(-2, 2), 16, rnd(-2, 2)))];
    for (let i = 1; i < 9; i++) pts.push(pts[0].clone().lerp(end, i / 9).add(new T.Vector3(rnd(-0.9, 0.9), 0, rnd(-0.9, 0.9))));
    pts.push(end);
    const g = new T.Group();
    for (let i = 0; i < pts.length - 1; i++) [[0.09, 0xffffff, 1], [0.32, color, 0.5]].forEach(([r, c, o]) => {
      const len = pts[i].distanceTo(pts[i + 1]), seg = new T.Mesh(new T.CylinderGeometry(r, r, len, 5), light(c, o));
      seg.position.copy(pts[i]).lerp(pts[i + 1], 0.5); seg.quaternion.setFromUnitVectors(UP, pts[i + 1].clone().sub(pts[i]).normalize()); g.add(seg);
    });
    temp(g, 380, (q, o) => { o.visible = q < 0.2 || (q > 0.32 && q < 0.5) || (q > 0.62 && q < 0.75); });
    FX.flashScreen(0xffffff, 0.45); FX.shake(0.3, 250);
  };
  // poison cloud swelling around the target
  FX.cloud = function (k, color) {
    const c = chest(k);
    for (let i = 0; i < 10; i++) particle(SPH, i % 2 ? color : 0x4a8a2a, c.clone().add(new T.Vector3(rnd(-1, 1), rnd(-0.8, 0.6), rnd(-1, 1))), rnd(0.35, 0.6), rnd(800, 1100), new T.Vector3(rnd(-0.3, 0.3), rnd(0.2, 0.6), rnd(-0.3, 0.3)), 1.6, true);
    FX.flash(k, 0x60c020);
  };
  // dark orbs spiralling into the target
  FX.vortex = function (k, color) {
    const c = chest(k);
    for (let i = 0; i < 12; i++) {
      const m = new T.Mesh(SPH, light(i % 2 ? color : 0x2a0a40, 0.95)), a0 = i / 12 * Math.PI * 2, r0 = rnd(1.6, 2.4); m.scale.setScalar(0.16); add3(m);
      FX.anim(560, q => { const a = a0 + q * 6, r = r0 * (1 - ease(q)); m.position.set(c.x + Math.cos(a) * r, c.y + (0.5 - q) * 1.2, c.z + Math.sin(a) * r); m.material.opacity = 0.95 * (1 - q * 0.6); }, () => { rem3(m); m.material.dispose(); });
    }
    setTimeout(() => ctx() && FX.burst(k, color, 14), 520);
  };
  // stolen life flowing from one actor back to another
  FX.drain = function (from, to, color) {
    if (!mesh(from) || !mesh(to)) return;
    const a = chest(from), b = chest(to);
    for (let i = 0; i < 8; i++) setTimeout(() => {
      if (!ctx()) return;
      const m = new T.Mesh(SPH, light(color, 0.95)), lift = rnd(0.5, 1.6); m.scale.setScalar(0.18); add3(m);
      FX.anim(420, q => { m.position.lerpVectors(a, b, q); m.position.y += Math.sin(q * Math.PI) * lift; }, () => { rem3(m); m.material.dispose(); });
    }, i * 50);
  };
  // pillar of light (holy strike, healing)
  FX.pillar = function (k, color) {
    const f = feet(k), beam = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 18, 20, 1, true), light(color, 0.6));
    beam.position.set(f.x, f.y + 9, f.z);
    temp(beam, 800, (q, o) => { const w = q < 0.2 ? q / 0.2 : 1 - (q - 0.2) / 0.8; o.scale.set(w, 1, w); o.material.opacity = 0.6 * w; });
    for (let i = 0; i < 10; i++) particle(OCT, 0xffffff, f.clone().add(new T.Vector3(rnd(-0.9, 0.9), rnd(0, 1.5), rnd(-0.9, 0.9))), 0.1, 900, new T.Vector3(0, rnd(2, 4), 0));
    groundRing(k, color, 0.5, 2.6, 700);
  };
  // ground slam: shockwave, flying rocks and dust
  FX.quake = function (k, color) {
    const f = feet(k);
    groundRing(k, 0xc8a060, 0.5, 6, 600); groundRing(k, 0xffffff, 0.3, 4, 400);
    for (let i = 0; i < 9; i++) {
      const m = new T.Mesh(new T.DodecahedronGeometry(rnd(0.15, 0.35), 0), new T.MeshLambertMaterial({ color: 0x7a6a58, flatShading: true }));
      const v = new T.Vector3(rnd(-1, 1), 0, rnd(-1, 1)).normalize().multiplyScalar(rnd(2, 4)); let vy = rnd(4, 7);
      m.position.copy(f); temp(m, 700, (q, o) => { const t = q * 0.7; o.position.set(f.x + v.x * t, f.y + Math.max(0, vy * t - 12 * t * t), f.z + v.z * t); o.rotation.x += 0.2; o.rotation.z += 0.15; });
    }
    for (let i = 0; i < 8; i++) particle(SPH, 0xb8a888, f.clone().add(new T.Vector3(rnd(-1.5, 1.5), 0.3, rnd(-1.5, 1.5))), rnd(0.4, 0.7), 800, new T.Vector3(rnd(-1, 1), rnd(0.5, 1.2), rnd(-1, 1)), 1.4, true);
    FX.shake(0.55, 380);
  };
  // thorns erupting from the ground under the target
  FX.spikes = function (k, color) {
    const f = feet(k);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + rnd(0, 0.5), r = i ? rnd(0.4, 1.4) : 0, m = new T.Mesh(new T.ConeGeometry(0.3, 2.4, 5), new T.MeshLambertMaterial({ color: i % 2 ? 0x4a7a2a : 0x6a5a30, flatShading: true }));
      m.position.set(f.x + Math.cos(a) * r, f.y, f.z + Math.sin(a) * r); m.rotation.set(rnd(-0.4, 0.4), 0, rnd(-0.4, 0.4));
      temp(m, 900, (q, o) => { const h = q < 0.15 ? q / 0.15 : q > 0.7 ? 1 - (q - 0.7) / 0.3 : 1; o.scale.set(1, Math.max(0.01, h), 1); o.position.y = f.y + h * 1.1; });
    }
    for (let i = 0; i < 10; i++) particle(SPH, color, f.clone().setY(f.y + 0.5), 0.12, 600, new T.Vector3(rnd(-2, 2), rnd(2, 4), rnd(-2, 2)));
    FX.shake(0.25, 220);
  };
  // attacks from above: lightning, a holy beam, an ice storm, or an arcane seal
  FX.strike = function (k, elem, color, onHit) {
    const hit = (ms) => setTimeout(() => ctx() && onHit && onHit(), ms);
    if (elem === 'ice') {
      const c = chest(k);
      for (let i = 0; i < 16; i++) setTimeout(() => {
        if (!ctx()) return;
        const from = c.clone().add(new T.Vector3(rnd(-2, 2), 10, rnd(-2, 2))), to = c.clone().add(new T.Vector3(rnd(-1.2, 1.2), rnd(-1, 0.5), rnd(-1.2, 1.2)));
        const m = new T.Mesh(OCT, light(i % 2 ? color : 0xffffff, 0.95)); m.scale.set(0.12, 0.5, 0.12); add3(m);
        FX.anim(260, q => m.position.lerpVectors(from, to, q * q), () => { rem3(m); m.material.dispose(); });
      }, i * 22);
      return hit(560);
    }
    if (elem === 'holy') { FX.pillar(k, color); return hit(260); }
    if (elem === 'arcane') {
      const f = feet(k), seal = new T.Group();
      [[1.6, 1.75, 48], [1.1, 1.18, 6], [0.7, 0.76, 3]].forEach(([r0, r1, n]) => seal.add(new T.Mesh(new T.RingGeometry(r0, r1, n), light(color, 0.95))));
      seal.rotation.x = -Math.PI / 2; seal.position.copy(f);
      temp(seal, 600, (q, o) => { o.rotation.z = q * 4; o.scale.setScalar(1.4 - q * 0.6); o.children.forEach(c => { c.material.opacity = 0.95 * (q < 0.8 ? 1 : (1 - q) / 0.2); }); });
      return hit(480);
    }
    FX.lightning(k, color); return hit(120); // lightning
  };

  // ---------- show and feel ----------
  // the skill's name flashes over the battlefield
  FX.banner = function (text, color) {
    const el = document.createElement('div'); el.className = 'fxbanner'; el.textContent = text;
    el.style.setProperty('--c', '#' + new T.Color(color || 0xffffff).getHexString());
    document.getElementById('fx').append(el); setTimeout(() => el.remove(), 1300);
  };
  // a turning magic circle at the caster's feet
  FX.circle = function (k, color) {
    if (!mesh(k)) return;
    const g = new T.Group();
    [[1.45, 1.6, 48], [1.0, 1.08, 6], [1.18, 1.24, 3], [0.55, 0.6, 32]].forEach(([r0, r1, n], i) => { const m = new T.Mesh(new T.RingGeometry(r0, r1, n), light(color, 0.9)); m.userData.dir = i % 2 ? -1 : 1; g.add(m); });
    g.rotation.x = -Math.PI / 2; g.position.copy(feet(k));
    temp(g, 900, (q, o) => { o.children.forEach(c => { c.rotation.z = q * 3 * c.userData.dir; c.material.opacity = 0.9 * (q < 0.15 ? q / 0.15 : q > 0.75 ? (1 - q) / 0.25 : 1); }); o.scale.setScalar(0.8 + q * 0.4); });
    for (let i = 0; i < 8; i++) particle(SPH, color, feet(k).add(new T.Vector3(rnd(-1.3, 1.3), 0.1, rnd(-1.3, 1.3))), 0.08, 700, new T.Vector3(0, rnd(1.5, 3), 0));
  };
  FX.shake = (amp, ms) => { const s = ctx(); if (s && amp >= (s.shakeUntil > performance.now() ? s.shakeAmp : 0)) { s.shakeAmp = amp; s.shakeUntil = performance.now() + ms; } };
  FX.flashScreen = function (color, alpha) {
    const el = document.createElement('div'); el.className = 'fxflash';
    el.style.setProperty('--c', '#' + new T.Color(color).getHexString()); el.style.setProperty('--a', alpha);
    document.getElementById('fx').append(el); setTimeout(() => el.remove(), 320);
  };

  // particles flying out of an actor's chest
  FX.burst = function (k, color, n) {
    if (!mesh(k)) return;
    const g = new T.Group(), c = chest(k), vel = [];
    for (let i = 0; i < (n || 14); i++) {
      const p = new T.Mesh(new T.SphereGeometry(0.09 + Math.random() * 0.08, 6, 5), glow(color)); p.position.copy(c); g.add(p);
      vel.push(new T.Vector3(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).normalize().multiplyScalar(2 + Math.random() * 2));
    }
    temp(g, 480, (q, o) => o.children.forEach((p, i) => { p.position.copy(c).addScaledVector(vel[i], ease(q)); p.material.opacity = 0.9 * (1 - q); }));
  };

  // rising ring and sparkles; optional floating text
  FX.heal = function (k, text, color, cls) {
    color = color || 0x7dff8a;
    const m = mesh(k); if (!m) return;
    const base = m.position.clone(), h = tall(k);
    const ring = new T.Mesh(new T.TorusGeometry(0.9, 0.06, 6, 28), glow(color)); ring.rotation.x = Math.PI / 2;
    temp(ring, 800, (q, o) => { o.position.set(base.x, base.y + q * h, base.z); o.material.opacity = 0.9 * (1 - q); });
    const g = new T.Group(), seeds = [];
    for (let i = 0; i < 12; i++) { g.add(new T.Mesh(new T.OctahedronGeometry(0.08), glow(color))); seeds.push([Math.random() * 6.28, 0.4 + Math.random() * 0.5, Math.random() * 0.3]); }
    temp(g, 900, (q, o) => o.children.forEach((p, i) => { const [a, r, d] = seeds[i], kk = Math.max(0, q - d) / (1 - d); p.position.set(base.x + Math.cos(a + kk * 3) * r, base.y + kk * h * 1.2, base.z + Math.sin(a + kk * 3) * r); p.material.opacity = 1 - kk; }));
    if (text) FX.number(k, text, cls || 'heal');
  };

  // expanding colored aura (buffs)
  FX.aura = function (k, color) {
    if (!mesh(k)) return;
    const sph = new T.Mesh(new T.SphereGeometry(1, 18, 14), glow(color, 0.45)); sph.position.copy(chest(k));
    temp(sph, 700, (q, o) => { o.scale.set(0.6 + q * 1.2, 0.9 + q * 1.6, 0.6 + q * 1.2); o.material.opacity = 0.45 * (1 - q); });
    FX.flash(k, color);
  };

  // translucent bubble shield (defend)
  FX.shield = function (k) {
    if (!mesh(k)) return;
    const sph = new T.Mesh(new T.SphereGeometry(1.5, 20, 14), glow(0x7fb8ff, 0.35)); sph.position.copy(chest(k));
    temp(sph, 900, (q, o) => { o.scale.setScalar(q < 0.2 ? q / 0.2 : 1); o.material.opacity = 0.35 * (q < 0.7 ? 1 : (1 - q) / 0.3); });
  };

  // stars circling the head (stun)
  FX.stars = function (k) {
    if (!mesh(k)) return;
    const g = new T.Group(), c = top(k);
    for (let i = 0; i < 4; i++) g.add(new T.Mesh(new T.OctahedronGeometry(0.14), glow(0xffe14a, 1)));
    temp(g, 1000, (q, o) => o.children.forEach((p, i) => { const a = q * 9 + i * Math.PI / 2; p.position.set(c.x + Math.cos(a) * 0.6, c.y - 0.2, c.z + Math.sin(a) * 0.6); p.material.opacity = q > 0.8 ? (1 - q) * 5 : 1; }));
  };

  // green bubbles (poison) with damage text
  FX.poison = function (k, dmg) {
    if (!mesh(k)) return;
    const g = new T.Group(), c = chest(k), seeds = [];
    for (let i = 0; i < 10; i++) { g.add(new T.Mesh(new T.SphereGeometry(0.1, 6, 5), glow(0x8fe04a))); seeds.push([(Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, Math.random() * 0.4]); }
    temp(g, 800, (q, o) => o.children.forEach((p, i) => { const [x, z, d] = seeds[i], kk = Math.max(0, q - d) / (1 - d); p.position.set(c.x + x, c.y - 0.6 + kk * 2, c.z + z); p.material.opacity = 1 - kk; }));
    FX.flash(k, 0x60c020);
    if (dmg) FX.number(k, dmg, 'poison');
  };

  // fall over (defeat)
  FX.die = function (k) {
    const a = actor(k); if (!a) return;
    const m = a.mesh, y0 = a.home.y;
    m.rotation.order = 'YXZ'; // tilt in the model's own frame, so it always falls backwards
    FX.anim(700, q => { const e = ease(q); m.rotation.x = -e * 1.45; m.position.y = y0 - e * 0.25; });
    FX.burst(k, 0x888888, 18);
  };

  // turn and run off (successful flee)
  FX.flee = function (k) {
    const a = actor(k); if (!a) return;
    const m = a.mesh, dir = ctx().dir, s = a.side === 'hero' ? -1 : 1;
    m.rotation.y += Math.PI;
    FX.anim(600, q => { m.position.set(a.home.x + dir.x * s * q * 4, m.position.y, a.home.z + dir.z * s * q * 4); });
  };
})();
