// Minimap in the HUD (turns with the camera, letters on the rim act as a compass) and the full world map
// panel (north up). The ground picture is baked once from Terrain at 4 m per pixel; markers redraw at ~5 fps.
(function () {
  const TR = Terrain, H = TR.HALF, STEP = 4, VIEW = 110, $ = id => document.getElementById(id);
  const COL = { meadow: 0x78a862, forest: 0x4f7f45, mountain: 0x8a8478, desert: 0xd9b77a, ice: 0xe4edf2, magma: 0x3a3030, death: 0x4b4652, town: 0xd8c8a0, snow: 0xf2f6f8,
    human: 0x8fb860, beast: 0xc8b070, elf: 0x5fbf8a, giant: 0x5a8a4a, dwarf: 0x7a6a5a, angel: 0xeef0f4, dragon: 0x3a2a26, demon: 0x4a1c1c,
    storm: 0x6a8a5a, glass: 0xece0c4, marsh: 0x46583a, crystal: 0x8a7ab8, void: 0x2e2038 };
  const LIQ = { water: 0x3f86b8, lava: 0xff5a1a, ice: 0xa8d0e4, cloud: 0xf4f6fa };
  // where each region's name sits on the full map (checked against Terrain.biomeAt)
  const LABELS = [['forest', -90, -80], ['meadow', 95, 75], ['mountain', 185, -185], ['desert', 290, -100], ['ice', -60, -230], ['magma', -290, 110], ['death', 0, 300],
    ['human', 640, 0], ['beast', 452, 452], ['demon', 0, 640], ['dragon', -452, 452], ['giant', -640, 0], ['dwarf', -452, -452], ['angel', 0, -640], ['elf', 452, -452],
    ['storm', 1000, 0], ['glass', 309, 951], ['marsh', -809, 588], ['crystal', -809, -588], ['void', 309, -951]];

  let base = null, full = null;
  function bake() {
    const n = 2 * H / STEP, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const c = cv.getContext('2d'), img = c.createImageData(n, n), a = img.data, V = TR.VOLCANO;
    for (let j = 0, o = 0; j < n; j++) {
      let prev = null;
      for (let i = 0; i < n; i++, o += 4) {
        const x = -H + (i + 0.5) * STEP, z = -H + (j + 0.5) * STEP, h = TR.height(x, z), lq = TR.liquid(x, z);
        let v, f = 1;
        if (h < TR.liquidY(lq)) v = LIQ[lq];
        else if (Math.hypot(x - V.x, z - V.z) < 9) v = LIQ.lava; // volcano crater
        else { const b = TR.biomeAt(x, z); v = h > 14 && b !== 'town' ? COL.snow : COL[b]; f = Math.min(1.25, Math.max(0.75, 1 + (h - (prev == null ? h : prev)) * 0.08)); } // light from the west
        prev = h;
        a[o] = (v >> 16) * f; a[o + 1] = (v >> 8 & 255) * f; a[o + 2] = (v & 255) * f; a[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    return cv;
  }

  // one painter for both maps: world point (cx, cz) in the middle, `span` meters from middle to edge, turned by `yaw`
  function paint(cv, cx, cz, span, yaw, isFull) {
    const u = devicePixelRatio || 1, d = Math.round(cv.clientWidth * u); if (!d) return;
    if (cv.width !== d) cv.width = cv.height = d;
    // the minimap leaves a bezel ring (card color) around the map for the compass letters
    const c = cv.getContext('2d'), r = d / 2, rm = isFull ? r : r - 11 * u, k = rm / span, cs = Math.cos(yaw), sn = Math.sin(yaw);
    const css = getComputedStyle(document.body), tok = n => css.getPropertyValue('--' + n).trim(), panel = tok('panel'), ink = tok('ink');
    const fs = isFull ? Math.min(1, Math.max(0.75, d / u / 560)) : 1; // smaller labels on a phone-sized full map
    base = base || bake();
    c.clearRect(0, 0, d, d); c.save();
    if (!isFull) { c.beginPath(); c.arc(r, r, rm, 0, Math.PI * 2); c.clip(); }
    c.fillStyle = '#8a8478'; c.fillRect(0, 0, d, d);
    c.translate(r, r); c.rotate(yaw); c.scale(k, k); c.translate(-cx, -cz);
    c.drawImage(base, -H, -H, 2 * H, 2 * H);
    c.restore();
    // world -> canvas; on the minimap far markers stick to the map edge so they still point the way
    const at = (x, z) => {
      let dx = (x - cx) * k, dy = (z - cz) * k; const l = Math.hypot(dx, dy), m = rm - 6 * u, pin = !isFull && l > m;
      if (pin) { dx *= m / l; dy *= m / l; }
      return [r + dx * cs - dy * sn, r + dx * sn + dy * cs, pin];
    };
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    const label = (txt, q, dy, px, fam, col) => {
      c.font = '700 ' + px * u * fs + 'px ' + (fam || tok('body')); c.lineWidth = 3 * u; c.strokeStyle = panel;
      c.strokeText(txt, q[0], q[1] + dy * u); c.fillStyle = col || ink; c.fillText(txt, q[0], q[1] + dy * u);
    };
    const dot = (q, rad, col) => { c.beginPath(); c.arc(q[0], q[1], rad * u, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.lineWidth = 1.5 * u; c.strokeStyle = panel; c.stroke(); };
    // areas the hero can't enter yet carry the level they open at
    if (isFull) for (const [b, x, z] of LABELS) { const need = TR.areaLevel(x, z), lock = Game.S && need > Game.S.lvl; label(L(BIOMES[b].name) + (lock ? ' 🔒 Lv ' + need : ''), at(x, z), 0, 15, tok('display'), lock ? tok('hp') : null); }
    for (const tw of TOWNS) { const q = at(tw.x, tw.z); dot(q, 4, tok('gold')); if (!q[2]) label(L(tw.name), q, 12, isFull ? 12 : 10); }
    const icon = (q, rad, bg, ch) => { dot(q, rad, bg); c.font = (rad + 3) * u + 'px sans-serif'; c.fillStyle = '#fff'; c.fillText(ch, q[0], q[1] + 0.5 * u); };
    for (const tw of TR.TOWERS) { const q = at(tw.x, tw.z); if (!q[2]) dot(q, 2.5, '#6a6458'); }
    for (const d of TR.DOCKS) { const q = at(d.x0, d.z0); if (!q[2] || isFull) icon(q, 5, '#2f5f9a', '⚓'); }
    for (const s of World.ships) { const q = at(s.mesh.position.x, s.mesh.position.z); if (!q[2]) icon(q, 4.5, '#8a5a2a', '⛵'); }
    for (const b of TR.LAIRS) { const q = at(b.x, b.z); icon(q, 7, '#2a2024', '☠'); if (isFull) label(L(ENEMIES[b.type].name), q, 13, 10); }
    for (const o of Net.positions()) { const q = at(o.x, o.z); dot(q, 4, tok('mp')); if (isFull) label(o.name, q, -11, 11); }
    const me = World.player();
    if (me) {
      const q = at(me.position.x, me.position.z);
      c.save(); c.translate(q[0], q[1]); c.rotate(yaw - me.rotation.y); c.scale(u, u); // arrow tip on local +y = the way the hero faces
      c.beginPath(); c.moveTo(0, 8); c.lineTo(6, -6); c.lineTo(0, -2); c.lineTo(-6, -6); c.closePath();
      c.fillStyle = tok('accent'); c.fill(); c.lineWidth = 1.5; c.strokeStyle = panel; c.stroke(); c.restore();
    }
    const R = r - 5.5 * u;
    if (!isFull) [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([x, z], i) => label(t('compass')[i], [r + R * (x * cs - z * sn), r + R * (x * sn + z * cs)], 0, 10, null, i ? ink : tok('hp')));
  }

  UI.panels.map = {
    title: 'mapTitle', build() {
      full = UI.h('canvas', { class: 'worldmap', role: 'img', 'aria-label': t('mapTitle') });
      requestAnimationFrame(() => paint(full, 0, 0, H, 0, true)); // needs to be in the page to have a size
      return UI.h('div', {}, full, UI.h('p', { class: 'sub' }, t('mapNote')));
    }
  };
  $('minimap').onclick = () => UI.open('map');

  setInterval(() => {
    const me = World.player(); if (document.hidden || !me) return;
    const btn = $('minimap'), lab = t('mapOpen');
    if (btn.title !== lab) { btn.title = lab; btn.setAttribute('aria-label', lab); }
    if (!World.stage) paint($('miniCv'), me.position.x, me.position.z, VIEW, World.yaw(), false);
    if (UI.current === 'map' && full && full.isConnected) paint(full, 0, 0, H, 0, true); // other players keep moving
  }, 200);
})();
