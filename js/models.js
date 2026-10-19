// Low-poly models built from primitives: heroes (also used for humanoid monsters) and every monster shape.
(function () {
  const T = THREE;
  const mat = (c, extra) => new T.MeshLambertMaterial(Object.assign({ color: c }, extra));
  const glow = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: o != null, opacity: o == null ? 1 : o });
  // c is a color (hex, string or THREE.Color) or a ready material
  const box = (w, h, d, c) => new T.Mesh(new T.BoxGeometry(w, h, d), c && c.isMaterial ? c : mat(c));
  const ball = (r, c, ws, hs) => new T.Mesh(new T.SphereGeometry(r, ws || 12, hs || 9), c && c.isMaterial ? c : mat(c));
  const add = (p, m, x, y, z) => { m.position.set(x || 0, y || 0, z || 0); p.add(m); return m; };
  const M = window.Models = { mat, box, add };
  // high quality: swap each built model's Lambert materials for standard (per-pixel) ones and let it cast and catch shadows
  const finish = g => {
    if (!M.hq) return g;
    const done = new Map();
    g.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; // self-shadowing at the shadow map's resolution only scratches faces
      const m = o.material;
      if (!m || !m.isMeshLambertMaterial) return;
      if (!done.has(m)) done.set(m, new T.MeshStandardMaterial({ color: m.color, emissive: m.emissive, emissiveIntensity: m.emissiveIntensity, transparent: m.transparent, opacity: m.opacity,
        side: m.side, flatShading: m.flatShading, map: m.map, roughness: m.emissive.getHex() ? 0.35 : 0.8, metalness: m.emissive.getHex() ? 0.3 : 0 }));
      o.material = done.get(m);
    });
    return g;
  };

  // which weapon each job holds, and how each job dresses
  const WEAPON_OF = { knight: 'sword', hero: 'greatsword', mage: 'staff', healer: 'wand', ranger: 'bow', necromancer: 'scythe' };
  const ARMORED = { knight: 1, hero: 1 }, ROBED = { mage: 1, healer: 1, necromancer: 1 };
  const TRIM = { mage: 0x3a6ad0, healer: 0xe0c060, necromancer: 0x8a3fd0 };
  // weapon look by tier: iron, steel, gold, crystal, legendary, then the realm tiers: mithril, dragonfire, seraph, titan jade, divine
  const TIER = [0x9a8a7a, 0xc8d0d8, 0xe8c460, 0x7fd8ff, 0xd09aff, 0xb8f4ff, 0xff6a3a, 0xfff0a0, 0x6affc0, 0xff8aff];
  const cyl = (rt, rb, h, c, seg) => new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 10), c && c.isMaterial ? c : mat(c));

  // a weapon, grip at the origin; tiers 3+ glow
  M.weapon = function (kind, tier) {
    const w = new T.Group(), t = Math.max(0, Math.min(9, tier | 0)), col = TIER[t];
    const edge = t >= 3 ? mat(col, { emissive: col, emissiveIntensity: t >= 5 ? 0.95 : 0.55 }) : mat(col), gold = mat(0xd8b050), wood = mat(0x6b4a2a);
    if (kind === 'sword' || kind === 'greatsword') {
      const k = kind === 'greatsword' ? 1.45 : 1;
      add(w, box(0.07 * k, 0.95 * k, 0.15 * k, edge), 0, 0.12 + 0.48 * k, 0);
      add(w, box(0.38 * k, 0.06, 0.1, gold), 0, 0.12, 0);
      add(w, cyl(0.035, 0.035, 0.26, 0x4a2a14, 6), 0, -0.02, 0);
      add(w, ball(0.05, gold, 8, 6), 0, -0.17, 0);
      w.rotation.x = 1.15; // held forward, ready to swing
    } else if (kind === 'staff' || kind === 'wand') {
      const len = kind === 'wand' ? 1.0 : 1.9, top = len - 0.5;
      add(w, cyl(0.035, 0.045, len, kind === 'wand' ? 0xf0e8d8 : 0x6b4a2a, 6), 0, len / 2 - 0.5, 0);
      if (kind === 'wand') {
        add(w, box(0.06, 0.32, 0.06, gold), 0, top + 0.12, 0); add(w, box(0.26, 0.06, 0.06, gold), 0, top + 0.16, 0);
        add(w, ball(0.09, mat(col, { emissive: col, emissiveIntensity: 0.7 }), 10, 8), 0, top + 0.16, 0.05);
      } else {
        add(w, new T.Mesh(new T.TorusGeometry(0.11, 0.025, 6, 14), gold), 0, top, 0);
        add(w, new T.Mesh(new T.OctahedronGeometry(0.14), mat(col, { emissive: col, emissiveIntensity: 0.6 })), 0, top + 0.2, 0).scale.y = 1.6;
      }
    } else if (kind === 'bow') {
      const arc = add(w, new T.Mesh(new T.TorusGeometry(0.55, 0.035, 6, 18, Math.PI), t >= 2 ? edge : wood), 0, 0.2, 0.08);
      arc.rotation.z = -Math.PI / 2; arc.rotation.y = Math.PI / 2;
      add(w, cyl(0.008, 0.008, 1.1, 0xf0f0e0, 4), 0, 0.2, 0.08);
    } else if (kind === 'scythe') {
      add(w, cyl(0.04, 0.045, 2.3, 0x2a2228, 6), 0, 0.55, 0);
      const blade = add(w, new T.Mesh(new T.TorusGeometry(0.55, 0.06, 4, 16, Math.PI * 0.55), edge), 0.05, 1.45, 0);
      blade.rotation.z = Math.PI * 0.35; blade.scale.z = 0.4;
    } else if (kind === 'axe') {
      add(w, cyl(0.04, 0.04, 1.0, 0x5a3e2a, 6), 0, 0.3, 0); add(w, box(0.05, 0.38, 0.32, edge), 0, 0.7, 0.16);
      w.rotation.x = 0.9;
    } else if (kind === 'hammer') {
      add(w, cyl(0.045, 0.045, 1.2, 0x5a3e2a, 6), 0, 0.4, 0); add(w, box(0.34, 0.3, 0.5, 0x7a7a80), 0, 0.95, 0);
      w.rotation.x = 0.9;
    }
    return w;
  };

  // a person: legs (thigh, knee, shin, boot), hips and belt, chest, shoulders, neck, a face, arms (elbow, hand)
  // and clothes by job: armor for knights and heroes, robes for casters, a vest and quiver for archers
  M.hero = function (look, cls) {
    const g = new T.Group(), b = look.build || 1, kind = WEAPON_OF[cls] || cls, robed = ROBED[cls], armored = ARMORED[cls];
    const skin = mat(look.skin), cloth = mat(look.outfit), pants = mat(new T.Color(look.outfit).multiplyScalar(0.55)), leather = mat(0x5b3a1e), boot = mat(0x3a2a1e);
    const legs = [-1, 1].map(s => {
      const p = add(g, new T.Group(), s * 0.15 * b, 0.95);
      add(p, cyl(0.13 * b, 0.11 * b, 0.46, pants), 0, -0.23);
      add(p, ball(0.1 * b, pants, 8, 6), 0, -0.47);
      add(p, cyl(0.105 * b, 0.085 * b, 0.4, boot), 0, -0.68);
      add(p, box(0.19 * b, 0.12, 0.32, boot), 0, -0.9, 0.06);
      return p;
    });
    add(g, cyl(0.27 * b, 0.29 * b, 0.24, pants), 0, 1.02).scale.z = 0.8;
    add(g, cyl(0.3 * b, 0.3 * b, 0.08, leather), 0, 1.13).scale.z = 0.82;
    add(g, box(0.11, 0.09, 0.03, 0xd8b050), 0, 1.13, 0.25);
    add(g, cyl(0.35 * b, 0.28 * b, 0.56, cloth), 0, 1.44).scale.z = 0.72;
    [-1, 1].forEach(s => add(g, ball(0.13, cloth, 10, 8), s * (0.33 * b + 0.03), 1.66));
    add(g, cyl(0.085, 0.09, 0.14, skin), 0, 1.77);
    if (robed) {
      add(g, cyl(0.31 * b, 0.47 * b, 0.62, mat(look.outfit, { side: T.DoubleSide }), 14), 0, 0.73).scale.z = 0.85;
      add(g, cyl(0.475 * b, 0.475 * b, 0.05, TRIM[cls], 14), 0, 0.43).scale.z = 0.85;
      add(g, box(0.08, 0.5, 0.02, TRIM[cls]), 0, 1.42, 0.205);
    }
    if (armored) {
      const plate = mat(cls === 'hero' ? 0xe8d8a0 : 0xb8c0c8, { flatShading: true });
      add(g, box(0.5 * b, 0.42, 0.08, plate), 0, 1.47, 0.2);
      [-1, 1].forEach(s => add(g, new T.Mesh(new T.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), plate), s * (0.34 * b + 0.04), 1.7));
      if (cls === 'hero') add(g, new T.Mesh(new T.CircleGeometry(0.08, 12), mat(0xd8a030)), 0, 1.5, 0.245);
    }
    if (cls === 'ranger') {
      add(g, box(0.52 * b, 0.4, 0.06, leather), 0, 1.45, 0.2);
      add(g, cyl(0.09, 0.08, 0.55, 0x6a4a2a, 8), 0.14, 1.45, -0.24).rotation.z = 0.35;
      [-0.03, 0.03].forEach((x, i) => add(g, box(0.04, 0.12, 0.02, i ? 0xc0302a : 0xf0f0f0), 0.27 + x, 1.78, -0.24));
    }
    const arms = [-1, 1].map(s => {
      const p = add(g, new T.Group(), s * (0.33 * b + 0.1), 1.64);
      add(p, cyl(0.078, 0.07, 0.36, cloth), 0, -0.18);
      add(p, ball(0.07, cloth, 8, 6), 0, -0.37);
      add(p, robed ? cyl(0.07, 0.13, 0.32, cloth) : cyl(0.065, 0.055, 0.32, armored ? 0x8a8a90 : skin), 0, -0.53);
      add(p, ball(0.075, skin, 8, 6), 0, -0.73).scale.set(1, 1.2, 0.8);
      return p;
    });
    const head = add(g, new T.Group(), 0, 2.02);
    add(head, ball(0.25, skin, 24, 18), 0, 0).scale.set(0.95, 1.08, 1);
    add(head, ball(0.2, skin, 24, 16), 0, -0.1, 0.03).scale.set(1, 0.8, 1); // fine spheres keep the jaw line smooth
    add(head, box(0.05, 0.08, 0.07, skin), 0, -0.02, 0.24);
    [-1, 1].forEach(s => {
      add(head, ball(0.06, skin, 8, 6), s * 0.24, 0, 0).scale.set(0.5, 1, 0.8);
      add(head, ball(0.045, 0xf4f4f0, 8, 6), s * 0.09, 0.03, 0.205);
      add(head, ball(0.028, look.eyes || 0x222222, 8, 6), s * 0.09, 0.03, 0.24);
      add(head, box(0.09, 0.022, 0.02, look.hair), s * 0.09, 0.1, 0.225).rotation.z = s * -0.12;
    });
    add(head, box(0.08, 0.016, 0.01, 0x8a3a3a), 0, -0.12, 0.215);
    const hairM = mat(look.hair), hs = look.hairStyle | 0;
    if (hs !== 3) {
      const cap = add(head, new T.Mesh(new T.SphereGeometry(0.27, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM), 0, 0.03, -0.02);
      cap.rotation.x = -0.25; cap.scale.set(0.97, 1.08, 1.02);
      if (hs === 1) add(head, box(0.48, 0.5, 0.14, hairM), 0, -0.18, -0.2);
      if (hs === 2) { add(head, ball(0.1, hairM, 8, 6), 0, 0.05, -0.3); add(head, cyl(0.06, 0.03, 0.42, hairM, 6), 0, -0.18, -0.34); }
    }
    const hat = look.hat | 0;
    if (hat === 1) { add(head, new T.Mesh(new T.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0x9aa1a8)), 0, 0.02); add(head, box(0.06, 0.24, 0.05, 0x9aa1a8), 0, 0.02, 0.29); }
    if (hat === 2) { add(head, cyl(0.45, 0.45, 0.04, look.cape, 20), 0, 0.2); add(head, new T.Mesh(new T.ConeGeometry(0.26, 0.7, 16), mat(look.cape)), 0, 0.55).rotation.z = 0.15; }
    if (hat === 3) add(head, new T.Mesh(new T.SphereGeometry(0.32, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(look.cape, { side: T.DoubleSide })), 0, 0.04, -0.04).rotation.x = -0.35;
    if (look.capeOn) { // hangs from the shoulders and flares out at the hem
      const cg = new T.PlaneGeometry(0.7 * b, 1.25, 1, 5), cp = cg.attributes.position;
      for (let i = 0; i < cp.count; i++) { const y = cp.getY(i), d = (0.625 - y) / 1.25; cp.setZ(i, -d * d * 0.35); cp.setX(i, cp.getX(i) * (1 + d * 0.35)); }
      cg.computeVertexNormals();
      add(g, new T.Mesh(cg, mat(look.cape, { side: T.DoubleSide })), 0, 1.1, -0.24);
    }
    if (kind) { const w = M.weapon(kind, look.wt); w.position.set(0, -0.76, 0.06); arms[1].add(w); }
    g.scale.setScalar(look.height || 1);
    g.userData = { legs, arms, head, t: 0 };
    return finish(g);
  };

  M.crown = function () {
    const g = new T.Group(), gold = mat(0xf0c040, { emissive: 0x6a4a00, side: T.DoubleSide });
    add(g, new T.Mesh(new T.CylinderGeometry(0.42, 0.48, 0.28, 10, 1, true), gold), 0, 0.14);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(g, new T.Mesh(new T.ConeGeometry(0.09, 0.3, 4), gold), Math.cos(a) * 0.44, 0.42, Math.sin(a) * 0.44); }
    add(g, ball(0.07, glow(0xff3050), 6, 5), 0, 0.18, 0.47);
    return g;
  };

  // a small sailing ship; the hero stands on the deck at userData.deck
  M.ship = function () {
    const g = new T.Group(), wood = mat(0x7a5232), deck = mat(0x9a7048), trim = mat(0x4a3220);
    add(g, box(3.2, 1.2, 8, wood), 0, 0.2);
    const bow = add(g, new T.Mesh(new T.ConeGeometry(1.6, 2.6, 4), wood), 0, 0.2, 5.25); bow.rotation.set(Math.PI / 2, Math.PI / 4, 0); bow.scale.set(1, 1, 0.55);
    add(g, box(3, 0.15, 8.2, deck), 0, 0.85);
    [-1.5, 1.5].forEach(x => add(g, box(0.12, 0.45, 8, trim), x, 1.1));
    add(g, box(2.4, 1.3, 2, mat(0xb08a5a)), 0, 1.5, -2.9);
    add(g, box(2.6, 0.15, 2.2, trim), 0, 2.2, -2.9);
    add(g, new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 6.5, 8), trim), 0, 4, 0.6);
    const sail = add(g, new T.Mesh(new T.PlaneGeometry(3.6, 3.4, 4, 4), mat(0xf4ecd8, { side: T.DoubleSide })), 0, 4.4, 0.75);
    const sp = sail.geometry.attributes.position; for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.cos(sp.getX(i) / 1.8 * 1.2) * 0.45); // billow
    sail.geometry.computeVertexNormals();
    add(g, new T.Mesh(new T.PlaneGeometry(0.9, 0.5), mat(0xc0302a, { side: T.DoubleSide })), 0.45, 7.05, 0.6);
    g.userData.deck = 0.93;
    return finish(g);
  };

  // plain townsfolk and gate guards
  const pick = a => a[Math.random() * a.length | 0];
  M.citizenLook = () => ({ skin: pick(['#f1c9a5', '#d9a47a', '#b97a52', '#8a5636']), hair: pick(['#2b1d14', '#5a3a22', '#a8642a', '#d9b45a', '#e8e4dc']), hairStyle: Math.random() * 4 | 0,
    outfit: pick(['#8a5a3a', '#4a6a8a', '#7a3a4a', '#5a7a4a', '#c8a060', '#6a4a7a', '#3a3a3a']), cape: '#7a2a2a', capeOn: false, hat: Math.random() < 0.3 ? 3 : 0,
    eyes: '#2a3b5a', height: 0.88 + Math.random() * 0.15, build: 0.9 + Math.random() * 0.25 });
  M.guardLook = () => ({ ...M.citizenLook(), outfit: '#3a5a8a', cape: '#8a2a2a', capeOn: true, hat: 1, height: 1.02, build: 1.08 });

  M.walk = function (g, moving, dt) {
    const u = g.userData; u.t += dt * (moving ? 10 : 0);
    const s = moving ? Math.sin(u.t) * 0.6 : 0;
    u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s; u.arms[0].rotation.x = -s * 0.8; u.arms[1].rotation.x = s * 0.5;
  };

  // outfit and weapon for monsters drawn as people
  const PEOPLE = { goblin: [0x5a4630, null, 0.75], skeleton: [0x4a4a52, 'knight', 1], troll: [0x4a5a3a, null, 1], mummy: [0xc8bf9a, null, 1], yeti: [0xdfe8ee, null, 1],
    imp: [0x6a1a10, null, 1], zombie: [0x4a4438, null, 1], reaper: [0x16141c, 'scythe', 1], lichking: [0x2a1f3a, 'scythe', 1, 0x80ffd0] };

  M.enemy = function (type) {
    const e = ENEMIES[type], c = e.color, g = new T.Group();
    const S = e.shape;
    if (S === 'slime') {
      add(g, ball(0.8, mat(c, { transparent: true, opacity: 0.88 }), 14, 10), 0, 0.55).scale.y = 0.7;
      [-0.25, 0.25].forEach(x => add(g, ball(0.1, 0x111111, 6, 6), x, 0.75, 0.62));
    } else if (S === 'beast') {
      // rounded four-legged body: barrel, chest, neck, head with a snout, tapered legs and a tail
      const fur = mat(c), dark = mat(new T.Color(c).multiplyScalar(0.6));
      add(g, ball(0.5, fur, 18, 12), 0, 0.98, -0.1).scale.set(0.95, 0.85, 1.75);
      add(g, ball(0.44, fur, 16, 12), 0, 1.02, 0.5).scale.set(1, 1.05, 1);
      add(g, cyl(0.2, 0.3, 0.55, fur, 12), 0, 1.25, 0.82).rotation.x = 0.9;
      add(g, ball(0.27, fur, 16, 12), 0, 1.38, 1.02).scale.set(0.95, 0.9, 1.1);
      add(g, cyl(0.1, 0.16, 0.38, fur, 10), 0, 1.3, 1.3).rotation.x = Math.PI / 2 - 0.15;
      add(g, ball(0.06, 0x1a1a1a, 8, 6), 0, 1.33, 1.5);
      [-0.11, 0.11].forEach(x => add(g, ball(0.035, 0x111111, 8, 6), x, 1.46, 1.21));
      [[-.22, .5], [.22, .5], [-.22, -.62], [.22, -.62]].forEach(([x, z]) => {
        add(g, cyl(0.13, 0.08, 0.5, fur, 10), x, 0.6, z); add(g, cyl(0.07, 0.06, 0.4, fur, 8), x, 0.22, z); add(g, ball(0.075, dark, 8, 6), x, 0.04, z + 0.03).scale.set(1, 0.6, 1.3);
      });
      add(g, cyl(0.07, 0.025, 0.7, fur, 8), 0, 1.15, -1.05).rotation.x = -0.95;
      [-0.13, 0.13].forEach(x => add(g, new T.Mesh(new T.ConeGeometry(0.08, 0.2, 8), fur), x, 1.6, 0.95).rotation.z = x * -1.5);
      if (type === 'boar') [-0.12, 0.12].forEach(x => add(g, new T.Mesh(new T.ConeGeometry(0.035, 0.2, 6), mat(0xf0e8d0)), x, 1.22, 1.42).rotation.x = -0.6);
      if (e.mane) add(g, ball(0.42, mat(e.mane, { flatShading: true }), 10, 8), 0, 1.25, 0.8).scale.set(1, 1.1, 0.7);
      if (e.horn) add(g, new T.Mesh(new T.ConeGeometry(0.09, 0.45, 6), mat(0xe8e0d0)), 0, 1.35, 1.32).rotation.x = 1.1;
    } else if (S === 'golem') {
      const m = e.glow ? mat(c, { emissive: e.glow, emissiveIntensity: 0.35 }) : mat(c);
      add(g, box(1.6, 1.6, 1.1, m), 0, 1.9); add(g, box(0.9, 0.7, 0.8, m), 0, 3.0);
      [-1.05, 1.05].forEach(x => add(g, box(0.5, 1.6, 0.6, m), x, 1.6)); [-0.45, 0.45].forEach(x => add(g, box(0.55, 1.1, 0.6, m), x, 0.55));
      add(g, box(0.5, 0.1, 0.05, glow(e.glow || 0xffb347)), 0, 3.05, 0.42);
      if (e.glow) [[0.5, 2.2], [-0.4, 1.5], [0.1, 2.5]].forEach(([x, y]) => add(g, box(0.3, 0.08, 0.02, glow(e.glow)), x, y, 0.56));
    } else if (S === 'dragon') {
      add(g, ball(1.6, c, 14, 10), 0, 2.4).scale.set(1, 0.8, 1.6);
      add(g, new T.Mesh(new T.CylinderGeometry(0.4, 0.7, 2.2, 8), mat(c)), 0, 3.6, 2.0).rotation.x = 0.7;
      add(g, ball(0.55, c, 16, 12), 0, 4.5, 2.75).scale.set(0.9, 0.75, 1.2); // head, long jaw and swept-back horns
      add(g, cyl(0.13, 0.4, 0.95, mat(c), 10), 0, 4.35, 3.35).rotation.x = Math.PI / 2;
      [-0.22, 0.22].forEach(x => { add(g, new T.Mesh(new T.ConeGeometry(0.1, 0.7, 8), mat(0xe8dcc0)), x, 4.85, 2.45).rotation.x = -2.3; add(g, ball(0.07, glow(0xffc040), 8, 6), x, 4.62, 3.05); });
      [-1, 1].forEach(s => { // bat-like wing: a fan of membrane swept back from the shoulder and raised
        const wg = add(g, new T.Group(), s * 0.7, 3.3, 0.3); wg.rotation.z = s * 0.5;
        add(wg, new T.Mesh(new T.CircleGeometry(3, 6, s > 0 ? -0.6 : Math.PI - 1.2, 1.8), mat(e.wing || 0x4a2468, { side: T.DoubleSide }))).rotation.x = -Math.PI / 2; });
      add(g, new T.Mesh(new T.ConeGeometry(0.5, 3, 8), mat(c)), 0, 2, -3).rotation.x = -Math.PI / 2;
      g.scale.setScalar(1.4);
    } else if (S === 'treant') {
      const bark = mat(c), leaf = mat(0x3f7a3a, { flatShading: true });
      add(g, new T.Mesh(new T.CylinderGeometry(0.9, 1.3, 4, 8), bark), 0, 2);
      [-1, 1].forEach(s => { const arm = add(g, new T.Mesh(new T.CylinderGeometry(0.25, 0.4, 2.6, 6), bark), s * 1.3, 3.2, 0.3); arm.rotation.z = s * 0.9; arm.rotation.x = -0.3; });
      [-0.5, 0.5].forEach(x => add(g, new T.Mesh(new T.CylinderGeometry(0.35, 0.5, 1.2, 6), bark), x, 0.4, 0));
      [[0, 5, 0, 1.8], [1.1, 4.4, 0.3, 1.2], [-1.1, 4.6, -0.2, 1.3], [0.2, 4.4, -1, 1.2]].forEach(([x, y, z, r]) => add(g, new T.Mesh(new T.IcosahedronGeometry(r, 0), leaf), x, y, z));
      [-0.32, 0.32].forEach(x => add(g, ball(0.14, glow(0xffe060), 6, 5), x, 3.1, 1.05));
      g.scale.setScalar(1.3);
    } else if (S === 'scorpion') {
      add(g, ball(0.7, c, 10, 8), 0, 0.55).scale.set(1, 0.5, 1.4);
      [-1, 1].forEach(s => {
        for (let i = 0; i < 3; i++) add(g, box(0.9, 0.08, 0.08, c), s * 0.75, 0.35, 0.4 - i * 0.4).rotation.z = s * 0.4;
        add(g, ball(0.25, c, 8, 6), s * 0.6, 0.6, 1.25).scale.set(1, 0.6, 1.6);
      });
      for (let i = 0; i < 5; i++) add(g, ball(0.22 - i * 0.02, c, 8, 6), 0, 0.7 + i * 0.32, -0.8 - Math.sin(i * 0.5) * 0.5 + i * 0.12);
      add(g, new T.Mesh(new T.ConeGeometry(0.1, 0.4, 6), mat(0x2a1a10)), 0, 2.15, -0.25).rotation.x = 2.4;
    } else if (S === 'wisp') {
      add(g, ball(0.55, glow(c, 0.85), 14, 10), 0, 1.3);
      add(g, ball(0.9, glow(c, 0.18), 14, 10), 0, 1.3);
      for (let i = 0; i < 3; i++) add(g, ball(0.12, glow(0xffffff), 6, 5), Math.cos(i * 2.1) * 0.9, 1.3, Math.sin(i * 2.1) * 0.9);
      g.userData.spin = true;
    } else if (S === 'ghost') {
      const m = mat(c, { transparent: true, opacity: 0.7, emissive: 0x30305a });
      add(g, new T.Mesh(new T.ConeGeometry(0.7, 1.9, 10, 1, true), m), 0, 0.95).rotation.x = Math.PI;
      add(g, ball(0.45, m, 12, 9), 0, 2.0);
      [-0.15, 0.15].forEach(x => add(g, ball(0.07, glow(0x80ffd0), 6, 5), x, 2.05, 0.38));
    } else if (S === 'fish') {
      add(g, ball(0.6, c, 12, 8), 0, 0.2).scale.set(0.6, 0.7, 1.4);
      add(g, new T.Mesh(new T.ConeGeometry(0.4, 0.6, 4), mat(c)), 0, 0.2, -0.95).rotation.x = Math.PI / 2;
      add(g, new T.Mesh(new T.ConeGeometry(0.15, 0.5, 4), mat(c)), 0, 0.7, 0);
      [-0.18, 0.18].forEach(x => add(g, ball(0.07, 0xfff0a0, 6, 5), x, 0.35, 0.7));
      add(g, box(0.3, 0.05, 0.05, 0xffffff), 0, 0.1, 0.85);
    } else if (S === 'crab') {
      add(g, ball(0.8, c, 12, 8), 0, 0.45).scale.set(1.3, 0.5, 1);
      [-1, 1].forEach(s => {
        for (let i = 0; i < 3; i++) add(g, box(0.7, 0.08, 0.08, c), s * 0.95, 0.25, -0.3 + i * 0.3).rotation.z = s * 0.5;
        add(g, ball(0.32, c, 8, 6), s * 0.9, 0.6, 0.8).scale.set(1, 0.7, 1.3);
        add(g, ball(0.07, 0x111111, 6, 5), s * 0.25, 0.85, 0.7);
      });
    } else if (S === 'serpent') {
      for (let i = 0; i < 6; i++) add(g, ball(0.5 - i * 0.05, c, 10, 8), 0, 0.25 + Math.sin(i * 1.1) * 0.35, -i * 0.75);
      add(g, new T.Mesh(new T.CylinderGeometry(0.35, 0.5, 1.8, 8), mat(c)), 0, 1.1, 0.4).rotation.x = -0.3;
      add(g, box(0.7, 0.45, 0.9, c), 0, 2.0, 0.75);
      [-0.2, 0.2].forEach(x => add(g, ball(0.08, glow(0xfff060), 6, 5), x, 2.15, 1.18));
      add(g, new T.Mesh(new T.ConeGeometry(0.25, 0.7, 4), mat(0x1a4a54)), 0, 2.45, 0.4).rotation.x = -0.5;
    } else if (S === 'kraken') {
      add(g, ball(2, c, 16, 12), 0, 1.4).scale.set(1, 1.3, 1);
      [-0.7, 0.7].forEach(x => add(g, ball(0.32, glow(0xffe060), 8, 6), x, 2.1, 1.6));
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, arm = new T.Group(); arm.position.set(Math.cos(a) * 1.8, 0, Math.sin(a) * 1.8); arm.rotation.y = -a; g.add(arm);
        for (let j = 0; j < 4; j++) add(arm, ball(0.42 - j * 0.08, c, 8, 6), j * 0.55, 0.3 + Math.sin(j * 0.9) * j * 0.45, 0);
      }
      g.userData.spin = true;
      g.scale.setScalar(1.3);
    } else {
      const [outfit, weapon, h, eyes] = PEOPLE[type] || [0x4a4a52, null, 1];
      const robed = type === 'reaper' || type === 'lichking';
      const w = M.hero({ skin: c, hair: e.beard || 0x333333, hairStyle: 3, outfit: e.outfit || outfit, cape: robed ? 0x2a1a3a : 0x333333, capeOn: robed,
        hat: e.hat != null ? e.hat : type === 'reaper' ? 3 : 0, eyes: e.eyes || eyes || 0xff4030, height: e.hgt || h, build: e.build || (type === 'troll' || type === 'yeti' ? 1.2 : 0.9), wt: e.boss ? 4 : 2 }, e.weapon || weapon);
      const hd = w.userData.head;
      if (e.beard) add(hd, new T.Mesh(new T.ConeGeometry(0.18, 0.42, 8), mat(e.beard)), 0, -0.3, 0.12).rotation.x = Math.PI;
      if (e.horns) [-1, 1].forEach(s => add(hd, new T.Mesh(new T.ConeGeometry(0.06, 0.38, 6), mat(0x2a1a14)), s * 0.16, 0.26, 0).rotation.z = -s * 0.5);
      if (e.halo) add(hd, new T.Mesh(new T.TorusGeometry(0.22, 0.03, 6, 20), glow(0xffe9a0)), 0, 0.42, 0).rotation.x = Math.PI / 2;
      if (e.wings) [-1, 1].forEach(s => { // feathered wings, or bat wings for demons
        const wg = new T.Group(); wg.position.set(s * 0.15, 1.55, -0.22); wg.rotation.y = s * 0.5; w.add(wg);
        if (e.bat) { const m2 = add(wg, new T.Mesh(new T.ConeGeometry(0.75, 1.5, 3), mat(e.wings, { side: T.DoubleSide, flatShading: true })), s * 0.6, 0.1, 0); m2.rotation.z = s * 1.9; m2.scale.z = 0.1; }
        else for (let k = 0; k < 3; k++) add(wg, box(0.9 - k * 0.2, 0.22, 0.04, e.wings), s * (0.45 - k * 0.05), 0.3 - k * 0.25, 0).rotation.z = s * (0.5 + k * 0.25);
      });
      g.add(w); g.userData.walker = w;
    }
    // bosses with a crown wear it on top of whatever shape they have
    if (e.crown) { const top = new T.Box3().setFromObject(g).max.y; const cr = M.crown(); cr.position.y = top - 0.08; g.add(cr); }
    if (e.scale) g.scale.multiplyScalar(e.scale);
    // height above the ground (or water surface) this monster sits at
    g.userData.yOff = e.water ? (type === 'kraken' ? -1.2 : type === 'crab' ? -0.25 : -0.1) : e.float ? 1 : 0;
    return finish(g);
  };
  // mounts: a griffin (a lion with eagle wings and a beak) or a young fire drake. Their wings are the Group children (they
  // beat in flight); seat: how high the rider sits above the mount's feet
  M.mount = function (kind) {
    if (kind === 'dragon') { const d = M.enemy('firedrake'); d.scale.multiplyScalar(0.62); d.userData.seat = 1.65; return d; }
    const g = M.enemy('lion'), feather = mat(0xf4ecd8, { side: T.DoubleSide });
    [-1, 1].forEach(s => {
      const wg = add(g, new T.Group(), s * 0.3, 1.32, 0.3); wg.rotation.z = s * 0.5;
      for (let k = 0; k < 4; k++) add(wg, box(1.6 - k * 0.28, 0.06, 0.38, feather), s * (0.8 - k * 0.1), 0, -k * 0.3).rotation.y = s * k * 0.14;
    });
    add(g, new T.Mesh(new T.ConeGeometry(0.1, 0.32, 6), mat(0xf0c040)), 0, 1.3, 1.52).rotation.x = Math.PI / 2 + 0.3; // beak
    g.scale.multiplyScalar(1.7); g.userData.seat = 2.3;
    return finish(g);
  };
})();
