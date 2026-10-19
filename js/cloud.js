// Persistence and online features. Local storage is always the offline copy; the artifact `db`
// capability (when the viewer is signed in to claude.ai) adds the cloud save, leaderboard and chat.
(function () {
  const KEY = 'nusakabut.save.v1';
  const C = window.Cloud = { db: null, uid: null, dl: null, status: 'local', onStatus: null, onRemote: null };
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };
  C.dev = ls.get('nusakabut.dev') || Math.random().toString(36).slice(2, 10); ls.set('nusakabut.dev', C.dev);

  const setStatus = s => { C.status = s; C.onStatus && C.onStatus(s); };
  C.loadLocal = () => { try { return JSON.parse(ls.get(KEY)); } catch (e) { return null; } };
  C.saveLocal = S => ls.set(KEY, JSON.stringify(S));
  C.clearLocal = () => ls.del(KEY);

  C.init = async function () {
    if (!window.claude || !claude.use) return null;
    const [db, user, dl] = await Promise.all([claude.use('db'), claude.use('user'), claude.use('downloads')]);
    C.dl = dl;
    if (!db || !user) return null;
    C.uid = await user.id();
    if (!C.uid) return null;
    C.db = db; setStatus(navigator.onLine === false ? 'off' : 'ok');
    addEventListener('online', () => { setStatus('ok'); flush(); });
    addEventListener('offline', () => setStatus('off'));
    const ref = db.doc('data/users/' + C.uid + '/save');
    let remote = null;
    try { const snap = await ref.get(); if (snap.exists) remote = snap.data(); } catch (e) { setStatus('off'); }
    // live sync: another device saved newer progress
    ref.onSnapshot(snap => {
      const d = snap.exists && snap.data();
      if (d && d.dev !== C.dev && !snap.metadata.hasPendingWrites && C.onRemote) C.onRemote(d.state, d.updated);
    }, () => setStatus('off'));
    return remote ? remote.state : null;
  };

  // one write at a time per document; the newest pending body wins
  const queues = {};
  function write(path, body) {
    const q = queues[path] || (queues[path] = { busy: false, next: null });
    q.next = body; if (!q.busy) run(path, q);
  }
  async function run(path, q) {
    if (!C.db || !q.next) return;
    if (navigator.onLine === false) { setStatus('off'); return; }
    q.busy = true; const body = q.next; q.next = null;
    setStatus('busy');
    try { await C.db.doc(path).set(body); setStatus('ok'); }
    catch (e) {
      setStatus(e && e.code === 'unavailable' ? 'off' : 'local'); // other codes: this viewer may not write
      if (e && e.code === 'unavailable' && !q.next) q.next = body; // keep it for the next flush
    }
    q.busy = false;
    if (q.next && C.status !== 'off') run(path, q);
  }
  function flush() { for (const p in queues) if (!queues[p].busy) run(p, queues[p]); }
  C.flush = flush;

  C.pushSave = S => { if (C.db) write('data/users/' + C.uid + '/save', { state: S, updated: S.updated, dev: C.dev }); };
  C.wipe = () => C.db ? C.db.doc('data/users/' + C.uid + '/save').set({ state: { v: 0 }, updated: Date.now(), dev: C.dev }).catch(() => { }) : Promise.resolve(); // awaited, so a reload can't cut it off
  C.pushBoard = entry => { if (C.db) write('lb/' + C.uid, entry); };

  // feeds: listeners register any time; the two subscriptions open once, after init finds a db
  let lbRows = [], lbSubs = [], chatRows = [], chatSubs = [], myMsgs = [];
  C.onBoard = fn => { lbSubs.push(fn); fn(lbRows); };
  C.boardRows = () => lbRows;
  C.onChat = fn => { chatSubs.push(fn); fn(chatRows); };
  C.startFeeds = function () {
    if (!C.db) return;
    C.db.collection('lb').orderBy('rating', 'desc').limit(200).onSnapshot(s => { lbRows = s.docs.map(d => ({ uid: d.id, ...d.data() })); lbSubs.forEach(f => f(lbRows)); }, () => { });
    C.db.collection('chat').onSnapshot(s => {
      const all = [];
      s.docs.forEach(d => { const v = d.data(); if (d.id === C.uid) myMsgs = (v.msgs || []).slice(); (v.msgs || []).forEach(m => all.push({ uid: d.id, name: String(v.name || '?').slice(0, 16), t: +m.t || 0, text: String(m.text || '').slice(0, 200) })); });
      chatRows = all.sort((a, b) => a.t - b.t).slice(-80); chatSubs.forEach(f => f(chatRows));
    }, () => { });
  };
  // ponytail: each player keeps only their last 15 messages in one doc; fine for a small community, move to per-day docs if chat gets busy
  C.sendChat = (name, text) => {
    if (!C.db) return false;
    myMsgs = myMsgs.concat({ t: Date.now(), text: text.slice(0, 200) }).slice(-15);
    write('chat/' + C.uid, { name, msgs: myMsgs });
    return true;
  };

  // file export: the downloads capability inside claude.ai, a plain blob link when opened as a local file
  C.download = async function (filename, data) {
    if (C.dl) return C.dl.save({ filename, data });
    if (window.claude) throw { code: 'unavailable' };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data])); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return { status: 'saved' };
  };
})();
