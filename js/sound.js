// Sound: effects and mood music synthesized with Web Audio, no audio files. Effects follow the FX calls (swings, hits,
// spells, deaths) plus chests, mounts, teleports and level-ups; the music picks its mood at each bar: battle while a
// monster is after you or on a fight's stage, a darker theme at night and in the dungeon, a calm one by day.
// Settings → Efek suara / Musik turn each off.
(function () {
  const S = window.Sound = {};
  let ac = null, sfxBus, musicBus, noiseBuf;
  const on = k => !!(window.Game && Game.S) && Game.S.settings[k] !== false;
  // browsers only let audio start after a tap or a key press
  function wake() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC();
      const master = ac.createGain(), soft = ac.createBiquadFilter(); master.gain.value = 0.7; master.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
      soft.type = 'lowpass'; soft.frequency.value = 2200; soft.connect(master); // takes the edge off the music's buzzier waves
      musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(soft);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended' && !document.hidden) ac.resume();
  }
  ['pointerdown', 'keydown'].forEach(e => addEventListener(e, wake));
  document.addEventListener('visibilitychange', () => { if (ac) document.hidden ? ac.suspend() : ac.resume(); }); // silent in a background tab

  // building blocks: a tone with a quick attack and a decay (optionally sliding in pitch), and a filtered noise burst
  function tone(f, t, dur, type, vol, f2, bus) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, type, f, f2) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf;
    fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.05);
  }
  const SFX = {
    swing: t => noise(t, 0.16, 0.25, 'bandpass', 700, 2600), // a blade or an arrow through the air
    hit: (t, strong) => { noise(t, strong ? 0.25 : 0.12, strong ? 0.6 : 0.4, 'lowpass', 1600, 300); tone(strong ? 110 : 150, t, 0.18, 'sine', 0.5, 50); },
    hurt: t => { tone(240, t, 0.2, 'square', 0.12, 110); noise(t, 0.1, 0.3, 'lowpass', 900); },
    cast: t => { tone(420, t, 0.45, 'sine', 0.18, 1300); tone(840, t + 0.08, 0.4, 'triangle', 0.1, 1700); [1568, 2093].forEach((f, i) => tone(f, t + 0.15 + i * 0.07, 0.25, 'sine', 0.06)); },
    chime: t => [784, 1175].forEach((f, i) => tone(f, t + i * 0.09, 0.4, 'sine', 0.15)), // healing
    chest: t => { noise(t, 0.08, 0.2, 'lowpass', 600); [988, 1319, 1976, 2637].forEach((f, i) => tone(f, t + 0.08 + i * 0.06, 0.35, 'triangle', 0.12)); },
    level: t => [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, i === 3 ? 0.7 : 0.2, 'triangle', 0.2)), // a little fanfare
    die: t => { tone(180, t, 0.5, 'sawtooth', 0.12, 40); noise(t, 0.3, 0.3, 'lowpass', 500, 80); },
    mount: (t, dragon) => { [0, 0.2, 0.4].forEach(d => noise(t + d, 0.15, 0.35, 'lowpass', 500)); tone(dragon ? 260 : 700, t + 0.1, 0.5, 'sawtooth', 0.08, dragon ? 120 : 1000); } // wingbeats and a cry
  };
  S.play = function (name, arg) { if (ac && ac.state === 'running' && on('sfx')) SFX[name](ac.currentTime + 0.01, arg); };

  // ---------- music: a wandering melody over a drone, one bar (8 steps) at a time ----------
  const MOODS = {
    day: { root: 220, scale: [0, 2, 4, 7, 9, 12, 14, 16], step: 0.5, wave: 'triangle', rest: 0.3, vol: 0.12 }, // A major pentatonic, unhurried
    night: { root: 146.8, scale: [0, 3, 5, 7, 10, 12, 15], step: 0.75, wave: 'sine', rest: 0.45, vol: 0.13 }, // D minor pentatonic, sparse
    battle: { root: 164.8, scale: [0, 2, 3, 7, 8, 12, 14, 15], step: 0.22, wave: 'sawtooth', rest: 0.15, vol: 0.07 } // E minor, quick
  };
  const moodNow = () => World.stage || World.enemies.some(e => e.aggro && !e.dead) ? 'battle' : window.Dungeon && Dungeon.active || World.clock().phase === 'night' ? 'night' : 'day';
  let m = MOODS.day, next = 0, deg = 2, beat = 0;
  S.mood = () => Object.keys(MOODS).find(k => MOODS[k] === m);
  setInterval(() => {
    if (!ac || ac.state !== 'running') return;
    const want = on('music'); musicBus.gain.setTargetAtTime(want ? 1 : 0, ac.currentTime, 0.6); // fades rather than cuts
    if (!want) return;
    if (next < ac.currentTime) next = ac.currentTime + 0.05;
    while (next < ac.currentTime + 0.3) {
      if (beat % 8 === 0) { m = MOODS[moodNow()]; tone(m.root / 2, next, m.step * 8, 'sine', m.vol * 1.2, 0, musicBus); } // the mood can change on the bar; a drone under it
      if (Math.random() > m.rest) { deg = Math.max(0, Math.min(m.scale.length - 1, deg + (Math.random() * 5 | 0) - 2)); tone(m.root * Math.pow(2, m.scale[deg] / 12), next, m.step * 1.6, m.wave, m.vol, 0, musicBus); }
      next += m.step; beat++;
    }
  }, 100);
})();
