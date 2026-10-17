// Online / social panels, settings and the character creator.
(function () {
  const $ = id => document.getElementById(id), h = UI.h;
  const offline = () => h('p', { class: 'sub' }, t('onlineOnly'));

  // ---------- arena + seasonal tournament ----------
  UI.panels.arena = {
    title: 'menu.arena', build() {
      const S = Game.S, se = Game.season();
      return h('div', {},
        h('p', {}, t('arenaDesc')),
        h('div', { class: 'tiles' }, [[t('season', { s: se.id }), t('endsIn', { n: se.daysLeft })], [t('rating'), S.rating], [t('arenaRec'), S.st.arenaW + '–' + S.st.arenaL]]
          .map(([k, v]) => h('div', { class: 'tile' }, h('div', { class: 'sub' }, k), h('div', { class: 'v' }, v)))),
        h('h3', {}, t('rewards')),
        h('div', { class: 'grid', style: 'margin-bottom:14px' }, TIERS.map(tr => { const got = S.rewards.includes(se.id + ':' + tr.id);
          return h('div', { class: 'slot' + (got ? ' equipped' : '') }, h('span', { style: 'display:block;height:10px;border-radius:3px;background:' + tr.color }), h('b', {}, L(tr.name)),
            h('span', { class: 'sub' }, got ? t('unlocked') : t('reqRating', { n: tr.rating }))); })),
        S.lvl < 3 ? h('p', { class: 'sub' }, t('arenaNeedLvl')) : h('button', { type: 'button', class: 'primary', onclick: () => Game.startArena() }, t('findMatch')),
        Cloud.db ? null : offline());
    }
  };

  // ---------- shop: gear and skill books, only inside a settlement ----------
  let shopTab = 'goods';
  const skillInfo = UI.skillInfo = sk => [sk.pow && t(sk.stat === 'mag' ? 'fxMag' : 'fxAtk', { x: sk.pow }), sk.heal && t('fxHeal'), sk.buff && t('fxBuff'),
    sk.poison && t('fxPoison'), sk.stun && t('fxStun'), sk.drain && t('fxDrain')].filter(Boolean).join(' · ');
  UI.panels.shop = {
    title: () => { const tw = Game.townHere(); return tw ? t('shopOf', { n: L(tw.name) }) : t('menu.shop'); },
    build() {
      const S = Game.S, tw = Game.townHere();
      if (!tw) return h('div', {}, h('p', {}, t('shopAway')), h('p', { class: 'sub' }, TOWNS.map(x => L(x.name)).join(' · ')));
      const tab = (id, key) => h('button', { type: 'button', 'aria-pressed': String(shopTab === id), onclick: () => { shopTab = id; UI.rerender(); } }, t(key));
      const wrap = h('div', {}, h('div', { class: 'row', style: 'margin-bottom:10px' },
        h('div', { class: 'tabs', style: 'margin:0;flex:1' }, tab('goods', 'shopGoods'), tab('books', 'shopBooks')), h('b', {}, t('gold', { n: S.gold }))));
      const buyBtn = (why, fn, label) => h('button', { type: 'button', class: why ? '' : 'primary', disabled: !!why, onclick: () => { fn(); UI.rerender(); } }, why || label);
      if (shopTab === 'goods') wrap.append(h('div', { class: 'grid' }, tw.goods.map(id => {
        const real = Game.itemFor(id), it = ITEMS[real], need = GOODS[id], own = (S.inv.find(i => i.id === real) || {}).n || 0;
        const why = S.lvl < need ? t('needLvl', { n: need }) : S.gold < it.price ? t('noGold') : '';
        return h('div', { class: 'slot' }, h('b', {}, L(it.name)), h('span', { class: 'sub' }, UI.itemLine(it)),
          h('span', { class: 'sub' }, t('gold', { n: it.price }) + (own ? ' · ' + t('owned', { n: own }) : '')), buyBtn(why, () => Game.buy(id), t('buy')));
      })));
      else wrap.append(h('div', { class: 'grid' }, tw.books.map(id => {
        const sk = SKILLS[id], [price, need] = LEARN[id], have = S.learned.includes(id);
        const why = have ? t('learned') : S.lvl < need ? t('needLvl', { n: need }) : S.gold < price ? t('noGold') : '';
        return h('div', { class: 'slot' + (have ? ' equipped' : '') }, h('b', {}, L(sk.name)), h('span', { class: 'sub' }, t('cost', { n: sk.mp }) + ' · ' + skillInfo(sk)),
          h('span', { class: 'sub' }, t('gold', { n: price })), buyBtn(why, () => Game.learn(id), t('learn')));
      })));
      wrap.append(h('p', { class: 'sub', style: 'margin-top:10px' }, t('shopHint')));
      return wrap;
    }
  };

  // ---------- adventurers' guild ----------
  UI.panels.guild = {
    title: 'guildTitle', build() {
      const S = Game.S, g = S.guild, r = Game.rank(), next = RANK_PTS[r + 1], board = Game.guildBoard();
      const line = b => (b.boss ? '☠ ' : '') + t(b.boss ? 'bountyBoss' : 'bountyHunt', { n: b.n, m: L(ENEMIES[b.type].name) });
      const reward = b => t('bountyReward', { g: b.gold, x: b.xp, p: b.pts });
      const btn = (label, fn, dis, primary) => h('button', { type: 'button', class: primary && !dis ? 'primary' : '', disabled: !!dis, onclick: () => { fn(); UI.rerender(); } }, label);
      return h('div', { style: 'display:flex;flex-direction:column;gap:12px' },
        h('div', { class: 'tiles', style: 'margin:0' }, [[t('guildRank'), RANKS[r]], [t('guildPts'), g.pts + (next ? ' / ' + next : '')]]
          .map(([k, v]) => h('div', { class: 'tile' }, h('div', { class: 'sub' }, k), h('div', { class: 'v' }, v)))),
        h('h3', {}, t('bountyActive', { n: g.active.length })),
        g.active.length ? h('div', { class: 'grid' }, g.active.map(b => h('div', { class: 'slot' + (b.cur >= b.n ? ' equipped' : '') },
          h('b', {}, line(b)), h('span', { class: 'sub' }, b.cur + ' / ' + b.n + ' · ' + reward(b)),
          h('div', { class: 'row' }, btn(t('claim'), () => Game.claimBounty(b.id), b.cur < b.n, true), btn(t('cancel'), () => Game.dropBounty(b.id)))))) : h('p', { class: 'sub' }, t('bountyNone')),
        h('h3', {}, t('bountyBoard')),
        board.length ? h('div', { class: 'grid' }, board.map(b => h('div', { class: 'slot' }, h('b', {}, line(b)), h('span', { class: 'sub' }, reward(b)),
          btn(t('accept'), () => Game.acceptBounty(b.id), g.active.length >= 3, true)))) : h('p', { class: 'sub' }, t('bountyEmpty')),
        h('p', { class: 'sub' }, t('guildHint')));
    }
  };

  // ---------- the king's hall: royal bounties on every region boss ----------
  UI.panels.castle = {
    title: 'castleTitle', build() {
      const S = Game.S;
      return h('div', { style: 'display:flex;flex-direction:column;gap:12px' }, h('p', {}, t('castleIntro')),
        h('div', { class: 'grid' }, Terrain.LAIRS.map(l => {
          const d = ENEMIES[l.type], k = S.st.kills[l.type] || 0, got = S.bossClaims.includes(l.type);
          return h('div', { class: 'slot' + (got ? ' equipped' : '') }, h('b', {}, '☠ ' + L(d.name)),
            h('span', { class: 'sub' }, L(BIOMES[l.region].name) + ' · ' + t('lvl', { n: d.lvl })), h('span', { class: 'sub' }, k ? t('bossDown', { n: k }) : t('bossAlive')),
            h('button', { type: 'button', class: k && !got ? 'primary' : '', disabled: !k || got, onclick: () => { Game.claimRoyal(l.type); UI.rerender(); } }, got ? t('claimed') : t('royalClaim', { g: d.lvl * 60 })));
        })));
    }
  };

  // teleport stone: every settlement of the middle lands and the eight realms, with the monster levels around it
  UI.panels.warp = {
    title: 'warpTitle', build() {
      const here = Game.townHere(), wrap = h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, h('p', {}, t('warpHint')));
      const biome = w => BIOMES[Terrain.biomeAt(w.town.x, w.town.z, true)] || {};
      const card = w => {
        const tw = w.town, b = biome(w), lv = (b.spawn || []).map(k => ENEMIES[k].lvl), mine = here === tw, need = Terrain.areaLevel(tw.x, tw.z), locked = need > Game.S.lvl;
        const range = lv.length ? ' · ' + t('lvl', { n: Math.min(...lv) + (b.realm ? '+' : '–' + Math.max(...lv)) }) : '';
        return h('button', { type: 'button', class: 'slot' + (mine ? ' equipped' : ''), disabled: mine || locked, style: 'text-align:left' + (locked ? ';opacity:.55' : ''), onclick: () => Game.warp(w) },
          h('b', {}, (locked ? '🔒 ' : '') + L(tw.name)), h('span', { class: 'sub' }, mine ? t('warpHere') : locked ? t('needLvl', { n: need }) : (b.name ? L(b.name) : '') + range));
      };
      [[t('warpMid'), Terrain.warps.filter(w => !biome(w).realm)], [t('warpRealms'), Terrain.warps.filter(w => biome(w).realm && !biome(w).frontier)], [t('warpFront'), Terrain.warps.filter(w => biome(w).frontier)]]
        .forEach(([title, list]) => wrap.append(h('h3', {}, title), h('div', { class: 'grid' }, list.map(card))));
      return wrap;
    }
  };

  // ---------- live multiplayer room ----------
  function roomChat() {
    const log = h('div', { class: 'chatlog', style: 'height:150px' }, Net.chat.length
      ? Net.chat.map(m => h('div', { class: 'msg' }, h('b', {}, m.n + (m.me ? ' (' + t('you') + ')' : '')), ' ', m.m))
      : h('p', { class: 'sub' }, t('chatEmpty')));
    const input = h('input', { type: 'text', id: 'mpSay', maxlength: '120', placeholder: t('bubblePh'), 'aria-label': t('bubblePh'), autocomplete: 'off' });
    setTimeout(() => { log.scrollTop = log.scrollHeight; });
    return h('div', {}, log, h('form', { class: 'row', onsubmit: e => { e.preventDefault(); Net.say(input.value); input.value = ''; } },
      h('label', { style: 'flex:1' }, input), h('button', { type: 'submit', class: 'primary' }, t('send'))));
  }
  UI.panels.mp = {
    title: 'menu.mp', build() {
      if (!Net.ok) return h('p', { class: 'sub' }, t('mpOff'));
      const wrap = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
      if (!Net.inRoom()) {
        const code = h('input', { type: 'text', id: 'mpCode', maxlength: '10', placeholder: t('codePh'), 'aria-label': t('codePh'), autocomplete: 'off' });
        const go = async fn => { try { await fn(); } catch (e) { UI.toast(e && e.code === 'bad' ? t('codeBad') : t('joinFail', { e: (e && e.code) || 'error' })); } };
        wrap.append(h('p', {}, t('mpDesc')),
          h('div', { class: 'row' }, h('button', { type: 'button', class: 'primary', onclick: () => go(Net.host) }, t('host'))),
          h('form', { class: 'row', onsubmit: e => { e.preventDefault(); go(() => Net.join(code.value)); } }, h('label', { style: 'flex:1' }, code), h('button', { type: 'submit' }, t('joinRoom'))));
        return wrap;
      }
      const list = Net.list().sort((a, b) => a.dist - b.dist), code = Net.code.toUpperCase();
      wrap.append(
        h('div', { class: 'row' }, h('h3', { style: 'flex:1' }, t('roomCode', { c: code })),
          h('button', { type: 'button', onclick: () => navigator.clipboard.writeText(code).then(() => UI.toast(t('copied')), () => UI.toast(t('copyFail'))) }, t('copyCode')),
          h('button', { type: 'button', onclick: () => Net.leave() }, t('leaveRoom'))),
        h('p', { class: 'sub' }, t('hostInfo')),
        h('h3', {}, t('players', { n: list.length + 1 })),
        list.length ? h('div', { class: 'plist' }, list.map(p => h('div', { class: 'slot' },
          h('div', {}, h('b', {}, p.name), h('div', { class: 'sub' }, jobName(p.cls, p.evo, p.evo2) + ' · ' + t('lvl', { n: p.lvl }) + ' · ' + (p.busy ? t('inFight') : t('meters', { n: p.dist })))),
          h('button', { type: 'button', disabled: p.busy || p.dist > 30, title: p.dist > 30 ? t('tooFar') : '', onclick: () => Net.challenge(p.id) }, t('duel'))))) : h('p', { class: 'sub' }, t('alone')),
        h('p', { class: 'sub' }, t('coopHint')),
        h('h3', {}, t('roomChat')), roomChat());
      return wrap;
    }
  };

  // ---------- global leaderboards ----------
  let rankTab = 'season';
  Cloud.onBoard(() => { if (UI.current === 'rank') UI.rerender(); });
  UI.panels.rank = {
    title: 'menu.rank', build() {
      const S = Game.S, se = Game.season().id, today = Game.today();
      let rows = Cloud.db ? Cloud.boardRows().slice() : [];
      const mine = Cloud.db ? null : { uid: 'me', ...Game.boardEntry() };
      if (mine) rows = [mine];
      if (rankTab === 'season') rows = rows.filter(r => r.season === se).sort((a, b) => b.rating - a.rating);
      if (rankTab === 'daily') rows = rows.filter(r => r.day === today).sort((a, b) => b.dayScore - a.dayScore);
      if (rankTab === 'level') rows = rows.sort((a, b) => b.lvl - a.lvl || b.xp - a.xp);
      const score = r => rankTab === 'season' ? r.rating : rankTab === 'daily' ? r.dayScore : t('lvl', { n: r.lvl });
      const tab = (id, key) => h('button', { type: 'button', 'aria-pressed': String(rankTab === id), onclick: () => { rankTab = id; UI.rerender(); } }, t(key));
      return h('div', {},
        h('div', { class: 'tabs' }, tab('season', 'rankSeason'), tab('daily', 'rankDaily'), tab('level', 'rankLevel')),
        Cloud.db ? null : offline(),
        rows.length ? h('div', { class: 'tablebox' }, h('table', {}, h('tbody', {}, rows.slice(0, 100).map((r, i) => {
          const me = r.uid === Cloud.uid || r.uid === 'me';
          return h('tr', { style: me ? 'font-weight:700;color:var(--accent)' : '' }, h('td', { class: 'n' }, '#' + (i + 1)),
            h('td', {}, String(r.name || '?').slice(0, 16) + (me ? ' (' + t('you') + ')' : ''), h('div', { class: 'sub' }, jobName(r.cls, r.evo, r.evo2) + ' · ' + t('lvl', { n: r.lvl }))),
            h('td', { class: 'n' }, score(r)));
        })))) : h('p', { class: 'sub' }, t('rankEmpty')));
    }
  };

  // ---------- chat ----------
  let lastSend = 0;
  Cloud.onChat(rows => { UI.chatRows = rows; if (UI.current === 'chat') UI.rerender(); });
  UI.panels.chat = {
    title: 'menu.chat', build() {
      if (!Cloud.db) return offline();
      const log = h('div', { class: 'chatlog', id: 'chatlog' }), msgs = UI.chatRows || [];
      if (!msgs.length) log.append(h('p', { class: 'sub' }, t('chatEmpty')));
      msgs.forEach(m => log.append(h('div', { class: 'msg' }, h('b', {}, m.name + (m.uid === Cloud.uid ? ' (' + t('you') + ')' : '')), ' ', h('span', { class: 'sub' }, UI.date(m.t)), h('div', {}, m.text))));
      const input = h('input', { type: 'text', id: 'chatInput', maxlength: '200', placeholder: t('chatPh'), 'aria-label': t('chatPh') });
      const form = h('form', { class: 'row', onsubmit: e => {
        e.preventDefault(); const v = input.value.trim();
        if (!v || Date.now() - lastSend < 3000) return;
        lastSend = Date.now(); Cloud.sendChat(Game.S.hero.name, v); input.value = ''; Game.S.st.chats++; Game.checkAch(); Game.save();
      } }, h('label', { style: 'flex:1' }, input), h('button', { type: 'submit', class: 'primary' }, t('send')));
      setTimeout(() => { log.scrollTop = log.scrollHeight; }, 0);
      return h('div', {}, log, form, h('p', { class: 'sub' }, t('chatNote')));
    }
  };

  // ---------- notifications ----------
  UI.panels.notif = {
    title: 'notifTitle', build() {
      const S = Game.S;
      return h('div', {},
        h('div', { class: 'row', style: 'margin-bottom:10px' }, h('button', { type: 'button', onclick: () => { S.notes.forEach(n => n.read = true); Game.save(); UI.hud(); UI.rerender(); } }, t('markRead'))),
        S.notes.length ? h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, S.notes.slice().reverse().map(n => h('div', { class: 'slot', style: n.read ? 'opacity:.65' : 'border-color:var(--accent)' },
          h('span', { class: 'sub' }, UI.date(n.t)), h('span', {}, n.msg)))) : h('p', { class: 'sub' }, t('notifEmpty')),
        h('p', { class: 'sub', style: 'margin-top:12px' }, t('pushInfo')));
    }
  };

  // ---------- profile ----------
  UI.panels.profile = {
    title: 'menu.profile', build() {
      const S = Game.S, se = Game.season().id;
      const titles = [LANG === 'id' ? 'Pengembara' : 'Wanderer', ...ACHS.filter(a => S.ach[a.id]).map(a => L(a.name)), ...TIERS.filter(tr => S.rewards.some(r => r.endsWith(':' + tr.id))).map(tr => L(tr.name))];
      const name = h('input', { type: 'text', id: 'pfName', maxlength: '16', value: S.hero.name });
      const title = h('select', { id: 'pfTitle' }, titles.map(x => h('option', { value: x, selected: x === S.profile.title }, x)));
      const bio = h('textarea', { id: 'pfBio', maxlength: '120', rows: '3' }); bio.value = S.profile.bio;
      const color = h('input', { type: 'color', id: 'pfColor', value: S.profile.color });
      const capes = TIERS.filter(tr => S.rewards.some(r => r.endsWith(':' + tr.id)));
      return h('div', { style: 'display:flex;flex-direction:column;gap:10px' },
        h('div', { class: 'row' }, h('label', {}, t('name'), name), h('label', {}, t('profileTitle'), title), h('label', {}, t('avatarColor'), color)),
        h('label', {}, t('bio'), bio),
        capes.length ? h('div', { class: 'row' }, capes.map(tr => h('button', { type: 'button', onclick: () => { S.hero.look.cape = tr.color; S.hero.look.capeOn = true; World.setHero(Game.heroLook(), S.cls); Game.save(); UI.toast(t('saved')); } }, L(tr.name)))) : null,
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'primary', onclick: () => {
            const n = name.value.trim(); if (n.length < 2) { UI.toast(t('nameMissing')); return; }
            S.hero.name = n; S.profile.title = title.value; S.profile.bio = bio.value.slice(0, 120); S.profile.color = color.value;
            Game.save(); UI.hud(); UI.toast(t('saved'));
          } }, t('save')),
          h('button', { type: 'button', onclick: () => { UI.close(); UI.creator(true); } }, t('createTitle').replace(/^\S+/, LANG === 'id' ? 'Ubah' : 'Edit'))));
    }
  };

  // ---------- share achievements ----------
  UI.panels.share = {
    title: 'menu.share', build() {
      const S = Game.S, text = t('shareText', { name: S.hero.name, cls: jobName(S.cls, S.evo, S.evo2), lvl: S.lvl, wins: S.st.wins, kills: kills(S), r: S.rating });
      const box = h('textarea', { id: 'shareText', rows: '3', readonly: true }); box.value = text;
      const enc = encodeURIComponent(text);
      const links = [['X', 'https://twitter.com/intent/tweet?text=' + enc], ['WhatsApp', 'https://wa.me/?text=' + enc], ['Threads', 'https://www.threads.net/intent/post?text=' + enc], ['Telegram', 'https://t.me/share/url?url=' + enc]];
      return h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, box,
        h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => {
          navigator.clipboard.writeText(text).then(() => UI.toast(t('copied')), () => { box.select(); UI.toast(t('copyFail')); });
        } }, t('copy'))),
        h('div', { class: 'sub' }, t('shareTo')),
        h('div', { class: 'row' }, links.map(([n, u]) => h('a', { href: u, target: '_blank', rel: 'noopener', class: 'chip', style: 'padding:6px 12px;color:var(--accent)' }, n))));
    }
  };

  // ---------- settings ----------
  let resetArmed = false;
  UI.panels.settings = {
    title: 'menu.settings', build() {
      const S = Game.S, st = S.settings, set = (k, v) => { st[k] = v; Game.applySettings(); Game.save(); };
      const sel = (id, val, opts, fn) => h('select', { id, onchange: e => fn(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: v === val }, l)));
      return h('div', { style: 'display:flex;flex-direction:column;gap:12px' },
        h('div', { class: 'row' },
          h('label', {}, t('lang'), sel('setLang', st.lang, [['id', 'Bahasa Indonesia'], ['en', 'English']], v => { set('lang', v); UI.buildMenu(); UI.hud(); UI.open('settings'); })),
          h('label', {}, t('theme'), sel('setTheme', st.theme, ['auto', 'system', 'light', 'dark'].map(k => [k, t('themes.' + k)]), v => set('theme', v)))),
        h('div', { class: 'row' },
          h('label', {}, t('accent'), h('input', { type: 'color', id: 'setAccent', value: st.accent || '#2f7d6d', onchange: e => set('accent', e.target.value) })),
          h('label', {}, t('scale') + ' (' + Math.round(st.scale * 100) + '%)', h('input', { type: 'range', id: 'setScale', min: '0.85', max: '1.3', step: '0.05', value: st.scale, onchange: e => { set('scale', +e.target.value); UI.rerender(); } }))),
        h('div', { class: 'row' },
          h('label', {}, t('quality'), sel('setQuality', st.quality, [['high', t('qualities.high')], ['low', t('qualities.low')]], v => { st.qPicked = true; set('quality', v); UI.toast(t('qReload')); })),
          h('label', {}, t('reminder'), h('input', { type: 'time', id: 'setRemind', value: st.reminder, onchange: e => set('reminder', e.target.value) })),
          h('label', { style: 'flex-direction:row;align-items:center;gap:6px' }, h('input', { type: 'checkbox', id: 'setNotif', checked: st.notif !== false, onchange: e => set('notif', e.target.checked) }), t('notifOn'))),
        h('p', { class: 'sub' }, t('pushInfo')),
        h('div', { class: 'slot' }, h('b', {}, t('syncNow')), h('span', { class: 'sub' }, t('syncInfo')),
          h('div', { class: 'row' }, h('button', { type: 'button', disabled: !Cloud.db, onclick: () => { Game.save(true); Cloud.flush(); } }, t('syncNow')))),
        h('button', { type: 'button', style: 'border-color:var(--hp);color:var(--hp);align-self:flex-start', onclick: e => {
          if (!resetArmed) { resetArmed = true; e.target.textContent = t('resetConfirm'); setTimeout(() => { resetArmed = false; }, 4000); return; }
          Game.reset();
        } }, t('reset')));
    }
  };

  // ---------- character creator (new hero, or edit look later) ----------
  const RND = a => a[Math.random() * a.length | 0];
  const SKINS = ['#f1c9a5', '#d9a47a', '#b97a52', '#8a5636', '#5e3a24'], HAIRS = ['#2b1d14', '#5a3a22', '#a8642a', '#d9b45a', '#e8e4dc', '#3a5fa0', '#9a2f3a'];
  UI.creator = function (edit) {
    const S = Game.S;
    const look = edit ? { ...S.hero.look } : { skin: RND(SKINS), hair: RND(HAIRS), hairStyle: 0, outfit: '#3d6e8f', cape: '#8f2f3a', capeOn: true, hat: 0, eyes: '#2a3b5a', height: 1, build: 1 };
    let cls = edit ? S.cls : 'knight', name = edit ? S.hero.name : '';
    $('createTitle').textContent = edit ? t('createTitle').replace(/^\S+/, LANG === 'id' ? 'Ubah' : 'Edit') : t('createTitle');
    $('create').hidden = false; World.paused = true;
    const pv = World.preview($('previewCv'));
    [['pvLeft', -0.5, 'turnLeft'], ['pvRight', 0.5, 'turnRight']].forEach(([id, d, k]) => { $(id).onclick = () => pv && pv.turn(d); $(id).title = t(k); $(id).setAttribute('aria-label', t(k)); }); // turn the hero by hand (dragging works too)
    const redraw = () => pv && pv.set(look, cls);
    const form = $('createForm');
    const color = (k, label) => h('label', {}, label, h('input', { type: 'color', id: 'cc_' + k, value: look[k], oninput: e => { look[k] = e.target.value; redraw(); } }));
    const range = (k, label, min, max) => h('label', {}, label, h('input', { type: 'range', id: 'cc_' + k, min, max, step: '0.01', value: look[k], oninput: e => { look[k] = +e.target.value; redraw(); } }));
    const pick = (k, label, opts) => h('label', {}, label, h('select', { id: 'cc_' + k, onchange: e => { look[k] = +e.target.value; redraw(); } }, opts.map((o, i) => h('option', { value: i, selected: look[k] === i }, o))));
    const build = () => {
      const nameIn = h('input', { type: 'text', id: 'cc_name', maxlength: '16', value: name, oninput: e => { name = e.target.value; } });
      form.replaceChildren(
        h('label', {}, t('name'), nameIn),
        h('div', {}, h('div', { class: 'sub', style: 'margin-bottom:4px' }, t('cls')), h('div', { class: 'classes' }, Object.entries(CLASSES).map(([id, c]) =>
          h('button', { type: 'button', 'aria-pressed': String(cls === id), disabled: edit && cls !== id, onclick: () => { cls = id; build(); redraw(); } }, h('b', {}, L(c.name)), h('small', {}, L(c.desc)))))),
        h('div', { class: 'row' }, color('skin', t('skin')), color('hair', t('hair')), color('eyes', t('eyes'))),
        h('div', { class: 'row' }, pick('hairStyle', t('hairStyle'), t('hairStyles')), pick('hat', t('hat'), t('hats'))),
        h('div', { class: 'row' }, color('outfit', t('outfit')), color('cape', t('cape')),
          h('label', { style: 'flex-direction:row;align-items:center;gap:6px' }, h('input', { type: 'checkbox', id: 'cc_capeOn', checked: look.capeOn, onchange: e => { look.capeOn = e.target.checked; redraw(); } }), t('capeOn'))),
        h('div', { class: 'row' }, range('height', t('height'), '0.85', '1.15'), range('build', t('build'), '0.85', '1.2')),
        h('div', { class: 'row' },
          h('button', { type: 'button', onclick: () => { Object.assign(look, { skin: RND(SKINS), hair: RND(HAIRS), hairStyle: Math.random() * 4 | 0, hat: Math.random() * 4 | 0, outfit: '#' + (Math.random() * 0xffffff | 0).toString(16).padStart(6, '0'), cape: '#' + (Math.random() * 0xffffff | 0).toString(16).padStart(6, '0'), height: 0.9 + Math.random() * 0.2, build: 0.9 + Math.random() * 0.25 }); build(); redraw(); } }, t('randomize')),
          h('button', { type: 'button', class: 'primary', onclick: () => {
            const n = name.trim(); if (n.length < 2) { UI.toast(t('nameMissing')); nameIn.focus(); return; }
            pv && pv.dispose(); $('create').hidden = true;
            Game.finishCreate(n, cls, look, edit);
          } }, edit ? t('save') : t('start'))));
    };
    build(); redraw();
  };
})();
