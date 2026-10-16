// Static game data. Every name is {id, en}.
const N = (id, en) => ({ id, en });

window.SKILLS = {
  slash:   { name: N('Tebasan Kuat', 'Power Slash'), mp: 5, stat: 'atk', pow: 1.7 },
  bash:    { name: N('Hantaman Perisai', 'Shield Bash'), mp: 8, stat: 'atk', pow: 1.1, stun: 0.5 },
  fireball:{ name: N('Bola Api', 'Fireball'), mp: 6, stat: 'mag', pow: 1.8 },
  frost:   { name: N('Tombak Es', 'Frost Lance'), mp: 9, stat: 'mag', pow: 1.3, stun: 0.4 },
  aimed:   { name: N('Bidikan Tepat', 'Aimed Shot'), mp: 5, stat: 'atk', pow: 1.4, crit: 30 },
  venom:   { name: N('Panah Racun', 'Venom Arrow'), mp: 7, stat: 'atk', pow: 0.9, poison: 3 },
  holy:    { name: N('Cahaya Suci', 'Holy Light'), mp: 10, heal: 1.2 },
  smite:   { name: N('Penghakiman', 'Smite'), mp: 12, stat: 'atk', pow: 2.2 },
  rage:    { name: N('Amukan', 'Rage'), mp: 6, buff: 1.5 },
  cleave:  { name: N('Belah Bumi', 'Earth Cleave'), mp: 14, stat: 'atk', pow: 2.8 },
  meteor:  { name: N('Hujan Meteor', 'Meteor Rain'), mp: 18, stat: 'mag', pow: 3.0 },
  barrier: { name: N('Perisai Arkana', 'Arcane Barrier'), mp: 8, heal: 0.8, buff: 1.2 },
  drain:   { name: N('Isap Jiwa', 'Soul Drain'), mp: 10, stat: 'mag', pow: 1.6, drain: 0.5 },
  curse:   { name: N('Kutukan Bayang', 'Shadow Curse'), mp: 12, stat: 'mag', pow: 1.2, poison: 6 },
  snipe:   { name: N('Tembakan Maut', 'Deadeye'), mp: 12, stat: 'atk', pow: 2.4, crit: 50 },
  volley:  { name: N('Hujan Panah', 'Arrow Volley'), mp: 15, stat: 'atk', pow: 2.6 },
  thorn:   { name: N('Jerat Duri', 'Thorn Snare'), mp: 10, stat: 'atk', pow: 1.2, stun: 0.6, poison: 3 },
  mend:    { name: N('Ramuan Hutan', 'Forest Mend'), mp: 9, heal: 1.0 },
  fortify: { name: N('Benteng Baja', 'Iron Fortress'), mp: 8, heal: 0.7, buff: 1.25 },
  quake:   { name: N('Gempa Bumi', 'Earthquake'), mp: 12, stat: 'atk', pow: 1.8, stun: 0.5 },
  timestop:{ name: N('Henti Waktu', 'Time Stop'), mp: 10, stat: 'mag', pow: 1.2, stun: 0.8 },
  rewind:  { name: N('Putar Balik', 'Rewind'), mp: 14, heal: 1.6 },
  backstab:{ name: N('Tikaman Bayang', 'Backstab'), mp: 8, stat: 'atk', pow: 1.9, crit: 40 },
  shadow:  { name: N('Selubung Bayang', 'Shadow Veil'), mp: 10, buff: 1.6 },
  sanctum: { name: N('Tempat Suci', 'Sanctum'), mp: 18, heal: 1.8, buff: 1.35 },
  annihilate: { name: N('Pemusnah', 'Annihilate'), mp: 20, stat: 'atk', pow: 3.8 },
  titan:   { name: N('Hantaman Titan', 'Titan Slam'), mp: 18, stat: 'atk', pow: 3.0, stun: 0.5 },
  starfall:{ name: N('Hujan Bintang', 'Starfall'), mp: 24, stat: 'mag', pow: 4.0 },
  soulreap:{ name: N('Panen Jiwa', 'Soul Reap'), mp: 20, stat: 'mag', pow: 2.6, drain: 0.8 },
  eternity:{ name: N('Waktu Abadi', 'Eternity'), mp: 22, stat: 'mag', pow: 3.0, stun: 0.7 },
  skypierce: { name: N('Panah Langit', 'Sky Piercer'), mp: 18, stat: 'atk', pow: 3.6, crit: 60 },
  wrath:   { name: N('Murka Alam', 'Wrath of Nature'), mp: 20, stat: 'atk', pow: 2.5, poison: 8, heal: 0.6 },
  deathmark: { name: N('Tanda Maut', 'Death Mark'), mp: 18, stat: 'atk', pow: 3.2, crit: 50, poison: 6 },
  firstaid:  { name: N('Pertolongan Pertama', 'First Aid'), mp: 8, heal: 0.9 },
  windcut:   { name: N('Tebasan Angin', 'Wind Cutter'), mp: 7, stat: 'atk', pow: 1.6 },
  spark:     { name: N('Sambaran Petir', 'Lightning Strike'), mp: 10, stat: 'mag', pow: 1.7, stun: 0.3 },
  viper:     { name: N('Gigitan Ular', 'Viper Bite'), mp: 8, stat: 'atk', pow: 1.0, poison: 5 },
  warcry:    { name: N('Seruan Perang', 'War Cry'), mp: 9, buff: 1.4 },
  leech:     { name: N('Sentuhan Lintah', 'Leech Touch'), mp: 12, stat: 'mag', pow: 1.5, drain: 0.6 },
  blizzard:  { name: N('Badai Salju', 'Blizzard'), mp: 16, stat: 'mag', pow: 2.4, stun: 0.35 },
  phoenix:   { name: N('Api Phoenix', 'Phoenix Flame'), mp: 22, stat: 'mag', pow: 2.2, heal: 1.4 },
  // hero
  braveslash: { name: N('Tebasan Berani', 'Brave Slash'), mp: 5, stat: 'atk', pow: 1.7 },
  lightblade: { name: N('Pedang Cahaya', 'Light Blade'), mp: 8, stat: 'atk', pow: 1.6, stun: 0.25 },
  valor:      { name: N('Semangat Juara', 'Valor'), mp: 10, buff: 1.5, heal: 0.5 },
  heroic:     { name: N('Serangan Heroik', 'Heroic Strike'), mp: 14, stat: 'atk', pow: 2.6, crit: 20 },
  guardlight: { name: N('Cahaya Pelindung', 'Guarding Light'), mp: 10, heal: 1.2, buff: 1.2 },
  radiant:    { name: N('Ledakan Cahaya', 'Radiant Burst'), mp: 13, stat: 'mag', pow: 2.2, stun: 0.3 },
  excalibur:  { name: N('Tebasan Legenda', 'Legend Slash'), mp: 22, stat: 'atk', pow: 4.0, crit: 25 },
  solarflare: { name: N('Suar Mentari', 'Solar Flare'), mp: 22, stat: 'mag', pow: 3.4, heal: 0.8 },
  // necromancer
  bonespear:  { name: N('Tombak Tulang', 'Bone Spear'), mp: 6, stat: 'mag', pow: 1.7 },
  bonewall:   { name: N('Dinding Tulang', 'Bone Wall'), mp: 9, heal: 0.8, buff: 1.25 },
  soulburst:  { name: N('Ledakan Jiwa', 'Soul Burst'), mp: 12, stat: 'mag', pow: 2.2, drain: 0.5 },
  wraithcall: { name: N('Panggil Arwah', 'Call Wraiths'), mp: 15, stat: 'mag', pow: 2.5 },
  plague:     { name: N('Wabah', 'Plague'), mp: 9, stat: 'mag', pow: 1.3, poison: 7 },
  rot:        { name: N('Pembusukan', 'Rot'), mp: 13, stat: 'mag', pow: 2.0, poison: 9 },
  reaping:    { name: N('Panen Kematian', 'Death Harvest'), mp: 22, stat: 'mag', pow: 3.6, drain: 0.6 },
  pestilence: { name: N('Bala Hitam', 'Pestilence'), mp: 22, stat: 'mag', pow: 2.8, poison: 14, stun: 0.3 },
  // healer
  cure:       { name: N('Penyembuhan', 'Cure'), mp: 6, heal: 1.4 },
  holybolt:   { name: N('Panah Suci', 'Holy Bolt'), mp: 7, stat: 'mag', pow: 1.6 },
  sanctify:   { name: N('Pengudusan', 'Sanctify'), mp: 12, stat: 'mag', pow: 2.0, heal: 0.4 },
  blessing:   { name: N('Berkat', 'Blessing'), mp: 14, heal: 2.0, buff: 1.2 },
  regrowth:   { name: N('Tumbuh Kembali', 'Regrowth'), mp: 10, heal: 1.6 },
  vinelash:   { name: N('Cambuk Sulur', 'Vine Lash'), mp: 12, stat: 'mag', pow: 1.8, stun: 0.4 },
  miracle:    { name: N('Mukjizat', 'Miracle'), mp: 24, stat: 'mag', pow: 2.4, heal: 3.0 },
  gaiawrath:  { name: N('Amarah Gaia', 'Gaia Wrath'), mp: 22, stat: 'mag', pow: 3.2, heal: 1.0 },
  // skill books
  flamewave:  { name: N('Gelombang Api', 'Flame Wave'), mp: 14, stat: 'mag', pow: 2.0 },
  earthspike: { name: N('Tombak Bumi', 'Earth Spike'), mp: 14, stat: 'atk', pow: 2.2, stun: 0.3 },
  shadowstrike: { name: N('Serbuan Bayang', 'Shadow Strike'), mp: 15, stat: 'atk', pow: 2.4, crit: 30 },
  arcanemissile: { name: N('Rudal Arkana', 'Arcane Missiles'), mp: 16, stat: 'mag', pow: 2.4 },
  thunderstorm: { name: N('Badai Petir', 'Thunderstorm'), mp: 18, stat: 'mag', pow: 2.6, stun: 0.3 },
  holynova:   { name: N('Nova Suci', 'Holy Nova'), mp: 18, stat: 'mag', pow: 2.3, heal: 0.6 }
};

