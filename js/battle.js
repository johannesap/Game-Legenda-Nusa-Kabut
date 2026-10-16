// Turn-based combat between two sides ('hero' / 'foe') with any number of fighters.
// Battle.start({fighters, seed, arena, duel, send(seq, act), onResolve(result, info), onEnd(result, info)})
// fighter: {key, ctrl: 'me'|'ai'|'net', side, name, lvl, cls?, maxHp, maxMp, atk, mag, def, agi, crit?, eva?, hp?, mp?, skills?: ids, boss?, poisonChance?, stunChance?}
// Every roll comes from one seeded generator, so all players in a networked fight compute the same
// outcomes from the same sequence of actions; only the chosen actions travel (Net -> Battle.remote).
(function () {
  const B = window.Battle = {};
  const $ = id => document.getElementById(id);
  let F = null, opts, rand, turn, seq, idx, phase, mode, log, info, wait, pending, me;
  const need = ms => { wait = Math.max(wait, ms); };
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const say = s => log.push(s);
  const alive = f => f.hp > 0 && !f.gone;

  B.active = () => !!F && phase !== 'done';

  B.start = function (o) {
    opts = o; rand = rng(hash(o.seed == null ? Math.random() : o.seed));
    F = o.fighters.map(f => ({
      buff: 1, poison: 0, stun: 0, defending: false, ...f,
      maxHp: f.maxHp || f.hp, hp: f.hp ?? f.maxHp, maxMp: f.maxMp || 0, mp: f.mp ?? f.maxMp ?? 0,
      eva: f.eva ?? Math.round(f.agi * 0.8), crit: f.crit ?? 5 + f.agi, skills: (f.skills || []).filter(id => SKILLS[id])
    }));
    me = F.find(f => f.ctrl === 'me');
    turn = 1; seq = 0; idx = 0; phase = 'wait'; mode = 'main'; log = []; info = { dmg: 0, maxHit: 0, turns: 1 }; pending = {};
    $('battleTitle').textContent = o.title || t(o.arena || o.duel ? 'arenaBattle' : 'battle');
    $('battle').hidden = false; document.body.classList.add('inbattle');
    say(t('logAppear', { b: F.filter(f => f.side !== me.side).map(f => f.name).join(', ') }));
    render(); setTimeout(step, 600);
  };

  // another player's chosen action for global action number n
  B.remote = function (key, n, act) {
    if (!F || phase === 'done' || n <= seq) return;
    pending[n] = { key, act };
    if (phase === 'net') tryRemote();
  };
  // a player left the room mid-fight
  B.gone = function (key) {
    const f = F && F.find(x => x.key === key);
    if (!f || f.gone || phase === 'done') return;
    f.gone = true; say(t('forfeit', { n: f.name }));
    if (F[idx] === f && phase === 'net') afterTurn(); else render();
  };

  function step() {
    const a = F[idx];
    if (a.ctrl === 'me') {
      if (a.stun) { phase = 'anim'; render(); setTimeout(() => perform(a, { k: 'pass' }), 500); return; }
      phase = 'input'; mode = 'main'; render(); return;
    }
    phase = a.ctrl === 'ai' ? 'ai' : 'net'; render();
    if (a.ctrl === 'ai') setTimeout(() => perform(a, aiChoose(a)), 450); else tryRemote();
  }
  function tryRemote() { const p = pending[seq + 1]; if (p && p.key === F[idx].key) { delete pending[seq + 1]; perform(F[idx], p.act); } }

  function perform(a, act) {
    phase = 'anim'; wait = 0; seq++;
    if (a.ctrl === 'me' && opts.send) opts.send(seq, act);
    if (upkeep(a)) doAction(a, act || { k: 'pass' });
    render();
    setTimeout(afterTurn, wait + 120);
  }
  function afterTurn() {
    F.forEach(f => { if (f.hp <= 0 && !f.dead) { f.dead = true; FX.die(f.key); } });
    if (checkEnd()) return;
    do { idx = (idx + 1) % F.length; if (idx === 0) info.turns = ++turn; } while (!alive(F[idx]));
    step();
  }
  function checkEnd() {
    if (me.gone) { end(me.fled ? 'fled' : 'lose'); return true; }
    if (!F.some(f => f.side !== me.side && alive(f))) { end('win'); return true; }
    if (!F.some(f => f.side === me.side && alive(f))) { end('lose'); return true; }
    return false;
  }
  function end(result) {
    phase = 'done';
    if (!opts.arena && !opts.duel) { Game.S.hp = Math.max(1, me.hp); Game.S.mp = me.mp; }
    info.result = result;
    if (result === 'lose' && !opts.arena && !opts.duel) say(t('logLose'));
    const extra = opts.onResolve ? opts.onResolve(result, info) : null;
    if (extra) extra.forEach(say);
    render();
  }

  // ---------- rules ----------
  function aiChoose(a) {
    const sk = a.skills.map(id => SKILLS[id]);
    const heal = sk.find(s => s.heal && a.mp >= s.mp), atk = sk.filter(s => s.pow && a.mp >= s.mp);
    if (heal && a.hp < a.maxHp * 0.4) return { k: 'skill', s: heal.id };
    if (atk.length && rand() < 0.45) return { k: 'skill', s: atk[Math.floor(rand() * atk.length)].id };
    if (a.boss && turn % 3 === 0) return { k: 'breath' };
    return { k: 'attack' };
  }

  // look: [style, color, element, options] (see SKFX in data.js)
  function hitFx(a, b, look, res) {
    const [style, col, elem, opt] = look, o = opt || {};
    const impact = () => {
      if (res.miss) { FX.number(b.key, t('miss'), 'miss'); return; }
      FX.flash(b.key); FX.number(b.key, res.crit ? res.d + '!' : res.d, res.crit ? 'crit' : '');
      FX.impact(b.key, elem || 'slash', col, o.strong || res.crit);
      shake(b.key);
    };
    if (style === 'melee') { FX.lunge(a.key, b.key, impact, col, o); need(o.dash ? 480 : o.leap ? 720 : 620); }
    else { FX.bolt(a.key, b.key, style, col, impact, elem, o); need({ volley: 720, meteor: o.count > 1 ? 820 : 580, strike: elem === 'ice' ? 640 : 540, spikes: 500, wave: 440 }[style] || 420); }
  }
  function strike(a, b, pow, stat, extra) {
    extra = extra || {};
    const look = extra.look || BASIC_FX[a.cls] || ['melee', 0xffffff, 'slash', {}];
    if (!extra.sure && rand() * 100 < Math.min(25, b.eva * 0.6)) { say(t('logMiss', { a: a.name })); hitFx(a, b, look, { miss: true }); return 0; }
    let d = (a[stat] || a.atk) * pow * a.buff * (0.9 + rand() * 0.2) - (stat === 'mag' ? b.def * 0.3 : b.def * 0.7), crit = false;
    if (rand() * 100 < a.crit + (extra.crit || 0)) { d *= 1.6; crit = true; say(t('logCrit')); }
    if (b.defending) d /= 2;
    d = Math.max(1, Math.round(d));
    b.hp = Math.max(0, b.hp - d);
    say(t('logHit', { a: a.name, b: b.name, d }));
    if (a === me) { info.dmg += d; info.maxHit = Math.max(info.maxHit, d); }
    hitFx(a, b, look, { d, crit });
    return d;
  }
  function applySkill(a, b, sk) {
    a.mp -= sk.mp;
    say('✦ ' + L(sk.name));
    FX.banner(L(sk.name), sk.col); FX.cast(a.key, sk.col);
    if (sk.fx !== 'melee') FX.circle(a.key, sk.col); // magic circle under casters and archers
    if (sk.heal) { const n = Math.min(a.maxHp - a.hp, Math.round((a.mag || a.atk) * sk.heal * 2 + a.maxHp * 0.08)); a.hp += n; say(t('logHeal', { a: a.name, n })); FX.pillar(a.key, sk.col); FX.heal(a.key, '+' + n); need(900); }
    if (sk.buff) { a.buff = sk.buff; say(t('logBuff', { a: a.name })); if (sk.id === 'barrier') FX.shield(a.key); else FX.aura(a.key, sk.col); need(750); }
    if (sk.pow) {
      const d = strike(a, b, sk.pow, sk.stat, { sure: true, crit: sk.crit, look: [sk.fx, sk.col, sk.elem, sk.opt] }), land = wait;
      if (d && sk.drain) { const n = Math.min(a.maxHp - a.hp, Math.round(d * sk.drain)); a.hp += n; say(t('logDrain', { a: a.name, n })); FX.later(land, () => { FX.drain(b.key, a.key, sk.col); FX.later(450, () => FX.heal(a.key, '+' + n, sk.col)); }); need(land + 1100); }
      if (d && sk.poison) { b.poison = 3; b.poisonDmg = Math.round(sk.poison + a.lvl * 1.2); say(t('logPoison', { b: b.name })); FX.later(land, () => { FX.poison(b.key); FX.cloud(b.key, 0x8fe04a); }); need(land + 500); }
      if (d && sk.stun && rand() < sk.stun) { b.stun = 1; say(t('logStun', { b: b.name })); FX.later(land, () => FX.stars(b.key)); need(land + 600); }
    }
  }
  // start-of-action effects; false when the fighter loses the action
  function upkeep(f) {
    f.defending = false;
    if (f.poison > 0) { f.poison--; f.hp = Math.max(0, f.hp - f.poisonDmg); say(t('logPoisonTick', { a: f.name, d: f.poisonDmg })); FX.poison(f.key, f.poisonDmg); need(700); if (f.hp <= 0) return false; }
    if (f.stun) { f.stun = 0; say(t('logStunned', { a: f.name })); FX.stars(f.key); need(900); return false; }
    return true;
  }
  function doAction(a, act) {
    const targets = F.filter(f => f.side !== a.side && alive(f));
    if (!targets.length) return;
    const b = targets.length === 1 ? targets[0] : targets[Math.floor(rand() * targets.length)];
    if (act.k === 'attack') {
      const d = strike(a, b, 1, 'atk'), land = wait;
      if (d && a.poisonChance && rand() < a.poisonChance && !b.poison) { b.poison = 3; b.poisonDmg = Math.round(a.lvl * 1.5); say(t('logPoison', { b: b.name })); FX.later(land, () => FX.poison(b.key)); need(land + 500); }
      if (d && a.stunChance && rand() < a.stunChance) { b.stun = 1; say(t('logStun', { b: b.name })); FX.later(land, () => FX.stars(b.key)); need(land + 600); }
    }
    if (act.k === 'breath') { // boss signature attack every third round
      const [name, col, sty, el] = a.special || [{ id: 'Serangan Dahsyat', en: 'Fierce Blow' }, 0xb06cff];
      say('✦ ' + L(name)); FX.banner(L(name), col); FX.cast(a.key, col); FX.circle(a.key, col);
      const breath = a.type === 'kraken' || a.type === 'frostwyrm' || a.type === 'dragon';
      strike(a, b, 1.7, 'atk', { sure: true, look: [sty || (breath ? 'bolt' : 'meteor'), col, el || (a.type === 'frostwyrm' ? 'ice' : breath ? 'arcane' : 'fire'), { strong: 1 }] });
    }
    if (act.k === 'defend') { a.defending = true; a.mp = Math.min(a.maxMp, a.mp + 4); say(t('logDefend', { a: a.name })); FX.shield(a.key); FX.number(a.key, '+4 MP', 'mp'); need(700); }
    if (act.k === 'skill') { const sk = SKILLS[act.s]; if (sk && a.mp >= sk.mp) applySkill(a, b, sk); else strike(a, b, 1, 'atk'); }
    if (act.k === 'item') {
      const it = ITEMS[act.i], h0 = a.hp, m0 = a.mp;
      if (a === me) say(Game.useItem(act.i, a));
      else if (it && it.type === 'use') { a.hp = Math.min(a.maxHp, a.hp + (it.heal || 0)); a.mp = Math.min(a.maxMp, a.mp + (it.mana || 0)); say(t('logHeal', { a: a.name, n: a.hp - h0 })); }
      if (a.hp > h0) FX.heal(a.key, '+' + (a.hp - h0)); if (a.mp > m0) FX.heal(a.key, '+' + (a.mp - m0) + ' MP', 0x6f97ea, 'mp'); need(900);
    }
    if (act.k === 'flee') {
      const chance = opts.arena || opts.duel ? 0 : (b.boss ? 0.25 : 0.5 + (a.agi - b.agi) * 0.04);
      if (opts.arena || opts.duel || rand() < chance) {
        a.gone = true; a.fled = !opts.arena && !opts.duel;
        say(a.fled && a === me ? t('logFleeOk') : t('forfeit', { n: a.name }));
        if (a.fled) FX.flee(a.key); need(650);
      } else { say(t('logFleeFail')); FX.number(a.key, '✗', 'miss'); need(500); }
    }
    if (a.ctrl === 'ai' && a.skills.length) a.mp = Math.min(a.maxMp, a.mp + 3);
  }

  // ---------- panel ----------
  function shake(key) { const el = $('card_' + key); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } }
  function card(f) {
    const el = document.createElement('div'); el.className = 'fighter' + (F[idx] === f && phase !== 'done' ? ' current' : '') + (alive(f) ? '' : ' down'); el.id = 'card_' + f.key;
    const chips = [f.poison ? '☠ ' + f.poison : '', f.stun ? '✱' : '', f.buff > 1 ? '▲' : '', f.defending ? '⛨' : ''].filter(Boolean).join(' ');
    const mp = f.maxMp && f.side === me.side;
    el.innerHTML = '<h3></h3><div class="sub"></div><div class="bar hp"><i></i></div>' + (mp ? '<div class="bar mp"><i></i></div>' : '');
    el.querySelector('h3').textContent = f.name + (f === me && F.length > 2 ? ' (' + t('you') + ')' : '');
    el.querySelector('.sub').textContent = t('lvl', { n: f.lvl }) + ' · HP ' + f.hp + '/' + f.maxHp + (mp ? ' · MP ' + f.mp + '/' + f.maxMp : '') + (chips ? ' · ' + chips : '');
    el.querySelector('.hp i').style.width = (f.hp / f.maxHp * 100) + '%';
    if (mp) el.querySelector('.mp i').style.width = (f.mp / f.maxMp * 100) + '%';
    return el;
  }
  // every skill as a button in a column on the right, ready whenever it is your turn
  function skillBar(choose) {
    const bar = $('skillbar'), sheet = document.querySelector('#battle .sheet');
    bar.hidden = phase === 'done';
    if (bar.hidden) return;
    const head = document.createElement('div'); head.className = 'skillhead'; head.textContent = t('skills');
    const btns = me.skills.map(id => SKILLS[id]).map(sk => {
      const b = document.createElement('button'); b.type = 'button'; b.style.setProperty('--sk', '#' + new THREE.Color(sk.col).getHexString());
      const n = document.createElement('b'); n.textContent = L(sk.name);
      const c = document.createElement('small'); c.textContent = t('cost', { n: sk.mp });
      b.append(n, c); b.disabled = phase !== 'input' || me.mp < sk.mp; b.onclick = () => choose({ k: 'skill', s: sk.id });
      return b;
    });
    bar.replaceChildren(head, ...btns);
    requestAnimationFrame(() => { bar.style.maxHeight = Math.max(120, sheet.getBoundingClientRect().top - 24) + 'px'; }); // after render() has filled the panel
  }
  function render() {
    $('battleTurn').textContent = t('turn', { n: turn });
    const body = $('battleBody'), col = mine => { const c = document.createElement('div'); c.className = 'side'; F.filter(f => (f.side === me.side) === mine).forEach(f => c.append(card(f))); return c; };
    const vs = document.createElement('div'); vs.className = 'vs'; vs.textContent = 'VS';
    const foes = document.createElement('div'); foes.className = 'foes'; foes.append(col(true), vs, col(false));
    const bl = document.createElement('div'); bl.className = 'blog'; log.slice(-30).forEach(s => { const p = document.createElement('p'); p.textContent = s; bl.append(p); });
    const acts = document.createElement('div'); acts.className = 'acts';
    const hint = document.createElement('p'); hint.className = 'sub camhint'; hint.textContent = t('camHint');
    body.replaceChildren(foes, bl, acts, hint); bl.scrollTop = bl.scrollHeight;
    const btn = (label, fn, sub, dis) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (sub) { const s = document.createElement('small'); s.textContent = sub; b.append(s); } b.disabled = !!dis; b.onclick = fn; acts.append(b); return b; };
    const choose = act => { if (phase === 'input') perform(me, act); };
    skillBar(choose);
    if (phase === 'done') { btn(t('continue'), () => { $('battle').hidden = true; $('skillbar').hidden = true; document.body.classList.remove('inbattle'); const o = opts; F = null; o.onEnd(info.result, info); }).classList.add('primary'); return; }
    if (phase !== 'input') { const p = document.createElement('p'); p.className = 'sub'; p.textContent = phase === 'anim' ? '…' : t('waitTurn', { n: F[idx].name }); acts.append(p); return; }
    if (mode === 'main') {
      btn(t('attack'), () => choose({ k: 'attack' })).classList.add('primary');
      btn(t('item'), () => { mode = 'item'; render(); });
      btn(t('defend'), () => choose({ k: 'defend' }), '+4 MP');
      btn(t('flee'), () => choose({ k: 'flee' }));
    } else if (mode === 'item') {
      const usable = Game.S.inv.filter(i => ITEMS[i.id].type === 'use');
      if (!usable.length) { const p = document.createElement('p'); p.className = 'sub'; p.textContent = t('noItems'); acts.append(p); }
      usable.forEach(i => btn(L(ITEMS[i.id].name), () => choose({ k: 'item', i: i.id }), t('qty', { n: i.n })));
      btn(t('back'), () => { mode = 'main'; render(); });
    }
  }
})();
