// Game state, progression rules, quests, arena matchmaking and boot.
(function () {
  const $ = id => document.getElementById(id);
  const G = window.Game = { S: null };
  const pad = n => String(n).padStart(2, '0');
  G.today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  G.season = () => { const d = new Date(), end = new Date(d.getFullYear(), d.getMonth() + 1, 1); return { id: d.getFullYear() + '-' + pad(d.getMonth() + 1), daysLeft: Math.ceil((end - d) / 864e5) }; };

  function fresh(name, cls, look) {
    const kind = CLASSES[cls].weapon, S = {
      v: 1, hero: { name, look }, cls, evo: null, evo2: null, seen: [], learned: [], lvl: 1, xp: 0, gold: 30, attr: { ...CLASSES[cls].base }, pts: 0, hp: 1, mp: 1,
      inv: [{ id: kind + '0', n: 1 }, { id: 'armor0', n: 1 }, { id: 'potion', n: 3 }, { id: 'ether', n: 1 }], eq: { weapon: kind + '0', armor: 'armor0' },
      pos: { x: 0, z: 6 }, st: { battles: 0, wins: 0, losses: 0, kills: {}, dmg: 0, maxHit: 0, gold: 0, steps: 0, playMs: 0, chests: 0, arenaW: 0, arenaL: 0, dailyClaims: 0, chats: 0, sailed: 0 }, guild: { pts: 0, day: '', board: [], active: [] }, bossClaims: [],
      log: [], ach: {}, daily: { date: '', kill: 0, chest: 0, arena: 0, score: 0, claimed: [], opened: [] }, rating: 1000, season: '', rewards: [],
      profile: { title: '', bio: '', color: look.cape }, settings: { lang: LANG, theme: 'auto', accent: '', scale: 1, quality: matchMedia('(pointer: coarse)').matches ? 'low' : 'high', reminder: '19:00', notif: true, lastRemind: '', warned: '' },
      notes: [], updated: 0, story: 0
    };
    const st = heroStats(S); S.hp = st.maxHp; S.mp = st.maxMp;
    return S;
  }

  // ---------- saving ----------
  let cloudTimer = 0;
  G.save = function (now) {
    const S = G.S; if (!S) return;
    S.pos = World.playerPos(); S.updated = Date.now();
    Cloud.saveLocal(S);
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => { Cloud.pushSave(S); Cloud.pushBoard(G.boardEntry()); }, now ? 0 : 4000);
  };
  G.boardEntry = function () {
    const S = G.S, st = heroStats(S);
    return { name: S.hero.name, cls: S.cls, evo: S.evo, evo2: S.evo2, lvl: S.lvl, xp: S.xp, rating: S.rating, season: S.season, day: S.daily.date, dayScore: S.daily.score,
      wins: S.st.wins, kills: kills(S), look: S.hero.look, build: { ...st, skills: heroSkills(S).filter(s => s.ok).map(s => s.id) }, updated: S.updated };
  };

  // ---------- notifications ----------
  G.notify = function (msg) {
    const S = G.S; S.notes.push({ t: Date.now(), msg, read: false }); if (S.notes.length > 50) S.notes.splice(0, S.notes.length - 50);
    UI.toast(msg); UI.hud();
  };
  G.checkAch = function () {
    const S = G.S; ACHS.forEach(a => { if (!S.ach[a.id] && a.ok(S)) { S.ach[a.id] = Date.now(); G.notify(t('achUnlocked', { n: L(a.name) })); } });
  };

  // ---------- items ----------
  const resolveId = id => /^weapon\d$/.test(id) ? CLASSES[G.S.cls].weapon + id.slice(-1) : id;
  G.addItem = function (id) { id = resolveId(id); const s = G.S.inv.find(i => i.id === id); if (s) s.n++; else G.S.inv.push({ id, n: 1 }); return L(ITEMS[id].name); };
  // shops: only inside a settlement, only what that settlement stocks
  G.townHere = () => { const p = World.player(); return p ? Terrain.townAt(p.position.x, p.position.z) : null; };
  G.itemFor = id => resolveId(id);
  G.buy = function (id) {
    const S = G.S, tw = G.townHere(), it = ITEMS[resolveId(id)];
    if (!tw || !tw.goods.includes(id) || !it || S.lvl < GOODS[id] || S.gold < it.price) return;
    S.gold -= it.price; G.addItem(id); UI.toast(t('bought', { n: L(it.name) })); G.save(); UI.hud();
  };
  G.learn = function (id) {
    const S = G.S, tw = G.townHere(), [price, lvl] = LEARN[id] || [];
    if (!tw || !tw.books.includes(id) || S.learned.includes(id) || S.lvl < lvl || S.gold < price) return;
    S.gold -= price; S.learned.push(id); G.notify(t('learnedSkill', { n: L(SKILLS[id].name) })); G.save(); UI.hud();
  };
  const take = id => { const S = G.S, i = S.inv.findIndex(x => x.id === id); if (i < 0) return false; if (--S.inv[i].n <= 0) S.inv.splice(i, 1); return true; };
  G.useItem = function (id, fighter) {
    const it = ITEMS[id]; if (!it || it.type !== 'use' || !take(id)) return '';
    const S = G.S, st = heroStats(S), f = fighter || { hp: S.hp, mp: S.mp, maxHp: st.maxHp, maxMp: st.maxMp, name: S.hero.name };
    let msg = '';
    if (it.heal) { const n = Math.min(it.heal, f.maxHp - f.hp); f.hp += n; msg = t('logHeal', { a: f.name, n }); }
    if (it.mana) { const n = Math.min(it.mana, f.maxMp - f.mp); f.mp += n; msg = t('logMana', { a: f.name, n }); }
    if (!fighter) { S.hp = f.hp; S.mp = f.mp; UI.toast(msg); G.save(); UI.hud(); }
    return msg;
  };
  // the hero's look plus the tier of the weapon in hand (weapons look stronger at higher tiers)
  G.heroLook = () => ({ ...G.S.hero.look, wt: (ITEMS[G.S.eq.weapon] || {}).tier || 0 });
  G.equip = function (id) {
    const it = ITEMS[id], S = G.S; if (!it || (it.type !== 'weapon' && it.type !== 'armor')) return;
    if (it.type === 'weapon' && it.kind !== CLASSES[S.cls].weapon) return;
    S.eq[it.type] = id; const st = heroStats(S); S.hp = Math.min(S.hp, st.maxHp); G.save(); UI.hud();
    if (it.type === 'weapon') World.setHero(G.heroLook(), S.cls); // the new weapon shows in the hand
  };
  G.sell = function (id) {
    const S = G.S, eq = S.eq.weapon === id || S.eq.armor === id, slot = S.inv.find(i => i.id === id);
    if (!slot || (eq && slot.n <= 1)) return;
    take(id); const g = Math.ceil(ITEMS[id].price / 2); S.gold += g; S.st.gold += g; G.checkAch(); G.save(); UI.hud();
  };

  // ---------- progression ----------
  function gainXp(xp, msgs) {
    const S = G.S, lv0 = S.lvl; S.xp += xp;
    while (S.lvl < MAX_LVL && S.xp >= xpNeed(S.lvl)) {
      S.xp -= xpNeed(S.lvl); S.lvl++; S.pts += 3; const st = heroStats(S); S.hp = st.maxHp; S.mp = st.maxMp;
      msgs.push(t('levelUp', { n: S.lvl })); G.notify(t('levelUp', { n: S.lvl }));
      const n = evoChain(S).length + 1; if (S.lvl === EVO_LV[n]) G.notify(t('evoOpen', { n, lv: S.lvl }));
    }
    if (S.lvl >= MAX_LVL) S.xp = 0; // the cap: nothing left to bank
    if (S.lvl > lv0) Sound.play('level');
  }
  G.allocate = a => { const S = G.S; if (S.pts > 0) { S.attr[a]++; S.pts--; G.save(); UI.hud(); } };
  G.evolve = function (id) {
    const S = G.S, e = EVOS[id], tier = e && (e.tier || 1);
    if (!e || e.from !== (S.evo2 || S.evo || S.cls) || S.lvl < EVO_LV[tier]) return; // only the next job on your own path
    if (tier === 1) S.evo = id; else S.evo2 = id;
    for (const k in e.bonus) S.attr[k] += e.bonus[k];
    G.notify(L(e.name) + '!'); questCheck(); G.save(); UI.hud();
  };

  // ---------- daily quests, season, reminders ----------
  G.quests = function () {
    const S = G.S, seed = +G.today().replace(/-/g, '') % 4, d = S.daily;
    return [{ k: 'kill', n: 5 + seed, label: t('qKill', { n: 5 + seed }) }, { k: 'chest', n: 2, label: t('qChest', { n: 2 }) }, { k: 'arena', n: 1, label: t('qArena', { n: 1 }) }]
      .map(q => ({ ...q, cur: d[q.k], done: d[q.k] >= q.n, claimed: d.claimed.includes(q.k) }));
  };
  // ---------- the main story: a finished goal pays out and opens the next chapter (several at once for a hero who did them before) ----------
  const storyMet = g => g.town ? (G.townHere() || {}).id === g.town : g.boss ? G.S.st.kills[g.boss] > 0 : !!G.S.evo;
  function storyCheck() {
    const S = G.S; let n = 0;
    while (S.story < STORY.length && storyMet(STORY[S.story].goal)) {
      const g = 200 * (S.story + 1), x = Math.round(xpNeed(Math.min(S.lvl, MAX_LVL - 1)) * 0.25);
      S.gold += g; S.st.gold += g; gainXp(x, []); G.notify(t('stDone', { c: L(STORY[S.story].title), g, x })); S.story++; n++;
    }
    if (n) { Sound.play('level'); UI.hud(); } if (n && !UI.current && $('battle').hidden && $('create').hidden) UI.open('story');
  }
  G.storyGoal = g => {
    if (g.town) return t('stGoTown', { n: L(TOWNS.find(x => x.id === g.town).name) });
    if (g.evo) return t('stGoEvo', { lv: EVO_LV[1] });
    const l = LAIRS.find(x => x.type === g.boss);
    const lv = Terrain.areaLevel(l.x, l.z);
    return t('stGoBoss', { n: L(ENEMIES[g.boss].name), r: L(BIOMES[l.region].name) }) + (lv > 1 ? ' · ' + t('needLvl', { n: lv }) : '');
  };
  // where the current chapter leads (a star on the maps)
  G.storyTarget = () => { const c = STORY[G.S.story], g = c && c.goal; return !g ? null : g.town ? TOWNS.find(x => x.id === g.town) : g.boss ? Terrain.LAIRS.find(l => l.type === g.boss) : null; };
  function questCheck() {
    const S = G.S; storyCheck();
    G.quests().forEach(q => { if (q.done && !q.claimed) { S.daily.claimed.push(q.k); S.gold += 50; S.st.gold += 50; S.st.dailyClaims++; G.notify('✓ ' + q.label + ' · ' + t('reward', { g: 50 })); } });
    G.checkAch();
  }
  function timeChecks() {
    const S = G.S; if (!S) return;
    const today = G.today(), se = G.season();
    if (S.daily.date !== today) {
      const first = !S.daily.date;
      S.daily = { date: today, kill: 0, chest: 0, arena: 0, score: 0, claimed: [], opened: [] }; World.setChests([]);
      if (!first) G.notify(t('nDaily'));
    }
    if (S.season !== se.id) { if (S.season) G.notify(t('nSeasonNew', { s: se.id })); S.season = se.id; S.rating = 1000; }
    if (se.daysLeft <= 3 && S.settings.warned !== se.id) { S.settings.warned = se.id; G.notify(t('nSeasonEnd', { s: se.id, n: se.daysLeft })); }
    const d = new Date(), hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (S.settings.reminder && hm >= S.settings.reminder && S.settings.lastRemind !== today && G.quests().some(q => !q.done)) { S.settings.lastRemind = today; G.notify(t('nReminder')); }
    G.applySettings();
  }

  // ---------- settings / theme ----------
  G.applySettings = function () {
    const st = G.S.settings, b = document.body;
    LANG = st.lang || 'id'; document.documentElement.lang = LANG;
    const hr = new Date().getHours();
    if (st.theme === 'auto') b.dataset.ui = hr >= 6 && hr < 18 ? 'light' : 'dark';
    else if (st.theme === 'system') delete b.dataset.ui; else b.dataset.ui = st.theme;
    if (st.accent) b.style.setProperty('--accent', st.accent); else b.style.removeProperty('--accent');
    b.style.setProperty('--scale', st.scale || 1);
  };

  // ---------- world events ----------
  function logBattle(foe, res, info) { const S = G.S; S.log.push({ t: Date.now(), foe, res, dmg: info.dmg, turns: info.turns }); if (S.log.length > 200) S.log.shift(); }
  // fighters and results shared by solo, arena and networked (Net) battles
  G.heroFighter = function (full) {
    const S = G.S, st = heroStats(S);
    return { key: 'me', ctrl: 'me', side: 'hero', name: S.hero.name, lvl: S.lvl, cls: S.cls, ...st, rating: S.rating,
      hp: full ? st.maxHp : Math.max(1, Math.round(Math.min(S.hp, st.maxHp))), mp: full ? st.maxMp : Math.min(S.mp, st.maxMp), skills: heroSkills(S).filter(s => s.ok).map(s => s.id) };
  };
  G.monsterFighter = function (type) {
    const d = ENEMIES[type], hp = d.hp;
    return { key: 'foe', ctrl: 'ai', side: 'foe', type, name: L(d.name), lvl: d.lvl, hp, maxHp: hp, atk: d.atk, def: d.def, agi: d.agi, poisonChance: d.poison, stunChance: d.stun, boss: d.boss, special: d.special };
  };
  G.monsterResult = function (type, res, info, e) {
    const d = ENEMIES[type], S = G.S, msgs = [];
    S.st.battles++; S.st.dmg += info.dmg; S.st.maxHit = Math.max(S.st.maxHit, info.maxHit);
    logBattle(L(d.name), res, info);
    if (res === 'win') {
      S.st.wins++; S.st.kills[type] = (S.st.kills[type] || 0) + 1; S.daily.kill++;
      const xp = Math.round(d.xp * Math.max(0.2, 1 - Math.max(0, S.lvl - d.lvl - 2) * 0.15)), g = d.gold[0] + Math.floor(Math.random() * (d.gold[1] - d.gold[0] + 1));
      S.gold += g; S.st.gold += g; S.daily.score += xp; msgs.push(t('logWin', { xp, g }));
      d.drops.forEach(([id, p]) => { if (Math.random() < p) msgs.push(t('drop', { item: G.addItem(id) })); });
      gainXp(xp, msgs); if (e) G.pendingRemove = e; // it falls on stage first, then leaves the world
      for (const b of S.guild.active) if (b.type === type && b.cur < b.n && ++b.cur === b.n) msgs.push(t('bountyReady', { m: L(d.name) }));
    }
    if (res === 'lose') { S.st.losses++; S.gold = Math.floor(S.gold * 0.9); }
    return msgs;
  };
  G.arenaResult = function (won, oppRating, oppName, info) {
    const S = G.S, se = G.season().id, exp = 1 / (1 + Math.pow(10, ((oppRating || 1000) - S.rating) / 400)), delta = Math.round(32 * ((won ? 1 : 0) - exp));
    S.rating = Math.max(0, S.rating + delta); S.st.battles++; S.st.dmg += info.dmg; S.st.maxHit = Math.max(S.st.maxHit, info.maxHit);
    if (won) { S.st.arenaW++; S.st.wins++; S.daily.arena++; S.daily.score += 50; } else { S.st.arenaL++; S.st.losses++; }
    logBattle('⚔ ' + String(oppName).slice(0, 16), won ? 'win' : 'lose', info);
    TIERS.forEach(tr => { const key = se + ':' + tr.id; if (S.rating >= tr.rating && !S.rewards.includes(key)) { S.rewards.push(key); G.notify(t('nReward', { n: L(tr.name) })); } });
    return [t('ratingChange', { d: (delta >= 0 ? '+' : '') + delta, r: S.rating })];
  };
  G.afterBattle = function (res, arena) {
    const S = G.S;
    World.endStage();
    if (G.pendingRemove) { World.removeEnemy(G.pendingRemove); G.pendingRemove = null; }
    if (res === 'lose' && !arena) { World.toVillage(); const st = heroStats(S); S.hp = st.maxHp; S.mp = st.maxMp; }
    World.grace = performance.now() + 2500; World.paused = false;
    questCheck(); G.save(arena); UI.hud(); Net.busy(false);
  };
  const byAgi = (a, b) => b.agi - a.agi;
  // a real-time fight in the world ended (action.js); rewards are already counted by monsterResult
  G.afterRealtime = function (res) {
    const S = G.S;
    if (res === 'lose') { World.toVillage(); const st = heroStats(S); S.hp = st.maxHp; S.mp = st.maxMp; World.grace = performance.now() + 4000; }
    questCheck(); G.save(); UI.hud();
  };
  World.onChest = function (id) {
    const S = G.S; S.daily.opened.push(id); S.st.chests++; S.daily.chest++;
    const roll = Math.random(); let what;
    if (roll < 0.4) { const g = 20 + Math.floor(Math.random() * 40); S.gold += g; S.st.gold += g; what = t('gold', { n: g }); }
    else what = G.addItem(roll < 0.7 ? 'potion' : roll < 0.85 ? 'ether' : roll < 0.95 ? 'hipotion' : 'weapon1');
    Sound.play('chest'); UI.toast(t('chestOpen', { item: what })); questCheck(); G.save(); UI.hud();
  };
  // entering a region: announce it once and remember it for the explorer achievement
  World.onArea = function (b, town) {
    const S = G.S; if (!S) return;
    UI.area = town ? L(town.name) : L(BIOMES[b].name); UI.clockLine();
    UI.toast(t(town ? 'enterTown' : 'enterArea', { a: UI.area }));
    if (!town && b !== 'water' && !S.seen.includes(b)) { S.seen.push(b); G.checkAch(); }
    if (town) questCheck(); // a chapter may lead here
  };
  let burnMsg = 0;
  World.onBurn = function (dt) {
    const S = G.S, st = heroStats(S); S.hp = Math.max(1, S.hp - st.maxHp * 0.08 * dt); // lava hurts but never knocks you out
    if (performance.now() > burnMsg) { burnMsg = performance.now() + 4000; UI.toast(t('burn')); }
    S.hp = Math.round(S.hp * 10) / 10; UI.hud();
  };
  // ---------- adventurers' guild: a daily bounty board, up to three bounties at once ----------
  G.rank = () => { const p = G.S.guild.pts; let i = 0; while (i + 1 < RANK_PTS.length && p >= RANK_PTS[i + 1]) i++; return i; };
  G.guildBoard = function () {
    const S = G.S, g = S.guild, day = G.today();
    if (g.day === day) return g.board;
    let r = +day.replace(/-/g, '') % 233280 + S.lvl * 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const pool = Object.keys(ENEMIES).filter(k => !ENEMIES[k].boss && ENEMIES[k].lvl <= S.lvl + 3 && ENEMIES[k].lvl >= S.lvl - 6), board = [];
    while (board.length < 3 && pool.length) {
      const k = pool.splice(Math.floor(rnd() * pool.length), 1)[0], d = ENEMIES[k], n = 3 + Math.floor(rnd() * 4);
      board.push({ id: day + k, type: k, n, cur: 0, gold: Math.round((d.gold[0] + d.gold[1]) / 2 * n * 1.5 + 20), xp: Math.round(d.xp * n * 0.6), pts: n });
    }
    const boss = LAIRS.map(l => l.type).filter(k => ENEMIES[k].lvl <= S.lvl + 4).sort((a, b) => ENEMIES[b].lvl - ENEMIES[a].lvl)[0];
    if (boss) { const d = ENEMIES[boss]; board.push({ id: day + boss, type: boss, n: 1, cur: 0, gold: d.lvl * 80, xp: d.xp, pts: 15, boss: true }); }
    g.day = day; g.board = board;
    return board;
  };
  G.acceptBounty = function (id) {
    const g = G.S.guild, i = g.board.findIndex(b => b.id === id);
    if (i < 0 || g.active.length >= 3) return;
    g.active.push(g.board.splice(i, 1)[0]); G.save(); UI.hud();
  };
  G.claimBounty = function (id) {
    const S = G.S, g = S.guild, i = g.active.findIndex(b => b.id === id), b = g.active[i];
    if (!b || b.cur < b.n || !World.context || World.context.kind !== 'guild') return; // hand in at the guild
    const before = G.rank(), msgs = [];
    g.active.splice(i, 1); S.gold += b.gold; S.st.gold += b.gold; g.pts += b.pts; gainXp(b.xp, msgs);
    G.notify(t('bountyDone', { g: b.gold, x: b.xp }));
    if (G.rank() > before) G.notify(t('rankUp', { r: RANKS[G.rank()] }));
    G.checkAch(); G.save(); UI.hud();
  };
  G.dropBounty = function (id) { const g = G.S.guild; g.active = g.active.filter(b => b.id !== id); G.save(); UI.hud(); };
  // the king pays once for each region boss you have defeated
  G.claimRoyal = function (type) {
    const S = G.S; if (!(S.st.kills[type] > 0) || S.bossClaims.includes(type) || !World.context || World.context.kind !== 'castle') return;
    const g = ENEMIES[type].lvl * 60; S.bossClaims.push(type); S.gold += g; S.st.gold += g;
    G.notify(t('royalReward', { g, n: L(ENEMIES[type].name) })); G.save(); UI.hud();
  };
  World.onPlace = kind => kind === 'skyup' || kind === 'skydown' ? G.skyGate(kind) : kind === 'dungeon' || kind === 'dnext' || kind === 'dexit' ? Dungeon.place(kind) : UI.open(kind);
  // walking into an area that needs a higher level
  let warnT = 0;
  World.onLocked = need => { if (performance.now() < warnT) return; warnT = performance.now() + 2500; UI.lockWarn(need); };
  // clearing the dungeon's fifth floor
  G.dungeonReward = function (lvl) {
    const S = G.S, gold = 60 * lvl, xp = Math.round(xpNeed(Math.min(lvl, MAX_LVL - 1)) * 0.4), msgs = [t('dReward', { g: gold, x: xp })];
    S.gold += gold; S.st.gold += gold; gainXp(xp, msgs); G.addItem('hipotion'); G.addItem('hipotion');
    msgs.forEach(m => UI.toast(m)); questCheck(); G.save(); UI.hud();
  };
  // the gates between the ground and the floating castle
  G.skyGate = function (kind) {
    const g = Terrain.SKYGATES[kind === 'skyup' ? 'top' : 'bottom'];
    World.warp(g.x, g.z, g.look); FX.flashScreen(0xfff0b0, 0.8); UI.toast(t(kind === 'skyup' ? 'skyUpMsg' : 'skyDownMsg')); G.save();
  };
  World.heroLvl = () => G.S.lvl;
  // teleport stones link every settlement
  G.warp = function (w) {
    if (!World.context || World.context.kind !== 'warp' || Battle.active()) return;
    if (Terrain.areaLevel(w.town.x, w.town.z) > G.S.lvl) return UI.toast(t('lockWarn', { n: Terrain.areaLevel(w.town.x, w.town.z) }));
    UI.close(); World.warp(w.ax, w.az, Math.atan2(w.town.x - w.ax, w.town.z - w.az)); // camera over the fountain, the stone behind you
    FX.flashScreen(0x9ff0ff, 0.7); Sound.play('cast'); UI.toast(t('warped', { town: L(w.town.name) })); G.save();
  };
  World.onContext = c => UI.action(c);
  // mounts: N, the 🦅 button or the Mounts panel call the last one ridden (a griffin at first); again to land and get off
  G.ride = function (kind) {
    if (!World.mount(kind)) return UI.toast(t('mountNo'));
    G.S.mount = kind; UI.close(); FX.flashScreen(0xfff2c0, 0.35); Sound.play('mount', kind === 'dragon'); UI.toast(t('mountCome', { m: t('mount_' + kind) })); G.save();
  };
  G.toggleMount = () => World.mounted() ? World.dismount() || UI.toast(t('mountLand')) : G.ride(G.S.mount || 'griffin');
  World.onMount = kind => UI.mountUI(kind);
  World.onSail = on => { if (on) { G.S.st.sailed++; G.checkAch(); } UI.toast(t(on ? 'sailOn' : 'sailOff')); };
  World.npcLine = (role, tw) => { const list = t(role === 'guard' ? 'npcGuard' : tw.city ? 'npcCity' : 'npcTown'); return list[Math.random() * list.length | 0].replace('{town}', L(tw.name)); };
  World.onSpring = function () { const S = G.S, st = heroStats(S); if (S.hp < st.maxHp || S.mp < st.maxMp) { S.hp = st.maxHp; S.mp = st.maxMp; UI.toast(t('rest')); UI.hud(); G.save(); } };
  let moved = false;
  World.onStep = d => { G.S.st.steps += d; moved = true; };

  // ---------- arena: async PvP against other players' saved builds ----------
  G.startArena = function () {
    const S = G.S, se = G.season().id;
    if (S.lvl < 3) return;
    const pool = Cloud.boardRows().filter(r => r.uid !== Cloud.uid && r.season === se && r.build && r.build.maxHp)
      .sort((a, b) => Math.abs(a.rating - S.rating) - Math.abs(b.rating - S.rating)).slice(0, 3);
    let opp = pool[Math.random() * pool.length | 0];
    if (!opp) { // nobody else this season yet: a shadow built from your own strength
      const mine = heroStats(S), k = 0.9 + Math.random() * 0.15, ids = Object.keys(CLASSES), cls = ids[Math.random() * ids.length | 0];
      opp = { name: t('ghostBot'), lvl: S.lvl, rating: S.rating, cls, build: { maxHp: Math.round(mine.maxHp * k), maxMp: mine.maxMp, atk: Math.round(mine.atk * k), mag: Math.round(mine.mag * k), def: mine.def, agi: mine.agi, crit: mine.crit, eva: mine.eva, skills: CLASSES[cls].skills.map(s => s[0]) } };
    }
    // other players' rows are checked like a duel opponent's: numbers clamped, unknown classes, skills and looks dropped
    const b = opp.build, ghost = Net.fighterFrom({ ...b, n: opp.name, l: opp.lvl, c: opp.cls, hp: b.maxHp, mp: b.maxMp, sk: b.skills, r: opp.rating }, 'foe', 'ai', 'foe');
    UI.close(); World.paused = true; Net.busy(true);
    const ghostLook = { skin: '#9aa3b2', hair: '#2b2f3a', hairStyle: 0, outfit: '#3a3550', cape: '#5b2a6e', capeOn: true, hat: 3, eyes: '#ff5a4a', height: 1, build: 1 };
    World.beginStage(World.buildHero(opp.look && opp.look.skin ? Net.cleanLook(opp.look) : ghostLook, ghost.cls), true);
    UI.toast(t('matchFound', { name: ghost.name, r: ghost.rating }));
    Battle.start({ arena: true, fighters: [G.heroFighter(true), ghost].sort(byAgi),
      onResolve: (res, info) => G.arenaResult(res === 'win', ghost.rating, ghost.name, info), onEnd: res => G.afterBattle(res, true) });
  };

  // ---------- boot ----------
  function migrate(S) {
    const base = fresh(S.hero.name, S.cls, S.hero.look);
    for (const k in base) if (S[k] === undefined) S[k] = base[k];
    for (const k of ['st', 'daily', 'settings', 'profile']) S[k] = { ...base[k], ...S[k] };
    return S;
  }
  function start(S) {
    G.S = migrate(S);
    G.applySettings(); UI.buildMenu();
    if (S.pos && Terrain.dungeonAt(S.pos.x, S.pos.z)) S.pos = { x: Terrain.DUNGEON.gate.x, z: Terrain.DUNGEON.gate.z };
    World.setHero(G.heroLook(), S.cls, S.pos); World.setChests(S.daily.opened);
    timeChecks(); questCheck(); UI.hud(); UI.sync(Cloud.status);
    World.paused = false; G.save();
  }
  G.finishCreate = function (name, cls, look, edit) {
    if (edit) { G.S.hero.name = name; G.S.hero.look = look; World.setHero(G.heroLook(), G.S.cls); G.save(); UI.hud(); World.paused = false; return; }
    start(fresh(name, cls, look));
    G.notify(t('nDaily')); UI.open('story'); // the first chapter is the welcome
  };
  // G.S goes first: the pagehide save on the way out would otherwise write the hero straight back
  G.reset = async function () { G.S = null; clearTimeout(cloudTimer); Cloud.clearLocal(); await Cloud.wipe(); location.reload(); };

  function adoptRemote(state) {
    if (!state || state.v !== 1) return;
    if (!G.S) { $('create').hidden = true; start(state); return; }
    if (state.updated <= G.S.updated || !$('battle').hidden) return;
    start(state); G.notify(t('nRemote'));
  }

  function boot(hot) {
    const local = (hot && hot.S) || Cloud.loadLocal();
    if (local && local.settings) LANG = local.settings.lang || 'id';
    $('hint').textContent = t('loading');
    // touch screens run on Saver unless the player chose a quality in Settings themselves
    // (per device: the same save opened on a computer goes back to High)
    const st0 = local && local.settings, q = st0 && st0.qPicked ? st0.quality : matchMedia('(pointer: coarse)').matches ? 'low' : 'high', autoLow = !!st0 && q === 'low' && st0.quality !== 'low';
    if (st0) st0.quality = q;
    if (!World.init($('scene'), q)) { document.body.append(UI.h('p', { class: 'card', style: 'position:fixed;inset:40% 16px auto;padding:16px' }, t('webglFail'))); return; }
    UI.buildMenu();
    if (local && local.v === 1) start(local); else UI.creator(false);
    if (autoLow) UI.toast(t('qAuto'));
    Net.init();
    Cloud.onStatus = UI.sync; UI.sync(Cloud.status);
    Cloud.onRemote = adoptRemote;
    Cloud.init().then(remote => {
      UI.sync(Cloud.status);
      if (remote && (!G.S || remote.updated > G.S.updated)) adoptRemote(remote);
      Cloud.startFeeds(); if (G.S) G.save(true);
    }).catch(() => UI.sync('local'));
    setInterval(() => { if (!G.S) return; if (!document.hidden) G.S.st.playMs += 1000; }, 1000);
    setInterval(() => { if (G.S && moved) { moved = false; G.checkAch(); G.save(); } }, 15000);
    setInterval(timeChecks, 30000);
    setInterval(() => UI.clockLine(), 1000);
    addEventListener('pagehide', () => G.S && Cloud.saveLocal(G.S));
    window.claude?.hot?.snapshot?.(() => ({ S: G.S }));
  }
  window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
})();