// battle visuals per skill: [style, color, element, options]
//   style: how it travels  melee | bolt | arrow | volley | meteor | wave | strike (from the sky) | spikes (from the ground) | self
//   element: how it lands   slash fire ice bolt poison dark holy quake nature arcane wind arrow heal buff
//   options: spin / leap / dash (melee moves), count (several meteors), strong (camera shake)
const SKFX = {
  slash: ['melee', 0xffffff, 'slash', { twin: 1 }], bash: ['melee', 0x9fb4ff, 'quake', {}], fireball: ['bolt', 0xff7a2a, 'fire', {}], frost: ['bolt', 0x8fe3ff, 'ice', {}],
  aimed: ['arrow', 0xffe08a, 'arrow', { pierce: 1 }], venom: ['arrow', 0x7bdc5a, 'poison', {}], holy: ['self', 0xffe9a0, 'heal', {}], smite: ['strike', 0xffe08a, 'holy', { strong: 1 }],
  rage: ['self', 0xff4a3a, 'buff', {}], cleave: ['melee', 0xffa040, 'quake', { spin: 1, strong: 1 }], meteor: ['meteor', 0xff6a1a, 'fire', { strong: 1 }], barrier: ['self', 0x7fb8ff, 'buff', {}],
  drain: ['bolt', 0xb06cff, 'dark', {}], curse: ['bolt', 0x7a3fb0, 'dark', {}], snipe: ['arrow', 0xffffff, 'arrow', { pierce: 1, strong: 1 }], volley: ['volley', 0xffe08a, 'arrow', {}],
  thorn: ['spikes', 0x5fbf4a, 'nature', {}], mend: ['self', 0x7bdc5a, 'heal', {}], fortify: ['self', 0x9fb4ff, 'buff', {}], quake: ['melee', 0xc8a060, 'quake', { leap: 1, strong: 1 }],
  timestop: ['bolt', 0xd8c8ff, 'arcane', {}], rewind: ['self', 0xd8c8ff, 'heal', {}], backstab: ['melee', 0x9a7cff, 'dark', { dash: 1, twin: 1 }], shadow: ['self', 0x5a3f8a, 'buff', {}],
  sanctum: ['self', 0xfff0b0, 'heal', {}], annihilate: ['melee', 0xff5030, 'fire', { leap: 1, spin: 1, strong: 1 }], titan: ['melee', 0xc0c8d0, 'quake', { leap: 1, strong: 1 }],
  starfall: ['meteor', 0xbfe0ff, 'arcane', { count: 3, strong: 1 }], soulreap: ['bolt', 0x7a2fd0, 'dark', { strong: 1 }], eternity: ['strike', 0xe8d8ff, 'arcane', { strong: 1 }],
  skypierce: ['arrow', 0xffffff, 'bolt', { pierce: 1, strong: 1 }], wrath: ['spikes', 0x5fdf4a, 'nature', { strong: 1 }], deathmark: ['melee', 0x9a1a3a, 'dark', { dash: 1, twin: 1, strong: 1 }],
  firstaid: ['self', 0x7dff8a, 'heal', {}], windcut: ['wave', 0xc8f0ff, 'wind', {}], spark: ['strike', 0xfff36a, 'bolt', {}], viper: ['bolt', 0x7bdc5a, 'poison', {}],
  warcry: ['self', 0xff8a3a, 'buff', {}], leech: ['bolt', 0xb06cff, 'dark', {}], blizzard: ['strike', 0xdff6ff, 'ice', { strong: 1 }], phoenix: ['meteor', 0xff7a2a, 'fire', { strong: 1 }],
  braveslash: ['melee', 0xffe9a0, 'slash', { twin: 1 }], lightblade: ['wave', 0xfff0b0, 'holy', {}], valor: ['self', 0xffc04a, 'buff', {}], heroic: ['melee', 0xffd060, 'fire', { leap: 1, strong: 1 }],
  guardlight: ['self', 0xfff0b0, 'heal', {}], radiant: ['strike', 0xffe9a0, 'holy', {}], excalibur: ['melee', 0xfff6c0, 'holy', { leap: 1, spin: 1, strong: 1 }], solarflare: ['meteor', 0xffb040, 'fire', { count: 3, strong: 1 }],
  bonespear: ['bolt', 0xe8e0c8, 'dark', {}], bonewall: ['self', 0xc8c0a8, 'buff', {}], soulburst: ['bolt', 0x9a5aff, 'dark', {}], wraithcall: ['strike', 0x8a4ad0, 'arcane', { strong: 1 }],
  plague: ['bolt', 0x7bdc5a, 'poison', {}], rot: ['spikes', 0x6a8a2a, 'poison', {}], reaping: ['melee', 0x7a2fd0, 'dark', { dash: 1, spin: 1, strong: 1 }], pestilence: ['strike', 0x8fe04a, 'poison', { strong: 1 }],
  cure: ['self', 0x7dff8a, 'heal', {}], holybolt: ['bolt', 0xffe9a0, 'holy', {}], sanctify: ['strike', 0xfff0b0, 'holy', {}], blessing: ['self', 0xffe9a0, 'heal', {}],
  regrowth: ['self', 0x7bdc5a, 'heal', {}], vinelash: ['spikes', 0x5fbf4a, 'nature', {}], miracle: ['strike', 0xffffff, 'holy', { strong: 1 }], gaiawrath: ['spikes', 0x5fdf4a, 'nature', { strong: 1 }],
  flamewave: ['wave', 0xff7a2a, 'fire', {}], earthspike: ['spikes', 0xc8a060, 'quake', { strong: 1 }], shadowstrike: ['melee', 0x6a3aa0, 'dark', { dash: 1, twin: 1 }],
  arcanemissile: ['volley', 0xc89aff, 'arcane', {}], thunderstorm: ['strike', 0xfff36a, 'bolt', { strong: 1 }], holynova: ['strike', 0xfff0b0, 'holy', { strong: 1 }]
};
// skill books sold in settlements: price and the level needed to learn
window.LEARN = { firstaid: [120, 2], windcut: [150, 2], viper: [220, 4], spark: [260, 4], warcry: [300, 6], leech: [420, 8], blizzard: [650, 10], phoenix: [900, 12],
  flamewave: [500, 9], earthspike: [600, 10], shadowstrike: [700, 11], arcanemissile: [750, 12], thunderstorm: [800, 12], holynova: [850, 13] };
// shop goods: 'weapon1'..'weapon3' become the buyer's class weapon; [id, level needed]
window.GOODS = { potion: 1, ether: 1, hipotion: 3, weapon1: 3, armor1: 2, weapon2: 6, armor2: 5, weapon3: 10, armor3: 9, armor4: 12, weapon4: 16, armor5: 18,
  weapon5: 30, armor6: 30, weapon6: 45, armor7: 45, weapon7: 60, armor8: 60, weapon8: 75, armor9: 75, weapon9: 90, armor10: 90 };
for (const k in SKFX) Object.assign(SKILLS[k], { id: k, fx: SKFX[k][0], col: SKFX[k][1], elem: SKFX[k][2], opt: SKFX[k][3] });
// basic attack look per class
window.BASIC_FX = { knight: ['melee', 0xffffff, 'slash', {}], mage: ['bolt', 0x9fe3ff, 'arcane', {}], ranger: ['arrow', 0xffe08a, 'arrow', {}],
  hero: ['melee', 0xffe9a0, 'slash', {}], necromancer: ['bolt', 0x9a5aff, 'dark', {}], healer: ['bolt', 0xffe9a0, 'holy', {}] };

