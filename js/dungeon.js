// The dungeon: a gate near Mist Village leads to a hall of five floors. Each floor's monsters (made for the hero's level)
// must all fall before the portal down opens; floor 5 holds the warden. Clearing it pays a reward and opens the way out.
(function () {
  const $ = id => document.getElementById(id), h = UI.h, D = window.Dungeon = { floor: 0, active: false }, FLOORS = 5;
  let foes = [], cleared = false, done = false, bornLvl = 1;
  const alive = () => foes.filter(e => !e.dead && World.enemies.includes(e)).length;
  const removeAll = () => { foes.forEach(e => { if (World.enemies.includes(e)) World.removeEnemy(e); }); foes = []; };

  function hud() {
    const el = $('dhud'); el.hidden = !D.active;
    if (D.active) el.textContent = t('dHud', { f: D.floor, n: FLOORS }) + ' · ' + (cleared ? (done ? t('dDone') : t('dClear')) : t('dLeft', { n: alive() }));
  }
  // a floor: monsters spread over the hall's middle and far end; floor 5 is the warden alone
  function floor(n) {
    const G = TR(), lvl = Math.min(MAX_LVL, Game.S.lvl + n - 1);
    removeAll(); D.floor = n; cleared = done = false; G.next.visible = false;
    World.warp(G.start.x, G.start.z, 0); FX.flashScreen(0x6a3aaa, 0.7); FX.banner(t('dHud', { f: n, n: FLOORS }), 0xb06cff);
    const types = n === FLOORS ? [dungeonBoss(Math.min(MAX_LVL, Game.S.lvl + 3))] : dungeonFoes(lvl, 4 + n);
    types.forEach((type, i) => {
      const k = types.length, x = n === FLOORS ? G.x : G.x + ((i % 3) - 1) * 16 + (Math.random() - 0.5) * 6, z = n === FLOORS ? G.z - 12 : G.z + 6 - Math.floor(i / 3) * 16 - Math.random() * 6;
      const e = World.spawnAt(type, x, z); e.dungeon = true; foes.push(e);
    });
    bornLvl = lvl; hud();
  }
  const TR = () => Terrain.DUNGEON;
  D.enter = function () { UI.close(); D.active = true; floor(1); };
  D.leave = function (quiet) {
    removeAll(); D.active = false; D.floor = 0; TR().next.visible = false; hud();
    if (!quiet) { const g = TR().gate; World.warp(g.x, g.z, g.look); FX.flashScreen(0x6fb8ff, 0.6); }
  };
  // the three doorways: the gate (asks first), the way down, the way out
  D.place = function (kind) {
    if (kind === 'dungeon') return UI.open('dungeon');
    if (kind === 'dexit') return D.leave();
    if (!D.active) return;
    if (!cleared) return UI.toast(t('dNeedClear', { n: alive() }));
    if (D.floor < FLOORS) floor(D.floor + 1); else D.leave();
  };
  // watch the floor: everything down opens the portal; the warden down pays out
  setInterval(() => {
    if (!D.active) return;
    const me = World.player();
    if (!me || !Terrain.dungeonAt(me.position.x, me.position.z)) { if (!World.paused) D.leave(true); return; } // fainted or teleported out: the run ends
    if (!cleared && alive() === 0) {
      cleared = true; TR().next.visible = true;
      if (D.floor === FLOORS) { done = true; Game.dungeonReward(bornLvl); UI.toast(t('dWin')); }
      else UI.toast(t('dOpen', { f: D.floor + 1 }));
    }
    hud();
  }, 300);

  UI.panels.dungeon = {
    title: 'dTitle', build() {
      const S = Game.S;
      return h('div', { style: 'display:flex;flex-direction:column;gap:12px' },
        h('p', {}, t('dIntro', { n: FLOORS })),
        h('ul', { class: 'sub', style: 'margin:0;padding-left:18px;line-height:1.6' }, [1, 2, 3, 4, 5].map(n => h('li', {}, t('dFloor', { f: n }) + ': ' + (n === FLOORS ? t('dBoss', { l: Math.min(MAX_LVL, S.lvl + 3) }) : t('dFoes', { k: 4 + n, l: Math.min(MAX_LVL, S.lvl + n - 1) }))))),
        h('p', { class: 'sub' }, t('dRewardInfo')),
        h('button', { type: 'button', class: 'primary', onclick: () => D.enter() }, t('dEnter')));
    }
  };
})();
