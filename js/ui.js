// UI framework, HUD, menu and the stats / achievements panels (bag and hero live in charscreen.js).
(function () {
  const $ = id => document.getElementById(id);
  const UI = window.UI = { panels: {}, current: null };
  // h('button', {class:'x', onclick}, 'text', child) — strings always land as text, never HTML
  const h = UI.h = function (tag, a, ...kids) {
    const el = document.createElement(tag);
    for (const k in a || {}) {
      const v = a[k];
      if (k === 'class') el.className = v; else if (k === 'style') el.style.cssText = v; else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el[k] = v; else if (k === 'value' || k === 'checked') el[k] = v; else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(9).forEach(c => { if (c != null && c !== false) el.append(c instanceof Node ? c : String(c)); });
    return el;
  };
  UI.fmtTime = ms => { const m = Math.floor(ms / 60000); return Math.floor(m / 60) + (LANG === 'id' ? 'j ' : 'h ') + (m % 60) + 'm'; };
  UI.date = ts => new Date(ts).toLocaleString(LANG === 'id' ? 'id-ID' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });

  UI.open = function (name) {
    if (name === 'bag' || name === 'hero') return UI.openChar('gear'); // both live on the character screen
    const p = UI.panels[name]; if (!p) return;
    UI.current = name; World.paused = true;
    $('panelTitle').textContent = typeof p.title === 'function' ? p.title() : t(p.title);
    const body = $('panelBody'); body.replaceChildren(p.build());
    $('panel').hidden = false; $('panelClose').focus();
  };
  UI.rerender = () => {
    if (!$('charScreen').hidden) return UI.charRender();
    if (!UI.current || $('panel').hidden) return;
    const b = $('panelBody'), top = b.scrollTop, a = document.activeElement, keep = a && a.id && b.contains(a) ? [a.id, a.value, a.selectionStart] : null;
    b.replaceChildren(UI.panels[UI.current].build()); b.scrollTop = top;
    const n = keep && document.getElementById(keep[0]);
    if (n) { n.value = keep[1]; n.focus(); try { n.setSelectionRange(keep[2], keep[2]); } catch (e) { } }
  };
  UI.close = () => { $('panel').hidden = true; UI.current = null; document.activeElement && document.activeElement.blur(); if ($('battle').hidden && $('create').hidden && $('charScreen').hidden && !Net.waiting()) World.paused = false; };
  $('panelClose').onclick = UI.close;
  $('panel').addEventListener('pointerdown', e => { if (e.target.id === 'panel') UI.close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('panel').hidden) UI.close(); });

  // a big warning in the middle of the screen when a wall of light stops the hero
  let lockT = 0;
  UI.lockWarn = need => { const el = $('lockwarn'); el.textContent = t('lockWarn', { n: need }); el.hidden = false; clearTimeout(lockT); lockT = setTimeout(() => { el.hidden = true; }, 2400); };
  UI.toast = function (msg) {
    if (Game.S && Game.S.settings.notif === false) return;
    const el = h('div', { class: 'toast card', role: 'status' }, msg); $('toasts').append(el);
    setTimeout(() => el.remove(), 4200);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  };

  const MENU = ['bag', 'shop', 'hero', 'stats', 'ach', 'arena', 'mp', 'rank', 'chat', 'notif', 'profile', 'share', 'settings'];
  UI.buildMenu = function () {
    $('menu').replaceChildren(...MENU.map(m => h('button', { type: 'button', id: 'm_' + m, onclick: () => UI.open(m) }, t('menu.' + m))));
    $('panelClose').textContent = t('close'); $('hint').textContent = t('hint');
    $('jumpBtn').textContent = t('jump'); UI.action(World.context); UI.place();
    $('rotTitle').textContent = t('rotTitle'); $('rotText').textContent = t('rotText'); $('rotBtn').textContent = t('rotBtn'); UI.orient();
  };
  // keep the hint and jump button just above the (wrapping) menu rail
  // on short landscape screens the jump and attack buttons sit beside the hotbar instead of above it
  UI.place = () => {
    const mh = $('menu').offsetHeight, hb = $('hotbar'), hh = hb && hb.children.length ? hb.offsetHeight + 6 : 0, low = innerHeight <= 520, up = low ? 0 : hh;
    if (hb) hb.style.bottom = (mh + 6) + 'px'; $('hint').style.bottom = (mh + 6 + hh) + 'px';
    $('stick').style.bottom = (mh + (low ? 6 : 10 + hh)) + 'px'; // beside the hotbar when the screen is short, above it otherwise
    $('jumpBtn').style.bottom = (mh + (low ? 10 : 36) + up) + 'px'; $('atkBtn').style.bottom = (mh + (low ? 4 : 32) + up) + 'px'; $('actBtn').style.bottom = (mh + (low ? 74 : 110) + up) + 'px';
  };
  // phones play sideways: while the phone is upright a card asks to turn it (and pauses the world); where the browser
  // allows it, going fullscreen locks the screen to landscape on the first tap
  const phone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  let heldPause = null;
  UI.orient = function () {
    const show = phone && innerHeight > innerWidth;
    if (show === !$('rotate').hidden) return;
    $('rotate').hidden = !show;
    if (show) { heldPause = World.paused; World.paused = true; } else if (heldPause !== null) { World.paused = heldPause; heldPause = null; }
  };
  const lockLandscape = () => {
    const el = document.documentElement, lock = () => screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : Promise.reject();
    (document.fullscreenElement || !el.requestFullscreen ? lock() : el.requestFullscreen({ navigationUI: 'hide' }).then(lock)).catch(() => { }); // iPhones and some frames refuse: the card stays until the phone is turned
  };
  if (phone) { addEventListener('resize', UI.orient); addEventListener('pointerdown', lockLandscape, { once: true }); $('rotBtn').onclick = lockLandscape; }
  // touch screens: an analog stick bottom-left for walking and sailing (tapping the ground still works too)
  if (matchMedia('(pointer: coarse)').matches) {
    document.body.classList.add('touch');
    const base = $('stick'), knob = base.firstChild; let id = null; base.hidden = false;
    const move = e => {
      const r = base.getBoundingClientRect(), R = r.width / 2, dx = e.clientX - r.left - R, dy = e.clientY - r.top - R, l = Math.hypot(dx, dy) || 1, m = Math.min(1, l / R);
      knob.style.transform = 'translate(' + dx * m * R / l + 'px,' + dy * m * R / l + 'px)';
      World.stick.x = m < 0.15 ? 0 : dx / l * m; World.stick.y = m < 0.15 ? 0 : dy / l * m; // a small dead zone in the middle
    };
    const end = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; World.stick.x = World.stick.y = 0; };
    base.addEventListener('pointerdown', e => { id = e.pointerId; try { base.setPointerCapture(id); } catch (err) { /* already released */ } move(e); e.preventDefault(); });
    base.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  }
  // context action (board a ship, go ashore, enter the guild or castle); Enter does the same
  UI.action = c => { const b = $('actBtn'); b.hidden = !c; if (c) b.textContent = t('act.' + c.kind); };
  $('actBtn').onclick = () => World.interact();
  addEventListener('resize', () => UI.place());
  $('jumpBtn').onclick = () => World.jump();

  UI.hud = function () {
    const S = Game.S, st = heroStats(S);
    $('avatar').textContent = (S.hero.name[0] || '?').toUpperCase(); $('avatar').style.background = S.profile.color;
    $('hudName').textContent = S.hero.name + (S.profile.title ? ' · ' + S.profile.title : '');
    $('hudCls').textContent = jobName(S.cls, S.evo, S.evo2);
    $('hudLvl').textContent = t('lvl', { n: S.lvl }); $('hudGold').textContent = t('gold', { n: S.gold });
    $('barHp').style.width = (S.hp / st.maxHp * 100) + '%'; $('barMp').style.width = (S.mp / st.maxMp * 100) + '%';
    $('barXp').style.width = (S.lvl >= MAX_LVL ? 100 : Math.min(100, S.xp / xpNeed(S.lvl) * 100)) + '%';
    const unread = S.notes.filter(n => !n.read).length, nb = $('m_notif');
    if (nb) { nb.querySelector('.dot')?.remove(); if (unread) nb.append(h('span', { class: 'dot' }, unread > 9 ? '9+' : unread)); }
    const q = Game.quests();
    const bounties = S.guild.active.map(b => h('div', { class: b.cur >= b.n ? 'sub' : '' }, (b.cur >= b.n ? '✓ ' : '◆ ') + L(ENEMIES[b.type].name) + ' (' + b.cur + '/' + b.n + ')'));
    $('quest').replaceChildren(h('b', {}, t('daily')), ...q.map(x => h('div', { class: x.done ? 'sub' : '' }, (x.done ? '✓ ' : '○ ') + x.label + ' (' + Math.min(x.cur, x.n) + '/' + x.n + ')')),
      ...(bounties.length ? [h('b', { style: 'display:block;margin-top:4px' }, t('bounties')), ...bounties] : []));
  };
  // game clock, time of day and current region under the hero name
  UI.clockLine = () => {
    const el = $('hudTime'); if (!el) return;
    const c = World.clock(), hm = String(c.h).padStart(2, '0') + ':' + String(c.m).padStart(2, '0');
    el.textContent = hm + ' · ' + t('phases.' + c.phase) + (UI.area ? ' · ' + UI.area : '');
  };
  UI.sync = function (s) {
    const el = $('sync'), map = { local: ['syncLocal', ''], ok: ['syncOk', 'ok'], busy: ['syncBusy', ''], off: ['syncOff', 'warn'] };
    el.textContent = t(map[s][0]); el.className = 'chip ' + map[s][1];
  };

  // one-line item stats (shop cards)
  const itemLine = UI.itemLine = it => [it.atk && t('atk') + ' +' + it.atk, it.mag && t('mag') + ' +' + it.mag, it.crit && t('crit') + ' +' + it.crit + '%', it.def && t('def') + ' +' + it.def, it.hp && 'HP +' + it.hp, it.heal && 'HP +' + it.heal, it.mana && 'MP +' + it.mana].filter(Boolean).join(' · ');
  // ---------- statistics dashboard + export ----------
  const statRows = S => [[t('battles'), S.st.battles], [t('wins'), S.st.wins], [t('losses'), S.st.losses], [t('kills'), kills(S)], [t('dmg'), S.st.dmg], [t('maxHit'), S.st.maxHit],
    [t('goldEarned'), S.st.gold], [t('steps'), Math.round(S.st.steps)], [t('chests'), S.st.chests], [t('arenaRec'), S.st.arenaW + '–' + S.st.arenaL], [t('rating'), S.rating], [t('playtime'), UI.fmtTime(S.st.playMs)]];
  UI.panels.stats = {
    title: 'menu.stats', build() {
      const S = Game.S, wrap = h('div');
      wrap.append(h('div', { class: 'tiles' }, statRows(S).map(([k, v]) => h('div', { class: 'tile' }, h('div', { class: 'sub' }, k), h('div', { class: 'v' }, v)))));
      wrap.append(h('h3', {}, t('killsBy')));
      const max = Math.max(1, ...Object.values(S.st.kills));
      wrap.append(h('div', {}, Object.keys(ENEMIES).filter(k => !ENEMIES[k].of || S.st.kills[k]).map(k => h('div', { class: 'hbar' }, h('span', {}, L(ENEMIES[k].name)),
        h('i', { style: 'width:' + Math.max(2, (S.st.kills[k] || 0) / max * 60) + '%' }), h('span', { class: 'sub' }, S.st.kills[k] || 0)))));
      wrap.append(h('h3', { style: 'margin-top:14px' }, t('recent')));
      wrap.append(h('div', { class: 'tablebox' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, t('when')), h('th', {}, t('foe')), h('th', {}, t('result')), h('th', { class: 'n' }, t('dmg')))),
        h('tbody', {}, S.log.slice(-10).reverse().map(r => h('tr', {}, h('td', {}, UI.date(r.t)), h('td', {}, r.foe), h('td', {}, t(r.res === 'win' ? 'win' : r.res === 'lose' ? 'lose' : 'fled')), h('td', { class: 'n' }, r.dmg)))))));
      wrap.append(h('div', { class: 'row', style: 'margin-top:14px' },
        h('button', { type: 'button', onclick: () => UI.exportFile('csv') }, t('exportCsv')),
        h('button', { type: 'button', onclick: () => UI.exportFile('pdf') }, t('exportPdf'))));
      return wrap;
    }
  };
  const csvCell = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  UI.csv = S => [['metric', 'value'], ...statRows(S), [], ['time', 'opponent', 'result', 'damage', 'turns'], ...S.log.map(r => [new Date(r.t).toISOString(), r.foe, r.res, r.dmg, r.turns])].map(r => r.map(csvCell).join(',')).join('\n');
  // minimal one-font PDF writer: plain ASCII text lines, 46 lines per A4 page
  UI.pdf = function (title, lines) {
    const clean = s => String(s).replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, m => '\\' + m);
    const pages = []; for (let i = 0; i < lines.length; i += 46) pages.push(lines.slice(i, i + 46));
    const objs = ['<</Type/Catalog/Pages 2 0 R>>', '', '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>'];
    const kids = [];
    pages.forEach((pg, pi) => {
      let s = pi === 0 ? 'BT /F1 18 Tf 50 790 Td (' + clean(title) + ') Tj ET\n' : '';
      pg.forEach((ln, i) => { s += 'BT /F1 11 Tf 50 ' + ((pi === 0 ? 760 : 790) - i * 16) + ' Td (' + clean(ln) + ') Tj ET\n'; });
      objs.push('<</Length ' + s.length + '>>stream\n' + s + 'endstream');
      objs.push('<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R>>>>/Contents ' + objs.length + ' 0 R>>');
      kids.push(objs.length + ' 0 R');
    });
    objs[1] = '<</Type/Pages/Kids[' + kids.join(' ') + ']/Count ' + kids.length + '>>';
    let out = '%PDF-1.4\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    const x = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    return out + 'trailer\n<</Size ' + (objs.length + 1) + '/Root 1 0 R>>\nstartxref\n' + x + '\n%%EOF\n';
  };
  UI.exportFile = async function (kind) {
    const S = Game.S, name = 'nusa-kabut-' + S.hero.name.replace(/[^\w-]/g, '') + '-' + new Date().toISOString().slice(0, 10) + '.' + kind;
    const data = kind === 'csv' ? UI.csv(S) : UI.pdf(t('game') + ' - ' + S.hero.name, [
      jobName(S.cls, S.evo, S.evo2) + ' ' + t('lvl', { n: S.lvl }) + ' - ' + UI.date(Date.now()), '',
      ...statRows(S).map(([k, v]) => k + ': ' + v), '', t('killsBy') + ':', ...Object.keys(ENEMIES).filter(k => !ENEMIES[k].of || S.st.kills[k]).map(k => '  ' + L(ENEMIES[k].name) + ': ' + (S.st.kills[k] || 0)),
      '', t('recent') + ':', ...S.log.slice(-60).reverse().map(r => '  ' + UI.date(r.t) + '  ' + r.foe + '  ' + r.res + '  ' + r.dmg)]);
    try { await Cloud.download(name, data); UI.toast(t('exported')); }
    catch (e) { if (!e || e.code !== 'declined') UI.toast(t('exportFail', { e: (e && e.code) || 'error' })); }
  };

  // ---------- achievements ----------
  UI.panels.ach = {
    title: 'achTitle', build() {
      const S = Game.S, n = ACHS.filter(a => S.ach[a.id]).length;
      return h('div', {}, h('p', { class: 'sub' }, t('achCount', { a: n, b: ACHS.length })),
        h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(230px,1fr))' }, ACHS.map(a => h('div', { class: 'ach' + (S.ach[a.id] ? '' : ' locked') },
          h('div', { class: 'seal' }, L(a.name)[0]), h('div', { style: 'min-width:0' }, h('b', {}, L(a.name)), h('div', { class: 'sub' }, L(a.desc) + (S.ach[a.id] ? ' · ' + UI.date(S.ach[a.id]) : '')))))));
    }
  };
})();