// skills: [skillId, unlockLevel]
window.CLASSES = {
  knight: { name: N('Ksatria', 'Knight'), desc: N('Tangguh di garis depan, serangan fisik kuat.', 'Sturdy front-liner with heavy blows.'),
    base: { str: 6, int: 2, agi: 3, vit: 6 }, weapon: 'sword', skills: [['slash', 1], ['bash', 3]], evos: ['paladin', 'berserker', 'guardian'] },
  mage: { name: N('Penyihir', 'Mage'), desc: N('Sihir dahsyat, tubuh rapuh.', 'Devastating magic, fragile body.'),
    base: { str: 2, int: 7, agi: 3, vit: 4 }, weapon: 'staff', skills: [['fireball', 1], ['frost', 3]], evos: ['archmage', 'warlock', 'chronomancer'] },
  ranger: { name: N('Pemanah', 'Archer'), desc: N('Lincah, kritis tinggi, ahli racun.', 'Agile, high crits, poison expert.'),
    base: { str: 4, int: 3, agi: 7, vit: 4 }, weapon: 'bow', skills: [['aimed', 1], ['venom', 3]], evos: ['sniper', 'warden', 'assassin'] },
  hero: { name: N('Pahlawan', 'Hero'), desc: N('Serba bisa: pedang besar dan cahaya suci.', 'All-rounder: greatsword and holy light.'),
    base: { str: 6, int: 4, agi: 5, vit: 5 }, weapon: 'greatsword', skills: [['braveslash', 1], ['lightblade', 3]], evos: ['champion', 'lightwarden'] },
  necromancer: { name: N('Nekromanser', 'Necromancer'), desc: N('Menguasai kematian, wabah, dan pencurian nyawa.', 'Commands death, plague and stolen life.'),
    base: { str: 2, int: 7, agi: 3, vit: 5 }, weapon: 'scythe', skills: [['bonespear', 1], ['bonewall', 3]], evos: ['soulcaller', 'plaguelord'] },
  healer: { name: N('Penyembuh', 'Healer'), desc: N('Bertahan dengan penyembuhan dan cahaya suci.', 'Survives on healing and holy light.'),
    base: { str: 2, int: 6, agi: 4, vit: 6 }, weapon: 'wand', skills: [['cure', 1], ['holybolt', 3]], evos: ['priest', 'lifeweaver'] }
};
window.EVOS = {
  champion:    { from: 'hero', name: N('Juara', 'Champion'), desc: N('Pahlawan medan perang yang tak gentar.', 'A fearless battlefield hero.'), bonus: { str: 4, agi: 1 }, skills: [['valor', 5], ['heroic', 8]] },
  lightwarden: { from: 'hero', name: N('Penjaga Cahaya', 'Lightwarden'), desc: N('Pedang yang dipandu cahaya suci.', 'A blade guided by holy light.'), bonus: { vit: 3, int: 2 }, skills: [['guardlight', 5], ['radiant', 8]] },
  legend:      { from: 'champion', tier: 2, name: N('Pahlawan Legenda', 'Legendary Hero'), desc: N('Namanya dinyanyikan di seluruh negeri.', 'Their name is sung across every realm.'), bonus: { str: 6, agi: 2 }, skills: [['excalibur', 12]] },
  sunknight:   { from: 'lightwarden', tier: 2, name: N('Ksatria Mentari', 'Sun Knight'), desc: N('Membawa terang matahari ke medan perang.', 'Brings the sun to the battlefield.'), bonus: { vit: 3, int: 4 }, skills: [['solarflare', 12]] },
  soulcaller:  { from: 'necromancer', name: N('Pemanggil Arwah', 'Soul Caller'), desc: N('Arwah datang saat dipanggil.', 'The dead answer when called.'), bonus: { int: 4, vit: 1 }, skills: [['soulburst', 5], ['wraithcall', 8]] },
  plaguelord:  { from: 'necromancer', name: N('Penyihir Wabah', 'Plague Lord'), desc: N('Racun yang menggerogoti dari dalam.', 'Poison that eats from within.'), bonus: { int: 3, agi: 2 }, skills: [['plague', 5], ['rot', 8]] },
  deathlord:   { from: 'soulcaller', tier: 2, name: N('Raja Kematian', 'Death Lord'), desc: N('Kematian sendiri tunduk padanya.', 'Death itself bows to them.'), bonus: { int: 6, vit: 2 }, skills: [['reaping', 12]] },
  blackplague: { from: 'plaguelord', tier: 2, name: N('Wabah Hitam', 'Black Plague'), desc: N('Satu sentuhan, seluruh pasukan tumbang.', 'One touch fells an army.'), bonus: { int: 5, agi: 3 }, skills: [['pestilence', 12]] },
  priest:      { from: 'healer', name: N('Pendeta Cahaya', 'Priest of Light'), desc: N('Doa yang menyembuhkan dan menghukum.', 'Prayers that heal and smite.'), bonus: { int: 4, vit: 1 }, skills: [['sanctify', 5], ['blessing', 8]] },
  lifeweaver:  { from: 'healer', name: N('Penenun Kehidupan', 'Lifeweaver'), desc: N('Kekuatan alam untuk merawat dan menjerat.', 'The power of nature to mend and bind.'), bonus: { vit: 3, agi: 2 }, skills: [['regrowth', 5], ['vinelash', 8]] },
  archsaint:   { from: 'priest', tier: 2, name: N('Santo Agung', 'Archsaint'), desc: N('Mukjizat berjalan di antara manusia.', 'A miracle walking among mortals.'), bonus: { int: 6, vit: 2 }, skills: [['miracle', 12]] },
  worldtree:   { from: 'lifeweaver', tier: 2, name: N('Pohon Dunia', 'World Tree'), desc: N('Akar yang menopang seluruh negeri.', 'Roots that hold up every realm.'), bonus: { vit: 5, int: 3 }, skills: [['gaiawrath', 12]] },
  paladin:   { from: 'knight', name: N('Paladin', 'Paladin'), desc: N('Penyembuh suci berzirah.', 'Armored holy healer.'), bonus: { vit: 3, int: 2 }, skills: [['holy', 5], ['smite', 8]] },
  berserker: { from: 'knight', name: N('Berserker', 'Berserker'), desc: N('Kekuatan mentah tanpa ampun.', 'Raw, merciless power.'), bonus: { str: 4, agi: 1 }, skills: [['rage', 5], ['cleave', 8]] },
  archmage:  { from: 'mage', name: N('Penyihir Agung', 'Archmage'), desc: N('Penguasa elemen.', 'Master of the elements.'), bonus: { int: 5 }, skills: [['barrier', 5], ['meteor', 8]] },
  warlock:   { from: 'mage', name: N('Dukun Bayang', 'Warlock'), desc: N('Menyerap nyawa musuh.', 'Feeds on the life of foes.'), bonus: { int: 3, vit: 2 }, skills: [['drain', 5], ['curse', 8]] },
  sniper:    { from: 'ranger', name: N('Penembak Jitu', 'Sniper'), desc: N('Satu tembakan, satu korban.', 'One shot, one fall.'), bonus: { agi: 4, str: 1 }, skills: [['snipe', 5], ['volley', 8]] },
  warden:    { from: 'ranger', name: N('Penjaga Rimba', 'Warden'), desc: N('Jerat alam dan pemulihan.', 'Nature snares and healing.'), bonus: { vit: 2, agi: 3 }, skills: [['mend', 5], ['thorn', 8]] },
  guardian:  { from: 'knight', name: N('Penjaga Benteng', 'Guardian'), desc: N('Tembok hidup yang sulit ditumbangkan.', 'A living wall that refuses to fall.'), bonus: { vit: 5 }, skills: [['fortify', 5], ['quake', 8]] },
  chronomancer: { from: 'mage', name: N('Penyihir Waktu', 'Chronomancer'), desc: N('Membekukan dan memutar balik waktu.', 'Freezes and rewinds time.'), bonus: { int: 3, agi: 2 }, skills: [['timestop', 5], ['rewind', 8]] },
  assassin:  { from: 'ranger', name: N('Pembunuh Bayangan', 'Assassin'), desc: N('Serangan kritis dari kegelapan.', 'Critical strikes from the dark.'), bonus: { agi: 3, str: 2 }, skills: [['backstab', 5], ['shadow', 8]] },
  // second tier (Lv 12): each first-tier job has its own master form
  templar:   { from: 'paladin', tier: 2, name: N('Templar Suci', 'Templar'), desc: N('Cahaya yang melindungi seluruh pasukan.', 'A light that shields the whole party.'), bonus: { vit: 4, int: 3 }, skills: [['sanctum', 12]] },
  warlord:   { from: 'berserker', tier: 2, name: N('Panglima Perang', 'Warlord'), desc: N('Satu ayunan meruntuhkan barisan.', 'One swing breaks a whole line.'), bonus: { str: 6, vit: 2 }, skills: [['annihilate', 12]] },
  colossus:  { from: 'guardian', tier: 2, name: N('Raksasa Baja', 'Colossus'), desc: N('Bumi bergetar di setiap langkahnya.', 'The ground shakes with every step.'), bonus: { vit: 6, str: 2 }, skills: [['titan', 12]] },
  sage:      { from: 'archmage', tier: 2, name: N('Mahaguru Sihir', 'Sage'), desc: N('Memanggil bintang dari langit.', 'Calls the stars down from the sky.'), bonus: { int: 7 }, skills: [['starfall', 12]] },
  lich:      { from: 'warlock', tier: 2, name: N('Raja Bayang', 'Lich'), desc: N('Hidup dari jiwa yang dipanennya.', 'Lives on the souls it reaps.'), bonus: { int: 5, vit: 2 }, skills: [['soulreap', 12]] },
  timelord:  { from: 'chronomancer', tier: 2, name: N('Penguasa Waktu', 'Timelord'), desc: N('Detik pun tunduk padanya.', 'Even seconds obey.'), bonus: { int: 4, agi: 3 }, skills: [['eternity', 12]] },
  hawkeye:   { from: 'sniper', tier: 2, name: N('Mata Elang', 'Hawkeye'), desc: N('Tak ada sasaran yang terlalu jauh.', 'No target is too far.'), bonus: { agi: 6, str: 2 }, skills: [['skypierce', 12]] },
  druid:     { from: 'warden', tier: 2, name: N('Druid Agung', 'Archdruid'), desc: N('Alam menyerang dan menyembuhkan bersamanya.', 'Nature strikes and heals at their side.'), bonus: { vit: 3, agi: 3, int: 2 }, skills: [['wrath', 12]] },
  phantom:   { from: 'assassin', tier: 2, name: N('Hantu Pembunuh', 'Phantom'), desc: N('Datang tanpa suara, pergi tanpa jejak.', 'Arrives unheard, leaves no trace.'), bonus: { agi: 5, str: 3 }, skills: [['deathmark', 12]] }
};
// job title for any combination of class and evolutions
window.jobName = (cls, evo, evo2) => L((EVOS[evo2] || EVOS[evo] || CLASSES[cls] || CLASSES.knight).name);
// the level each evolution tier opens at (tier 1 is the first job change); heroes stop at MAX_LVL
window.EVO_LV = [0, 5, 12, 30, 50, 75];
window.MAX_LVL = 100;
// tiers 3-5 grow out of each master (tier 2) job; every tier brings a stronger form of the master's skill
const ASCEND = {
  templar:     [N('Templar Agung', 'High Templar'), N('Perisai Surgawi', 'Bulwark of Heaven'), N('Malaikat Perang', 'War Angel')],
  warlord:     [N('Raja Perang', 'War King'), N('Penghancur Dunia', 'Worldbreaker'), N('Dewa Amarah', 'God of Fury')],
  colossus:    [N('Titan Besi', 'Iron Titan'), N('Benteng Abadi', 'Eternal Fortress'), N('Atlas Penopang Langit', 'Atlas, Sky Bearer')],
  sage:        [N('Penyihir Bintang', 'Star Sorcerer'), N('Penguasa Elemen', 'Elemental Sovereign'), N('Dewa Sihir', 'God of Magic')],
  lich:        [N('Raja Lich', 'Lich King'), N('Kaisar Arwah', 'Soul Emperor'), N('Dewa Kegelapan', 'Dark God')],
  timelord:    [N('Penjaga Zaman', 'Keeper of Ages'), N('Penguasa Takdir', 'Lord of Fate'), N('Dewa Waktu', 'Chronos')],
  hawkeye:     [N('Pemanah Bintang', 'Star Archer'), N('Pemanah Badai', 'Storm Archer'), N('Dewa Panah', 'God of the Bow')],
  druid:       [N('Penjaga Hutan Purba', 'Ancient Grovekeeper'), N('Roh Alam', 'Spirit of Nature'), N('Dewa Rimba', 'Forest God')],
  phantom:     [N('Bayangan Maut', 'Death Shadow'), N('Penguasa Malam', 'Lord of Night'), N('Dewa Bayangan', 'Shadow God')],
  legend:      [N('Pahlawan Mitos', 'Mythic Hero'), N('Pahlawan Abadi', 'Eternal Hero'), N('Setengah Dewa', 'Demigod')],
  sunknight:   [N('Ksatria Fajar', 'Dawn Knight'), N('Penguasa Mentari', 'Sun Sovereign'), N('Dewa Matahari', 'Sun God')],
  deathlord:   [N('Kaisar Kematian', 'Death Emperor'), N('Penguasa Alam Baka', 'Underworld Lord'), N('Dewa Maut', 'God of Death')],
  blackplague: [N('Wabah Kiamat', 'Doom Plague'), N('Penguasa Racun', 'Venom Sovereign'), N('Dewa Wabah', 'Plague God')],
  archsaint:   [N('Santo Surgawi', 'Celestial Saint'), N('Utusan Langit', 'Envoy of Heaven'), N('Malaikat Agung', 'Archangel')],
  worldtree:   [N('Akar Abadi', 'Eternal Root'), N('Jantung Bumi', 'Heart of the World'), N('Dewa Kehidupan', 'God of Life')]
};
const ASC_DESC = [N('Kekuatan yang melampaui para master.', 'Power beyond the masters.'), N('Legenda hidup yang ditakuti di seluruh negeri.', 'A living legend feared in every realm.'),
  N('Puncak evolusi: setara para dewa.', 'The peak of evolution, equal to the gods.')];
