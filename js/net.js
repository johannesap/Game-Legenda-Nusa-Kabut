// Live multiplayer through the artifact's `room` capability (on claude.ai) or PeerJS rooms (anywhere else, e.g. GitHub Pages).
// A host gets a room code, friends join it;
// everyone in the room sees the other heroes move, chat bubbles, and can fight together.
// Everything travels in presence (latest value wins, re-sent on reconnect), so Viewers can play too:
//   n,c,e,l,k  name, class, evolution, level, look      x,z,y,r  position, jump height, facing
//   b          busy (in a fight)                         say      {t, m} last chat line
//   m          match: leader {id, kind, to, seed, foe, go}, member {id, ok, st}, both {s, a} = action number + action
// Fights are deterministic (Battle's seeded rolls), so only the chosen actions are shared.
(function () {
  const N = window.Net = { ok: false, code: null, chat: [] };
  let api = null, room = null, unsub = null, myPeer = null, myM = null, match = null, card = null, busyFlag = false;
  let lastSent = 0, lastPos = '', lastHello = '', lastHelloAt = 0, panelAt = 0;
  const seenInv = new Set(), orphans = [];
  const peers = new Map(); // peer id -> {id, p (presence), mesh, tag, lk, target, sayT}
  const $ = id => document.getElementById(id), h = (...a) => UI.h(...a);

  // ---------- untrusted presence -> safe values ----------
  const num = (v, a, b, d) => typeof v === 'number' && isFinite(v) ? Math.min(b, Math.max(a, v)) : d;
  const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, '').slice(0, n);
  const hex = v => /^#[0-9a-f]{6}$/i.test(v) ? v : '#888888';
  const cleanLook = k => (k = k || {}, { skin: hex(k.skin), hair: hex(k.hair), eyes: hex(k.eyes), outfit: hex(k.outfit), cape: hex(k.cape), capeOn: !!k.capeOn,
    hairStyle: num(k.hairStyle, 0, 3, 0) | 0, hat: num(k.hat, 0, 3, 0) | 0, height: num(k.height, 0.85, 1.15, 1), build: num(k.build, 0.85, 1.2, 1), wt: num(k.wt, 0, 9, 0) | 0 });
  const cleanAct = a => a && ['attack', 'defend', 'skill', 'item', 'flee', 'pass'].includes(a.k) ? { k: a.k, s: SKILLS[a.s] ? a.s : undefined, i: ITEMS[a.i] ? a.i : undefined } : { k: 'pass' };
  const rid = () => Math.random().toString(36).slice(2, 10);
  const nameOf = id => (peers.get(id) && str(peers.get(id).p.n, 16)) || '?';
  // distance from my hero to where a peer last reported itself
  const distTo = r => { const me = World.player(); return r.target && me ? Math.round(Math.hypot(r.target.x - me.position.x, r.target.z - me.position.z)) : 999; };

  N.init = async function () {
    api = window.claude && claude.use ? await claude.use('room') : null;
    if (!api && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]peer\b/.test(location.search)) api = devRoom(); // ?peer tries PeerJS locally
    else if (!api && window.RTCPeerConnection) api = peerRoom();
    N.ok = !!api;
    if (!$('tags')) document.body.append(h('div', { id: 'tags', 'aria-hidden': 'true' }));
    World.onFrame = frame;
  };

  // ---------- room ----------
  const pres = patch => { if (room) room.presence(patch).catch(() => { }); };
  const setM = m => { myM = m; pres({ m }); };
  N.inRoom = () => !!room;
  N.waiting = () => !!match; // an invitation or networked fight is in progress
  N.host = () => N.join(rid().slice(0, 5));
  N.join = async function (code) {
    code = String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
    if (code.length < 3) throw { code: 'bad' };
    if (room) await N.leave();
    room = await api.join('nk-' + code);
    N.code = code; lastHello = ''; lastPos = '';
    unsub = room.onPeers(onPeers, e => { UI.toast(e && e.type === 'host-left' ? t('hostLeft') : t('joinFail', { e: 'room' })); N.leave(); });
    hello(true); UI.rerender();
  };
  N.leave = async function () {
    if (!room) return;
    if (match) cancel('canceled');
    unsub && unsub(); const r = room; room = null; N.code = null; myM = null;
    for (const id of [...peers.keys()]) drop(id, true);
    await r.leave().catch(() => { });
    UI.rerender();
  };
  N.busy = flag => { busyFlag = flag; pres({ b: flag ? 1 : 0 }); };
  N.say = function (text) {
    text = str(text, 120).trim(); if (!text || !room) return;
    pres({ say: { t: Date.now(), m: text } });
    if (myTag) bubble(myTag, text);
    pushChat(Game.S.hero.name, text, true);
  };
  function hello(force) {
    const S = Game.S; if (!S || !room) return;
    const id = { n: S.hero.name, c: S.cls, e: S.evo || null, e2: S.evo2 || null, l: S.lvl, k: Game.heroLook() };
    const key = JSON.stringify(id);
    if (force || key !== lastHello) { lastHello = key; pres({ ...id, b: busyFlag ? 1 : 0 }); }
  }
  function pushChat(n, m, me) { N.chat.push({ n, m, me, t: Date.now() }); if (N.chat.length > 40) N.chat.shift(); if (UI.current === 'mp') UI.rerender(); }

  function onPeers(ch) {
    const seen = new Set();
    for (const p of ch.peers) {
      if (p.sameTab) { myPeer = p.peer; continue; }
      if (p.kind !== 'viewer') continue;
      seen.add(p.peer); upsert(p.peer, p.presence || {});
    }
    for (const id of [...peers.keys()]) if (!seen.has(id)) drop(id);
    if (UI.current === 'mp' && performance.now() - panelAt > 1000) { panelAt = performance.now(); UI.rerender(); }
  }
  function upsert(id, pr) {
    let r = peers.get(id);
    if (!r) { r = { id }; peers.set(id, r); }
    const wasNamed = r.p && r.p.n; r.p = pr;
    if (pr.n && !wasNamed) UI.toast(t('joined', { n: str(pr.n, 16) }));
    // avatar: rebuilt only when look or class changes
    const cls = CLASSES[pr.c] ? pr.c : null, lk = cls && JSON.stringify([pr.k, cls]);
    if (cls && lk !== r.lk) {
      const old = r.mesh; r.lk = lk; r.mesh = World.buildHero(cleanLook(pr.k), cls); World._scene.add(r.mesh);
      if (old) { r.mesh.position.copy(old.position); r.mesh.rotation.y = old.rotation.y; World._scene.remove(old); }
      else r.fresh = true;
    }
    if (typeof pr.x === 'number') {
      r.target = { x: num(pr.x, -Terrain.HALF, Terrain.HALF, 0), z: num(pr.z, -Terrain.HALF, Terrain.HALF, 0), y: num(pr.y, 0, 5, 0), r: num(pr.r, -10, 10, 0), w: pr.w ? 1 : 0, s: pr.s ? 1 : 0 };
      if (r.fresh && r.mesh) { r.fresh = false; r.mesh.position.set(r.target.x, World.ground(r.target.x, r.target.z), r.target.z); }
    }
    if (!r.tag) { r.tag = h('div', { class: 'tag' }, h('span', { class: 'bub', hidden: true }), h('span', { class: 'nm' })); $('tags').append(r.tag); }
    r.tag.querySelector('.nm').textContent = str(pr.n, 16) + ' · ' + t('lvl', { n: num(pr.l, 1, 999, 1) });
    r.tag.classList.toggle('busy', !!pr.b);
    if (pr.say && pr.say.t !== r.sayT) {
      const fresh = r.sayT !== undefined || Date.now() - num(pr.say.t, 0, 9e15, 0) < 15000;
      r.sayT = pr.say.t;
      if (fresh) { const m = str(pr.say.m, 120); bubble(r.tag, m); pushChat(str(pr.n, 16), m, false); }
    }
    onMatchPeer(id, pr.m);
  }
  function drop(id, quiet) {
    const r = peers.get(id); if (!r) return;
    peers.delete(id);
    if (r.mesh && World.stage && Object.values(World.stage.actors).some(a => a.mesh === r.mesh)) orphans.push(r.mesh); // still on the battle stage
    else if (r.mesh) World._scene.remove(r.mesh);
    r.tag && r.tag.remove();
    if (r.ship) World._scene.remove(r.ship);
    if (!quiet && r.p && r.p.n) UI.toast(t('leftRoom', { n: str(r.p.n, 16) }));
    if (match) {
      if (match.started && match.fighters.includes(id)) Battle.gone(id);
      else if (match.role === 'member' && match.leader === id) cancel('canceled');
      else if (match.role === 'leader' && match.to.includes(id)) { match.to = match.to.filter(x => x !== id); leaderCheck(); }
    }
  }
  function bubble(tag, m) {
    const b = tag.querySelector('.bub'); b.textContent = m; b.hidden = false;
    clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, 6000);
  }

  // ---------- per frame: send my position, move avatars, place name tags ----------
  const v3 = new THREE.Vector3();
  let myTag = null;
  function frame(dt) {
    if (!room) return;
    const now = performance.now(), me = World.player();
    if (now - lastHelloAt > 2000) { lastHelloAt = now; hello(); }
    if (me && !World.stage && now - lastSent > 100) {
      const st = World.stance(me.position.x, me.position.z), sw = World.swimming() ? 1 : 0;
      const pos = [+me.position.x.toFixed(2), +me.position.z.toFixed(2), sw ? 0 : +(me.position.y - st.y).toFixed(2), +me.rotation.y.toFixed(2), sw];
      const key = pos.join(); if (key !== lastPos) { lastPos = key; lastSent = now; pres({ x: pos[0], z: pos[1], y: pos[2], r: pos[3], w: sw, s: World.sailing() ? 1 : 0 }); }
    }
    const inStage = m => World.stage && Object.values(World.stage.actors).some(a => a.mesh === m);
    for (const r of peers.values()) {
      if (!r.mesh || !r.target || inStage(r.mesh)) continue;
      const m = r.mesh, tx = r.target.x, tz = r.target.z, d = Math.hypot(tx - m.position.x, tz - m.position.z);
      const k = d > 60 ? 1 : Math.min(1, dt * 10);
      m.position.x += (tx - m.position.x) * k; m.position.z += (tz - m.position.z) * k;
      const st = World.stance(m.position.x, m.position.z), moving = d > 0.05;
      m.rotation.y = r.target.r;
      if (r.target.s && !r.ship) { r.ship = Models.ship(); World._scene.add(r.ship); } else if (!r.target.s && r.ship) { World._scene.remove(r.ship); r.ship = null; }
      if (r.ship) { // standing on deck: the ship sits under the avatar
        r.ship.position.set(m.position.x + Math.sin(m.rotation.y) * 0.8, Terrain.WATER, m.position.z + Math.cos(m.rotation.y) * 0.8); r.ship.rotation.y = m.rotation.y;
        m.rotation.x = 0; m.position.y = Terrain.WATER + r.ship.userData.deck; World.animateWalk(m, false, dt);
      } else if (r.target.w && st.swim) { m.position.y = World.swimY(st, moving); World.swimPose(m, moving, dt); }
      else {
        m.rotation.x = 0; m.position.y = st.y + r.target.y;
        World.animateWalk(m, moving && !r.target.y, dt);
        if (r.target.y > 0.05) { const u = m.userData; u.legs[0].rotation.x = 0.7; u.legs[1].rotation.x = -0.3; }
      }
    }
    for (const r of peers.values()) place(r.tag, r.mesh);
    if (!myTag) { myTag = h('div', { class: 'tag' }, h('span', { class: 'bub', hidden: true })); $('tags').append(myTag); }
    place(myTag, me);
  }
  function place(tag, mesh) {
    if (!tag) return;
    if (!mesh || World.stage) { tag.style.display = 'none'; return; }
    v3.copy(mesh.position); v3.y += 2.9 * mesh.scale.y;
    const far = v3.distanceTo(World._cam.position) > 90; v3.project(World._cam);
    if (far || v3.z > 1) { tag.style.display = 'none'; return; }
    tag.style.display = ''; tag.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; tag.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
  }

  N.list = () => [...peers.values()].filter(r => r.p && r.p.n).map(r => {
    const d = distTo(r);
    return { id: r.id, name: str(r.p.n, 16), lvl: num(r.p.l, 1, 999, 1), cls: CLASSES[r.p.c] ? r.p.c : 'knight', evo: EVOS[r.p.e] ? r.p.e : null, evo2: EVOS[r.p.e2] ? r.p.e2 : null, busy: !!r.p.b, dist: d };
  });

  // last reported positions of the other room players, for the map
  N.positions = () => [...peers.values()].filter(r => r.target && r.p && r.p.n).map(r => ({ name: str(r.p.n, 16), x: r.target.x, z: r.target.z }));

  // ---------- matches: duel and co-op ----------
  const myStats = kind => { const f = Game.heroFighter(kind === 'duel'); return { n: f.name, l: f.lvl, c: f.cls, maxHp: f.maxHp, maxMp: f.maxMp, atk: f.atk, mag: f.mag, def: f.def, agi: f.agi, crit: f.crit, eva: f.eva, hp: f.hp, mp: f.mp, sk: f.skills, r: f.rating }; };
  const fighterFrom = (st, key, ctrl, side) => ({ key, ctrl, side, name: str(st.n, 16) || '?', lvl: num(st.l, 1, 999, 1), cls: CLASSES[st.c] ? st.c : 'knight',
    maxHp: num(st.maxHp, 1, 99999, 50), maxMp: num(st.maxMp, 0, 99999, 0), hp: num(st.hp, 1, 99999, 50), mp: num(st.mp, 0, 99999, 0),
    atk: num(st.atk, 0, 9999, 5), mag: num(st.mag, 0, 9999, 5), def: num(st.def, 0, 9999, 1), agi: num(st.agi, 0, 999, 1), crit: num(st.crit, 0, 100, 5), eva: num(st.eva, 0, 100, 0),
    skills: Array.isArray(st.sk) ? st.sk.filter(id => SKILLS[id]).slice(0, 8) : [], rating: num(st.r, 0, 9999, 1000) });

  N.challenge = function (id) {
    const r = peers.get(id);
    if (!room || match || Battle.active() || !r || r.p.b) return;
    match = { id: rid(), kind: 'duel', role: 'leader', to: [id], seed: rid(), answers: {} };
    match.timer = setTimeout(() => cancel('noAnswer'), 20000);
    setM({ id: match.id, kind: 'duel', to: match.to, seed: match.seed });
    N.busy(true); UI.close(); World.paused = true;
    showCard(t('waitAnswer', { n: nameOf(id) }), [[t('cancel'), () => cancel('canceled')]]);
  };
  // called on a monster encounter; true when allies are being gathered (the fight starts from here)
  N.coopInvite = function (e) {
    if (!room || match) return false;
    const near = [...peers.values()].filter(r => r.p.n && !r.p.b && r.mesh && distTo(r) <= 30).slice(0, 3).map(r => r.id);
    if (!near.length) return false;
    match = { id: rid(), kind: 'coop', role: 'leader', to: near, seed: rid(), foe: e.type, enemy: e, answers: {} };
    match.timer = setTimeout(leaderGo, 9000);
    setM({ id: match.id, kind: 'coop', to: near, seed: match.seed, foe: e.type });
    gatherCard();
    return true;
  };
  function gatherCard() {
    const yes = Object.values(match.answers).filter(a => a.ok).length;
    showCard(t('waitAllies', { a: yes, b: match.to.length }), [[t('startNow'), leaderGo]]);
  }
  function leaderCheck() {
    if (!match || match.role !== 'leader' || match.started) return;
    const answered = match.to.filter(id => match.answers[id]);
    if (match.kind === 'duel') {
      const a = match.answers[match.to[0]];
      if (!match.to.length) cancel('canceled'); else if (a) a.ok ? leaderGo() : cancel('declined', nameOf(match.to[0]));
    } else if (answered.length === match.to.length) leaderGo(); else gatherCard();
  }
  function leaderGo() {
    if (!match || match.started || match.role !== 'leader') return;
    const mine = myStats(match.kind), list = [{ p: myPeer, st: mine }].concat(match.to.filter(id => match.answers[id] && match.answers[id].ok).map(id => ({ p: id, st: match.answers[id].st })));
    if (list.length < 2) {
      if (match.kind === 'coop') { const e = match.enemy; endMatch(); closeCard(); Game.soloBattle(e); } else cancel('noAnswer');
      return;
    }
    if (match.kind === 'duel') list.sort((a, b) => num(b.st.agi, 0, 999, 0) - num(a.st.agi, 0, 999, 0) || (a.p < b.p ? -1 : 1));
    setM({ ...myM, go: list });
    begin(list);
  }
  function onMatchPeer(id, m) {
    const invCard = card && card.inv && card.leaderId === id;
    if (!m || typeof m !== 'object') { if (invCard && !match) closeCard(); return; }
    // invitation addressed to me (each one is shown once)
    if (!match && Array.isArray(m.to) && m.to.includes(myPeer) && !m.go && !seenInv.has(m.id)) {
      if (busyFlag || Battle.active()) return;
      seenInv.add(m.id);
      const n = nameOf(id), inv = { id: str(m.id, 16), kind: m.kind === 'duel' ? 'duel' : 'coop', leader: id, seed: str(m.seed, 16), foe: ENEMIES[m.foe] ? m.foe : 'slime' };
      showCard(inv.kind === 'duel' ? t('invDuel', { n }) : t('invCoop', { n, f: L(ENEMIES[inv.foe].name) }),
        [[t('accept'), () => accept(inv)], [t('decline'), () => { pres({ m: { id: inv.id, ok: false } }); closeCard(); }]], 15000);
      card.inv = m.id; card.leaderId = id;
      return;
    }
    if (!match) { if (invCard && (m.id !== card.inv || m.go)) closeCard(); return; } // invitation withdrawn or started without me
    if (m.id !== match.id) return;
    if (match.role === 'leader' && !match.started && match.to.includes(id) && 'ok' in m && !match.answers[id]) {
      match.answers[id] = { ok: !!m.ok, st: m.st || {} }; leaderCheck(); return;
    }
    if (match.role === 'member' && id === match.leader && !match.started && Array.isArray(m.go)) {
      if (m.go.some(e => e && e.p === myPeer)) begin(m.go.slice(0, 4)); else cancel('canceled');
      return;
    }
    if (match.started && typeof m.s === 'number') Battle.remote(id, m.s, cleanAct(m.a));
  }
  function accept(inv) {
    closeCard();
    if (match || Battle.active()) return;
    match = { ...inv, role: 'member', answers: {} };
    match.timer = setTimeout(() => cancel('noAnswer'), 15000);
    setM({ id: inv.id, ok: true, st: myStats(inv.kind) });
    N.busy(true); UI.close(); World.paused = true;
    showCard(t('waitLeader', { n: nameOf(inv.leader) }), []);
  }

  function begin(list) {
    clearTimeout(match.timer); closeCard(); UI.close(); World.paused = true; // closing a panel would otherwise wake the world
    match.started = true; match.fighters = list.map(e => e.p).filter(p => p !== myPeer);
    const duel = match.kind === 'duel', mesh = id => peers.get(id) && peers.get(id).mesh;
    const fighters = list.map(e => e.p === myPeer
      ? fighterFrom(e.st, 'me', 'me', 'hero')
      : fighterFrom(e.st || {}, e.p, 'net', duel ? 'foe' : 'hero'));
    if (duel) {
      const opp = match.fighters[0], m = mesh(opp);
      World.beginStage(m || World.buildHero(cleanLook({}), fighters.find(f => f.key === opp).cls), !m);
    } else {
      fighters.push(Game.monsterFighter(match.foe, list.length));
      const allies = match.fighters.filter(mesh).map(id => ({ key: id, mesh: mesh(id) }));
      if (match.role === 'leader') World.beginStage(match.enemy.mesh, false, allies);
      else World.beginStage(World.buildEnemy(match.foe), true, allies);
    }
    const opp = duel && fighters.find(f => f.ctrl === 'net'), enemy = match.role === 'leader' ? match.enemy : null, type = match.foe;
    Battle.start({
      fighters, seed: match.seed, duel, title: t(duel ? 'duelTitle' : 'coopTitle'),
      send: (n, act) => setM({ ...myM, s: n, a: act }),
      onResolve: (res, info) => duel ? Game.arenaResult(res === 'win', opp.rating, opp.name, info) : Game.monsterResult(type, res, info, enemy),
      onEnd: res => { endMatch(); Game.afterBattle(res, duel); cleanupOrphans(); }
    });
  }
  function endMatch() { if (match) clearTimeout(match.timer); match = null; setM(null); }
  function cancel(key, n) {
    if (!match) return;
    const coopLeader = match.role === 'leader' && match.kind === 'coop' && !match.started ? match.enemy : null;
    endMatch(); closeCard();
    if (key) UI.toast(t(key, { n: n || '' }));
    if (coopLeader) { Game.soloBattle(coopLeader); return; }
    if (!Battle.active()) { N.busy(false); World.paused = !$('panel').hidden || !$('create').hidden; }
  }
  function cleanupOrphans() { orphans.splice(0).forEach(o => World._scene.remove(o)); }

  // ---------- invitation / status card ----------
  function showCard(text, buttons, ttl) {
    closeCard();
    card = h('div', { id: 'invite', class: 'card', role: 'alertdialog' }, h('b', {}, text), h('div', { class: 'row' }, buttons.map(([l, fn], i) => h('button', { type: 'button', class: i ? '' : 'primary', onclick: fn }, l))));
    document.body.append(card);
    if (ttl) card._t = setTimeout(closeCard, ttl);
  }
  function closeCard() { if (card) { clearTimeout(card._t); card.remove(); card = null; } }

  // ---------- outside claude.ai: rooms over PeerJS (WebRTC between browsers; a public broker only introduces them) ----------
  // ponytail: the first player to claim a room code hosts it and relays everyone's presence; when the host leaves, the
  // room ends for the others. Fine for a few friends; a real server (e.g. Supabase) would be the upgrade.
  const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  const loadPeerJS = () => window.Peer ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = PEERJS; s.onload = ok; s.onerror = () => no({ type: 'peerjs' }); document.head.append(s); });
  const plain = v => v && typeof v === 'object' && !Array.isArray(v);
  function peerRoom() {
    return {
      async join(name) {
        await loadPeerJS();
        const hostId = 'legenda-nusa-kabut-' + name, others = new Map(), conns = new Map(), errs = [];
        let mine = {}, subs = [], peer = null, hostConn = null, isHost = false, alive = true;
        const open = id => new Promise((ok, no) => { const p = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 }); const tm = setTimeout(() => { p.destroy(); no({ type: 'timeout' }); }, 12000); p.on('open', () => { clearTimeout(tm); ok(p); }); p.on('error', e => { clearTimeout(tm); p.destroy(); no(e); }); });
        const list = () => [{ peer: peer.id, isMe: true, sameTab: true, kind: 'viewer', presence: mine }, ...[...others].map(([id, p]) => ({ peer: id, isMe: false, sameTab: false, kind: 'viewer', presence: p }))];
        const fire = () => { const l = list(); subs.forEach(f => f({ peers: l, joined: [], left: [], updated: l })); };
        // at most 10 sends a second each way (positions already come at that pace)
        const soon = fn => { let tm = null; return () => { if (!tm) tm = setTimeout(() => { tm = null; fn(); }, 100); }; };
        const share = soon(() => { const all = { [peer.id]: mine }; others.forEach((p, id) => { all[id] = p; }); conns.forEach(c => c.open && c.send({ t: 'all', all })); });
        const sendMine = soon(() => hostConn && hostConn.open && hostConn.send({ t: 'p', p: mine }));
        try { peer = await open(hostId); isHost = true; } // nobody holds this code yet: host it
        catch (e) { if (e.type !== 'unavailable-id') throw e; peer = await open(null); }
        if (isHost) peer.on('connection', c => {
          c.on('open', () => { conns.set(c.peer, c); share(); });
          c.on('data', d => { if (d && d.t === 'p' && plain(d.p) && JSON.stringify(d.p).length < 8000) { others.set(c.peer, d.p); share(); fire(); } });
          c.on('close', () => { conns.delete(c.peer); others.delete(c.peer); share(); fire(); });
        });
        else {
          hostConn = peer.connect(hostId, { reliable: true });
          await new Promise((ok, no) => { const tm = setTimeout(() => no({ type: 'timeout' }), 12000); hostConn.on('open', () => { clearTimeout(tm); ok(); }); hostConn.on('error', e => { clearTimeout(tm); no(e); }); });
          hostConn.on('data', d => { if (!d || d.t !== 'all' || !plain(d.all)) return; others.clear(); for (const id in d.all) if (id !== peer.id && plain(d.all[id])) others.set(id, d.all[id]); fire(); });
          hostConn.on('close', () => { others.clear(); fire(); if (alive) errs.forEach(f => f({ type: 'host-left' })); });
        }
        return {
          name, peers: list, connected: () => !peer.disconnected,
          async presence(patch) { mine = { ...mine }; for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = JSON.parse(JSON.stringify(patch[k])); } isHost ? share() : sendMine(); fire(); },
          onPeers(f, onErr) { subs.push(f); if (onErr) errs.push(onErr); setTimeout(fire); return () => { subs = subs.filter(g => g !== f); }; },
          onConnection(f) { setTimeout(() => f(true)); return () => { }; },
          async leave() { alive = false; peer.destroy(); }
        };
      }
    };
  }

  // ---------- local test room: two tabs on localhost talk over BroadcastChannel ----------
  // ponytail: dev-only stand-in for the room capability so the game can be tested without claude.ai
  function devRoom() {
    const bc = new BroadcastChannel('nk-dev'), me = rid();
    return {
      async join(name) {
        const others = new Map(), subs = []; let mine = {};
        const peer = (id, p, self) => ({ peer: id, by: null, isMe: self, sameTab: self, kind: 'viewer', guest: false, presence: p, updatedAt: Date.now() });
        const all = () => [peer(me, mine, true), ...others.values()];
        const fire = () => { const list = all(); subs.forEach(f => f({ peers: list, joined: [], left: [], updated: list })); };
        const post = reply => bc.postMessage({ room: name, id: me, p: mine, reply });
        bc.onmessage = e => { const d = e.data; if (d.room !== name) return; if (d.bye) others.delete(d.id); else { if (!others.has(d.id) && !d.reply) post(true); others.set(d.id, peer(d.id, d.p, false)); } fire(); };
        addEventListener('pagehide', () => bc.postMessage({ room: name, id: me, bye: true }));
        post(false);
        return {
          name, peers: all, connected: () => true,
          async presence(patch) { mine = { ...mine }; for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = JSON.parse(JSON.stringify(patch[k])); } post(true); fire(); },
          onPeers(f) { subs.push(f); setTimeout(fire); return () => subs.splice(subs.indexOf(f), 1); },
          onConnection(f) { setTimeout(() => f(true)); return () => { }; },
          async leave() { bc.postMessage({ room: name, id: me, bye: true }); bc.onmessage = null; }
        };
      }
    };
  }
})();
