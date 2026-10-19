// Real-time combat in the open world: monsters notice you, chase and strike on their own timers; you swing, shoot
// and cast with cooldowns (click a monster or press J, skills on Z X C V T G B Y, H drinks a potion). Rewards and defeat use the
// same Game.monsterResult as before. The arena and live duels keep the turn-based battle screen (battle.js).
(function () {
  const T = THREE, $ = id => document.getElementById(id), h = UI.h;
  const A = window.Action = { target: null };
  const live = World.live = { actors: {}, dir: new T.Vector3(0, 0, 1), shakeUntil: 0, shakeAmp: 0 };
  live.actors.me = { side: 'hero', tall: 2.1, get mesh() { return World.player(); }, get home() { return World.player().position; } };
  const RANGED = { mage: 1, ranger: 1, necromancer: 1, healer: 1 };
  const cds = {}; // skill id → time it is ready again
  let uid = 0, atkReady = 0, potReady = 0, buff = 1, buffUntil = 0, poison = null, lastHurt = 0, down = false, pending = null, hudT = 0, barKey = '';
  const now = () => performance.now();
  const key = e => 'e' + (e.uid || (e.uid = ++uid));
  const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const dist = e => flat(World.player().position, e.mesh.position);
  const alive = e => e && !e.dead && World.enemies.includes(e);
  const hero = () => { const S = Game.S, st = heroStats(S); return { ...st, lvl: S.lvl, buff: now() < buffUntil ? buff : 1 }; };

  // a monster joins the fight: its battle stats, an actor for the effects and an HP bar
  function engage(e) {
    if (!e.f) { const f = Game.monsterFighter(e.type); e.f = { ...f, eva: Math.round(f.agi * 0.8), crit: 5 + f.agi, buff: 1 }; e.dealt = 0; e.maxHit = 0; }
    const k = key(e);
    if (!live.actors[k]) live.actors[k] = { side: 'foe', mesh: e.mesh, tall: new T.Box3().setFromObject(e.mesh).getSize(new T.Vector3()).y || 2, get home() { return e.mesh.position; } };
    e.seen = now();
  }
  // same rules as a turn in battle.js: dodge, variance, defence, criticals
  function strike(a, b, pow, stat, sure, critBonus) {
    if (!sure && Math.random() * 100 < Math.min(25, b.eva * 0.6)) return { miss: true, d: 0 };
    let d = (a[stat] || a.atk) * pow * (a.buff || 1) * (0.9 + Math.random() * 0.2) - (stat === 'mag' ? b.def * 0.3 : b.def * 0.7), crit = false;
    if (Math.random() * 100 < a.crit + (critBonus || 0)) { d *= 1.6; crit = true; }
    return { d: Math.max(1, Math.round(d)), crit };
  }
  // the attack's look: a lunge or a projectile from one actor to the other, then onHit
  function play(from, to, look, onHit) {
    const [style, col, elem, opt] = look, o = opt || {};
    if (style === 'melee') FX.lunge(from, to, onHit, col, o); else FX.bolt(from, to, style, col, onHit, elem, o);
  }
  const face = e => { const p = World.player().position, m = e.mesh.position; World.player().rotation.y = Math.atan2(m.x - p.x, m.z - p.z); live.dir.set(m.x - p.x, 0, m.z - p.z).normalize(); };
  // pick the clicked monster, or the nearest one within reach
  function pickTarget(e, reach) {
    if (alive(e)) return e;
    if (alive(A.target) && dist(A.target) < reach + 2) return A.target;
    let best = null, bd = reach + 2;
    for (const o of World.enemies) if (!o.dead && dist(o) < bd) { best = o; bd = dist(o); }
    return best;
  }
  // too far: walk over first, then do it
  const approach = (e, act) => { pending = { e, act, t: now() }; World.moveTo(e.mesh.position); A.target = e; };

  // ---------- your moves ----------
  A.attack = function (e) {
    if (down || World.paused || World.stage) return;
    if (World.aloft()) return UI.toast(t('mountNoFight'));
    const S = Game.S, st = heroStats(S), look = BASIC_FX[S.cls] || ['melee', 0xffffff, 'slash', {}], reach = RANGED[S.cls] ? 15 : 3.4;
    const tgt = pickTarget(e, reach); if (tgt) A.target = tgt;
    if (tgt && dist(tgt) > reach) return approach(tgt, () => A.attack(tgt));
    if (now() < atkReady) return;
    atkReady = now() + (RANGED[S.cls] ? 950 : 750) * Math.max(0.55, 1 - st.agi * 0.004);
    if (!tgt) { FX.lunge('me', 'me', null, null, {}); return; } // a swing at the air
    face(tgt); engage(tgt); tgt.aggro = true;
    const res = strike(hero(), tgt.f, 1, st.mag > st.atk ? 'mag' : 'atk'); // casters fight with their magic
    play('me', key(tgt), look, () => land(tgt, res, look));
  };
  const cdOf = sk => 1500 + sk.mp * 220; // 5 MP: 2.6 s · 22 MP: 6.3 s
  A.skill = function (id) {
    if (down || World.paused || World.stage) return;
    if (World.aloft()) return UI.toast(t('mountNoFight'));
    const S = Game.S, sk = SKILLS[id]; if (!sk || (cds[id] || 0) > now()) return;
    if (S.mp < sk.mp) { UI.toast(t('noMp')); return; }
    const reach = sk.fx === 'melee' ? 4 : 18; let tgt = null;
    if (sk.pow) {
      tgt = pickTarget(null, reach); if (!tgt) { UI.toast(t('noTarget')); return; }
      if (dist(tgt) > reach) return approach(tgt, () => A.skill(id));
    }
    S.mp -= sk.mp; cds[id] = now() + cdOf(sk); UI.hud();
    FX.banner(L(sk.name), sk.col); FX.cast('me', sk.col); if (sk.fx !== 'melee') FX.circle('me', sk.col);
    const st = heroStats(S);
    if (sk.heal) { const n = Math.min(st.maxHp - S.hp, Math.round((st.mag || st.atk) * sk.heal * 2 + st.maxHp * 0.08)); S.hp += n; FX.pillar('me', sk.col); FX.heal('me', '+' + n); }
    if (sk.buff) { buff = sk.buff; buffUntil = now() + 12000; if (sk.id === 'barrier') FX.shield('me'); else FX.aura('me', sk.col); }
    if (tgt) {
      A.target = tgt; face(tgt); engage(tgt); tgt.aggro = true;
      const look = [sk.fx, sk.col, sk.elem, sk.opt], res = strike(hero(), tgt.f, sk.pow, sk.stat, true, sk.crit);
      play('me', key(tgt), look, () => {
        land(tgt, res, look);
        if (!alive(tgt) || tgt.dead) return;
        if (sk.drain) { const n = Math.min(st.maxHp - S.hp, Math.round(res.d * sk.drain)); S.hp += n; FX.drain(key(tgt), 'me', sk.col); FX.heal('me', '+' + n, sk.col); }
        if (sk.poison) { tgt.poison = { dmg: Math.round(sk.poison + S.lvl * 1.2), left: 3, next: now() + 1200 }; FX.poison(key(tgt)); }
        if (sk.stun && Math.random() < sk.stun) { tgt.stunUntil = now() + 2200; FX.stars(key(tgt)); }
      });
    }
    UI.hud();
  };
  A.potion = function () {
    if (down || World.paused || World.stage || now() < potReady) return;
    const S = Game.S, st = heroStats(S), has = id => S.inv.some(i => i.id === id);
    const id = st.maxHp - S.hp > 100 && has('hipotion') ? 'hipotion' : has('potion') ? 'potion' : has('hipotion') ? 'hipotion' : has('ether') && S.mp < st.maxMp ? 'ether' : null;
    if (!id) { UI.toast(t('noPotion')); return; }
    potReady = now() + 1500; Game.useItem(id); FX.pillar('me', ITEMS[id].mana ? 0x6f97ea : 0x7dff8a);
  };

  // a hit lands on a monster
  function land(e, res, look) {
    if (!alive(e) || e.dead) return;
    const k = key(e);
    if (res.miss) { FX.number(k, t('miss'), 'miss'); return; }
    e.f.hp -= res.d; e.dealt += res.d; e.maxHit = Math.max(e.maxHit, res.d); e.seen = now();
    FX.flash(k); FX.number(k, res.crit ? res.d + '!' : res.d, res.crit ? 'crit' : ''); FX.impact(k, look[2] || 'slash', look[1], (look[3] || {}).strong || res.crit);
    if (res.crit) FX.shake(0.25, 200);
    if (e.f.hp <= 0) kill(e);
  }
  function kill(e) {
    e.dead = true; e.aggro = false; if (A.target === e) A.target = null;
    const k = key(e), msgs = Game.monsterResult(e.type, 'win', { dmg: e.dealt, maxHit: e.maxHit, turns: 1 }, e) || [];
    msgs.forEach(m => UI.toast(m)); FX.die(k);
    setTimeout(() => { World.removeEnemy(e); delete live.actors[k]; if (Game.pendingRemove === e) Game.pendingRemove = null; }, 900);
    Game.afterRealtime('win');
  }

  // ---------- the monsters' moves (world.js calls this every frame for a monster that is after you) ----------
  World.onEnemy = function (e, d, reach, t0) {
    engage(e);
    if (down || e.dead || t0 < (e.stunUntil || 0)) return;
    if (!e.next) e.next = t0 + 650; // a short wind-up before the first blow
    if (t0 < e.next) return;
    const special = e.f.boss && ((e.swings || 0) + 1) % 4 === 0;
    if (d > (special ? 16 : reach)) return;
    e.swings = (e.swings || 0) + 1; e.next = t0 + (e.f.boss ? 2300 : 1700) * (0.9 + Math.random() * 0.2);
    const k = key(e), p = World.player().position; live.dir.set(p.x - e.mesh.position.x, 0, p.z - e.mesh.position.z).normalize().negate();
    if (special) {
      const [name, col, sty, el] = e.f.special || [{ id: 'Serangan Dahsyat', en: 'Fierce Blow' }, 0xb06cff];
      FX.banner(L(name), col); FX.cast(k, col); FX.circle(k, col);
      const res = strike(e.f, hero(), 1.7, 'atk', true);
      FX.bolt(k, 'me', sty || 'meteor', col, () => hurt(e, res, el || 'fire', col, true), el || 'fire', { strong: 1 });
    } else {
      const res = strike(e.f, hero(), 1, 'atk');
      play(k, 'me', ['melee', 0xffffff, 'slash', {}], () => hurt(e, res, 'slash', 0xffffff));
    }
  };
  World.onLeash = e => { if (e.f) e.f.hp = e.f.maxHp; e.poison = null; if (A.target === e) A.target = null; }; // gave up the chase: walks home healed
  function hurt(e, res, elem, col, strong) {
    if (down || !alive(e)) return;
    const S = Game.S;
    if (res.miss) { FX.number('me', t('miss'), 'miss'); return; }
    S.hp = Math.max(0, S.hp - res.d); lastHurt = now();
    FX.flash('me'); FX.number('me', res.d, 'hurt'); FX.impact('me', elem, col, strong || res.crit); if (strong) FX.shake(0.5, 300);
    if (e.f.poisonChance && Math.random() < e.f.poisonChance && !poison) { poison = { dmg: Math.round(e.f.lvl * 1.5), left: 3, next: now() + 1200, e }; FX.poison('me'); }
    if (e.f.stunChance && Math.random() < e.f.stunChance) { World.frozenUntil = now() + 1100; FX.stars('me'); }
    UI.hud();
    if (S.hp <= 0) faint(e);
  }
  // knocked out: carried back to the village (the usual defeat penalty applies)
  function faint(e) {
    down = true; poison = null; pending = null; A.target = null;
    FX.flashScreen(0x8a0a0a, 0.7); World.frozenUntil = now() + 1400;
    (Game.monsterResult(e.type, 'lose', { dmg: e.dealt || 0, maxHit: e.maxHit || 0, turns: 1 }, null) || []).forEach(m => UI.toast(m));
    UI.toast(t('faint'));
    setTimeout(() => { World.enemies.forEach(o => { o.aggro = false; o.next = 0; }); Game.afterRealtime('lose'); down = false; }, 1400);
  }

  // ---------- every frame in the open world ----------
  World.onLive = function (dt, t0) {
    const S = Game.S; if (!S) return;
    const st = heroStats(S), fighting = World.enemies.some(e => e.aggro && !e.dead);
    // regeneration: mana always trickles back, health only once nothing has hit you for a while
    const before = Math.round(S.hp) + ':' + Math.round(S.mp);
    S.mp = Math.min(st.maxMp, S.mp + st.maxMp * (fighting ? 0.015 : 0.04) * dt);
    if (!fighting && t0 - lastHurt > 6000) S.hp = Math.min(st.maxHp, S.hp + st.maxHp * 0.03 * dt);
    // poison ticks on you and on monsters
    if (poison && t0 > poison.next) { poison.next = t0 + 1200; S.hp = Math.max(1, S.hp - poison.dmg); FX.poison('me', poison.dmg); lastHurt = t0; if (--poison.left <= 0) poison = null; }
    for (const e of World.enemies) if (e.poison && !e.dead && t0 > e.poison.next) {
      e.poison.next = t0 + 1200; e.f.hp -= e.poison.dmg; e.dealt += e.poison.dmg; FX.poison(key(e), e.poison.dmg);
      if (--e.poison.left <= 0) e.poison = null; if (e.f.hp <= 0) kill(e);
    }
    if ((hudT -= dt) < 0) { hudT = 0.25; if (before !== Math.round(S.hp) + ':' + Math.round(S.mp)) UI.hud(); }
    // walked up to the monster you clicked: now strike
    if (pending) { if (!alive(pending.e) || t0 - pending.t > 6000) pending = null; else if (dist(pending.e) < (RANGED[S.cls] ? 15 : 3.4)) { const p = pending; pending = null; World.moveTo(null); p.act(); } }
    ring.visible = alive(A.target); if (ring.visible) ring.position.set(A.target.mesh.position.x, World.ground(A.target.mesh.position.x, A.target.mesh.position.z) + 0.08, A.target.mesh.position.z);
    bars(t0); hotbar(t0);
  };
  World.onPick = e => A.attack(e);

  // a red ring under the monster you are fighting
  const ring = new T.Mesh(new T.RingGeometry(0.9, 1.15, 32), new T.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.8, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; World._scene.add(ring);

  // ---------- HP bars over monsters in the fight ----------
  const barEls = new Map(), v = new T.Vector3();
  function bars(t0) {
    const cam = World._cam, keep = new Set();
    for (const e of World.enemies) {
      if (!e.f || e.dead || !(e.aggro || t0 - e.seen < 5000)) continue;
      keep.add(e);
      let el = barEls.get(e);
      if (!el) { el = h('div', { class: 'foebar' + (e.f.boss ? ' boss' : '') }, h('span', {}, e.f.name + ' · ' + t('lvl', { n: e.f.lvl })), h('div', {}, h('i'))); $('foebars').append(el); barEls.set(e, el); }
      v.copy(e.mesh.position); v.y += live.actors[key(e)].tall + 0.5; v.project(cam);
      el.hidden = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1;
      el.style.transform = 'translate(' + ((v.x + 1) / 2 * innerWidth) + 'px,' + ((1 - v.y) / 2 * innerHeight) + 'px)';
      el.lastChild.firstChild.style.width = Math.max(0, e.f.hp / e.f.maxHp * 100) + '%';
      el.classList.toggle('on', e === A.target);
    }
    for (const [e, el] of barEls) if (!keep.has(e)) { el.remove(); barEls.delete(e); }
  }

  // ---------- the hotbar: skills by number key and the potion; the basic attack has its own round button ----------
  const slot = (label, keyName, sub, fn, col) => h('button', { type: 'button', class: 'hb', style: col ? '--sk:' + col : '', onclick: fn, title: label + ' [' + keyName + ']' },
    h('kbd', {}, keyName), h('b', {}, label), sub ? h('small', {}, sub) : null, h('i', { class: 'cd' }));
  $('atkBtn').onclick = () => A.attack();
  const KEYS = ['Z', 'X', 'C', 'V', 'T', 'G', 'B', 'Y']; // skill keys: letters beside WASD that nothing else uses
  let list = [];
  function hotbar(t0) {
    const S = Game.S, bar = $('hotbar'), atk = $('atkBtn');
    list = heroSkills(S).filter(s => s.ok).sort((a, b) => b.lv - a.lv || b.mp - a.mp).slice(0, 8);
    const sig = S.cls + list.map(s => s.id).join() + LANG;
    if (sig !== barKey) {
      barKey = sig;
      atk.replaceChildren(h('b', {}, t('hbAttack')), h('kbd', {}, 'J'), h('i', { class: 'cd' })); atk.title = t('hbAttack') + ' [J]';
      bar.replaceChildren(...list.map((s, i) => slot(L(s.name), KEYS[i], t('cost', { n: s.mp }), () => A.skill(s.id), '#' + new T.Color(s.col || 0x888888).getHexString())),
        slot(t('hbPotion'), 'H', '', () => A.potion(), '#e05a5a'));
      UI.place();
    }
    atk.lastChild.style.height = Math.min(100, Math.max(0, atkReady - t0) / 9) + '%';
    const btns = bar.children, wait = [...list.map(s => Math.max(0, (cds[s.id] || 0) - t0) / cdOf(s)), Math.max(0, potReady - t0) / 1500];
    for (let i = 0; i < btns.length; i++) {
      btns[i].lastChild.style.height = Math.min(100, wait[i] * 100) + '%';
      if (i < list.length) btns[i].classList.toggle('nomp', S.mp < list[i].mp);
    }
  }
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,select') || World.paused || World.stage || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'j' || e.key === 'J') A.attack();
    else if (KEYS.includes(e.key.toUpperCase())) { const s = list[KEYS.indexOf(e.key.toUpperCase())]; if (s) A.skill(s.id); }
    else if (e.key === 'h' || e.key === 'H') A.potion();
    else if (e.key === 'n' || e.key === 'N') Game.toggleMount();
  });
})();