for (const [base, names] of Object.entries(ASCEND)) names.forEach((name, i) => {
  const tier = 3 + i, b = EVOS[base], sk = b.skills[0][0], s0 = SKILLS[sk], k = [1.25, 1.5, 1.8][i], num = ['II', 'III', 'IV'][i];
  const up = SKILLS[sk + tier] = { ...s0, id: sk + tier, name: N(s0.name.id + ' ' + num, s0.name.en + ' ' + num), mp: Math.round(s0.mp * (1 + 0.2 * (i + 1))) };
  if (s0.pow) up.pow = +(s0.pow * k).toFixed(2);
  if (s0.heal) up.heal = +(s0.heal * k).toFixed(2);
  EVOS[base + tier] = { from: i ? base + (tier - 1) : base, tier, name, desc: ASC_DESC[i], skills: [[sk + tier, EVO_LV[tier]]],
    bonus: Object.fromEntries(Object.entries(b.bonus).map(([a, v]) => [a, Math.round(v * [1.5, 2, 3][i])])) };
});
// the chosen jobs from tier 1 up: evo is tier 1, evo2 the newest one past it, whose `from` links lead back down
window.evoChain = s => { const out = []; for (let id = s.evo2 || s.evo; EVOS[id]; id = EVOS[id].from) out.unshift(id); return out; };
window.nextEvos = s => { const top = s.evo2 || s.evo; return top ? Object.keys(EVOS).filter(k => EVOS[k].from === top) : CLASSES[s.cls].evos; };

