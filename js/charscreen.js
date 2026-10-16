// Character screen (Tas / Karakter): the hero model between combat stats and gear slots, the selected item's details,
// the inventory grid, player stats and attributes; a second tab holds the skills and the five-tier job tree.
(function () {
  const $ = id => document.getElementById(id), h = UI.h, P = Math.PI, NS = 'http://www.w3.org/2000/svg';
  let tab = 'gear', sel = null, preview = null, modelCv = null;
  const stopModel = () => { if (preview) preview.dispose(); preview = null; modelCv = null; };

  // ---------- line icons (24×24, stroked with the text colour) ----------
  const ICON = {
    atk: 'M19 5 9 15M6 12l6 6M9 15l-5 5', mag: 'M5 20 14 11M15 3l1.4 3.1 3.1 1.4-3.1 1.4L15 12l-1.4-3.1-3.1-1.4 3.1-1.4z',
    def: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', crit: 'M5 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0M12 2v5M12 17v5M2 12h5M17 12h5',
    eva: 'M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7', agi: 'M13 2 4 14h7l-1 8 9-12h-7z',
    hp: 'M12 20s-8-5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20 12 20z', mp: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
    lvl: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4c0 3 2 4 4 4M16 6h4c0 3-2 4-4 4M12 13v4M8 21h8M10 17h4',
    gold: 'M5 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0M14 9h-3a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3h-3M12 7v2M12 15v2',
    rating: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
    battles: 'M4 4l11 11M20 4 9 15M6 15l3 3M18 15l-3 3M5 19l2-2M19 19l-2-2',
    kills: 'M12 3a7 7 0 0 0-7 7c0 2.4 1.1 3.9 3 5v4h8v-4c1.9-1.1 3-2.6 3-5a7 7 0 0 0-7-7zM9 10h.01M15 10h.01M11 19v-2M13 19v-2',
    losses: 'M8 21V9a4 4 0 0 1 8 0v12M5 21h14M12 11v5M10 13h4',
    steps: 'M7 4c1.7 0 2.5 1.8 2.5 4.5S8.7 12 7 12s-2.5-1-2.5-3.5S5.3 4 7 4zM5.5 15h3v2.5a1.5 1.5 0 0 1-3 0zM17 8c1.7 0 2.5 1.8 2.5 4.5S18.7 16 17 16s-2.5-1-2.5-3.5S15.3 8 17 8zM15.5 19h3v.5a1.5 1.5 0 0 1-3 0z',
    chests: 'M3 11h18v9H3zM3 11a9 6 0 0 1 18 0M10.5 13h3v3h-3z', time: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 7v5l3 2',
    user: 'M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5', book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7M8 11h5',
    bag: 'M6 9a6 6 0 0 1 12 0v11H6zM9 9V7a3 3 0 0 1 6 0v2M9 14h6', equip: 'M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z',
    use: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9', close: 'M6 6l12 12M18 6 6 18',
    look: 'M14 4l6 6-8 8H6v-6zM12 6l6 6', job: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
    str: 'M6 13V8a1.5 1.5 0 0 1 3 0v4M9 11V6a1.5 1.5 0 0 1 3 0v5M12 11V7a1.5 1.5 0 0 1 3 0v5M15 12V9a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a5 5 0 0 1-4.3-2.5L4 15',
    int: 'M12 3a6 6 0 0 0-4 10.5V17h8v-3.5A6 6 0 0 0 12 3zM9 21h6', vit: 'M12 20s-8-5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20 12 20zM8 12h2l1-2 2 4 1-2h2'
  };
  const icon = k => { const s = document.createElementNS(NS, 'svg'), p = document.createElementNS(NS, 'path'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ico'); s.setAttribute('aria-hidden', 'true'); p.setAttribute('d', ICON[k]); s.append(p); return s; };

  // ---------- item pictures, rendered once from the same 3D parts the game uses ----------
  const TIER_COL = ['#8a8a8a', '#5fbf4a', '#4a8fe0', '#a05ae0', '#e0a030', '#4adfd0', '#e05a3a', '#f0d060', '#5ae0a0', '#ff7ad0', '#ffffff'];
  const ARMOR_COL = [0x8a7a62, 0x8a5a32, 0xa8b0b8, 0xb04030, 0x8fd8ef, 0xf0d68a, 0xb8e8ff, 0xe0582a, 0x5a2a5a, 0x4ac090, 0xfff0c0];
  const POT_COL = { potion: 0xd83a3a, hipotion: 0xf09a2a, ether: 0x3a7ae0 };
  const tierOf = id => { const it = ITEMS[id]; return !it ? 0 : it.type === 'weapon' ? it.tier : it.type === 'armor' ? +id.slice(5) || 0 : 0; };
  let ir = null; const pics = {};
  function itemPic(id) {
    if (pics[id] !== undefined) return pics[id];
    const it = ITEMS[id], T = THREE, M = Models; if (!it) return '';
    if (!ir) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 96;
      try { ir = { r: new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true }), s: new T.Scene(), c: new T.PerspectiveCamera(30, 1, 0.05, 50) }; } catch (e) { return (pics[id] = ''); }
      ir.s.add(new T.HemisphereLight(0xffffff, 0x445566, 1.1)); const d = new T.DirectionalLight(0xffffff, 0.8); d.position.set(2, 3, 4); ir.s.add(d);
    }
    const g = new T.Group(), mid = new T.Group(); g.add(mid);
    if (it.type === 'weapon') { const w = M.weapon(it.kind, it.tier); w.rotation.set(0, 0, 0); mid.add(w); if (it.kind === 'bow') mid.rotation.y = P / 2; g.rotation.z = -P / 4; }
    else if (it.type === 'armor') {
      const n = tierOf(id), m = M.mat(ARMOR_COL[n] || 0x888888), trim = M.mat(new T.Color(ARMOR_COL[n] || 0x888888).multiplyScalar(0.7));
      M.add(mid, new T.Mesh(new T.CylinderGeometry(0.36, 0.28, 0.62, 18), m)).scale.z = 0.72;
      [-1, 1].forEach(s => M.add(mid, new T.Mesh(new T.SphereGeometry(0.17, 14, 10), n ? m : trim), s * 0.38, 0.24));
      if (n >= 2) M.add(mid, M.box(0.46, 0.4, 0.06, trim), 0, 0.02, 0.22);
      M.add(mid, new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.07, 18), trim), 0, -0.3).scale.z = 0.75;
      mid.rotation.y = -0.35;
    } else {
      const glass = M.mat(0xdfe8ee, { transparent: true, opacity: 0.55 }), liquid = M.mat(POT_COL[id] || 0x8a6ad0, { emissive: POT_COL[id] || 0x8a6ad0, emissiveIntensity: 0.25 });
      M.add(mid, new T.Mesh(new T.SphereGeometry(0.3, 18, 14), liquid), 0, -0.12);
      M.add(mid, new T.Mesh(new T.CylinderGeometry(0.09, 0.12, 0.3, 14), glass), 0, 0.27);
      M.add(mid, new T.Mesh(new T.CylinderGeometry(0.1, 0.09, 0.1, 12), M.mat(0x7a5232)), 0, 0.45);
    }
    ir.s.add(g); g.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(g), c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3()).length();
    ir.c.position.set(c.x, c.y, c.z + size / (2 * Math.tan(15 * P / 180)) * 0.95); ir.c.lookAt(c);
    ir.r.render(ir.s, ir.c); pics[id] = ir.r.domElement.toDataURL('image/png');
    ir.s.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    return pics[id];
  }
  // one inventory/gear cell: picture, quality bar, count
  const cell = (id, n, opts) => {
    const it = ITEMS[id], o = opts || {};
    return h('button', { type: 'button', class: 'cs-cell' + (o.on ? ' on' : '') + (o.eq ? ' eq' : ''), title: it ? L(it.name) : '', 'aria-label': it ? L(it.name) : '', onclick: o.click },
      it ? h('img', { src: itemPic(id), alt: '' }) : null, it && n > 1 ? h('span', { class: 'cs-n' }, n) : null,
      o.eq ? h('span', { class: 'cs-e' }, 'E') : null, it ? h('i', { class: 'cs-q', style: 'background:' + (TIER_COL[tierOf(id)] || TIER_COL[0]) }) : null);
  };
  const panel = (ic, title, extra, ...body) => h('section', { class: 'cs-panel' }, h('header', {}, icon(ic), h('h3', {}, title), extra ? h('span', { class: 'cs-extra' }, extra) : null), ...body);
  const bar = (v, max, col) => h('div', { class: 'cs-bar' }, h('i', { style: 'width:' + Math.max(0, Math.min(100, v / max * 100)) + '%;background:' + col }));

  // ---------- the gear tab ----------
  function gearTab() {
    const S = Game.S, st = heroStats(S), owned = new Set(S.inv.map(i => i.id));
    if (!sel || !owned.has(sel)) sel = S.eq.weapon && owned.has(S.eq.weapon) ? S.eq.weapon : (S.inv[0] || {}).id || null;
    // hero: combat stats, the turning model, gear slots
    const cv = modelCv || (modelCv = h('canvas', { class: 'cs-model', 'aria-label': S.hero.name }));
    const stats = [['atk', st.atk, t('atk')], ['mag', st.mag, t('mag')], ['def', st.def, t('def')], ['crit', st.crit + '%', t('crit')], ['eva', st.eva + '%', t('csEva')], ['agi', st.agi, t('agi')]];
    const hero = panel('user', S.hero.name, t('csLevel') + ': ' + S.lvl,
      h('div', { class: 'cs-job' }, icon('job'), jobName(S.cls, S.evo, S.evo2)),
      h('div', { class: 'cs-herobody' },
        h('ul', { class: 'cs-res' }, stats.map(([k, v, label]) => h('li', { title: label }, icon(k), h('b', {}, v)))),
        cv,
        h('div', { class: 'cs-gear' }, ['weapon', 'armor'].map(k => h('div', { class: 'cs-slot' }, cell(S.eq[k], 1, { on: sel === S.eq[k], click: () => { sel = S.eq[k]; render(); } }), h('span', {}, t(k)))))),
      h('button', { type: 'button', class: 'cs-wide', onclick: () => { UI.closeChar(); UI.creator(true); } }, icon('look'), t('csLook')));
    // the selected item, compared with what is worn in its slot
    const it = ITEMS[sel], slot = (S.inv.find(i => i.id === sel) || {}).n || 0, isEq = sel && (S.eq.weapon === sel || S.eq.armor === sel);
    let detail;
    if (!it) detail = panel('bag', t('csItem'), null, h('p', { class: 'cs-empty' }, t('bagEmpty')));
    else {
      const cur = it.type !== 'use' && !isEq ? ITEMS[S.eq[it.type]] || {} : null;
      const line = (label, v, key) => { const d = cur && key ? v - (cur[key] || 0) : 0; return h('div', {}, label + ': ', h('b', {}, v), d ? h('span', { class: d > 0 ? 'up' : 'down' }, ' ' + (d > 0 ? '▲ +' : '▼ ') + d) : null); };
      const wrong = it.type === 'weapon' && it.kind !== CLASSES[S.cls].weapon, users = it.type === 'weapon' ? Object.keys(CLASSES).filter(c => CLASSES[c].weapon === it.kind).map(c => L(CLASSES[c].name)).join(', ') : '';
      detail = panel(it.type === 'use' ? 'use' : it.type === 'armor' ? 'def' : 'atk', L(it.name), null,
        h('div', { class: 'cs-detail' },
          h('div', { class: 'cs-big' }, h('img', { src: itemPic(sel), alt: '' }), h('i', { class: 'cs-q', style: 'background:' + TIER_COL[tierOf(sel)] })),
          h('div', { class: 'cs-lines' },
            h('div', {}, t('csType') + ': ', h('b', {}, t(it.type === 'use' ? 'consumable' : it.type)), it.type !== 'use' ? [' · ' + t('csTier') + ': ', h('b', { style: 'color:' + TIER_COL[tierOf(sel)] }, tierOf(sel))] : null),
            it.atk != null ? line(t('atk'), it.atk, 'atk') : null, it.mag != null ? line(t('mag'), it.mag, 'mag') : null, it.crit != null ? line(t('crit'), it.crit, 'crit') : null,
            it.def != null ? line(t('def'), it.def, 'def') : null, it.hp != null ? line('HP', it.hp, 'hp') : null,
            it.heal ? line(t('csHeal'), it.heal) : null, it.mana ? line(t('csMana'), it.mana) : null,
            users ? h('div', { class: wrong ? 'down' : '' }, t('csFor') + ': ', h('b', {}, users)) : null,
            h('div', {}, t('csOwned') + ': ', h('b', {}, slot), ' · ' + t('csValue') + ': ', h('b', {}, t('gold', { n: Math.ceil(it.price / 2) })))),
          h('div', { class: 'cs-acts' },
            it.type === 'use' ? h('button', { type: 'button', class: 'primary', onclick: () => { Game.useItem(sel); render(); } }, icon('use'), t('use'))
              : h('button', { type: 'button', class: 'primary', disabled: isEq || wrong, onclick: () => { Game.equip(sel); render(); } }, icon('equip'), isEq ? t('equipped') : t('equip')),
            h('button', { type: 'button', disabled: isEq && slot <= 1, onclick: () => { Game.sell(sel); render(); } }, icon('gold'), t('sell', { n: Math.ceil(it.price / 2) })))),
        h('p', { class: 'cs-desc' }, t(it.type === 'use' ? 'csDescUse' : it.type === 'armor' ? 'csDescArmor' : 'csDescWeapon')));
    }
    // inventory: every stack plus empty cells to round out the grid
    const cells = S.inv.map(i => cell(i.id, i.n, { on: i.id === sel, eq: S.eq.weapon === i.id || S.eq.armor === i.id, click: () => { sel = i.id; render(); } }));
    while (cells.length < 24 || cells.length % 8) cells.push(h('div', { class: 'cs-cell empty' }));
    const inv = panel('bag', t('csInv'), t('gold', { n: S.gold }), h('div', { class: 'cs-grid' }, cells));
    // player stats and attributes
    const row = (ic, label, v, b) => h('li', {}, icon(ic), h('span', {}, label + ': ', h('b', {}, v)), b || null);
    const xpNow = S.lvl >= MAX_LVL ? 1 : S.xp, xpMax = S.lvl >= MAX_LVL ? 1 : xpNeed(S.lvl);
    const pstats = panel('lvl', t('csStats'), null, h('ul', { class: 'cs-list' },
      row('lvl', t('csLevel'), S.lvl >= MAX_LVL ? S.lvl + ' (MAX)' : S.lvl, bar(xpNow, xpMax, '#d8b04a')),
      row('hp', 'HP', Math.round(Math.min(S.hp, st.maxHp)) + '/' + st.maxHp, bar(S.hp, st.maxHp, '#d24a4a')),
      row('mp', 'MP', Math.round(Math.min(S.mp, st.maxMp)) + '/' + st.maxMp, bar(S.mp, st.maxMp, '#4a7ad8')),
      row('gold', t('csGold'), S.gold), row('rating', t('rating'), S.rating), row('battles', t('battles'), S.st.battles), row('rating', t('wins'), S.st.wins),
      row('kills', t('kills'), kills(S)), row('losses', t('losses'), S.st.losses), row('steps', t('csKm'), (S.st.steps / 1000).toFixed(2) + ' km'),
      row('chests', t('chests'), S.st.chests), row('time', t('playtime'), UI.fmtTime(S.st.playMs))));
    const attrs = panel('str', t('csAttr'), t('csPts', { n: S.pts }), h('ul', { class: 'cs-list' }, ATTRS.map(a => h('li', {}, icon(a), h('span', {}, t(a) + ': ', h('b', {}, S.attr[a])),
      h('button', { type: 'button', class: 'cs-plus', disabled: !S.pts, 'aria-label': '+ ' + t(a), onclick: () => { Game.allocate(a); render(); } }, '+')))));
    const out = h('div', { class: 'cs-cols' }, hero, h('div', { class: 'cs-col' }, detail, inv), h('div', { class: 'cs-col' }, pstats, attrs));
    // the model turns in its own little renderer (one per opening: browsers allow only a few WebGL contexts); new gear shows at once
    if (!preview) preview = World.preview(cv);
    if (preview) preview.set(Game.heroLook(), S.cls);
    return out;
  }

  // ---------- the skills tab: every skill, then the job tree ----------
  function skillsTab() {
    const S = Game.S;
    const skills = panel('book', t('skills'), null, h('div', { class: 'cs-skills' }, heroSkills(S).map(s => h('div', { class: 'cs-skill' + (s.ok ? '' : ' locked'), style: '--sk:#' + new THREE.Color(s.col || 0x888888).getHexString() },
      h('b', {}, L(s.name)), h('span', {}, t('cost', { n: s.mp }) + (s.ok ? '' : ' · ' + t('unlockAt', { n: s.lv }))), h('span', {}, UI.skillInfo(s))))));
    const evoCard = (id, open, mine) => { const e = EVOS[id]; return h('div', { class: 'cs-evo' + (mine ? ' mine' : '') + (open || mine ? '' : ' locked') },
      h('b', {}, L(e.name)), h('span', {}, L(e.desc)), h('span', {}, Object.entries(e.bonus).map(([k, v]) => t(k) + ' +' + v).join(' · ')),
      h('span', {}, e.skills.map(([sk, lv]) => L(SKILLS[sk].name) + ' (Lv ' + lv + ')').join(', ')),
      open ? h('button', { type: 'button', class: 'primary', onclick: () => { Game.evolve(id); render(); } }, t('choose')) : null); };
    const chain = evoChain(S), tiers = [];
    for (let n = 1; n < EVO_LV.length; n++) {
      const mine = chain[n - 1], lv = EVO_LV[n], now = n === chain.length + 1;
      tiers.push(h('h4', { class: 'cs-tier' }, t('evoTier', { n, lv })));
      if (!mine && !now) { tiers.push(h('p', { class: 'cs-empty' }, t('evoNeedPrev', { n: n - 1 }))); continue; }
      if (now) tiers.push(h('p', { class: 'cs-empty' }, S.lvl < lv ? t('evoLocked', { n: lv }) : t('evoReady')));
      tiers.push(h('div', { class: 'cs-evos' }, (mine ? [mine] : nextEvos(S)).map(id => evoCard(id, now && S.lvl >= lv, !!mine))));
    }
    stopModel();
    return h('div', { class: 'cs-cols two' }, skills, panel('job', t('evolve'), jobName(S.cls, S.evo, S.evo2), h('div', {}, tiers)));
  }

  function render() {
    const body = $('csBody'), top = body.scrollTop;
    document.querySelectorAll('#charScreen .cs-tab').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
    $('csTitle').textContent = tab === 'gear' ? t('menu.hero') : t('csSkillsTab');
    body.replaceChildren(tab === 'gear' ? gearTab() : skillsTab()); body.scrollTop = top;
  }
  UI.openChar = function (which) {
    if (which) tab = which;
    UI.close(); World.paused = true; $('charScreen').hidden = false;
    $('csTabs').replaceChildren(...[['gear', 'user', t('menu.hero')], ['skills', 'book', t('csSkillsTab')]].map(([id, ic, label]) =>
      h('button', { type: 'button', class: 'cs-tab', 'data-tab': id, title: label, 'aria-label': label, onclick: () => { tab = id; render(); } }, icon(ic))));
    $('csClose').replaceChildren(icon('close')); $('csClose').setAttribute('aria-label', t('close'));
    render(); $('csClose').focus();
  };
  UI.charRender = render;
  UI.closeChar = function () {
    $('charScreen').hidden = true; stopModel();
    if ($('battle').hidden && $('create').hidden && !Net.waiting()) World.paused = false;
  };
  $('csClose').onclick = UI.closeChar;
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('charScreen').hidden) UI.closeChar(); });
})();