// type: use | weapon | armor. Weapons carry kind (sword/staff/bow) and tier.
window.ITEMS = {
  potion:   { type: 'use', name: N('Ramuan Penyembuh', 'Healing Potion'), heal: 60, price: 20 },
  hipotion: { type: 'use', name: N('Ramuan Agung', 'Greater Potion'), heal: 160, price: 60 },
  ether:    { type: 'use', name: N('Eliksir Mana', 'Mana Elixir'), mana: 30, price: 30 },
  sword0: { type: 'weapon', kind: 'sword', tier: 0, name: N('Pedang Kayu', 'Wooden Sword'), atk: 2, price: 5 },
  sword1: { type: 'weapon', kind: 'sword', tier: 1, name: N('Pedang Besi', 'Iron Sword'), atk: 6, price: 60 },
  sword2: { type: 'weapon', kind: 'sword', tier: 2, name: N('Pedang Fajar', 'Dawnblade'), atk: 13, price: 200 },
  staff0: { type: 'weapon', kind: 'staff', tier: 0, name: N('Tongkat Ranting', 'Twig Staff'), mag: 2, price: 5 },
  staff1: { type: 'weapon', kind: 'staff', tier: 1, name: N('Tongkat Oak', 'Oak Staff'), mag: 6, price: 60 },
  staff2: { type: 'weapon', kind: 'staff', tier: 2, name: N('Tongkat Kristal', 'Crystal Staff'), mag: 13, price: 200 },
  bow0:   { type: 'weapon', kind: 'bow', tier: 0, name: N('Busur Bambu', 'Bamboo Bow'), atk: 2, price: 5 },
  bow1:   { type: 'weapon', kind: 'bow', tier: 1, name: N('Busur Pendek', 'Shortbow'), atk: 5, crit: 3, price: 60 },
  bow2:   { type: 'weapon', kind: 'bow', tier: 2, name: N('Busur Elang', 'Eagle Bow'), atk: 11, crit: 6, price: 200 },
  armor0: { type: 'armor', name: N('Baju Kain', 'Cloth Tunic'), def: 1, price: 5 },
  armor1: { type: 'armor', name: N('Zirah Kulit', 'Leather Armor'), def: 3, hp: 15, price: 50 },
  armor2: { type: 'armor', name: N('Zirah Baja', 'Steel Plate'), def: 6, hp: 35, price: 150 },
  armor3: { type: 'armor', name: N('Zirah Sisik Naga', 'Dragonscale'), def: 10, hp: 70, price: 500 },
  armor4: { type: 'armor', name: N('Zirah Kristal Es', 'Frostcrystal Mail'), def: 15, hp: 110, price: 900 },
  sword3: { type: 'weapon', kind: 'sword', tier: 3, name: N('Pedang Bintang', 'Starblade'), atk: 22, price: 600 },
  staff3: { type: 'weapon', kind: 'staff', tier: 3, name: N('Tongkat Galaksi', 'Galaxy Staff'), mag: 22, price: 600 },
  bow3:   { type: 'weapon', kind: 'bow', tier: 3, name: N('Busur Fajar', 'Dawnbow'), atk: 19, crit: 9, price: 600 },
  armor5: { type: 'armor', name: N('Zirah Seraf', 'Seraph Mail'), def: 21, hp: 170, price: 1600 },
  sword4: { type: 'weapon', kind: 'sword', tier: 4, name: N('Pedang Naga Langit', 'Skydragon Blade'), atk: 33, price: 1500 },
  staff4: { type: 'weapon', kind: 'staff', tier: 4, name: N('Tongkat Bintang Purba', 'Elder Star Staff'), mag: 33, price: 1500 },
  bow4:   { type: 'weapon', kind: 'bow', tier: 4, name: N('Busur Angin Abadi', 'Everwind Bow'), atk: 29, crit: 12, price: 1500 }
};
// the new jobs' weapons: [kind, [names by tier], stat]
[['greatsword', 'atk', [['Pedang Latih Besar', 'Training Greatsword'], ['Pedang Besar Baja', 'Steel Greatsword'], ['Claymore Fajar', 'Dawn Claymore'], ['Pedang Pahlawan', "Hero's Brand"], ['Excalibur', 'Excalibur']]],
 ['scythe', 'mag', [['Sabit Petani', 'Farm Scythe'], ['Sabit Tulang', 'Bone Scythe'], ['Sabit Arwah', 'Soul Reaper'], ['Sabit Bulan Gelap', 'Darkmoon Scythe'], ['Sabit Akhir Zaman', 'Doomsday Scythe']]],
 ['wand', 'mag', [['Tongkat Doa', 'Prayer Wand'], ['Tongkat Perak', 'Silver Wand'], ['Tongkat Fajar Suci', 'Holy Dawn Wand'], ['Tongkat Malaikat', 'Angel Wand'], ['Tongkat Cahaya Ilahi', 'Divine Light Wand']]]
].forEach(([kind, stat, names]) => names.forEach(([id, en], tier) => {
  ITEMS[kind + tier] = { type: 'weapon', kind, tier, name: N(id, en), [stat]: [2, 7, 14, 23, 34][tier], price: [5, 60, 200, 600, 1500][tier] };
}));
// high tiers sold in the eight realms (Lv 30, 45, 60, 75, 90): tiers 5-9 of every weapon, armor 6-10
const HIGH = {
  sword:      [['Pedang Mithril', 'Mithril Sword'], ['Pedang Api Naga', 'Dragonfire Blade'], ['Pedang Seraf', 'Seraph Blade'], ['Pedang Raja Titan', 'Titan King Blade'], ['Pedang Dewa Perang', 'War God Blade']],
  staff:      [['Tongkat Mithril', 'Mithril Staff'], ['Tongkat Mata Naga', 'Dragoneye Staff'], ['Tongkat Halo Suci', 'Holy Halo Staff'], ['Tongkat Pohon Dunia', 'World Tree Staff'], ['Tongkat Dewa Sihir', 'Staff of the Arcane God']],
  bow:        [['Busur Mithril', 'Mithril Bow'], ['Busur Tanduk Naga', 'Dragonhorn Bow'], ['Busur Sayap Seraf', 'Seraphwing Bow'], ['Busur Elf Purba', 'Ancient Elven Bow'], ['Busur Dewa Pemburu', 'Bow of the Hunter God']],
  greatsword: [['Pedang Besar Mithril', 'Mithril Greatsword'], ['Pedang Besar Naga', 'Dragon Greatsword'], ['Pedang Besar Fajar Abadi', 'Eternal Dawn Greatsword'], ['Pedang Besar Titan', 'Titan Greatsword'], ['Pedang Besar Legenda', 'Legend Greatsword']],
  scythe:     [['Sabit Mithril', 'Mithril Scythe'], ['Sabit Api Neraka', 'Hellfire Scythe'], ['Sabit Jiwa Iblis', 'Demon Soul Scythe'], ['Sabit Kaisar Arwah', 'Soul Emperor Scythe'], ['Sabit Dewa Maut', 'Scythe of the Death God']],
  wand:       [['Tongkat Doa Mithril', 'Mithril Prayer Wand'], ['Tongkat Air Suci', 'Holy Water Wand'], ['Tongkat Sayap Malaikat', 'Angelwing Wand'], ['Tongkat Akar Kehidupan', 'Lifebloom Wand'], ['Tongkat Dewa Cahaya', 'Wand of the Light God']]
};
for (const [kind, names] of Object.entries(HIGH)) names.forEach(([id, en], i) => {
  const v = [48, 68, 90, 112, 135][i], stat = ['staff', 'scythe', 'wand'].includes(kind) ? 'mag' : 'atk';
  ITEMS[kind + (5 + i)] = { type: 'weapon', kind, tier: 5 + i, name: N(id, en), [stat]: kind === 'bow' ? Math.round(v * 0.88) : v, price: [3000, 5000, 8000, 12000, 18000][i] };
  if (kind === 'bow') ITEMS[kind + (5 + i)].crit = 15 + 3 * i;
});
[['Zirah Mithril', 'Mithril Mail'], ['Zirah Api Naga', 'Dragonfire Plate'], ['Zirah Kulit Iblis', 'Demonhide Armor'], ['Zirah Titan', 'Titan Plate'], ['Zirah Tempaan Dewa', 'Godforged Armor']].forEach(([id, en], i) => {
  ITEMS['armor' + (6 + i)] = { type: 'armor', name: N(id, en), def: [30, 42, 56, 72, 90][i], hp: [260, 380, 520, 700, 900][i], price: [2800, 4800, 7600, 11500, 17000][i] };
});

// drops: [itemId, chance]; 'weapon1'/'weapon2' resolve to the player's class weapon of that tier
window.ENEMIES = {
  slime:    { name: N('Lendir Hijau', 'Green Slime'), lvl: 1, hp: 30, atk: 7, def: 1, agi: 2, xp: 12, gold: [3, 8], color: 0x6ccf5a, shape: 'slime', drops: [['potion', .35]] },
  wolf:     { name: N('Serigala Kabut', 'Mist Wolf'), lvl: 3, hp: 55, atk: 11, def: 3, agi: 9, xp: 26, gold: [6, 14], color: 0x8d93a0, shape: 'beast', drops: [['potion', .3], ['armor1', .08]] },
  goblin:   { name: N('Goblin Hutan', 'Forest Goblin'), lvl: 4, hp: 72, atk: 13, def: 5, agi: 6, xp: 36, gold: [10, 22], color: 0x7a9a3a, shape: 'humanoid', drops: [['ether', .3], ['weapon1', .1]] },
  skeleton: { name: N('Prajurit Tulang', 'Bone Warrior'), lvl: 6, hp: 105, atk: 18, def: 8, agi: 5, xp: 58, gold: [15, 30], color: 0xe8e2cf, shape: 'humanoid', poison: .2, drops: [['hipotion', .2], ['armor2', .07]] },
  golem:    { name: N('Golem Batu', 'Stone Golem'), lvl: 8, hp: 175, atk: 22, def: 14, agi: 2, xp: 95, gold: [25, 45], color: 0x8b8378, shape: 'golem', stun: .15, drops: [['weapon2', .1], ['armor2', .1]] },
  dragon:   { name: N('Naga Kabut', 'Mist Dragon'), lvl: 12, hp: 430, atk: 33, def: 16, agi: 7, xp: 320, gold: [150, 220], color: 0x7b3fa0, shape: 'dragon', boss: true, poison: .25, special: [N('Napas Kabut', 'Mist Breath'), 0xb06cff], drops: [['armor3', .6], ['weapon2', .6], ['weapon3', .25]] },
  boar:     { name: N('Babi Hutan', 'Wild Boar'), lvl: 2, hp: 42, atk: 9, def: 2, agi: 4, xp: 16, gold: [4, 10], color: 0x7a5a3a, shape: 'beast', drops: [['potion', .3]] },
  troll:    { name: N('Troll Gunung', 'Mountain Troll'), lvl: 9, hp: 200, atk: 25, def: 12, agi: 3, xp: 110, gold: [30, 55], color: 0x6f7f6a, shape: 'humanoid', scale: 1.5, stun: .1, drops: [['hipotion', .3], ['weapon2', .08]] },
  scorpion: { name: N('Kalajengking Raksasa', 'Giant Scorpion'), lvl: 7, hp: 120, atk: 20, def: 10, agi: 7, xp: 70, gold: [18, 34], color: 0xb0662a, shape: 'scorpion', poison: .35, drops: [['potion', .3], ['armor2', .06]] },
  mummy:    { name: N('Mumi Gurun', 'Desert Mummy'), lvl: 8, hp: 150, atk: 21, def: 9, agi: 4, xp: 85, gold: [22, 40], color: 0xd8cfae, shape: 'humanoid', poison: .15, drops: [['ether', .3], ['weapon2', .07]] },
  yeti:     { name: N('Yeti', 'Yeti'), lvl: 10, hp: 240, atk: 27, def: 13, agi: 5, xp: 130, gold: [34, 60], color: 0xeef4f8, shape: 'humanoid', scale: 1.6, stun: .15, drops: [['hipotion', .3], ['armor4', .03]] },
  wisp:     { name: N('Roh Es', 'Frost Wisp'), lvl: 9, hp: 130, atk: 26, def: 8, agi: 12, xp: 105, gold: [28, 48], color: 0x9fe8ff, shape: 'wisp', float: true, stun: .2, drops: [['ether', .4]] },
  imp:      { name: N('Imp Api', 'Fire Imp'), lvl: 11, hp: 170, atk: 30, def: 11, agi: 11, xp: 140, gold: [36, 64], color: 0xd8402a, shape: 'humanoid', scale: 0.7, drops: [['ether', .35], ['weapon2', .1]] },
  lavagolem:{ name: N('Golem Lava', 'Lava Golem'), lvl: 13, hp: 330, atk: 34, def: 20, agi: 2, xp: 210, gold: [55, 90], color: 0x4a2a22, glow: 0xff5a1a, shape: 'golem', stun: .2, drops: [['armor3', .1], ['weapon3', .04]] },
  ghost:    { name: N('Hantu Rimba', 'Forest Wraith'), lvl: 11, hp: 160, atk: 31, def: 9, agi: 13, xp: 145, gold: [36, 62], color: 0xc8c8ff, shape: 'ghost', float: true, drops: [['ether', .35]] },
  zombie:   { name: N('Mayat Hidup', 'Ghoul'), lvl: 9, hp: 190, atk: 24, def: 10, agi: 3, xp: 100, gold: [26, 46], color: 0x7f9a6a, shape: 'humanoid', poison: .3, drops: [['hipotion', .25]] },
  reaper:   { name: N('Malaikat Maut', 'Grim Reaper'), lvl: 15, hp: 420, atk: 40, def: 18, agi: 10, xp: 300, gold: [80, 130], color: 0x26222e, shape: 'humanoid', scale: 1.3, poison: .2, drops: [['weapon3', .12], ['armor3', .15]] },
  piranha:  { name: N('Ikan Taring', 'Fang Fish'), lvl: 3, hp: 45, atk: 12, def: 2, agi: 10, xp: 24, gold: [5, 12], color: 0x5a8fb0, shape: 'fish', water: true, drops: [['potion', .3]] },
  crab:     { name: N('Kepiting Karang', 'Reef Crab'), lvl: 6, hp: 110, atk: 17, def: 15, agi: 3, xp: 60, gold: [14, 28], color: 0xd85a3a, shape: 'crab', water: true, drops: [['armor2', .06], ['potion', .3]] },
  serpent:  { name: N('Ular Laut', 'Sea Serpent'), lvl: 10, hp: 220, atk: 28, def: 12, agi: 9, xp: 130, gold: [30, 55], color: 0x2f7a8a, shape: 'serpent', water: true, poison: .2, drops: [['hipotion', .3], ['weapon2', .08]] },
  kingslime:{ name: N('Raja Lendir', 'King Slime'), lvl: 6, hp: 380, atk: 18, def: 8, agi: 4, xp: 220, gold: [90, 140], color: 0x4fd04a, shape: 'slime', scale: 3, boss: true, crown: true, special: [N('Hujan Lendir', 'Slime Rain'), 0x6cff5a], drops: [['hipotion', 1], ['weapon1', .5], ['armor2', .3]] },
  treant:   { name: N('Treant Purba', 'Ancient Treant'), lvl: 8, hp: 520, atk: 24, def: 14, agi: 3, xp: 300, gold: [120, 180], color: 0x5a4030, shape: 'treant', boss: true, stun: .2, special: [N('Akar Pembelit', 'Root Snare'), 0x7bdc5a], drops: [['armor2', .6], ['weapon2', .3], ['hipotion', 1]] },
  titan:    { name: N('Titan Batu', 'Stone Titan'), lvl: 11, hp: 700, atk: 30, def: 22, agi: 2, xp: 420, gold: [160, 230], color: 0x7a7a74, glow: 0x7fd0ff, shape: 'golem', scale: 2, boss: true, stun: .25, special: [N('Longsoran', 'Rockslide'), 0xb0a090], drops: [['armor3', .5], ['weapon2', .6]] },
  scorpking:{ name: N('Raja Kalajengking', 'Scorpion King'), lvl: 10, hp: 600, atk: 28, def: 16, agi: 8, xp: 380, gold: [150, 220], color: 0xd8a030, shape: 'scorpion', scale: 2.4, boss: true, crown: true, poison: .45, special: [N('Sengat Mematikan', 'Deadly Sting'), 0xd0ff40], drops: [['weapon3', .25], ['armor3', .4]] },
  frostwyrm:{ name: N('Naga Es', 'Frost Wyrm'), lvl: 14, hp: 820, atk: 36, def: 20, agi: 7, xp: 520, gold: [200, 280], color: 0xbfe6ff, wing: 0x6fa8d8, shape: 'dragon', boss: true, stun: .25, special: [N('Napas Beku', 'Frost Breath'), 0x9fe8ff], drops: [['armor4', .4], ['weapon3', .4]] },
  lichking: { name: N('Raja Lich', 'Lich King'), lvl: 15, hp: 900, atk: 40, def: 20, agi: 10, xp: 600, gold: [220, 320], color: 0x9a9ab8, shape: 'humanoid', scale: 1.9, boss: true, crown: true, poison: .3, special: [N('Kutukan Abadi', 'Eternal Curse'), 0x8a3fd0], drops: [['weapon3', .5], ['armor4', .3]] },
  kraken:   { name: N('Kraken', 'Kraken'), lvl: 16, hp: 650, atk: 38, def: 18, agi: 6, xp: 420, gold: [180, 260], color: 0x8a3a6a, shape: 'kraken', water: true, boss: true, special: [N('Gelombang Pasang', 'Tidal Wave'), 0x3fa8ff], drops: [['armor4', .5], ['weapon3', .5]] }
};

// monsters of the eight outer realms, scaled by level
const mob = (id, en, lvl, color, shape, extra) => ({ name: N(id, en), lvl, hp: Math.round(18 * lvl + 20), atk: Math.round(2.4 * lvl + 2), def: Math.round(lvl * 1.1), agi: 6,
  xp: Math.round(lvl * lvl * 1.3), gold: [lvl * 5, lvl * 8], color, shape, drops: [['hipotion', .3], ['ether', .2], ['weapon3', .04]], ...extra });
const lord = (id, en, lvl, color, shape, special, extra) => ({ name: N(id, en), lvl, hp: 60 * lvl, atk: Math.round(2.8 * lvl), def: Math.round(lvl * 1.3), agi: 7,
  xp: Math.round(lvl * lvl * 2.5), gold: [20 * lvl, 30 * lvl], color, shape, boss: true, crown: true, special, drops: [['weapon4', .35], ['armor5', .3], ['hipotion', 1]], ...extra });
Object.assign(ENEMIES, {
  bandit:     mob('Bandit Jalanan', 'Highway Bandit', 14, 0xd9a47a, 'humanoid', { outfit: 0x5a4a3a, weapon: 'knight', hat: 3 }),
  renegade:   mob('Ksatria Murtad', 'Renegade Knight', 15, 0xd9a47a, 'humanoid', { outfit: 0x6a6a7a, weapon: 'knight', hat: 1, def: 20 }),
  warlord:    lord('Panglima Pemberontak', 'Rebel Warlord', 20, 0xd9a47a, 'humanoid', [N('Serbuan Pemberontak', 'Rebel Charge'), 0xff6a3a], { outfit: 0x8a2a2a, weapon: 'greatsword', scale: 1.5 }),
  lion:       mob('Singa Liar', 'Savage Lion', 15, 0xc89a50, 'beast', { mane: 0x8a5a2a, agi: 10 }),
  rhino:      mob('Badak Baja', 'Steel Rhino', 16, 0x8a8a90, 'beast', { horn: true, scale: 1.5, def: 24, agi: 3 }),
  beastking:  lord('Raja Rimba', 'Beast King', 21, 0xd8a040, 'beast', [N('Auman Raja', "King's Roar"), 0xffc04a], { mane: 0x6a3a1a, scale: 2.2 }),
  dryad:      mob('Dryad Liar', 'Wild Dryad', 16, 0x9fdf9f, 'humanoid', { outfit: 0x3f8a4a, weapon: 'ranger', poison: .2 }),
  spiritstag: mob('Rusa Roh', 'Spirit Stag', 17, 0xcff4ff, 'beast', { horn: true, agi: 12, stun: .2 }),
  dryadqueen: lord('Ratu Dryad', 'Dryad Queen', 22, 0xbfefbf, 'humanoid', [N('Badai Kelopak', 'Petal Storm'), 0x8fefaf], { outfit: 0x2f7a5a, weapon: 'staff', wings: 0xd8ffe8, scale: 1.6 }),
  ogre:       mob('Ogre', 'Ogre', 17, 0x8aa060, 'humanoid', { outfit: 0x5a4030, weapon: 'hammer', scale: 1.7, agi: 3 }),
  hillgiant:  mob('Raksasa Bukit', 'Hill Giant', 18, 0xc89a7a, 'humanoid', { outfit: 0x6a5030, weapon: 'hammer', scale: 2.4, agi: 2, stun: .2 }),
  giantking:  lord('Raja Raksasa', 'Giant King', 23, 0xd8a888, 'humanoid', [N('Hantaman Gunung', 'Mountain Smash'), 0xc8a060], { outfit: 0x4a3a6a, weapon: 'greatsword', scale: 3 }),
  minegolem:  mob('Golem Tambang', 'Mine Golem', 18, 0x9a8a5a, 'golem', { glow: 0xffa040, agi: 2, def: 26 }),
  maddwarf:   mob('Dwarf Gila', 'Mad Dwarf', 19, 0xe8b090, 'humanoid', { outfit: 0x6a4a2a, weapon: 'axe', hgt: 0.72, build: 1.35, beard: 0xa8642a }),
  ironking:   lord('Raja Gunung Besi', 'Iron Mountain King', 24, 0x5a5a62, 'golem', [N('Palu Tempa', 'Forge Hammer'), 0xff6020], { glow: 0xff6020, scale: 2.2 }),
  fallen:     mob('Malaikat Jatuh', 'Fallen Angel', 19, 0xc8c8d8, 'humanoid', { outfit: 0x2a2a3a, weapon: 'knight', wings: 0x3a3a4a, agi: 11 }),
  sentinel:   mob('Penjaga Cahaya', 'Light Sentinel', 20, 0xffe9a0, 'wisp', { float: true, stun: .25 }),
  seraph:     lord('Seraf Agung', 'High Seraph', 25, 0xf4e8d8, 'humanoid', [N('Penghakiman Surga', 'Heavenly Judgment'), 0xfff0b0], { outfit: 0xffffff, weapon: 'knight', wings: 0xffffff, halo: true, scale: 1.8, crown: false }),
  wyvern:     mob('Wyvern', 'Wyvern', 20, 0x4a8a5a, 'dragon', { wing: 0x2a5a3a, scale: 0.55, agi: 10 }),
  firedrake:  mob('Drake Api', 'Fire Drake', 21, 0xc0402a, 'dragon', { wing: 0x6a1a10, scale: 0.7, poison: .15 }),
  elderdragon:lord('Naga Purba', 'Elder Dragon', 26, 0xd8a040, 'dragon', [N('Napas Purba', 'Ancient Breath'), 0xffb040, 'bolt', 'fire'], { wing: 0x8a5a1a, scale: 1.3 }),
  fiend:      mob('Iblis Bertanduk', 'Horned Fiend', 21, 0xc03a2a, 'humanoid', { outfit: 0x2a0a0a, weapon: 'scythe', horns: true, wings: 0x2a0a0a, bat: true }),
  hellhound:  mob('Anjing Neraka', 'Hellhound', 22, 0x2a1a1a, 'beast', { mane: 0x8a1a0a, agi: 12, poison: .2 }),
  demonlord:  lord('Raja Iblis', 'Demon Lord', 28, 0x8a1a1a, 'humanoid', [N('Api Neraka', 'Hellfire'), 0xff3a1a], { outfit: 0x1a0a0a, weapon: 'greatsword', horns: true, wings: 0x1a0a0a, bat: true, scale: 2.1 })
});
// map regions; spawn lists pick the monsters that roam there
window.BIOMES = {
  town:     { name: N('Pemukiman', 'Settlement'), spawn: [] },
  meadow:   { name: N('Padang Hijau', 'Green Meadow'), spawn: ['slime', 'slime', 'boar', 'wolf'] },
  forest:   { name: N('Hutan Pinus', 'Pine Forest'), spawn: ['wolf', 'goblin', 'boar', 'goblin'] },
  mountain: { name: N('Pegunungan Batu', 'Stone Peaks'), spawn: ['golem', 'troll', 'wolf'] },
  desert:   { name: N('Gurun Pasir Merah', 'Red Desert'), spawn: ['scorpion', 'mummy', 'scorpion'] },
  ice:      { name: N('Tundra Beku', 'Frozen Tundra'), spawn: ['yeti', 'wisp', 'wisp'] },
  magma:    { name: N('Lembah Magma', 'Magma Valley'), spawn: ['imp', 'lavagolem', 'imp'] },
  death:    { name: N('Hutan Kematian', 'Deathwood'), spawn: ['zombie', 'ghost', 'skeleton', 'reaper'] },
  water:    { name: N('Perairan', 'Waters'), spawn: [] },
  // the eight realms beyond the mountain ring
  human:    { name: N('Negeri Manusia', 'Human Kingdom'), realm: true, spawn: ['bandit', 'renegade', 'bandit'] },
  beast:    { name: N('Negeri Beast', 'Beastlands'), realm: true, spawn: ['lion', 'rhino', 'lion'] },
  elf:      { name: N('Negeri Elf', 'Elven Realm'), realm: true, spawn: ['dryad', 'spiritstag', 'dryad'] },
  giant:    { name: N('Negeri Raksasa', 'Giant Realm'), realm: true, spawn: ['ogre', 'hillgiant', 'ogre'] },
  dwarf:    { name: N('Negeri Dwarf', 'Dwarf Kingdom'), realm: true, spawn: ['maddwarf', 'minegolem', 'maddwarf'] },
  angel:    { name: N('Negeri Malaikat', 'Angelic Heights'), realm: true, spawn: ['fallen', 'sentinel', 'sentinel'] },
  dragon:   { name: N('Negeri Naga', 'Dragon Realm'), realm: true, spawn: ['wyvern', 'firedrake', 'wyvern'] },
  demon:    { name: N('Negeri Iblis', 'Demon Realm'), realm: true, spawn: ['fiend', 'hellhound', 'fiend'] }
};
// realm monsters keep pace with strong heroes: each also comes in stronger forms every 5 levels up to Lv 100 ('ogre_45')
const RANK_ADJ = [[40, N('Ganas', 'Fierce')], [60, N('Elite', 'Elite')], [80, N('Purba', 'Ancient')], [100, N('Mitos', 'Mythic')]];
for (const type of new Set(Object.values(BIOMES).filter(b => b.realm).flatMap(b => b.spawn))) {
  const d = ENEMIES[type];
  for (let lv = 25; lv <= MAX_LVL; lv += 5) {
    if (lv <= d.lvl + 3) continue;
    const r = lv / d.lvl, adj = RANK_ADJ.find(([top]) => lv <= top)[1];
    ENEMIES[type + '_' + lv] = { ...d, of: type, lvl: lv, name: N(d.name.id + ' ' + adj.id, adj.en + ' ' + d.name.en), hp: Math.round(d.hp * r), atk: Math.round(d.atk * r),
      def: Math.round(d.def * r), agi: Math.round(d.agi * Math.sqrt(r)), xp: Math.round(d.xp * r ** 1.5), gold: d.gold.map(g => Math.round(g * r)), scale: (d.scale || 1) * (1 + (lv - d.lvl) / 300) };
  }
}
// the strongest form of a realm monster that is not above the hero
window.realmFoe = (type, lvl) => { let best = type; for (let lv = 25; lv <= lvl + 2; lv += 5) if (ENEMIES[type + '_' + lv]) best = type + '_' + lv; return best; };
// the realms in order around the map, every 45° starting east
window.REALMS = ['human', 'beast', 'demon', 'dragon', 'giant', 'dwarf', 'angel', 'elf'];
// where each region's boss waits (lairs are nudged onto dry ground by terrain.js; the kraken stays in the lake)
window.LAIRS = [
  { type: 'kingslime', region: 'meadow', x: 80, z: 135 }, { type: 'treant', region: 'forest', x: -60, z: -140 },
  { type: 'titan', region: 'mountain', x: -177, z: -177 }, { type: 'scorpking', region: 'desert', x: 400, z: -60 },
  { type: 'frostwyrm', region: 'ice', x: -120, z: -380 }, { type: 'dragon', region: 'magma', x: -312, z: 30 },
  { type: 'lichking', region: 'death', x: -60, z: 380 }, { type: 'kraken', region: 'water', x: -78, z: 78 },
  { type: 'warlord', region: 'human', x: 675, z: 143 }, { type: 'beastking', region: 'beast', x: 376, z: 579 }, { type: 'demonlord', region: 'demon', x: 0, z: 668 },
  { type: 'elderdragon', region: 'dragon', x: -442, z: 442 }, { type: 'giantking', region: 'giant', x: -675, z: -143 }, { type: 'ironking', region: 'dwarf', x: -376, z: -579 },
  { type: 'seraph', region: 'angel', x: 143, z: -675 }, { type: 'dryadqueen', region: 'elf', x: 579, z: -376 }
];
// adventurers' guild ranks and the points needed for each
window.RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
window.RANK_PTS = [0, 20, 50, 100, 180, 300, 500];
window.WATER_SPAWN = r => r < 200 ? ['piranha', 'piranha', 'crab'] : ['crab', 'serpent', 'serpent'];
// settlements: safe from monsters, each with a healing spring
window.TOWNS = [
  { id: 'village', x: 0, z: 0, r: 40, houses: 7, style: 0, name: N('Desa Kabut', 'Mist Village') },
  { id: 'capital', x: 115, z: 35, r: 62, houses: 0, style: 8, city: true, name: N('Kota Mahkota', 'Crown City') },
  { id: 'harbor', x: 35, z: 140, r: 24, houses: 5, style: 1, name: N('Pelabuhan Danau', 'Lakeside Harbor') },
  { id: 'oasis', x: 330, z: 40, r: 30, houses: 6, style: 2, name: N('Oasis Fatamorgana', 'Mirage Oasis') },
  { id: 'snowhold', x: 30, z: -335, r: 30, houses: 6, style: 3, name: N('Desa Salju Abadi', 'Snowhold') },
  { id: 'grove', x: -115, z: -95, r: 26, houses: 5, style: 4, name: N('Kampung Rimba', 'Grove Hamlet') },
  { id: 'peak', x: 186, z: -186, r: 26, houses: 5, style: 5, walls: true, name: N('Benteng Puncak', 'Peak Fortress') },
  { id: 'ashfort', x: -262, z: -64, r: 28, houses: 5, style: 6, walls: true, name: N('Benteng Abu', 'Ash Fort') },
  { id: 'hollow', x: 62, z: 272, r: 28, houses: 5, style: 7, name: N('Dusun Sunyi', 'Silent Hollow') },
  { id: 'aldren', x: 566, z: -100, r: 34, houses: 8, style: 9, walls: true, name: N('Kota Benteng Aldren', 'Aldren Hold') },
  { id: 'fangkraal', x: 471, z: 330, r: 30, houses: 7, style: 10, name: N('Perkampungan Taring', 'Fang Kraal') },
  { id: 'vorx', x: 100, z: 566, r: 30, houses: 6, style: 11, walls: true, name: N('Benteng Neraka Vorx', 'Vorx Hellgate') },
  { id: 'drakonis', x: -330, z: 471, r: 30, houses: 6, style: 12, name: N('Sarang Drakonis', 'Drakonis Eyrie') },
  { id: 'jotun', x: -566, z: 100, r: 64, houses: 0, style: 13, build: 'giant', name: N('Kastil Raksasa Jotun', 'Jotun Giant Castle') },
  { id: 'durak', x: -471, z: -330, r: 44, houses: 0, style: 14, build: 'machine', name: N('Kota Mesin Durak', 'Durak Engine City') },
  { id: 'seraphel', x: 0, z: -650, r: 76, houses: 0, style: 15, sky: true, name: N('Kastil Langit Seraphel', 'Seraphel Sky Castle') }, // floats high above the angel realm
  { id: 'lirien', x: 330, z: -471, r: 44, houses: 0, style: 16, build: 'elf', name: N('Kerajaan Hutan Lirien', 'Lirien Forest Kingdom') }
];
// what each settlement's shop sells: goods and skill books
const STOCK = {
  village: [['potion', 'ether', 'weapon1', 'armor1'], ['firstaid', 'windcut']],
  capital: [['potion', 'hipotion', 'ether', 'weapon1', 'weapon2', 'armor1', 'armor2'], ['windcut', 'spark', 'warcry']],
  harbor: [['potion', 'ether', 'hipotion', 'weapon1', 'armor1'], ['firstaid', 'viper']],
  grove: [['potion', 'hipotion', 'ether', 'weapon1', 'armor2'], ['viper', 'spark']],
  oasis: [['hipotion', 'ether', 'weapon2', 'armor2'], ['spark', 'warcry']],
  peak: [['hipotion', 'ether', 'weapon2', 'armor2', 'armor3'], ['warcry', 'leech']],
  snowhold: [['hipotion', 'ether', 'weapon2', 'armor3'], ['blizzard', 'leech']],
  hollow: [['hipotion', 'ether', 'weapon3', 'armor3'], ['leech', 'phoenix']],
  ashfort: [['hipotion', 'ether', 'weapon3', 'armor3', 'armor4'], ['phoenix', 'blizzard']],
  aldren: [['hipotion', 'ether', 'weapon3', 'armor4', 'weapon5', 'armor6'], ['shadowstrike', 'flamewave']],
  fangkraal: [['hipotion', 'ether', 'weapon3', 'armor4', 'weapon5', 'armor6'], ['earthspike', 'flamewave']],
  lirien: [['hipotion', 'ether', 'weapon4', 'weapon5', 'weapon6', 'armor6'], ['arcanemissile', 'earthspike']],
  jotun: [['hipotion', 'ether', 'weapon4', 'weapon6', 'armor7', 'armor8'], ['earthspike', 'thunderstorm']],
  durak: [['hipotion', 'ether', 'armor5', 'weapon6', 'weapon7', 'armor7', 'armor8'], ['thunderstorm', 'shadowstrike']],
  seraphel: [['hipotion', 'ether', 'armor5', 'weapon7', 'weapon8', 'armor8', 'armor9'], ['holynova', 'arcanemissile']],
  drakonis: [['hipotion', 'ether', 'weapon8', 'weapon9', 'armor9', 'armor10'], ['flamewave', 'thunderstorm']],
  vorx: [['hipotion', 'ether', 'weapon4', 'weapon9', 'armor10'], ['shadowstrike', 'holynova']]
};
TOWNS.forEach(tw => { tw.goods = STOCK[tw.id][0]; tw.books = STOCK[tw.id][1]; });

window.ACHS = [
  { id: 'first', name: N('Darah Pertama', 'First Blood'), desc: N('Menangkan pertarungan pertama.', 'Win your first battle.'), ok: s => s.st.wins >= 1 },
  { id: 'hunter', name: N('Pemburu', 'Hunter'), desc: N('Kalahkan 25 musuh.', 'Defeat 25 enemies.'), ok: s => kills(s) >= 25 },
  { id: 'slayer', name: N('Penumpas', 'Slayer'), desc: N('Kalahkan 100 musuh.', 'Defeat 100 enemies.'), ok: s => kills(s) >= 100 },
  { id: 'lv5', name: N('Bangkit', 'Awakened'), desc: N('Capai Lv 5.', 'Reach Lv 5.'), ok: s => s.lvl >= 5 },
  { id: 'lv10', name: N('Legenda Muda', 'Rising Legend'), desc: N('Capai Lv 10.', 'Reach Lv 10.'), ok: s => s.lvl >= 10 },
  { id: 'evo', name: N('Jalan Baru', 'New Path'), desc: N('Lakukan evolusi kelas.', 'Evolve your class.'), ok: s => !!s.evo },
  { id: 'evo2', name: N('Puncak Jalan', 'Mastery'), desc: N('Capai evolusi tingkat kedua.', 'Reach a second-tier job.'), ok: s => !!s.evo2 },
  { id: 'kraken', name: N('Penakluk Samudra', 'Tamer of the Deep'), desc: N('Kalahkan Kraken.', 'Defeat the Kraken.'), ok: s => (s.st.kills.kraken || 0) >= 1 },
  { id: 'bosses', name: N('Penakluk Buronan', 'Bounty Legend'), desc: N('Kalahkan boss di setiap wilayah.', 'Defeat the boss of every region.'), ok: s => LAIRS.every(b => (s.st.kills[b.type] || 0) > 0) },
  { id: 'guildc', name: N('Petualang Teladan', 'Seasoned Adventurer'), desc: N('Capai peringkat Guild C.', 'Reach guild rank C.'), ok: s => s.guild && s.guild.pts >= RANK_PTS[3] },
  { id: 'sailor', name: N('Pelaut', 'Sailor'), desc: N('Naik kapal di pelabuhan.', 'Board a ship at a pier.'), ok: s => s.st.sailed >= 1 },
  { id: 'realms', name: N('Pengelana Delapan Negeri', 'Walker of Eight Realms'), desc: N('Kunjungi kedelapan negeri.', 'Visit all eight realms.'), ok: s => REALMS.every(r => (s.seen || []).includes(r)) },
  { id: 'travel', name: N('Penjelajah Dunia', 'World Traveler'), desc: N('Kunjungi semua wilayah.', 'Visit every region.'), ok: s => (s.seen || []).length >= 7 },
  { id: 'rich', name: N('Saudagar', 'Merchant'), desc: N('Miliki 500 koin sekaligus.', 'Hold 500 gold at once.'), ok: s => s.gold >= 500 },
  { id: 'walker', name: N('Penjelajah', 'Wanderer'), desc: N('Tempuh 2000 m.', 'Walk 2000 m.'), ok: s => s.st.steps >= 2000 },
  { id: 'chests', name: N('Pemburu Harta', 'Treasure Seeker'), desc: N('Buka 10 peti.', 'Open 10 chests.'), ok: s => s.st.chests >= 10 },
  { id: 'arena1', name: N('Gladiator', 'Gladiator'), desc: N('Menangkan duel arena pertama.', 'Win your first arena duel.'), ok: s => s.st.arenaW >= 1 },
  { id: 'arena10', name: N('Juara Arena', 'Arena Champion'), desc: N('Menangkan 10 duel arena.', 'Win 10 arena duels.'), ok: s => s.st.arenaW >= 10 },
  { id: 'dragon', name: N('Penakluk Naga', 'Dragonslayer'), desc: N('Kalahkan Naga Kabut.', 'Defeat the Mist Dragon.'), ok: s => (s.st.kills.dragon || 0) >= 1 },
  { id: 'bighit', name: N('Pukulan Dahsyat', 'Mighty Blow'), desc: N('Berikan 100+ kerusakan sekali pukul.', 'Deal 100+ damage in one hit.'), ok: s => s.st.maxHit >= 100 },
  { id: 'daily', name: N('Rajin', 'Diligent'), desc: N('Klaim hadiah misi harian.', 'Claim a daily quest reward.'), ok: s => s.st.dailyClaims >= 1 },
  { id: 'social', name: N('Bersuara', 'Speaking Up'), desc: N('Kirim pesan obrolan pertama.', 'Send your first chat message.'), ok: s => s.st.chats >= 1 }
];
function kills(s) { return Object.values(s.st.kills).reduce((a, b) => a + b, 0); }
window.kills = kills;

// seasonal tournament reward tiers (exclusive cape color + title)
window.TIERS = [
  { id: 'bronze', rating: 1050, color: '#b0743a', name: N('Jubah Perunggu', 'Bronze Cape') },
  { id: 'silver', rating: 1150, color: '#c3cad4', name: N('Jubah Perak', 'Silver Cape') },
  { id: 'gold',   rating: 1300, color: '#e3b93c', name: N('Jubah Emas', 'Golden Cape') }
];

window.ATTRS = ['str', 'int', 'agi', 'vit'];

// derived combat stats for the hero state
window.heroStats = function (s) {
  const a = { ...s.attr };
  const w = ITEMS[s.eq.weapon] || {}, ar = ITEMS[s.eq.armor] || {};
  return {
    maxHp: 40 + a.vit * 10 + s.lvl * 6 + (ar.hp || 0),
    maxMp: 15 + a.int * 5 + s.lvl * 2,
    atk: a.str * 2 + s.lvl + (w.atk || 0),
    mag: a.int * 2 + s.lvl + (w.mag || 0),
    def: Math.round(a.vit + s.lvl * 0.5 + (ar.def || 0)),
    crit: Math.round(5 + a.agi * 1.2 + (w.crit || 0)),
    eva: Math.round(a.agi * 0.8),
    agi: a.agi
  };
};
window.heroSkills = function (s) {
  const list = CLASSES[s.cls].skills.concat(...evoChain(s).map(id => EVOS[id].skills), (s.learned || []).map(id => [id, 1]));
  return list.map(([id, lv]) => ({ id, lv, ok: s.lvl >= lv, ...SKILLS[id] }));
};
window.xpNeed = lvl => Math.round(40 * Math.pow(lvl, 1.5));
